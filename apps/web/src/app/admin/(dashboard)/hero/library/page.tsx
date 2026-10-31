import { verifyAdmin } from '@/lib/admin-auth';
import { listAdminIssues } from '@/lib/admin-data';
import { listHeroArtworkInventory } from '@/lib/db';
import { AdminPageTitle } from '../../admin-page-title';
import { HeroStudioNav } from '../hero-studio-nav';
import { HeroLibraryClient } from './hero-library-client';

export const dynamic='force-dynamic';

export default async function HeroLibraryPage(){
  await verifyAdmin();
  const [issues,inventory]=await Promise.all([listAdminIssues(),listHeroArtworkInventory()]);
  const safeInventory=inventory.map(item=>({issueId:item.issueId,desktop:item.desktop&&{hash:item.desktop.hash,width:item.desktop.width,height:item.desktop.height},mobile:item.mobile&&{hash:item.mobile.hash,width:item.mobile.width,height:item.mobile.height}}));
  return <div className="max-w-6xl space-y-6"><AdminPageTitle title="Hero studio" description="Search and review every uploaded hero background."/><HeroStudioNav active="library"/><HeroLibraryClient issues={issues} inventory={safeInventory}/></div>;
}
