'use client';

import { useEffect, useRef, useState } from 'react';
import type { ImageProps } from 'next/image';
import ArchiveImage from './archive-image';

/** Start catalogue cover requests only as cards approach the viewport. */
export function ViewportCoverImage({ priority, ...props }: ImageProps) {
  const [nearViewport, setNearViewport] = useState(Boolean(priority));
  const [loaded, setLoaded] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);
  const sourceKey = typeof props.src === 'string' ? props.src : JSON.stringify(props.src);

  useEffect(() => setLoaded(false), [sourceKey]);

  useEffect(() => {
    if (nearViewport || !containerRef.current) return;
    if (!('IntersectionObserver' in window)) {
      setNearViewport(true);
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      if (!entries[0]?.isIntersecting) return;
      setNearViewport(true);
      observer.disconnect();
    }, { rootMargin: '600px' });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [nearViewport]);

  return (
    <span ref={containerRef} className="absolute inset-0 overflow-hidden bg-gradient-to-br from-gold-50 to-flame-50">
      {!loaded && <span aria-hidden="true" className="cover-shimmer absolute inset-0" />}
      {nearViewport && <ArchiveImage {...props} priority={priority} className={props.className}
        style={{ ...props.style, opacity: loaded ? 1 : 0, transition: 'opacity 150ms ease, transform 300ms ease' }}
        onLoad={(event) => { setLoaded(true); props.onLoad?.(event); }}
        onError={(event) => { setLoaded(true); props.onError?.(event); }} />}
    </span>
  );
}
