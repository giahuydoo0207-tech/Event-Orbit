import React, { useEffect, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { fetchEventById, checkInStudent } from '../api/mockApi';
import { useStore } from '../store/useStore';
import { useOCAuth } from '@opencampus/ocid-connect-js';
import useToastStore from '../store/useToastStore';
import { getCheckinLookupFailureState } from '../lib/checkinState';

export function StudentCheckin() {
  const [searchParams] = useSearchParams();
  const qrData = searchParams.get('qrData');
  const [eventId, setEventId] = useState(searchParams.get('eventId'));
  const navigate = useNavigate();
  
  const { user } = useStore();
  const { ocAuth } = useOCAuth();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusState, setStatusState] = useState('ready'); // 'connect' | 'ready' | 'processing' | 'success' | 'already' | 'error'
  const [txHash, setTxHash] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  
  const loadEvent = async () => {
    let currentEventId = eventId;
    
    // Attempt to extract eventId from qrData payload if present
    if (qrData) {
      try {
        const decoded = JSON.parse(atob(qrData));
        currentEventId = decoded.eventId;
        setEventId(currentEventId);
      } catch (e) {
        console.error('Failed to decode qrData payload:', e);
        setStatusState('error');
        setErrorMessage('The QR code is invalid or has expired. Please scan the event QR code again.');
        setLoading(false);
        return;
      }
    }

    if (!currentEventId) {
      setStatusState('error');
      setErrorMessage('Missing Event ID in the QR code.');
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const ev = await fetchEventById(currentEventId);
      if (!ev) {
        setStatusState('error');
        setErrorMessage('This event does not exist or has expired.');
        return;
      }
      setEvent(ev);

      if (!user.isAuthenticated) {
        setStatusState('connect');
      } else {
        // Duplicate attendance is reported authoritatively by the check-in API.
        setStatusState('ready');
      }
    } catch (e) {
      console.error(e);
      const nextState = getCheckinLookupFailureState(e, user.isAuthenticated);
      setStatusState(nextState);
      setErrorMessage(nextState === 'error' ? 'Failed to query event records.' : '');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvent();
  }, [eventId, qrData, user.isAuthenticated]);

  const handleOCIDLogin = () => {
    try {
      sessionStorage.setItem('ocidReturnTo', `${window.location.pathname}${window.location.search}`);
      ocAuth.signInWithRedirect({ state: 'opencampus' });
    } catch (err) {
      console.error('OCID sign-in could not be started:', err);
      setErrorMessage('Unable to start Open Campus ID sign-in. Please try again.');
    }
  };

  const showToast = useToastStore((state) => state.showToast);

  const handleConfirmCheckin = async () => {
    if (!qrData) {
      setStatusState('error');
      const msg = 'Venue QR code token is initializing. Please re-scan the QR code displayed on the venue screen.';
      setErrorMessage(msg);
      showToast(msg, 'warning');
      return;
    }

        setStatusState('processing');
    try {
      const res = await checkInStudent(qrData, user);
      if (res.success) {
        setTxHash(res.txHash);
        setStatusState('success');
        showToast('Attendance confirmed! Credential issued.', 'success');
      } else {
        if (getCheckinLookupFailureState({ status: res.status }, true) === 'connect') {
          setStatusState('connect');
          setErrorMessage('');
          return;
        }

        let formattedError = res.error || 'Check-in failed.';
        const isDuplicateAttendance = /you have already checked in (?:to|for) this event/i.test(formattedError);

        if (isDuplicateAttendance) {
          setStatusState('already');
          setErrorMessage('');
          return;
        }

        setStatusState('error');
        if (formattedError.includes('Invalid QR format') || formattedError.includes('signature') || formattedError.includes('Missing QR data')) {
          formattedError = 'Mã QR chưa sẵn sàng hoặc đã hết hạn. Vui lòng quét lại mã QR trên màn hình sự kiện.';
        }
        setErrorMessage(formattedError);
        showToast(formattedError, 'error');
      }
    } catch (err) {
      setStatusState('error');
      setErrorMessage(err.message || 'Check-in transaction rejected.');
      showToast(err.message || 'Check-in transaction rejected.', 'error');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white border border-border p-6 rounded-xl shadow-md text-center space-y-3 w-full max-w-sm">
          <div className="w-8 h-8 border-t-2 border-accent-blue rounded-full animate-spin mx-auto"></div>
          <div className="text-sm font-semibold text-navy">Verifying Event Credentials...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
      <div className="bg-white border border-border rounded-2xl shadow-xl w-full max-w-md p-6 sm:p-8 space-y-6">
        
        {/* Brand Header */}
        <div className="flex items-center gap-3 border-b border-border pb-4">
          <span className="text-lg font-bold text-navy tracking-tight">Event Orbit</span>
          <span className="bg-accent-blue/10 text-accent-blue text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-sm">
            Student Check-in
          </span>
        </div>

        {/* States Switcher */}

        {/* Authentication CTA */}
        {statusState === 'connect' && (
          <div className="space-y-6 py-4">
            {event && (
              <div className="border-b border-oc-blue/20 pb-5">
                <div className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-oc-blue">
                  Student Check-in
                </div>
                <h1 className="mt-2 text-xl font-bold text-oc-navy">{event.name}</h1>
                <p className="mt-1 font-mono text-xs font-bold text-oc-blue">+{event.points} points</p>
              </div>
            )}
            <div className="rounded-xl bg-oc-navy px-5 py-6 text-center">
              <h2 className="text-xl font-bold leading-snug text-white">
                Connect with Open Campus ID to continue
              </h2>
              <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-white/70">
                Use your verified Open Campus ID to confirm attendance for this event.
              </p>
              <button
                type="button"
                onClick={handleOCIDLogin}
                className="mt-6 w-full rounded-md bg-oc-turquoise px-4 py-3 text-sm font-extrabold text-oc-navy transition-colors hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-oc-turquoise focus-visible:ring-offset-2 focus-visible:ring-offset-oc-navy"
              >
                Connect with Open Campus ID
              </button>
            </div>
          </div>
        )}

        {/* 1. Ready State */}
        {statusState === 'ready' && (
          <div className="space-y-6">
            <div className="space-y-2 text-center sm:text-left">
              <span className="text-[10px] uppercase font-bold text-text-secondary tracking-widest">
                You scanned the check-in QR for:
              </span>
              <h1 className="text-xl font-bold text-navy">{event?.name}</h1>
              <p className="text-xs text-text-secondary">{event?.location}</p>
            </div>

            {/* Inner Info Banner */}
            <div className="bg-accent-blue/5 border border-accent-blue/15 rounded-lg p-4 flex items-center gap-4">
              <div className="text-center bg-accent-blue text-white rounded-sm p-2 min-w-[70px]">
                <span className="text-xs uppercase font-bold block leading-none">PTS</span>
                <span className="text-xl font-black">+{event?.points}</span>
                <span className="text-[9px] block uppercase leading-none">pts</span>
              </div>
              <p className="text-xs text-text-secondary">
                Confirming attendance issues a verified digital credential directly to your student profile.
              </p>
            </div>

            {/* Login section if unauthenticated */}
            {!user.isAuthenticated ? (
              <div className="space-y-4 pt-2">
                <div className="text-xs font-semibold text-text-secondary text-center uppercase tracking-wider">
                  Authentication Required
                </div>
                    <button
                      onClick={handleOCIDLogin}
                      className="w-full py-3 bg-accent-blue hover:bg-accent-hover text-white text-sm font-semibold rounded-md shadow-sm transition-colors"
                    >
                      Connect with Open Campus ID
                    </button>
              </div>
            ) : (
              /* Confirmation if logged in */
              <div className="space-y-4 pt-2">
                <div className="bg-slate-50 border border-border rounded-lg p-3 text-xs flex justify-between items-center">
                  <div>
                    <span className="text-[10px] text-text-secondary block">Checking in as</span>
                    <span className="font-semibold text-navy">{user.fullName}</span>
                  </div>
                  <span className="font-mono text-accent-blue text-[10px]">{user.ocid || user.mssv}</span>
                </div>

                {!qrData && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center space-y-1">
                    <p className="text-xs font-semibold text-amber-800">
                      Mã QR chưa sẵn sàng
                    </p>
                    <p className="text-[11px] text-amber-700 leading-normal">
                      Bạn đã quét mã lúc hệ thống đang khởi tạo token. Vui lòng quét lại mã QR hiển thị trên màn hình sự kiện.
                    </p>
                  </div>
                )}

                <button
                  onClick={handleConfirmCheckin}
                  disabled={!qrData}
                  className={`w-full py-3 text-sm font-semibold rounded-md shadow-sm transition-colors ${
                    !qrData
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                      : 'bg-success hover:bg-success/90 text-white'
                  }`}
                >
                  Confirm Event Attendance
                </button>
              </div>
            )}
          </div>
        )}

        {/* 2. Processing State */}
        {statusState === 'processing' && (
          <div className="text-center py-10 space-y-4">
            <div className="w-10 h-10 border-t-2 border-accent-blue rounded-full animate-spin mx-auto"></div>
            <h2 className="text-lg font-bold text-navy">Issuing Event Credential...</h2>
            <p className="text-xs text-text-secondary">
              Thông tin điểm danh đang được xác thực và ghi nhận. Vui lòng giữ kết nối Internet.
            </p>
          </div>
        )}

        {/* 3. Success State */}
        {statusState === 'success' && (
          <div className="text-center py-6 space-y-6">
            <div className="text-success text-4xl font-extrabold">&bull; Success &bull;</div>
            <div className="space-y-2">
              <h2 className="text-lg font-bold text-navy">Attendance Logged!</h2>
              <p className="text-xs text-text-secondary">
                Your credentials have been authenticated and recorded.
              </p>
            </div>

            <div className="bg-success/5 border border-success/20 rounded-xl p-4 text-left space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-text-secondary">Earned Credential:</span>
                <span className="font-bold text-success">+{event?.points} points</span>
              </div>
              <div className="text-xs font-semibold text-navy">{event?.name}</div>
              
              {txHash && (
                <div className="text-[10px] space-y-1">
                  <span className="text-text-secondary block">Transaction Receipt</span>
                  <a
                    href={`https://edu-chain-testnet.blockscout.com/tx/${txHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-accent-blue underline break-all block"
                  >
                    {txHash}
                  </a>
                </div>
              )}
            </div>

            <Link
              to="/dashboard"
              className="w-full py-2.5 bg-navy text-white text-xs font-semibold rounded block text-center"
            >
              View My Credentials
            </Link>
          </div>
        )}

        {/* 4. Already State */}
        {statusState === 'already' && (
          <div className="text-center py-10 space-y-6">
            <div className="mx-auto max-w-xs border-y border-oc-turquoise/40 py-6">
              <div className="badge-kicker text-[10px] text-oc-blue">Open Campus ID</div>
              <h2 className="mt-3 text-xl font-bold text-navy">Already checked in</h2>
              <p className="mt-2 text-xs leading-relaxed text-text-secondary">
                You have already checked in to this event.
              </p>
            </div>
            <Link
              to="/dashboard"
              className="block w-full rounded bg-oc-blue py-2.5 text-center text-xs font-semibold text-white transition-colors hover:bg-oc-indigo"
            >
              Go to Dashboard
            </Link>
          </div>
        )}

        {/* 5. Error State */}
        {statusState === 'error' && (
          <div className="text-center py-10 space-y-6">
            <div className="text-error text-4xl font-extrabold">&bull; Error &bull;</div>
            <div className="space-y-2">
              <h2 className="text-lg font-bold text-navy">Check-in Rejected</h2>
              <p className="text-xs text-text-secondary">{errorMessage}</p>
            </div>
            <button
              onClick={() => navigate('/')}
              className="w-full py-2.5 bg-surface border border-border text-navy text-xs font-semibold rounded"
            >
              Back to Homepage
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
export default StudentCheckin;
