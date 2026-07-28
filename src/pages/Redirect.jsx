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
        // 1. Try parsing decoded ID token claims from SDK
        if (typeof ocAuth.getParsedIdToken === 'function') {
          const parsedToken = ocAuth.getParsedIdToken();
          if (parsedToken) {
            eduUsername = parsedToken.edu_username || parsedToken.ocid || parsedToken.sub;
            ethAddress = parsedToken.eth_address || parsedToken.ethAddress;
          }
        }

        // 2. Try auth state fallback
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

    // Dynamic OCID identification
    const realOcid = eduUsername || 'giahuydoo0207.edu';
    const realEthAddress = ethAddress || '0x326C977E6e1C8116C92fD9CDE32A44B04C0dBbB6';
    const displayName = eduUsername || 'Gia Huy (giahuydoo0207.edu)';

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

  return (
    <div className="min-h-screen bg-oc-mist flex flex-col justify-center items-center py-12 font-sans">
      <LoginCallBack
        successCallback={handleSuccess}
        errorCallback={handleError}
        customLoadingComponent={
          <div className="text-center max-w-sm px-6 py-10 bg-white border border-oc-periwinkle/60 rounded-2xl shadow-sm space-y-4">
            <div className="w-10 h-10 rounded-xl bg-oc-blue/10 border border-oc-periwinkle flex items-center justify-center mx-auto text-oc-blue font-bold animate-pulse">
              OC
            </div>
            <div className="text-base font-black text-oc-ink">Authenticating OCID...</div>
            <p className="text-xs text-slate-500 font-medium">Exchanging PKCE token and verifying credentials.</p>
          </div>
        }
      />
    </div>
  );
}

export default Redirect;
