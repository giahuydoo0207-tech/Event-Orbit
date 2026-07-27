import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchOrganizerEvents, fetchChapterById } from '../api/mockApi';
import { AttendeeImportModal } from '../components/AttendeeImportModal';
import { CategoryIcon } from '../components/CategoryIcon';

export function ChapterManage() {
  const { chapterId } = useParams();
  const [chapter, setChapter] = useState(null);
  const [allEvents, setAllEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'upcoming' | 'ongoing' | 'completed' | 'deleted'
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Aggregate Metrics
  const [metrics, setMetrics] = useState({
    totalEvents: 0,
    totalRegistered: 0,
    totalAttended: 0,
  });

  const loadData = async () => {
    setLoading(true);
    try {
      // Include deleted events so filter tabs can calculate complete stats (Bizcafe style)
      const [chapterData, eventData] = await Promise.all([
        fetchChapterById(chapterId),
        fetchOrganizerEvents(chapterId, true),
      ]);

      setChapter(chapterData);
      setAllEvents(eventData);

      // Active non-deleted events count for top metrics
      const activeEventsList = eventData.filter(e => !e.deletedAt);
      const totalEvents = activeEventsList.length;
      const totalRegistered = activeEventsList.reduce(
        (sum, e) => sum + (e.registeredCount || 0),
        0
      );
      const totalAttended = activeEventsList.reduce(
        (sum, e) => sum + (e.attendedCount || 0),
        0
      );

      setMetrics({ totalEvents, totalRegistered, totalAttended });
    } catch (err) {
      console.error('Failed to load chapter management data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [chapterId]);

  // Helper to categorize event status (Bizcafe 4-state classifier)
  const getEventStatus = (event) => {
    if (event.deletedAt) return 'deleted';
    if (!event.datetime) return 'completed';

    const eventDate = new Date(event.datetime);
    const today = new Date();

    const isToday =
      eventDate.getDate() === today.getDate() &&
      eventDate.getMonth() === today.getMonth() &&
      eventDate.getFullYear() === today.getFullYear();

    if (isToday) return 'ongoing';
    if (eventDate > today) return 'upcoming';
    return 'completed';
  };

  // Tab counters (Bizcafe live tab numbers)
  const tabCounts = {
    all: allEvents.length,
    upcoming: allEvents.filter(e => getEventStatus(e) === 'upcoming').length,
    ongoing: allEvents.filter(e => getEventStatus(e) === 'ongoing').length,
    completed: allEvents.filter(e => getEventStatus(e) === 'completed').length,
    deleted: allEvents.filter(e => getEventStatus(e) === 'deleted').length,
  };

  // Filtered event list based on selected tab
  const filteredEvents = allEvents.filter(event => {
    const status = getEventStatus(event);
    if (activeTab === 'all') return true;
    return status === activeTab;
  });

  // ── CSV Export ──
  const handleExportCSV = () => {
    const activeList = allEvents.filter(e => !e.deletedAt);
    if (activeList.length === 0) return;

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

    const rows = activeList.map((e) => [
      e.id,
      `"${e.name.replace(/"/g, '""')}"`,
      e.category,
      e.datetime,
      `"${e.location.replace(/"/g, '""')}"`,
      e.registeredCount,
      e.attendedCount,
      e.points,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

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

  if (loading) {
    return (
      <div className="py-24 text-center space-y-4 max-w-sm mx-auto">
        <div className="text-xs font-semibold text-slate-400 tracking-wide uppercase">Loading Chapter Console</div>
        <div className="w-16 h-0.5 bg-oc-periwinkle/30 rounded-full mx-auto overflow-hidden relative">
          <div className="absolute top-0 left-0 bottom-0 bg-oc-blue w-1/3 rounded-full animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (!chapter) {
    return (
      <div className="text-center py-24">
        <h2 className="text-lg font-bold text-oc-ink">Chapter Not Found</h2>
        <p className="text-sm text-slate-500 mt-2">
          The requested chapter does not exist or has been removed.
        </p>
        <Link
          to="/manage"
          className="text-sm text-oc-blue hover:underline font-bold inline-block mt-4"
        >
          &larr; Return to Manage Hub
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-12 font-sans max-w-4xl">
      {/* ── Navigation Breadcrumb ── */}
      <Link
        to="/manage"
        className="text-xs font-semibold text-slate-400 hover:text-oc-blue transition-colors uppercase tracking-widest"
      >
        &larr; Manage Hub
      </Link>

      {/* ── Chapter Identity + Hero Metric ── */}
      <div className="space-y-8">
        {/* Chapter Identity Row */}
        <div className="flex items-start gap-4">
          {/* Monochrome outline icon — lighter than gradient-filled squares */}
          <div className="w-12 h-12 rounded-xl border border-oc-periwinkle flex items-center justify-center shrink-0">
            <CategoryIcon category={chapter.category} className="w-6 h-6 text-oc-blue" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-black text-oc-ink leading-tight">{chapter.name}</h1>
              <span className="badge-kicker text-[9px] text-slate-400">
                {chapter.category}
              </span>
            </div>
            <div className="text-[11px] font-mono text-slate-400 mt-1 font-medium">
              {chapter.ocid}
            </div>
          </div>
        </div>

        {/* ── Hero Number — Luma-style: large bold pure text, no circle/badge wrapper ── */}
        <div className="pt-2">
          <div className="editorial-hero-number">
            {metrics.totalRegistered}
          </div>
          <p className="editorial-subtitle mt-2">
            total registrations across <span className="num font-bold">{metrics.totalEvents}</span> active event{metrics.totalEvents !== 1 ? 's' : ''} · <span className="num font-bold">{metrics.totalAttended}</span> attended
          </p>
        </div>
      </div>

      {/* ── Actions — text links for secondary, solid button for primary CTA ── */}
      <div className="hairline pb-6">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-6">
          <Link
            to={`/manage/${chapterId}/events/create`}
            className="px-5 py-2.5 bg-oc-blue text-white text-xs font-bold rounded-lg shadow-sm hover:bg-oc-indigo transition-colors"
          >
            Create New Event
          </Link>
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="text-xs font-bold text-oc-blue hover:underline transition-colors"
          >
            Import &amp; Issue Badges
          </button>
          <Link
            to={`/manage/${chapterId}/history`}
            className="text-xs font-bold text-slate-500 hover:text-oc-blue hover:underline transition-colors"
          >
            Event History
          </Link>
          <button
            onClick={handleExportCSV}
            className="text-xs font-bold text-slate-500 hover:text-oc-blue hover:underline transition-colors"
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* ── Events Console — sticky header + scrollable table ── */}
      <div>
        {/* Sticky header: title + tabs stay visible while table scrolls */}
        <div className="space-y-4 pb-4">
          <h2 className="text-sm font-black text-oc-ink uppercase tracking-wider">Events</h2>

          {/* Filter Tabs — kept for functional value */}
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: 'all', label: 'All', count: tabCounts.all },
              { id: 'upcoming', label: 'Upcoming', count: tabCounts.upcoming },
              { id: 'ongoing', label: 'Today', count: tabCounts.ongoing },
              { id: 'completed', label: 'Completed', count: tabCounts.completed },
              { id: 'deleted', label: 'Deleted', count: tabCounts.deleted },
            ].map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-oc-ink text-white'
                      : 'text-slate-500 hover:text-oc-ink hover:bg-slate-50'
                  }`}
                >
                  {tab.label}
                  <span className={`ml-1.5 font-mono text-[11px] ${isActive ? 'text-white/60' : 'text-slate-400'}`}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Scrollable table container — scroll events, not the whole page */}
        <div className="max-h-[560px] overflow-y-auto overflow-x-auto">
          {filteredEvents.length === 0 ? (
            <div className="text-center py-20">
              <h3 className="text-sm font-bold text-oc-ink">No events in this view</h3>
              <p className="text-xs text-slate-400 mt-1">
                Select another filter or create a new event.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-oc-mist z-10">
                <tr className="border-b border-oc-periwinkle/40">
                  <th className="pb-3 pt-1 pr-4 badge-kicker text-slate-400 text-[10px]">Event</th>
                  <th className="pb-3 pt-1 pr-4 badge-kicker text-slate-400 text-[10px]">Date</th>
                  <th className="pb-3 pt-1 pr-4 badge-kicker text-slate-400 text-[10px] text-center">Reg.</th>
                  <th className="pb-3 pt-1 pr-4 badge-kicker text-slate-400 text-[10px] text-center">Att.</th>
                  <th className="pb-3 pt-1 pr-4 badge-kicker text-slate-400 text-[10px]">Status</th>
                  <th className="pb-3 pt-1 badge-kicker text-slate-400 text-[10px] text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.map((event) => {
                  const status = getEventStatus(event);

                  return (
                    <tr key={event.id} className="border-b border-oc-periwinkle/20 hover:bg-oc-mist/30 transition-colors">
                      <td className="py-4 pr-4 max-w-xs sm:max-w-md">
                        <div className="font-bold text-oc-ink text-sm leading-tight">
                          {event.name}
                          <span className="ml-2 badge-kicker text-slate-400 text-[9px]">
                            +{event.points} pts
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                          {event.description || 'No description provided.'}
                        </div>
                      </td>

                      <td className="py-4 pr-4 text-slate-500 font-medium whitespace-nowrap">
                        {new Date(event.datetime).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </td>

                      <td className="py-4 pr-4 text-center font-bold text-oc-ink num">
                        {event.registeredCount || 0}
                      </td>

                      <td className="py-4 pr-4 text-center font-bold text-emerald-600 num">
                        {event.attendedCount || 0}
                      </td>

                      {/* Lighter status indicators — subtle tint, no border */}
                      <td className="py-4 pr-4 whitespace-nowrap">
                        {status === 'upcoming' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-600">
                            Upcoming
                          </span>
                        )}
                        {status === 'ongoing' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 animate-pulse">
                            Live
                          </span>
                        )}
                        {status === 'completed' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-50 text-slate-500">
                            Done
                          </span>
                        )}
                        {status === 'deleted' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-red-50 text-red-500">
                            Deleted
                          </span>
                        )}
                      </td>

                      <td className="py-4 text-right whitespace-nowrap">
                        {status !== 'deleted' ? (
                          <Link
                            to={`/manage/${chapterId}/events/${event.id}`}
                            className="text-xs font-bold text-oc-blue hover:underline"
                          >
                            Manage &rarr;
                          </Link>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">
                            Archived
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Attendee Import Modal */}
      <AttendeeImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        events={allEvents.filter(e => !e.deletedAt)}
        chapterId={chapterId}
        onImportSuccess={() => loadData()}
      />
    </div>
  );
}

export default ChapterManage;
