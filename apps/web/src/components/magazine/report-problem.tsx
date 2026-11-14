'use client';

import { useEffect, useState } from 'react';
import { Check, Copy, ExternalLink, Flag } from 'lucide-react';

export function ReportProblem({
  issueId,
  title,
  page,
}: {
  issueId: string;
  title: string;
  page?: number;
}) {
  const [url, setUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState('');

  useEffect(() => {
    let active = true;
    setOrigin(window.location.origin);
    fetch('/api/site-settings')
      .then((response) => (response.ok ? response.json() : null))
      .then((settings) => {
        if (!active || !settings?.feedback_form_url) return;
        const target = new URL(settings.feedback_form_url);
        if (target.protocol === 'https:' || target.protocol === 'http:') {
          setUrl(target.href);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  if (!url) return null;

  const pageRef = page ? `Page ${page}` : '';
  const context = `${title}${page ? ` — page ${page}` : ''}\n${origin}/${page ? `read/${issueId}?page=${page}` : `issue/${issueId}`}\nProblem: `;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(context);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };

  const handleOpenForm = async () => {
    // Automatically copy reference to clipboard for effortless pasting into the form
    try {
      await navigator.clipboard.writeText(context);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {}
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="mt-6 rounded-2xl border border-gold-200/80 bg-gradient-to-b from-[#fffcf7] to-white p-4 shadow-xs">
      <div className="flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-flame-50 text-flame-600 ring-1 ring-flame-100">
          <Flag className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-xs font-semibold text-gray-900">
              Notice a scan or OCR typo?
            </h4>
            {page && (
              <span className="shrink-0 rounded-md bg-gold-100/70 px-1.5 py-0.5 text-[10px] font-medium text-gold-900">
                {pageRef}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs leading-relaxed text-gray-500">
            Help improve the archive. We&apos;ll automatically copy this page&apos;s reference so you can paste it into the feedback form.
          </p>

          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenForm}
              className="inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-flame-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-flame-700 active:bg-flame-800"
            >
              Report Problem
              <ExternalLink className="h-3.5 w-3.5 opacity-80" />
            </button>

            <button
              type="button"
              onClick={handleCopy}
              title="Copy issue and page reference"
              aria-label="Copy page reference"
              className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-600 shadow-xs transition-colors hover:border-flame-200 hover:bg-flame-50/50 hover:text-flame-700"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-green-600" />
                  <span className="text-green-700 font-semibold">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy Ref</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
