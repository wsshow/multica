package localauth

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/multica-ai/multica/server/internal/service"
	db "github.com/multica-ai/multica/server/pkg/db/generated"
)

type Credential struct {
	UserID       pgtype.UUID
	Username     string
	PasswordHash string
}

type postgresDB interface {
	db.DBTX
	Begin(context.Context) (pgx.Tx, error)
}

type PostgresStore struct {
	database postgresDB
	queries  *db.Queries
}

func NewPostgresStore(database postgresDB) *PostgresStore {
	return &PostgresStore{database: database, queries: db.New(database)}
}

func (s *PostgresStore) Configured(ctx context.Context) (bool, error) {
	return s.queries.LocalAuthConfigured(ctx)
}

func (s *PostgresStore) CreateOwner(ctx context.Context, username, passwordHash string) (db.User, error) {
	tx, err := s.database.Begin(ctx)
	if err != nil {
		return db.User{}, err
	}
	defer tx.Rollback(ctx)
	queries := s.queries.WithTx(tx)
	user, err := queries.CreateUser(ctx, db.CreateUserParams{
		Name:  username,
		Email: uuid.NewString() + accountEmailSuffix,
	})
	if err != nil {
		return db.User{}, err
	}
	inserted, err := queries.CreateLocalAuthAccount(ctx, db.CreateLocalAuthAccountParams{
		UserID:       user.ID,
		Username:     username,
		PasswordHash: passwordHash,
	})
	if err != nil {
		return db.User{}, err
	}
	if inserted == 0 {
		return db.User{}, ErrAlreadyConfigured
	}
	if _, err := service.CreateWorkspaceWithOwner(ctx, tx, user.ID, db.CreateWorkspaceParams{
		Name: "Personal",
		Slug: "personal",
	}); err != nil {
		return db.User{}, err
	}
	user, err = queries.MarkUserOnboarded(ctx, user.ID)
	if err != nil {
		return db.User{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return db.User{}, err
	}
	return user, nil
}

func (s *PostgresStore) OwnerCredential(ctx context.Context) (Credential, error) {
	account, err := s.queries.GetLocalAuthAccount(ctx)
	if errors.Is(err, pgx.ErrNoRows) {
		return Credential{}, ErrNoOwner
	}
	return Credential(account), err
}

func (s *PostgresStore) User(ctx context.Context, credential Credential) (db.User, error) {
	return s.queries.GetUser(ctx, credential.UserID)
}

func (s *PostgresStore) ResetPassword(ctx context.Context, passwordHash string) (string, error) {
	username, err := s.queries.ResetLocalAuthPassword(ctx, passwordHash)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", ErrNoOwner
	}
	return username, err
}
