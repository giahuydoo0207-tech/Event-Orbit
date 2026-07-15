import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';

export function DashboardLayout({ children }) {
  const { user, logout } = useStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isOrganizer = user.role === 'organizer';

  // Navigation Links definition
  const navLinks = isOrganizer ? [
    { label: 'Manage Chapters', path: '/manage' },
    { label: 'Explore Events', path: '/events' }
  ] : [
    { label: 'Home', path: '/home' },
    { label: 'My Events', path: '/my-events' },
    { label: 'My Achievements', path: '/dashboard' },
    { label: 'Following', path: '/following' }
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-white text-text-primary">
      {/* Mobile Header Bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-navy text-white flex justify-between items-center px-4 z-40 border-b border-navy-light">
        <span className="font-bold text-lg">Event Orbit</span>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="text-xs uppercase tracking-wider font-semibold border border-white/20 px-3 py-1.5 rounded bg-white/5 active:bg-white/10"
        >
          {mobileMenuOpen ? 'Close Menu' : 'Open Menu'}
        </button>
      </div>

      {/* Sidebar Overlay (Mobile) */}
      {mobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-30 transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={`
        fixed top-0 bottom-0 left-0 w-64 bg-navy text-white border-r border-navy-light z-30 transition-transform duration-200 flex flex-col justify-between p-6
        md:translate-x-0 md:sticky md:top-0 md:h-screen shrink-0
        ${mobileMenuOpen ? 'translate-x-0 pt-20 md:pt-6' : '-translate-x-full'}
      `}>
        <div className="space-y-8">
          {/* Logo */}
          <div className="hidden md:block">
            <Link to="/" className="text-xl font-bold tracking-tight text-white block">
              Event Orbit
            </Link>
            <span className="text-[10px] text-text-secondary uppercase tracking-widest font-semibold block mt-1">
              {isOrganizer ? 'Organizer Portal' : 'Student Hub'}
            </span>
          </div>

          {/* Menu Links */}
          <nav className="flex flex-col space-y-2">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.path ||
                (link.path === '/manage' && location.pathname.startsWith('/manage'));
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-4 py-3 rounded text-sm font-medium transition-colors block
                    ${isActive
                      ? 'bg-navy-light text-white font-semibold border-l-2 border-accent-blue'
                      : 'text-white/70 hover:text-white hover:bg-white/5'
                    }
                  `}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer Account info */}
        <div className="border-t border-white/10 pt-4 mt-6">
          <div className="bg-white/5 rounded p-3 mb-4 text-xs space-y-1">
            <div className="text-white/40 uppercase tracking-widest text-[9px] font-bold">Logged in as</div>
            <div className="font-semibold text-white/90 truncate">{user.fullName || 'User'}</div>
            {user.ocid && (
              <div className="text-accent-blue truncate text-[10px] font-mono">{user.ocid}</div>
            )}
            {user.mssv && (
              <div className="text-accent-blue font-mono text-[10px]">MSSV: {user.mssv}</div>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="w-full text-center text-xs font-semibold text-error bg-error/10 hover:bg-error/20 border border-error/20 py-2.5 rounded transition-all"
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Page Area */}
      <main className="flex-grow h-screen overflow-y-auto pt-16 md:pt-0">
        <div className="max-w-6xl mx-auto p-6 md:p-10">
          {children}
        </div>
      </main>
    </div>
  );
}
export default DashboardLayout;
