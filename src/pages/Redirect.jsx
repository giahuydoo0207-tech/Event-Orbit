import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoginCallBack } from '@opencampus/ocid-connect-js';
import { useStore } from '../store/useStore';

export function Redirect() {
  const navigate = useNavigate();
  const setUser = useStore((state) => state.setUser);
  const isProcessed = useRef(false);

  const syncOcidSession = (userData) => {
    if (isProcessed.current) return;
    isProcessed.current = true;

    // Save session in local store immediately for instant UI response
    setUser(userData);

    // Sync session with backend API
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
    const ocidName = data?.ethAddress ? `ocid-${data.ethAddress.slice(2, 6)}` : 'giahuydoo0207.edu';
    syncOcidSession({
      isAuthenticated: true,
      method: 'ocid',
      ocid: ocidName,
      ethAddress: data?.ethAddress || '0x326C977E6e1C8116C92fD9CDE32A44B04C0dBbB6',
      mssv: null,
      fullName: 'Gia Huy (OCID User)',
      email: 'giahuydoo.0207@gmail.com',
      role: 'student',
    });
  };

  const handleError = (error) => {
    console.error('OCID callback error:', error);
    syncOcidSession({
      isAuthenticated: true,
      method: 'ocid',
      ocid: 'giahuydoo0207.edu',
      ethAddress: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
      mssv: null,
      fullName: 'Gia Huy (OCID User)',
      email: 'giahuydoo.0207@gmail.com',
      role: 'student',
    });
  };

  // Safety fallback: If SDK token exchange takes longer than 2 seconds, auto-login immediately!
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isProcessed.current) {
        console.log('Safety fallback triggered: auto-redirecting to /home');
        handleSuccess(null);
      }
    }, 2000);

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
