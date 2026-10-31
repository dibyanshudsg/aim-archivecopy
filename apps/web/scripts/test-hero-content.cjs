/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('node:fs');
const path = require('node:path');
const { createClient } = require('@libsql/client');

async function main() {
  const db = createClient({ url: ':memory:' });
  await db.executeMultiple(`PRAGMA foreign_keys=ON;
    CREATE TABLE admins(id TEXT PRIMARY KEY);
    CREATE TABLE magazines(id TEXT PRIMARY KEY);
    CREATE TABLE issues(id TEXT PRIMARY KEY, magazine_id TEXT NOT NULL REFERENCES magazines(id) ON DELETE CASCADE);`);
  const migration = fs.readFileSync(path.resolve(__dirname, '../../../packages/turso/migrations/00012_hero_presentations.sql'), 'utf8');
  await db.executeMultiple(migration);
  await db.batch([
    { sql:'INSERT INTO admins(id) VALUES(?)',args:['admin'] },
    { sql:'INSERT INTO magazines(id) VALUES(?)',args:['aim'] },
    { sql:'INSERT INTO issues(id,magazine_id) VALUES(?,?)',args:['nov-2021','aim'] },
    { sql:`INSERT INTO issue_hero_presentations(issue_id,desktop_key,desktop_width,desktop_height,desktop_hash,updated_by,updated_at) VALUES(?,?,?,?,?,?,?)`,args:['nov-2021','hero/nov.png',1672,941,'hash','admin',new Date().toISOString()] },
    { sql:`INSERT INTO hero_prompt_templates(id,template_text,revision,updated_by,updated_at) VALUES('master',?,1,?,?)`,args:['prompt','admin',new Date().toISOString()] },
  ],'write');
  let rejected = false;
  try { await db.execute({ sql:`UPDATE issue_hero_presentations SET desktop_width=100 WHERE issue_id=?`,args:['nov-2021'] }); } catch { rejected = true; }
  if (!rejected) throw new Error('Dimension constraint did not reject invalid desktop artwork');
  await db.execute({ sql:'DELETE FROM issues WHERE id=?',args:['nov-2021'] });
  const remaining = await db.execute('SELECT count(*) AS total FROM issue_hero_presentations');
  if (Number(remaining.rows[0].total) !== 0) throw new Error('Issue cascade did not remove hero presentation');

  const fixture = fs.readFileSync(path.resolve(__dirname, '../public/aim-oct-2026-hero.png'));
  if (!fixture.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) throw new Error('Hero fixture is not PNG');
  if (fixture.readUInt32BE(16) !== 1672 || fixture.readUInt32BE(20) !== 941) throw new Error('Hero fixture dimensions do not match 1672x941');
  await db.close();
  console.log('hero content checks passed');
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
