PRAGMA foreign_keys = ON;

-- Keep only a one-way email digest after permanent removal. This lets the
-- sign-in screen explain the account state without retaining credentials or
-- the removed administrator's profile.
CREATE TABLE admin_account_removals (
  email_hash TEXT PRIMARY KEY CHECK (length(email_hash) = 64 AND email_hash NOT GLOB '*[^0-9a-f]*'),
  removed_at TEXT NOT NULL,
  removed_by TEXT NOT NULL
);
CREATE INDEX admin_account_removals_removed_at ON admin_account_removals(removed_at DESC);

-- Owner is an institutional root account, not an assignable role.
CREATE UNIQUE INDEX admins_single_owner ON admins(role_id) WHERE role_id='owner';
