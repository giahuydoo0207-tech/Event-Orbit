import { Link } from 'react-router-dom';
import { useScrollReveal } from '../hooks/useScrollReveal';
import { useCountUp } from '../hooks/useCountUp';
import chapterCommunitiesIllustration from '../assets/feature-chapter-communities.png';
import confirmedAttendanceIllustration from '../assets/feature-confirmed-attendance.png';
import achievementPortfolioIllustration from '../assets/feature-achievement-portfolio.png';

const features = [
  {
    title: 'Chapter Communities',
    description:
      'Follow campus chapters to discover workshops, hackathons, seminars, and community activities from the groups you care about.',
    benefits: ['Follow chapters', 'Personalized event feed', 'Campus communities'],
    image: chapterCommunitiesIllustration,
    imageAlt: 'Students exploring activities together at a campus chapter board',
    imageSide: 'right',
  },
  {
    title: 'Confirmed Attendance',
    description:
      'Use Open Campus ID and live QR check-in to connect real event participation with a trusted student identity.',
    benefits: ['QR check-in', 'Verified participation', 'Attendance record'],
    image: confirmedAttendanceIllustration,
    imageAlt: 'A student completing QR check-in at a campus event desk',
    imageSide: 'left',
  },
  {
    title: 'Achievement Portfolio',
    description:
      'Turn verified participation into a clean credential record that students can view, share, and build on over time.',
    benefits: ['Credential records', 'Student profile', 'Evidence when available'],
    image: achievementPortfolioIllustration,
    imageAlt: 'A student reviewing credential records in a participation portfolio',
    imageSide: 'right',
  },
];

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

        <div className="relative mx-auto max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            
            {/* Left Column: Copy & CTA */}
            <div className="lg:col-span-6 text-center lg:text-left space-y-6">
              {/* Headline */}
              <h1 className="text-3xl font-black leading-[1.25] tracking-tight text-white sm:text-5xl lg:text-6xl">
                <span className="hero-enter hero-enter-line-one block">Campus Events.</span>
                <span className="hero-enter hero-enter-line-two text-oc-turquoise block mt-2 sm:mt-3">
                  Credentials You Can Trust.
                </span>
              </h1>

              {/* Subtitle */}
              <p className="hero-enter hero-enter-subtitle mx-auto lg:mx-0 max-w-xl text-sm leading-relaxed text-oc-periwinkle/90 sm:text-lg font-medium">
                Discover campus events, confirm attendance, and build a trusted credential profile with Open Campus.
              </p>

              {/* CTA Buttons */}
              <div className="hero-enter hero-enter-buttons pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
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

            {/* Right Column: Campus club illustration */}
            <div className="hero-enter hero-enter-globe hidden min-w-0 items-center justify-center py-4 md:flex lg:col-span-6 lg:-translate-x-4 lg:-translate-y-2 lg:py-0 xl:-translate-x-6">
              <img
                src="/hero-event-orbit-campus.webp"
                alt="Students attending an Event Orbit campus session"
                width="1514"
                height="1039"
                decoding="async"
                fetchPriority="high"
                className="h-auto max-h-[480px] w-full max-w-[620px] object-contain xl:max-h-[520px] xl:max-w-[700px]"
              />
            </div>

          </div>
        </div>
      </section>

      {/* Value Proposition Cards — staggered reveal */}
      <section className="bg-white px-6 py-16 sm:py-20 lg:py-24" aria-label="How Event Orbit works">
        <div className="mx-auto max-w-7xl divide-y divide-oc-periwinkle/35">
          {features.map((feature, idx) => (
            <article
              key={feature.title}
              className={`reveal reveal-delay-${idx + 1} grid grid-cols-1 items-center gap-8 py-14 first:pt-0 last:pb-0 sm:gap-10 sm:py-20 lg:grid-cols-2 lg:gap-16 xl:gap-24`}
            >
              <div
                className={`relative order-1 flex min-h-64 items-center justify-center sm:min-h-80 ${feature.imageSide === 'right' ? 'lg:order-2' : 'lg:order-1'}`}
              >
                <div className="pointer-events-none absolute h-56 w-56 rounded-full bg-oc-mist sm:h-72 sm:w-72" />
                <div className="pointer-events-none absolute right-[12%] top-[12%] h-3 w-3 rounded-full bg-oc-turquoise/70" />
                <img
                  src={feature.image}
                  alt={feature.imageAlt}
                  loading="lazy"
                  decoding="async"
                  className="relative z-10 max-h-[300px] w-full max-w-xl object-contain drop-shadow-[0_18px_28px_rgba(20,27,235,0.10)] sm:max-h-[380px]"
                />
              </div>

              <div
                className={`order-2 max-w-xl ${feature.imageSide === 'right' ? 'lg:order-1' : 'lg:order-2 lg:justify-self-end'}`}
              >
                <h2 className="text-3xl font-black leading-tight tracking-tight text-oc-ink sm:text-4xl">
                  {feature.title}
                </h2>
                <p className="mt-5 text-base font-medium leading-8 text-slate-600 sm:text-lg">
                  {feature.description}
                </p>
                <ul className="mt-7 flex flex-wrap gap-2.5" aria-label={`${feature.title} benefits`}>
                  {feature.benefits.map((benefit) => (
                    <li
                      key={benefit}
                      className="inline-flex items-center rounded-full border border-oc-periwinkle/70 bg-oc-mist/70 px-3.5 py-2 text-xs font-bold text-oc-navy"
                    >
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Stats Section — animated counters */}
      <section className="px-6 py-16 border-t border-oc-periwinkle/30">
        <div className="reveal mx-auto max-w-4xl">
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            <StatCounter value={500} suffix="+" label="Students" />
            <StatCounter value={12} label="Chapters" />
            <StatCounter value={48} label="Events Hosted" />
            <StatCounter value={156} label="Credential Records" />
          </div>
        </div>
      </section>

      {/* Open Campus Ecosystem Section — scroll reveal */}
      <section className="px-6 py-16 bg-white border-t border-oc-periwinkle/40">
        <div className="reveal max-w-4xl mx-auto text-center space-y-4">
          <div className="badge-kicker text-oc-blue">Open Campus Ecosystem</div>
          <h2 className="text-2xl font-black text-oc-ink">Decentralized Credentials for Education</h2>
          <p className="text-xs text-slate-500 max-w-xl mx-auto font-medium leading-relaxed">
            Confirmed event participation can become a digital credential linked to your Open Campus ID (OCID).
          </p>
        </div>
      </section>
    </div>
  );
}

export default Landing;
