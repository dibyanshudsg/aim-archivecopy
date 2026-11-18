PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS admin_password_resets (
  id TEXT PRIMARY KEY,
  admin_id TEXT NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE CHECK (length(token_hash) = 64 AND token_hash NOT GLOB '*[^0-9a-f]*'),
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS admin_password_resets_admin ON admin_password_resets(admin_id, expires_at);
CREATE INDEX IF NOT EXISTS admin_password_resets_hash ON admin_password_resets(token_hash);
