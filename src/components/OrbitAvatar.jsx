import React from 'react';

/**
 * OrbitAvatar Component
 * Render 2D Orbit Logo with smooth CSS continuous satellite rotation & glowing planet core.
 */
export function OrbitAvatar({ size = 'hero', className = '' }) {
  if (size === 'sm') {
    return (
      <div className={`relative w-8 h-8 flex items-center justify-center shrink-0 ${className}`}>
        {/* Outer Orbit Ring */}
        <div className="absolute inset-0 rounded-full border border-oc-blue/80 animate-orbit-rotate">
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-oc-turquoise shadow-[0_0_6px_#00EDBE]" />
        </div>
        {/* Center Planet */}
        <div className="w-3.5 h-3.5 rounded-full bg-oc-turquoise shadow-[0_0_8px_#00EDBE]" />
      </div>
    );
  }

  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      {/* Radial Glow Ambient Aura */}
      <div className="absolute w-72 h-72 sm:w-88 sm:h-88 rounded-full bg-gradient-to-tr from-oc-turquoise/25 via-oc-blue/20 to-oc-periwinkle/15 blur-3xl pointer-events-none animate-pulse" />

      {/* Orbit Container Stage */}
      <div className="relative w-64 h-64 sm:w-76 sm:h-76 md:w-84 md:h-84 flex items-center justify-center">
        {/* Outer Secondary Guide Track */}
        <div className="absolute inset-0 rounded-full border border-oc-periwinkle/20 animate-orbit-reverse pointer-events-none">
          <div className="absolute bottom-2 right-6 w-2.5 h-2.5 rounded-full bg-oc-periwinkle/70 shadow-[0_0_8px_#C2C7FB]" />
        </div>

        {/* Primary Orbit Ring (OC Blue #141BEB thin stroke) */}
        <div className="absolute inset-4 sm:inset-6 rounded-full border-2 border-oc-blue/90 shadow-[0_0_30px_rgba(20,27,235,0.45)] animate-orbit-rotate">
          {/* Orbiting Satellite Dot (OC Turquoise #00EDBE with intense glow) */}
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-oc-turquoise border-2 border-oc-navy shadow-[0_0_16px_#00EDBE,0_0_32px_#00EDBE]" />
        </div>

        {/* Center Planet Core (Glowing OC Turquoise Circle) */}
        <div className="relative z-10 w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-oc-turquoise via-[#00EDBE] to-[#00C99E] shadow-[0_0_50px_rgba(0,237,190,0.7)] animate-planet-pulse flex items-center justify-center">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/20 blur-xs" />
        </div>
      </div>
    </div>
  );
}

export default OrbitAvatar;
