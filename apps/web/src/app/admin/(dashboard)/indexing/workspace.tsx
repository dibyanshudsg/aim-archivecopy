'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from '@/components/magazine/archive-image';
import Link from 'next/link';
import {
  RefreshCw,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Sparkles,
  Clock,
  FileCheck2,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  Play,
  RotateCcw,
  Loader2,
} from 'lucide-react';
import { useUI } from '@/components/ui/toast';
import { PageReviewEditor } from './page-review-editor';
import { AdminPageTitle } from '../admin-page-title';
import {
  indexingStatusLabels as labels,
  type CoverageIssue,
  type IndexingCatalogue,
  type IndexingFilters,
  type IndexingRun,
  type PageReview,
  type DispatchState,
} from '@/lib/indexing-workspace';

const endpoint = '/api/admin/indexing/catalogue';
const control =
  'min-h-10 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flame-600 disabled:opacity-50 disabled:cursor-not-allowed';
const action = control + ' font-medium hover:border-flame-400 hover:bg-flame-50';
const primary =
  'min-h-10 rounded-lg bg-gradient-to-r from-gold-500 to-flame-500 px-4 py-2 text-sm font-semibold text-gray-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flame-600 disabled:opacity-50 disabled:cursor-not-allowed';
const dates = (date: string | null) =>
  date
    ? new Date(date).toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Not recorded';
const stateClass = (status: string) =>
  status === 'failed'
    ? 'text-red-700 bg-red-50 border border-red-200'
    : status === 'review' || status === 'unverified' || status === 'unavailable'
      ? 'text-amber-900 bg-amber-50 border border-amber-200'
      : status === 'indexed' || status === 'complete'
        ? 'text-emerald-800 bg-emerald-50 border border-emerald-200'
        : status === 'processing'
          ? 'text-blue-800 bg-blue-50 border border-blue-200'
          : 'text-gray-700 bg-gray-100 border border-gray-200';
