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
    <div className="flex flex-col min-h-screen bg-white text-text-primary">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Brand Logo */}
            <div className="flex items-center">
              <Link to="/" className="text-xl font-bold text-navy tracking-tight">
                Event Orbit
              </Link>
            </div>

            {/* Navigation Links */}
            <nav className="flex items-center space-x-3 sm:space-x-6">
              <button
                onClick={() => setSearchOpen(true)}
                className="text-sm font-medium text-text-secondary hover:text-navy transition-colors flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <span className="hidden sm:inline">Search</span>
              </button>
              <Link to="/events" className="text-sm font-medium text-text-secondary hover:text-navy transition-colors">
                Events
              </Link>
              <Link to="/chapters" className="text-sm font-medium text-text-secondary hover:text-navy transition-colors">
                Chapters
              </Link>
              
              {user.isAuthenticated ? (
                <>
                  {user.role === 'student' ? (
                    <Link to="/home" className="text-sm font-medium text-accent-blue hover:text-accent-hover transition-colors">
                      My Hub
                    </Link>
                  ) : (
                    <Link to="/manage" className="text-sm font-medium text-accent-blue hover:text-accent-hover transition-colors">
                      Manage
                    </Link>
                  )}
                  <span className="text-xs text-text-secondary hidden sm:inline-block">
                    {user.ocid || user.mssv || 'User'}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="text-xs font-semibold text-error hover:underline"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  className="bg-navy text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-navy-light transition-all"
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
      <footer className="border-t border-border py-8 bg-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center sm:flex sm:justify-between sm:items-center">
          <p className="text-xs text-text-secondary">
            &copy; 2026 Event Orbit. All rights reserved.
          </p>
          <p className="text-xs text-text-secondary mt-2 sm:mt-0">
            Powered by Open Campus &bull; Certified on EDU Chain
          </p>
        </div>
      </footer>
      <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
export default PublicLayout;
