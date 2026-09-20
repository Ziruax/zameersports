import type { ReactNode } from "react";

interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  action?: ReactNode;
}

/** Section title block: amber eyebrow + Oswald uppercase title + optional right action. */
export default function SectionHeading({ eyebrow, title, action }: SectionHeadingProps) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3 sm:mb-8">
      <div>
        {eyebrow ? (
          <p className="text-xs font-bold uppercase tracking-widest text-amber-500">{eyebrow}</p>
        ) : null}
        <h2 className="font-display mt-1 text-2xl font-bold uppercase tracking-wide text-neutral-900 sm:text-3xl">
          {title}
        </h2>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
