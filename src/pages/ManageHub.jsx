import React, { useEffect, useState, useMemo } from 'react';
import { fetchChapters } from '../api/mockApi';
import { ChapterCard } from '../components/ChapterCard';
import { LoadingBar } from '../components/LoadingBar';

const CATEGORY_ORDER = ['Tech', 'Design', 'Business', 'Social'];

export function ManageHub() {
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function loadChapters() {
      setLoading(true);
      try {
        const data = await fetchChapters();
        setChapters(data);
      } catch (err) {
        console.error('Failed to load chapters', err);
      } finally {
        setLoading(false);
      }
    }
    loadChapters();
  }, []);

  // Search filter
  const filteredChapters = useMemo(() => {
    if (!searchQuery.trim()) return chapters;
    const q = searchQuery.toLowerCase();
    return chapters.filter(ch =>
      ch.name.toLowerCase().includes(q) ||
      (ch.category && ch.category.toLowerCase().includes(q)) ||
      (ch.ocid && ch.ocid.toLowerCase().includes(q))
    );
  }, [chapters, searchQuery]);

  // Group by category when > 10 chapters
  const shouldGroup = filteredChapters.length > 10;

  const groupedChapters = useMemo(() => {
    if (!shouldGroup) return null;
    const groups = {};
    filteredChapters.forEach(ch => {
      const cat = ch.category || 'Other';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(ch);
    });
    const ordered = [];
    CATEGORY_ORDER.forEach(cat => {
      if (groups[cat]) ordered.push({ category: cat, items: groups[cat] });
    });
    Object.keys(groups).forEach(cat => {
      if (!CATEGORY_ORDER.includes(cat)) {
        ordered.push({ category: cat, items: groups[cat] });
      }
    });
    return ordered;
  }, [filteredChapters, shouldGroup]);

  if (loading) {
    return (
      <div className="py-24 text-center space-y-4 max-w-sm mx-auto font-sans">
        <div className="badge-kicker text-[10px] text-slate-400">Loading Chapters</div>
        <LoadingBar className="max-w-[140px] mx-auto" />
      </div>
    );
  }

  return (
    <div className="space-y-10 font-sans max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-oc-ink">Manage Chapters</h1>
        <p className="text-sm text-slate-400 mt-2 font-medium max-w-2xl leading-relaxed">
          Select a chapter to manage events, view attendance, and issue Soulbound Token credentials on EDU Chain.
        </p>
      </div>

      {/* Search — editorial underline style */}
      {chapters.length > 4 && (
        <div className="relative max-w-md">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search chapters..."
            className="w-full bg-transparent border-0 border-b border-oc-periwinkle/40 focus:border-oc-blue pb-2 text-sm text-oc-ink placeholder:text-slate-300 font-medium outline-none transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-0 top-0 text-slate-400 hover:text-oc-ink text-xs font-bold transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* Chapters Grid */}
      {filteredChapters.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-sm font-bold text-oc-ink">
            {searchQuery ? 'No chapters match your search' : 'No managed chapters assigned'}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {searchQuery
              ? 'Try a different search term or clear the filter.'
              : 'Contact your Open Campus administrator to get assigned as a chapter host.'}
          </p>
        </div>
      ) : shouldGroup && groupedChapters ? (
        /* Grouped by category — each group in its own grid */
        <div className="space-y-10">
          {groupedChapters.map(group => (
            <div key={group.category}>
              <div className="flex items-center gap-3 mb-4">
                <h2 className="badge-kicker text-[10px] text-slate-400">
                  {group.category}
                </h2>
                <span className="num text-[10px] text-slate-300 font-bold">{group.items.length}</span>
                <div className="flex-1 h-px bg-oc-periwinkle/20"></div>
              </div>
              <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {group.items.map(chapter => (
                  <ChapterCard key={chapter.id} chapter={chapter} linkTo={`/manage/${chapter.id}`} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Flat grid when ≤ 10 chapters */
        <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {filteredChapters.map(chapter => (
            <ChapterCard key={chapter.id} chapter={chapter} linkTo={`/manage/${chapter.id}`} />
          ))}
        </div>
      )}
    </div>
  );
}

export default ManageHub;
