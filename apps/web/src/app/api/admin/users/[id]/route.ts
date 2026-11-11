import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { randomBytes } from 'node:crypto';
import { adminApiFailure, authorizeAdmin, sameOrigin } from '@/lib/admin-request';
import { findAdminAccount, listAdminRoles, removeAdminAccount, resetAdminPassword, updateAdminAccount } from '@/lib/db/admin-accounts';
import { hashAdminPassword } from '@/lib/admin-password';
import { boundedJson } from '@/lib/request-body';
import { readAdminAvatarKey } from '@/lib/admin-avatar';
import { deleteFromR2 } from '@/lib/r2-client';

const schema = z.object({ name: z.string().trim().min(2).max(100).optional(), roleId: z.string().min(1).max(100).optional(), isActive: z.boolean().optional() }).strict();
type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Context) {
  const { admin, error } = await authorizeAdmin('users.manage', request);
  if (error) return error;
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  const { id } = await params;
  const target = await findAdminAccount(id);
  if (!target) return NextResponse.json({ error: 'User not found.' }, { status: 404 });
  if (target.roleId === 'owner' && admin!.roleId !== 'owner') return NextResponse.json({ error: 'Only the Owner can change the Owner account.' }, { status: 403 });
  const body = await boundedJson(request, 4 * 1024);
  if (!body.ok) return body.response;
  const parsed = schema.safeParse(body.value);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid user changes.' }, { status: 400 });
  if (parsed.data.roleId === 'owner') return NextResponse.json({ error: 'Owner is a protected account and cannot be assigned.' }, { status: 400 });
  if (parsed.data.roleId && !(await listAdminRoles()).some(role => role.id === parsed.data.roleId)) return NextResponse.json({ error: 'Choose an existing role.' }, { status: 400 });
  if (id === admin!.id && (parsed.data.isActive === false || parsed.data.roleId && parsed.data.roleId !== admin!.roleId))
    return NextResponse.json({ error: 'Use another Owner account to change your own access.' }, { status: 409 });
  try {
    if (!await updateAdminAccount(id, parsed.data, admin!.id)) return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) { return adminApiFailure(error, 'Could not update user.', 409, ['The last active Owner cannot be disabled or reassigned.']); }
}

export async function POST(request: NextRequest, { params }: Context) {
  const { admin, error } = await authorizeAdmin('users.manage', request);
  if (error) return error;
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  const { id } = await params;
  const target = await findAdminAccount(id);
  if (!target) return NextResponse.json({ error: 'User not found.' }, { status: 404 });
  if (target.roleId === 'owner' && admin!.roleId !== 'owner') return NextResponse.json({ error: 'Only the Owner can reset the Owner password.' }, { status: 403 });
  if (id === admin!.id) return NextResponse.json({ error: 'Change your own password from Change Password.' }, { status: 400 });
  const temporaryPassword = randomBytes(24).toString('base64url');
  await resetAdminPassword(id, await hashAdminPassword(temporaryPassword), admin!.id);
  return NextResponse.json({ temporaryPassword }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function DELETE(request: NextRequest, { params }: Context) {
  const { admin, error } = await authorizeAdmin('users.manage', request);
  if (error) return error;
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  const { id } = await params;
  if (id === admin!.id) return NextResponse.json({ error: 'You cannot remove your own account.' }, { status: 409 });
  try {
    const target = await findAdminAccount(id);
    if (!target) return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    if (target.roleId === 'owner' && admin!.roleId !== 'owner') return NextResponse.json({ error: 'The Owner account cannot be removed.' }, { status: 403 });
    const avatarKey = await readAdminAvatarKey(id);
    const result = await removeAdminAccount(id, admin!.id);
    if (result === 'not-found') return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    if (result === 'active') return NextResponse.json({ error: 'Deactivate this admin before removing them permanently.' }, { status: 409 });
    if (avatarKey) await deleteFromR2(avatarKey).catch(() => undefined);
    return NextResponse.json({ success: true });
  } catch (error) { return adminApiFailure(error, 'Could not remove user.', 409); }
}
