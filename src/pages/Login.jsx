import React from 'react';
import { useOCAuth } from '@opencampus/ocid-connect-js';
import useToastStore from '../store/useToastStore';

const roles = [
  {
    title: 'Student',
    destination: '/home',
    description: 'Discover events, check in, and view your credential records.',
    action: 'Enter Student Hub',
  },
  {
    title: 'Manage',
    destination: '/manage',
    description: 'Create events, import attendees, and manage check-ins.',
    action: 'Enter Organizer Portal',
  },
  {
    title: 'Admin',
    destination: '/admin',
    description: 'Review events, publish approved activities, and protect quality.',
    action: 'Enter Admin Console',
  },
];

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
    <main className="relative min-h-[100dvh] overflow-hidden bg-[#070A3F] px-4 py-6 font-sans text-white sm:px-6 sm:py-8 lg:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(29,36,255,0.3),transparent_32%),radial-gradient(circle_at_82%_78%,rgba(0,230,195,0.16),transparent_30%),linear-gradient(145deg,#070A3F_0%,#080B45_58%,#060833_100%)]" />
      <div className="pointer-events-none absolute -right-28 -top-40 h-[460px] w-[460px] rounded-full border border-white/10 sm:h-[620px] sm:w-[620px]" />
      <div className="pointer-events-none absolute -right-12 -top-24 h-[330px] w-[330px] rounded-full border border-oc-turquoise/20 sm:h-[450px] sm:w-[450px]" />
      <div className="pointer-events-none absolute bottom-[-180px] left-[-140px] h-[360px] w-[360px] rounded-full border border-oc-blue/25" />

      <div className="relative mx-auto flex min-h-[calc(100dvh-3rem)] w-full max-w-7xl flex-col sm:min-h-[calc(100dvh-4rem)]">
        <header className="flex items-start justify-between gap-6">
          <div>
            <p className="text-xl font-black tracking-tight text-white sm:text-2xl">Event Orbit</p>
            <p className="mt-1 text-xs font-semibold text-oc-turquoise">Choose your workspace</p>
          </div>
          <div className="hidden items-center gap-3 text-right sm:flex">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-oc-turquoise/70" />
            <span className="max-w-[180px] text-[11px] font-medium leading-5 text-oc-periwinkle/70">
              Open Campus ID access
            </span>
          </div>
        </header>

        <section className="flex flex-1 items-center py-10 sm:py-12" aria-labelledby="login-title">
          <div className="w-full">
            <div className="max-w-2xl">
              <h1 id="login-title" className="text-3xl font-black leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">
                Connect with Open Campus ID
              </h1>
              <p className="mt-4 max-w-xl text-sm font-medium leading-6 text-oc-periwinkle sm:text-base">
                Choose how you want to continue into Event Orbit.
              </p>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3 lg:gap-5">
              {roles.map((role) => (
                <button
                  key={role.title}
                  type="button"
                  onClick={() => handleOCIDLogin(role.destination)}
                  className="group relative min-h-[210px] w-full overflow-hidden rounded-2xl border border-white/15 bg-white/[0.06] p-5 text-left shadow-[0_18px_50px_rgba(3,6,48,0.28)] backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:border-oc-turquoise/70 hover:bg-gradient-to-br hover:from-oc-blue/30 hover:to-oc-turquoise/10 hover:shadow-[0_22px_60px_rgba(0,230,195,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-oc-turquoise focus-visible:ring-offset-4 focus-visible:ring-offset-[#070A3F] active:translate-y-0 motion-reduce:transform-none motion-reduce:transition-none sm:p-6"
                  aria-label={`Continue as ${role.title}`}
                >
                  <span className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-60 transition-opacity group-hover:opacity-100" />

                  <span className="flex items-center justify-between">
                    <span className="relative flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-oc-navy/70 transition-colors group-hover:border-oc-turquoise/60 group-hover:bg-oc-blue/40">
                      <span className="h-4 w-4 rounded-full border border-oc-periwinkle/60 transition-transform duration-300 group-hover:scale-125 group-hover:border-oc-turquoise" />
                      <span className="absolute right-1.5 top-2 h-1.5 w-1.5 rounded-full bg-oc-turquoise transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1 motion-reduce:transform-none" />
                    </span>
                    <span className="text-xs font-bold text-oc-periwinkle/65 transition-colors group-hover:text-oc-turquoise">
                      Select
                    </span>
                  </span>

                  <span className="mt-6 block text-xl font-extrabold text-white">{role.title}</span>
                  <span className="mt-2 block min-h-[48px] text-sm font-medium leading-6 text-oc-periwinkle/80">
                    {role.description}
                  </span>
                  <span className="mt-5 inline-flex items-center text-xs font-bold text-white/70 transition-colors group-hover:text-oc-turquoise group-focus-visible:text-oc-turquoise">
                    {role.action}
                    <span aria-hidden="true" className="ml-2 transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transform-none">→</span>
                  </span>
                </button>
              ))}
            </div>

            <p className="mt-6 text-xs font-medium text-oc-periwinkle/65">
              Your role is verified after authentication.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
export default Login;
