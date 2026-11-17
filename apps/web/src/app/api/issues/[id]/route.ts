import { after, NextRequest, NextResponse } from 'next/server';
import { getPublicIssueById, incrementIssueReadCount, readHeroPresentation, readGlobalHeroPlacements } from '@/lib/db';
import { publicRateLimit } from '@/lib/rate-limit';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const limited = await publicRateLimit(request, 'catalogue');
  if (limited) return limited;
  const { id } = await params;
  const issue = await getPublicIssueById(id);
  if (!issue) {
    return NextResponse.json({ error: 'Issue not found', code: 'NOT_FOUND' }, { status: 404 });
  }

  const track = request.nextUrl.searchParams.get('track') !== '0';
  if (!issue.is_embargoed && track) {
    after(async () => {
      try {
        await incrementIssueReadCount(id);
      } catch (incrementError) {
        console.error('Failed to increment read count:', incrementError);
      }
    });
  }

  const [presentation, placements] = await Promise.all([
    readHeroPresentation(id),
    readGlobalHeroPlacements(),
  ]);

  let desktopThemeJson = {};
  try {
    desktopThemeJson = presentation.desktop?.theme ? JSON.parse(presentation.desktop.theme) : {};
  } catch {}

  let mobileThemeJson = {};
  try {
    mobileThemeJson = presentation.mobile?.theme ? JSON.parse(presentation.mobile.theme) : {};
  } catch {}

  const heroIssue = {
    ...issue,
    cover_image_url: issue.cover_image_url && issue.updated_at ? `${issue.cover_image_url}?v=${encodeURIComponent(issue.updated_at)}` : issue.cover_image_url,
    hero: presentation.desktop ? {
      desktopUrl: `/api/hero-assets/${id}/desktop?v=${encodeURIComponent(presentation.desktop.hash)}`,
      mobileUrl: presentation.mobile ? `/api/hero-assets/${id}/mobile?v=${encodeURIComponent(presentation.mobile.hash)}` : null,
      desktopTheme: { ...desktopThemeJson, layout: placements },
      mobileTheme: presentation.mobile ? { ...mobileThemeJson, layout: placements } : null,
    } : {
      desktopUrl: '/aim-oct-2026-hero.png',
      mobileUrl: null,
      desktopTheme: { layout: placements },
      mobileTheme: { layout: placements },
    },
  };

  return NextResponse.json(heroIssue, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
