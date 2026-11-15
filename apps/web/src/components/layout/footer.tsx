'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { MessageSquareText } from 'lucide-react';
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

        <nav aria-label="About and administration" className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 sm:hidden">
          {aboutLinks.map((item)=><FooterNavLink key={item.id} item={item} compact/>)}
          <Link href="/admin" className="inline-flex min-h-11 items-center text-sm text-gray-600 hover:text-flame-700">Admin</Link>
        </nav>

        {feedbackFormUrl && (
          <div className="mt-5 flex justify-center border-t border-flame-100 pt-5 sm:mt-10 sm:pt-8">
            <a
              href={feedbackFormUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-gold-500 to-flame-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_22px_rgba(190,140,46,0.18)] transition-all hover:from-gold-600 hover:to-flame-600"
            >
              <MessageSquareText className="h-4 w-4" />
              Share feedback
            </a>
          </div>
        )}

        <div className={`${feedbackFormUrl ? 'mt-5 sm:mt-8' : 'mt-5 border-t border-flame-100 pt-5 sm:mt-12 sm:pt-8'} grid grid-cols-1 items-center gap-4 text-center sm:grid-cols-[1fr_auto_1fr]`}>
          <p className="text-xs text-gray-500 sm:col-start-2 sm:text-sm">
            &copy; {currentYear} Sri Aurobindo Society. All rights reserved.
          </p>
          <Link href="/admin" className="hidden min-h-10 items-center justify-self-center rounded-lg border border-gray-200 px-4 text-sm font-medium text-gray-600 hover:border-flame-300 hover:text-flame-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flame-600 sm:col-start-3 sm:row-start-1 sm:mr-16 sm:inline-flex sm:justify-self-end">
            Admin
          </Link>
        </div>
      </div>
    </footer>
  );
}

function FooterNavLink({ item,compact=false }: { item: NavigationItem;compact?:boolean }) {
  const className = compact?'inline-flex min-h-11 items-center text-sm text-gray-600 hover:text-flame-700':'text-sm text-gray-500 hover:text-flame-700';
  if (isExternalNavigationHref(item.href) || item.opens_new_tab) {
    return (
      <a href={item.href} target="_blank" rel="noopener noreferrer" className={className}>
        {item.label}
      </a>
    );
  }

  return (
    <Link href={item.href} prefetch={true} className={className}>
      {item.label}
    </Link>
  );
}
