import { redirect } from 'next/navigation';
import { verifyAdmin } from '@/lib/admin-auth';
import { listAdminIssues } from '@/lib/admin-data';
import { getPublicCollectionSummary, listHomeShelfIssues, listHomeShelfYears, listLatestEmbargoedIssues, readGlobalHeroPlacements, readHeroPresentation } from '@/lib/db';
import type { ApiIssue, ApiMagazine } from '@/lib/api';
import { getPublicNavigationFromDb } from '@/lib/db';
import { HomeClient } from '@/app/home-client';

export const dynamic = 'force-dynamic';

export default async function HeroPreviewPage({params,searchParams}:{params:Promise<{issueId:string}>;searchParams:Promise<{device?:string;embed?:string}>}) {
  if(!await verifyAdmin('catalogue.view'))redirect('/admin/login');
  const [{issueId},query]=await Promise.all([params,searchParams]);
  const [issues,presentation,navigation,shelfYears,latestSubscriberEditions,collection,placements]=await Promise.all([listAdminIssues(),readHeroPresentation(issueId),getPublicNavigationFromDb(),listHomeShelfYears(),listLatestEmbargoedIssues(4,32),getPublicCollectionSummary(),readGlobalHeroPlacements()]);
  const selected=issues.find(issue=>issue.id===issueId);
  const hasBuiltInArtwork=selected?.magazines.name==='All India Magazine'&&selected.year===2026&&selected.month===10;
  if(!selected||(!presentation.desktop&&!hasBuiltInArtwork))redirect('/admin/hero');
  const magazine:ApiMagazine={id:selected.magazine_id,name:selected.magazines.name,language:selected.magazines.language,description:'',cover_image_url:null,created_at:'',updated_at:''};
  const issue:ApiIssue={id:selected.id,magazine_id:selected.magazine_id,title:selected.title,theme:selected.theme,year:selected.year,month:selected.month,description:selected.description,topics:selected.topics,pdf_url:selected.pdf_url,epub_url:null,mobi_url:null,cover_image_url:selected.cover_image_url,page_count:selected.page_count,file_size_bytes:selected.file_size_bytes,read_count:selected.read_count,download_count:selected.download_count,is_published:selected.is_published,is_embargoed:false,embargo_lift_label:null,embargo_lift_at:null,server_now:new Date().toISOString(),created_at:selected.created_at??'',updated_at:selected.updated_at??'',magazines:magazine,hero:{desktopUrl:presentation.desktop?`/api/admin/hero-assets/${issueId}/desktop`:'/aim-oct-2026-hero.png',mobileUrl:presentation.mobile?`/api/admin/hero-assets/${issueId}/mobile`:null,desktopTheme:{...(presentation.desktop?JSON.parse(presentation.desktop.theme):{}),layout:placements},mobileTheme:presentation.mobile?{...JSON.parse(presentation.mobile.theme),layout:placements}:null}};
  const shelfYear=shelfYears.at(-1)?.year;
  const recentIssues=shelfYear===undefined?[]:await listHomeShelfIssues(240,shelfYear);
  const content=<HomeClient recentIssues={recentIssues} shelfYears={shelfYears} latestSubscriberEditions={latestSubscriberEditions} carouselMagazines={[magazine]} carouselIssues={[issue]} pickerIssues={[{id:issue.id,magazine_id:issue.magazine_id,magazine_name:magazine.name,title:issue.title,theme:issue.theme,year:issue.year,month:issue.month,cover_image_url:issue.cover_image_url,readable:Boolean(issue.pdf_url)}]} navigation={navigation} collection={collection}/>;
  if(query.embed==='1')return content;
  const device=query.device==='phone'?'phone':query.device==='tablet'?'tablet':'desktop';
  const widths={desktop:1440,tablet:1024,phone:390};
  return <div className="min-h-screen bg-slate-100 p-4"><div className="mx-auto overflow-hidden rounded-xl bg-white shadow-xl" style={{maxWidth:widths[device]}}><iframe title={`${device} home page preview`} src={`/admin/hero-preview/${issueId}?embed=1`} className="h-[calc(100vh-2rem)] w-full border-0 bg-white"/></div></div>;
}
