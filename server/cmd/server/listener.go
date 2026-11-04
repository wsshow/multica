package main

import (
	"net"
	"os"
	"strings"
)

func mainHTTPAddress(port string) string {
	return net.JoinHostPort(strings.TrimSpace(os.Getenv("MULTICA_LISTEN_HOST")), port)
}
