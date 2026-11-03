package handler

import "net/http"

// UpsertClientUsage accepts older clients without reading or persisting their report.
func (h *Handler) UpsertClientUsage(w http.ResponseWriter, _ *http.Request) {
	w.WriteHeader(http.StatusNoContent)
}
