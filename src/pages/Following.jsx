import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchChapters } from '../api/mockApi';
import { useStore } from '../store/useStore';
import { ChapterCard } from '../components/ChapterCard';

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
      <div className="py-24 text-center space-y-4 max-w-sm mx-auto font-sans">
        <div className="text-xs font-semibold text-slate-400 tracking-wide uppercase">Loading followed chapters</div>
        <div className="w-16 h-0.5 bg-oc-periwinkle/30 rounded-full mx-auto overflow-hidden relative">
          <div className="absolute top-0 left-0 bottom-0 bg-oc-blue w-1/3 rounded-full animate-pulse"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 font-sans">
      {/* Header — same editorial style as Campus Chapters */}
      <h1 className="text-2xl font-black text-oc-ink sm:text-3xl">
        Following
      </h1>
      <p className="mt-1 max-w-2xl text-xs text-slate-500 font-medium">
        Chapters you follow. Their events appear in your personalized Home feed.
      </p>

      {followedChapters.length === 0 ? (
        /* Empty State — editorial, no heavy bordered box */
        <div className="text-center py-20 mt-8">
          <h2 className="text-sm font-bold text-oc-ink">No followed chapters yet</h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
            Browse campus chapters and follow them to populate your personalized event feed.
          </p>
          <Link
            to="/chapters"
            className="inline-block mt-5 px-5 py-2.5 bg-oc-blue text-white text-xs font-bold rounded-lg shadow-sm hover:bg-oc-indigo transition-colors"
          >
            Browse Chapters
          </Link>
        </div>
      ) : (
        /* Grid — same 2-col layout as Campus Chapters, using shared ChapterCard */
        <div className="mt-8 grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {followedChapters.map(chapter => (
            <ChapterCard key={chapter.id} chapter={chapter} />
          ))}
        </div>
      )}
    </div>
  );
}

export default Following;
