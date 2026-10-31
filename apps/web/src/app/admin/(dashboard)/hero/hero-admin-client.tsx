'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowDownUp, CalendarDays, ChevronDown, Clipboard, ExternalLink, Images, ImageUp, ListFilter, Monitor, Palette, RotateCcw, Search, Save, Smartphone, Tablet, Upload, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { AdminPageTitle } from '../admin-page-title';
import { useUI } from '@/components/ui/toast';
import type { HeroPromptTemplate } from '@/lib/db';
import type { AdminIssue } from '@/lib/admin-data';
import { HERO_PLACEMENT_DEFAULTS, resolveHeroPlacement, type HeroPlacement, type HeroPlacements } from '@/lib/hero-placement';
import type { HeroSceneTheme } from '@/components/home/this-month-featured';
import Image from '@/components/magazine/archive-image';
import { HeroStudioNav } from './hero-studio-nav';

type Artwork = { hash:string;width:number;height:number;theme:string } | null;
type ArtworkInventoryItem={issueId:string;desktop:Artwork;mobile:Artwork};
export function HeroAdminClient({ initialPrompt, issues, initialArtworkInventory, initialPlacements, initialPromptOpen, initialIssueId, canManage }: { initialPrompt: HeroPromptTemplate; issues:AdminIssue[]; initialArtworkInventory:ArtworkInventoryItem[]; initialPlacements:HeroPlacements; initialPromptOpen:boolean; initialIssueId?:string; canManage: boolean }) {
  const { toast } = useUI();
  const router=useRouter();
  const [saved, setSaved] = useState(initialPrompt);
  const [text, setText] = useState(initialPrompt.text);
  const [busy, setBusy] = useState(false);
  const dirty = text !== saved.text;
  const ordered = issues.filter(issue => issue.magazines.name === 'All India Magazine').sort((a,b) => b.year-a.year || b.month-a.month);
  const [issueId,setIssueId] = useState(ordered.some(issue=>issue.id===initialIssueId)?initialIssueId!:ordered[0]?.id ?? '');
  const [artwork,setArtwork] = useState<{desktop:Artwork;mobile:Artwork}>({desktop:null,mobile:null});
  const [assetBusy,setAssetBusy] = useState<string | null>(null);
  const [assetVersion,setAssetVersion] = useState(0);
  const [artworkInventory,setArtworkInventory] = useState(initialArtworkInventory);
  const [themeBusy,setThemeBusy] = useState(false);
  const [previewDevice,setPreviewDevice] = useState<'desktop'|'tablet'|'phone'>('desktop');
  const [placementPreview,setPlacementPreview] = useState<HeroPlacement|null>(null);
  const [globalPlacements,setGlobalPlacements]=useState(initialPlacements);
  const [promptOpen,setPromptOpen]=useState(initialPromptOpen);
  const selected = ordered.find((issue) => issue.id === issueId);
  const hasBuiltInArtwork = selected?.magazines.name === 'All India Magazine' && selected.year === 2026 && selected.month === 10;

  useEffect(() => { if (!issueId) return; fetch(`/api/admin/hero-assets?issueId=${encodeURIComponent(issueId)}`,{cache:'no-store'}).then(async response => { if (!response.ok) throw new Error(); return response.json(); }).then(setArtwork).catch(() => setArtwork({desktop:null,mobile:null})); },[issueId,assetVersion]);

  useEffect(() => {
    if (!assetVersion) return;
    fetch('/api/admin/hero-assets?inventory=1', { cache: 'no-store' })
      .then(async (response) => response.ok ? response.json() : Promise.reject())
      .then((data) => setArtworkInventory(data.inventory))
      .catch(() => undefined);
  }, [assetVersion]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty) event.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  async function persist(method: 'PATCH' | 'DELETE') {
    if (method === 'DELETE' && !window.confirm('Restore the shipped master prompt? Your current saved text will be replaced.')) return;
    setBusy(true);
    try {
      const response = await fetch('/api/admin/hero-prompt', {
        method, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(method === 'PATCH' ? { text, revision: saved.revision } : { revision: saved.revision }),
      });
      const data = await response.json() as HeroPromptTemplate & { error?: string };
      if (!response.ok) throw new Error(data.error || 'Could not save prompt');
      setSaved(data); setText(data.text);
      toast.success(method === 'PATCH' ? 'Hero prompt saved' : 'Master prompt restored');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not save prompt'); }
    finally { setBusy(false); }
  }

  async function copy() {
    await navigator.clipboard.writeText(text);
    toast.success('Prompt copied');
  }

  async function upload(slot:'desktop'|'mobile',file:File|null) {
    if (!file || !selected) return; setAssetBusy(slot);
    try { const body=new FormData(); body.set('issueId',selected.id); body.set('slot',slot); body.set('image',file); const response=await fetch('/api/admin/hero-assets',{method:'POST',body}); const data=await response.json(); if(!response.ok) throw new Error(data.error||'Could not upload artwork'); setAssetVersion(Date.now()); toast.success(`${slot==='desktop'?'Desktop':'Phone'} artwork saved`); }
    catch(error){ toast.error(error instanceof Error?error.message:'Could not upload artwork'); } finally { setAssetBusy(null); }
  }

  async function remove(slot:'desktop'|'mobile') {
    if(!selected||!window.confirm(`Remove the ${slot} artwork for this issue?`)) return; setAssetBusy(slot);
    try { const response=await fetch(`/api/admin/hero-assets?issueId=${encodeURIComponent(selected.id)}&slot=${slot}`,{method:'DELETE'}); const data=await response.json(); if(!response.ok) throw new Error(data.error||'Could not remove artwork'); setAssetVersion(Date.now()); toast.success('Artwork removed'); }
    catch(error){toast.error(error instanceof Error?error.message:'Could not remove artwork');} finally{setAssetBusy(null);}
  }

  async function saveTheme(mode:'auto'|'dark'|'light',accent:string|null) {
    const slot=previewDevice==='phone'?'mobile':'desktop';
    if(!selected||!artwork[slot])return; setThemeBusy(true);
    try{const response=await fetch('/api/admin/hero-assets',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({issueId:selected.id,slot,mode,accent})});const data=await response.json();if(!response.ok)throw new Error(data.error||'Could not save colours');setAssetVersion(Date.now());toast.success('Hero colours saved');}
    catch(error){toast.error(error instanceof Error?error.message:'Could not save colours');}finally{setThemeBusy(false);}
  }

  async function savePlacement(placement:HeroPlacement) {
    const slot=previewDevice==='phone'?'mobile':'desktop';
    if(!selected||!artwork[slot])return false;setThemeBusy(true);
    try{const response=await fetch('/api/admin/hero-assets',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({issueId:selected.id,slot,mode:activeTheme.preference??'auto',accent:activeTheme.accentOverride??null,placement:{device:previewDevice,...placement}})});const data=await response.json();if(!response.ok)throw new Error(data.error||'Could not save placement');setGlobalPlacements(data.placements);setPlacementPreview(null);setAssetVersion(Date.now());toast.success(`${previewDevice[0].toUpperCase()+previewDevice.slice(1)} placement saved for all magazines`);return true;}
    catch(error){toast.error(error instanceof Error?error.message:'Could not save placement');return false;}finally{setThemeBusy(false);}
  }

  const now=new Date(), future=selected ? selected.year>now.getFullYear() || (selected.year===now.getFullYear()&&selected.month>now.getMonth()+1):false;
  const desktopTheme=artwork.desktop ? JSON.parse(artwork.desktop.theme) as HeroSceneTheme & {preference?:'auto'|'dark'|'light';accentOverride?:string|null}:{};
  const mobileTheme=artwork.mobile ? JSON.parse(artwork.mobile.theme) as HeroSceneTheme & {preference?:'auto'|'dark'|'light';accentOverride?:string|null}:{};
  const activeArtwork=previewDevice==='phone'?artwork.mobile:artwork.desktop;
  const activeTheme=previewDevice==='phone'?mobileTheme:desktopTheme;
  const desktopCount=artworkInventory.filter(item=>item.desktop).length;
  const mobileCount=artworkInventory.filter(item=>item.mobile).length;
  const completeCount=artworkInventory.filter(item=>item.desktop&&item.mobile).length;
  const coveragePercent=issues.length?Math.round(completeCount/issues.length*100):0;
  const closePrompt=()=>{if(dirty){if(!window.confirm('Discard unsaved prompt changes?'))return;setText(saved.text);}setPromptOpen(false);router.replace('/admin/hero',{scroll:false});};

  return <div className="max-w-6xl space-y-6">
    <AdminPageTitle title="Hero studio" description="Prepare issue artwork, preview every hero, and keep the background-generation instructions ready." />
    <HeroStudioNav active="studio" onPromptClick={()=>setPromptOpen(true)} />

    <section aria-labelledby="hero-coverage-heading" className="overflow-hidden rounded-2xl border border-flame-100 bg-gradient-to-r from-white via-[#fffaf1] to-[#fff4e9] shadow-[0_12px_32px_rgba(120,77,30,0.07)]">
      <div className="grid gap-5 px-5 py-5 lg:grid-cols-[minmax(280px,1fr)_minmax(420px,.9fr)] lg:items-center lg:px-6">
        <div className="flex min-w-0 items-start gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-gold-100 to-flame-100 text-flame-700 ring-1 ring-flame-200"><Images className="h-5 w-5"/></span><div className="min-w-0 flex-1"><div className="flex items-baseline justify-between gap-3"><h2 id="hero-coverage-heading" className="font-semibold text-gray-900">Artwork coverage</h2><span className="text-sm font-bold tabular-nums text-flame-700">{coveragePercent}%</span></div><p className="mt-1 text-sm text-gray-600">{completeCount} of {issues.length} issues have both required backgrounds.</p><div className="mt-3 h-2 overflow-hidden rounded-full bg-flame-100" role="progressbar" aria-label="Complete hero artwork sets" aria-valuemin={0} aria-valuemax={issues.length} aria-valuenow={completeCount}><div className="h-full rounded-full bg-gradient-to-r from-gold-500 to-flame-500 transition-[width] duration-500" style={{width:`${coveragePercent}%`}}/></div></div></div>
        <div className="grid grid-cols-3 divide-x divide-flame-100">
          <div className="px-3 first:pl-0 sm:px-5"><p className="text-2xl font-semibold tabular-nums text-gray-900">{completeCount}<span className="text-sm font-normal text-gray-400">/{issues.length}</span></p><p className="mt-1 text-xs text-gray-500">Complete sets</p></div>
          <div className="px-3 sm:px-5"><p className="text-2xl font-semibold tabular-nums text-gray-900">{desktopCount}<span className="text-sm font-normal text-gray-400">/{issues.length}</span></p><p className="mt-1 text-xs text-gray-500">Desktop / tablet</p></div>
          <div className="px-3 last:pr-0 sm:px-5"><p className="text-2xl font-semibold tabular-nums text-gray-900">{mobileCount}<span className="text-sm font-normal text-gray-400">/{issues.length}</span></p><p className="mt-1 text-xs text-gray-500">Phone</p></div>
        </div>
      </div>
    </section>

    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        <div><h2 className="font-semibold text-gray-900">Issue artwork</h2><p className="mt-1 text-sm text-gray-600">Manage artwork for any issue without changing its publication status.</p>
          <div className="mt-4" id="hero-issue"><HeroIssuePicker issues={ordered} inventory={artworkInventory} value={issueId} onChange={value=>{setPlacementPreview(null);setIssueId(value);}} /></div>
          {selected&&<div className="mt-4 rounded-xl bg-gray-50 p-3 text-sm text-gray-700"><p className="font-semibold">{selected.title}</p><p className="mt-1 text-xs">{future?'Future · hidden publicly until its month':'Available issue'} · {selected.is_published?'Published':'Draft'}</p></div>}
          <div className="mt-4 space-y-3">{(['desktop','mobile'] as const).map(slot=><div key={slot} className="rounded-xl border border-gray-200 p-3"><div className="flex items-center gap-2 text-sm font-semibold">{slot==='desktop'?<Monitor className="h-4 w-4"/>:<Smartphone className="h-4 w-4"/>}{slot==='desktop'?'Desktop / tablet':'Phone'}<span className="ml-auto text-xs font-normal text-gray-500">{artwork[slot]?`${artwork[slot]!.width}×${artwork[slot]!.height}`:hasBuiltInArtwork?'Built-in image':'Missing'}</span></div>{canManage&&<div className="mt-3 flex gap-2"><label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-flame-600 px-3 py-2 text-xs font-semibold text-white"><Upload className="h-3.5 w-3.5"/>{assetBusy===slot?'Uploading…':artwork[slot]?'Replace':'Upload'}<input type="file" accept="image/png,image/jpeg,image/webp" disabled={assetBusy!==null} onChange={event=>void upload(slot,event.target.files?.[0]??null)} className="sr-only"/></label>{artwork[slot]&&<button onClick={()=>void remove(slot)} disabled={assetBusy!==null} className="px-2 text-xs font-semibold text-red-600">Remove</button>}</div>}</div>)}</div>
        </div>
        <div className="min-w-0">
          <div className="mb-2 flex items-center justify-between gap-3"><h3 className="text-sm font-semibold text-gray-900">Selected hero preview</h3>{selected&&(artwork.desktop||hasBuiltInArtwork)?<a href={`/admin/hero-preview/${selected.id}?device=${previewDevice}`} target="_blank" rel="noreferrer" className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-700 hover:border-flame-200 hover:text-flame-700"><ExternalLink className="h-3.5 w-3.5"/>Open full preview</a>:<span className="text-xs text-gray-500">Shared public renderer</span>}</div>
          {(!artwork.desktop&&!hasBuiltInArtwork)||!selected?<div className="flex aspect-[1672/941] items-center justify-center rounded-2xl bg-gray-100 text-sm text-gray-500">Upload desktop artwork to preview</div>:<DevicePreviewFrame issueId={selected.id} device={previewDevice} version={assetVersion} placement={placementPreview}/>}
          {artwork.desktop&&<div className="mt-3 flex flex-wrap items-center gap-2 border-t border-gray-200 pt-3" aria-label="Hero controls">
            <span className="mr-1 inline-flex items-center gap-2 text-xs font-semibold text-gray-700"><Palette className="h-4 w-4"/>Colours</span>
            {(['auto','dark','light'] as const).map(mode=><button key={mode} type="button" disabled={themeBusy||!canManage||!activeArtwork} onClick={()=>void saveTheme(mode,activeTheme.accentOverride??null)} className={`min-h-9 rounded-lg px-3 text-xs font-semibold capitalize ${activeTheme.preference===mode||(!activeTheme.preference&&mode==='auto')?'bg-flame-600 text-white':'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'} disabled:opacity-50`}>{mode==='dark'?'Prefer dark':mode==='light'?'Prefer light':'Auto'}</button>)}
            <label className="ml-1 inline-flex min-h-9 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-700">Accent<input type="color" value={activeTheme.accentOverride??activeTheme.accent??'#d89b20'} disabled={themeBusy||!canManage||!activeArtwork} onChange={event=>void saveTheme(activeTheme.preference??'auto',event.target.value)} className="h-6 w-7 cursor-pointer border-0 bg-transparent p-0"/></label>
            {activeTheme.accentOverride&&<button type="button" disabled={themeBusy||!canManage||!activeArtwork} onClick={()=>void saveTheme(activeTheme.preference??'auto',null)} className="min-h-9 px-2 text-xs font-semibold text-flame-700 disabled:opacity-50">Reset accent</button>}
            <span className="h-0 basis-full" aria-hidden="true"/>
            <span className="text-xs font-semibold text-gray-700">Device</span>
            {([{id:'desktop',label:'Desktop',icon:Monitor},{id:'tablet',label:'Tablet',icon:Tablet},{id:'phone',label:'Phone',icon:Smartphone}] as const).map(option=><button key={option.id} type="button" onClick={()=>{setPlacementPreview(null);setPreviewDevice(option.id);}} aria-pressed={previewDevice===option.id} className={`inline-flex min-h-9 items-center gap-2 rounded-lg px-3 text-xs font-semibold ${previewDevice===option.id?'bg-slate-900 text-white':'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'}`}><option.icon className="h-3.5 w-3.5"/>{option.label}</button>)}
            <span className="h-0 basis-full" aria-hidden="true"/>
            {activeArtwork?<PlacementControls key={`${previewDevice}-${assetVersion}`} device={previewDevice} initial={resolveHeroPlacement(globalPlacements,previewDevice)} disabled={themeBusy||!canManage} onPreview={setPlacementPreview} onSave={savePlacement}/>:<p className="text-xs text-amber-700">Upload the {previewDevice==='phone'?'phone':'desktop / tablet'} background to adjust this view.</p>}
          </div>}
        </div>
      </div>
    </section>

    <AnimatePresence>{promptOpen&&<motion.div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/55 p-4" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onMouseDown={event=>{if(event.target===event.currentTarget)closePrompt();}}><motion.section role="dialog" aria-modal="true" aria-labelledby="hero-prompt-title" initial={{opacity:0,y:18,scale:.98}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:12,scale:.98}} transition={{duration:.2,ease:'easeOut'}} className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-200 px-5 py-4 sm:px-6"><div className="flex gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-flame-50 text-flame-700"><ImageUp className="h-5 w-5" /></span><div><h2 id="hero-prompt-title" className="font-semibold text-gray-900">Background generation prompt</h2><p className="mt-1 text-sm text-gray-600">Attach the selected issue cover when using this prompt in your image tool.</p></div></div><div className="flex items-center gap-2"><span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">Revision {saved.revision || 'default'}{dirty ? ' · Unsaved' : ''}</span><button type="button" onClick={closePrompt} aria-label="Close prompt" className="flex h-10 w-10 items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 hover:text-gray-900"><X className="h-5 w-5"/></button></div></div>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6"><label htmlFor="hero-prompt" className="sr-only">Master background generation prompt</label><textarea id="hero-prompt" value={text} onChange={(event) => setText(event.target.value)} readOnly={!canManage} spellCheck className="min-h-[54vh] w-full resize-y rounded-xl border border-gray-200 bg-gray-50 p-4 font-mono text-sm leading-6 text-gray-800 focus:border-flame-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-flame-100 read-only:cursor-default" /></div>
      <div className="flex flex-wrap items-center gap-3 border-t border-gray-200 px-5 py-4 sm:px-6"><button type="button" onClick={copy} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-gray-200 px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50"><Clipboard className="h-4 w-4" />Copy prompt</button>{canManage && <><button type="button" disabled={busy || !dirty || text.trim().length < 100} onClick={() => void persist('PATCH')} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-flame-600 px-4 text-sm font-semibold text-white hover:bg-flame-700 disabled:opacity-50"><Save className="h-4 w-4" />{busy ? 'Saving…' : 'Save prompt'}</button><button type="button" disabled={busy} onClick={() => void persist('DELETE')} className="inline-flex min-h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-flame-700 hover:bg-flame-50 disabled:opacity-50"><RotateCcw className="h-4 w-4" />Reset to default</button></>}<p className="ml-auto text-xs text-gray-500">{saved.updatedAt ? `Last saved ${new Date(saved.updatedAt).toLocaleString()}` : 'Using shipped default'}</p></div>
    </motion.section></motion.div>}</AnimatePresence>
  </div>;
}

const previewDimensions={desktop:{width:1440,height:900},tablet:{width:1024,height:900},phone:{width:390,height:780}} as const;
function PlacementControls({device,initial,disabled,onPreview,onSave}:{device:keyof typeof HERO_PLACEMENT_DEFAULTS;initial:HeroPlacement;disabled:boolean;onPreview:(placement:HeroPlacement|null)=>void;onSave:(placement:HeroPlacement)=>Promise<boolean>}){
  const [open,setOpen]=useState(false);
  const [values,setValues]=useState(initial);
  const [saving,setSaving]=useState(false);
  const controls:[keyof HeroPlacement,string,number,number,string][]=[
    ['bookX','Book position',5,95,'%'],['baselineY','Platform baseline',35,95,'%'],['bookScale','Book size',60,150,'%'],['focalX','Background X',0,100,'%'],['focalY','Background Y',0,100,'%'],
  ];
  const dirty=(Object.keys(initial) as (keyof HeroPlacement)[]).some(key=>values[key]!==initial[key]);
  const update=(key:keyof HeroPlacement,value:number)=>{const next={...values,[key]:value};setValues(next);onPreview(next);};
  const cancel=()=>{setValues(initial);onPreview(null);setOpen(false);};
  const save=async()=>{setSaving(true);const saved=await onSave(values);setSaving(false);if(saved)setOpen(false);};
  return <div className="w-full overflow-hidden rounded-xl bg-gray-50" aria-label={`${device} scene placement`}>
    <button type="button" onClick={()=>{setOpen(current=>!current);if(open&&dirty)cancel();}} aria-expanded={open} className="flex min-h-12 w-full items-center justify-between gap-3 px-3 text-left hover:bg-gray-100/70"><span><span className="block text-xs font-semibold text-gray-800">Global scene placement · <span className="capitalize">{device}</span></span><span className="mt-0.5 block text-[11px] text-gray-500">{open?'Applies to every magazine and issue.':'Open positioning controls for all magazines'}</span></span><ChevronDown className={`h-4 w-4 shrink-0 text-gray-500 transition-transform ${open?'rotate-180':''}`}/></button>
    {open&&<div className="border-t border-gray-200 px-3 pb-3 pt-3">
      <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2 xl:grid-cols-5">{controls.map(([key,label,min,max,suffix])=><label key={key} className="min-w-0 text-[11px] font-medium text-gray-600"><span className="flex items-center justify-between gap-2"><span>{label}</span><output className="tabular-nums text-gray-900">{Math.round(values[key])}{suffix}</output></span><input type="range" min={min} max={max} step={key==='bookScale'?1:0.5} value={values[key]} disabled={disabled||saving} onChange={event=>update(key,Number(event.target.value))} className="mt-1 h-5 w-full cursor-pointer accent-flame-600 disabled:cursor-not-allowed"/></label>)}</div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-gray-200 pt-3"><button type="button" disabled={disabled||saving} onClick={()=>{const reset={...HERO_PLACEMENT_DEFAULTS[device]};setValues(reset);onPreview(reset);}} className="rounded-lg px-2.5 py-2 text-xs font-semibold text-flame-700 hover:bg-flame-50 disabled:opacity-50"><RotateCcw className="mr-1.5 inline h-3.5 w-3.5"/>Reset draft</button><div className="flex gap-2"><button type="button" disabled={!dirty||saving} onClick={cancel} className="min-h-9 rounded-lg border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-50">Cancel</button><button type="button" disabled={!dirty||disabled||saving} onClick={()=>void save()} className="min-h-9 rounded-lg bg-flame-600 px-4 text-xs font-semibold text-white hover:bg-flame-700 disabled:opacity-50">{saving?'Saving…':'Save placement'}</button></div></div>
    </div>}
  </div>;
}

function DevicePreviewFrame({issueId,device,version,placement}:{issueId:string;device:keyof typeof previewDimensions;version:number;placement:HeroPlacement|null}){
  const hostRef=useRef<HTMLDivElement|null>(null);
  const frameRef=useRef<HTMLIFrameElement|null>(null);
  const [hostWidth,setHostWidth]=useState(0);
  const dimensions=previewDimensions[device];
  useEffect(()=>{const node=hostRef.current;if(!node)return;const observer=new ResizeObserver(entries=>setHostWidth(entries[0]?.contentRect.width??0));observer.observe(node);return()=>observer.disconnect();},[]);
  const sendPlacement=()=>frameRef.current?.contentWindow?.postMessage({type:'hero-placement-preview',device,placement},window.location.origin);
  useEffect(sendPlacement,[device,placement]);
  const scale=hostWidth?Math.min(1,hostWidth/dimensions.width):0;
  return <div ref={hostRef} className="relative w-full overflow-hidden rounded-2xl bg-gray-100" style={{height:scale?dimensions.height*scale:480}}>
    <iframe ref={frameRef} onLoad={sendPlacement} key={`${issueId}-${device}-${version}`} title={`${device} hero preview`} src={`/admin/hero-preview/${issueId}?embed=1&v=${version}`} className="absolute top-0 left-0 border-0 bg-white" style={{width:dimensions.width,height:dimensions.height,transform:`scale(${scale||1})`,transformOrigin:'top left'}}/>
  </div>;
}

function HeroIssuePicker({issues,inventory,value,onChange}:{issues:AdminIssue[];inventory:ArtworkInventoryItem[];value:string;onChange:(value:string)=>void}) {
  const [open,setOpen]=useState(false);
  const [query,setQuery]=useState('');
  const [sortOrder,setSortOrder]=useState<'newest'|'oldest'|'title'>('newest');
  const [statusFilter,setStatusFilter]=useState<'all'|'complete'|'desktop'|'phone'|'built-in'|'missing'>('all');
  const [yearFilter,setYearFilter]=useState('all');
  const rootRef=useRef<HTMLDivElement|null>(null);
  const selected=issues.find(issue=>issue.id===value)??issues[0];
  const years=[...new Set(issues.map(issue=>issue.year))].sort((a,b)=>b-a);
  const statusFor=(issueId:string)=>{
    const item=inventory.find(candidate=>candidate.issueId===issueId);
    if(item?.desktop&&item.mobile)return {key:'complete',label:'Complete',className:'bg-emerald-50 text-emerald-700'};
    if(item?.desktop)return {key:'desktop',label:'Desktop only',className:'bg-amber-50 text-amber-700'};
    if(item?.mobile)return {key:'phone',label:'Phone only',className:'bg-amber-50 text-amber-700'};
    const issue=issues.find(candidate=>candidate.id===issueId);
    if(issue?.magazines.name==='All India Magazine'&&issue.year===2026&&issue.month===10)return {key:'built-in',label:'Built-in image',className:'bg-blue-50 text-blue-700'};
    return {key:'missing',label:'Missing',className:'bg-gray-100 text-gray-500'};
  };
  const filtered=issues
    .filter(issue=>`${issue.title} ${issue.theme??''}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())&&(statusFilter==='all'||statusFor(issue.id).key===statusFilter)&&(yearFilter==='all'||String(issue.year)===yearFilter))
    .sort((a,b)=>sortOrder==='title'?(a.theme||a.title).localeCompare(b.theme||b.title):sortOrder==='oldest'?a.year-b.year||a.month-b.month:b.year-a.year||b.month-a.month);
  const selectedStatus=selected?statusFor(selected.id):null;

  useEffect(()=>{
    if(!open)return;
    const close=(event:MouseEvent)=>{if(!rootRef.current?.contains(event.target as Node))setOpen(false);};
    const escape=(event:KeyboardEvent)=>{if(event.key==='Escape')setOpen(false);};
    document.addEventListener('mousedown',close);document.addEventListener('keydown',escape);
    return()=>{document.removeEventListener('mousedown',close);document.removeEventListener('keydown',escape);};
  },[open]);

  return <div ref={rootRef} className="relative">
    <span className="mb-2 block text-sm font-medium text-gray-800">Magazine issue</span>
    <button type="button" aria-haspopup="listbox" aria-expanded={open} onClick={()=>setOpen(current=>!current)} className={`flex min-h-14 w-full items-center justify-between gap-3 rounded-xl border px-3.5 text-left transition-colors ${open?'border-flame-300 bg-white ring-2 ring-flame-100':'border-gray-200 bg-gray-50/60 hover:border-flame-200 hover:bg-white'}`}>
      <span className="min-w-0"><span className="block text-sm font-semibold text-gray-900">{selected?.title??'Select an issue'}</span>{selectedStatus&&<span className={`mt-1 inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold ${selectedStatus.className}`}>{selectedStatus.label}</span>}</span>
      <ChevronDown className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${open?'rotate-180 text-flame-600':''}`}/>
    </button>
    {open&&<div className="absolute left-0 z-50 mt-2 w-[min(560px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-flame-100 bg-white shadow-[0_20px_60px_rgba(120,84,28,0.16)] max-lg:right-0 max-lg:left-auto">
      <div className="border-b border-gray-100 bg-flame-50/60 p-3">
        <p className="text-sm font-semibold text-gray-900">Select hero issue</p><p className="mt-0.5 text-xs text-gray-500">Artwork status is shown for every issue.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <label className="relative min-w-[180px] flex-1 max-[560px]:basis-full"><Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400"/><span className="sr-only">Search issues</span><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search issue…" className="h-10 w-full rounded-xl border border-gray-200 bg-white pr-3 pl-9 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-flame-300 focus:ring-2 focus:ring-flame-100"/></label>
          <label className="relative"><ArrowDownUp className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-gray-500"/><span className="sr-only">Sort issues</span><select value={sortOrder} onChange={event=>setSortOrder(event.target.value as typeof sortOrder)} className="h-10 w-[105px] appearance-none rounded-xl border border-gray-200 bg-white pr-5 pl-8 text-xs font-medium text-gray-700 outline-none focus:border-flame-300 focus:ring-2 focus:ring-flame-100"><option value="newest">Newest</option><option value="oldest">Oldest</option><option value="title">Title A–Z</option></select><ChevronDown className="pointer-events-none absolute top-1/2 right-1.5 h-3 w-3 -translate-y-1/2 text-gray-400"/></label>
          <label className="relative"><ListFilter className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-gray-500"/><span className="sr-only">Filter by artwork status</span><select value={statusFilter} onChange={event=>setStatusFilter(event.target.value as typeof statusFilter)} className="h-10 w-[110px] appearance-none rounded-xl border border-gray-200 bg-white pr-5 pl-8 text-xs font-medium text-gray-700 outline-none focus:border-flame-300 focus:ring-2 focus:ring-flame-100"><option value="all">All art</option><option value="complete">Complete</option><option value="desktop">Desktop</option><option value="phone">Phone</option><option value="built-in">Built-in</option><option value="missing">Missing</option></select><ChevronDown className="pointer-events-none absolute top-1/2 right-1.5 h-3 w-3 -translate-y-1/2 text-gray-400"/></label>
          <label className="relative"><CalendarDays className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-gray-500"/><span className="sr-only">Filter by year</span><select value={yearFilter} onChange={event=>setYearFilter(event.target.value)} className="h-10 w-[80px] appearance-none rounded-xl border border-gray-200 bg-white pr-4 pl-8 text-xs font-medium text-gray-700 outline-none focus:border-flame-300 focus:ring-2 focus:ring-flame-100"><option value="all">Year</option>{years.map(year=><option key={year} value={year}>{year}</option>)}</select><ChevronDown className="pointer-events-none absolute top-1/2 right-1 h-3 w-3 -translate-y-1/2 text-gray-400"/></label>
        </div>
      </div>
      <div role="listbox" aria-label="Magazine issue" className="max-h-[min(420px,calc(100vh-220px))] overflow-y-auto p-1.5">
        {filtered.length===0?<p className="px-3 py-8 text-center text-sm text-gray-500">No matching issues.</p>:filtered.map(issue=>{const active=issue.id===value;const status=statusFor(issue.id);return <button key={issue.id} type="button" role="option" aria-selected={active} onClick={()=>{onChange(issue.id);setOpen(false);setQuery('');}} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${active?'bg-flame-50':'hover:bg-gray-50'}`}>
          <HeroIssueCover issue={issue} active={active}/>
          <span className="min-w-0 flex-1"><span className={`block text-sm ${active?'font-semibold text-flame-800':'font-medium text-gray-800'}`}>{issue.title}</span><span className="mt-0.5 block text-xs text-gray-600">{issue.theme||issue.title}</span></span>
          <span className={`shrink-0 rounded-md px-2 py-1 text-[11px] font-semibold ${status.className}`}>{status.label}</span>
        </button>})}
      </div>
    </div>}
  </div>;
}

function HeroIssueCover({issue,active}:{issue:AdminIssue;active:boolean}) {
  const [failed,setFailed]=useState(false);
  return <span className={`relative flex h-11 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md ring-1 ${active?'bg-white text-flame-600 ring-flame-200':'bg-gray-50 text-gray-300 ring-gray-200'}`}>
    {issue.cover_image_url&&!failed?<Image src={`/api/admin/issues/${issue.id}/cover`} alt="" fill sizes="32px" className="object-cover" onError={()=>setFailed(true)}/>:<Images className="h-4 w-4" aria-hidden="true"/>}
  </span>;
}
