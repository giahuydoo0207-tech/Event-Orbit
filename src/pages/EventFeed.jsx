import { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { fetchEvents, fetchChapters } from '../api/mockApi';

const TAG_OPTIONS = ['All', 'Tech', 'Design', 'Business', 'Social'];

export function EventFeed() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [events, setEvents] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedChapterId, setSelectedChapterId] = useState('');

  const activeTag = searchParams.get('tag') || 'All';

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [eventsData, chaptersData] = await Promise.all([
          fetchEvents(),
          fetchChapters(),
        ]);
        setEvents(eventsData);
        setChapters(chaptersData);
      } catch {
        // fail silently — empty state will show
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const chapterMap = useMemo(() => {
    const map = {};
    chapters.forEach((ch) => {
      map[ch.id] = ch;
    });
    return map;
  }, [chapters]);

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const matchesTag =
        activeTag === 'All' ||
        event.category === activeTag ||
        (event.tags && event.tags.includes(activeTag));
      const matchesChapter =
        !selectedChapterId || event.chapterId === selectedChapterId;
      return matchesTag && matchesChapter;
    });
  }, [events, activeTag, selectedChapterId]);

  function handleTagChange(tag) {
    if (tag === 'All') {
      searchParams.delete('tag');
    } else {
      searchParams.set('tag', tag);
    }
    setSearchParams(searchParams);
  }

  function formatDate(datetime) {
    if (!datetime) return '';
    const d = new Date(datetime);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  // ── Loading skeleton ──────────────────────────────────────────
  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8 h-8 w-48 animate-pulse rounded bg-surface" />
        <div className="mb-6 flex gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-9 w-20 animate-pulse rounded-full bg-surface"
            />
          ))}
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-72 animate-pulse rounded-xl bg-surface"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      {/* Header */}
      <h1 className="text-2xl font-bold text-text-primary sm:text-3xl">
        Explore Events
      </h1>

      {/* Filter Bar */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        {/* Tag chips */}
        {TAG_OPTIONS.map((tag) => {
          const isActive = activeTag === tag;
          return (
            <button
              key={tag}
              onClick={() => handleTagChange(tag)}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-accent-blue/40 ${
                isActive
                  ? 'border-accent-blue bg-accent-blue text-white'
                  : 'border-border bg-white text-text-secondary hover:border-accent-blue/40 hover:text-text-primary'
              }`}
            >
              {tag}
            </button>
          );
        })}

        {/* Chapter dropdown */}
        <select
          value={selectedChapterId}
          onChange={(e) => setSelectedChapterId(e.target.value)}
          className="ml-auto rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-accent-blue focus:outline-none focus:ring-2 focus:ring-accent-blue/30"
        >
          <option value="">All Chapters</option>
          {chapters.map((ch) => (
            <option key={ch.id} value={ch.id}>
              {ch.name}
            </option>
          ))}
        </select>
      </div>

      {/* Event Grid or Empty State */}
      {filteredEvents.length === 0 ? (
        <div className="mt-20 text-center space-y-3">
          <p className="text-base font-bold text-navy">
            No events match this filter
          </p>
          <p className="text-xs text-text-secondary">
            Try a different tag or browse all events.
          </p>
          <button
            onClick={() => {
              searchParams.delete('tag');
              setSearchParams(searchParams);
              setSelectedChapterId('');
            }}
            className="mt-2 inline-block px-5 py-2 border border-border text-xs font-semibold uppercase tracking-wider rounded hover:bg-slate-50 transition-all"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredEvents.map((event) => {
            const chapter = chapterMap[event.chapterId];
            return (
              <Link
                key={event.id}
                to={`/e/${event.slug}`}
                className="group flex flex-col overflow-hidden rounded-xl border border-border bg-white shadow-sm transition hover:shadow-md hover:border-accent-blue/30"
              >
                {/* Cover Image */}
                <div className="relative h-40 w-full overflow-hidden bg-surface">
                  {event.coverImage ? (
                    <img
                      src={event.coverImage}
                      alt={event.name}
                      className="h-full w-full object-cover transition group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-gradient-to-br from-navy to-indigo-900">
                      <span className="text-xs font-semibold uppercase tracking-widest text-white/40">
                        {event.category || 'Event'}
                      </span>
                    </div>
                  )}

                  {/* Category label */}
                  {event.category && (
                    <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-navy backdrop-blur">
                      {event.category}
                    </span>
                  )}
                </div>

                {/* Card Body */}
                <div className="flex flex-1 flex-col p-5">
                  <h3 className="text-base font-bold text-text-primary line-clamp-2 group-hover:text-accent-blue transition">
                    {event.name}
                  </h3>

                  <p className="mt-1.5 text-xs text-text-secondary">
                    {formatDate(event.datetime)}
                  </p>

                  <div className="mt-auto flex items-center justify-between pt-4">
                    {chapter && (
                      <span className="truncate text-xs font-medium text-text-secondary">
                        {chapter.name}
                      </span>
                    )}
                    {event.points != null && (
                      <span className="shrink-0 rounded-full bg-surface px-2.5 py-1 text-xs font-bold text-navy">
                        {event.points} SBT
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default EventFeed;
