import React, { useState, Suspense } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { LoadingBar } from '../components/LoadingBar';
import { useOrganizerSession } from '../contexts/OrganizerSessionContext';
import { isOrganizerNavLinkActive } from '../lib/organizerNavigation';

export function DashboardLayout({ children }) {
  const { user, logout } = useStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const organizerSession = useOrganizerSession();

  const handleLogout = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  const isManageSection = location.pathname.startsWith('/manage');
  const isAdminSection = location.pathname.startsWith('/admin');

  // Navigation Links & Kicker based on current portal section
  const portalKicker = isAdminSection
    ? 'Admin Console'
    : isManageSection
    ? 'Organizer Portal'
    : 'Student Hub';

  const navLinks = isAdminSection
    ? [{ label: 'Admin Console', path: '/admin' }]
    : isManageSection
    ? [
        { label: 'Manage Chapters', path: '/manage' },
        { label: 'Explore Events', path: '/manage/explore' },
      ]
    : [
        { label: 'Home', path: '/home' },
        { label: 'My Events', path: '/my-events' },
        { label: 'My Achievements', path: '/dashboard' },
        { label: 'Following', path: '/following' },
      ];

  return (
    <div className="flex min-h-[100dvh] overflow-hidden bg-oc-mist text-oc-ink font-sans">
      {/* Accessibility Skip Link */}
      <a href="#main-content" className="skip-to-content">Skip to main content</a>
      {/* Mobile Header Bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-oc-navy text-white flex justify-between items-center px-4 z-40 border-b border-oc-navy/80">
        <span className="font-extrabold text-lg text-white">Event Orbit</span>
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
          className="md:hidden fixed inset-0 bg-black/60 z-30 transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Navigation - Open Campus Deep Navy theme */}
      <aside className={`
        fixed top-0 bottom-0 left-0 w-64 bg-oc-navy text-white border-r border-oc-navy/80 z-30 transition-transform duration-200 flex flex-col justify-between p-6
        md:translate-x-0 md:sticky md:top-0 md:h-[100dvh] shrink-0
        ${mobileMenuOpen ? 'translate-x-0 pt-20 md:pt-6' : '-translate-x-full'}
      `}>
        <div className="space-y-8">
          {/* Logo */}
          <div className="hidden md:block">
            <Link to="/" className="text-xl font-extrabold tracking-tight text-white block">
              Event Orbit
            </Link>
            <span className="badge-kicker text-[9px] text-oc-turquoise uppercase tracking-widest font-bold block mt-1">
              {portalKicker}
            </span>
          </div>

          {/* Menu Links */}
          <nav className="flex flex-col space-y-2">
            {navLinks.map((link) => {
              const isActive = isManageSection
                ? isOrganizerNavLinkActive(location.pathname, link.path)
                : location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-4 py-3 rounded-md text-xs font-semibold flex items-center justify-between transition-colors
                    ${isActive
                      ? 'bg-oc-blue text-white font-bold shadow-sm'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                    }
                  `}
                >
                  <span>{link.label}</span>
                  {isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-oc-turquoise"></span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer Account info */}
        <div className="border-t border-white/10 pt-4 mt-6">
          <div className="bg-white/5 border border-white/10 rounded-lg p-3 mb-4 text-xs space-y-1">
            <div className="text-white/40 uppercase tracking-widest text-[9px] font-bold">Logged in as</div>
            <div className="font-bold text-white truncate">{user.fullName || 'User'}</div>
            {user.ocid && (
              <div className="text-oc-turquoise truncate text-[10px] font-mono">{user.ocid}</div>
            )}
            {user.mssv && (
              <div className="text-oc-periwinkle font-mono text-[10px]">Student ID: {user.mssv}</div>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="w-full text-center text-xs font-semibold text-red-400 hover:text-white bg-red-500/10 hover:bg-red-600/30 border border-red-500/20 py-2 rounded-md transition-all"
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Page Area — Suspense scoped strictly inside main container to keep sidebar stationary */}
      <main id="main-content" className="h-[100dvh] min-w-0 flex-grow overflow-y-auto bg-oc-mist pt-16 md:pt-0">
        <div className="mx-auto max-w-6xl p-4 sm:p-6 md:p-10">
          <Suspense fallback={
            <div className="py-24 text-center space-y-4 max-w-sm mx-auto font-sans">
              <div className="badge-kicker text-[10px] text-slate-400">Loading page...</div>
              <LoadingBar className="max-w-[140px] mx-auto" />
            </div>
          }>
            {children || <Outlet />}
          </Suspense>
        </div>
      </main>
    </div>
  );
}
export default DashboardLayout;
