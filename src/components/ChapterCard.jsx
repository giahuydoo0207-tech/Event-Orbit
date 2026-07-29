import React from 'react';
import { Link } from 'react-router-dom';
import { CategoryIcon } from './CategoryIcon';

/**
 * Shared Chapter Card — Compact Outline Grid Layout.
 * Transparent/no-bg card with thin border, outline category icon, inline text tag.
 *
 * Props:
 *   chapter  — chapter data object
 *   linkTo   — optional override for link destination (default: /chapters/:slug)
 */
export function ChapterCard({ chapter, linkTo }) {
  const href = linkTo || `/chapters/${chapter.slug}`;

  return (
    <Link
      to={href}
      className="group flex items-center gap-3.5 rounded-xl border border-oc-periwinkle/50 p-3.5 transition-all hover:border-oc-blue/60 hover:bg-white/40"
    >
      {/* Outline Icon Box — R_child = 16px - 14px padding = 2-4px (rounded-sm) */}
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border border-oc-periwinkle/70 group-hover:border-oc-blue/50 transition-colors">
        <CategoryIcon category={chapter.category} className="w-5 h-5 text-oc-blue" />
      </div>

      {/* Info: Name + Plain Text Tag on Line 1, Stats on Line 2 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-sm font-bold text-oc-ink group-hover:text-oc-blue transition truncate leading-snug">
            {chapter.name}
          </h3>
          {chapter.category && (
            <span className="badge-kicker text-[9px] text-slate-400 font-bold uppercase tracking-wider shrink-0">
              {chapter.category}
            </span>
          )}
        </div>

        {/* Subline stats: events · followers */}
        <p className="mt-0.5 text-xs text-slate-400 font-medium truncate">
          <span className="num font-bold text-slate-600">{chapter.eventsHosted ?? 0}</span> event{chapter.eventsHosted !== 1 ? 's' : ''} · <span className="num font-bold text-slate-600">{chapter.followerCount ?? 0}</span> followers
        </p>
      </div>
    </Link>
  );
}

export default ChapterCard;
