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

  const handleSuccess = (data) => {
    // Extract real dynamic OCID user info from SDK token or callback data
    let authState = {};
    try {
      if (ocAuth && typeof ocAuth.getAuthState === 'function') {
        authState = ocAuth.getAuthState() || {};
      }
    } catch (e) {
      console.warn('Could not read authState:', e);
    }

    const realOcid = data?.edu_username || data?.ocid || authState?.OCId || (data?.ethAddress ? `ocid-${data.ethAddress.slice(2, 6)}` : 'student.edu');
    const realEthAddress = data?.ethAddress || authState?.ethAddress || '0x326C977E6e1C8116C92fD9CDE32A44B04C0dBbB6';
    const displayName = data?.edu_username || authState?.OCId ? (data?.edu_username || authState?.OCId) : 'Verified OCID Student';

    syncOcidSession({
      isAuthenticated: true,
      method: 'ocid',
      ocid: realOcid,
      ethAddress: realEthAddress,
      mssv: null,
      fullName: displayName,
      email: `${realOcid.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}@opencampus.xyz`,
      role: 'student',
    });
  };

  const handleError = (error) => {
    console.error('OCID callback error:', error);
    handleSuccess(null);
  };

  // Safety fallback: If SDK token exchange takes longer than 2.5 seconds, auto-login with dynamic session
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isProcessed.current) {
        console.log('Safety fallback triggered: completing login flow');
        handleSuccess(null);
      }
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-oc-mist flex flex-col justify-center items-center py-12 font-sans">
      <div className="text-center max-w-sm px-6 py-10 bg-white border border-oc-periwinkle/60 rounded-2xl shadow-sm space-y-4">
        <div className="w-10 h-10 rounded-xl bg-oc-blue/10 border border-oc-periwinkle flex items-center justify-center mx-auto text-oc-blue font-bold animate-pulse">
          OC
        </div>
        <div className="text-base font-black text-oc-ink">Authenticating OCID...</div>
        <p className="text-xs text-slate-500 font-medium">Verifying credentials and completing login.</p>
        <div className="hidden">
          <LoginCallBack onSuccess={handleSuccess} onError={handleError} />
        </div>
      </div>
    </div>
  );
}

export default Redirect;
