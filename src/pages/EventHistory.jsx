import React, { useEffect, useState } from 'react';
import { useParams, Link, Navigate, useNavigate } from 'react-router-dom';
import { fetchOrganizerEvents, fetchChapterById, fetchEventAttendees } from '../api/mockApi';
import useToastStore from '../store/useToastStore';
import { LoadingBar } from '../components/LoadingBar';
import { StatusBadge } from '../components/StatusBadge';
import { useOrganizerSession } from '../contexts/OrganizerSessionContext';
import { getOrganizerChapterRedirect } from '../lib/organizerNavigation';
import { hasRealTransaction } from '../lib/credentialPresentation';

export function EventHistory() {
  const { chapterId, eventId: paramEventId } = useParams();
  const navigate = useNavigate();
  const organizerSession = useOrganizerSession();
  const ownedChapterId = organizerSession?.chapterId || organizerSession?.chapter_id;
  const isOwnedChapter = chapterId === ownedChapterId;
  const managePath = `/manage/${encodeURIComponent(chapterId || '')}`;
  const redirectPath = getOrganizerChapterRedirect(chapterId, organizerSession);
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
      if (redirectPath) return;
      setLoading(true);
      try {
        const [chapterData, eventData] = await Promise.all([
          fetchChapterById(chapterId),
          // Fetch events including soft-deleted events for historical records
          fetchOrganizerEvents(chapterId, true, { includeAttendees: isOwnedChapter }),
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
  }, [chapterId, isOwnedChapter, paramEventId, redirectPath]);

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
    navigate(`${managePath}/history/${evId}`, { replace: true });
  };

  const handleClearSelectedEvent = () => {
    setSelectedEventId(null);
    setSelectedEvent(null);
    setSearchTerm('');
    navigate(`${managePath}/history`, { replace: true });
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
      'Credential Status',
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
      `"${a.source || 'qr'}"`,
      `"${a.walletAddress || 'N/A'}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `attendees_${selectedEvent.id}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredAttendees = attendees.filter(a => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (a.studentName && a.studentName.toLowerCase().includes(term)) ||
      (a.mssv && a.mssv.toLowerCase().includes(term)) ||
      (a.ocid && a.ocid.toLowerCase().includes(term))
    );
  });

  const getStatusDisplay = (ev) => {
    if (ev.deletedAt) {
      return { status: 'soft_deleted', label: 'SOFT DELETED' };
    }
    const eventDate = new Date(ev.datetime);
    const isPast = eventDate < new Date();
    if (isPast) {
      return { status: 'completed', label: 'COMPLETED' };
    }
    return { status: 'published', label: 'PUBLISHED' };
  };

  if (redirectPath) {
    return <Navigate to={redirectPath} replace />;
  }

  if (loadingEvents) {
    return (
      <div className="py-24 text-center space-y-4 max-w-sm mx-auto font-sans">
        <div className="badge-kicker text-[10px] text-slate-400">Loading Chapter Event History...</div>
        <LoadingBar className="max-w-[140px] mx-auto" />
      </div>
    );
  }

  return (
    <div className="space-y-8 font-sans">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-2xl font-black text-navy leading-tight">
            {chapter ? `${chapter.name} History` : 'Event History & Archive'}
          </h1>
          <p className="text-xs text-text-secondary mt-1">
            Historical archive of completed &amp; soft-deleted events along with student attendance and credential issuance logs.
          </p>
        </div>

        {selectedEvent && (
          <button
            onClick={() => setSelectedEvent(null)}
            className="px-4 py-2 border border-border rounded text-xs font-semibold text-text-secondary hover:text-navy hover:bg-slate-50 transition-colors self-start sm:self-auto"
          >
            &larr; Back to Events Archive
          </button>
        )}
      </div>

      {selectedEvent ? (
        <div className="space-y-6">
          <div className="bg-surface border border-border rounded-xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-1">
              <div className="text-[10px] text-accent-blue font-bold uppercase tracking-wider">
                Event Attendee Registry
              </div>
              <h2 className="text-xl font-black text-navy">{selectedEvent.name}</h2>
              <div className="text-xs text-text-secondary">
                {new Date(selectedEvent.datetime).toLocaleString()} &bull; {selectedEvent.location} ({selectedEvent.locationType})
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={exportAttendeesCsv}
                disabled={attendees.length === 0}
                className="px-4 py-2 bg-accent-blue hover:bg-accent-hover text-white rounded text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
              >
                Export CSV Report
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
            <div className="relative max-w-sm flex-1">
              <input
                type="text"
                placeholder="Search attendee by MSSV, OCID, name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-border rounded-lg text-xs bg-white focus:outline-none focus:border-accent-blue"
              />
              <span className="absolute left-3 top-2.5 text-xs text-text-secondary pointer-events-none">&search;</span>
            </div>

            <div className="flex gap-4 text-xs font-semibold">
              <span className="text-navy">Total Registered: <b>{attendees.length}</b></span>
              <span className="text-success">Checked-in / Credentialed: <b>{attendees.filter(a => a.checkedIn).length}</b></span>
            </div>
          </div>

          {loadingAttendees ? (
            <div className="py-12 text-center text-xs text-text-secondary">Loading attendee logs...</div>
          ) : filteredAttendees.length === 0 ? (
            <div className="py-16 text-center bg-surface border border-dashed border-border rounded-xl">
              <div className="text-sm font-semibold text-navy">No attendee records found</div>
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
                      <th className="p-4 text-center">Credential Status</th>
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
                          <StatusBadge
                            status={att.checkedIn ? 'checked-in' : 'not_issued'}
                            label={att.checkedIn ? 'CHECKED-IN' : 'REGISTERED ONLY'}
                          />
                        </td>

                        <td className="p-4 text-center">
                          <StatusBadge
                            status={(att.mintStatus === 'success' || att.mintStatus === 'minted_onchain') && !hasRealTransaction(att) ? 'not_issued' : att.mintStatus || 'not_issued'}
                            label={
                              (att.mintStatus === 'success' || att.mintStatus === 'minted_onchain') && hasRealTransaction(att)
                                ? 'ON-CHAIN ISSUED'
                                : att.mintStatus === 'skipped_no_wallet' || att.mintStatus === 'off_chain'
                                ? 'OFF-CHAIN ONLY'
                                : att.mintStatus === 'pending' || att.mintStatus === 'minting'
                                ? 'ISSUANCE PENDING'
                                : att.mintStatus === 'failed'
                                ? 'MINT FAILED'
                                : String(att.mintStatus || '').startsWith('skipped_')
                                ? 'ON-CHAIN NOT AVAILABLE'
                                : 'NOT AVAILABLE'
                            }
                          />
                        </td>

                        <td className="p-4 text-center">
                          <StatusBadge
                            status={att.source === 'import_excel' ? 'excel import' : 'qr check-in'}
                            label={att.source === 'import_excel' ? 'EXCEL IMPORT' : 'QR CHECK-IN'}
                          />
                        </td>

                        <td className="p-4 text-right font-mono text-[10px]">
                          {att.txHash ? (
                            <a
                              href={`https://educhain-testnet.blockscout.com/tx/${att.txHash}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-accent-blue hover:underline"
                            >
                              {att.txHash.substring(0, 8)}...{att.txHash.substring(att.txHash.length - 4)}
                            </a>
                          ) : (
                            <span className="text-text-secondary opacity-60">N/A</span>
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
        <div className="space-y-4">
          {events.length === 0 ? (
            <div className="py-16 text-center bg-surface border border-dashed border-border rounded-xl">
              <div className="text-sm font-semibold text-navy">No archived events found</div>
              <p className="text-xs text-text-secondary mt-1">
                Completed and deleted events will be preserved in this registry.
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
                      <th className="p-4 text-center">Checked-in Credentials</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {events.map((ev) => {
                      const isDeleted = !!ev.deletedAt;
                      return (
                        <tr key={ev.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="p-3.5 pr-6">
                            <div className="font-semibold text-navy text-sm leading-snug">
                              {ev.name}
                            </div>
                            <div className="text-[10px] text-text-secondary uppercase font-bold tracking-wider mt-0.5">
                              {ev.category} &bull; <span className="num font-semibold text-oc-blue">+{ev.points} pts</span>
                            </div>
                          </td>

                          <td className="p-3.5 text-text-secondary whitespace-nowrap text-xs">
                            {new Date(ev.datetime).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </td>

                          <td className="p-3.5 text-center font-semibold text-navy num text-xs">
                            {ev.registeredCount || ev.registered || 0}
                          </td>

                          <td className="p-3.5 text-center font-bold text-emerald-600 num text-xs">
                            {ev.attendedCount || 0}
                          </td>

                          <td className="p-3.5 text-center">
                            {isDeleted ? (
                              <div
                                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-rose-500/40 bg-rose-50/50 text-rose-600 shadow-xs transition-all hover:scale-105"
                                title="Soft Deleted / Archived"
                                aria-label="Soft Deleted / Archived"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </div>
                            ) : (
                              <div
                                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-emerald-500/40 bg-emerald-50/50 text-emerald-600 shadow-xs transition-all hover:scale-105"
                                title="Active / Completed Event"
                                aria-label="Active / Completed Event"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              </div>
                            )}
                          </td>

                          <td className="p-3.5 text-right whitespace-nowrap">
                            <button
                              onClick={() => handleSelectEvent(ev.id)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-oc-blue hover:text-oc-indigo bg-oc-mist/60 hover:bg-oc-mist border border-oc-periwinkle/70 hover:border-oc-blue/50 rounded-md transition-all active:scale-95 shadow-xs"
                              title="View Attendee Logs"
                            >
                              <svg className="w-3.5 h-3.5 text-oc-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                              <span>Logs</span>
                              <span className="text-slate-400">&rarr;</span>
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
