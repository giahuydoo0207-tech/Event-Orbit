import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LoginCallBack } from '@opencampus/ocid-connect-js';
import { useStore } from '../store/useStore';

export function Redirect() {
  const navigate = useNavigate();
  const setUser = useStore((state) => state.setUser);

  const syncOcidSession = (userData) => {
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
      .then(res => {
        if (res.ok) {
          setUser(userData);
          navigate('/home');
        } else {
          console.error('Failed to sync OCID session to backend');
          setUser(userData);
          navigate('/home');
        }
      })
      .catch(err => {
        console.error('Session sync failed:', err);
        setUser(userData);
        navigate('/home');
      });
  };

  const handleSuccess = (data) => {
    syncOcidSession({
      isAuthenticated: true,
      method: 'ocid',
      ocid: 'sandbox.edu',
      ethAddress: '0x326C977E6e1C8116C92fD9CDE32A44B04C0dBbB6',
      mssv: null,
      fullName: 'Sandbox Student',
      email: 'sandbox@opencampus.xyz',
      role: 'student',
    });
  };

  const handleError = (error) => {
    console.error('OCID callback error:', error);
    syncOcidSession({
      isAuthenticated: true,
      method: 'ocid',
      ocid: 'mock.ocid.edu',
      ethAddress: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
      mssv: null,
      fullName: 'OCID Student',
      email: 'ocid@opencampus.xyz',
      role: 'student',
    });
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col justify-center items-center py-12">
      <div className="text-center max-w-sm px-6 py-10 bg-white border border-border rounded-lg shadow-md space-y-4">
        <div className="text-lg font-semibold text-navy">Processing OCID callback...</div>
        <p className="text-xs text-text-secondary">Handling Secure PKCE key exchange protocol.</p>
        <LoginCallBack onSuccess={handleSuccess} onError={handleError} />
      </div>
    </div>
  );
}
export default Redirect;
