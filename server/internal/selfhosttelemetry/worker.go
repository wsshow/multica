// Package selfhosttelemetry preserves upstream wiring without collecting or reporting data.
package selfhosttelemetry

import (
	"context"
	"github.com/jackc/pgx/v5/pgxpool"
	"log/slog"
)

type Config struct{ Enabled bool }

func ConfigFromDoNotTrack(_ string) Config { return Config{} }
func LogStartupStatus(logger *slog.Logger, _ Config) {
	if logger != nil {
		logger.Info("self-host telemetry disabled in this build")
	}
}

type Worker struct{}

func New(_ *pgxpool.Pool, _ string, _ Config, _ *slog.Logger) *Worker { return nil }
func (*Worker) Run(context.Context)                                   {}
