import { createHash, randomBytes } from 'node:crypto';
import { getDb, createId, nowIso } from './client';
import { auditStatement } from './admin-accounts';

export interface ValidatedResetRecord {
  resetId: string;
  adminId: string;
  email: string;
  name: string;
}

export function hashResetToken(token: string): string {
  return createHash('sha256').update(token.trim()).digest('hex');
}

export async function createPasswordResetRecord(adminId: string, ttlMinutes = 30): Promise<string> {
  const token = randomBytes(32).toString('hex');
  const tokenHash = hashResetToken(token);
  const id = createId();
  const now = nowIso();
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString();

  await getDb().execute({
    sql: `
      INSERT INTO admin_password_resets (id, admin_id, token_hash, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?)
    `,
    args: [id, adminId, tokenHash, expiresAt, now],
  });

  return token;
}

export async function findValidPasswordReset(token: string): Promise<ValidatedResetRecord | null> {
  if (!token || typeof token !== 'string') return null;
  const tokenHash = hashResetToken(token);

  const result = await getDb().execute({
    sql: `
      SELECT r.id AS reset_id, r.admin_id, r.expires_at, r.used_at, a.email, a.name, a.is_active
      FROM admin_password_resets r
      JOIN admins a ON a.id = r.admin_id
      WHERE r.token_hash = ?
      LIMIT 1
    `,
    args: [tokenHash],
  });

  if (!result.rows.length) return null;
  const row = result.rows[0];

  // Check if used
  if (row.used_at) return null;

  // Check if expired
  const expiresAt = String(row.expires_at);
  if (Date.parse(expiresAt) <= Date.now()) return null;

  // Check if admin is active
  if (!Number(row.is_active)) return null;

  return {
    resetId: String(row.reset_id),
    adminId: String(row.admin_id),
    email: String(row.email),
    name: String(row.name),
  };
}

export async function completePasswordReset(token: string, newPasswordHash: string): Promise<boolean> {
  const valid = await findValidPasswordReset(token);
  if (!valid) return false;

  const tokenHash = hashResetToken(token);
  const now = nowIso();
  const tx = await getDb().transaction('write');

  try {
    // 1. Mark token used
    const markResult = await tx.execute({
      sql: 'UPDATE admin_password_resets SET used_at = ? WHERE token_hash = ? AND used_at IS NULL',
      args: [now, tokenHash],
    });
    if (!markResult.rowsAffected) {
      await tx.rollback();
      return false;
    }

    // 2. Update admin password and bump session version
    await tx.execute({
      sql: `
        UPDATE admins
        SET password_hash = ?,
            must_change_password = 0,
            temporary_password_expires_at = NULL,
            password_changed_at = ?,
            session_version = session_version + 1
        WHERE id = ?
      `,
      args: [newPasswordHash, now, valid.adminId],
    });

    // 3. Revoke active sessions
    await tx.execute({
      sql: 'UPDATE admin_sessions SET revoked_at = ? WHERE admin_id = ? AND revoked_at IS NULL',
      args: [now, valid.adminId],
    });

    // 4. Record audit log
    await tx.execute(auditStatement(valid.adminId, 'password.reset', valid.adminId, 'Self-service reset via email'));

    await tx.commit();
    return true;
  } catch (error) {
    await tx.rollback();
    throw error;
  }
}
