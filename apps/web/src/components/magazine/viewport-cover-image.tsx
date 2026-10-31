'use client';

import { useEffect, useRef, useState } from 'react';
import type { ImageProps } from 'next/image';
import ArchiveImage from './archive-image';

/** Start catalogue cover requests only as cards approach the viewport. */
export function ViewportCoverImage({ priority, ...props }: ImageProps) {
  const [nearViewport, setNearViewport] = useState(Boolean(priority));
  const containerRef = useRef<HTMLSpanElement>(null);

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
    }, { rootMargin: '300px' });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [nearViewport]);

  return (
    <span ref={containerRef} className="absolute inset-0">
      {nearViewport && <ArchiveImage {...props} priority={priority} />}
    </span>
  );
}
