// Package localauth manages the single owner credential on a personal instance.
package localauth

import (
	"context"
	"crypto/pbkdf2"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"errors"
	"fmt"
	"log/slog"
	"os"
	"regexp"
	"strings"
	"unicode/utf8"

	db "github.com/multica-ai/multica/server/pkg/db/generated"
)

var (
	ErrAlreadyConfigured  = errors.New("the owner account has already been created")
	ErrInvalidSetupCode   = errors.New("invalid setup code")
	ErrInvalidUsername    = errors.New("username must be 3–32 characters, start with a letter or digit, and use only letters, digits, periods, underscores, and hyphens")
	ErrInvalidPassword    = errors.New("password must be 12–128 characters")
	ErrInvalidCredentials = errors.New("invalid username or password")
	ErrNoOwner            = errors.New("the owner account has not been created")
	usernamePattern       = regexp.MustCompile(`^[a-z0-9][a-z0-9._-]{2,31}$`)
)

const (
	accountEmailSuffix = "@multica-user.invalid"
	passwordHashPrefix = "pbkdf2-sha256-v1:"
	passwordRounds     = 600_000
	passwordSaltBytes  = 16
	passwordKeyBytes   = 32
)

type Store interface {
	Configured(context.Context) (bool, error)
	CreateOwner(ctx context.Context, username, passwordHash string) (db.User, error)
	OwnerCredential(context.Context) (Credential, error)
	User(context.Context, Credential) (db.User, error)
	ResetPassword(ctx context.Context, passwordHash string) (username string, err error)
}

type Service struct {
	store           Store
	setupCodeFile   string
	setupCodeDigest *[sha256.Size]byte
}

func EnabledMode(value string) (bool, error) {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "local":
		return true, nil
	case "", "email":
		return false, nil
	default:
		return false, errors.New("MULTICA_AUTH_MODE must be local or email")
	}
}

func IsAccountEmail(email string) bool {
	return strings.HasSuffix(strings.ToLower(email), accountEmailSuffix)
}

func NewService(ctx context.Context, store Store, setupCodeFile string) (*Service, error) {
	service := &Service{store: store, setupCodeFile: setupCodeFile}
	configured, err := store.Configured(ctx)
	if err != nil {
		return nil, fmt.Errorf("check local owner account: %w", err)
	}
	if configured {
		return service, nil
	}
	if setupCodeFile == "" {
		return nil, errors.New("MULTICA_LOCAL_AUTH_SETUP_CODE_FILE must be set to initialize the local owner account")
	}
	code, err := loadOrCreateSetupCode(setupCodeFile)
	if err != nil {
		return nil, fmt.Errorf("load local owner setup code: %w", err)
	}
	digest := sha256.Sum256([]byte(code))
	service.setupCodeDigest = &digest
	slog.Info("local owner setup is required", "setup_code_file", setupCodeFile)
	return service, nil
}

func (s *Service) SetupRequired(ctx context.Context) (bool, error) {
	configured, err := s.store.Configured(ctx)
	return !configured, err
}

func (s *Service) Setup(ctx context.Context, username, password, setupCode string) (db.User, error) {
	configured, err := s.store.Configured(ctx)
	if err != nil {
		return db.User{}, err
	}
	if configured {
		return db.User{}, ErrAlreadyConfigured
	}
	providedDigest := sha256.Sum256([]byte(strings.TrimSpace(setupCode)))
	if s.setupCodeDigest == nil || subtle.ConstantTimeCompare(providedDigest[:], s.setupCodeDigest[:]) != 1 {
		return db.User{}, ErrInvalidSetupCode
	}
	username = normalizeUsername(username)
	if !usernamePattern.MatchString(username) {
		return db.User{}, ErrInvalidUsername
	}
	if !validPassword(password) {
		return db.User{}, ErrInvalidPassword
	}
	hash, err := hashPassword(password)
	if err != nil {
		return db.User{}, err
	}
	user, err := s.store.CreateOwner(ctx, username, hash)
	if err != nil {
		return db.User{}, err
	}
	// The committed owner consumes the code even if the operator mounted a read-only code file.
	if err := os.Remove(s.setupCodeFile); err != nil && !errors.Is(err, os.ErrNotExist) {
		slog.Warn("could not remove used local owner setup code file", "error", err)
	}
	return user, nil
}

func (s *Service) Login(ctx context.Context, username, password string) (db.User, error) {
	username = normalizeUsername(username)
	if !usernamePattern.MatchString(username) || !validPassword(password) {
		return db.User{}, ErrInvalidCredentials
	}
	credential, err := s.store.OwnerCredential(ctx)
	if errors.Is(err, ErrNoOwner) {
		return db.User{}, ErrInvalidCredentials
	}
	if err != nil {
		return db.User{}, err
	}
	matches, err := verifyPassword(password, credential.PasswordHash)
	if err != nil {
		return db.User{}, err
	}
	if !matches || username != credential.Username {
		return db.User{}, ErrInvalidCredentials
	}
	return s.store.User(ctx, credential)
}

func ResetPassword(ctx context.Context, store Store) (username, password string, err error) {
	password = randomSecret()
	hash, err := hashPassword(password)
	if err != nil {
		return "", "", err
	}
	username, err = store.ResetPassword(ctx, hash)
	if err != nil {
		return "", "", err
	}
	return username, password, nil
}

func normalizeUsername(username string) string {
	return strings.ToLower(strings.TrimSpace(username))
}

func validPassword(password string) bool {
	length := utf8.RuneCountInString(password)
	return length >= 12 && length <= 128
}

func randomSecret() string {
	var buffer [32]byte
	rand.Read(buffer[:])
	return base64.RawURLEncoding.EncodeToString(buffer[:])
}

func hashPassword(password string) (string, error) {
	var salt [passwordSaltBytes]byte
	rand.Read(salt[:])
	key, err := pbkdf2.Key(sha256.New, password, salt[:], passwordRounds, passwordKeyBytes)
	if err != nil {
		return "", err
	}
	return passwordHashPrefix + base64.RawStdEncoding.EncodeToString(append(salt[:], key...)), nil
}

func verifyPassword(password, hash string) (bool, error) {
	encoded, ok := strings.CutPrefix(hash, passwordHashPrefix)
	if !ok {
		return false, errors.New("unrecognized local password hash format")
	}
	stored, err := base64.RawStdEncoding.DecodeString(encoded)
	if err != nil || len(stored) != passwordSaltBytes+passwordKeyBytes {
		return false, errors.New("invalid local password hash")
	}
	salt, expected := stored[:passwordSaltBytes], stored[passwordSaltBytes:]
	actual, err := pbkdf2.Key(sha256.New, password, salt, passwordRounds, passwordKeyBytes)
	if err != nil {
		return false, err
	}
	return subtle.ConstantTimeCompare(actual, expected) == 1, nil
}
