import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import SearchModal from '../components/SearchModal';

export function PublicLayout({ children }) {
  const { user, logout } = useStore();
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="flex flex-col min-h-screen bg-oc-mist text-oc-ink font-sans">
      {/* Header */}
      <header className="border-b border-oc-periwinkle/50 bg-white/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Brand Logo - Event Orbit in Poppins ExtraBold OC Blue */}
            <div className="flex items-center gap-2">
              <Link to="/" className="text-xl font-extrabold text-oc-blue tracking-tight hover:opacity-90 transition-opacity">
                Event Orbit
              </Link>
              <span className="badge-kicker text-[9px] px-1.5 py-0.5 rounded bg-oc-mist text-oc-blue border border-oc-periwinkle/60">
                EDU CHAIN
              </span>
            </div>

            {/* Navigation Links */}
            <nav className="flex items-center space-x-3 sm:space-x-6">
              <button
                onClick={() => setSearchOpen(true)}
                className="text-xs font-medium text-slate-600 hover:text-oc-blue transition-colors flex items-center gap-1.5 bg-oc-mist px-3 py-1.5 rounded-lg border border-oc-periwinkle/50"
              >
                <svg className="w-3.5 h-3.5 text-oc-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <span className="hidden sm:inline">Search</span>
              </button>
              <Link to="/events" className="text-xs font-semibold text-slate-700 hover:text-oc-blue transition-colors">
                Events
              </Link>
              <Link to="/chapters" className="text-xs font-semibold text-slate-700 hover:text-oc-blue transition-colors">
                Chapters
              </Link>
              
              {user.isAuthenticated ? (
                <>
                  {user.role === 'student' ? (
                    <Link to="/home" className="text-xs font-bold text-oc-blue hover:underline transition-colors">
                      My Hub
                    </Link>
                  ) : (
                    <Link to="/manage" className="text-xs font-bold text-oc-blue hover:underline transition-colors">
                      Manage Hub
                    </Link>
                  )}
                  <span className="text-[11px] text-slate-500 font-mono hidden sm:inline-block">
                    {user.ocid || user.mssv || 'User'}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="text-xs font-semibold text-red-600 hover:underline"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  className="bg-oc-blue hover:bg-oc-indigo text-white px-4 py-2 rounded-lg text-xs font-bold shadow-sm transition-all"
                >
                  Sign In
                </Link>
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-oc-periwinkle/50 py-8 bg-white text-oc-ink">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center sm:flex sm:justify-between sm:items-center">
          <p className="text-xs text-slate-500">
            &copy; 2026 Event Orbit. Built for the Open Campus Ecosystem.
          </p>
          <p className="text-xs text-slate-500 mt-2 sm:mt-0 font-medium">
            Powered by <span className="font-bold text-oc-blue">Open Campus</span> &bull; Verified on <span className="font-bold text-oc-blue">EDU Chain</span>
          </p>
        </div>
      </footer>
      <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
export default PublicLayout;
