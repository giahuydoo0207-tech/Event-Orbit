import React from 'react';
import { useOCAuth } from '@opencampus/ocid-connect-js';
import useToastStore from '../store/useToastStore';

export function Login() {
  const { ocAuth } = useOCAuth();
  const showToast = useToastStore((state) => state.showToast);

  const handleOCIDLogin = (destination) => {
    try {
      sessionStorage.setItem('ocidReturnTo', destination);
      ocAuth.signInWithRedirect({ state: 'opencampus' });
    } catch (err) {
      console.error(err);
      showToast('OCID Auth is not initialized or configured correctly.', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <h1 className="text-3xl font-extrabold text-navy tracking-tight">
          Event Orbit
        </h1>
        <p className="mt-2 text-sm text-text-secondary">
          Student Events and Digital Credentials
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white px-6 py-8 border border-border sm:rounded-lg sm:px-10">
          <div className="space-y-6">
            <div className="space-y-2">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-accent-blue">
                Open Campus ID
              </p>
              <h2 className="text-lg font-bold text-navy">Connect with Open Campus ID</h2>
              <p className="text-sm text-text-secondary">Choose where you want to continue.</p>
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={() => handleOCIDLogin('/home')}
                className="w-full flex justify-center py-3 px-4 rounded-md text-sm font-semibold text-white bg-accent-blue hover:bg-accent-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-blue transition-colors"
              >
                Student
              </button>
              <button
                type="button"
                onClick={() => handleOCIDLogin('/manage')}
                className="w-full flex justify-center py-3 px-4 rounded-md border border-accent-blue text-sm font-semibold text-accent-blue bg-white hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-blue transition-colors"
              >
                Manage
              </button>
              <button
                type="button"
                onClick={() => handleOCIDLogin('/admin')}
                className="w-full flex justify-center py-3 px-4 rounded-md border border-navy text-sm font-semibold text-navy bg-white hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy transition-colors"
              >
                Admin
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
export default Login;
