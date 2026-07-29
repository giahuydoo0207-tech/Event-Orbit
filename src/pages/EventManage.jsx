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
  const [isQrLoading, setIsQrLoading] = useState(true);
  const [qrData, setQrData] = useState('');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const qrCanvasRef = useRef(null);

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

  const loadData = async () => {
    try {
      // Execute event data, attendees, and signed QR data fetching in parallel
      const [ev, atts] = await Promise.all([
        fetchEventById(id),
        fetchEventAttendees(id),
        fetchQRData()
      ]);
      setEvent(ev);
      setAttendees(atts);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

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
  }, [id]);

  // Generate QR Canvas with instant fallback and clean loading state
  useEffect(() => {
    if (qrCanvasRef.current && (event || id)) {
      const checkinUrl = qrData 
        ? `${window.location.origin}/student-checkin?qrData=${qrData}`
        : `${window.location.origin}/student-checkin?eventId=${id}`;

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
        
        <div className="mt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-navy">{event.name}</h1>
            <p className="text-xs text-text-secondary mt-1">
              {new Date(event.datetime).toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })} &bull; {event.location}
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="px-3 py-2 bg-navy text-white text-xs font-bold rounded shadow-sm hover:bg-navy-light transition-colors"
            >
              Import Attendees CSV
            </button>
            
            <button
              onClick={() => setShowDeleteModal(true)}
              className="px-3 py-2 border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold rounded shadow-sm transition-colors"
            >
              Delete Event
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* QR Code projector card */}
        <div className="lg:col-span-1 bg-surface border border-border rounded-xl p-6 text-center space-y-4 flex flex-col items-center">
          <div>
            <h2 className="text-sm font-bold text-navy uppercase tracking-wider">Venue Check-in QR</h2>
            <p className="text-[11px] text-text-secondary mt-1">Project this screen on display. Students scan to self check-in.</p>
          </div>
          
          <div className="bg-white border border-border p-3 rounded shadow-sm relative min-w-[240px] min-h-[240px] flex items-center justify-center">
            {isQrLoading && (
              <div className="absolute inset-0 bg-white/95 backdrop-blur-[2px] flex flex-col items-center justify-center space-y-3 z-10 rounded">
                <div className="relative w-10 h-10 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-2 border-oc-blue/20" />
                  <div className="absolute inset-0 rounded-full border-2 border-t-oc-turquoise border-r-transparent border-b-transparent border-l-transparent animate-spin" />
                </div>
                <span className="badge-kicker text-[9px] text-slate-400">Generating Venue QR...</span>
              </div>
            )}
            <canvas ref={qrCanvasRef} className={isQrLoading ? 'opacity-0' : 'opacity-100 transition-opacity duration-200'} />
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
              Checked-in: <b className="text-success">{attendedCount}</b>
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
                    {attendees.map((att) => (
                      <tr key={att.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-semibold text-navy">{att.studentName}</td>
                        <td className="p-3 font-mono text-text-secondary">{att.ocid || att.mssv || 'N/A'}</td>
                        <td className="p-3 text-right">
                          {att.checkedIn ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              &check; Checked In
                            </span>
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

      {/* Attendee Import Modal */}
      <AttendeeImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        eventId={id}
        onSuccess={() => {
          showToast('Imported attendees successfully!', 'success');
          loadData();
        }}
      />

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
