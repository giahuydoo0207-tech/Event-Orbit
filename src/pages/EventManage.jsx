import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { fetchEventById, fetchEventAttendees, checkInStudent, deleteEventApi, getAuthHeaders } from '../api/mockApi';
import QRCode from 'qrcode';
import { AttendeeImportModal } from '../components/AttendeeImportModal';
import useToastStore from '../store/useToastStore';
import { LoadingBar } from '../components/LoadingBar';

export function EventManage() {
  const { id, chapterId } = useParams();
  const navigate = useNavigate();
  const showToast = useToastStore((state) => state.showToast);

  const [event, setEvent] = useState(null);
  const [attendees, setAttendees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const qrCanvasRef = useRef(null);

  const loadData = async () => {
    try {
      const ev = await fetchEventById(id);
      setEvent(ev);
      const atts = await fetchEventAttendees(id);
      setAttendees(atts);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Live update simulation (polling mock API attendee records every 4s)
    const interval = setInterval(() => {
      fetchEventAttendees(id).then(setAttendees).catch(console.error);
    }, 4000);

    return () => clearInterval(interval);
  }, [id]);

  const [qrData, setQrData] = useState('');

  const fetchQRData = async () => {
    try {
      const res = await fetch(`/api/events/${id}/qr`, {
        headers: getAuthHeaders(),
        credentials: 'same-origin'
      });
      if (res.ok) {
        const data = await res.json();
        setQrData(data.qrData);
      }
    } catch (err) {
      console.error('Failed to fetch signed QR data:', err);
    }
  };

  useEffect(() => {
    if (event) {
      fetchQRData();
      const interval = setInterval(fetchQRData, 270000); // 4.5 minutes
      return () => clearInterval(interval);
    }
  }, [event, id]);

  // Generate QR Canvas inside detail card
  useEffect(() => {
    if (event && qrCanvasRef.current) {
      const checkinUrl = qrData 
        ? `${window.location.origin}/student-checkin?qrData=${qrData}`
        : `${window.location.origin}/student-checkin?eventId=${event.id}`;

      QRCode.toCanvas(qrCanvasRef.current, checkinUrl, {
        width: 240,
        margin: 2,
        color: {
          dark: '#1a2a4a',
          light: '#FFFFFF'
        }
      }).catch(err => console.error('QR generation error in manager', err));
    }
  }, [event, qrData]);

  const handleManualCheckIn = async (att) => {
    try {
      const res = await checkInStudent(id, {
        fullName: att.studentName,
        ocid: att.ocid,
        ethAddress: att.ethAddress,
        mssv: att.mssv
      });
      if (res.success) {
        alert(`Checked in ${att.studentName} successfully!`);
        loadData();
      }
    } catch (err) {
      alert("Failed to manual check-in");
    }
  };

  const handleDeleteEvent = async () => {
    if (!event) return;
    setDeleting(true);
    try {
      await deleteEventApi(event.id);
      showToast('Event soft deleted successfully. Recorded in Event History.', 'success');
      navigate(`/manage/${chapterId}`);
    } catch (err) {
      console.error('Failed to delete event:', err);
      showToast(err.message || 'Failed to delete event.', 'error');
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

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
        <Link to={`/manage/${chapterId}`} className="text-xs text-accent-blue underline">
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
        <Link to={`/manage/${chapterId}`} className="text-xs font-bold text-text-secondary hover:text-navy uppercase tracking-wider">
          &larr; Back to Chapter Management
        </Link>
      </div>

      {/* Title */}
      <div className="border-b border-border pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy">Manage Event: {event.name}</h1>
          <p className="text-xs text-text-secondary mt-1">
            Date: {new Date(event.datetime).toLocaleString()} &bull; Location: {event.location}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="px-4 py-2 bg-accent-blue text-white hover:bg-accent-hover text-xs font-semibold rounded shadow-sm flex items-center justify-center gap-1.5"
          >
            <span className="text-sm font-bold leading-none">+</span> Import &amp; Cấp Badge
          </button>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="px-3 py-2 border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold rounded shadow-sm transition-colors"
          >
            Delete Event
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* QR Code projector card */}
        <div className="lg:col-span-1 bg-surface border border-border rounded-xl p-6 text-center space-y-4 flex flex-col items-center">
          <div>
            <h2 className="text-sm font-bold text-navy uppercase tracking-wider">Venue Check-in QR</h2>
            <p className="text-[11px] text-text-secondary mt-1">Project this screen on display. Students scan to self check-in.</p>
          </div>
          
          <div className="bg-white border border-border p-3 rounded shadow-sm">
            <canvas ref={qrCanvasRef}></canvas>
          </div>

          <div className="bg-white border border-border rounded p-2 w-full text-[9px] font-mono select-all truncate text-text-secondary">
            {qrData || 'Generating venue check-in token...'}
          </div>
        </div>

        {/* Attendees Manager list */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-navy uppercase tracking-wider">
              Registrations ({attendees.length})
            </h2>
            <span className="text-xs text-text-secondary">
              Checked-in: <b className="text-success">{attendees.filter(a => a.checkedIn).length}</b>
            </span>
          </div>

          {attendees.length === 0 ? (
            <div className="bg-surface border border-dashed border-border rounded-xl p-8 text-center text-xs text-text-secondary">
              No registrations yet for this event.
            </div>
          ) : (
            <div className="bg-white border border-border rounded-xl overflow-hidden shadow-sm">
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
                    {attendees.map(att => (
                      <tr key={att.id} className="hover:bg-slate-50/50">
                        <td className="p-3 font-semibold text-navy">
                          {att.studentName || 'Anonymous Student'}
                        </td>
                        <td className="p-3 font-mono text-text-secondary">
                          {att.mssv || att.ocid || 'N/A'}
                        </td>
                        <td className="p-3 text-right">
                          {att.checkedIn ? (
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                              Checked-in
                            </span>
                          ) : (
                            <button
                              onClick={() => handleManualCheckIn(att)}
                              className="px-2 py-1 bg-slate-100 hover:bg-accent-blue hover:text-white text-navy font-semibold rounded text-[10px] transition-colors"
                            >
                              Check-in
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

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/60 backdrop-blur-sm">
          <div className="bg-white border border-border rounded-2xl p-6 shadow-2xl w-full max-w-md space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-lg font-bold">
                !
              </div>
              <div>
                <h3 className="text-base font-bold text-navy">Soft Delete Event?</h3>
                <p className="text-xs text-text-secondary">This event will be hidden from public listings.</p>
              </div>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs space-y-1 text-amber-900">
              <div><b>Registered Students:</b> {attendees.length}</div>
              <div><b>Badges Issued:</b> {attendees.filter(a => a.checkedIn).length}</div>
              <p className="pt-1.5 text-[11px] text-amber-800 border-t border-amber-200/60 mt-1">
                Soft deleting hides the event from public discovery, but <b>WILL NOT</b> delete or invalidate badges already issued to students on-chain.
              </p>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 border border-border text-xs font-semibold rounded-lg text-navy bg-white hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteEvent}
                disabled={deleting}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Confirm Soft Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Attendee List Modal */}
      {event && (
        <AttendeeImportModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          events={[event]}
          chapterId={chapterId}
          onImportSuccess={() => {
            loadData();
          }}
        />
      )}
    </div>
  );
}
export default EventManage;
