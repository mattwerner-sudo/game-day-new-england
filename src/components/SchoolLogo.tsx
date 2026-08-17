"use client";

import { useRef, useState, useEffect } from "react";

/**
 * Hides itself on load failure rather than showing a broken-image icon - not every school
 * resolves to a logo url at all (Presto schools get null from getSchoolLogoUrl and this never
 * renders for them), and even a resolved SIDEARM/Presto url is a live third-party asset that
 * could fail for reasons outside this codebase's control (a 404, or a school's WAF challenging
 * the request).
 *
 * Checks `complete`/`naturalWidth` on mount in addition to the `onError` handler - a real,
 * confirmed race condition otherwise: this is a server-rendered `<img>`, so the browser starts
 * loading `src` the moment it parses the initial HTML, before React hydrates and attaches
 * `onError` - a fast failure (confirmed live: a school's WAF challenge page returned instead of
 * the image) can complete before any handler exists to catch it, and that already-fired error
 * event is never replayed for a handler attached after the fact.
 */
export function SchoolLogo({
  src,
  alt,
  className,
}: {
  src: string | null;
  alt: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setFailed(false);
    if (imgRef.current?.complete && imgRef.current.naturalWidth === 0) {
      setFailed(true);
    }
  }, [src]);

  if (!src || failed) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- unpredictable third-party domain per school, not a fit for next/image's allowlist
    <img ref={imgRef} src={src} alt={alt} className={className} onError={() => setFailed(true)} />
  );
}
