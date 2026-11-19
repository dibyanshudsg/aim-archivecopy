import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const societyEnv = fs.readFileSync(path.join(root, '.env.society'), 'utf8');

const urlMatch = societyEnv.match(/SOCIETY_TURSO_DATABASE_URL=([^\r\n]+)/);
const tokenMatch = societyEnv.match(/SOCIETY_TURSO_AUTH_TOKEN=([^\r\n]+)/);

if (!urlMatch || !tokenMatch) {
  console.error('Could not find credentials in .env.society');
  process.exit(1);
}

const url = urlMatch[1].trim().replace(/^["']|["']$/g, '');
const token = tokenMatch[1].trim().replace(/^["']|["']$/g, '');

const envLocalPath = path.join(root, 'apps/web/.env.local');
let envLocal = fs.readFileSync(envLocalPath, 'utf8');

envLocal = envLocal.replace(/TURSO_DATABASE_URL=[^\r\n]+/, `TURSO_DATABASE_URL="${url}"`);
envLocal = envLocal.replace(/TURSO_AUTH_TOKEN=[^\r\n]+/, `TURSO_AUTH_TOKEN="${token}"`);

fs.writeFileSync(envLocalPath, envLocal, 'utf8');
console.log('Successfully switched apps/web/.env.local to Society Turso database!');