function Status({ status }: { status: string }) {
  return (
    <span className={`inline-block rounded-md px-2 py-1 text-xs font-medium ${stateClass(status)}`}>
      {labels[status] ??
        (status === 'complete'
          ? 'Indexed'
          : status === 'superseded'
            ? 'Superseded'
            : status.replaceAll('_', ' '))}
    </span>
  );
}
function title(issue: { theme: string | null; title: string }) {
  return issue.theme || issue.title;
}
function Pager({
  page,
  total,
  pageSize,
  onPage,
}: {
  page: number;
  total: number;
  pageSize: number;
  onPage: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 px-4 py-3 text-sm text-gray-600">
      <span>
        {total
          ? `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} of ${total}`
          : '0 results'}
      </span>
      <div className="flex items-center gap-2">
        <button
          className={action}
          disabled={page <= 1}
          aria-label="Previous page"
          onClick={() => onPage(page - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span>
          Page {page} of {pages}
        </span>
        <button
          className={action}
          disabled={page >= pages}
          aria-label="Next page"
          onClick={() => onPage(page + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function IndexingWorkspace({ initial }: { initial: IndexingCatalogue }) {
  const { confirm, toast } = useUI();
  const [data, setData] = useState(initial);
  const [dispatch, setDispatch] = useState<DispatchState | null>(null);
  const [filters, setFilters] = useState<IndexingFilters>({ status: 'attention', page: 1 });
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<'coverage' | 'history'>('coverage');
  const [history, setHistory] = useState<{
    runs: IndexingRun[];
    total: number;
    page: number;
    pageSize: number;
  }>({ runs: [], total: 0, page: 1, pageSize: 25 });
  const [historyPage, setHistoryPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detail, setDetail] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const refresh = () => setRevision((n) => n + 1);
  useEffect(() => {
    const timer = setTimeout(() => setFilters((f) => ({ ...f, q: query, page: 1 })), 300);
    return () => clearTimeout(timer);
  }, [query]);
  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    let first = true;
    const load = async () => {
      if (first) setLoading(true);
      try {
        const params = new URLSearchParams();
        for (const [key, value] of Object.entries(filters))
          if (value != null) params.set(key, String(value));
        const requests = [
          fetch(endpoint + '?' + params, { signal: controller.signal, cache: 'no-store' }),
          fetch('/api/admin/indexing/start', { signal: controller.signal, cache: 'no-store' }),
        ];
        if (tab === 'history')
          requests.push(
            fetch(endpoint + `?view=history&page=${historyPage}`, {
              signal: controller.signal,
              cache: 'no-store',
            }),
          );
        const responses = await Promise.all(requests);
        if (responses.some((r) => !r.ok))
          throw Error(
            responses.some((r) => r.status === 401)
              ? 'Your session expired. Sign in again.'
              : 'Could not load indexing data. Refresh to try again.',
          );
        const values = await Promise.all(responses.map((r) => r.json()));
        if (!controller.signal.aborted) {
          setData(values[0]);
          setDispatch(values[1]);
          if (values[2]) setHistory(values[2]);
          setError('');
        }
      } catch (e) {
        if (!controller.signal.aborted)
          setError(e instanceof Error ? e.message : 'Could not load indexing data.');
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
          first = false;
          timer = setTimeout(() => {
            if (document.hidden) timer = setTimeout(load, 5000);
            else void load();
          }, 5000);
        }
      }
    };
    void load();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [filters, tab, historyPage, revision]);
  function filter(key: keyof IndexingFilters, value: string) {
    setFilters((f) => ({ ...f, [key]: value, page: 1 }));
    setTab('coverage');
  }
  async function queue(kind: 'missing' | 'retry' | 'selected', ids?: string[]) {
    const chosen = ids ?? [...selected];
    if (kind === 'selected' && !chosen.length) return;
    const ok = await confirm({
      title:
        kind === 'selected'
          ? 'Index selected issues?'
          : kind === 'retry'
            ? 'Retry failed issues?'
            : 'Index missing issues?',
      message:
        kind === 'selected'
          ? `${chosen.length} selected issue(s) will be queued. Existing indexes will be rebuilt; active jobs and unsupported editions are skipped. Verified page decisions are preserved for unchanged PDFs. Use Start indexing to process this queue.`
          : `Up to 100 ${kind === 'retry' ? 'failed' : 'missing'} eligible English issues across the catalogue will be queued. The current filters do not limit this action. Use Start indexing to process this queue.`,
      confirmLabel: kind === 'retry' ? 'Queue retries' : 'Queue indexing',
    });
    if (!ok) return;
    setBusy(true);
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: kind,
          ids: kind === 'selected' ? chosen : undefined,
          rebuild: kind === 'selected',
        }),
      });
      const result = await res.json();
      if (!res.ok) throw Error(result.error || 'Could not queue indexing.');
      toast.success(
        `${result.queued.length} queued${result.skipped.length ? ` · ${result.skipped.length} skipped` : ''}`,
      );
      if (result.skipped.length)
        toast.info(
          result.skipped
            .map((s: { reason: string }) => s.reason)
            .filter((s: string, i: number, a: string[]) => a.indexOf(s) === i)
            .join('; '),
        );
      setSelected((s) => new Set([...s].filter((id) => !result.queued.includes(id))));
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not queue indexing.');
    } finally {
      setBusy(false);
    }
  }
  const active = (data.counts.queued || 0) + (data.counts.processing || 0);
  const pending = dispatch?.pending ?? (data.counts.missing || 0) + (data.counts.queued || 0);
  async function start() {
    setBusy(true);
    try {
      const response = await fetch('/api/admin/indexing/start', { method: 'POST' });
      const result = await response.json();
      if (!response.ok) throw Error(result.error || 'Could not start indexing.');
      setDispatch(result);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not start indexing.');
    } finally {
      setBusy(false);
    }
  }
  async function releaseStart() {
    if (
      !(await confirm({
        title: 'Release unconfirmed start?',
        message:
          'Only an unconfirmed request that has not admitted a worker can be released. Saved pages and queued issues are retained. A delayed worker for this request will exit.',
        confirmLabel: 'Release request',
      }))
    )
      return;
    setBusy(true);
    try {
      const response = await fetch('/api/admin/indexing/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'release' }),
      });
      const result = await response.json();
      if (!response.ok) throw Error(result.error);
      setDispatch(result);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not release the request.');
    } finally {
      setBusy(false);
    }
  }
  const attention = ['missing', 'failed', 'review', 'unverified', 'unavailable'].reduce(
    (n, s) => n + (data.counts[s] || 0),
    0,
  );
  const tileCards = [
    {
      key: 'all',
      status: 'eligible',
      label: 'Eligible English',
      count: data.eligible,
      icon: BookOpen,
      desc: 'Total issues in scope',
      color: 'text-gray-900',
    },
    {
      key: 'missing',
      status: 'missing',
      label: 'Needs Indexing',
      count: data.counts.missing || 0,
      icon: Sparkles,
      desc: 'Not yet queued',
      color: (data.counts.missing || 0) > 0 ? 'text-amber-800' : 'text-gray-700',
    },
    {
      key: 'active',
      status: 'active',
      label: 'Queued / Processing',
      count: active,
      icon: Clock,
      desc: 'Waiting for worker run',
      color: active > 0 ? 'text-flame-700' : 'text-gray-700',
    },
    {
      key: 'review',
      status: 'review',
      label: 'Needs Page Review',
      count: data.counts.review || 0,
      icon: FileCheck2,
      desc: 'Cover & artwork checks',
      color: (data.counts.review || 0) > 0 ? 'text-gold-700' : 'text-gray-700',
    },
    {
      key: 'failed',
      status: 'failed',
      label: 'Failed Issues',
      count: data.counts.failed || 0,
      icon: AlertTriangle,
      desc: 'Requires retry',
      color: (data.counts.failed || 0) > 0 ? 'text-red-700' : 'text-gray-700',
    },
  ] as const;
  const canSelect = (i: CoverageIssue) =>
    !['excluded', 'unavailable', 'queued', 'processing'].includes(i.status);
  const selectable = data.issues.filter(canSelect);
  const allSelected = selectable.length > 0 && selectable.every((i) => selected.has(i.id));
  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <AdminPageTitle
          title="Search Indexing"
          description="Manage full-text search extraction and review OCR text across the English catalogue."
        />
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            className={`${action} inline-flex items-center gap-1.5`}
            disabled={loading}
            onClick={refresh}
            title="Refresh status and queue"
          >
            <RefreshCw className={`h-4 w-4 text-gray-500 ${loading ? 'animate-spin text-flame-600' : ''}`} />
            <span>{loading ? 'Refreshing…' : 'Refresh'}</span>
          </button>
          {!!data.counts.failed && (
            <button
              className={`${action} inline-flex items-center gap-1.5 border-red-200 text-red-700 hover:bg-red-50`}
              disabled={busy}
              onClick={() => void queue('retry')}
            >
              <RotateCcw className="h-4 w-4" />
              <span>Retry failed ({data.counts.failed})</span>
            </button>
          )}
          <button
            className={`${primary} inline-flex items-center gap-2 shadow-xs`}
            disabled={
              busy || loading || !!error || !dispatch?.configured || dispatch.active || !pending
            }
            onClick={() => void start()}
          >
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Please wait…</span>
              </>
            ) : dispatch?.active ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Worker running…</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4 fill-current" />
                <span>Start indexing {pending ? `(${pending})` : ''}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* System Status & Connection Card */}
      <div className="rounded-2xl border border-flame-100/90 bg-gradient-to-r from-warm-white via-white to-flame-50/30 p-5 shadow-xs">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center gap-2">
              {dispatch?.active ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800 border border-blue-200">
                  <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
                  Indexing in progress
                </span>
              ) : dispatch?.configured ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 border border-emerald-200">
                  <span className="h-2 w-2 rounded-full bg-emerald-600" />
                  Worker ready (On-demand)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-900 border border-amber-200">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-700" />
                  Token required for 1-click start
                </span>
              )}

              {data.schedule?.lastCheckedAt && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 border border-gray-200/80">
                  <Clock className="h-3.5 w-3.5 text-gray-500" />
                  Last check: {dates(new Date(data.schedule.lastCheckedAt).toISOString())} IST
                </span>
              )}

              {pending > 0 ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-flame-50 px-3 py-1 text-xs font-semibold text-flame-800 border border-flame-200">
                  <Sparkles className="h-3.5 w-3.5 text-flame-600" />
                  {pending} issues ready to index
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-50 px-3 py-1 text-xs font-medium text-gray-600 border border-gray-200">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  Catalogue index current
                </span>
              )}
            </div>

            <p className="text-sm text-gray-600 leading-relaxed max-w-3xl">
              {!dispatch?.configured ? (
                <>
                  To start worker runs directly from this dashboard with 1 click, add{' '}
                  <code className="rounded bg-amber-100/80 px-1.5 py-0.5 font-mono text-xs text-amber-900 font-semibold">
                    INDEXING_GITHUB_TOKEN
                  </code>{' '}
                  to your Vercel Environment Variables. You can also trigger runs directly in GitHub Actions.
                </>
              ) : dispatch?.active ? (
                'The background worker is currently extracting text and running OCR. Page progress will appear below automatically.'
              ) : pending > 0 ? (
                `There are ${pending} eligible English issue(s) waiting in the queue. Each on-demand run processes up to 3 issues.`
              ) : (
                'All eligible English issues are indexed. Use the filters below to inspect text or review flagged cover pages.'
              )}
            </p>
          </div>

          {dispatch?.status === 'unknown' && (
            <div className="shrink-0">
              <button
                className={`${action} border-amber-300 text-amber-900 hover:bg-amber-50`}
                disabled={busy}
                onClick={() => void releaseStart()}
              >
                Release unconfirmed request
              </button>
            </div>
          )}
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
        >
          {error} Previously loaded data may be out of date.
        </p>
      )}

      {/* Modern KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {tileCards.map((tile) => {
          const isSelected =
            filters.status === tile.key ||
            (tile.key === 'all' && filters.status === 'eligible');
          const Icon = tile.icon;
          return (
            <button
              key={tile.key}
              type="button"
              onClick={() => filter('status', tile.key === 'all' ? 'eligible' : tile.key)}
              className={`group relative flex flex-col justify-between rounded-xl border p-4 text-left transition-all ${
                isSelected
                  ? 'border-flame-500 bg-flame-50/70 shadow-xs ring-2 ring-flame-400/50'
                  : 'border-gray-200 bg-white hover:border-flame-300 hover:bg-warm-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  {tile.label}
                </span>
                <span
                  className={`rounded-lg p-1.5 transition-colors ${
                    isSelected
                      ? 'bg-flame-100 text-flame-700'
                      : 'bg-gray-50 text-gray-500 group-hover:bg-flame-50 group-hover:text-flame-600'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </span>
              </div>
              <div className="mt-3">
                <span className={`block font-heading text-3xl font-bold tabular-nums ${tile.color}`}>
                  {tile.count}
                </span>
                <span className="mt-0.5 block text-xs text-gray-500">
                  {tile.desc}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Human-Friendly 3-Step Guide */}
      <details className="group rounded-2xl border border-flame-100 bg-white/80 p-4 text-sm shadow-xs transition-colors hover:bg-white">
        <summary className="flex cursor-pointer items-center justify-between font-semibold text-gray-900 select-none">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-flame-600" />
            <span>How Search Indexing Works</span>
          </div>
          <span className="text-xs font-medium text-gray-500 group-open:text-flame-700">
            Click to view workflow guide
          </span>
        </summary>
        <div className="mt-4 grid gap-3.5 pt-3.5 border-t border-gray-100 md:grid-cols-3">
          <div className="rounded-xl border border-gray-100 bg-warm-white/70 p-4">
            <div className="flex items-center gap-2.5 font-semibold text-gray-900">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-flame-100 text-xs font-bold text-flame-800">
                1
              </span>
              <span>Automatic Queue</span>
            </div>
            <p className="mt-2 text-xs text-gray-600 leading-relaxed">
              When a new English magazine PDF is uploaded or replaced, it is automatically detected and placed in the indexing queue.
            </p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-warm-white/70 p-4">
            <div className="flex items-center gap-2.5 font-semibold text-gray-900">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-flame-100 text-xs font-bold text-flame-800">
                2
              </span>
              <span>On-Demand Extraction</span>
            </div>
            <p className="mt-2 text-xs text-gray-600 leading-relaxed">
              Clicking <strong>Start indexing</strong> triggers the background worker to parse PDF pages and perform OCR in batches of up to 3 issues per run.
            </p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-warm-white/70 p-4">
            <div className="flex items-center gap-2.5 font-semibold text-gray-900">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-flame-100 text-xs font-bold text-flame-800">
                3
              </span>
              <span>Quality Page Review</span>
            </div>
            <p className="mt-2 text-xs text-gray-600 leading-relaxed">
              Pages flagged with uncertain text (e.g. illustrated cover artwork) can be reviewed and approved in seconds using <strong>Review pages</strong>.
            </p>
          </div>
        </div>
        <p className="mt-3.5 text-xs text-gray-500 italic">
          * Full-text search extraction is tailored for English editions. Hindi editions are searchable by issue title, theme, and topic metadata.
        </p>
      </details>
      <div
        className="flex gap-5 border-b border-gray-200"
        role="tablist"
        aria-label="Indexing views"
      >
        {(['coverage', 'history'] as const).map((view) => (
          <button
            key={view}
            role="tab"
            aria-selected={tab === view}
            tabIndex={tab === view ? 0 : -1}
            onKeyDown={(event) => {
              if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
                event.preventDefault();
                const next =
                  event.key === 'Home'
                    ? 'coverage'
                    : event.key === 'End'
                      ? 'history'
                      : view === 'coverage'
                        ? 'history'
                        : 'coverage';
                setTab(next);
                const tabs =
                  event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>(
                    '[role=tab]',
                  );
                tabs?.[next === 'coverage' ? 0 : 1]?.focus();
              }
            }}
            onClick={() => setTab(view)}
            className={`min-h-11 border-b-2 px-1 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-flame-600 ${tab === view ? 'border-flame-600 text-flame-700' : 'border-transparent text-gray-600'}`}
          >
            {view === 'coverage' ? 'Catalogue coverage' : 'Activity / History'}
          </button>
        ))}
      </div>
      {tab === 'coverage' ? (
        <>
          <div className="flex flex-wrap gap-3">
            <label className="relative min-w-52 flex-1">
              <span className="sr-only">Search issue titles</span>
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
              <input
                className={control + ' w-full pl-10 placeholder:text-gray-500'}
                placeholder="Search issue title or theme…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <label>
              <span className="sr-only">Indexing status</span>
              <select
                aria-label="Indexing status"
                className={control}
                value={filters.status}
                onChange={(e) => filter('status', e.target.value)}
              >
                <option value="attention">Needs attention ({attention})</option>
                <option value="all">All issues</option>
                <option value="eligible">Eligible English issues</option>
                <option value="active">Queued / Processing</option>
                {Object.entries(labels).map(([s, l]) => (
                  <option key={s} value={s}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="sr-only">Magazine</span>
              <select
                aria-label="Magazine"
                className={control}
                value={filters.magazine || 'all'}
                onChange={(e) => filter('magazine', e.target.value)}
              >
                <option value="all">All magazines</option>
                {data.magazines.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="sr-only">Year</span>
              <select
                aria-label="Year"
                className={control}
                value={filters.year || 'all'}
                onChange={(e) => filter('year', e.target.value)}
              >
                <option value="all">All years</option>
                {data.years.map((y) => (
                  <option key={y}>{y}</option>
                ))}
              </select>
            </label>
            <label>
              <span className="sr-only">Publication status</span>
              <select
                aria-label="Publication status"
                className={control}
                value={filters.publication || 'all'}
                onChange={(e) => filter('publication', e.target.value)}
              >
                <option value="all">Published + drafts</option>
                <option value="published">Published</option>
                <option value="draft">Drafts</option>
              </select>
            </label>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-gray-600">
            <span aria-live="polite">
              {loading ? 'Updating…' : `${data.total} matching issues`}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <span>{selected.size} selected</span>
              <button
                className={action}
                disabled={!selected.size || busy}
                onClick={() => void queue('selected')}
              >
                {busy ? 'Queuing…' : 'Index selected'}
              </button>
              {selected.size > 0 && (
                <button className={action} onClick={() => setSelected(new Set())}>
                  Clear selection
                </button>
              )}
            </div>
          </div>
          <div
            className="overflow-hidden rounded-xl border border-gray-200 bg-white"
            aria-busy={loading}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-gray-200 bg-gray-50 text-gray-600">
                  <tr>
                    <th className="p-4">
                      <input
                        type="checkbox"
                        aria-label="Select eligible issues on this page"
                        checked={allSelected}
                        disabled={!selectable.length}
                        onChange={() =>
                          setSelected((prev) => {
                            const next = new Set(prev);
                            for (const i of selectable)
                              if (allSelected) next.delete(i.id);
                              else if (next.size < 100) next.add(i.id);
                            return next;
                          })
                        }
                      />
                    </th>
                    <th className="py-3 pr-4 font-medium">Issue</th>
                    <th className="py-3 pr-4 font-medium">Status & coverage</th>
                    <th className="hidden py-3 pr-4 font-medium lg:table-cell">Last indexed</th>
                    <th className="hidden py-3 pr-4 font-medium sm:table-cell">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {data.issues.map((issue) => (
                    <tr key={issue.id}>
                      <td className="p-4 align-top">
                        <input
                          aria-label={`Select ${issue.title}`}
                          type="checkbox"
                          disabled={
                            !canSelect(issue) || (selected.size >= 100 && !selected.has(issue.id))
                          }
                          checked={selected.has(issue.id)}
                          onChange={() =>
                            setSelected((prev) => {
                              const next = new Set(prev);
                              if (next.has(issue.id)) next.delete(issue.id);
                              else if (next.size < 100) next.add(issue.id);
                              return next;
                            })
                          }
                        />
                      </td>
                      <td className="min-w-32 py-4 pr-4 align-top sm:min-w-40">
                        <div className="flex gap-3">
                          {issue.cover_image_url ? (
                            <Image
                              key={issue.cover_image_url}
                              src={`/api/admin/issues/${issue.id}/cover`}
                              alt=""
                              width={40}
                              height={56}
                              className="hidden h-14 w-10 rounded object-cover sm:block"
                            />
                          ) : (
                            <BookOpen className="hidden h-10 w-10 text-gray-400 sm:block" />
                          )}
                          <div>
                            <button
                              className="text-left font-semibold text-gray-900 underline decoration-gray-300 underline-offset-4 hover:text-flame-700"
                              onClick={() => setDetail(issue.id)}
                            >
                              {title(issue)}
                            </button>
                            <p className="mt-1 text-xs text-gray-600">{issue.title}</p>
                            {!issue.is_published && (
                              <span className="mt-1 inline-block text-xs text-gray-600">Draft</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="min-w-28 py-4 pr-4 align-top sm:min-w-40">
                        <Status status={issue.status} />
                        <p className="mt-2 text-xs tabular-nums text-gray-600">
                          {issue.indexed_pages} / {issue.total_pages ?? 'unknown'} pages searchable
                        </p>
                        {issue.status === 'processing' && (
                          <p className="mt-1 text-xs font-medium text-blue-700">
                            {issue.completed_pages} pages processed…
                          </p>
                        )}
                        {issue.review_pages.length > 0 && (
                          <span className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800 border border-amber-200">
                            <AlertCircle className="h-3 w-3 text-amber-600" />
                            {issue.review_pages.length} page(s) need review
                          </span>
                        )}
                        {issue.verified && !issue.review_pages.length && issue.blank_pages.length > 0 && (
                          <p className="mt-1 text-xs text-gray-500">
                            {issue.blank_pages.length} blank page(s)
                          </p>
                        )}
                      </td>
                      <td className="hidden py-4 pr-4 align-top text-xs text-gray-600 lg:table-cell">
                        {dates(issue.indexed_at)}
                      </td>
                      <td className="hidden py-4 pr-4 align-top sm:table-cell">
                        {issue.status === 'review' ? (
                          <button
                            className="min-h-9 inline-flex items-center justify-center rounded-lg bg-flame-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-flame-700 focus-visible:outline-2 focus-visible:outline-flame-600 transition-colors"
                            onClick={() => setDetail(issue.id)}
                          >
                            Review pages
                          </button>
                        ) : (
                          <button
                            className={`${action} text-xs py-1.5`}
                            onClick={() => setDetail(issue.id)}
                          >
                            View details
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!data.issues.length && (
              <div className="px-6 py-12 text-center">
                <p className="font-medium text-gray-900">
                  {filters.status === 'attention'
                    ? 'No issues need attention'
                    : 'No matching issues'}
                </p>
                <p className="mt-2 text-sm text-gray-600">
                  {active
                    ? 'Active jobs are still running. Open Queued / Processing to follow them.'
                    : 'Choose All issues to see the full catalogue, or adjust your filters.'}
                </p>
              </div>
            )}
            <Pager
              page={data.page}
              total={data.total}
              pageSize={data.pageSize}
              onPage={(page) => setFilters((f) => ({ ...f, page }))}
            />
          </div>
        </>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <p className="border-b border-gray-200 p-4 text-sm text-gray-600">
            Each upload, replacement, or manual rebuild has its own record. Automatic attempts stay
            within that run.
          </p>
          <ul className="divide-y divide-gray-200">
            {history.runs.map((run) => (
              <li key={run.id} className="flex flex-wrap items-start justify-between gap-3 p-4">
                <div>
                  <button
                    onClick={() => setDetail(run.issue_id)}
                    className="text-left text-sm font-semibold text-gray-900 underline decoration-gray-300 underline-offset-4"
                  >
                    {title(run)}
                  </button>
                  <p className="mt-1 text-xs text-gray-600">{run.title}</p>
                  <p className="mt-2 text-xs text-gray-600">
                    {run.trigger.replaceAll('_', ' ')} · {dates(run.created_at)} ·{' '}
                    {run.trigger === 'verified_rebuild'
                      ? 'Attempts not recorded'
                      : `${run.attempts} attempt(s)`}
                  </p>
                </div>
                <div className="text-sm">
                  <Status status={run.status} />
                  <p className="mt-2 text-xs text-gray-600">
                    {run.indexed_pages} pages indexed · {run.review_pages} withheld
                  </p>
                </div>
              </li>
            ))}
          </ul>
          {!history.runs.length && (
            <p className="p-8 text-center text-sm text-gray-600">No indexing runs recorded yet.</p>
          )}
          <Pager page={history.page} total={history.total} pageSize={25} onPage={setHistoryPage} />
        </div>
      )}
      {detail && (
        <IssueDetails
          id={detail}
          revision={revision}
          onClose={() => setDetail(null)}
          busy={busy}
          onReviewed={() => {
            toast.success('Page review saved.');
            refresh();
          }}
          onQueue={(id) => {
            setDetail(null);
            void queue('selected', [id]);
          }}
        />
      )}
    </div>
  );
}

function IssueDetails({
  id,
  revision,
  onClose,
  onQueue,
  busy,
  onReviewed,
}: {
  id: string;
  revision: number;
  onClose: () => void;
  onQueue: (id: string) => void;
  busy: boolean;
  onReviewed: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [data, setData] = useState<{
    issue: CoverageIssue;
    runs: IndexingRun[];
    reviews: PageReview[];
  } | null>(null);
  const [error, setError] = useState('');
  const close = useCallback(onClose, [onClose]);
  useEffect(() => {
    const node = dialog.current;
    node?.showModal();
    return () => node?.close();
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    const load = async () => {
      try {
        const res = await fetch(endpoint + '?issue=' + encodeURIComponent(id), {
          signal: controller.signal,
          cache: 'no-store',
        });
        if (!res.ok) throw Error('Could not load this issue. Close and reopen details to retry.');
        const value = await res.json();
        if (!controller.signal.aborted) {
          setData(value);
          setError('');
        }
      } catch (e) {
        if (!controller.signal.aborted)
          setError(e instanceof Error ? e.message : 'Could not load details.');
      } finally {
        if (!controller.signal.aborted) timer = setTimeout(load, 5000);
      }
    };
    setData(null);
    void load();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [id, revision]);
  const i = data?.issue;
  const current = data?.runs[0];
  return (
    <dialog
      ref={dialog}
      onCancel={close}
      aria-labelledby="indexing-detail-title"
      className="fixed inset-y-0 left-auto right-0 m-0 h-dvh max-h-none w-full max-w-xl border-l border-gray-200 bg-white p-0 shadow-xl backdrop:bg-black/30"
    >
      <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
        <h2 id="indexing-detail-title" className="text-lg font-semibold text-gray-900">
          Indexing details
        </h2>
        <button autoFocus className={action} aria-label="Close indexing details" onClick={onClose}>
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="space-y-6 p-5">
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
        {!i && !error && <p role="status">Loading issue…</p>}
        {i && (
          <>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{title(i)}</h3>
              <p className="mt-1 text-sm text-gray-600">{i.title}</p>
              <div className="mt-3">
                <Status status={i.status} />
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <dt className="text-gray-600">Searchable pages</dt>
              <dd>
                {i.indexed_pages} / {i.total_pages ?? 'unknown'}
              </dd>
              <dt className="text-gray-600">Blank pages</dt>
              <dd>{i.verified ? i.blank_pages.length : 'Not verified'}</dd>
              <dt className="text-gray-600">Withheld pages</dt>
              <dd>{i.verified ? i.review_pages.length : 'Not verified'}</dd>
              <dt className="text-gray-600">Last indexed</dt>
              <dd>{dates(i.indexed_at)}</dd>
              <dt className="text-gray-600">Evidence</dt>
              <dd>
                {i.verified
                  ? i.evidence === 'verified_rebuild'
                    ? 'Reconciled rebuild records'
                    : 'Completed worker run'
                  : 'Verification needed'}
              </dd>
            </dl>
            {['queued', 'processing', 'failed'].includes(i.status) && (
              <div className="space-y-2 border-y border-gray-200 py-4 text-sm">
                <p className="font-medium text-gray-900">
                  {i.status === 'processing'
                    ? {
                        downloading: 'Downloading PDF',
                        extracting: 'Extracting text / OCR',
                        saving: 'Saving index',
                      }[i.stage || 'extracting']
                    : labels[i.status]}
                </p>
                <p className="text-gray-600">
                  {i.completed_pages} / {i.total_pages ?? 'unknown'} pages processed · Attempt{' '}
                  {i.attempts} of 3
                </p>
                {i.total_pages != null && (
                  <progress
                    aria-label="Pages processed"
                    className="h-2 w-full accent-flame-600"
                    value={i.completed_pages}
                    max={i.total_pages}
                  />
                )}
                <p className="text-gray-600">
                  {i.indexed_pages
                    ? 'Existing searchable pages remain available while this run is processed.'
                    : 'This issue has no searchable page text yet.'}
                </p>
                {i.status === 'queued' && i.attempts > 0 && (
                  <p>
                    Automatic retry after{' '}
                    {new Date(i.available_at).toLocaleTimeString('en-IN', {
                      timeZone: 'Asia/Kolkata',
                    })}{' '}
                    IST.
                  </p>
                )}
                {i.error && <p className="break-words text-red-700">{i.error}</p>}
              </div>
            )}
            {i.status === 'unverified' && (
              <p className="text-sm leading-relaxed text-amber-900">
                Search text exists, but its source or processing evidence could not be fully
                verified. Rebuild the index to establish current coverage.
              </p>
            )}
            {i.status === 'unavailable' && (
              <p className="text-sm text-amber-900">
                Upload an available PDF from the Issues page before indexing.
              </p>
            )}
            {i.status === 'excluded' && (
              <p className="text-sm text-gray-600">
                Only English editions are indexed in the current scope. Existing content is
                preserved.
              </p>
            )}
            {i.review_pages.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-900">Review withheld pages</h3>
                <p className="mt-1 text-sm text-gray-600">
                  These pages have unreliable extracted text. The issue is indexed and its PDF
                  remains available. Inspect each page before saving a decision.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {i.review_pages.map((n) => (
                    <PageReviewEditor
                      key={`${i.source_hash}-${n}`}
                      issue={i}
                      page={n}
                      onSaved={onReviewed}
                    />
                  ))}
                </div>
              </div>
            )}
            {!!data?.reviews.length && (
              <div className="border-t border-gray-200 pt-4">
                <h3 className="font-semibold text-gray-900">Page review history</h3>
                <ol className="mt-2 space-y-3 text-sm text-gray-700">
                  {data.reviews.map((review) => (
                    <li key={review.id}>
                      <p className="font-medium">
                        Page {review.page_number} ·{' '}
                        {review.decision === 'transcribe'
                          ? 'Verified text added'
                          : 'Intentionally excluded'}
                      </p>
                      <p>{review.note}</p>
                      <p className="text-xs text-gray-600">
                        {dates(review.reviewed_at)} IST
                        {review.source_hash !== i.source_hash || review.pdf_url !== i.pdf_url
                          ? ' · Previous PDF source'
                          : ''}
                      </p>
                      {review.content && (
                        <details className="mt-1">
                          <summary className="cursor-pointer">Saved text</summary>
                          <p className="mt-2 whitespace-pre-wrap break-words">{review.content}</p>
                        </details>
                      )}
                    </li>
                  ))}
                </ol>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {!['excluded', 'unavailable', 'queued', 'processing'].includes(i.status) && (
                <button className={primary} disabled={busy} onClick={() => onQueue(id)}>
                  {i.status === 'missing'
                    ? 'Index issue'
                    : i.status === 'failed'
                      ? 'Retry indexing'
                      : 'Rebuild index'}
                </button>
              )}
              <Link href="/admin/issues" className={action}>
                Manage issue
              </Link>
              {!['unavailable', 'excluded'].includes(i.status) && (
                <Link
                  href={`/admin/indexing/${id}/preview`}
                  target="_blank"
                  rel="noopener"
                  className={action}
                >
                  Open PDF
                </Link>
              )}
            </div>
            <div className="border-t border-gray-200 pt-5">
              <h3 className="font-semibold text-gray-900">Run history</h3>
              {!data?.runs.length && (
                <p className="mt-2 text-sm text-gray-600">
                  No processing history recorded for this issue.
                </p>
              )}
              <ol className="mt-3 divide-y divide-gray-200">
                {data?.runs.map((run) => (
                  <li key={run.id} className="space-y-2 py-3 text-sm">
                    <div className="flex flex-wrap justify-between gap-2">
                      <span className="font-medium">{run.trigger.replaceAll('_', ' ')}</span>
                      <Status status={run.status} />
                    </div>
                    <p className="text-xs text-gray-600">
                      {run.trigger === 'verified_rebuild' ? 'Rebuild recorded' : 'Queued'}:{' '}
                      {dates(run.created_at)}
                      <br />
                      Started: {dates(run.started_at)}
                      <br />
                      Finished: {dates(run.finished_at)}
                    </p>
                    <p className="text-xs text-gray-600">
                      {run.trigger === 'verified_rebuild'
                        ? 'Attempts not recorded'
                        : `${run.attempts} attempt(s)`}{' '}
                      · {run.indexed_pages} pages indexed · {run.review_pages} withheld
                    </p>
                    {run.error && <p className="break-words text-xs text-red-700">{run.error}</p>}
                  </li>
                ))}
              </ol>
              {current && (
                <p className="mt-2 text-xs text-gray-600">
                  Up to 30 recent runs shown. Details update automatically.
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </dialog>
  );
}
