package localauth

import (
	"encoding/base64"
	"errors"
	"os"
	"path/filepath"
	"strings"
)

func loadOrCreateSetupCode(path string) (string, error) {
	code, err := readSetupCode(path)
	if !errors.Is(err, os.ErrNotExist) {
		return code, err
	}

	code = randomSecret()
	temp, err := os.CreateTemp(filepath.Dir(path), ".setup-code-*")
	if err != nil {
		return "", err
	}
	defer os.Remove(temp.Name())
	_, writeErr := temp.WriteString(code + "\n")
	if err := errors.Join(writeErr, temp.Sync(), temp.Close()); err != nil {
		return "", err
	}
	// Publish a complete file without replacing a code created by another startup.
	if err := os.Link(temp.Name(), path); err != nil {
		if errors.Is(err, os.ErrExist) {
			return readSetupCode(path)
		}
		return "", err
	}
	return code, nil
}

func readSetupCode(path string) (string, error) {
	info, err := os.Lstat(path)
	if err != nil {
		return "", err
	}
	if !info.Mode().IsRegular() || info.Mode().Perm()&0o077 != 0 || info.Size() > 128 {
		return "", errors.New("setup code file must be a short regular file readable only by its owner")
	}
	data, err := os.ReadFile(path)
	if err != nil {
		return "", err
	}
	code := strings.TrimSpace(string(data))
	decoded, err := base64.RawURLEncoding.DecodeString(code)
	if err != nil || len(decoded) != 32 {
		return "", errors.New("setup code file does not contain a valid setup code")
	}
	return code, nil
}
