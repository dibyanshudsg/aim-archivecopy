import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, createSessionToken, ADMIN_COOKIE, SESSION_TTL_SECONDS } from '@/lib/admin-auth';
import { verifyAdminPassword } from '@/lib/admin-password';
import { findAdminAccount, updateOwnerEmail, isRemovedAdminEmail } from '@/lib/db/admin-accounts';
import { getDb } from '@/lib/db/client';
import { sameOrigin } from '@/lib/admin-request';
import { adminMutationRateLimit } from '@/lib/rate-limit';
import { boundedJson } from '@/lib/request-body';

export async function POST(request: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (admin.roleId !== 'owner') {
    return NextResponse.json({ error: 'Only the Owner can update their email address.' }, { status: 403 });
  }
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });

  const limited = await adminMutationRateLimit(request, admin.id, 'credential');
  if (limited) return limited;

  const parsedBody = await boundedJson(request, 4 * 1024);
  if (!parsedBody.ok) return parsedBody.response;

  const body = parsedBody.value as { newEmail?: unknown; currentPassword?: unknown } | null;
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const newEmail = typeof body.newEmail === 'string' ? body.newEmail.trim().toLowerCase() : '';
  const currentPassword = typeof body.currentPassword === 'string' ? body.currentPassword : '';

  if (!newEmail || !newEmail.includes('@') || newEmail.length > 120 || /[<>\s\u0000-\u001f]/.test(newEmail)) {
    return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
  }
  if (!currentPassword) {
    return NextResponse.json({ error: 'Please enter your current password to authorize this change.' }, { status: 400 });
  }

  const valid = admin.passwordHash
    ? await verifyAdminPassword(currentPassword, admin.passwordHash)
    : Boolean(process.env.ADMIN_LEGACY_ENROLLMENT === '1' && process.env.ADMIN_PASSWORD && currentPassword === process.env.ADMIN_PASSWORD);
  if (!valid) {
    return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 400 });
  }

  if (newEmail === admin.email.toLowerCase()) {
    return NextResponse.json({ error: 'New email is identical to your current email.' }, { status: 400 });
  }

  const existing = await getDb().execute({
    sql: 'SELECT id FROM admins WHERE email = ? AND id != ? LIMIT 1',
    args: [newEmail, admin.id],
  });
  if (existing.rows.length > 0) {
    return NextResponse.json({ error: 'This email address is already in use by another admin.' }, { status: 400 });
  }

  if (await isRemovedAdminEmail(newEmail)) {
    return NextResponse.json({ error: 'This email address is reserved or removed.' }, { status: 400 });
  }

  try {
    await updateOwnerEmail(admin.id, newEmail);
    const updated = await findAdminAccount(admin.id);
    if (!updated) {
      return NextResponse.json({ error: 'Failed to reload updated account.' }, { status: 500 });
    }

    const response = NextResponse.json({ success: true, email: updated.email });
    response.cookies.set(ADMIN_COOKIE, await createSessionToken(updated), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_TTL_SECONDS,
      path: '/',
    });
    return response;
  } catch (error) {
    console.error('Failed to update owner email:', error);
    return NextResponse.json({ error: 'Could not update email address. Please try again.' }, { status: 500 });
  }
}
