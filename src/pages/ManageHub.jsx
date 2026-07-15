import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchChapters } from '../api/mockApi';
import { useStore } from '../store/useStore';

export function ManageHub() {
  const { user } = useStore();
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadChapters() {
      setLoading(true);
      try {
        // In this demo the organizer manages all chapters
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

  // ── Loading State ──
  if (loading) {
    return (
      <div className="py-20 text-center space-y-4 max-w-sm mx-auto">
        <div className="text-sm font-medium text-text-secondary">Loading managed chapters...</div>
        <div className="w-10 h-1 bg-border rounded-full mx-auto overflow-hidden relative">
          <div className="absolute top-0 left-0 bottom-0 bg-accent-blue w-1/2 rounded-full animate-[pulse_1s_infinite]"></div>
        </div>
      </div>
    );
  }

  // ── Empty State ──
  if (chapters.length === 0) {
    return (
      <div className="py-24 text-center max-w-lg mx-auto space-y-3">
        <h2 className="text-lg font-bold text-navy">No Managed Chapters</h2>
        <p className="text-xs text-text-secondary">
          You are not currently managing any chapters. Contact your campus administrator to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-navy">Manage Chapters</h1>
        <p className="text-xs text-text-secondary mt-1 font-medium max-w-xl">
          Select a chapter to view event metrics, manage check-ins, and create new events.
        </p>
      </div>

      {/* Chapters Grid */}
      {chapters.length === 0 ? (
        <div className="text-center py-16 space-y-2">
          <p className="text-sm font-bold text-navy">You don't manage any chapters yet</p>
          <p className="text-xs text-text-secondary">Contact your department admin to get assigned as an organizer.</p>
        </div>
      ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {chapters.map((chapter) => {
          const initials = chapter.name
            .split(' ')
            .map((w) => w[0])
            .join('')
            .substring(0, 2)
            .toUpperCase();

          return (
            <Link
              key={chapter.id}
              to={`/manage/${chapter.id}`}
              className="bg-white border border-border rounded-xl p-6 hover:shadow-md transition-all block group"
            >
              {/* Avatar + Name */}
              <div className="flex items-start gap-4">
                <div
                  className={`w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-sm bg-gradient-to-br ${chapter.avatarGradient || 'from-slate-600 to-slate-900'} shrink-0`}
                >
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold text-navy leading-snug group-hover:text-accent-blue transition-colors truncate">
                    {chapter.name}
                  </h3>
                  <div className="text-[11px] font-mono text-accent-blue mt-0.5 truncate">
                    {chapter.ocid}
                  </div>
                </div>
              </div>

              {/* Category Badge */}
              <div className="mt-4">
                <span className="inline-block px-2 py-0.5 rounded-[3px] text-[9px] font-semibold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                  {chapter.category}
                </span>
              </div>

              {/* Stats Row */}
              <div className="mt-4 pt-4 border-t border-border flex items-center gap-6">
                <div>
                  <div className="text-[10px] text-text-secondary uppercase font-bold tracking-widest">
                    Events
                  </div>
                  <div className="text-lg font-extrabold text-navy mt-0.5">
                    {chapter.eventsHosted}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-text-secondary uppercase font-bold tracking-widest">
                    Followers
                  </div>
                  <div className="text-lg font-extrabold text-navy mt-0.5">
                    {chapter.followerCount}
                  </div>
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

export default ManageHub;
