import { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { fetchEvents, fetchChapters, isEventInChapter } from '../api/mockApi';
import { CategoryIcon } from '../components/CategoryIcon';

const CATEGORIES = [
  { id: 'All', label: 'All Events', category: 'All' },
  { id: 'Tech', label: 'Technology & Dev', category: 'Tech' },
  { id: 'Design', label: 'Design & Creative', category: 'Design' },
  { id: 'Business', label: 'Business & Finance', category: 'Business' },
  { id: 'Social', label: 'Social & Campus', category: 'Social' },
];

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
      if (ch.slug) map[ch.slug] = ch;
    });
    return map;
  }, [chapters]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts = { All: events.length };
    events.forEach(e => {
      const cat = e.category || 'General';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [events]);

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const matchesTag =
        activeTag === 'All' ||
        event.category === activeTag ||
        (event.tags && event.tags.includes(activeTag));
      const selectedChapterObj = chapters.find(c => c.id === selectedChapterId || c.slug === selectedChapterId);
      const matchesChapter =
        !selectedChapterId || (selectedChapterObj ? isEventInChapter(event, selectedChapterObj) : event.chapterId === selectedChapterId);
      return matchesTag && matchesChapter;
    });
  }, [events, activeTag, selectedChapterId, chapters]);

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
      <div className="mx-auto max-w-6xl px-6 py-10 space-y-6 font-sans">
        <div className="text-xs font-semibold text-slate-500">Loading Events Feed...</div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-72 animate-pulse rounded-2xl bg-white border border-oc-periwinkle/50"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 font-sans space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-oc-ink sm:text-3xl">
          Explore Campus Events
        </h1>
        <p className="text-xs text-slate-500 mt-1 font-medium">
          Discover upcoming workshops, hackathons, and seminars verified on EDU Chain.
        </p>
      </div>

      {/* Luma-inspired "Browse by Category" Icon Grid */}
      <div className="space-y-3">
        <div className="badge-kicker text-slate-500">Browse by Category</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {CATEGORIES.map((catItem) => {
            const isActive = activeTag === catItem.category;
            const count = categoryCounts[catItem.category] || 0;

            return (
              <button
                key={catItem.id}
                onClick={() => handleTagChange(catItem.category)}
                className={`p-3 rounded-xl border text-left transition-all flex items-center gap-3 ${
                  isActive
                    ? 'border-oc-blue bg-oc-blue text-white shadow-md'
                    : 'border-oc-periwinkle/70 bg-white text-oc-ink hover:border-oc-blue/60 hover:shadow-sm'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    isActive ? 'bg-white/20 text-white' : 'bg-oc-mist text-oc-blue'
                  }`}
                >
                  <CategoryIcon category={catItem.category} className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className={`text-xs font-black truncate leading-tight ${isActive ? 'text-white' : 'text-oc-ink'}`}>
                    {catItem.label}
                  </div>
                  <div className={`text-[10px] font-bold font-mono mt-0.5 ${isActive ? 'text-oc-turquoise' : 'text-slate-500'}`}>
                    {count} Events
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter Bar with Chapter Selector */}
      <div className="flex justify-between items-center pt-4 border-t border-oc-periwinkle/40">
        <div className="text-xs font-bold text-oc-ink">
          Showing <span className="text-oc-blue font-black">{filteredEvents.length}</span> Events
        </div>

        {/* Chapter dropdown */}
        <select
          value={selectedChapterId}
          onChange={(e) => setSelectedChapterId(e.target.value)}
          className="rounded-xl border border-oc-periwinkle/70 bg-white px-3.5 py-2 text-xs font-bold text-oc-ink focus:border-oc-blue focus:outline-none shadow-sm"
        >
          <option value="">All Chapters</option>
          {chapters.map((ch) => (
            <option key={ch.id} value={ch.id}>
              {ch.name}
            </option>
          ))}
        </select>
      </div>

      {/* Events Grid */}
      {filteredEvents.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-oc-periwinkle bg-white p-16 text-center">
          <h3 className="text-sm font-bold text-oc-ink">No events found</h3>
          <p className="mt-1 text-xs text-slate-500">
            Try selecting a different category or clear your chapter filter.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredEvents.map((event) => {
            const ch = event.chapter || chapters.find(c => isEventInChapter(event, c)) || chapterMap[event.chapterId];
            return (
              <Link
                key={event.id}
                to={`/e/${event.slug}`}
                className="group flex flex-col overflow-hidden rounded-2xl border border-oc-periwinkle/70 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                {/* Cover Image */}
                <div className="relative h-44 overflow-hidden bg-oc-navy">
                  <img
                    src={event.coverImage}
                    alt={event.name}
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  />
                  <div className="absolute top-3 left-3 flex gap-2">
                    <span className="badge-kicker rounded-lg bg-oc-navy/80 backdrop-blur-md px-2.5 py-1 text-[9px] text-oc-turquoise border border-oc-turquoise/30">
                      +{event.points} PTS
                    </span>
                  </div>
                  {event.category && (
                    <span className="absolute top-3 right-3 badge-kicker rounded-lg bg-white/90 backdrop-blur-md px-2.5 py-1 text-[9px] text-oc-blue font-bold shadow-sm">
                      {event.category}
                    </span>
                  )}
                </div>

                {/* Event Details */}
                <div className="flex flex-1 flex-col justify-between p-5 space-y-4">
                  <div className="space-y-2">
                    <div className="text-[11px] font-bold text-oc-blue">
                      {formatDate(event.datetime)} &bull; {event.locationType || 'In-person'}
                    </div>
                    <h2 className="text-base font-bold text-oc-ink group-hover:text-oc-blue transition-colors line-clamp-2">
                      {event.name}
                    </h2>
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed font-medium">
                      {event.description}
                    </p>
                  </div>

                  {/* Footer metadata */}
                  <div className="flex items-center justify-between pt-3 border-t border-oc-periwinkle/40">
                    <div className="text-[11px] text-slate-600 font-semibold truncate max-w-[160px]">
                      {ch?.name || 'Chapter'}
                    </div>
                    <span className="text-xs font-bold text-oc-blue group-hover:translate-x-0.5 transition-transform">
                      View Details &rarr;
                    </span>
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
