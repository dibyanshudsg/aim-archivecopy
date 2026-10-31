import { verifyAdmin } from '@/lib/admin-auth';
import { listHeroArtworkInventory, readGlobalHeroPlacements, readHeroPromptTemplate } from '@/lib/db';
import { HeroAdminClient } from './hero-admin-client';
import { listAdminIssues } from '@/lib/admin-data';

export const dynamic = 'force-dynamic';

export default async function HeroAdminPage({searchParams}:{searchParams:Promise<{prompt?:string;issue?:string}>}) {
  const admin = await verifyAdmin();
  const query=await searchParams;
  const [prompt, issues, artworkInventory, placements] = await Promise.all([
    readHeroPromptTemplate(),
    listAdminIssues(),
    listHeroArtworkInventory(),
    readGlobalHeroPlacements(),
  ]);
  const safeArtworkInventory=artworkInventory.map(item=>({
    issueId:item.issueId,
    desktop:item.desktop&&{hash:item.desktop.hash,width:item.desktop.width,height:item.desktop.height,theme:item.desktop.theme},
    mobile:item.mobile&&{hash:item.mobile.hash,width:item.mobile.width,height:item.mobile.height,theme:item.mobile.theme},
  }));
  return <HeroAdminClient initialPrompt={prompt} issues={issues} initialArtworkInventory={safeArtworkInventory} initialPlacements={placements} initialPromptOpen={query.prompt==='1'} initialIssueId={query.issue} canManage={Boolean(admin?.permissions.includes('catalogue.publish'))} />;
}
