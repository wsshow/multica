package main

import "testing"

func TestMainHTTPAddress(t *testing.T) {
	for _, tc := range []struct{ host, want string }{
		{"", ":8081"},
		{"127.0.0.1", "127.0.0.1:8081"},
		{"::1", "[::1]:8081"},
	} {
		t.Run(tc.host, func(t *testing.T) {
			t.Setenv("MULTICA_LISTEN_HOST", tc.host)
			if got := mainHTTPAddress("8081"); got != tc.want {
				t.Fatalf("address = %q, want %q", got, tc.want)
			}
		})
	}
}
