package main

import "net/http"

// Retain the upstream route handler without exposing operational statistics.
func realtimeMetricsHandler(_ string) http.HandlerFunc { return http.NotFound }
