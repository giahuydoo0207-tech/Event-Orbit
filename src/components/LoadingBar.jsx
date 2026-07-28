import React from 'react';

/**
 * Shared Indeterminate Progress Loading Bar
 * Signature Open Campus gradient (#141BEB -> #00EDBE) sliding infinitely.
 *
 * Props:
 *   variant: 'light' | 'dark' (default: 'light')
 *   className: optional additional container styling
 */
export function LoadingBar({ variant = 'light', className = '' }) {
  const trackBg = variant === 'dark' ? 'bg-white/10' : 'bg-oc-periwinkle/30';

  return (
    <div className={`w-full h-1 relative overflow-hidden rounded-full ${trackBg} ${className}`}>
      <div className="absolute inset-0 w-2/5 rounded-full bg-gradient-to-r from-oc-blue to-oc-turquoise animate-loading-slide" />
    </div>
  );
}

export default LoadingBar;
