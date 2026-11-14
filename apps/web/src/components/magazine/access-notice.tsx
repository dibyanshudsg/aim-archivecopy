'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  ChevronDown,
  Download,
  ExternalLink,
  HelpCircle,
  Lock,
  Mail,
} from 'lucide-react';

export function AccessNotice({
  liftLabel,
  magazineId,
  refreshing = false,
  secondaryAction,
}: {
  liftLabel: string | null;
  magazineId?: string;
  refreshing?: boolean;
  secondaryAction?: React.ReactNode;
}) {
  const [subscriptionDetailsOpen, setSubscriptionDetailsOpen] = useState(false);
  const params = new URLSearchParams({ availability: 'read' });
  if (magazineId) params.set('magazine', magazineId);

  return (
    <div className="mt-6 rounded-2xl border border-flame-200/90 bg-gradient-to-br from-flame-50/80 via-gold-50/40 to-amber-50/60 p-5 sm:p-6 text-left shadow-xs">
      {/* Badge */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-flame-200 bg-white/95 px-3 py-1 text-xs font-semibold text-flame-800 shadow-2xs">
          <Lock className="h-3.5 w-3.5 text-flame-700" />
          Subscriber &amp; Member Edition
        </span>
        {liftLabel && (
          <span className="text-xs font-medium text-gray-600">
            · Enters Free Public Archive in {liftLabel}
          </span>
        )}
      </div>

      {/* Heading */}
      <h2 className="mt-3 font-heading text-lg font-bold text-gray-900 sm:text-xl">
        {liftLabel ? `Public reading opens in ${liftLabel}` : 'Public reading is not yet available'}
      </h2>

      {/* Transparent & Respectful Explanation */}
      <div className="mt-2.5 space-y-2 text-sm leading-relaxed text-gray-700">
        <p>
          <strong className="font-semibold text-gray-900">All India Magazine</strong> is a monthly journal supported by subscriptions and Sri Aurobindo Society memberships. Recent editions (within the last 5 years) are reserved for active subscribers to support ongoing publication and Society work.
        </p>
        <p className="text-xs text-gray-600">
          Each edition enters this free digital archive 5 years after publication for open public study and spiritual research.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Link
          href={`/browse?${params}`}
          prefetch={true}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-flame-700 px-5 py-2.5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-flame-800 focus-visible:ring-2 focus-visible:ring-flame-500 focus-visible:ring-offset-2"
        >
          <BookOpen className="h-4 w-4" />
          <span>Read available editions</span>
        </Link>

        <a
          href="https://aurosociety.org/site/login/memberships"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-flame-300 bg-white px-5 py-2.5 text-sm font-semibold text-flame-800 shadow-2xs transition-colors hover:border-flame-400 hover:bg-flame-50/80 focus-visible:ring-2 focus-visible:ring-flame-500 focus-visible:ring-offset-2"
        >
          <span>Subscribe / Join Society</span>
          <ExternalLink className="h-3.5 w-3.5 text-flame-600" />
        </a>

        {secondaryAction}
      </div>

      {/* Collapsible Subscription Details Accordion */}
      <div className="mt-4 border-t border-flame-200/70 pt-3">
        <button
          type="button"
          onClick={() => setSubscriptionDetailsOpen((open) => !open)}
          aria-expanded={subscriptionDetailsOpen}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-flame-800 transition-colors hover:text-flame-900 hover:underline"
        >
          <HelpCircle className="h-3.5 w-3.5 text-flame-700" />
          <span>How to subscribe &amp; receive recent issues</span>
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform duration-200 ${
              subscriptionDetailsOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {subscriptionDetailsOpen && (
          <div className="mt-3 rounded-xl border border-flame-200/80 bg-white/90 p-4 text-xs leading-relaxed text-gray-700 shadow-2xs">
            <h3 className="font-heading text-xs font-bold uppercase tracking-wider text-flame-800">
              Subscription &amp; Membership Information
            </h3>
            <p className="mt-1 text-gray-600">
              You can receive current and recent monthly editions of <em>All India Magazine</em> directly by mail or digital communication:
            </p>

            <ul className="mt-2.5 space-y-1.5 list-disc pl-4 text-gray-700">
              <li>
                <strong>Inland Subscription:</strong> ₹200 for 1 year (Monthly issues dispatched to your registered address).
              </li>
              <li>
                <strong>Overseas Subscription:</strong> US $25 per year (via Airmail).
              </li>
              <li>
                <strong>Sri Aurobindo Society Membership:</strong> Choose the <em>&ldquo;Member with Magazine&rdquo;</em> option when enrolling or renewing. Available in English, Hindi (<em>Agnishikha</em>), and other regional languages.
              </li>
            </ul>

            <div className="mt-3.5 flex flex-wrap gap-2.5 pt-2 border-t border-flame-100">
              <a
                href="https://aurosociety.org/site/login/memberships"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-flame-50 px-2.5 py-1.5 font-semibold text-flame-800 hover:bg-flame-100 transition-colors"
              >
                <span>Online Membership Portal</span>
                <ExternalLink className="h-3 w-3" />
              </a>

              <a
                href="https://www.sabda.in/m/catalog/booksearch.php?category_key=X&itmtype=Journals"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-flame-50 px-2.5 py-1.5 font-semibold text-flame-800 hover:bg-flame-100 transition-colors"
              >
                <span>SABDA Journal Catalog</span>
                <ExternalLink className="h-3 w-3" />
              </a>

              <a
                href="https://cms.aurosociety.org/kcfinder/images/files/membership-form-bymail.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-flame-50 px-2.5 py-1.5 font-semibold text-flame-800 hover:bg-flame-100 transition-colors"
              >
                <Download className="h-3 w-3" />
                <span>Mail-in Form (PDF)</span>
              </a>

              <a
                href="mailto:membership@aurosociety.org"
                className="inline-flex items-center gap-1.5 rounded-lg bg-flame-50 px-2.5 py-1.5 font-semibold text-flame-800 hover:bg-flame-100 transition-colors"
              >
                <Mail className="h-3 w-3" />
                <span>membership@aurosociety.org</span>
              </a>
            </div>
          </div>
        )}
      </div>

      {refreshing && (
        <p role="status" className="mt-3 text-sm text-flame-800">
          Checking reading access…
        </p>
      )}
    </div>
  );
}
