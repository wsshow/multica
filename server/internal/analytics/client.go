// Package analytics preserves the upstream event API without collecting or sending events.
package analytics

import (
	"os"
	"strings"
	"time"
)

// Event is a single analytics capture. Fields mirror PostHog's /capture/ shape
// but are framework-agnostic so alternate backends can plug in later.
type Event struct {
	// Name of the event (e.g. "signup", "workspace_created").
	Name string

	// DistinctID identifies the person this event belongs to. For logged-in
	// users this is user.id; for anonymous events it should be the anon_id
	// that was previously used on the frontend so identity merging works.
	DistinctID string

	// WorkspaceID scopes the event to a workspace. Required when the event is
	// about a workspace-level action (workspace_created, issue_executed, ...).
	// Empty is allowed for pre-workspace events (signup).
	WorkspaceID string

	// Properties is the free-form bag of event attributes. Only serialisable
	// values (string, number, bool, nested maps/slices of the same) should
	// go here. Never put raw PII like full emails here — use email_domain.
	Properties map[string]any

	// SetOnce properties attach to the person record and are only written the
	// first time they appear. Use this for acquisition attribution
	// (initial_utm_source, etc.) so later events don't overwrite the origin.
	SetOnce map[string]any

	// Set properties attach to the person record and overwrite on every write.
	// Use this for mutable cohort signals (role, use_case, platform_preference)
	// that users can legitimately change during onboarding.
	Set map[string]any

	// Timestamp is optional; when zero the client fills in time.Now().
	Timestamp time.Time
}

// Client is the narrow surface the rest of the codebase depends on. Handlers
// call Capture and move on; the implementation is responsible for buffering,
// batching, and shipping.
type Client interface {
	Capture(e Event)
	// Close drains pending events. Call once during graceful shutdown.
	Close()
}

func NewFromEnv() Client { return NoopClient{} }

func EnvironmentFromEnv() string {
	if v := normalizeEnvironment(os.Getenv("ANALYTICS_ENVIRONMENT")); v != "" {
		return v
	}
	if v := normalizeEnvironment(os.Getenv("APP_ENV")); v != "" {
		return v
	}
	return "dev"
}

func normalizeEnvironment(v string) string {
	switch strings.ToLower(strings.TrimSpace(v)) {
	case "production", "prod":
		return "production"
	case "staging", "stage":
		return "staging"
	case "development", "dev", "test", "local":
		return "dev"
	default:
		return ""
	}
}

// NoopClient silently drops all events. Used in tests, in local dev when
// POSTHOG_API_KEY is unset, and in self-hosted instances that opt out.
type NoopClient struct{}

func (NoopClient) Capture(Event) {}
func (NoopClient) Close()        {}
