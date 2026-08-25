import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchEvents, fetchChapters, isEventInChapter } from '../api/mockApi';
import { useStore } from '../store/useStore';
import { LoadingBar } from '../components/LoadingBar';
import { getFeedViewState } from '../lib/feedViewState';

export function Homepage() {
  const user = useStore((state) => state.user);
  const [feedEvents, setFeedEvents] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [feedStatus, setFeedStatus] = useState('loading');
  const [loadedFeedKey, setLoadedFeedKey] = useState(null);
  const [feedError, setFeedError] = useState('');
  const followedChapterKey = JSON.stringify(user.followedChapterIds || []);

  useEffect(() => {
    let isCurrentRequest = true;
    const followedIds = user.followedChapterIds || [];

    async function loadFeed() {
      setFeedStatus('loading');
      setFeedError('');
      try {
        const [allEvents, allChapters] = await Promise.all([
          fetchEvents(),
          fetchChapters()
        ]);

        if (!isCurrentRequest) return;
        setChapters(allChapters);

        // Show events from followed chapters only
        if (followedIds.length > 0) {
          const filtered = allEvents.filter(e => {
            return followedIds.some(chId => {
              const ch = allChapters.find(c => c.id === chId || c.slug === chId);
              if (ch) return isEventInChapter(e, ch);
              return e.chapterId === chId || e.chapter?.slug === chId;
            });
          });
          // Sort by date, upcoming first
          filtered.sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
          setFeedEvents(filtered);
        } else {
          setFeedEvents([]);
        }
        setLoadedFeedKey(followedChapterKey);
        setFeedStatus('ready');
      } catch (err) {
        if (!isCurrentRequest) return;
        console.error('Failed to load feed', err);
        setFeedError('Unable to load your feed right now. Please try again in a moment.');
        setLoadedFeedKey(followedChapterKey);
        setFeedStatus('error');
      }
    }
    loadFeed();

    return () => {
      isCurrentRequest = false;
    };
  }, [followedChapterKey]);

  const feedViewState = getFeedViewState({
    requestedKey: followedChapterKey,
    loadedKey: loadedFeedKey,
    status: feedStatus,
    eventCount: feedEvents.length
  });

  const getChapterName = (event) => {
    if (event.chapter?.name) return event.chapter.name;
    const ch = chapters.find(c => isEventInChapter(event, c));
    return ch ? ch.name : 'Campus Chapter';
  };

  if (feedViewState === 'loading') {
    return (
      <div className="py-24 text-center space-y-4 max-w-lg mx-auto font-sans">
        <div className="badge-kicker text-[10px] text-slate-400">Loading your personalized feed...</div>
        <LoadingBar className="max-w-[140px] mx-auto" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome header */}
      <section className="student-welcome relative overflow-hidden rounded-xl bg-oc-navy px-6 py-8 text-white shadow-oc-lg sm:px-8 sm:py-10" aria-labelledby="student-home-title">
        <div className="relative max-w-2xl space-y-3">
          <p className="text-xs font-bold text-oc-turquoise">Your campus, in orbit</p>
          <h1 id="student-home-title" className="text-2xl font-black leading-tight tracking-tight text-white sm:text-4xl">
          Welcome back, {user.fullName || 'Student'}
          </h1>
          <p className="max-w-xl text-sm font-medium leading-6 text-oc-periwinkle">Catch the next activity from the chapters you follow and keep building your campus record.</p>
        </div>
        <div className="student-orbit-motif" aria-hidden="true"><span /><span /><span /></div>
      </section>

      {/* Feed Content */}
      {feedViewState === 'error' ? (
        <div className="empty-state space-y-2" role="alert">
          <h2 className="text-lg font-bold text-navy">Unable to load your feed</h2>
          <p className="text-xs text-text-secondary max-w-xs mx-auto">{feedError}</p>
        </div>
      ) : feedViewState === 'empty' ? (
        <div className="empty-state space-y-6">
          <div className="space-y-2">
            <h2 className="text-lg font-bold text-navy">Your feed is empty</h2>
            <p className="text-xs text-text-secondary max-w-xs mx-auto">
              Follow campus chapters to see their events in your personalized feed.
            </p>
          </div>
          <div className="flex justify-center gap-3">
            <Link
              to="/chapters"
              className="action-primary"
            >
              Browse Chapters
            </Link>
            <Link
              to="/events"
              className="action-secondary"
            >
              Explore Events
            </Link>
          </div>
        </div>
      ) : (
        <section aria-labelledby="followed-events-title">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div><h2 id="followed-events-title" className="text-xl font-black text-oc-ink">From chapters you follow</h2><p className="mt-1 text-sm text-slate-600">Fresh opportunities selected by your campus communities.</p></div>
            <Link to="/following" className="hidden text-xs font-bold text-oc-blue hover:text-oc-indigo focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-oc-blue sm:inline-flex">Manage following</Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {feedEvents.map((event) => {
            const dateStr = new Date(event.datetime).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });
            
            return (
              <Link
                key={event.id}
                to={`/e/${event.slug}`}
                className="student-event-card group surface-card overflow-hidden flex flex-col justify-between focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-oc-blue focus-visible:ring-offset-2"
              >
                <div>
                  {/* Cover Photo */}
                  <div className="aspect-[16/9] w-full bg-surface overflow-hidden relative border-b border-border">
                    <img
                      src={event.coverImage}
                      alt={event.name}
                      className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  </div>
                  {/* Metadata & Title */}
                  <div className="p-5 space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="uppercase tracking-widest font-bold text-accent-blue">
                        {event.category}
                      </span>
                      <span className="text-text-secondary">{event.locationType}</span>
                    </div>
                    <h2 className="text-base font-bold text-navy leading-snug group-hover:text-accent-blue transition-colors">
                      {event.name}
                    </h2>
                    <p className="text-[11px] text-text-secondary font-medium">
                      by {getChapterName(event)}
                    </p>
                  </div>
                </div>
                
                {/* Footer Stats info */}
                <div className="mx-5 flex items-center justify-between border-t border-oc-periwinkle/40 py-4 text-xs text-text-secondary">
                  <span>{dateStr}</span>
                  <span className="font-semibold text-navy">
                    +{event.points} points
                  </span>
                </div>
              </Link>
            );
          })}
          </div>
        </section>
      )}
    </div>
  );
}
export default Homepage;
