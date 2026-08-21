import React, { lazy, Suspense, useEffect, useState, useRef } from 'react';
import { useParams, Link, Navigate, useNavigate } from 'react-router-dom';
import { fetchEventById, fetchEventAttendees, checkInStudent, deleteEventApi, getAuthHeaders } from '../api/mockApi';
import QRCode from 'qrcode';
import { StatusBadge } from '../components/StatusBadge';
import useToastStore from '../store/useToastStore';
import { LoadingBar } from '../components/LoadingBar';
import { useOrganizerSession } from '../contexts/OrganizerSessionContext';
import { getOrganizerChapterRedirect } from '../lib/organizerNavigation';

const AttendeeImportModal = lazy(() =>
  import('../components/AttendeeImportModal').then((module) => ({ default: module.AttendeeImportModal }))
);

export function EventManage() {
  const { id, chapterId } = useParams();
  const navigate = useNavigate();
  const organizerSession = useOrganizerSession();
  const managePath = `/manage/${encodeURIComponent(chapterId || '')}`;
  const redirectPath = getOrganizerChapterRedirect(chapterId, organizerSession);
  const showToast = useToastStore((state) => state.showToast);

  const [event, setEvent] = useState(null);
  const [attendees, setAttendees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isQrLoading, setIsQrLoading] = useState(true);
  const [qrData, setQrData] = useState('');
  const [qrError, setQrError] = useState('');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pendingClaims, setPendingClaims] = useState([]);
  const [loadingClaims, setLoadingClaims] = useState(false);
  const qrCanvasRef = useRef(null);

  const fetchQRData = async () => {
    setIsQrLoading(true);
    try {
      const res = await fetch(`/api/events/${id}/qr`, {
        headers: getAuthHeaders(),
        credentials: 'include'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to generate the check-in QR code.');
      setQrData(data.qrData);
      setQrError('');
    } catch (err) {
      console.error('Failed to fetch signed QR data:', err);
      setQrData('');
      setQrError(err.message || 'Unable to generate the check-in QR code.');
      setIsQrLoading(false);
    }
  };

  const loadData = async () => {
    console.log(`[EventManage] loadData STARTED for eventId: ${id}`);
    try {
      // Execute event data, attendees, and signed QR data fetching in parallel
      const [ev, atts] = await Promise.all([
        fetchEventById(id),
        fetchEventAttendees(id),
        fetchQRData()
      ]);
      console.log(`[EventManage] loadData COMPLETED - event: ${ev?.name}, attendeesCount: ${atts?.length}`);
      setEvent(ev);
      setAttendees(atts);
    } catch (err) {
      console.error('[EventManage] loadData Error:', err);
    } finally {
      setLoading(false);
    }
  };
  const loadPendingClaims = async () => {
    if (!id) return;
    setLoadingClaims(true);
    try {
      const res = await fetch(`/api/claim?eventId=${encodeURIComponent(id)}`, { headers: getAuthHeaders(), credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load pending claims.');
      setPendingClaims(data.claims || []);
    } catch (err) { console.error('[EventManage] Failed to load pending claims:', err); showToast(err.message || 'Failed to load pending claims.', 'error'); }
    finally { setLoadingClaims(false); }
  };
  const copyClaimText = async (text, message = 'Copied to clipboard.') => {
    try { await navigator.clipboard.writeText(text); showToast(message, 'success'); }
    catch (err) { console.error('Clipboard copy failed:', err); showToast('Failed to copy link.', 'error'); }
  };

  useEffect(() => {
    if (redirectPath) return undefined;
    loadData();
    loadPendingClaims();

    // Refresh QR token every 4.5 minutes
    const qrInterval = setInterval(fetchQRData, 270000);

    // Live update simulation (polling mock API attendee records every 4s)
    const attendeeInterval = setInterval(() => {
      fetchEventAttendees(id).then(setAttendees).catch(console.error);
    }, 4000);

    return () => {
      clearInterval(qrInterval);
      clearInterval(attendeeInterval);
    };
  }, [id, redirectPath]);

  // Generate QR Canvas with instant fallback and clean loading state
  useEffect(() => {
    if (qrCanvasRef.current && qrData) {
      const checkinUrl = `${window.location.origin}/student-checkin?qrData=${encodeURIComponent(qrData)}`;

      QRCode.toCanvas(qrCanvasRef.current, checkinUrl, {
        width: 240,
        margin: 2,
        color: {
          dark: '#1a2a4a',
          light: '#FFFFFF'
        }
      })
        .then(() => {
          setIsQrLoading(false);
        })
        .catch((err) => {
          console.error('QR generation error in manager', err);
          setQrError('The signed token was created, but the QR image could not be rendered.');
          setIsQrLoading(false);
        });
    }
  }, [event, id, qrData]);

  const handleManualCheckIn = async (att) => {
    try {
      const res = await checkInStudent(id, {
        fullName: att.studentName,
        ocid: att.ocid,
        ethAddress: att.ethAddress,
        mssv: att.mssv
      });
      if (res.success) {
        showToast(`Checked in ${att.studentName} successfully!`, 'success');
        loadData();
      }
    } catch (err) {
      showToast("Failed to manual check-in", "error");
    }
  };

  const handleDeleteEvent = async () => {
    if (!event) return;
    setDeleting(true);
    try {
      await deleteEventApi(event.id);
      showToast('Event soft deleted successfully. Recorded in Event History.', 'success');
      navigate(managePath);
    } catch (err) {
      console.error('Failed to delete event:', err);
      showToast(err.message || 'Failed to delete event.', 'error');
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  if (redirectPath) {
    return <Navigate to={redirectPath} replace />;
  }

  if (loading) {
    return (
      <div className="py-24 text-center space-y-4 max-w-sm mx-auto font-sans">
        <div className="badge-kicker text-[10px] text-slate-400">Retrieving event registries...</div>
        <LoadingBar className="max-w-[140px] mx-auto" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="py-20 text-center max-w-sm mx-auto">
        <h2 className="text-lg font-bold text-navy">Event Not Found</h2>
        <Link to={managePath} className="text-xs text-accent-blue underline">
          Back to Chapter Management
        </Link>
      </div>
    );
  }

  const attendedCount = attendees.filter(r => r.checkedIn).length;

  return (
    <div className="space-y-8">
      {/* Header breadcrumb */}
      <div>
        <Link to={managePath} className="text-xs font-bold text-text-secondary hover:text-navy uppercase tracking-wider">
          &larr; Back to Chapter Management
        </Link>
        
        <div className="mt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="page-title">{event.name}</h1>
            <p className="text-xs text-text-secondary mt-1">
              {new Date(event.datetime).toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })} &bull; {event.location}
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="action-primary"
            >
              Import Attendees CSV
            </button>
            
            <button
              onClick={() => setShowDeleteModal(true)}
              className="inline-flex min-h-10 items-center justify-center whitespace-nowrap rounded-lg border border-red-200 bg-white px-4 py-2 text-xs font-bold text-red-700 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/30"
            >
              Delete Event
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-10">
        {/* Open Campus check-in station */}
        <section className="overflow-hidden rounded-xl bg-oc-navy text-white shadow-oc-md">
          <div className="grid grid-cols-1 items-center gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(288px,0.8fr)_1.2fr] lg:gap-14 lg:p-12">
            <div className="flex flex-col items-center lg:items-start">
              <div className="relative flex min-h-[272px] min-w-[272px] items-center justify-center rounded-xl border border-oc-turquoise/30 bg-white p-4 shadow-[0_18px_50px_rgba(0,237,190,0.08)]">
                {isQrLoading && !qrError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center space-y-3 rounded-xl bg-white/95">
                    <div className="relative flex h-10 w-10 items-center justify-center">
                      <div className="absolute inset-0 rounded-full border-2 border-oc-blue/20" />
                      <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-oc-turquoise" />
                    </div>
                    <span className="badge-kicker text-[9px] text-slate-500">Generating check-in QR</span>
                  </div>
                )}
                {qrError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl bg-white px-6 text-center" role="alert">
                    <span className="text-sm font-bold text-oc-navy">Check-in QR unavailable</span>
                    <span className="mt-2 text-xs leading-relaxed text-slate-500">{qrError}</span>
                  </div>
                )}
                <canvas
                  ref={qrCanvasRef}
                  className={`block h-auto max-w-full ${isQrLoading ? 'opacity-0' : 'opacity-100 transition-opacity duration-200'}`}
                />
              </div>

              <div className="mt-5 w-full max-w-[320px]">
                <div className="badge-kicker mb-2 text-[9px] text-oc-turquoise">Session token</div>
                <div className="select-all truncate border-t border-oc-turquoise/25 pt-3 font-mono text-[9px] leading-relaxed text-oc-periwinkle/80">
                  {qrData || (qrError ? 'No active check-in token' : 'Generating venue check-in token...')}
                </div>
              </div>
            </div>

            <div className="max-w-xl text-center lg:text-left">
              <div className="badge-kicker text-[10px] text-oc-turquoise">Open Campus Check-in</div>
              <h2 className="mt-4 text-3xl font-black leading-tight tracking-tight text-white sm:text-4xl">
                Scan to verify attendance
              </h2>
              <p className="mt-4 max-w-lg text-sm font-medium leading-relaxed text-oc-periwinkle sm:text-base">
                Use Open Campus ID to check in and receive your event credential.
              </p>

              <div className="mt-8 border-t border-oc-turquoise/25 pt-6">
                <p className="text-lg font-bold leading-snug text-white">{event.name}</p>
                <p className="mt-2 font-mono text-xs text-oc-turquoise">{event.points} points</p>
              </div>

              <div className="mt-7 flex flex-wrap justify-center gap-x-5 gap-y-2 font-mono text-[10px] font-bold uppercase tracking-wider text-oc-turquoise lg:justify-start">
                <span>Live check-in</span>
                <span>OCID required</span>
              </div>
            </div>
          </div>
        </section>

        {/* Attendees Manager list */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-navy uppercase tracking-wider">
              Registrations ({attendees.length})
            </h2>
            <span className="text-xs text-text-secondary">
              Checked-in: <b className="text-success">{attendedCount}</b>
            </span>
          </div>

          {attendees.length === 0 ? (
            <div className="empty-state text-xs text-text-secondary">
              <p className="text-sm font-bold text-oc-ink">No registrations yet</p>
              <p className="mt-1">Registrations and check-ins will appear here.</p>
            </div>
          ) : (
            <div className="surface-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-border text-[10px] font-bold text-text-secondary uppercase tracking-wider">
                      <th className="p-3">Student Name</th>
                      <th className="p-3">MSSV / OCID</th>
                      <th className="p-3 text-right">Check-in Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {attendees.map((att) => (
                      <tr key={att.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-semibold text-navy">{att.studentName}</td>
                        <td className="p-3 font-mono text-text-secondary">{att.ocid || att.mssv || 'N/A'}</td>
                        <td className="p-3 text-right">
                          {att.checkedIn ? (
                            <StatusBadge status="checked-in" label="CHECKED IN" />
                          ) : (
                            <button
                              onClick={() => handleManualCheckIn(att)}
                              className="text-[10px] font-bold text-oc-blue hover:underline bg-oc-mist px-2.5 py-1 rounded border border-oc-periwinkle/50"
                            >
                              Check In
                            </button>
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
      </div>

      <section className="border border-border bg-white rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between gap-3"><div><h2 className="text-sm font-bold text-navy">Credential Claims</h2><p className="text-xs text-text-secondary">{pendingClaims.filter((claim) => claim.status === 'pending').length} ready to claim / {pendingClaims.filter((claim) => claim.status === 'claimed').length} claimed</p></div>{pendingClaims.some((claim) => claim.claimUrl) && <button onClick={() => copyClaimText(pendingClaims.filter((claim) => claim.claimUrl).map((claim) => `${claim.importName}: ${claim.claimUrl}`).join('\n'))} className="rounded-md border border-oc-blue/30 px-3 py-2 text-xs font-bold text-oc-blue">Copy All</button>}</div>
        {loadingClaims ? <p className="text-xs text-text-secondary">Loading claim links...</p> : <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr><th className="p-2">Name</th><th className="p-2">MSSV</th><th className="p-2">Email</th><th className="p-2">Status</th><th className="p-2 text-right">Claim Link</th></tr></thead><tbody>{pendingClaims.map((claim) => <tr key={claim.id}><td className="p-2">{claim.importName}</td><td className="p-2">{claim.importMssv || 'N/A'}</td><td className="p-2">{claim.importEmail || 'N/A'}</td><td className="p-2"><span className={claim.status === 'claimed' ? 'bg-oc-navy px-2 py-1 font-mono text-[10px] font-bold text-oc-turquoise' : 'bg-oc-navy px-2 py-1 font-mono text-[10px] font-bold text-white/80'}>{claim.status === 'claimed' ? 'CLAIMED' : 'PENDING'}</span></td><td className="p-2 text-right"><button onClick={() => copyClaimText(claim.claimUrl)} title="Copy claim link" aria-label="Copy claim link" className="rounded-md border border-oc-blue/30 px-2 py-1 text-[10px] font-bold text-oc-blue">Copy</button></td></tr>)}</tbody></table></div>}
      </section>

      {/* Attendee Import Modal */}
      {isImportModalOpen && (
        <Suspense fallback={null}>
          <AttendeeImportModal
            isOpen
            onClose={() => setIsImportModalOpen(false)}
            eventId={id}
            onSuccess={() => {
              showToast('Imported attendees successfully!', 'success');
              loadData();
              loadPendingClaims();
            }}
          />
        </Suspense>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-bold text-navy">Confirm Soft Delete</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete <b className="text-navy">{event.name}</b>?
              The event will be removed from active lists and archived in <b>Event History</b>.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteEvent}
                disabled={deleting}
                className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded shadow-sm flex items-center gap-1.5"
              >
                {deleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EventManage;
