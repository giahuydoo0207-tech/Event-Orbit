import React, { useEffect, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { fetchEventById, checkInStudent, fetchEventAttendees } from '../api/mockApi';
import { useStore } from '../store/useStore';
import { useOCAuth } from '@opencampus/ocid-connect-js';
import useToastStore from '../store/useToastStore';

export function StudentCheckin() {
  const [searchParams] = useSearchParams();
  const eventId = searchParams.get('eventId');
  const navigate = useNavigate();
  
  const { user, setUser } = useStore();
  const { ocAuth } = useOCAuth();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusState, setStatusState] = useState('ready'); // 'ready' | 'processing' | 'success' | 'already' | 'error'
  const [txHash, setTxHash] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  
  // Local login state
  const [mssvInput, setMssvInput] = useState('');
  const [fullNameInput, setFullNameInput] = useState('');
  const [showLocalLogin, setShowLocalLogin] = useState(false);

  const loadEvent = async () => {
    if (!eventId) {
      setStatusState('error');
      setErrorMessage('Missing Event ID in the QR code.');
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const ev = await fetchEventById(eventId);
      if (!ev) {
        setStatusState('error');
        setErrorMessage('This event does not exist or has expired.');
        return;
      }
      setEvent(ev);

      // If already logged in, check duplication status
      if (user.isAuthenticated) {
        const attendees = await fetchEventAttendees(eventId);
        const alreadyChecked = attendees.some(r => r.checkedIn && (
          (user.ethAddress && r.ethAddress?.toLowerCase() === user.ethAddress.toLowerCase()) ||
          (user.mssv && r.mssv === user.mssv)
        ));
        if (alreadyChecked) {
          setStatusState('already');
        } else {
          setStatusState('ready');
        }
      }
    } catch (e) {
      console.error(e);
      setStatusState('error');
      setErrorMessage('Failed to query event records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvent();
  }, [eventId, user.isAuthenticated]);

  const handleOCIDLogin = () => {
    try {
      ocAuth.signInWithRedirect({ state: 'opencampus' });
    } catch (err) {
      // Sandbox fallback mock session
      setUser({
        isAuthenticated: true,
        method: 'ocid',
        ocid: 'alex.edu',
        ethAddress: '0x326C977E6e1C8116C92fD9CDE32A44B04C0dBbB6',
        mssv: null,
        fullName: 'Alex Mercer',
        role: 'student'
      });
    }
  };

  const handleLocalSubmit = (e) => {
    e.preventDefault();
    if (!mssvInput.trim() || !fullNameInput.trim()) return;

    setUser({
      isAuthenticated: true,
      method: 'mssv',
      ocid: null,
      ethAddress: '0x' + Array.from({length: 40}, () => Math.floor(Math.random()*16).toString(16)).join(''),
      mssv: mssvInput.trim(),
      fullName: fullNameInput.trim(),
      role: 'student'
    });
  };

  const showToast = useToastStore((state) => state.showToast);

  const handleConfirmCheckin = async () => {
    setStatusState('processing');
    try {
      const res = await checkInStudent(eventId, user);
      if (res.success) {
        setTxHash(res.txHash);
        setStatusState('success');
        showToast('Attendance confirmed! Badge issued.', 'success');
      } else {
        setStatusState('error');
        setErrorMessage(res.error || 'Check-in failed.');
        showToast(res.error || 'Check-in failed.', 'error');
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
          <span className="bg-accent-blue/10 text-accent-blue text-[10px] font-extrabold uppercase px-2 py-0.5 rounded">
            Student Check-in
          </span>
        </div>

        {/* States Switcher */}

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

            <div className="bg-accent-blue/5 border border-accent-blue/15 rounded-xl p-4 flex items-center gap-4">
              <div className="text-center bg-accent-blue text-white rounded-lg p-2 min-w-[70px]">
                <span className="text-xs uppercase font-bold block leading-none">SBT</span>
                <span className="text-xl font-black">+{event?.points}</span>
                <span className="text-[9px] block uppercase leading-none">pts</span>
              </div>
              <p className="text-xs text-text-secondary">
                Confirming attendance issues a Soulbound Token credential directly to your student badge profile.
              </p>
            </div>

            {/* Login section if unauthenticated */}
            {!user.isAuthenticated ? (
              <div className="space-y-4 pt-2">
                <div className="text-xs font-semibold text-text-secondary text-center uppercase tracking-wider">
                  Authentication Required
                </div>
                {!showLocalLogin ? (
                  <>
                    <button
                      onClick={handleOCIDLogin}
                      className="w-full py-3 bg-accent-blue hover:bg-accent-hover text-white text-sm font-semibold rounded-md shadow-sm transition-colors"
                    >
                      Connect with OCID
                    </button>
                    <button
                      onClick={() => setShowLocalLogin(true)}
                      className="w-full py-3 bg-white border border-border text-navy text-sm font-semibold rounded-md hover:bg-slate-50 transition-colors"
                    >
                      Login with Student ID (MSSV)
                    </button>
                  </>
                ) : (
                  <form onSubmit={handleLocalSubmit} className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">
                        Full Name
                      </label>
                      <input
                        type="text"
                        required
                        value={fullNameInput}
                        onChange={(e) => setFullNameInput(e.target.value)}
                        placeholder="John Doe"
                        className="w-full border-b border-border py-1.5 text-xs focus:outline-none focus:border-accent-blue"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">
                        Student ID (MSSV)
                      </label>
                      <input
                        type="text"
                        required
                        value={mssvInput}
                        onChange={(e) => setMssvInput(e.target.value)}
                        placeholder="IT202201"
                        className="w-full border-b border-border py-1.5 text-xs focus:outline-none focus:border-accent-blue"
                      />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowLocalLogin(false)}
                        className="w-1/3 py-2 border border-border rounded text-xs text-text-secondary hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="w-2/3 py-2 bg-navy text-white rounded text-xs font-semibold hover:bg-navy-light"
                      >
                        Sign In
                      </button>
                    </div>
                  </form>
                )}
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
                <button
                  onClick={handleConfirmCheckin}
                  className="w-full py-3 bg-success hover:bg-success/90 text-white text-sm font-semibold rounded-md shadow-sm transition-colors"
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
            <h2 className="text-lg font-bold text-navy">Issuing Soulbound Token...</h2>
            <p className="text-xs text-text-secondary">
              Giao dịch đang được xác thực on-chain. Vui lòng giữ kết nối Internet.
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
                <span className="text-text-secondary">Earned Badge:</span>
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
              View My Badge Wallet
            </Link>
          </div>
        )}

        {/* 4. Already State */}
        {statusState === 'already' && (
          <div className="text-center py-10 space-y-6">
            <div className="text-warning text-4xl font-extrabold">&bull; Info &bull;</div>
            <div className="space-y-2">
              <h2 className="text-lg font-bold text-navy">Already Checked In</h2>
              <p className="text-xs text-text-secondary">
                You have already confirmed attendance and claimed your SBT badge for this event.
              </p>
            </div>
            <Link
              to="/dashboard"
              className="w-full py-2.5 bg-surface border border-border text-navy text-xs font-semibold rounded block text-center hover:bg-slate-100"
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
