import { NextRequest, NextResponse } from 'next/server';
import { sameOrigin } from '@/lib/admin-request';
import { adminPasswordResetRateLimit } from '@/lib/rate-limit';
import { boundedJson } from '@/lib/request-body';
import { findAdminAccountByEmail } from '@/lib/db/admin-accounts';
import { createPasswordResetRecord } from '@/lib/db/admin-password-resets';
import { sendPasswordResetEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  }

  const generalLimited = await adminPasswordResetRateLimit(request);
  if (generalLimited) return generalLimited;

  const parsedBody = await boundedJson(request, 4 * 1024);
  if (!parsedBody.ok) return parsedBody.response;

  const body = parsedBody.value as { email?: unknown } | null;
  const rawEmail = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';

  if (!rawEmail || !rawEmail.includes('@') || rawEmail.length > 120) {
    return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
  }

  const accountLimited = await adminPasswordResetRateLimit(request, rawEmail);
  if (accountLimited) return accountLimited;

  try {
    const admin = await findAdminAccountByEmail(rawEmail);

    if (admin && admin.isActive) {
      const token = await createPasswordResetRecord(admin.id, 30);
      const appUrl = (process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin).replace(/\/+$/, '');
      const resetUrl = `${appUrl}/admin/reset-password?token=${encodeURIComponent(token)}`;

      await sendPasswordResetEmail({
        to: admin.email,
        adminName: admin.name || 'Administrator',
        resetUrl,
      });
    }
  } catch (error) {
    console.error('Failed to process password reset request:', error);
    // Don't leak internal mail or DB errors to prevent reconnaissance, but log for debugging
  }

  // Consistent generic response prevents user enumeration
  return NextResponse.json({
    success: true,
    message: 'If an active administrator account exists for this email, password reset instructions have been sent.',
  });
}
