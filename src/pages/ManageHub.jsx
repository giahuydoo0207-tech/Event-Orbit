import React, { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { fetchChapters } from '../api/mockApi';
import { ChapterCard } from '../components/ChapterCard';
import { LoadingBar } from '../components/LoadingBar';
import { useOrganizerSession } from '../contexts/OrganizerSessionContext';

const CATEGORY_ORDER = ['Tech', 'Design', 'Business', 'Social'];

export function ManageHub() {
  const organizerSession = useOrganizerSession();
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!organizerSession) return;
    async function loadChapters() {
      try {
        setChapters(await fetchChapters());
      } catch (err) {
        console.error('Failed to load chapters', err);
      } finally {
        setLoading(false);
      }
    }
    loadChapters();
  }, [organizerSession]);

  const filteredChapters = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return chapters;
    return chapters.filter((chapter) =>
      chapter.name.toLowerCase().includes(query)
      || chapter.category?.toLowerCase().includes(query)
      || chapter.ocid?.toLowerCase().includes(query));
  }, [chapters, searchQuery]);

  const groupedChapters = useMemo(() => {
    if (filteredChapters.length <= 10) return null;
    const groups = filteredChapters.reduce((result, chapter) => {
      const category = chapter.category || 'Other';
      (result[category] ||= []).push(chapter);
      return result;
    }, {});
    return Object.entries(groups).sort(([a], [b]) => {
      const ai = CATEGORY_ORDER.indexOf(a);
      const bi = CATEGORY_ORDER.indexOf(b);
      return (ai < 0 ? CATEGORY_ORDER.length : ai) - (bi < 0 ? CATEGORY_ORDER.length : bi);
    });
  }, [filteredChapters]);

  if (!organizerSession?.chapterId && !organizerSession?.chapter_id) {
    return <Navigate to="/login" replace />;
  }

  if (loading) {
    return (
      <div className="py-24 text-center space-y-4 max-w-sm mx-auto font-sans">
        <div className="badge-kicker text-[10px] text-slate-400">Loading Chapters</div>
        <LoadingBar className="max-w-[140px] mx-auto" />
      </div>
    );
  }

  const chapterGrid = (items) => (
    <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((chapter) => (
        <ChapterCard key={chapter.id} chapter={chapter} linkTo={`/manage/${encodeURIComponent(chapter.id)}`} variant="organizer" />
      ))}
    </div>
  );

  return (
    <div className="organizer-manage-hub space-y-8 font-sans max-w-5xl">
      <section className="organizer-page-hero rounded-xl border border-oc-periwinkle/60 bg-white p-6 shadow-oc-sm sm:p-8" aria-labelledby="manage-chapters-title">
        <p className="text-xs font-bold text-oc-blue">Organizer workspace</p>
        <h1 id="manage-chapters-title" className="mt-2 text-2xl font-black text-oc-navy sm:text-3xl">Manage Chapters</h1>
        <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-600">Select a chapter to coordinate events, attendance, and credential operations.</p>
        <div className="mt-5 flex flex-wrap gap-2" aria-label="Chapter overview">
          <span className="rounded-lg border border-oc-periwinkle/60 bg-oc-mist px-3 py-1.5 text-xs font-bold text-oc-navy"><span className="num text-oc-blue">{chapters.length}</span> active chapter{chapters.length !== 1 ? 's' : ''}</span>
          <span className="rounded-lg border border-oc-periwinkle/60 bg-white px-3 py-1.5 text-xs font-bold text-slate-600">Event operations</span>
        </div>
      </section>

      {chapters.length > 4 && (
        <div className="relative max-w-md">
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search chapters..."
            aria-label="Search chapters"
            className="w-full bg-transparent border-0 border-b border-oc-periwinkle/40 focus:border-oc-blue pb-2 text-sm text-oc-ink placeholder:text-slate-300 font-medium outline-none transition-colors"
          />
          {searchQuery && (
            <button type="button" onClick={() => setSearchQuery('')} className="absolute right-0 top-0 text-slate-400 hover:text-oc-ink text-xs font-bold transition-colors">
              Clear
            </button>
          )}
        </div>
      )}

      {filteredChapters.length === 0 ? (
        <div className="empty-state" role="status">
          <p className="text-sm font-bold text-oc-ink">{searchQuery ? 'No chapters match your search' : 'No chapters available'}</p>
          <p className="text-xs text-slate-400 mt-1">Try a different search term or clear the filter.</p>
        </div>
      ) : groupedChapters ? (
        <div className="space-y-10">
          {groupedChapters.map(([category, items]) => (
            <section key={category} aria-labelledby={`chapter-group-${category}`}>
              <div className="flex items-center gap-3 mb-4">
                <h2 id={`chapter-group-${category}`} className="badge-kicker text-[10px] text-slate-400">{category}</h2>
                <span className="num text-[10px] text-slate-300 font-bold">{items.length}</span>
                <div className="flex-1 h-px bg-oc-periwinkle/20" />
              </div>
              {chapterGrid(items)}
            </section>
          ))}
        </div>
      ) : chapterGrid(filteredChapters)}
    </div>
  );
}

export default ManageHub;
