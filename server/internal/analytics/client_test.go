package analytics

import "testing"

func TestEnvironmentCannotEnableReporting(t *testing.T) {
	t.Setenv("POSTHOG_API_KEY", "configured-key")
	t.Setenv("POSTHOG_HOST", "https://collector.invalid")
	t.Setenv("ANALYTICS_DISABLED", "false")
	c := NewFromEnv()
	if _, ok := c.(NoopClient); !ok {
		t.Fatalf("client = %T, want NoopClient", c)
	}
	c.Capture(Event{Name: "private", DistinctID: "user-id"})
	c.Close()
}
