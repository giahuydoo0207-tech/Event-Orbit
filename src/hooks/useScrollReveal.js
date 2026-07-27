import { useEffect, useRef } from 'react';

/**
 * Custom hook: observes elements with the `.reveal` class inside a container
 * and adds `.revealed` when they enter the viewport. Fires once per element.
 * Respects prefers-reduced-motion — reveals everything immediately.
 */
export function useScrollReveal() {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Respect accessibility: skip animation entirely
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      container.querySelectorAll('.reveal').forEach(el => el.classList.add('revealed'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            observer.unobserve(entry.target); // Fire once only
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );

    // Small delay to ensure DOM is painted before observing
    const timer = setTimeout(() => {
      container.querySelectorAll('.reveal').forEach(el => observer.observe(el));
    }, 50);

    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, []);

  return containerRef;
}

export default useScrollReveal;
