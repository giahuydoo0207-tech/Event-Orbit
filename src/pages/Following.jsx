import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchChapters } from '../api/mockApi';
import { useStore } from '../store/useStore';
import { ChapterCard } from '../components/ChapterCard';
import { LoadingBar } from '../components/LoadingBar';
import studentFollowingSticker from '../assets/feature-chapter-communities.png';

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
        const filtered = list.filter(c => 
          followedIds.includes(c.id) || 
          followedIds.includes(c.slug) || 
          followedIds.includes(c.ocid)
        );
        setFollowedChapters(filtered);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadFollowed();  
    }, [JSON.stringify(user.followedChapterIds)]);

  if (loading) {
    return (
      <div className="py-24 text-center space-y-4 max-w-sm mx-auto font-sans">
        <div className="badge-kicker text-[10px] text-slate-400">Loading followed chapters</div>
        <LoadingBar className="max-w-[140px] mx-auto" />
      </div>
    );
  }

  return (
    <div className="page-shell max-w-5xl font-sans">
      {/* Header — same editorial style as Campus Chapters */}
      <div className="student-page-heading"><div><h1 className="page-title">Following</h1><p className="page-summary">Chapters you follow. Their events appear in your personalized Home feed.</p></div><img src={studentFollowingSticker} alt="" aria-hidden="true" className="student-header-sticker hidden h-20 w-24 shrink-0 object-contain sm:block" /></div>
      <div className="mt-5 rounded-xl border border-oc-periwinkle/60 border-l-4 border-l-oc-turquoise bg-white p-5 shadow-oc-sm sm:flex sm:items-center sm:justify-between sm:gap-6">
        <div><h2 className="text-sm font-black text-oc-ink">Grow your campus circle</h2><p className="mt-1 text-xs leading-5 text-slate-600">Follow another chapter to bring more workshops, meetups, and activities into Home.</p></div>
        <Link
          to="/chapters"
          className="action-primary mt-4 sm:mt-0"
        >
          Follow More Chapters
        </Link>
      </div>
      {followedChapters.length === 0 ? (
        /* Empty State — editorial, no heavy bordered box */
        <div className="empty-state student-empty-state mt-8">
          <div className="student-empty-icon" aria-hidden="true"><span /></div>
          <h2 className="text-sm font-bold text-oc-ink">No followed chapters yet</h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
            Browse campus chapters and follow them to populate your personalized event feed.
          </p>
          <Link
            to="/chapters"
            className="action-primary mt-5"
          >
            Browse Chapters
          </Link>
        </div>
      ) : (
        /* Grid — same 2-col layout as Campus Chapters, using shared ChapterCard */
        <div className="mt-8 grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {followedChapters.map(chapter => (
            <ChapterCard
              key={chapter.id}
              chapter={chapter}
              linkTo={`/following/chapters/${chapter.slug}`}
              variant="student"
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default Following;
