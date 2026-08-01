import React from 'react';

/**
 * StatusBadge Component — Borderless Pure Text Status System
 * Renders high-contrast bold text with status indicator dot (No background pill, No border frame).
 */
export function StatusBadge({ status, label, className = '' }) {
  const key = (status || '').toLowerCase().trim();

  let textClass = 'text-slate-500 font-semibold';
  let dotClass = 'bg-slate-400';
  let displayLabel = label || status;

  if (['checked-in', 'checkedin', 'success', 'sbt minted', 'minted_onchain', 'active', 'completed'].includes(key)) {
    textClass = 'text-emerald-700 font-extrabold';
    dotClass = 'bg-emerald-500 animate-pulse';
    displayLabel = label || (key === 'active' ? 'ACTIVE' : key === 'completed' ? 'COMPLETED' : 'CHECKED-IN');
  } else if (['off-chain (no wallet)', 'off_chain', 'skipped_no_wallet', 'warning', 'already_issued', 'unmatched'].includes(key)) {
    textClass = 'text-amber-700 font-extrabold';
    dotClass = 'bg-amber-500';
    displayLabel = label || 'OFF-CHAIN (NO WALLET)';
  } else if (['qr check-in', 'qr_checkin', 'excel import', 'import_excel', 'source'].includes(key)) {
    textClass = 'text-oc-blue font-extrabold';
    dotClass = 'bg-oc-blue';
    displayLabel = label || (key.includes('excel') ? 'EXCEL IMPORT' : 'QR CHECK-IN');
  } else if (['deleted', 'soft deleted', 'archived'].includes(key)) {
    textClass = 'text-rose-700 font-extrabold';
    dotClass = 'bg-rose-600';
    displayLabel = label || 'SOFT DELETED';
  } else if (['pending', 'minting'].includes(key)) {
    textClass = 'text-sky-700 font-extrabold';
    dotClass = 'bg-sky-500 animate-ping';
    displayLabel = label || 'MINTING...';
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider select-none bg-transparent ${textClass} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotClass}`} />
      <span>{displayLabel}</span>
    </span>
  );
}

export default StatusBadge;
