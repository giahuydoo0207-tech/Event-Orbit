import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { fetchChapters } from '../api/mockApi';
import { ChapterCard } from '../components/ChapterCard';

const CATEGORY_OPTIONS = ['All', 'Tech', 'Design', 'Business', 'Social'];

export function ChapterList() {
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await fetchChapters();
        setChapters(data);
      } catch {
        // empty state will show
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filteredChapters = useMemo(() => {
    if (activeCategory === 'All') return chapters;
    return chapters.filter((ch) => ch.category === activeCategory);
  }, [chapters, activeCategory]);

  // ── Loading skeleton ──────────────────────────────────────────
  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-10 font-sans">
        <div className="text-xs font-semibold text-slate-500">Loading Campus Chapters...</div>
        <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 mt-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-xl bg-white border border-oc-periwinkle/50"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 font-sans">
      {/* Header */}
      <h1 className="text-2xl font-black text-oc-ink sm:text-3xl">
        Campus Chapters
      </h1>
      <p className="mt-1 max-w-2xl text-xs text-slate-500 font-medium">
        Follow a chapter to stay updated on their upcoming workshops, hackathons, and community events on EDU Chain.
      </p>

      {/* Category Tabs */}
      <div className="mt-6 flex flex-wrap gap-2">
        {CATEGORY_OPTIONS.map((cat) => {
          const isActive = activeCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`rounded-xl border px-4 py-2 text-xs font-bold transition-all ${
                isActive
                  ? 'border-oc-blue bg-oc-blue text-white shadow-sm'
                  : 'border-oc-periwinkle/70 bg-white text-slate-700 hover:border-oc-blue hover:text-oc-blue'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Chapter Grid or Empty State */}
      {filteredChapters.length === 0 ? (
        <div className="mt-12 text-center py-16 bg-white border border-dashed border-oc-periwinkle rounded-2xl space-y-2">
          <p className="text-sm font-bold text-oc-ink">
            No chapters found in this category
          </p>
          <p className="text-xs text-slate-500">
            Select a different category tab or browse all chapters.
          </p>
        </div>
      ) : (
        <div className="mt-8 grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {filteredChapters.map((chapter) => (
            <ChapterCard key={chapter.id} chapter={chapter} />
          ))}
        </div>
      )}
    </div>
  );
}

export default ChapterList;
