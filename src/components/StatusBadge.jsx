import React from 'react';

/**
 * StatusBadge Component — Open Campus Dark Theme System Badge
 * Styled exactly like "POWERED BY OPEN CAMPUS ID" (Dark Navy BG + Vibrant Neon Text + Space Mono Font + Status Indicator Dot).
 */
export function StatusBadge({ status, label, className = '' }) {
  // Normalize status key
  const key = (status || '').toLowerCase().trim();

  // Variant mappings
  let bgClass = 'bg-[#07094D] border-slate-700/80 text-slate-400';
  let dotClass = 'bg-slate-500';
  let displayLabel = label || status;

  if (['checked-in', 'checkedin', 'success', 'sbt minted', 'minted_onchain', 'active', 'completed'].includes(key)) {
    bgClass = 'bg-[#07094D] border-[#00EDBE]/40 text-[#00EDBE] shadow-[0_0_12px_rgba(0,237,190,0.15)]';
    dotClass = 'bg-[#00EDBE] shadow-[0_0_6px_#00EDBE] animate-pulse';
    displayLabel = label || (key === 'active' ? 'ACTIVE' : key === 'completed' ? 'COMPLETED' : 'CHECKED-IN');
  } else if (['off-chain (no wallet)', 'off_chain', 'skipped_no_wallet', 'warning', 'already_issued', 'unmatched'].includes(key)) {
    bgClass = 'bg-[#07094D] border-amber-500/40 text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.12)]';
    dotClass = 'bg-amber-400 shadow-[0_0_6px_#FBBF24]';
    displayLabel = label || 'OFF-CHAIN (NO WALLET)';
  } else if (['qr check-in', 'qr_checkin', 'excel import', 'import_excel', 'source'].includes(key)) {
    bgClass = 'bg-[#07094D] border-indigo-500/40 text-indigo-300 shadow-[0_0_12px_rgba(99,102,241,0.12)]';
    dotClass = 'bg-indigo-400 shadow-[0_0_6px_#818CF8]';
    displayLabel = label || (key.includes('excel') ? 'EXCEL IMPORT' : 'QR CHECK-IN');
  } else if (['deleted', 'soft deleted', 'archived'].includes(key)) {
    bgClass = 'bg-[#07094D] border-rose-500/40 text-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.12)]';
    dotClass = 'bg-rose-500 shadow-[0_0_6px_#F43F5E]';
    displayLabel = label || 'SOFT DELETED';
  } else if (['pending', 'minting'].includes(key)) {
    bgClass = 'bg-[#07094D] border-sky-500/40 text-sky-300 shadow-[0_0_12px_rgba(56,189,248,0.12)]';
    dotClass = 'bg-sky-400 animate-ping';
    displayLabel = label || 'MINTING...';
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border font-mono text-[10px] font-bold tracking-wider uppercase select-none transition-all ${bgClass} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotClass}`} />
      <span>{displayLabel}</span>
    </span>
  );
}

export default StatusBadge;
