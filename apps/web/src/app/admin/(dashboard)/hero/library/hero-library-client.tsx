'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Images, Monitor, Search, Smartphone, X } from 'lucide-react';
import Image from '@/components/magazine/archive-image';
import type { AdminIssue } from '@/lib/admin-data';

type Asset={hash:string;width:number;height:number}|null;
type InventoryItem={issueId:string;desktop:Asset;mobile:Asset};
type Filter='all'|'desktop'|'mobile';

export function HeroLibraryClient({issues,inventory}:{issues:AdminIssue[];inventory:InventoryItem[]}){
  const [query,setQuery]=useState('');
  const [filter,setFilter]=useState<Filter>('all');
  const items=useMemo(()=>inventory.flatMap(item=>(['desktop','mobile'] as const).flatMap(slot=>{
    const asset=item[slot];if(!asset)return[];
    const issue=issues.find(candidate=>candidate.id===item.issueId);if(!issue)return[];
    return [{issue,slot,asset}];
  })).filter(item=>{
    if(filter!=='all'&&item.slot!==filter)return false;
    const haystack=`${item.issue.title} ${item.issue.magazines.name} ${item.issue.year} ${item.issue.month}`.toLocaleLowerCase();
    return haystack.includes(query.trim().toLocaleLowerCase());
  }),[filter,inventory,issues,query]);
  const desktopCount=inventory.filter(item=>item.desktop).length,mobileCount=inventory.filter(item=>item.mobile).length;

  return <section aria-labelledby="background-library-title" className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
    <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-flame-50 text-flame-700"><Images className="h-5 w-5"/></span><div><h2 id="background-library-title" className="font-semibold text-gray-900">Background library</h2><p className="mt-1 text-sm text-gray-600">{desktopCount} desktop/tablet and {mobileCount} phone backgrounds.</p></div></div><div className="flex flex-wrap gap-2">{(['all','desktop','mobile'] as const).map(value=><button key={value} type="button" onClick={()=>setFilter(value)} aria-pressed={filter===value} className={`inline-flex min-h-10 items-center gap-2 rounded-xl px-3.5 text-xs font-semibold ${filter===value?'bg-slate-900 text-white':'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'}`}>{value==='desktop'?<Monitor className="h-4 w-4"/>:value==='mobile'?<Smartphone className="h-4 w-4"/>:<Images className="h-4 w-4"/>}{value==='all'?'All backgrounds':value==='desktop'?'Desktop / tablet':'Phone'}</button>)}</div></div>
    <div className="relative mt-5"><Search className="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-gray-400"/><label htmlFor="hero-library-search" className="sr-only">Search background library</label><input id="hero-library-search" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search by issue, magazine, month or year…" className="h-12 w-full rounded-xl border border-gray-200 bg-gray-50/60 pr-11 pl-11 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-flame-300 focus:bg-white focus:ring-2 focus:ring-flame-100"/>{query&&<button type="button" onClick={()=>setQuery('')} aria-label="Clear search" className="absolute top-1/2 right-3 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-800"><X className="h-4 w-4"/></button>}</div>
    <p className="mt-3 text-xs text-gray-500">{items.length} matching background{items.length===1?'':'s'}</p>
    {items.length===0?<div className="mt-5 rounded-xl bg-gray-50 px-4 py-12 text-center text-sm text-gray-500">No backgrounds match this search.</div>:<div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{items.map(item=><Link key={`${item.issue.id}-${item.slot}`} href={`/admin/hero?issue=${encodeURIComponent(item.issue.id)}`} className="group overflow-hidden rounded-xl border border-gray-200 bg-gray-50 transition-colors hover:border-flame-300 focus:outline-none focus:ring-2 focus:ring-flame-300"><div className={`relative overflow-hidden bg-gray-100 ${item.slot==='mobile'?'aspect-[16/10]':'aspect-[16/9]'}`}><Image fill unoptimized sizes="(min-width:1024px) 340px,(min-width:640px) 48vw,100vw" src={`/api/admin/hero-assets/${item.issue.id}/${item.slot}`} alt={`${item.issue.title} ${item.slot} background`} className="object-cover transition-transform duration-300 group-hover:scale-[1.025]"/></div><div className="p-3"><p className="truncate text-sm font-semibold text-gray-900">{item.issue.title}</p><div className="mt-1 flex items-center justify-between gap-3 text-xs text-gray-500"><span>{item.slot==='desktop'?'Desktop / tablet':'Phone'}</span><span className="tabular-nums">{item.asset.width}×{item.asset.height}</span></div></div></Link>)}</div>}
  </section>;
}
