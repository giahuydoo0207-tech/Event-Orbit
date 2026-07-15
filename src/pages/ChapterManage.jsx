import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchOrganizerEvents, fetchChapterById } from '../api/mockApi';

// NOTE: Management routes use chapterId (e.g. /manage/org-001) while public routes
// use slug (e.g. /chapters/fit). This is intentional — management URLs are only
// accessed by organizers clicking from ManageHub, not typed manually. Public URLs
// use human-readable slugs for shareability.

export function ChapterManage() {
  const { chapterId } = useParams();
  const [chapter, setChapter] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Aggregate Metrics
  const [metrics, setMetrics] = useState({
    totalEvents: 0,
    totalRegistered: 0,
    totalAttended: 0,
  });

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [chapterData, eventData] = await Promise.all([
          fetchChapterById(chapterId),
          fetchOrganizerEvents(chapterId),
        ]);

        setChapter(chapterData);
        setEvents(eventData);

        const totalEvents = eventData.length;
        const totalRegistered = eventData.reduce(
          (sum, e) => sum + (e.registeredCount || 0),
          0
        );
        const totalAttended = eventData.reduce(
          (sum, e) => sum + (e.attendedCount || 0),
          0
        );

        setMetrics({ totalEvents, totalRegistered, totalAttended });
      } catch (err) {
        console.error('Failed to load chapter management data', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [chapterId]);

  // ── CSV Export ──
  const handleExportCSV = () => {
    if (events.length === 0) return;

    const headers = [
      'Event ID',
      'Event Name',
      'Category',
      'Date Time',
      'Location',
      'Registered',
      'Checked In',
      'Points',
    ];

    const rows = events.map((e) => [
      e.id,
      `"${e.name.replace(/"/g, '""')}"`,
      e.category,
      e.datetime,
      `"${e.location.replace(/"/g, '""')}"`,
      e.registeredCount,
      e.attendedCount,
      e.points,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join(
      '\n'
    );

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `${chapter?.name?.replace(/\s+/g, '_') || 'chapter'}_events_${new Date().toISOString().slice(0, 10)}.csv`
    );
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ── Loading State ──
  if (loading) {
    return (
      <div className="py-20 text-center space-y-4 max-w-sm mx-auto">
        <div className="text-sm font-medium text-text-secondary">
          Loading chapter management console...
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
      <div className="py-24 text-center max-w-lg mx-auto space-y-4">
        <h2 className="text-lg font-bold text-navy">Chapter Not Found</h2>
        <p className="text-xs text-text-secondary">
          The chapter you are looking for does not exist or has been removed.
        </p>
        <Link
          to="/manage"
          className="text-xs text-accent-blue hover:underline font-semibold inline-block mt-2"
        >
          Back to Manage Hub
        </Link>
      </div>
    );
  }

  const initials = chapter.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <div className="space-y-10">
      {/* Back Link + Header */}
      <div>
        <Link
          to="/manage"
          className="text-xs text-accent-blue hover:underline font-semibold"
        >
          Back to Manage Hub
        </Link>

        <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-4">
          <div
            className={`w-14 h-14 rounded-xl flex items-center justify-center text-white font-bold text-lg bg-gradient-to-br ${chapter.avatarGradient || 'from-slate-600 to-slate-900'} shrink-0`}
          >
            {initials}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-navy">{chapter.name}</h1>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-[11px] font-mono text-accent-blue">
                {chapter.ocid}
              </span>
              <span className="inline-block px-2 py-0.5 rounded-[3px] text-[9px] font-semibold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                {chapter.category}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-surface border border-border rounded-xl p-5 hover:shadow-sm transition-all">
          <div className="text-[10px] text-text-secondary uppercase font-bold tracking-widest mb-2">
            Total Events
          </div>
          <div className="text-3xl font-extrabold text-navy">
            {metrics.totalEvents}
          </div>
        </div>

        <div className="bg-surface border border-border rounded-xl p-5 hover:shadow-sm transition-all">
          <div className="text-[10px] text-text-secondary uppercase font-bold tracking-widest mb-2">
            Total Registrations
          </div>
          <div className="text-3xl font-extrabold text-navy">
            {metrics.totalRegistered}
          </div>
        </div>

        <div className="bg-surface border border-border rounded-xl p-5 hover:shadow-sm transition-all">
          <div className="text-[10px] text-text-secondary uppercase font-bold tracking-widest mb-2">
            Total Checked-in
          </div>
          <div className="text-3xl font-extrabold text-navy">
            {metrics.totalAttended}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={handleExportCSV}
          className="px-4 py-2 border border-border bg-white text-navy hover:bg-slate-50 text-xs font-semibold rounded"
        >
          Export CSV Report
        </button>
        <Link
          to={`/manage/${chapterId}/events/create`}
          className="px-4 py-2 bg-navy text-white hover:bg-navy-light text-xs font-semibold rounded text-center"
        >
          Create New Event
        </Link>
      </div>

      {/* Events Table */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-navy">Chapter Events</h2>

        {events.length === 0 ? (
          <div className="text-center py-16 bg-surface border border-dashed border-border rounded-xl">
            <h3 className="text-sm font-semibold text-navy">No events yet</h3>
            <p className="text-xs text-text-secondary mt-1">
              Create your first event for this chapter to get started.
            </p>
          </div>
        ) : (
          <div className="bg-white border border-border rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-border uppercase tracking-widest text-[9px] font-bold text-text-secondary">
                    <th className="p-4">Event Name</th>
                    <th className="p-4">Date</th>
                    <th className="p-4 text-center">Registered</th>
                    <th className="p-4 text-center">Attended</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {events.map((e) => {
                    const dateStr = new Date(e.datetime).toLocaleDateString(
                      'en-US',
                      {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      }
                    );

                    const isUpcoming = new Date(e.datetime) >= new Date();

                    return (
                      <tr key={e.id} className="hover:bg-slate-50/50">
                        <td className="p-4">
                          <div className="font-semibold text-navy text-sm">
                            {e.name}
                          </div>
                          <span className="text-[10px] text-text-secondary uppercase font-bold tracking-wider">
                            {e.category} — +{e.points} pts
                          </span>
                        </td>
                        <td className="p-4 text-text-secondary">{dateStr}</td>
                        <td className="p-4 text-center font-semibold">
                          {e.registeredCount}
                        </td>
                        <td className="p-4 text-center font-bold text-success">
                          {e.attendedCount}
                        </td>
                        <td className="p-4">
                          <span
                            className={`px-2 py-0.5 rounded-[3px] text-[10px] font-semibold uppercase tracking-wider ${
                              isUpcoming
                                ? 'bg-blue-50 text-blue-600 border border-blue-100'
                                : 'bg-slate-100 text-slate-500 border border-slate-200'
                            }`}
                          >
                            {isUpcoming ? 'Upcoming' : 'Completed'}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <Link
                            to={`/manage/${chapterId}/events/${e.id}`}
                            className="text-xs font-semibold text-accent-blue hover:underline"
                          >
                            Manage
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ChapterManage;
