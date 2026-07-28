import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LoginCallBack, useOCAuth } from '@opencampus/ocid-connect-js';
import { useStore } from '../store/useStore';
import { LoadingBar } from '../components/LoadingBar';

export function Redirect() {
  const navigate = useNavigate();
  const setUser = useStore((state) => state.setUser);
  const { ocAuth } = useOCAuth();
  const isProcessed = useRef(false);
  const [authError, setAuthError] = useState(null);

  const syncOcidSession = (userData) => {
    if (isProcessed.current) return;
    isProcessed.current = true;

    // Save session in store immediately
    setUser(userData);

    // Sync session with backend database
    fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ocid: userData.ocid,
        fullName: userData.fullName,
        role: userData.role,
        ethAddress: userData.ethAddress
      })
    })
      .then((res) => {
        if (!res.ok) {
          console.warn('Backend session endpoint returned non-200 status');
        }
        navigate('/home', { replace: true });
      })
      .catch((err) => {
        console.error('Backend session sync error:', err);
        navigate('/home', { replace: true });
      });
  };

  const handleSuccess = () => {
    let eduUsername = null;
    let ethAddress = null;

    try {
      if (ocAuth) {
        // 1. Parse decoded ID token claims strictly matching @opencampus/ocid-connect-js SDK spec
        if (typeof ocAuth.getParsedIdToken === 'function') {
          const parsedToken = ocAuth.getParsedIdToken();
          if (parsedToken) {
            eduUsername = parsedToken.edu_username || null;
            ethAddress = parsedToken.eth_address || null;
          }
        }

        // 2. Auth state fallback check (matching AuthInfoManager.js spec: OCId & ethAddress)
        if (!eduUsername && typeof ocAuth.getAuthState === 'function') {
          const state = ocAuth.getAuthState();
          if (state) {
            eduUsername = state.OCId || null;
            ethAddress = ethAddress || state.ethAddress || null;
          }
        }
      }
    } catch (e) {
      console.warn('Could not extract token claims:', e);
    }

    // STRICT SECURITY: If neither eduUsername nor ethAddress is present, REJECT authentication!
    if (!eduUsername && !ethAddress) {
      console.error('OCID authentication failed: No valid identity claims found in token.');
      setAuthError('Unable to verify identity claims from Open Campus ID. Please sign in again.');
      return;
    }

    const realOcid = eduUsername || `ocid-${ethAddress.slice(2, 8)}`;
    const realEthAddress = ethAddress || null;
    const displayName = eduUsername || `OCID Student (${ethAddress.slice(0, 6)}...)`;

    syncOcidSession({
      isAuthenticated: true,
      method: 'ocid',
      ocid: realOcid,
      ethAddress: realEthAddress,
      mssv: null,
      fullName: displayName,
      email: `${realOcid.replace(/[^a-zA-Z0-9._-]/g, '').toLowerCase()}@opencampus.xyz`,
      role: 'student',
    });
  };

  const handleError = (error) => {
    console.error('OCID callback error:', error);
    const errorMsg = error?.message || 'Authentication was cancelled or failed on Open Campus ID.';
    setAuthError(errorMsg);
  };

  // Timeout Detector: If OAuth exchange takes longer than 15 seconds, report timeout error
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isProcessed.current) {
        console.warn('OCID authentication timed out after 15s');
        setAuthError('Authentication timed out. Open Campus ID server did not respond in time.');
      }
    }, 15000);

    return () => clearTimeout(timer);
  }, []);

  // Redesigned Loading Component — Open Campus Deep Navy Theme
  const OpenCampusLoadingCard = (
    <div className="relative z-10 text-center max-w-sm w-full mx-4 px-8 py-10 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md space-y-6 shadow-2xl">
      {/* Brand Header */}
      <div className="flex items-center justify-center gap-2">
        <span className="text-xl font-extrabold text-white tracking-tight">Event Orbit</span>
        <span className="badge-kicker text-[9px] px-1.5 py-0.5 rounded bg-oc-blue/40 text-oc-turquoise border border-oc-turquoise/30">
          EDU CHAIN
        </span>
      </div>

      {/* Glowing Dual-Ring Spinner */}
      <div className="relative w-14 h-14 mx-auto flex items-center justify-center">
        <div className="absolute inset-0 rounded-full border-2 border-oc-blue/20"></div>
        <div className="absolute inset-0 rounded-full border-2 border-t-oc-turquoise border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
        <div className="w-3 h-3 rounded-full bg-oc-turquoise animate-ping"></div>
      </div>

      {/* Text Info */}
      <div className="space-y-2">
        <h2 className="text-lg font-black text-white tracking-tight">Authenticating OCID...</h2>
        <p className="badge-kicker text-oc-turquoise/80 text-[10px] tracking-widest uppercase">
          Exchanging PKCE token &amp; verifying credentials
        </p>
      </div>

      {/* Animated Progress Bar */}
      <LoadingBar variant="dark" />
    </div>
  );

  // Error State Component — Matches Deep Navy Theme
  if (authError) {
    return (
      <div className="min-h-screen bg-oc-navy flex flex-col justify-center items-center relative overflow-hidden font-sans">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(239,68,68,0.15),transparent_60%)]" />
        <div className="relative z-10 text-center max-w-sm w-full mx-4 px-8 py-10 rounded-2xl bg-white/5 border border-red-500/30 backdrop-blur-md space-y-6 shadow-2xl">
          <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto text-red-400">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>

          <div className="space-y-2">
            <h2 className="text-lg font-black text-white tracking-tight">Authentication Failed</h2>
            <p className="text-xs text-slate-300 font-medium leading-relaxed">
              {authError}
            </p>
          </div>

          <Link
            to="/login"
            className="inline-block px-6 py-2.5 bg-oc-blue text-white text-xs font-bold rounded-xl shadow-md hover:bg-oc-indigo transition-colors uppercase tracking-wider"
          >
            Return to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-oc-navy flex flex-col justify-center items-center relative overflow-hidden font-sans">
      {/* Signature background glows */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(0,237,190,0.15),transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(20,27,235,0.25),transparent_60%)]" />

      <LoginCallBack
        successCallback={handleSuccess}
        errorCallback={handleError}
        customLoadingComponent={OpenCampusLoadingCard}
      />
    </div>
  );
}

export default Redirect;
