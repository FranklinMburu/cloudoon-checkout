// Page sections: a card on desktop, full-bleed on phones; collapsible variant for optional steps.

import { useId, type ReactNode } from 'react';
import { ChevronDown } from '../icons';
import { cx, focusRing } from './styles';

/** Full-bleed block on phones (no card-in-card), a bordered card from `sm` up. */
export function Section({ id, title, description, aside, children }: { id?: string; title: string; description?: string; aside?: ReactNode; children?: ReactNode }) {
  const headingId = useId();
  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className="-mx-4 scroll-mt-20 border-y border-gray-200 bg-white px-4 py-5 sm:mx-0 sm:rounded-xl sm:border sm:p-6"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id={headingId} className="text-base font-semibold text-gray-950">{title}</h2>
          {description && <p className="mt-0.5 text-[13px] text-gray-600">{description}</p>}
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}

/** A section that stays a one-line summary until opened (progressive disclosure). */
export function CollapsibleSection({
  id, title, summary, open, onToggle, badge, children,
}: { id: string; title: string; summary: ReactNode; open: boolean; onToggle: () => void; badge?: ReactNode; children: ReactNode }) {
  const panelId = `${id}-panel`;
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="-mx-4 scroll-mt-20 border-y border-gray-200 bg-white sm:mx-0 sm:rounded-xl sm:border">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        className={cx('flex w-full items-center gap-3 px-4 py-4 text-left hover:bg-gray-50/60 sm:rounded-xl sm:px-6 sm:py-5', focusRing, open && 'sm:rounded-b-none')}
      >
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span id={`${id}-title`} className="text-base font-semibold text-gray-950">{title}</span>
            {badge}
          </span>
          <span className="mt-0.5 block truncate text-[13px] text-gray-600">{summary}</span>
        </span>
        <span className="flex shrink-0 items-center gap-1 text-[13px] font-medium text-brand-700">
          {open ? 'Hide' : 'Edit'}
          <ChevronDown size={16} className={cx('transition-transform', open && 'rotate-180')} />
        </span>
      </button>
      {open && (
        <div id={panelId} className="px-4 pb-5 sm:px-6 sm:pb-6">
          {children}
        </div>
      )}
    </section>
  );
}

export function SubHeading({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="mb-2.5 flex items-baseline justify-between gap-3">
      <h3 className="text-sm font-medium text-gray-950">{children}</h3>
      {hint && <span className="text-xs text-gray-500">{hint}</span>}
    </div>
  );
}
