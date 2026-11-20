package metrics

import (
	"context"
	"testing"
	"time"
)

func TestInboxReadMetricsStayDisabled(t *testing.T) {
	t.Setenv("METRICS_ADDR", "0.0.0.0:9090")
	if ConfigFromEnv().Enabled() {
		t.Fatal("environment configuration enabled metrics")
	}
	registry := NewRegistry(RegistryOptions{})
	if registry.Gatherer != nil {
		t.Fatal("inbox instrumentation created a metrics gatherer")
	}
	for _, metrics := range []*InboxReadMetrics{NewInboxReadMetrics(), registry.InboxRead, nil} {
		metrics.Active(1)
		metrics.Queue(2)
		metrics.Reject("list", "queue_full")
		metrics.Observe("list", time.Second, context.DeadlineExceeded)
		metrics.Observe("summary", time.Second, nil)
		metrics.ObserveQuery("summary", 50*time.Millisecond)
	}
}
