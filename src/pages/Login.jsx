import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOCAuth } from '@opencampus/ocid-connect-js';
import { useStore } from '../store/useStore';
import useToastStore from '../store/useToastStore';

export function Login() {
  const { ocAuth } = useOCAuth();
  const loginAsDemo = useStore((state) => state.loginAsDemo);
  const setUser = useStore((state) => state.setUser);
  const navigate = useNavigate();

  // MSSV Login state
  const [showMssvForm, setShowMssvForm] = useState(false);
  const [mssv, setMssv] = useState('');
  const [fullName, setFullName] = useState('');
  const [loginRole, setLoginRole] = useState('student'); // 'student' | 'organizer'
  const showToast = useToastStore((state) => state.showToast);

  const handleOCIDLogin = () => {
    try {
      ocAuth.signInWithRedirect({ state: 'opencampus' });
    } catch (err) {
      console.error(err);
      showToast('OCID Auth is not initialized or configured correctly.', 'error');
    }
  };

  const handleMssvSubmit = (e) => {
    e.preventDefault();
    if (!mssv.trim() || !fullName.trim()) {
      showToast('Please fill in all fields.', 'error');
      return;
    }

    // Set mock user session in store
    setUser({
      isAuthenticated: true,
      method: 'mssv',
      ocid: null,
      ethAddress: '0x' + Array.from({length: 40}, () => Math.floor(Math.random()*16).toString(16)).join(''),
      mssv: mssv.trim(),
      fullName: fullName.trim(),
      email: `${mssv.trim().toLowerCase()}@student.edu.vn`,
      role: loginRole, // Can be student or organizer
    });

    if (loginRole === 'organizer') {
      navigate('/manage');
    } else {
      navigate('/home');
    }
  };

  const handleDemoLogin = (role) => {
    loginAsDemo(role);
    if (role === 'organizer') {
      navigate('/manage');
    } else {
      navigate('/home');
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
          


          {!showMssvForm ? (
            <div className="space-y-4">
              <button
                onClick={handleOCIDLogin}
                className="w-full flex justify-center py-3 px-4 rounded-md text-sm font-semibold text-white bg-accent-blue hover:bg-accent-hover transition-colors"
              >
                Connect with OCID
              </button>

              <button
                onClick={() => setShowMssvForm(true)}
                className="w-full flex justify-center py-3 px-4 rounded-md text-sm font-semibold text-navy bg-white border border-navy/20 hover:bg-surface transition-colors"
              >
                Login with Student ID (MSSV)
              </button>
            </div>
          ) : (
            <form onSubmit={handleMssvSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full border-b border-border py-2 text-sm focus:outline-none focus:border-accent-blue"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">
                  Student ID (MSSV) / Organizer ID
                </label>
                <input
                  type="text"
                  required
                  value={mssv}
                  onChange={(e) => setMssv(e.target.value)}
                  placeholder="e.g. IT202201"
                  className="w-full border-b border-border py-2 text-sm focus:outline-none focus:border-accent-blue"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase mb-2">
                  Role Type
                </label>
                <div className="flex space-x-4">
                  <label className="flex items-center text-sm cursor-pointer">
                    <input
                      type="radio"
                      name="role"
                      value="student"
                      checked={loginRole === 'student'}
                      onChange={() => setLoginRole('student')}
                      className="mr-2"
                    />
                    Student
                  </label>
                  <label className="flex items-center text-sm cursor-pointer">
                    <input
                      type="radio"
                      name="role"
                      value="organizer"
                      checked={loginRole === 'organizer'}
                      onChange={() => setLoginRole('organizer')}
                      className="mr-2"
                    />
                    Organizer
                  </label>
                </div>
              </div>

              <div className="pt-2 flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowMssvForm(false)}
                  className="w-1/3 py-2 border border-border rounded text-sm text-text-secondary font-medium hover:bg-surface"
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="w-2/3 py-2 bg-navy text-white rounded text-sm font-semibold hover:bg-navy-light"
                >
                  Enter Portal
                </button>
              </div>
            </form>
          )}

          {/* Demo Accounts section */}
          <div className="mt-6 pt-6 border-t border-border">
            <p className="text-xs text-text-secondary text-center mb-3">Demo accounts</p>
            <div className="flex gap-3">
              <button
                onClick={() => handleDemoLogin('student')}
                className="flex-1 py-2 border border-border rounded-md text-xs font-semibold text-navy bg-white hover:bg-slate-50 transition-colors"
              >
                Log in as Student
              </button>
              <button
                onClick={() => handleDemoLogin('organizer')}
                className="flex-1 py-2 border border-border rounded-md text-xs font-semibold text-navy bg-white hover:bg-slate-50 transition-colors"
              >
                Log in as Chapter Organizer
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
export default Login;
