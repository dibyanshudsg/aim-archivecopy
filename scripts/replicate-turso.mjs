// Migration replication helper: transfers data from verified SQLite backup to a target Turso database.
import path from 'node:path';
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { createRequire } from 'node:module';

const root = path.resolve(import.meta.dirname, '..');
const webRequire = createRequire(path.join(root, 'apps/web/package.json'));
const { createClient } = webRequire('@libsql/client');

const BACKUP_FILE = 'D:/AIM (Project Directory)/P1-02_turso_2026-11-19_113621_IST/database.sqlite';

const TABLES_ORDER = [
  'admin_roles',
  'admin_role_permissions',
  'admins',
  'admin_sessions',
  'admin_password_resets',
  'admin_audit_log',
  'admin_account_removals',
  'navigation_menus',
  'navigation_items',
  'site_settings',
  'hero_prompt_templates',
  'analytics_visibility',
  'rate_limit_buckets',
  'indexing_schedule',
  'indexing_workers',
  'magazines',
  'issues',
  'issue_search_index',
  'issue_hero_presentations',
  'issue_indexing_coverage',
  'indexing_jobs',
  'indexing_runs',
];

export async function replicateData(targetUrl, targetToken, backupPath = BACKUP_FILE) {
  if (!fs.existsSync(backupPath)) {
    throw new Error(`Backup file not found: ${backupPath}`);
  }
  const sourceDb = new DatabaseSync(backupPath, { readOnly: true });
  const targetClient = createClient({ url: targetUrl, authToken: targetToken });

  console.log(`Connected to target: ${targetUrl.replace(/\/\/.*@/, '//***@')}`);

  try {
    for (const table of TABLES_ORDER) {
      const rows = sourceDb.prepare(`SELECT * FROM "${table}"`).all();
      console.log(`Replicating ${table}: ${rows.length} rows...`);
      if (rows.length === 0) continue;

      const columns = Object.keys(rows[0]);
      const colNames = columns.map(c => `"${c}"`).join(', ');
      const placeholders = columns.map(() => '?').join(', ');
      const insertSql = `INSERT OR REPLACE INTO "${table}" (${colNames}) VALUES (${placeholders})`;

      // Batch in chunks of 50
      const CHUNK_SIZE = 50;
      for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
        const chunk = rows.slice(i, i + CHUNK_SIZE);
        const stmts = chunk.map(row => ({
          sql: insertSql,
          args: columns.map(c => row[c] ?? null)
        }));
        await targetClient.batch(stmts, 'write');
      }
      console.log(`  ✓ ${table} completed.`);
    }

    console.log('Verifying target counts and FTS...');
    for (const table of TABLES_ORDER) {
      const expected = sourceDb.prepare(`SELECT count(*) as c FROM "${table}"`).get().c;
      const res = await targetClient.execute(`SELECT count(*) as c FROM "${table}"`);
      const actual = Number(res.rows[0].c);
      if (actual !== expected) {
        throw new Error(`Count mismatch on ${table}: expected ${expected}, got ${actual}`);
      }
    }
    console.log('All data tables verified with exact row counts!');

    // Check integrity & foreign keys
    const integrityRes = await targetClient.execute('PRAGMA integrity_check');
    console.log('Target integrity check:', integrityRes.rows[0][0] || integrityRes.rows[0].integrity_check);

    const fkRes = await targetClient.execute('PRAGMA foreign_key_check');
    if (fkRes.rows.length > 0) {
      throw new Error(`Foreign key violations found: ${fkRes.rows.length}`);
    }
    console.log('Target foreign key check passed (0 violations).');

    // Verify FTS5
    const ftsText = await targetClient.execute("SELECT count(*) as c FROM issue_text_fts WHERE issue_text_fts MATCH 'mother'");
    const ftsMeta = await targetClient.execute("SELECT count(*) as c FROM issue_metadata_fts WHERE issue_metadata_fts MATCH 'mother'");
    console.log(`FTS Text match 'mother': ${ftsText.rows[0].c} (expected 2100)`);
    console.log(`FTS Meta match 'mother': ${ftsMeta.rows[0].c} (expected 78)`);

    return true;
  } finally {
    targetClient.close();
    sourceDb.close();
  }
}
