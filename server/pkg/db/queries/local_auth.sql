-- name: LocalAuthConfigured :one
SELECT EXISTS (SELECT 1 FROM local_auth_account WHERE singleton);

-- name: GetLocalAuthAccount :one
SELECT user_id, username, password_hash FROM local_auth_account WHERE singleton;

-- name: CreateLocalAuthAccount :execrows
INSERT INTO local_auth_account (user_id, username, password_hash)
VALUES ($1, $2, $3)
ON CONFLICT (singleton) DO NOTHING;

-- name: ResetLocalAuthPassword :one
UPDATE local_auth_account SET password_hash = $1 WHERE singleton
RETURNING username;
