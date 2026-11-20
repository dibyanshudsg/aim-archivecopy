'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ExternalLink, Globe, MessageSquareText } from 'lucide-react';
import {
  defaultPublicNavigation,
  isExternalNavigationHref,
  type NavigationItem,
  type PublicNavigation,
} from '@/lib/navigation';

export function Footer({ navigation }: { navigation?: PublicNavigation }) {
  const currentYear = new Date().getFullYear();
  const [feedbackFormUrl, setFeedbackFormUrl] = useState('');
  const publicNavigation = navigation ?? defaultPublicNavigation();
  const archiveLinks = publicNavigation.menus.footer_archive.items;
  const magazineLinks = publicNavigation.menus.footer_magazines.items;
  const aboutLinks = publicNavigation.menus.footer_about.items.filter(
    (item) => !item.href.startsWith('/admin') && item.label !== 'AIM Website' && !item.href.includes('aim.aurosociety.org')
  );

  useEffect(() => {
    fetch('/api/site-settings')
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((settings: { feedback_form_url?: string }) => {
        setFeedbackFormUrl(settings.feedback_form_url?.trim() ?? '');
      })
      .catch(() => setFeedbackFormUrl(''));
  }, []);

  return (
    <footer className="border-t border-flame-100 bg-gradient-to-b from-flame-50/40 to-white">
      <div className="mx-auto w-full max-w-[1504px] px-4 pb-5 pt-4 sm:px-6 sm:pt-12 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="hidden sm:col-span-2 sm:block lg:col-span-1">
            <Link href="/" prefetch={true} className="flex items-center gap-3">
              <Image src="/api/brand/logo" unoptimized alt="AIM Archive" width={40} height={40} className="h-10 w-10 shrink-0 rounded-lg object-contain" />
              <span className="font-heading text-lg font-bold text-gray-900">AIM Archive</span>
            </Link>
            <p className="mt-4 hidden text-sm leading-relaxed text-gray-500 sm:block">
              Preserving decades of spiritual wisdom from Sri Aurobindo and The Mother for
              seekers worldwide.
            </p>
          </div>

          {/* Archive */}
          <div className="hidden sm:block">
            <h3 className="text-sm font-semibold text-gray-900">Archive</h3>
            <ul className="mt-4 space-y-3">
              {archiveLinks.map((item) => (
                <li key={item.id}>
                  <FooterNavLink item={item} />
                </li>
              ))}
            </ul>
          </div>

          {/* Magazines */}
          <div className="hidden sm:block">
            <h3 className="text-sm font-semibold text-gray-900">Magazines</h3>
            <ul className="mt-4 space-y-3">
              {magazineLinks.map((item) => (
                <li key={item.id}>
                  <FooterNavLink item={item} />
                </li>
              ))}
            </ul>
          </div>

          {/* About */}
          <div className="hidden sm:block">
            <h3 className="text-sm font-semibold text-gray-900">About</h3>
            <ul className="mt-4 space-y-3">
              {aboutLinks.map((item) => (
                <li key={item.id}>
                  <FooterNavLink item={item} />
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Mobile quick actions: Society link & Feedback */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5 sm:hidden">
          {aboutLinks.length > 0 && (
            <nav aria-label="About" className="flex flex-wrap items-center justify-center gap-2">
              {aboutLinks.map((item) => (
                <FooterNavLink key={item.id} item={item} compact />
              ))}
            </nav>
          )}

          {feedbackFormUrl && (
            <a
              href={feedbackFormUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-gold-500 to-flame-500 px-4 py-2 text-xs font-semibold text-white shadow-xs transition-all hover:from-gold-600 hover:to-flame-600"
            >
              <MessageSquareText className="h-3.5 w-3.5 shrink-0" />
              <span>Share feedback</span>
            </a>
          )}
        </div>

        {feedbackFormUrl && (
          <div className="mt-5 hidden justify-center border-t border-flame-100 pt-5 sm:flex sm:mt-10 sm:pt-8">
            <a
              href={feedbackFormUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-gold-500 to-flame-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_22px_rgba(190,140,46,0.18)] transition-all hover:from-gold-600 hover:to-flame-600"
            >
              <MessageSquareText className="h-4 w-4" />
              <span>Share feedback</span>
            </a>
          </div>
        )}

        <div className={`${feedbackFormUrl ? 'mt-5 sm:mt-8' : 'mt-5 border-t border-flame-100 pt-5 sm:mt-12 sm:pt-8'} text-center`}>
          <p className="text-xs text-gray-500 sm:text-sm">
            &copy; {currentYear} Sri Aurobindo Society. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterNavLink({ item, compact = false }: { item: NavigationItem; compact?: boolean }) {
  const isExternal = isExternalNavigationHref(item.href) || item.opens_new_tab;
  const isSociety = isExternal || item.label.toLowerCase().includes('society') || item.href.includes('aurosociety.org');

  if (compact) {
    return (
      <a
        href={item.href}
        target={isExternal ? '_blank' : undefined}
        rel={isExternal ? 'noopener noreferrer' : undefined}
        className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-gray-200 bg-white/90 px-3.5 py-2 text-xs font-medium text-gray-700 shadow-2xs transition-colors hover:border-flame-300 hover:bg-flame-50/50 hover:text-flame-700"
      >
        {isSociety ? (
          <Image
            src="/favicons/aurosociety.png"
            alt=""
            width={16}
            height={13}
            className="h-3.5 w-3.5 shrink-0 object-contain"
            unoptimized
          />
        ) : (
          <Globe className="h-3.5 w-3.5 shrink-0 text-flame-600/80" aria-hidden="true" />
        )}
        <span>{item.label}</span>
        {isExternal && <ExternalLink className="h-3 w-3 shrink-0 text-gray-400" aria-hidden="true" />}
      </a>
    );
  }

  const className = 'group inline-flex items-center gap-2 text-sm text-gray-500 transition-colors hover:text-flame-700';

  if (isExternal) {
    return (
      <a href={item.href} target="_blank" rel="noopener noreferrer" className={className}>
        {isSociety ? (
          <Image
            src="/favicons/aurosociety.png"
            alt=""
            width={16}
            height={13}
            className="h-3.5 w-3.5 shrink-0 object-contain"
            unoptimized
          />
        ) : (
          <Globe className="h-3.5 w-3.5 shrink-0 text-flame-600/80 transition-colors group-hover:text-flame-600" aria-hidden="true" />
        )}
        <span>{item.label}</span>
        <ExternalLink className="h-3 w-3 shrink-0 text-gray-400 transition-colors group-hover:text-flame-600" aria-hidden="true" />
      </a>
    );
  }

  return (
    <Link href={item.href} prefetch={true} className={className}>
      {item.label}
    </Link>
  );
}
