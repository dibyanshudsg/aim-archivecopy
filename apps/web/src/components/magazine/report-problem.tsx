'use client';

import { useEffect, useState } from 'react';
import { Check, ChevronDown, ClipboardCopy, ExternalLink, MessageSquareText } from 'lucide-react';

export function ReportProblem({ issueId, title, page }: { issueId: string; title: string; page?: number }) {
  const [url, setUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState('');
  useEffect(() => {
    let active = true;
    setOrigin(window.location.origin);
    fetch('/api/site-settings').then((response) => response.ok ? response.json() : null).then((settings) => {
      if (!active || !settings?.feedback_form_url) return;
      const target = new URL(settings.feedback_form_url);
      if (target.protocol === 'https:' || target.protocol === 'http:') setUrl(target.href);
    }).catch(() => {});
    return () => { active = false; };
  }, []);
  if (!url) return null;
  const context = `${title}${page ? ` — page ${page}` : ''}\n${origin}/${page ? `read/${issueId}?page=${page}` : `issue/${issueId}`}\nProblem: `;
  return (
    <details className="group mt-6 overflow-hidden rounded-xl border border-flame-100 bg-white text-left shadow-sm open:border-flame-200">
      <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-3.5 py-2.5 text-flame-800 transition-colors hover:bg-flame-50/70 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-flame-500 [&::-webkit-details-marker]:hidden">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-gold-100 to-flame-100 text-flame-700"><MessageSquareText className="h-4 w-4" /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">Report a scan or text problem</span>
          <span className="block text-xs font-normal text-gray-500">Open reporting options</span>
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-flame-600 transition-transform duration-200 group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div className="border-t border-flame-100 bg-gradient-to-b from-flame-50/60 to-white px-3.5 pb-4 pt-3.5">
        <p className="text-sm leading-relaxed text-gray-600">Copy the issue details, then describe the problem in the feedback form. Nothing is sent until you submit it.</p>
        <textarea aria-label="Issue details to include in your report" readOnly value={context} rows={4} className="mt-3 w-full resize-none rounded-lg border border-flame-100 bg-white p-3 text-sm leading-relaxed text-gray-700 shadow-inner focus:outline-none" />
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(context); setCopied(true); } catch { setCopied(false); } }} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-flame-200 bg-white px-3 py-2 text-sm font-semibold text-flame-800 transition-colors hover:bg-flame-50">
            {copied ? <Check className="h-4 w-4" /> : <ClipboardCopy className="h-4 w-4" />}{copied ? 'Copied' : 'Copy details'}
          </button>
          <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-gold-500 to-flame-500 px-3 py-2 text-sm font-semibold text-white shadow-[0_6px_16px_rgba(190,140,46,0.18)] transition-colors hover:from-gold-600 hover:to-flame-600">Feedback form<ExternalLink className="h-4 w-4" /></a>
        </div>
      </div>
    </details>
  );
}
