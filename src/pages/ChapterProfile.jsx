import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { fetchChapterBySlug, fetchEvents, toggleFollowChapter } from '../api/mockApi';
import { useStore } from '../store/useStore';
import NotFoundState from '../components/NotFoundState';
import useToastStore from '../store/useToastStore';

export function ChapterProfile() {
  const { slug } = useParams();
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

        // Filter events belonging to this chapter
        const filtered = allEvents.filter((e) => e.chapterId === chapterData.id);
        setChapterEvents(filtered);

        // Initialize follow state from store
        if (user.isAuthenticated && user.followedChapterIds) {
          setFollowingState(user.followedChapterIds.includes(chapterData.id));
        }
      } catch (err) {
        console.error('Failed to load chapter profile', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [slug, user.isAuthenticated, user.followedChapterIds]);

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
        setChapter(updatedChapter);
      }

      // Sync Zustand store
      if (nextState) {
        followChapter(chapter.id);
        showToast(`Subscribed to calendar: ${chapter.name}`, 'success');
      } else {
        unfollowChapter(chapter.id);
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
      <div className="py-24 text-center space-y-4 max-w-lg mx-auto">
        <div className="text-sm font-medium text-text-secondary">
          Loading chapter profile...
        </div>
        <div className="w-10 h-1 bg-border rounded-full mx-auto overflow-hidden relative">
          <div className="absolute top-0 left-0 bottom-0 bg-accent-blue w-1/2 rounded-full animate-[pulse_1s_infinite]"></div>
        </div>
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

  const initials = chapter.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  const now = new Date();
  const upcomingEvents = chapterEvents.filter((e) => new Date(e.datetime) >= now);
  const pastEvents = chapterEvents.filter((e) => new Date(e.datetime) < now);
  const displayedEvents = activeTab === 'upcoming' ? upcomingEvents : pastEvents;

  return (
    <div className="max-w-4xl mx-auto py-10 space-y-12">
      {/* Back Link */}
      <Link
        to="/chapters"
        className="text-xs text-accent-blue hover:underline font-semibold"
      >
        Back to All Chapters
      </Link>

      {/* Header Info Card */}
      <div className="bg-surface border border-border rounded-2xl p-6 md:p-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          {/* Left: Avatar + Info */}
          <div className="flex items-center gap-4">
            <div
              className={`w-16 h-16 rounded-xl flex items-center justify-center text-white font-bold text-xl bg-gradient-to-br ${chapter.avatarGradient || 'from-slate-600 to-slate-900'} shrink-0`}
            >
              {initials}
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl font-extrabold text-navy leading-tight">
                {chapter.name}
              </h1>
              <div className="text-[11px] font-mono text-accent-blue">
                {chapter.ocid}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="inline-block px-2 py-0.5 rounded-[3px] text-[9px] font-semibold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
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
                className={`px-6 py-2.5 rounded text-xs font-semibold uppercase tracking-wider transition-all disabled:opacity-50 ${
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
                  <span
                    className={`text-[9px] uppercase font-bold tracking-wider ${
                      activeTab === 'upcoming'
                        ? 'text-accent-blue'
                        : 'text-text-secondary'
                    }`}
                  >
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
