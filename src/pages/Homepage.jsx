import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchEvents, fetchChapters, isEventInChapter } from '../api/mockApi';
import { useStore } from '../store/useStore';
import { LoadingBar } from '../components/LoadingBar';

export function Homepage() {
  const user = useStore((state) => state.user);
  const [loading, setLoading] = useState(true);
  const [feedEvents, setFeedEvents] = useState([]);
  const [chapters, setChapters] = useState([]);

  useEffect(() => {
    async function loadFeed() {
      setLoading(true);
      try {
        const [allEvents, allChapters] = await Promise.all([
          fetchEvents(),
          fetchChapters()
        ]);

        setChapters(allChapters);

        // Show events from followed chapters only
        const followedIds = user.followedChapterIds || [];
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
      } catch (err) {
        console.error('Failed to load feed', err);
      } finally {
        setLoading(false);
      }
    }
    loadFeed();
    }, [JSON.stringify(user.followedChapterIds)]);

  const getChapterName = (event) => {
    if (event.chapter?.name) return event.chapter.name;
    const ch = chapters.find(c => isEventInChapter(event, c));
    return ch ? ch.name : 'Campus Chapter';
  };

  if (loading) {
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
      <div className="space-y-2 border-b border-border pb-6">
        <h1 className="page-title">
          Welcome back, {user.fullName || 'Student'}
        </h1>
        <p className="text-sm text-text-secondary">
          Events from chapters you follow. Follow more chapters to see more events here.
        </p>
      </div>

      {/* Feed Content */}
      {feedEvents.length === 0 ? (
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
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
                className="group surface-card overflow-hidden transition-colors hover:border-oc-blue/35 flex flex-col justify-between"
              >
                <div>
                  {/* Cover Photo */}
                  <div className="aspect-[2/1] w-full bg-surface overflow-hidden relative border-b border-border">
                    <img
                      src={event.coverImage}
                      alt={event.name}
                      className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  </div>
                  {/* Metadata & Title */}
                  <div className="p-6 space-y-3">
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
                <div className="px-6 pb-6 pt-4 border-t border-border flex justify-between items-center text-xs text-text-secondary">
                  <span>{dateStr}</span>
                  <span className="font-semibold text-navy">
                    +{event.points} points
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
export default Homepage;
