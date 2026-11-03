package metrics

import (
	"github.com/multica-ai/multica/server/internal/analytics"
	"net/http"
	"net/http/httptest"
	"testing"
)

type captureSpy struct{ count int }

func (s *captureSpy) Capture(analytics.Event) { s.count++ }
func (*captureSpy) Close()                    {}

func TestCannotEnableMetricsListenerOrForwardEvents(t *testing.T) {
	t.Setenv("METRICS_ADDR", "127.0.0.1:9090")
	if ConfigFromEnv().Enabled() || (Config{Addr: "0.0.0.0:9090"}).Enabled() {
		t.Fatal("metrics enabled")
	}
	if NewServer("127.0.0.1:9090", nil) != nil {
		t.Fatal("created metrics server")
	}
	r := httptest.NewRecorder()
	NewHandler(nil).ServeHTTP(r, httptest.NewRequest(http.MethodGet, "/metrics", nil))
	if r.Code != http.StatusNotFound {
		t.Fatalf("status = %d", r.Code)
	}
	spy := &captureSpy{}
	RecordEvent(spy, NewBusinessMetrics(), analytics.Event{Name: "new_upstream_event"})
	if spy.count != 0 {
		t.Fatal("forwarded analytics event")
	}
}
