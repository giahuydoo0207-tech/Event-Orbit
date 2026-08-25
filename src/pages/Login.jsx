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
    <main className="relative min-h-[100dvh] overflow-hidden bg-[#F5F7FF] px-4 py-5 font-sans text-[#070A3F] sm:px-6 sm:py-7 lg:px-8 lg:py-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_8%_8%,rgba(29,36,255,0.08),transparent_28%),radial-gradient(circle_at_92%_92%,rgba(0,230,195,0.09),transparent_25%),linear-gradient(135deg,#F8FAFF_0%,#EEF1FF_100%)]" />

      <section className="relative mx-auto grid min-h-[calc(100dvh-2.5rem)] w-full max-w-7xl grid-cols-1 overflow-hidden rounded-[28px] border border-white bg-white shadow-[0_24px_80px_rgba(7,10,63,0.11)] sm:min-h-[calc(100dvh-3.5rem)] lg:grid-cols-[0.78fr_1.22fr]" aria-labelledby="login-title">
        <div className="relative flex min-h-[370px] flex-col overflow-hidden bg-[linear-gradient(150deg,#070A3F_0%,#081052_100%)] p-7 text-white sm:p-10 lg:min-h-full lg:p-12">
          <div className="pointer-events-none absolute -bottom-28 -right-24 h-72 w-72 rounded-full border border-white/[0.07]" />
          <div className="pointer-events-none absolute -bottom-10 -right-8 h-44 w-44 rounded-full border border-oc-turquoise/15" />
          <div className="pointer-events-none absolute right-20 top-24 h-2 w-2 rounded-full bg-oc-turquoise/60 shadow-[0_0_20px_rgba(0,230,195,0.35)]" />

          <header className="relative">
            <p className="text-xl font-black tracking-tight text-white sm:text-2xl">Event Orbit</p>
            <p className="mt-1.5 text-xs font-semibold text-oc-turquoise">Choose your workspace</p>
          </header>

          <div className="relative my-auto max-w-xl py-12 lg:py-16">
            <h1 id="login-title" className="text-4xl font-black leading-[1.08] tracking-[-0.035em] text-white sm:text-5xl lg:text-[3.5rem]">
              <span className="block text-white">Connect with</span>
              <span className="block text-oc-turquoise sm:whitespace-nowrap">Open Campus ID</span>
            </h1>
            <p className="mt-5 max-w-md text-sm font-medium leading-6 text-[#C7D0EC] sm:text-base">
              Choose how you want to continue into Event Orbit.
            </p>
          </div>

          <p className="relative text-xs font-medium text-[#AAB6DB]">Open Campus ID access</p>
        </div>

        <div className="flex min-w-0 flex-col justify-center bg-white p-6 sm:p-10 lg:p-12 xl:p-16">
          <div className="max-w-2xl">
            <p className="text-sm font-extrabold tracking-tight text-[#070A3F]">Select a workspace</p>
            <p className="mt-1.5 text-sm leading-6 text-[#63708A]">Use the role that matches what you want to do next.</p>
          </div>

          <div className="mt-7 grid grid-cols-1 gap-3">
              {roles.map((role) => (
                <button
                  key={role.title}
                  type="button"
                  onClick={() => handleOCIDLogin(role.destination)}
                  className="group relative w-full overflow-hidden rounded-2xl border border-[#DCE3F5] bg-[#FBFCFF] p-5 text-left shadow-[0_8px_24px_rgba(7,10,63,0.04)] transition duration-300 hover:-translate-y-0.5 hover:border-oc-turquoise hover:bg-white hover:shadow-[0_14px_34px_rgba(7,16,82,0.09)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-oc-turquoise focus-visible:ring-offset-3 focus-visible:ring-offset-white active:translate-y-0 motion-reduce:transform-none motion-reduce:transition-none sm:p-6"
                  aria-label={`Continue as ${role.title}`}
                >
                  <span className="flex items-start gap-4 sm:gap-5">
                    <span className="relative mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#CFD8F0] bg-white transition-colors group-hover:border-oc-turquoise group-hover:bg-[#F0FFFB]">
                      <span className="h-4 w-4 rounded-full border border-[#53648D] transition-transform duration-300 group-hover:scale-110 group-hover:border-[#009E88]" />
                      <span className="absolute right-1.5 top-2 h-1.5 w-1.5 rounded-full bg-oc-turquoise transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transform-none" />
                    </span>

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

          <p className="mt-6 text-xs font-medium text-[#63708A]">Your role is verified after authentication.</p>
        </div>
      </section>
    </main>
  );
}
export default Login;
