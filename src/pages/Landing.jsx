import { Link } from 'react-router-dom';

export function Landing() {
  const valueProps = [
    {
      title: 'Chapter Communities',
      description:
        'Follow your department\u2019s chapter to stay updated on workshops, hackathons, and meetups.',
    },
    {
      title: 'Verified Attendance',
      description:
        'Check in with QR codes. Receive Soulbound Token badges minted on EDU Chain as proof.',
    },
    {
      title: 'Achievement Portfolio',
      description:
        'Build a public OCID-linked profile showcasing all your verified campus credentials.',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-navy via-navy-light to-indigo-900 px-6 py-28 sm:py-36 lg:py-44">
        {/* Decorative background layers */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(99,102,241,0.15),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(59,130,246,0.1),transparent_60%)]" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-px w-3/4 bg-gradient-to-r from-transparent via-white/20 to-transparent" />

        <div className="relative mx-auto max-w-4xl text-center">
          <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-indigo-300">
            Powered by Open Campus ID
          </p>
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
            Campus Events.{' '}
            <span className="bg-gradient-to-r from-indigo-300 to-sky-300 bg-clip-text text-transparent">
              Verified on Chain.
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-indigo-100/80 sm:text-xl">
            Event Orbit connects students with campus chapters, verifies
            attendance with Soulbound Tokens, and builds certified achievement
            profiles &mdash; all powered by Open Campus ID.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              to="/login"
              className="inline-flex h-12 items-center rounded-lg bg-white px-8 text-sm font-semibold text-navy shadow-lg shadow-white/10 transition hover:bg-indigo-50 hover:shadow-white/20 focus:outline-none focus:ring-2 focus:ring-white/50"
            >
              Connect with OCID
            </Link>
            <Link
              to="/events"
              className="inline-flex h-12 items-center rounded-lg border border-white/25 px-8 text-sm font-semibold text-white transition hover:border-white/50 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/30"
            >
              Browse Events
            </Link>
          </div>
        </div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent" />
      </section>

      {/* Value Proposition Cards */}
      <section className="relative -mt-12 px-6 pb-20">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {valueProps.map((card) => (
              <div
                key={card.title}
                className="group rounded-xl border border-border bg-white p-8 shadow-sm transition hover:shadow-md hover:border-accent-blue/30"
              >
                <div className="mb-4 h-1 w-10 rounded-full bg-gradient-to-r from-accent-blue to-indigo-500 transition-all group-hover:w-16" />
                <h3 className="text-lg font-bold text-text-primary">
                  {card.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                  {card.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works (visual rhythm break) */}
      <section className="border-t border-border bg-surface px-6 py-20">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-2xl font-bold text-text-primary sm:text-3xl">
            Three steps to a verified campus profile
          </h2>
          <p className="mt-3 text-text-secondary">
            From discovery to credential — everything on-chain.
          </p>
        </div>

        <div className="mx-auto mt-14 flex max-w-4xl flex-col items-start gap-10 sm:flex-row sm:items-center sm:gap-0">
          {[
            { step: '01', label: 'Discover chapters & events' },
            { step: '02', label: 'Attend & scan your QR badge' },
            { step: '03', label: 'Earn SBTs on your OCID profile' },
          ].map((item, idx) => (
            <div key={item.step} className="flex flex-1 flex-col items-center text-center">
              <span className="text-3xl font-extrabold text-accent-blue">
                {item.step}
              </span>
              <p className="mt-3 text-sm font-medium text-text-primary">
                {item.label}
              </p>
              {idx < 2 && (
                <div className="mt-6 hidden h-px w-full bg-border sm:block" />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Footer CTA */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="text-2xl font-bold text-text-primary sm:text-3xl">
            Ready to get started?
          </h2>
          <p className="mt-3 text-text-secondary">
            Connect your Open Campus ID and join the on-chain campus experience.
          </p>
          <Link
            to="/login"
            className="mt-8 inline-flex h-12 items-center rounded-lg bg-navy px-10 text-sm font-semibold text-white transition hover:bg-navy-light focus:outline-none focus:ring-2 focus:ring-navy/40"
          >
            Sign In
          </Link>
        </div>
      </section>
    </div>
  );
}

export default Landing;
