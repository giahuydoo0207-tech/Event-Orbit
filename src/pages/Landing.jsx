import { Link } from 'react-router-dom';
import { useScrollReveal } from '../hooks/useScrollReveal';
import { useCountUp } from '../hooks/useCountUp';

function StatCounter({ value, label, suffix = '' }) {
  const { ref, count } = useCountUp(value, 1300);
  return (
    <div ref={ref} className="text-center">
      <div className="num text-3xl font-bold text-oc-blue sm:text-4xl">
        {count.toLocaleString()}{suffix}
      </div>
      <div className="badge-kicker text-slate-500 mt-1">{label}</div>
    </div>
  );
}

export function Landing() {
  const containerRef = useScrollReveal();

  const valueProps = [
    {
      title: 'Chapter Communities',
      description:
        'Follow your department\u2019s chapter to stay updated on workshops, hackathons, and meetups.',
    },
    {
      title: 'Verified Attendance',
      description:
        'Check in with QR codes. Receive Soulbound Token (SBT) badges minted on EDU Chain as proof.',
    },
    {
      title: 'Achievement Portfolio',
      description:
        'Build a public OCID-linked profile showcasing all your verified campus credentials.',
    },
  ];

  return (
    <div ref={containerRef} className="min-h-screen flex flex-col bg-oc-mist font-sans">
      {/* Hero Section - Open Campus Deep Navy background */}
      <section className="relative overflow-hidden bg-oc-navy px-6 py-16 sm:py-20 lg:py-24 text-white">
        {/* Static background glows */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(0,237,190,0.12),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(20,27,235,0.25),transparent_60%)]" />

        {/* Animated glow drift — subtle turquoise pulse behind headline */}
        <div
          className="hero-glow absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse, rgba(0,237,190,0.14) 0%, transparent 70%)',
          }}
        />

        <div className="relative mx-auto max-w-5xl text-center">
          {/* Badge — reveals immediately (hero content) */}
          <div className="reveal inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 mb-6">
            <span className="w-2 h-2 rounded-full bg-oc-turquoise animate-pulse"></span>
            <span className="badge-kicker text-oc-turquoise text-[10px]">
              Powered by Open Campus ID
            </span>
          </div>

          {/* Headline */}
          <h1 className="reveal reveal-delay-1 text-4xl font-black leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
            Campus Events.{' '}
            <span className="text-oc-turquoise whitespace-nowrap">
              Verified on Chain.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="reveal reveal-delay-2 mx-auto mt-6 max-w-2xl text-base leading-relaxed text-oc-periwinkle/90 sm:text-lg font-medium">
            Event Orbit connects students with campus chapters, verifies attendance with Soulbound Tokens, and builds certified achievement profiles &mdash; all powered by Open Campus.
          </p>

          {/* CTAs — hover-lift effect */}
          <div className="reveal reveal-delay-3 mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              to="/login"
              className="hover-lift inline-flex h-12 items-center rounded-xl bg-oc-blue px-8 text-xs font-bold text-white shadow-lg hover:bg-oc-indigo transition-all"
            >
              Connect with OCID
            </Link>
            <Link
              to="/events"
              className="hover-lift inline-flex h-12 items-center rounded-xl border border-oc-periwinkle/40 bg-white/5 px-8 text-xs font-bold text-white transition hover:border-oc-periwinkle hover:bg-white/10"
            >
              Browse Events
            </Link>
          </div>
        </div>
      </section>

      {/* Value Proposition Cards — staggered reveal */}
      <section className="relative -mt-12 px-6 pb-20">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {valueProps.map((prop, idx) => (
              <div
                key={idx}
                className={`reveal reveal-delay-${idx + 1} hover-lift rounded-2xl border border-oc-periwinkle/70 bg-white p-8 shadow-sm space-y-3`}
              >
                <div className="badge-kicker text-oc-blue">0{idx + 1} &bull; Feature</div>
                <h3 className="text-lg font-bold text-oc-ink">{prop.title}</h3>
                <p className="text-xs leading-relaxed text-slate-500 font-medium">
                  {prop.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section — animated counters */}
      <section className="px-6 py-16 border-t border-oc-periwinkle/30">
        <div className="reveal mx-auto max-w-4xl">
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            <StatCounter value={500} suffix="+" label="Students" />
            <StatCounter value={12} label="Chapters" />
            <StatCounter value={48} label="Events Hosted" />
            <StatCounter value={156} label="SBTs Minted" />
          </div>
        </div>
      </section>

      {/* Open Campus Ecosystem Section — scroll reveal */}
      <section className="px-6 py-16 bg-white border-t border-oc-periwinkle/40">
        <div className="reveal max-w-4xl mx-auto text-center space-y-4">
          <div className="badge-kicker text-oc-blue">Open Campus Ecosystem</div>
          <h2 className="text-2xl font-black text-oc-ink">Decentralized Credentials for Education</h2>
          <p className="text-xs text-slate-500 max-w-xl mx-auto font-medium leading-relaxed">
            Every event check-in issues an immutable Soulbound Token (SBT) credential linked directly to your Open Campus ID (OCID).
          </p>
        </div>
      </section>
    </div>
  );
}

export default Landing;
