import React from 'react';
import { useOCAuth } from '@opencampus/ocid-connect-js';
import { Link } from 'react-router-dom';
import manageIllustration from '../assets/login-role-manage.png';
import adminIllustration from '../assets/login-role-admin.png';
import useToastStore from '../store/useToastStore';

const roles = [
  {
    title: 'Student',
    destination: '/home',
    description: 'Discover events, check in, and view your credential records.',
    action: 'Enter Student Hub',
    stickerClassName: '-rotate-6 bg-white text-[#141BEB]',
    stickerIcon: (
      <>
        <path d="m8 11 8-4 8 4-8 4-8-4Z" />
        <path d="M11 13.5v3.2c2.8 1.8 7.2 1.8 10 0v-3.2M24 11v5" />
      </>
    ),
  },
  {
    title: 'Manage',
    destination: '/manage',
    description: 'Create events, import attendees, and manage check-ins.',
    action: 'Enter Organizer Portal',
    stickerClassName: 'rotate-3 bg-oc-turquoise text-[#070A3F]',
    stickerIcon: (
      <>
        <circle cx="16" cy="10" r="3" />
        <path d="M10.5 22v-1.7a5.5 5.5 0 0 1 11 0V22M22 8h4v7h-4l-2-2" />
      </>
    ),
  },
  {
    title: 'Admin',
    destination: '/admin',
    description: 'Review events, publish approved activities, and protect quality.',
    action: 'Enter Admin Console',
    stickerClassName: 'rotate-6 bg-[#7075FF] text-white',
    stickerIcon: (
      <>
        <path d="M16 6.5 23 9v5.5c0 4.6-3 8.1-7 10-4-1.9-7-5.4-7-10V9l7-2.5Z" />
        <path d="m13 15.5 2 2 4-4" />
      </>
    ),
  },
];

