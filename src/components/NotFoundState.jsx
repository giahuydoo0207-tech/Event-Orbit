import React from 'react';

export function NotFoundState({ title = 'Not found', message, backTo = '/', backLabel = 'Back to home' }) {
  return (
    <div className="max-w-md mx-auto text-center py-20 px-4 space-y-4 text-text-primary">
      <p className="text-lg font-bold text-navy">{title}</p>
      {message && <p className="text-xs text-text-secondary">{message}</p>}
      <a
        href={backTo}
        className="inline-block px-5 py-2.5 border border-border text-xs font-semibold uppercase tracking-wider rounded hover:bg-slate-50 transition-all"
      >
        {backLabel}
      </a>
    </div>
  );
}

export default NotFoundState;
