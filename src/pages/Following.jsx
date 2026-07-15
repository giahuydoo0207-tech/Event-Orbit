import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchChapters } from '../api/mockApi';
import { useStore } from '../store/useStore';

export function Following() {
  const user = useStore((state) => state.user);
  const [followedChapters, setFollowedChapters] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFollowed() {
      setLoading(true);
      try {
        const list = await fetchChapters();
        const followedIds = user.followedChapterIds || [];
        const filtered = list.filter(c => followedIds.includes(c.id));
        setFollowedChapters(filtered);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadFollowed();
  }, [user.followedChapterIds]);

  if (loading) {
    return (
      <div className="py-24 text-center space-y-4 max-w-lg mx-auto">
        <div className="text-sm font-medium text-text-secondary">Retrieving followed chapters...</div>
        <div className="w-10 h-1 bg-border rounded-full mx-auto overflow-hidden relative">
          <div className="absolute top-0 left-0 bottom-0 bg-accent-blue w-1/2 rounded-full animate-[pulse_1s_infinite]"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-10 space-y-12">
      {/* Title */}
      <div className="space-y-2 border-b border-border pb-6">
        <h1 className="text-3xl font-extrabold text-navy tracking-tight">Following</h1>
        <p className="text-sm text-text-secondary">
          Chapters you follow. Their events will appear in your personalized Home feed.
        </p>
      </div>

      {followedChapters.length === 0 ? (
        /* Empty State */
        <div className="text-center py-20 bg-surface border border-dashed border-border rounded-2xl p-8 space-y-6">
          <div className="space-y-2">
            <h2 className="text-lg font-bold text-navy">No followed chapters yet</h2>
            <p className="text-xs text-text-secondary max-w-xs mx-auto">
              Browse campus chapters and follow them to populate your personalized event feed.
            </p>
          </div>
          <Link
            to="/chapters"
            className="inline-block py-2.5 px-6 bg-navy text-white text-xs font-semibold rounded hover:bg-navy-light uppercase tracking-wider transition-all"
          >
            Browse Chapters
          </Link>
        </div>
      ) : (
        /* Followed list grid */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {followedChapters.map(chapter => {
            const initials = chapter.name.split(' ').map(n => n[0]).join('').substring(0, 2);
            return (
              <Link
                key={chapter.id}
                to={`/chapters/${chapter.slug}`}
                className="bg-white border border-border rounded-xl p-5 hover:shadow-md transition-all flex items-start gap-4"
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-xs bg-gradient-to-br ${chapter.avatarGradient || 'from-slate-600 to-slate-900'} shrink-0`}>
                  {initials}
                </div>
                <div className="space-y-1 min-w-0 flex-grow">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-bold text-navy truncate">{chapter.name}</h3>
                    <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[8px] font-semibold uppercase tracking-wider">
                      {chapter.category}
                    </span>
                  </div>
                  <p className="text-[11px] text-text-secondary line-clamp-1">{chapter.description}</p>
                  <div className="text-[10px] text-accent-blue font-mono font-medium pt-1">
                    {chapter.followerCount} followers &bull; {chapter.eventsHosted} events
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
export default Following;
