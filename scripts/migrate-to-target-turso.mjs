#!/usr/bin/env node

import path from 'node:path';
import fs from 'node:fs';
import { readMigrations, applyMigrations, verifyMigrationSchema } from './lib/turso-migrations.mjs';
import { replicateData } from './replicate-turso.mjs';
import { createRequire } from 'node:module';

const root = path.resolve(import.meta.dirname, '..');
const webRequire = createRequire(path.join(root, 'apps/web/package.json'));
const { createClient } = webRequire('@libsql/client');

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([^#][^=]+)=(.*)$/);
    if (!match) continue;
    const key = match[1].trim();
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

async function main() {
  const envFile = process.argv[2] || '.env.society';
  loadEnv(path.resolve(root, envFile));

  const url = process.env.SOCIETY_TURSO_DATABASE_URL || process.env.TURSO_DATABASE_URL;
  const token = process.env.SOCIETY_TURSO_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN;

  if (!url || !token) {
    console.error('Error: Please provide database URL and AUTH_TOKEN via .env.society or environment variables.');
    process.exit(1);
  }

  console.log(`Starting migration to new Turso target: ${url.replace(/\/\/.*@/, '//***@')}`);

  // Step 1: Apply all 14 schema migrations
  console.log('Step 1: Applying 14 schema migrations...');
  const migrations = readMigrations();
  const db = createClient({ url, authToken: token });
  try {
    const result = await applyMigrations(db, migrations, {
      through: '00014_admin_password_resets.sql',
      evidence: 'society_handover_migration_2026-11-19'
    });
    console.log('Migrations applied successfully:', result);
  } finally {
    db.close();
  }

  // Step 2: Replicate all data from backup
  console.log('Step 2: Replicating table data from verified backup...');
  await replicateData(url, token);

  console.log('🎉 Full database migration and verification completed successfully!');
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
