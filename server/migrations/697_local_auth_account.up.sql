CREATE TABLE local_auth_account (
    singleton BOOLEAN NOT NULL DEFAULT TRUE CHECK (singleton),
    user_id UUID NOT NULL,
    username TEXT NOT NULL,
    password_hash TEXT NOT NULL
);
