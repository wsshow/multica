package main

import (
	"context"
	"errors"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/multica-ai/multica/server/internal/dbstartup"
	"github.com/multica-ai/multica/server/internal/localauth"
)

func runLocalAuthCommand(args []string) error {
	if len(args) != 1 || args[0] != "reset-password" {
		return errors.New("usage: server local-auth reset-password")
	}
	if localMode, _ := localauth.EnabledMode(os.Getenv("MULTICA_AUTH_MODE")); !localMode {
		return errors.New("password reset requires MULTICA_AUTH_MODE=local")
	}
	databaseURL := strings.TrimSpace(os.Getenv("DATABASE_URL"))
	if databaseURL == "" {
		return errors.New("set DATABASE_URL to the database of the personal instance")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	pool, err := newDBPool(ctx, databaseURL, dbstartup.SettingsFromEnv().ConnectTimeout)
	if err != nil {
		return fmt.Errorf("open personal instance database: %w", err)
	}
	defer pool.Close()
	username, password, err := localauth.ResetPassword(ctx, localauth.NewPostgresStore(pool))
	if err != nil {
		return fmt.Errorf("reset local owner password: %w", err)
	}
	_, err = fmt.Fprintf(os.Stdout, "Username: %s\nNew password: %s\n", username, password)
	return err
}
