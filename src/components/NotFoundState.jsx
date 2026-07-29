import React from 'react';
import { Link } from 'react-router-dom';

export function NotFoundState({ title = 'Not found', message, backTo = '/', backLabel = 'Back to home' }) {
  return (
    <div className="max-w-md mx-auto text-center py-20 px-4 space-y-4 font-sans">
      <div className="badge-kicker text-oc-blue text-[10px]">404 &bull; Page Not Found</div>
      <p className="text-xl font-extrabold text-oc-ink">{title}</p>
      {message && <p className="text-xs text-slate-500 font-medium leading-relaxed max-w-xs mx-auto">{message}</p>}
      <Link
        to={backTo}
        className="inline-block mt-2 px-6 py-2.5 bg-oc-blue text-white text-xs font-bold uppercase tracking-wider rounded-md shadow-sm hover:bg-oc-indigo transition-all active:scale-95"
      >
        {backLabel}
      </Link>
    </div>
  );
}

export default NotFoundState;
