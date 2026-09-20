interface AnnouncementBarProps {
  settings: Record<string, string>;
}

/** Emerald announcement strip; static centered text on desktop, marquee on mobile. */
export default function AnnouncementBar({ settings }: AnnouncementBarProps) {
  const text = settings.announcement;
  if (!text) return null;

  return (
    <div className="bg-emerald-950 text-white" role="region" aria-label="Store announcement">
      {/* Desktop: centered static */}
      <p className="hidden py-2 text-center text-xs font-semibold tracking-wide sm:block">
        {text}
      </p>
      {/* Mobile: subtle marquee for long text */}
      <div className="overflow-hidden py-2 sm:hidden" aria-hidden="true">
        <div className="animate-marquee flex w-max whitespace-nowrap">
          <span className="px-8 text-xs font-semibold tracking-wide">{text}</span>
          <span className="px-8 text-xs font-semibold tracking-wide">{text}</span>
        </div>
      </div>
    </div>
  );
}
