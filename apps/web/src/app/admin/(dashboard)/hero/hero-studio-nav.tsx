'use client';

import Link from 'next/link';
import { Images, ImageUp, SlidersHorizontal } from 'lucide-react';

export function HeroStudioNav({active,onPromptClick}:{active:'studio'|'library';onPromptClick?:()=>void}){
  const items=[
    {id:'studio' as const,label:'Studio',description:'Compose and preview',href:'/admin/hero',icon:SlidersHorizontal},
    {id:'library' as const,label:'Background library',description:'Search uploaded artwork',href:'/admin/hero/library',icon:Images},
  ];
  const promptContent=<><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-flame-600 shadow-sm ring-1 ring-flame-100"><ImageUp className="h-4 w-4"/></span><span className="min-w-0"><span className="block text-sm font-semibold text-gray-800">Generation prompt</span><span className="mt-0.5 block text-[11px] text-gray-500">Create matching backgrounds</span></span></>;
  const promptClass="group flex min-h-14 items-center gap-3 rounded-xl px-3 text-left transition-colors hover:bg-white hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-flame-300";
  return <nav aria-label="Hero Studio sections" className="grid gap-1.5 rounded-2xl border border-flame-100 bg-gradient-to-r from-[#fffaf0] via-white to-[#fff7ee] p-1.5 shadow-[0_10px_30px_rgba(94,61,25,0.07)] sm:grid-cols-3">
    {items.map(item=>{const selected=active===item.id;return <Link key={item.id} href={item.href} aria-current={selected?'page':undefined} className={`group flex min-h-14 items-center gap-3 rounded-xl px-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-flame-300 ${selected?'bg-gradient-to-r from-gold-500 to-flame-500 text-white shadow-[0_8px_20px_rgba(206,103,31,0.22)]':'text-gray-700 hover:bg-white hover:shadow-sm'}`}><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${selected?'bg-white/18 text-white ring-1 ring-white/25':'bg-white text-flame-600 shadow-sm ring-1 ring-flame-100'}`}><item.icon className="h-4 w-4"/></span><span className="min-w-0"><span className="block text-sm font-semibold">{item.label}</span><span className={`mt-0.5 block text-[11px] ${selected?'text-white/80':'text-gray-500'}`}>{item.description}</span></span></Link>})}
    {onPromptClick?<button type="button" onClick={onPromptClick} className={promptClass}>{promptContent}</button>:<Link href="/admin/hero?prompt=1" className={promptClass}>{promptContent}</Link>}
  </nav>;
}
