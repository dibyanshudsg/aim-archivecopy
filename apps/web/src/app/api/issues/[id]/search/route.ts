import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { searchIssueText } from '@/lib/db';
import { publicRateLimit } from '@/lib/rate-limit';

const querySchema = z.string().trim().min(1).max(200);
const idSchema = z.string().uuid();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const limited = await publicRateLimit(request, 'search');
  if (limited) return limited;

  const { id } = await params;
  const parsedId = idSchema.safeParse(id);
  const parsedQuery = querySchema.safeParse(request.nextUrl.searchParams.get('q'));
  if (!parsedId.success || !parsedQuery.success) {
    return NextResponse.json({ error: 'Enter text to find.' }, { status: 400 });
  }

  try {
    const data = await searchIssueText({
      query: parsedQuery.data,
      issueId: parsedId.data,
      availability: 'read',
      limit: 50,
    });
    return NextResponse.json(
      { data, total: data.length, limited: data.length >= 50 },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return NextResponse.json({ error: 'Find in text is temporarily unavailable.' }, { status: 503 });
  }
}
