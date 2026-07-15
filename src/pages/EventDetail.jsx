import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { fetchEventBySlug, registerForEvent, checkInStudent, fetchEventAttendees, fetchChapterById } from '../api/mockApi';
import { useStore } from '../store/useStore';
import { THEMES } from '../constants/themes';
import QRCode from 'qrcode';
import { Html5QrcodeScanner } from 'html5-qrcode';
import NotFoundState from '../components/NotFoundState';
import useToastStore from '../store/useToastStore';

export function EventDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const user = useStore((state) => state.user);

  const [event, setEvent] = useState(null);
  const [chapter, setChapter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [attendees, setAttendees] = useState([]);
  const [showAttendees, setShowAttendees] = useState(false);
  
  // Registration & Check-in status
  const [registration, setRegistration] = useState(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  
  // Modals state
  const [showQRModal, setShowQRModal] = useState(false);
  const [showScannerModal, setShowScannerModal] = useState(false);
  
  // Transaction hash from check-in
  const [txHash, setTxHash] = useState('');
  
  // Canvas refs
  const qrCanvasRef = useRef(null);

  // Load Event and Attendees details
  const loadData = async () => {
    setLoading(true);
    try {
      const ev = await fetchEventBySlug(slug);
      if (!ev) {
        setEvent(null);
        return;
      }
      setEvent(ev);

      if (ev.chapterId) {
        const ch = await fetchChapterById(ev.chapterId);
        setChapter(ch);
      }

      // Check current registration state if logged in
      if (user.isAuthenticated) {
        const attendeeList = await fetchEventAttendees(ev.id);
        setAttendees(attendeeList);
        
        const matchedReg = attendeeList.find(r => 
          (user.ethAddress && r.ethAddress?.toLowerCase() === user.ethAddress.toLowerCase()) ||
          (user.mssv && r.mssv === user.mssv)
        );

        if (matchedReg) {
          setRegistration(matchedReg);
          setIsRegistered(true);
          setIsCheckedIn(matchedReg.checkedIn);
          if (matchedReg.checkedIn) {
            setTxHash('0x' + Array.from({length: 40}, () => Math.floor(Math.random()*16).toString(16)).join(''));
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [slug, user.isAuthenticated]);

  // Generate QR inside Organizer Modal when modal opens
  useEffect(() => {
    if (showQRModal && qrCanvasRef.current && event) {
      // QR encodes the student self check-in URL
      const checkinUrl = `${window.location.origin}/student-checkin?eventId=${event.id}`;
      QRCode.toCanvas(qrCanvasRef.current, checkinUrl, {
        width: 250,
        margin: 2,
        color: {
          dark: '#0A2540',
          light: '#FFFFFF'
        }
      }).catch(err => console.error('Failed to generate QR canvas', err));
    }
  }, [showQRModal, event]);

  // QR Scanner initialization inside Student Modal
  useEffect(() => {
    let scanner = null;
    if (showScannerModal && event) {
      // Delay scanner setup slightly to let the element render in DOM
      setTimeout(() => {
        scanner = new Html5QrcodeScanner("reader", {
          fps: 10,
          qrbox: { width: 200, height: 200 }
        });
        
        scanner.render(async (decodedText) => {
          console.log("Scanner scanned content:", decodedText);
          // Expecting URL containing eventId
          if (decodedText.includes(`eventId=${event.id}`)) {
            if (scanner) {
              scanner.clear().catch(e => console.error(e));
            }
            setShowScannerModal(false);
            handleSelfCheckIn();
          } else {
            showToast("This QR code belongs to a different event or is invalid.", "error");
          }
        }, (err) => {
          // silent error callback to prevent flooding
        });
      }, 300);
    }

    return () => {
      if (scanner) {
        scanner.clear().catch(e => console.error(e));
      }
    };
  }, [showScannerModal]);

  const [isActionLoading, setIsActionLoading] = useState(false);
  const showToast = useToastStore((state) => state.showToast);

  const handleRegister = async () => {
    if (!user.isAuthenticated || !event) return;
    setIsActionLoading(true);
    try {
      const res = await registerForEvent(event.id, user);
      if (res.success) {
        setRegistration(res.registration);
        setIsRegistered(true);
        loadData(); // reload stats
        showToast("Registered successfully. You will receive a QR ticket at the event.", "success");
      } else {
        showToast(res.error || "Registration failed", "error");
      }
    } catch (err) {
      showToast(err.message || "Registration failed", "error");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleSelfCheckIn = async () => {
    if (!event) return;
    setIsActionLoading(true);
    try {
      const res = await checkInStudent(event.id, user);
      if (res.success) {
        setIsCheckedIn(true);
        setTxHash(res.txHash);
        loadData();
        showToast("Attendance confirmed! Badge issued.", "success");
      } else {
        showToast(res.error || "Check-in failed", "error");
      }
    } catch (err) {
      showToast(err.message || "Check-in failed", "error");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleCopyLink = () => {
    const eventUrl = window.location.href;
    navigator.clipboard.writeText(eventUrl).then(() => {
      showToast("Event link copied to clipboard!", "success");
    });
  };

  if (loading) {
    return (
      <div className="py-24 text-center space-y-4 max-w-lg mx-auto">
        <div className="text-sm font-medium text-text-secondary">Loading event profile...</div>
        <div className="w-10 h-1 bg-border rounded-full mx-auto overflow-hidden relative">
          <div className="absolute top-0 left-0 bottom-0 bg-accent-blue w-1/2 rounded-full animate-[pulse_1s_infinite]"></div>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <NotFoundState
        title="Event not found"
        message="This event may have been removed or the link is incorrect."
        backTo="/events"
        backLabel="Browse events"
      />
    );
  }

  const themeStyle = THEMES[event.theme] || THEMES.Minimal;
  const isOrganizer = user.role === 'organizer';
  
  const dateStr = new Date(event.datetime).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
  const timeStr = new Date(event.datetime).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className="space-y-8">
      {/* Back link */}
      <div>
        <Link to="/events" className="text-xs font-bold text-text-secondary hover:text-navy uppercase tracking-wider">
          &larr; Back to Events
        </Link>
      </div>

      {/* Main Container styled by theme color mappings */}
      <div className={`border rounded-2xl overflow-hidden shadow-sm transition-all duration-300 ${themeStyle.bg} ${themeStyle.text} ${themeStyle.border}`}>
        {/* Cover Photo */}
        <div className="aspect-[3/1] w-full bg-slate-100 overflow-hidden relative border-b border-border">
          <img
            src={event.coverImage}
            alt={event.name}
            className="object-cover w-full h-full"
          />
        </div>

        {/* Content */}
        <div className="p-6 md:p-10 space-y-8">
          
          {/* Header Area */}
          <div className="space-y-4">
            <span className={`text-xs font-bold uppercase tracking-widest ${themeStyle.accentText}`}>
              {event.category}
            </span>

            {/* Hosted by Chapter */}
            {chapter && (
              <div className="flex items-center gap-3 bg-slate-100/50 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-700/30 rounded-xl p-3 max-w-sm">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs bg-gradient-to-br ${chapter.avatarGradient || 'from-slate-600 to-slate-900'} shrink-0`}>
                  {chapter.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                </div>
                <div className="min-w-0">
                  <span className="text-[9px] text-text-secondary uppercase font-bold tracking-widest block">Hosted by</span>
                  <Link to={`/chapters/${chapter.slug}`} className="text-xs font-bold hover:underline truncate block text-navy">
                    {chapter.name} ({chapter.ocid})
                  </Link>
                </div>
              </div>
            )}

            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">
              {event.name}
            </h1>
            
            {/* Metadata Rows */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 pt-4 border-t border-dashed border-slate-300/30 text-sm">
              <div className="space-y-1">
                <div className="text-[10px] text-text-secondary uppercase font-bold tracking-widest">Date & Time</div>
                <div className="font-semibold">{dateStr}</div>
                <div className="text-xs opacity-75">{timeStr}</div>
              </div>
              <div className="space-y-1">
                <div className="text-[10px] text-text-secondary uppercase font-bold tracking-widest">Location ({event.locationType})</div>
                <div className="font-semibold">{event.location}</div>
              </div>
              <div className="space-y-1">
                <div className="text-[10px] text-text-secondary uppercase font-bold tracking-widest">SBT Value</div>
                <div className={`font-bold ${themeStyle.accentText}`}>+{event.points} movement points</div>
              </div>
            </div>
          </div>

          {/* Description & Rich Content */}
          <div className="border-t border-slate-300/30 pt-6 space-y-6 text-sm">
            <div>
              <p className="font-semibold leading-relaxed opacity-95">
                {event.description}
              </p>
            </div>

            {event.content && (
              <div className="space-y-3 pt-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                  Event Information
                </h2>
                <div className="space-y-4 leading-relaxed opacity-90">
                  {event.content.split('\n\n').map((paragraph, i) => (
                    <p key={i}>{paragraph}</p>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Location Block */}
          <div className="border-t border-slate-300/30 pt-6 space-y-2 text-sm">
            <h2 className="text-xs font-bold uppercase tracking-wider text-text-secondary">
              Location
            </h2>
            <p className="opacity-90">{event.location}</p>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`}
              target="_blank"
              rel="noreferrer"
              className="inline-block text-xs font-semibold text-accent-blue hover:underline"
            >
              Open in Google Maps &rarr;
            </a>
          </div>

          {/* Tags */}
          {event.tags && event.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-2">
              {event.tags.map(tag => (
                <span key={tag} className="text-xs font-semibold px-3 py-1 rounded-full border border-current/25 bg-current/5">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Actions & Status Grid Panel */}
          <div className="border-t border-slate-300/30 pt-8 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-6">
            
            {/* Status Info */}
            <div className="text-xs space-y-1">
              <div className="font-semibold opacity-85">
                Attendance rate: {event.registered || 0} registered
              </div>
              {isRegistered && (
                <div className="font-bold uppercase tracking-wide text-success">
                  &bull; You are registered for this event
                </div>
              )}
              {isCheckedIn && (
                <div className="font-bold uppercase tracking-wide text-success">
                  &bull; Verified Check-in completed!
                </div>
              )}
            </div>

            {/* Buttons Row */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleCopyLink}
                className="px-5 py-2.5 rounded text-xs font-semibold uppercase tracking-wider border border-current/30 hover:bg-current/5"
              >
                Copy Link
              </button>

              {/* Login check */}
              {!user.isAuthenticated ? (
                <Link
                  to="/login"
                  className={`px-6 py-2.5 rounded text-xs font-semibold uppercase tracking-wider block text-center ${themeStyle.accent}`}
                >
                  Sign in to Register
                </Link>
              ) : isOrganizer ? (
                <>
                  <button
                    onClick={() => setShowQRModal(true)}
                    className={`px-6 py-2.5 rounded text-xs font-semibold uppercase tracking-wider ${themeStyle.accent}`}
                  >
                    Display QR Code
                  </button>
                  <Link
                    to={`/manage/${event.chapterId}/events/${event.id}`}
                    className="px-5 py-2.5 rounded text-xs font-semibold uppercase tracking-wider border border-current/30 hover:bg-current/5"
                  >
                    Manage Event
                  </Link>
                </>
              ) : (
                /* Student Role Buttons */
                <>
                  {!isRegistered && (
                    <button
                      disabled={isActionLoading}
                      onClick={handleRegister}
                      className={`px-6 py-2.5 rounded text-xs font-semibold uppercase tracking-wider disabled:opacity-50 ${themeStyle.accent}`}
                    >
                      {isActionLoading ? 'Processing...' : 'Register Now'}
                    </button>
                  )}

                  {isRegistered && !isCheckedIn && (
                    <button
                      onClick={() => setShowScannerModal(true)}
                      className={`px-6 py-2.5 rounded text-xs font-semibold uppercase tracking-wider ${themeStyle.accent}`}
                    >
                      Scan QR to Check-in
                    </button>
                  )}

                  {isCheckedIn && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-success">SBT Issued</span>
                      {txHash && (
                        <a
                          href={`https://edu-chain-testnet.blockscout.com/tx/${txHash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-mono text-accent-blue underline"
                        >
                          Tx receipt
                        </a>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

          </div>

          {/* Guest List section */}
          {user.isAuthenticated && (
            <div className="border-t border-slate-300/30 pt-6">
              <button
                onClick={() => setShowAttendees(!showAttendees)}
                className="text-xs font-bold uppercase tracking-wider text-text-secondary hover:text-navy hover:underline"
              >
                {showAttendees ? 'Hide Guest List' : `Show Guest List (${attendees.length})`}
              </button>
              
              {showAttendees && (
                <div className="mt-4 bg-current/5 border border-current/10 rounded-lg p-4 max-h-[200px] overflow-y-auto">
                  {attendees.length === 0 ? (
                    <p className="text-xs text-text-secondary text-center">No students registered yet.</p>
                  ) : (
                    <ul className="space-y-2 text-xs">
                      {attendees.map((att) => (
                        <li key={att.id} className="flex justify-between items-center py-1.5 border-b border-border/20 last:border-0">
                          <span className="font-semibold">{att.studentName}</span>
                          <span className="font-mono text-text-secondary">
                            {att.ocid || att.mssv || 'anonymous'}
                          </span>
                          <span className={att.checkedIn ? 'text-success font-bold' : 'text-text-secondary'}>
                            {att.checkedIn ? 'Attended' : 'Registered'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* Organizer Display QR Modal */}
      {showQRModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-border rounded-xl p-8 max-w-sm w-full text-center space-y-6">
            <h2 className="text-lg font-bold text-navy">{event.name}</h2>
            <p className="text-xs text-text-secondary">
              Project this QR Code on screen. Students scan with their phones to register and check-in.
            </p>
            <div className="flex justify-center border-2 border-border p-4 rounded bg-white">
              <canvas ref={qrCanvasRef}></canvas>
            </div>
            <div className="bg-surface border border-dashed border-border rounded p-2 text-[10px] font-mono select-all">
              {window.location.origin}/student-checkin?eventId={event.id}
            </div>
            <button
              onClick={() => setShowQRModal(false)}
              className="w-full py-2 border border-border hover:bg-surface text-xs font-semibold rounded"
            >
              Close Display
            </button>
          </div>
        </div>
      )}

      {/* Student QR Scanner Camera Modal */}
      {showScannerModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-border rounded-xl p-6 max-w-sm w-full space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-bold text-navy uppercase tracking-wider">Scan Event QR Code</h2>
              <button
                onClick={() => setShowScannerModal(false)}
                className="text-lg font-bold text-text-secondary hover:text-navy"
              >
                &times;
              </button>
            </div>
            <p className="text-xs text-text-secondary">
              Point your camera at the screen showing the event check-in QR.
            </p>
            
            {/* Viewport for html5-qrcode camera */}
            <div className="bg-slate-900 border rounded overflow-hidden aspect-square flex items-center justify-center relative">
              <div id="reader" className="w-full"></div>
            </div>
            
            <button
              onClick={() => setShowScannerModal(false)}
              className="w-full py-2.5 bg-surface text-navy font-semibold text-xs border rounded hover:bg-slate-100"
            >
              Cancel Camera Scanning
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
export default EventDetail;
