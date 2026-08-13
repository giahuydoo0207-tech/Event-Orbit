import React from 'react';
import { useOCAuth } from '@opencampus/ocid-connect-js';
import useToastStore from '../store/useToastStore';

export function Login() {
  const { ocAuth } = useOCAuth();
  const showToast = useToastStore((state) => state.showToast);

  const handleOCIDLogin = () => {
    try {
      const currentPath = window.history.state?.usr?.from;
      sessionStorage.setItem('ocidReturnTo', typeof currentPath === 'string' ? currentPath : '/');
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
          Student Event & SBT Certification Portal
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 border border-border sm:rounded-lg sm:px-10">
          


            <div className="space-y-4">
              <button
                onClick={handleOCIDLogin}
                className="w-full flex justify-center py-3 px-4 rounded-md text-sm font-semibold text-white bg-accent-blue hover:bg-accent-hover transition-colors"
              >
                Connect with Open Campus ID
              </button>
              <div className="text-center space-y-1">
                <p className="text-sm font-semibold text-navy">Sign in with your verified Open Campus ID</p>
                <p className="text-xs text-text-secondary">Students and organizers use the same secure login</p>
              </div>
            </div>

        </div>
      </div>
    </div>
  );
}
export default Login;
