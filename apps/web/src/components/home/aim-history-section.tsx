'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ChevronDown, ExternalLink } from 'lucide-react';
import { Flame } from '@/components/home/flame';
import { cn } from '@/lib/utils';

export function AimHistorySection() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <section className="mt-8 sm:mt-12 w-full" aria-label="History of All India Magazine">
      <div className="w-full rounded-3xl border border-amber-200/75 bg-gradient-to-br from-[#fffdfa] via-[#fffbf4] to-[#fff8ed] p-6 sm:p-8 lg:p-10 shadow-sm transition-shadow duration-300 hover:shadow-md">
        <div className="grid grid-cols-1 items-center gap-8 md:grid-cols-12 md:gap-8 lg:gap-12">
          {/* Left Column: Flame sitting smoothly above AIM handwriting */}
          <div className="flex flex-col items-center justify-center md:col-span-4 lg:col-span-4 text-center">
            <div className="relative -mb-1 flex justify-center">
              <Flame className="scale-[0.82] sm:scale-[0.90]" />
            </div>
            <div className="relative w-full max-w-[240px] sm:max-w-[280px] transition-transform duration-300 hover:scale-[1.02]">
              <Image
                src="/brand/aim-masthead-gold.svg"
                alt="All India Magazine handwritten by The Mother"
                className="w-full h-auto object-contain drop-shadow-sm"
                width={280}
                height={140}
                unoptimized
              />
            </div>
            <p className="mt-2 text-xs italic tracking-wide text-amber-900/80 sm:text-[13px]">
              Written out in The Mother’s own hand, 1971
            </p>
          </div>

          {/* Right Column: Subheader + Paragraph 1 fully visible + Expandable remaining narrative on mobile */}
          <div className="flex flex-col md:col-span-8 lg:col-span-8 border-t border-amber-200/60 pt-6 md:border-t-0 md:border-l md:pl-8 lg:pl-10 md:pt-0">
            {/* Subheader */}
            <h3 className="font-heading text-base sm:text-lg font-bold tracking-wider uppercase text-flame-900">
              History of All India Magazine
            </h3>

            {/* Paragraph 1: Always fully visible on all devices */}
            <p className="mt-3 text-sm sm:text-base leading-relaxed text-gray-800">
              As the preparations for Sri Aurobindo&apos;s Birth Centenary got underway in 1971, the Society launched a monthly. The Mother named it &apos;All India Magazine&apos; (AIM) and wrote it out in her own hand.
            </p>

            {/* Collapsible Container for Paragraphs 2-4 and Source on Phone/Tablet */}
            <div className="relative mt-3">
              <div
                className={cn(
                  'overflow-hidden transition-[max-height] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] lg:overflow-visible lg:max-h-none',
                  isOpen ? 'max-h-[800px]' : 'max-h-[38px] sm:max-h-[44px]'
                )}
              >
                <div className="space-y-4 text-sm sm:text-base leading-relaxed text-gray-800">
                  <p>
                    <span className="font-serif italic font-medium text-flame-900">&ldquo;Matter shall reveal the Spirit&apos;s face&rdquo;</span>, a line from Sri Aurobindo&apos;s epic poem Savitri, was to be the guiding light. The Mother gave specific directions that AIM should carry only the writings of Sri Aurobindo and her own.
                  </p>

                  <p>
                    Gradually AIM began to be published in some Indian languages as well. One of the first editions to come out was in Kannada. The Mother&apos;s inspiring message for the occasion was, <span className="font-serif italic font-medium text-flame-900">&ldquo;Let your highest aspiration organise your life.&rdquo;</span>
                  </p>

                  <p>
                    As the readership grew, a special section for youth was incorporated in AIM. &apos;Today and Tomorrow&apos; was the title given by the Mother to this section. Today AIM has become one of the most popular and largely circulated magazines to be published from Pondicherry.
                  </p>

                  {/* Source with Dash */}
                  <div className="pt-2 text-right">
                    <p className="font-heading text-xs font-semibold tracking-wider text-flame-900 sm:text-sm">
                      —{' '}
                      <a
                        href="https://www.sabda.in/catalog/bookinfo.php?websec=ENGD-BA-060"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group/link inline-flex items-center gap-1 italic text-flame-800 underline decoration-flame-300 underline-offset-4 transition-colors hover:text-flame-950 hover:decoration-flame-600"
                        title="View 'A Glimpse of the Mother's Love and Action' on SABDA"
                      >
                        <span>A Glimpse of the Mother&apos;s Love and Action</span>
                        <ExternalLink className="h-3 w-3 opacity-60 transition-opacity group-hover/link:opacity-100" />
                      </a>
                    </p>
                  </div>
                </div>
              </div>

              {/* Gradient Fade Overlay on start of remaining text when collapsed (hidden on desktop) */}
              <div
                aria-hidden="true"
                className={cn(
                  'pointer-events-none absolute inset-x-0 bottom-0 h-10 sm:h-11 bg-gradient-to-t from-[#fffbf4] via-[#fffbf4]/85 to-transparent transition-opacity duration-300 lg:hidden',
                  isOpen ? 'opacity-0' : 'opacity-100'
                )}
              />
            </div>

            {/* View More Arrow Only (No Text) Button Below (hidden on desktop) */}
            <div className="mt-3 flex justify-center md:justify-start lg:hidden">
              <button
                type="button"
                onClick={() => setIsOpen((prev) => !prev)}
                aria-expanded={isOpen}
                aria-label={isOpen ? 'Collapse history' : 'Expand history'}
                className={cn(
                  'group flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full',
                  'border border-amber-300/80 bg-white/90 text-flame-700 shadow-sm transition-all duration-300',
                  'hover:border-flame-400 hover:bg-white hover:text-flame-900 hover:shadow-md hover:scale-105',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-flame-500 focus-visible:ring-offset-2',
                  isOpen && 'bg-amber-50/80 border-flame-400 text-flame-900'
                )}
              >
                <ChevronDown
                  className={cn(
                    'h-4 w-4 sm:h-5 sm:w-5 transition-transform duration-400 ease-[cubic-bezier(0.16,1,0.3,1)]',
                    isOpen && 'rotate-180'
                  )}
                />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
