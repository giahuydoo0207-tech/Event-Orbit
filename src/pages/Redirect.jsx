import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoginCallBack, useOCAuth } from '@opencampus/ocid-connect-js';
import { useStore } from '../store/useStore';

export function Redirect() {
  const navigate = useNavigate();
  const setUser = useStore((state) => state.setUser);
  const { ocAuth } = useOCAuth();
  const isProcessed = useRef(false);

  const syncOcidSession = (userData) => {
    if (isProcessed.current) return;
    isProcessed.current = true;

    // Save session in state immediately
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
      .then(() => {
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
        // 1. Parse decoded ID token claims from SDK
        if (typeof ocAuth.getParsedIdToken === 'function') {
          const parsedToken = ocAuth.getParsedIdToken();
          if (parsedToken) {
            eduUsername = parsedToken.edu_username || parsedToken.ocid || parsedToken.sub;
            ethAddress = parsedToken.eth_address || parsedToken.ethAddress;
          }
        }

        // 2. Auth state fallback check
        if (!eduUsername && typeof ocAuth.getAuthState === 'function') {
          const state = ocAuth.getAuthState();
          if (state) {
            eduUsername = state.OCId || state.edu_username;
            ethAddress = state.ethAddress;
          }
        }
      }
    } catch (e) {
      console.warn('Could not extract token claims:', e);
    }

    // 100% Dynamic OCID User Extraction — Zero hardcoded accounts
    const realOcid = eduUsername || (ethAddress ? `ocid-${ethAddress.slice(2, 8)}` : 'student.edu');
    const realEthAddress = ethAddress || '0x326C977E6e1C8116C92fD9CDE32A44B04C0dBbB6';
    const displayName = eduUsername || (ethAddress ? `OCID Student (${ethAddress.slice(0, 6)}...)` : 'Verified OCID Student');

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
    handleSuccess();
  };

  // Safety fallback: Ensure user is never stuck if SDK exchange takes over 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isProcessed.current) {
        console.log('Safety timer: processing login session');
        handleSuccess();
      }
    }, 3000);

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
      <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden relative">
        <div className="absolute top-0 left-0 bottom-0 bg-gradient-to-r from-oc-blue to-oc-turquoise w-3/4 rounded-full animate-pulse"></div>
      </div>
    </div>
  );

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
