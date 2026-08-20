import React, { useEffect, useState } from 'react';
import { useParams, Link, useLocation, useNavigate } from 'react-router-dom';
import { fetchChapterBySlug, fetchEvents, toggleFollowChapter, isEventInChapter } from '../api/mockApi';
import { useStore } from '../store/useStore';
import NotFoundState from '../components/NotFoundState';
import useToastStore from '../store/useToastStore';
import { LoadingBar } from '../components/LoadingBar';
import { CategoryIcon } from '../components/CategoryIcon';

export function ChapterProfile() {
  const { slug } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, followChapter, unfollowChapter } = useStore();

  const [chapter, setChapter] = useState(null);
  const [chapterEvents, setChapterEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [followingState, setFollowingState] = useState(false);
  const [activeTab, setActiveTab] = useState('upcoming');

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [chapterData, allEvents] = await Promise.all([
          fetchChapterBySlug(slug),
          fetchEvents(),
        ]);

        if (!chapterData) {
          setChapter(null);
          return;
        }

        setChapter(chapterData);

        // Robust matching for events belonging to this chapter
        const filtered = allEvents.filter((e) => isEventInChapter(e, chapterData));
        setChapterEvents(filtered);

        // Initialize follow state from store
        if (user.isAuthenticated && user.followedChapterIds) {
          setFollowingState(
            user.followedChapterIds.includes(chapterData.id) ||
            (chapterData.slug && user.followedChapterIds.includes(chapterData.slug)) ||
            (chapterData.ocid && user.followedChapterIds.includes(chapterData.ocid))
          );
        }
      } catch (err) {
        console.error('Failed to load chapter profile', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [slug, user.isAuthenticated, JSON.stringify(user.followedChapterIds || [])]);

  const [isActionLoading, setIsActionLoading] = useState(false);
  const showToast = useToastStore((state) => state.showToast);

  const handleFollowToggle = async () => {
    if (!user.isAuthenticated) {
      navigate('/login');
      return;
    }

    if (!chapter) return;
    setIsActionLoading(true);

    const nextState = !followingState;
    setFollowingState(nextState);

    try {
      const updatedChapter = await toggleFollowChapter(chapter.id, nextState);
      if (updatedChapter) {
        setChapter(prev => ({ ...prev, ...updatedChapter }));
      }

      // Sync Zustand store
      if (nextState) {
        followChapter(chapter.id);
        if (chapter.slug) followChapter(chapter.slug);
        if (updatedChapter?.chapterUuid) followChapter(updatedChapter.chapterUuid);
        showToast(`Subscribed to calendar: ${chapter.name}`, 'success');
      } else {
        unfollowChapter(chapter.id);
        if (chapter.slug) unfollowChapter(chapter.slug);
        if (updatedChapter?.chapterUuid) unfollowChapter(updatedChapter.chapterUuid);
        showToast(`Unsubscribed from calendar: ${chapter.name}`, 'info');
      }
    } catch (err) {
      console.error('Failed to toggle follow', err);
      showToast('Operation failed. Please try again.', 'error');
      setFollowingState(!nextState); // rollback on error
    } finally {
      setIsActionLoading(false);
    }
  };

  // ── Loading State ──
  if (loading) {
    return (
      <div className="py-24 text-center space-y-4 max-w-sm mx-auto font-sans">
        <div className="badge-kicker text-[10px] text-slate-400">Loading chapter profile...</div>
        <LoadingBar className="max-w-[140px] mx-auto" />
      </div>
    );
  }

  // ── Not Found State ──
  if (!chapter) {
    return (
      <NotFoundState
        title="Chapter not found"
        message="The chapter you are looking for does not exist or the URL may be incorrect."
        backTo="/chapters"
        backLabel="Browse chapters"
      />
    );
  }

  const now = new Date();
  const upcomingEvents = chapterEvents.filter((e) => new Date(e.datetime) >= now);
  const pastEvents = chapterEvents.filter((e) => new Date(e.datetime) < now);
  const displayedEvents = activeTab === 'upcoming' ? upcomingEvents : pastEvents;
  const isStudentFollowingRoute = location.pathname.startsWith('/following/chapters/');

  return (
    <div className="max-w-4xl mx-auto py-10 space-y-12">
      {/* Back Link */}
      <Link
        to={isStudentFollowingRoute ? '/following' : '/chapters'}
        className="text-xs text-accent-blue hover:underline font-semibold"
      >
        {isStudentFollowingRoute ? 'Back to Following' : 'Back to All Chapters'}
      </Link>

      {/* Header Info Card */}
      <div className="bg-surface border border-border rounded-xl p-6 md:p-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          {/* Left: Avatar + Info */}
          <div className="flex items-center gap-4">
            {/* Outline Icon Box: matching ChapterCard design & CategoryIcon scale */}
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-sm border border-oc-periwinkle/70 bg-oc-mist/40 shadow-sm transition-colors">
              <CategoryIcon category={chapter.category} className="w-8 h-8 text-oc-blue" />
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl font-extrabold text-navy leading-tight">
                {chapter.name}
              </h1>
              <div className="text-[11px] font-mono text-accent-blue">
                {chapter.ocid}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="inline-block px-2.5 py-0.5 rounded-sm text-[9px] font-bold uppercase tracking-wider bg-white/70 text-slate-600 border border-oc-periwinkle/60">
                  {chapter.category}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Stats + Follow */}
          <div className="flex items-center gap-4">
            <div className="text-right text-xs">
              <div className="font-bold text-navy">
                {chapter.followerCount} followers
              </div>
              <div className="text-text-secondary">
                {chapter.eventsHosted} events hosted
              </div>
            </div>

            {user.isAuthenticated && (
              <button
                disabled={isActionLoading}
                onClick={handleFollowToggle}
                className={`px-6 py-2.5 rounded-md text-xs font-semibold uppercase tracking-wider transition-all disabled:opacity-50 shadow-sm ${
                  followingState
                    ? 'bg-white border border-navy text-navy hover:bg-slate-50'
                    : 'bg-navy text-white hover:bg-navy-light'
                }`}
              >
                {isActionLoading
                  ? 'Processing...'
                  : followingState
                  ? 'Following'
                  : 'Follow Chapter'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-text-secondary">
          About this Chapter
        </h2>
        <p className="text-sm leading-relaxed text-text-primary">
          {chapter.description}
        </p>
      </div>

      {/* Events Section */}
      <div className="space-y-6 border-t border-border pt-10">
        <h2 className="text-lg font-bold text-navy">
          Events by {chapter.name}
        </h2>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-border">
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
              activeTab === 'upcoming'
                ? 'text-navy border-b-2 border-navy'
                : 'text-text-secondary hover:text-navy'
            }`}
          >
            Upcoming ({upcomingEvents.length})
          </button>
          <button
            onClick={() => setActiveTab('past')}
            className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
              activeTab === 'past'
                ? 'text-navy border-b-2 border-navy'
                : 'text-text-secondary hover:text-navy'
            }`}
          >
            Past ({pastEvents.length})
          </button>
        </div>

        {/* Event Cards */}
        {displayedEvents.length === 0 ? (
          <div className="text-center py-12 bg-surface border border-dashed border-border rounded-xl">
            <h3 className="text-sm font-semibold text-navy">
              {activeTab === 'upcoming'
                ? 'No upcoming events'
                : 'No past events'}
            </h3>
            <p className="text-xs text-text-secondary mt-1">
              {activeTab === 'upcoming'
                ? 'Check back later for new events from this chapter.'
                : 'This chapter has no completed events yet.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {displayedEvents.map((event) => {
              const dateStr = new Date(event.datetime).toLocaleDateString(
                'en-US',
                {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                }
              );

              return (
                <Link
                  key={event.id}
                  to={`/e/${event.slug}`}
                  className={`bg-white border border-border rounded-xl p-5 hover:shadow-md transition-all block ${
                    activeTab === 'past' ? 'opacity-80 hover:opacity-100' : ''
                  }`}
                >
                  <span className="badge-kicker text-[10px] uppercase font-extrabold tracking-wider text-oc-blue block mb-1">
                    {event.category}
                  </span>
                  <h3 className="text-sm font-bold text-navy mt-1 leading-snug line-clamp-1">
                    {event.name}
                  </h3>
                  <p className="text-xs text-text-secondary mt-1.5 line-clamp-2 leading-relaxed">
                    {event.description}
                  </p>
                  <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border/50 text-[10px] text-text-secondary font-medium">
                    <span>{dateStr}</span>
                    <span>{event.locationType}</span>
                    <span>+{event.points} pts</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default ChapterProfile;
