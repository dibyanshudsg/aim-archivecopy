import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAdmin } from '@/lib/admin-auth';
import { adminAccessFailure, adminApiFailure } from '@/lib/admin-request';
import { auditAdmin } from '@/lib/db/admin-accounts';
import { readHeroPromptTemplate, saveHeroPromptTemplate } from '@/lib/db';
import { boundedJson } from '@/lib/request-body';
import { adminMutationRateLimit } from '@/lib/rate-limit';
import { DEFAULT_HERO_BACKGROUND_PROMPT, HERO_PROMPT_MAX_LENGTH } from '@/lib/hero-background-prompt';

const schema = z.object({
  text: z.string().trim().min(100).max(HERO_PROMPT_MAX_LENGTH),
  revision: z.number().int().min(0),
});

export async function GET() {
  const admin = await verifyAdmin('catalogue.view');
  if (!admin) return adminAccessFailure();
  try { return NextResponse.json(await readHeroPromptTemplate(), { headers: { 'Cache-Control': 'no-store' } }); }
  catch (error) { return adminApiFailure(error, 'Could not load the hero prompt'); }
}

export async function PATCH(request: NextRequest) {
  const admin = await verifyAdmin('catalogue.publish');
  if (!admin) return adminAccessFailure();
  const limited = await adminMutationRateLimit(request, admin.id);
  if (limited) return limited;
  const body = await boundedJson(request, 32 * 1024);
  if (!body.ok) return body.response;
  const parsed = schema.safeParse(body.value);
  if (!parsed.success) return NextResponse.json({ error: 'Prompt text or revision is invalid', code: 'VALIDATION' }, { status: 400 });
  try {
    const saved = await saveHeroPromptTemplate(parsed.data.text, parsed.data.revision, admin.id);
    if (!saved) return NextResponse.json({ error: 'This prompt was changed by another administrator. Reload before saving.', code: 'REVISION_CONFLICT' }, { status: 409 });
    await auditAdmin(admin.id, 'hero.prompt.updated', undefined, `revision:${saved.revision}`);
    return NextResponse.json(saved, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return adminApiFailure(error, 'Could not save the hero prompt'); }
}

export async function DELETE(request: NextRequest) {
  const admin = await verifyAdmin('catalogue.publish');
  if (!admin) return adminAccessFailure();
  const limited = await adminMutationRateLimit(request, admin.id);
  if (limited) return limited;
  const body = await boundedJson(request, 1024);
  if (!body.ok) return body.response;
  const parsed = z.object({ revision: z.number().int().min(0) }).safeParse(body.value);
  if (!parsed.success) return NextResponse.json({ error: 'Revision is invalid', code: 'VALIDATION' }, { status: 400 });
  try {
    const saved = await saveHeroPromptTemplate(DEFAULT_HERO_BACKGROUND_PROMPT, parsed.data.revision, admin.id);
    if (!saved) return NextResponse.json({ error: 'This prompt was changed by another administrator. Reload before resetting.', code: 'REVISION_CONFLICT' }, { status: 409 });
    await auditAdmin(admin.id, 'hero.prompt.reset', undefined, `revision:${saved.revision}`);
    return NextResponse.json(saved, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return adminApiFailure(error, 'Could not reset the hero prompt'); }
}
