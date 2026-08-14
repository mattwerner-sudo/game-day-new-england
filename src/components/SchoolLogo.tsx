"use client";

/**
 * Hides itself on load failure rather than showing a broken-image icon - not every school
 * resolves to a logo url at all (Presto schools get null from getSchoolLogoUrl and this never
 * renders for them), and even a resolved SIDEARM url is a live third-party asset that could 404
 * for an individual school outside this session's verified sample.
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
  if (!src) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- unpredictable third-party domain per school, not a fit for next/image's allowlist
    <img
      src={src}
      alt={alt}
      className={className}
      onError={(e) => {
        e.currentTarget.style.display = "none";
      }}
    />
  );
}
