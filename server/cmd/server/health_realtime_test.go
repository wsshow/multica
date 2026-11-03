package main

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestRealtimeMetricsAlwaysUnavailable(t *testing.T) {
	for _, token := range []string{"", "configured-token"} {
		req := httptest.NewRequest(http.MethodGet, "/health/realtime", nil)
		req.RemoteAddr = "127.0.0.1:1234"
		req.Header.Set("Authorization", "Bearer "+token)
		w := httptest.NewRecorder()
		realtimeMetricsHandler(token)(w, req)
		if w.Code != http.StatusNotFound {
			t.Fatalf("status = %d, want 404", w.Code)
		}
	}
}