function RoleSticker({ role }) {
  return (
    <span
      aria-hidden="true"
      className={`mt-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-[3px] border-[#10175C] shadow-[0_10px_24px_rgba(0,0,0,0.18)] ${role.stickerClassName}`}
    >
      <svg viewBox="0 0 32 32" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {role.stickerIcon}
      </svg>
    </span>
  );
}

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
    <main className="relative min-h-[100dvh] overflow-x-hidden bg-[#F5F7FF] px-4 py-5 font-sans text-[#070A3F] sm:px-6 sm:py-7 lg:h-[100dvh] lg:min-h-0 lg:overflow-hidden lg:p-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_8%_8%,rgba(29,36,255,0.08),transparent_28%),radial-gradient(circle_at_92%_92%,rgba(0,230,195,0.09),transparent_25%),linear-gradient(135deg,#F8FAFF_0%,#EEF1FF_100%)]" />

      <section className="relative mx-auto grid min-h-[calc(100dvh-2.5rem)] w-full max-w-7xl grid-cols-1 overflow-hidden rounded-[28px] border border-white bg-white shadow-[0_24px_80px_rgba(7,10,63,0.11)] sm:min-h-[calc(100dvh-3.5rem)] lg:h-full lg:min-h-0 lg:grid-cols-[0.92fr_1.08fr]" aria-labelledby="login-title">
        <div className="relative flex min-h-[370px] flex-col overflow-hidden bg-[linear-gradient(150deg,#070A3F_0%,#081052_100%)] p-7 text-white sm:p-10 lg:min-h-0 lg:p-10 xl:p-12">
          <header className="relative">
            <p className="text-xl font-black tracking-tight text-white sm:text-2xl">Event Orbit</p>
            <p className="mt-1.5 text-xs font-semibold text-oc-turquoise">Choose your workspace</p>
            <Link
              to="/"
              className="mt-4 inline-flex rounded-md py-1 text-xs font-semibold text-[#AAB6DB] transition-colors hover:text-oc-turquoise focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-oc-turquoise focus-visible:ring-offset-4 focus-visible:ring-offset-[#070A3F]"
            >
              ← Back to landing
            </Link>
          </header>

          <div className="relative pt-10 sm:pt-12 lg:pt-10 xl:pt-12">
            <div className="max-w-xl">
              <h1 id="login-title" className="text-4xl font-black leading-[1.08] tracking-[-0.035em] text-white sm:text-5xl lg:text-[2.6rem] xl:text-5xl">
                <span className="block text-white">Connect with</span>
                <span className="block text-oc-turquoise lg:whitespace-nowrap">Open Campus ID</span>
              </h1>
              <p className="mt-5 max-w-md text-sm font-medium leading-6 text-[#C7D0EC] sm:text-base">
                Choose how you want to continue into Event Orbit.
              </p>
            </div>
          </div>

          <div aria-hidden="true" className="relative mx-auto mt-10 flex w-fit items-end justify-center -space-x-10 pb-1 sm:mt-12 lg:mx-0 lg:mt-auto lg:justify-start lg:pt-6">
            <img
              src={manageIllustration}
              alt=""
              className="relative z-10 h-32 w-32 -rotate-3 object-contain drop-shadow-[0_12px_18px_rgba(0,0,0,0.18)] sm:h-36 sm:w-36 lg:h-32 lg:w-32 xl:h-36 xl:w-36"
            />
            <img
              src={adminIllustration}
              alt=""
              className="relative h-28 w-28 translate-y-1 rotate-3 object-contain opacity-95 drop-shadow-[0_12px_18px_rgba(0,0,0,0.16)] sm:h-32 sm:w-32 lg:h-28 lg:w-28 xl:h-32 xl:w-32"
            />
          </div>

        </div>

        <div className="flex min-w-0 flex-col justify-center bg-white p-6 sm:p-10 lg:justify-start lg:px-10 lg:pb-12 lg:pt-9 xl:px-12 xl:pb-14 xl:pt-10">
          <div className="max-w-2xl">
            <p className="text-sm font-extrabold tracking-tight text-[#070A3F]">Select a workspace</p>
            <p className="mt-1.5 text-sm leading-6 text-[#63708A]">Use the role that matches what you want to do next.</p>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-2.5">
              {roles.map((role) => (
                <button
                  key={role.title}
                  type="button"
                  onClick={() => handleOCIDLogin(role.destination)}
                  className="group relative w-full overflow-hidden rounded-2xl border border-[#DCE3F5] bg-[#FBFCFF] p-5 text-left shadow-[0_8px_24px_rgba(7,10,63,0.04)] transition duration-300 hover:-translate-y-0.5 hover:border-oc-turquoise hover:bg-white hover:shadow-[0_14px_34px_rgba(7,16,82,0.09)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-oc-turquoise focus-visible:ring-offset-3 focus-visible:ring-offset-white active:translate-y-0 motion-reduce:transform-none motion-reduce:transition-none sm:p-6 lg:p-5"
                  aria-label={`Continue as ${role.title}`}
                >
                  <span className="flex items-start gap-4 sm:gap-5">
                    <RoleSticker role={role} />

                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-4">
                        <span className="text-lg font-extrabold text-[#070A3F]">{role.title}</span>
                        <span className="shrink-0 text-xs font-bold text-[#63708A] transition-colors group-hover:text-[#008E7B]">Select</span>
                      </span>
                      <span className="mt-1.5 block text-sm font-medium leading-6 text-[#63708A]">
                        {role.description}
                      </span>
                      <span className="mt-3 inline-flex items-center whitespace-nowrap text-xs font-bold text-[#1D24FF] transition-colors group-hover:text-[#008E7B] group-focus-visible:text-[#008E7B]">
                        {role.action}
                        <span aria-hidden="true" className="ml-2 transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transform-none">→</span>
                      </span>
                    </span>
                  </span>
                </button>
              ))}
          </div>

          <p className="mt-4 text-xs font-medium text-[#63708A]">Your role is verified after authentication.</p>
        </div>
      </section>
    </main>
  );
}
export default Login;
