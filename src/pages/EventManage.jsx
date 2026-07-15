import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchEventById, fetchEventAttendees, checkInStudent } from '../api/mockApi';
import QRCode from 'qrcode';

export function EventManage() {
  const { id, chapterId } = useParams();
  const [event, setEvent] = useState(null);
  const [attendees, setAttendees] = useState([]);
  const [loading, setLoading] = useState(true);
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

  // Generate QR Canvas inside detail card
  useEffect(() => {
    if (event && qrCanvasRef.current) {
      const checkinUrl = `${window.location.origin}/student-checkin?eventId=${event.id}`;
      QRCode.toCanvas(qrCanvasRef.current, checkinUrl, {
        width: 240,
        margin: 2,
        color: {
          dark: '#1a2a4a',
          light: '#FFFFFF'
        }
      }).catch(err => console.error('QR generation error in manager', err));
    }
  }, [event]);

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

  if (loading) {
    return (
      <div className="py-20 text-center space-y-4 max-w-sm mx-auto">
        <div className="text-sm font-medium text-text-secondary">Retrieving event registries...</div>
        <div className="w-10 h-1 bg-border rounded-full mx-auto overflow-hidden relative">
          <div className="absolute top-0 left-0 bottom-0 bg-accent-blue w-1/2 rounded-full animate-[pulse_1s_infinite]"></div>
        </div>
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
      <div className="border-b border-border pb-4">
        <h1 className="text-2xl font-bold text-navy">Manage Event: {event.name}</h1>
        <p className="text-xs text-text-secondary mt-1">
          Date: {new Date(event.datetime).toLocaleString()} &bull; Location: {event.location}
        </p>
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
            {window.location.origin}/student-checkin.html?eventId=${event.id}
          </div>

          {/* Quick Stats inside card */}
          <div className="grid grid-cols-2 gap-4 w-full pt-4 border-t border-border/50">
            <div className="text-center">
              <div className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Checked In</div>
              <div className="text-2xl font-bold text-success">{attendedCount}</div>
            </div>
            <div className="text-center">
              <div className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Registered</div>
              <div className="text-2xl font-bold text-navy">{attendees.length}</div>
            </div>
          </div>
        </div>

        {/* Attendees Manager list */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-bold text-navy">Registrations List</h2>
            <span className="bg-success-light text-success border border-success/20 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider">
              Live updates active
            </span>
          </div>

          {attendees.length === 0 ? (
            <div className="text-center py-16 bg-white border border-border rounded-xl shadow-sm">
              <h3 className="text-xs font-semibold text-navy">No registrations yet</h3>
              <p className="text-[11px] text-text-secondary mt-1">Attendees will appear here once they register for the event.</p>
            </div>
          ) : (
            <div className="bg-white border border-border rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-border uppercase tracking-widest text-[9px] font-bold text-text-secondary">
                      <th className="p-4">Student Details</th>
                      <th className="p-4">OCID / Student ID</th>
                      <th className="p-4">Verification Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {attendees.map((att) => (
                      <tr key={att.id} className="hover:bg-slate-50/50">
                        <td className="p-4">
                          <div className="font-semibold text-navy text-sm">{att.studentName}</div>
                          {att.ethAddress && (
                            <div className="text-[10px] font-mono text-text-secondary truncate max-w-[160px]">{att.ethAddress}</div>
                          )}
                        </td>
                        <td className="p-4 font-mono text-text-secondary">
                          {att.ocid || att.mssv || 'N/A'}
                        </td>
                        <td className="p-4">
                          {att.checkedIn ? (
                            <span className="text-success font-semibold flex items-center gap-1">
                              &bull; Checked In
                            </span>
                          ) : (
                            <span className="text-text-secondary">
                              Registered
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          {!att.checkedIn && (
                            <button
                              onClick={() => handleManualCheckIn(att)}
                              className="text-[11px] font-bold text-accent-blue hover:underline bg-accent-blue/5 border border-accent-blue/15 px-3 py-1 rounded hover:bg-accent-blue/10"
                            >
                              Check-in
                            </button>
                          )}
                          {att.checkedIn && (
                            <span className="text-[10px] text-text-secondary">
                              {att.checkedInAt ? new Date(att.checkedInAt).toLocaleTimeString() : 'Verified'}
                            </span>
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
    </div>
  );
}
export default EventManage;
