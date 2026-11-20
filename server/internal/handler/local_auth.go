package handler

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net"
	"net/http"
	"strconv"
	"time"

	"github.com/multica-ai/multica/server/internal/auth"
	"github.com/multica-ai/multica/server/internal/localauth"
	"github.com/multica-ai/multica/server/internal/logger"
	"github.com/multica-ai/multica/server/internal/middleware"
	db "github.com/multica-ai/multica/server/pkg/db/generated"
)

type localAuthRequest struct {
	Username  string `json:"username"`
	Password  string `json:"password"`
	SetupCode string `json:"setup_code"`
}

func LocalAuthRateLimit(limit int, trustedProxies []*net.IPNet) func(http.Handler) http.Handler {
	limiter := newMemorySlidingWindowRateLimiter(SlidingWindowRateLimit{Limit: limit, Window: time.Minute})
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			key := middleware.RateLimitClientIP(r, trustedProxies)
			if !limiter.Allow(r.Context(), key) {
				retryAfter := max(1, int(slidingWindowLimiterRetryAfter(r.Context(), limiter, key).Round(time.Second)/time.Second))
				w.Header().Set("Retry-After", strconv.Itoa(retryAfter))
				writeErrorCode(w, http.StatusTooManyRequests, "local_auth_rate_limited", "too many attempts")
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

func (h *Handler) SetupLocalAuth(w http.ResponseWriter, r *http.Request) {
	if h.LocalAuth == nil {
		http.NotFound(w, r)
		return
	}
	var req localAuthRequest
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 8<<10)).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	user, err := h.LocalAuth.Setup(r.Context(), req.Username, req.Password, req.SetupCode)
	if err != nil {
		switch {
		case errors.Is(err, localauth.ErrAlreadyConfigured):
			writeErrorCode(w, http.StatusConflict, "local_auth_already_configured", err.Error())
		case errors.Is(err, localauth.ErrInvalidSetupCode):
			writeErrorCode(w, http.StatusForbidden, "local_auth_invalid_setup_code", err.Error())
		case errors.Is(err, localauth.ErrInvalidUsername):
			writeErrorCode(w, http.StatusBadRequest, "local_auth_invalid_username", err.Error())
		case errors.Is(err, localauth.ErrInvalidPassword):
			writeErrorCode(w, http.StatusBadRequest, "local_auth_invalid_password", err.Error())
		default:
			slog.Warn("local owner setup failed", append(logger.RequestAttrs(r), "error", err)...)
			writeError(w, http.StatusInternalServerError, "failed to create owner account")
		}
		return
	}
	h.issueLocalLoginResponse(w, r, user)
}

func (h *Handler) LoginLocalAuth(w http.ResponseWriter, r *http.Request) {
	if h.LocalAuth == nil {
		http.NotFound(w, r)
		return
	}
	var req localAuthRequest
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 8<<10)).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	user, err := h.LocalAuth.Login(r.Context(), req.Username, req.Password)
	if errors.Is(err, localauth.ErrInvalidCredentials) {
		writeErrorCode(w, http.StatusUnauthorized, "local_auth_invalid_credentials", err.Error())
		return
	}
	if err != nil {
		slog.Warn("local login failed", append(logger.RequestAttrs(r), "error", err)...)
		writeError(w, http.StatusInternalServerError, "failed to sign in")
		return
	}
	h.issueLocalLoginResponse(w, r, user)
}

func (h *Handler) issueLocalLoginResponse(w http.ResponseWriter, r *http.Request, user db.User) {
	token, err := h.issueJWT(user)
	if errors.Is(err, auth.ErrTemporarilyDisabledUser) {
		writeError(w, http.StatusForbidden, auth.TemporarilyDisabledUserError)
		return
	}
	if err != nil {
		slog.Warn("failed to issue local login session", append(logger.RequestAttrs(r), "error", err)...)
		writeError(w, http.StatusInternalServerError, "failed to generate token")
		return
	}
	h.writeLoginResponse(w, user, token, auth.AuthTokenTTL())
}
