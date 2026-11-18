import { NextRequest, NextResponse } from 'next/server';
import { sameOrigin } from '@/lib/admin-request';
import { adminPasswordResetRateLimit } from '@/lib/rate-limit';
import { boundedJson } from '@/lib/request-body';
import { hashAdminPassword, validateAdminPassword } from '@/lib/admin-password';
import { completePasswordReset, findValidPasswordReset } from '@/lib/db/admin-password-resets';

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token') || '';
  if (!token) {
    return NextResponse.json({ valid: false, error: 'Missing reset token.' }, { status: 400 });
  }

  const validRecord = await findValidPasswordReset(token);
  if (!validRecord) {
    return NextResponse.json({ valid: false, error: 'This password reset link is invalid or has expired.' }, { status: 400 });
  }

  return NextResponse.json({
    valid: true,
    email: validRecord.email,
    name: validRecord.name,
  });
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  }

  const limited = await adminPasswordResetRateLimit(request);
  if (limited) return limited;

  const parsedBody = await boundedJson(request, 4 * 1024);
  if (!parsedBody.ok) return parsedBody.response;

  const body = parsedBody.value as { token?: unknown; newPassword?: unknown } | null;
  const token = typeof body?.token === 'string' ? body.token.trim() : '';
  const newPassword = typeof body?.newPassword === 'string' ? body.newPassword : '';

  if (!token) {
    return NextResponse.json({ error: 'Missing or invalid reset token.' }, { status: 400 });
  }

  if (!validateAdminPassword(newPassword)) {
    return NextResponse.json({ error: 'Password must be at least 12 characters.' }, { status: 400 });
  }

  const validRecord = await findValidPasswordReset(token);
  if (!validRecord) {
    return NextResponse.json({ error: 'This reset link has expired or has already been used. Please request a new one.' }, { status: 400 });
  }

  try {
    const passwordHash = await hashAdminPassword(newPassword);
    const completed = await completePasswordReset(token, passwordHash);

    if (!completed) {
      return NextResponse.json({ error: 'Could not reset password. Please try again or request a new link.' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Password has been updated successfully. You can now sign in with your new password.',
    });
  } catch (error) {
    console.error('Failed to complete password reset:', error);
    return NextResponse.json({ error: 'An unexpected error occurred. Please try again.' }, { status: 500 });
  }
}
