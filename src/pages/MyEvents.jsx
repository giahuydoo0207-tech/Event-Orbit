import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { fetchEvents, fetchRegistrationsByUser } from '../api/mockApi';
import { useStore } from '../store/useStore';

const TAB_OPTIONS = ['Upcoming', 'Past', 'All Events'];

function formatDate(datetime) {
  if (!datetime) return '';
  const d = new Date(datetime);
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function MyEvents() {
  const user = useStore((state) => state.user);
  const [events, setEvents] = useState([]);
  const [registeredEventIds, setRegisteredEventIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Upcoming');

  const isAuthenticated = user?.isAuthenticated;

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    async function load() {
      setLoading(true);
      try {
        const [allEvents, registrations] = await Promise.all([
          fetchEvents(),
          fetchRegistrationsByUser(user.id),
        ]);

        const regIds = registrations.map((r) => r.eventId);
        setEvents(allEvents);
        setRegisteredEventIds(regIds);
      } catch {
        // empty state will show
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [isAuthenticated, user?.id]);

  const myEvents = useMemo(() => {
    if (!registeredEventIds.length) return [];
    const idSet = new Set(registeredEventIds);
    return events.filter((e) => idSet.has(e.id));
  }, [events, registeredEventIds]);

  const filteredEvents = useMemo(() => {
    const now = new Date();
    if (activeTab === 'Upcoming') {
      return myEvents.filter((e) => new Date(e.datetime) >= now);
    }
    if (activeTab === 'Past') {
      return myEvents.filter((e) => new Date(e.datetime) < now);
    }
    return myEvents;
  }, [myEvents, activeTab]);

  // ── Not authenticated ─────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-xl px-6 py-20 text-center">
        <h1 className="text-2xl font-bold text-text-primary">
          Sign in to view your events
        </h1>
        <p className="mt-2 text-text-secondary">
          Connect your Open Campus ID to see your personal event calendar.
        </p>
        <Link
          to="/login"
          className="mt-8 inline-flex h-11 items-center rounded-lg bg-navy px-8 text-sm font-semibold text-white transition hover:bg-navy-light focus:outline-none focus:ring-2 focus:ring-navy/40"
        >
          Sign In
        </Link>
      </div>
    );
  }

  // ── Loading skeleton ──────────────────────────────────────────
  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-2 h-8 w-40 animate-pulse rounded bg-surface" />
        <div className="mb-8 h-5 w-64 animate-pulse rounded bg-surface" />
        <div className="mb-6 flex gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-9 w-24 animate-pulse rounded-full bg-surface"
            />
          ))}
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-56 animate-pulse rounded-xl bg-surface"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      {/* Header */}
      <h1 className="text-2xl font-bold text-text-primary sm:text-3xl">
        My Events
      </h1>
      <p className="mt-1 text-text-secondary">
        Your personal event calendar
      </p>

      {/* Tabs */}
      <div className="mt-8 flex flex-wrap gap-2">
        {TAB_OPTIONS.map((tab) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-accent-blue/40 ${
                isActive
                  ? 'border-accent-blue bg-accent-blue text-white'
                  : 'border-border bg-white text-text-secondary hover:border-accent-blue/40 hover:text-text-primary'
              }`}
            >
              {tab}
            </button>
          );
        })}

        {/* Event count */}
        <span className="ml-auto flex items-center text-sm text-text-secondary">
          {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Event Grid or Empty State */}
      {filteredEvents.length === 0 ? (
        <div className="mt-20 text-center">
          <p className="text-lg font-semibold text-text-primary">
            {activeTab === 'Past'
              ? 'No past events'
              : 'No upcoming events'}
          </p>
          <p className="mt-1 text-sm text-text-secondary">
            {activeTab === 'Past'
              ? "You haven't attended any events yet."
              : 'Explore the event feed to find something interesting.'}
          </p>
          <Link
            to="/events"
            className="mt-6 inline-flex h-10 items-center rounded-lg border border-accent-blue px-6 text-sm font-semibold text-accent-blue transition hover:bg-accent-blue hover:text-white focus:outline-none focus:ring-2 focus:ring-accent-blue/40"
          >
            Explore Events
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredEvents.map((event) => {
            const isPast = new Date(event.datetime) < new Date();
            return (
              <Link
                key={event.id}
                to={`/e/${event.slug}`}
                className={`group flex flex-col rounded-xl border bg-white shadow-sm transition hover:shadow-md hover:border-accent-blue/30 ${
                  isPast
                    ? 'border-border/60 opacity-75 hover:opacity-100'
                    : 'border-border'
                }`}
              >
                {/* Cover */}
                <div className="relative h-36 w-full overflow-hidden bg-surface">
                  {event.coverImage ? (
                    <img
                      src={event.coverImage}
                      alt={event.name}
                      className="h-full w-full object-cover transition group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-gradient-to-br from-navy to-indigo-900">
                      <span className="text-xs font-semibold uppercase tracking-widest text-white/40">
                        {event.category || 'Event'}
                      </span>
                    </div>
                  )}

                  {isPast && (
                    <span className="absolute right-3 top-3 rounded-full bg-navy/80 px-2.5 py-0.5 text-xs font-semibold text-white backdrop-blur">
                      Past
                    </span>
                  )}
                </div>

                {/* Body */}
                <div className="flex flex-1 flex-col p-5">
                  <h3 className="text-base font-bold text-text-primary line-clamp-2 group-hover:text-accent-blue transition">
                    {event.name}
                  </h3>

                  <p className="mt-1.5 text-xs text-text-secondary">
                    {formatDate(event.datetime)}
                  </p>

                  <div className="mt-auto flex items-center justify-between pt-4">
                    {event.category && (
                      <span className="text-xs font-medium text-text-secondary">
                        {event.category}
                      </span>
                    )}
                    {event.points != null && (
                      <span className="shrink-0 rounded-full bg-surface px-2.5 py-1 text-xs font-bold text-navy">
                        {event.points} SBT
                      </span>
                    )}
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

export default MyEvents;
