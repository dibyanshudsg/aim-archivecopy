PRAGMA foreign_keys = ON;

CREATE TABLE issue_hero_presentations (
  issue_id TEXT PRIMARY KEY REFERENCES issues(id) ON DELETE CASCADE,
  desktop_key TEXT,
  desktop_width INTEGER,
  desktop_height INTEGER,
  desktop_hash TEXT,
  desktop_theme_json TEXT,
  mobile_key TEXT,
  mobile_width INTEGER,
  mobile_height INTEGER,
  mobile_hash TEXT,
  mobile_theme_json TEXT,
  updated_by TEXT REFERENCES admins(id),
  updated_at TEXT NOT NULL,
  CHECK ((desktop_key IS NULL AND desktop_width IS NULL AND desktop_height IS NULL AND desktop_hash IS NULL) OR
         (desktop_key IS NOT NULL AND desktop_width = 1672 AND desktop_height = 941 AND desktop_hash IS NOT NULL)),
  CHECK ((mobile_key IS NULL AND mobile_width IS NULL AND mobile_height IS NULL AND mobile_hash IS NULL) OR
         (mobile_key IS NOT NULL AND mobile_width = 941 AND mobile_height = 1672 AND mobile_hash IS NOT NULL))
);

CREATE TABLE hero_prompt_templates (
  id TEXT PRIMARY KEY CHECK (id = 'master'),
  template_text TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0),
  updated_by TEXT REFERENCES admins(id),
  updated_at TEXT NOT NULL
);
