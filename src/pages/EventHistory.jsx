import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { fetchOrganizerEvents, fetchChapterById, fetchEventAttendees } from '../api/mockApi';
import useToastStore from '../store/useToastStore';

export function EventHistory() {
  const { chapterId, eventId: paramEventId } = useParams();
  const navigate = useNavigate();
  const showToast = useToastStore((state) => state.showToast);

  const [chapter, setChapter] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Selected event for Attendee Detail View
  const [selectedEventId, setSelectedEventId] = useState(paramEventId || null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [attendees, setAttendees] = useState([]);
  const [loadingAttendees, setLoadingAttendees] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [chapterData, eventData] = await Promise.all([
          fetchChapterById(chapterId),
          // Fetch events including soft-deleted events for historical records
          fetchOrganizerEvents(chapterId, true),
        ]);

        setChapter(chapterData);
        setEvents(eventData);

        if (paramEventId) {
          const matchEv = eventData.find(e => e.id === paramEventId || e.slug === paramEventId);
          if (matchEv) {
            setSelectedEventId(matchEv.id);
            setSelectedEvent(matchEv);
          }
        }
      } catch (err) {
        console.error('Failed to load event history data', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [chapterId, paramEventId]);

  // Load Attendees when an event is selected
  useEffect(() => {
    async function loadAttendees() {
      if (!selectedEventId) {
        setAttendees([]);
        setSelectedEvent(null);
        return;
      }

      setLoadingAttendees(true);
      try {
        const matchEv = events.find(e => e.id === selectedEventId || e.slug === selectedEventId);
        setSelectedEvent(matchEv || null);

        const attList = await fetchEventAttendees(selectedEventId);
        setAttendees(attList || []);
      } catch (err) {
        console.error('Failed to load event attendees', err);
        showToast('Failed to load attendee records.', 'error');
      } finally {
        setLoadingAttendees(false);
      }
    }

    if (events.length > 0 && selectedEventId) {
      loadAttendees();
    }
  }, [selectedEventId, events]);

  const handleSelectEvent = (evId) => {
    setSelectedEventId(evId);
    navigate(`/manage/${chapterId}/history/${evId}`, { replace: true });
  };

  const handleClearSelectedEvent = () => {
    setSelectedEventId(null);
    setSelectedEvent(null);
    setSearchTerm('');
    navigate(`/manage/${chapterId}/history`, { replace: true });
  };

  // CSV Export for Attendee List
  const handleExportAttendeeCSV = () => {
    if (attendees.length === 0 || !selectedEvent) return;

    const headers = [
      'MSSV',
      'OCID',
      'Student Name',
      'Check-in Status',
      'Check-in Time',
      'Badge Status',
      'Transaction Hash',
      'Registration Source',
      'Wallet Address'
    ];

    const rows = attendees.map(a => [
      `"${a.mssv || 'N/A'}"`,
      `"${a.ocid || 'N/A'}"`,
      `"${(a.studentName || 'Attendee').replace(/"/g, '""')}"`,
      a.checkedIn ? 'Checked-in' : 'Registered Only',
      a.checkedInAt ? `"${new Date(a.checkedInAt).toLocaleString()}"` : 'N/A',
      a.mintStatus || 'not_issued',
      `"${a.txHash || ''}"`,
      a.source || 'qr_checkin',
      `"${a.ethAddress || ''}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `${selectedEvent.name.replace(/\s+/g, '_')}_attendees_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Attendee CSV exported successfully!', 'success');
  };

  // Filtered Attendees by search term
  const filteredAttendees = attendees.filter(a => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const nameMatch = (a.studentName || '').toLowerCase().includes(term);
    const mssvMatch = (a.mssv || '').toLowerCase().includes(term);
    const ocidMatch = (a.ocid || '').toLowerCase().includes(term);
    return nameMatch || mssvMatch || ocidMatch;
  });

  if (loading) {
    return (
      <div className="py-20 text-center space-y-4 max-w-sm mx-auto">
        <div className="text-sm font-medium text-text-secondary">Loading Chapter Event History...</div>
        <div className="w-10 h-1 bg-border rounded-full mx-auto overflow-hidden relative">
          <div className="absolute top-0 left-0 bottom-0 bg-accent-blue w-1/2 rounded-full animate-[pulse_1s_infinite]"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header breadcrumbs */}
      <div>
        <Link to={`/manage/${chapterId}`} className="text-xs font-bold text-accent-blue hover:underline uppercase tracking-wider">
          &larr; Back to Chapter Management Console
        </Link>

        <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
          <div>
            <h1 className="text-2xl font-bold text-navy flex items-center gap-2">
              Event History &amp; Attendee Logs
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                {chapter?.name || 'Chapter'}
              </span>
            </h1>
            <p className="text-xs text-text-secondary mt-1">
              Historical archive of completed &amp; soft-deleted events along with student attendance and Soulbound Token logs.
            </p>
          </div>
        </div>
      </div>

      {/* VIEW MODE 2: Attendee List Detail View for Selected Event */}
      {selectedEventId && selectedEvent ? (
        <div className="space-y-6 animate-[fadeIn_0.2s_ease-out]">
          {/* Back button */}
          <button
            onClick={handleClearSelectedEvent}
            className="text-xs font-bold text-navy hover:text-accent-blue flex items-center gap-1"
          >
            &larr; Return to Event History List
          </button>

          {/* Selected Event Summary Card */}
          <div className="bg-surface border border-border rounded-xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-navy">{selectedEvent.name}</h2>
                {selectedEvent.deletedAt ? (
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-red-100 text-red-700 border border-red-200">
                    Soft Deleted
                  </span>
                ) : (
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Completed / Active
                  </span>
                )}
              </div>
              <p className="text-xs text-text-secondary mt-1">
                Date: {new Date(selectedEvent.datetime).toLocaleString()} &bull; Location: {selectedEvent.location} &bull; Reward: +{selectedEvent.points} pts
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleExportAttendeeCSV}
                disabled={attendees.length === 0}
                className="px-4 py-2 border border-border bg-white text-navy hover:bg-slate-50 text-xs font-semibold rounded-lg shadow-sm disabled:opacity-50 flex items-center gap-1.5"
              >
                Export CSV Report
              </button>
            </div>
          </div>

          {/* Search & Stats Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search attendees by Name, MSSV, or OCID..."
                className="w-full border border-border rounded-lg pl-9 pr-4 py-2 text-xs text-navy focus:outline-none focus:border-accent-blue bg-white"
              />
              <span className="absolute left-3 top-2.5 text-xs text-text-secondary pointer-events-none">&search;</span>
            </div>

            <div className="flex gap-4 text-xs font-semibold">
              <span className="text-navy">Total Registered: <b>{attendees.length}</b></span>
              <span className="text-success">Checked-in / Badged: <b>{attendees.filter(a => a.checkedIn).length}</b></span>
            </div>
          </div>

          {/* Attendees Table */}
          {loadingAttendees ? (
            <div className="py-12 text-center text-xs text-text-secondary">Loading attendee logs...</div>
          ) : filteredAttendees.length === 0 ? (
            <div className="py-16 text-center bg-surface border border-dashed border-border rounded-xl">
              <div className="text-sm font-semibold text-navy">No attendee records found</div>
              <p className="text-xs text-text-secondary mt-1">
                {searchTerm ? 'No attendees match your search query.' : 'No student registrations recorded for this event.'}
              </p>
            </div>
          ) : (
            <div className="bg-white border border-border rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-border uppercase tracking-widest text-[9px] font-bold text-text-secondary">
                      <th className="p-4">Student Info</th>
                      <th className="p-4">MSSV / OCID</th>
                      <th className="p-4 text-center">Check-in Status</th>
                      <th className="p-4 text-center">Badge Status</th>
                      <th className="p-4 text-center">Source</th>
                      <th className="p-4 text-right">Transaction Hash</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredAttendees.map((att) => (
                      <tr key={att.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="p-4">
                          <div className="font-semibold text-navy text-sm">{att.studentName || 'Attendee'}</div>
                          <span className="text-[10px] text-text-secondary font-mono">
                            Registered: {new Date(att.registeredAt).toLocaleDateString()}
                          </span>
                        </td>

                        <td className="p-4 font-mono">
                          <div className="font-bold text-navy">{att.mssv || 'N/A'}</div>
                          {att.ocid && <div className="text-[10px] text-accent-blue">{att.ocid}</div>}
                        </td>

                        <td className="p-4 text-center">
                          {att.checkedIn ? (
                            <span className="inline-block px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                              Checked-in
                            </span>
                          ) : (
                            <span className="inline-block px-2.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-slate-100 text-slate-500 border border-slate-200">
                              Registered Only
                            </span>
                          )}
                        </td>

                        <td className="p-4 text-center">
                          {att.mintStatus === 'success' || att.mintStatus === 'minted_onchain' ? (
                            <span className="inline-block px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-200">
                              SBT Minted
                            </span>
                          ) : att.mintStatus === 'skipped_no_wallet' ? (
                            <span className="inline-block px-2.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
                              Off-chain (No Wallet)
                            </span>
                          ) : att.mintStatus === 'pending' || att.mintStatus === 'minting' ? (
                            <span className="inline-block px-2.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-sky-100 text-sky-800 border border-sky-200">
                              Minting...
                            </span>
                          ) : (
                            <span className="inline-block px-2.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-slate-100 text-slate-400 border border-slate-200">
                              Not Issued
                            </span>
                          )}
                        </td>

                        <td className="p-4 text-center">
                          {att.source === 'import_excel' ? (
                            <span className="inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-purple-100 text-purple-800 border border-purple-200">
                              Excel Import
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-800 border border-indigo-200">
                              QR Check-in
                            </span>
                          )}
                        </td>

                        <td className="p-4 text-right font-mono text-[10px]">
                          {att.txHash ? (
                            <a
                              href={`https://educhain-testnet.blockscout.com/tx/${att.txHash}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-accent-blue hover:underline font-semibold"
                            >
                              {att.txHash.slice(0, 6)}...{att.txHash.slice(-4)}
                            </a>
                          ) : (
                            <span className="text-slate-400">&mdash;</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* VIEW MODE 1: Chapter Event History List */
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-navy">All Historical &amp; Soft Deleted Events</h2>
            <span className="text-xs text-text-secondary">
              Total Recorded Events: <b>{events.length}</b>
            </span>
          </div>

          {events.length === 0 ? (
            <div className="text-center py-16 bg-surface border border-dashed border-border rounded-xl">
              <h3 className="text-sm font-semibold text-navy">No historical events recorded</h3>
              <p className="text-xs text-text-secondary mt-1">
                Events hosted or soft-deleted in this chapter will appear here.
              </p>
            </div>
          ) : (
            <div className="bg-white border border-border rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-border uppercase tracking-widest text-[9px] font-bold text-text-secondary">
                      <th className="p-4">Event Name &amp; Details</th>
                      <th className="p-4">Date &amp; Time</th>
                      <th className="p-4 text-center">Registrations</th>
                      <th className="p-4 text-center">Checked-in Badges</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {events.map((ev) => {
                      const isDeleted = !!ev.deletedAt;
                      return (
                        <tr key={ev.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="p-4">
                            <div className="font-semibold text-navy text-sm flex items-center gap-2">
                              {ev.name}
                              {isDeleted && (
                                <span className="px-1.5 py-0.5 text-[9px] font-extrabold uppercase rounded bg-red-100 text-red-700 border border-red-200">
                                  Soft Deleted
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-text-secondary uppercase font-bold tracking-wider">
                              {ev.category} &bull; +{ev.points} pts
                            </span>
                          </td>

                          <td className="p-4 text-text-secondary">
                            {new Date(ev.datetime).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </td>

                          <td className="p-4 text-center font-semibold text-navy">
                            {ev.registeredCount || ev.registered || 0}
                          </td>

                          <td className="p-4 text-center font-bold text-success">
                            {ev.attendedCount || 0}
                          </td>

                          <td className="p-4">
                            {isDeleted ? (
                              <span className="px-2 py-0.5 rounded-[3px] text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 border border-slate-200">
                                Archived / Soft Deleted
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-[3px] text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Active / Completed
                              </span>
                            )}
                          </td>

                          <td className="p-4 text-right">
                            <button
                              onClick={() => handleSelectEvent(ev.id)}
                              className="text-xs font-semibold text-accent-blue hover:underline bg-accent-blue/5 border border-accent-blue/15 px-3 py-1 rounded hover:bg-accent-blue/10"
                            >
                              View Attendee Logs &rarr;
                            </button>
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
      )}
    </div>
  );
}

export default EventHistory;
