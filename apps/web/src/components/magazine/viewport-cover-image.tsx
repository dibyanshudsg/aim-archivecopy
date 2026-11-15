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
    if (priority) setNearViewport(true);
  }, [priority]);

  useEffect(() => {
    if (nearViewport) return;
    const element = containerRef.current;
    if (!element) return;

    const checkVisibility = () => {
      if (!element.isConnected) return;
      const rect = element.getBoundingClientRect();
      const margin = 800;
      if (rect.top < window.innerHeight + margin && rect.bottom > -margin) {
        setNearViewport(true);
      }
    };

    checkVisibility();
    const frameId = requestAnimationFrame(checkVisibility);

    let observer: IntersectionObserver | null = null;
    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver(
        (entries) => {
          if (!entries[0]?.isIntersecting) return;
          setNearViewport(true);
          observer?.disconnect();
        },
        { rootMargin: '800px' },
      );
      observer.observe(element);
    } else {
      setNearViewport(true);
      return;
    }

    window.addEventListener('scroll', checkVisibility, { passive: true });
    window.addEventListener('resize', checkVisibility, { passive: true });

    return () => {
      cancelAnimationFrame(frameId);
      observer?.disconnect();
      window.removeEventListener('scroll', checkVisibility);
      window.removeEventListener('resize', checkVisibility);
    };
  }, [nearViewport]);

  // Safety net: check if image is complete in DOM (e.g. from browser cache)
  useEffect(() => {
    if (!nearViewport || loaded) return;
    const checkImg = () => {
      const img = containerRef.current?.querySelector('img');
      if (img && img.complete && img.naturalWidth > 0) {
        setLoaded(true);
      }
    };
    checkImg();
    const timer = setTimeout(checkImg, 300);
    return () => clearTimeout(timer);
  }, [nearViewport, loaded, sourceKey]);

  return (
    <span ref={containerRef} className="absolute inset-0 overflow-hidden bg-gradient-to-br from-gold-50 to-flame-50">
      {!loaded && <span aria-hidden="true" className="cover-shimmer absolute inset-0" />}
      {nearViewport && (
        <ArchiveImage
          {...props}
          priority={priority}
          className={props.className}
          style={{ ...props.style, opacity: loaded ? 1 : 0, transition: 'opacity 150ms ease, transform 300ms ease' }}
          onLoad={(event) => {
            setLoaded(true);
            props.onLoad?.(event);
          }}
          onError={(event) => {
            setLoaded(true);
            props.onError?.(event);
          }}
        />
      )}
    </span>
  );
}
