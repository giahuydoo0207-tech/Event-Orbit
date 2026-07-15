import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchEvents, fetchChapters } from '../api/mockApi';
import { useStore } from '../store/useStore';

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
          const filtered = allEvents.filter(e => followedIds.includes(e.chapterId));
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
  }, [user.followedChapterIds]);

  const getChapterName = (chapterId) => {
    const ch = chapters.find(c => c.id === chapterId);
    return ch ? ch.name : 'Unknown Chapter';
  };

  if (loading) {
    return (
      <div className="py-24 text-center space-y-4 max-w-lg mx-auto">
        <div className="text-sm font-medium text-text-secondary">Loading your personalized feed...</div>
        <div className="w-10 h-1 bg-border rounded-full mx-auto overflow-hidden relative">
          <div className="absolute top-0 left-0 bottom-0 bg-accent-blue w-1/2 rounded-full animate-[pulse_1s_infinite]"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome header */}
      <div className="space-y-2 border-b border-border pb-6">
        <h1 className="text-2xl font-extrabold text-navy tracking-tight">
          Welcome back, {user.fullName || 'Student'}
        </h1>
        <p className="text-sm text-text-secondary">
          Events from chapters you follow. Follow more chapters to see more events here.
        </p>
      </div>

      {/* Feed Content */}
      {feedEvents.length === 0 ? (
        <div className="text-center py-20 bg-surface border border-dashed border-border rounded-2xl p-8 space-y-6">
          <div className="space-y-2">
            <h2 className="text-lg font-bold text-navy">Your feed is empty</h2>
            <p className="text-xs text-text-secondary max-w-xs mx-auto">
              Follow campus chapters to see their events in your personalized feed.
            </p>
          </div>
          <div className="flex justify-center gap-3">
            <Link
              to="/chapters"
              className="inline-block py-2.5 px-6 bg-navy text-white text-xs font-semibold rounded hover:bg-navy-light uppercase tracking-wider transition-all"
            >
              Browse Chapters
            </Link>
            <Link
              to="/events"
              className="inline-block py-2.5 px-6 bg-white border border-border text-navy text-xs font-semibold rounded hover:bg-slate-50 uppercase tracking-wider transition-all"
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
                className="group bg-white border border-border rounded-xl overflow-hidden hover:shadow-lg transition-all flex flex-col justify-between"
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
                      by {getChapterName(event.chapterId)}
                    </p>
                  </div>
                </div>
                
                {/* Footer Stats info */}
                <div className="px-6 pb-6 pt-4 border-t border-border flex justify-between items-center text-xs text-text-secondary">
                  <span>{dateStr}</span>
                  <span className="font-semibold text-navy">
                    SBT: +{event.points} pts
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
