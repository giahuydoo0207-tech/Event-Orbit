import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { fetchChapters } from '../api/mockApi';

const CATEGORY_OPTIONS = ['All', 'Tech', 'Design', 'Business', 'Social'];

function getInitial(name) {
  if (!name) return '?';
  return name.charAt(0).toUpperCase();
}

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
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-2 h-8 w-56 animate-pulse rounded bg-surface" />
        <div className="mb-8 h-5 w-96 animate-pulse rounded bg-surface" />
        <div className="mb-6 flex gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-9 w-20 animate-pulse rounded-full bg-surface"
            />
          ))}
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-48 animate-pulse rounded-xl bg-surface"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      {/* Header */}
      <h1 className="text-2xl font-bold text-text-primary sm:text-3xl">
        Campus Chapters
      </h1>
      <p className="mt-2 max-w-2xl text-text-secondary">
        Follow a chapter to stay updated on their upcoming workshops,
        hackathons, and community events.
      </p>

      {/* Category Tabs */}
      <div className="mt-8 flex flex-wrap gap-2">
        {CATEGORY_OPTIONS.map((cat) => {
          const isActive = activeCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-accent-blue/40 ${
                isActive
                  ? 'border-accent-blue bg-accent-blue text-white'
                  : 'border-border bg-white text-text-secondary hover:border-accent-blue/40 hover:text-text-primary'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Chapter Grid or Empty State */}
      {filteredChapters.length === 0 ? (
        <div className="mt-20 text-center space-y-3">
          <p className="text-base font-bold text-navy">
            No chapters in this category yet
          </p>
          <p className="text-xs text-text-secondary">
            Try selecting a different category or browse all chapters.
          </p>
        </div>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          {filteredChapters.map((chapter) => (
            <Link
              key={chapter.id}
              to={`/chapters/${chapter.slug}`}
              className="group flex gap-5 rounded-xl border border-border bg-white p-6 shadow-sm transition hover:shadow-md hover:border-accent-blue/30"
            >
              {/* Avatar */}
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-lg font-bold text-white"
                style={{
                  background:
                    chapter.avatarGradient ||
                    'linear-gradient(135deg, #0A2540, #4F46E5)',
                }}
              >
                {getInitial(chapter.name)}
              </div>

              {/* Details */}
              <div className="flex flex-1 flex-col min-w-0">
                <h3 className="text-base font-bold text-text-primary group-hover:text-accent-blue transition truncate">
                  {chapter.name}
                </h3>

                {chapter.ocid && (
                  <p className="mt-0.5 text-xs font-medium text-accent-blue truncate">
                    {chapter.ocid}
                  </p>
                )}

                {chapter.description && (
                  <p className="mt-2 text-sm leading-relaxed text-text-secondary line-clamp-2">
                    {chapter.description}
                  </p>
                )}

                {/* Stats + Badge */}
                <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-4 text-xs text-text-secondary">
                  <span>
                    <span className="font-semibold text-text-primary">
                      {chapter.followerCount ?? 0}
                    </span>{' '}
                    followers
                  </span>
                  <span>
                    <span className="font-semibold text-text-primary">
                      {chapter.eventsHosted ?? 0}
                    </span>{' '}
                    events hosted
                  </span>
                  {chapter.category && (
                    <span className="ml-auto rounded-full bg-surface px-2.5 py-0.5 text-xs font-semibold text-navy">
                      {chapter.category}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default ChapterList;
