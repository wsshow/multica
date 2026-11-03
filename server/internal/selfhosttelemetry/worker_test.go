package selfhosttelemetry

import (
	"context"
	"testing"
)

func TestCannotEnableCollection(t *testing.T) {
	for _, value := range []string{"", "0", "false", "1", "true"} {
		if ConfigFromDoNotTrack(value).Enabled {
			t.Fatalf("enabled for %q", value)
		}
	}
	w := New(nil, "v0.7.2", Config{Enabled: true}, nil)
	if w != nil {
		t.Fatal("constructed a telemetry worker")
	}
	w.Run(context.Background())
}
