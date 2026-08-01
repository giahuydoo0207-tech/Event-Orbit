import { Link } from 'react-router-dom';
import { useScrollReveal } from '../hooks/useScrollReveal';
import { useCountUp } from '../hooks/useCountUp';
import { OrbitAvatar } from '../components/OrbitAvatar';

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
      {/* Hero Section — Open Campus Deep Navy background with Animated Orbit Avatar */}
      <section className="relative overflow-hidden bg-oc-navy px-6 py-16 sm:py-20 lg:py-24 text-white">
        {/* Radial Background Gradients */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(0,237,190,0.15),transparent_60%)] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(20,27,235,0.3),transparent_60%)] pointer-events-none" />

        {/* Ambient Glow Pulse */}
        <div
          className="hero-glow absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse, rgba(0,237,190,0.16) 0%, transparent 70%)',
          }}
        />

        <div className="relative mx-auto max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            
            {/* Left Column: Copy & CTA */}
            <div className="lg:col-span-7 text-center lg:text-left space-y-6">
              {/* Kicker Badge */}
              <div className="reveal inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/20">
                <span className="w-2 h-2 rounded-full bg-oc-turquoise animate-pulse"></span>
                <span className="badge-kicker text-oc-turquoise text-[11px] font-mono tracking-wider uppercase">
                  POWERED BY OPEN CAMPUS ID
                </span>
              </div>

              {/* Headline */}
              <h1 className="reveal reveal-delay-1 text-4xl font-black leading-[1.12] tracking-tight text-white sm:text-5xl lg:text-6xl">
                Campus Events.{' '}
                <span className="text-oc-turquoise block sm:inline">
                  Verified on Chain.
                </span>
              </h1>

              {/* Subtitle */}
              <p className="reveal reveal-delay-2 mx-auto lg:mx-0 max-w-xl text-base leading-relaxed text-oc-periwinkle/90 sm:text-lg font-medium">
                Event Orbit connects students with campus chapters, verifies attendance with Soulbound Tokens, and builds certified achievement profiles &mdash; all powered by Open Campus.
              </p>

              {/* CTA Buttons */}
              <div className="reveal reveal-delay-3 pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                <Link
                  to="/login"
                  className="hover-lift w-full sm:w-auto inline-flex h-12 items-center justify-center rounded-xl bg-oc-blue px-8 text-xs font-bold text-white shadow-lg hover:bg-oc-indigo transition-all active:scale-95"
                >
                  Connect with OCID
                </Link>
                <Link
                  to="/events"
                  className="hover-lift w-full sm:w-auto inline-flex h-12 items-center justify-center rounded-xl border border-oc-periwinkle/40 bg-white/5 px-8 text-xs font-bold text-white transition hover:border-oc-periwinkle hover:bg-white/10 active:scale-95"
                >
                  Browse Events
                </Link>
              </div>
            </div>

            {/* Right Column: Hero Centerpiece Animated Orbit Avatar */}
            <div className="reveal reveal-delay-2 lg:col-span-5 flex justify-center lg:justify-end py-4 lg:py-0">
              <OrbitAvatar size="hero" className="scale-90 sm:scale-100 transition-all duration-300" />
            </div>

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
