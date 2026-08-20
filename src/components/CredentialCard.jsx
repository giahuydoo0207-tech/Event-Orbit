import React from 'react';
import { CategoryIcon } from './CategoryIcon';
import { getClaimPresentation, getCredentialPresentation, hasRealPoints, hasRealTransaction } from '../lib/credentialPresentation';

const toneClasses = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  info: 'border-oc-periwinkle bg-oc-mist text-oc-blue',
  warning: 'border-amber-200 bg-amber-50 text-amber-800',
  danger: 'border-rose-200 bg-rose-50 text-rose-800',
  neutral: 'border-slate-200 bg-slate-50 text-slate-700',
};

function MetadataItem({ label, value, valueClassName = '' }) {
  const displayedValue = value === null || value === undefined || value === '' ? 'Not recorded' : value;
  return <div className="min-w-0"><dt className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">{label}</dt><dd className={`mt-1 truncate text-xs font-semibold text-slate-700 ${valueClassName}`}>{displayedValue}</dd></div>;
}

export function CredentialCard({ credential, recipientName, recipientOcid, onViewDetails }) {
  if (!credential) return null;
  const claim = getClaimPresentation(credential);
  const issuance = getCredentialPresentation(credential);
  const recipient = recipientName || credential.studentName || recipientOcid || credential.ocid || 'Not recorded';
  const recordedOn = credential.earnedAt ? new Date(credential.earnedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not recorded';
  const realTransaction = hasRealTransaction(credential);

  return (
    <article className="group flex h-full min-h-[440px] flex-col rounded-2xl border border-oc-periwinkle/70 bg-white p-5 shadow-[0_14px_34px_rgba(20,27,235,0.06)] transition duration-200 hover:-translate-y-0.5 hover:border-oc-blue/35">
      <header className="flex min-h-[56px] items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3"><div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-oc-blue/25 bg-oc-mist text-oc-blue"><div className="absolute inset-1.5 rounded-full border border-dashed border-oc-blue/30" /><CategoryIcon category={credential.category || 'Tech'} className="h-5 w-5" /></div><div className="min-w-0"><p className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-oc-blue">Event Orbit Credential</p><p className="mt-1 truncate text-[11px] font-semibold text-slate-500">{credential.issuerName || 'Issuer not recorded'}</p></div></div>
        <span className={`inline-flex min-h-7 max-w-[112px] shrink-0 items-center justify-center rounded-full border px-2.5 py-1 text-center text-[9px] font-bold leading-tight ${toneClasses[claim.tone]}`}>{claim.label}</span>
      </header>

      <div className="mt-5 min-h-[94px]">
        <h3 className="line-clamp-3 break-words text-base font-black leading-snug text-oc-ink" title={credential.eventName}>{credential.eventName || 'Event credential'}</h3>
        <p className="mt-2 truncate text-xs text-slate-500" title={recipient}>Awarded to <span className="font-bold text-oc-ink">{recipient}</span></p>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4 border-t border-oc-periwinkle/45 pt-4">
        <MetadataItem label="Recorded" value={recordedOn} />
        <MetadataItem label="Points" value={hasRealPoints(credential) ? String(credential.points) : 'Not recorded'} valueClassName={hasRealPoints(credential) ? 'text-oc-blue' : ''} />
        <MetadataItem label="Claim status" value={claim.label} />
        <MetadataItem label="Issuance status" value={issuance.label} />
      </dl>

      <div className="mt-4 min-h-[82px] space-y-3 border-t border-oc-periwinkle/45 pt-4 text-[11px]">
        <div className="grid grid-cols-[88px_minmax(0,1fr)] items-center gap-2"><span className="font-bold text-slate-400">Credential ID</span><span className="truncate font-mono text-slate-700" title={credential.credentialId || 'Not recorded'}>{credential.credentialId || 'Not recorded'}</span></div>
        <div className="grid grid-cols-[88px_minmax(0,1fr)] items-center gap-2"><span className="font-bold text-slate-400">Transaction</span><span className={`truncate font-mono ${realTransaction ? 'text-oc-blue' : 'text-slate-500'}`} title={realTransaction ? credential.txHash : 'Not available'}>{realTransaction ? credential.txHash : 'Not available'}</span></div>
      </div>

      <div className="mt-auto pt-5"><button type="button" onClick={() => onViewDetails?.(credential)} className="w-full whitespace-nowrap rounded-lg border border-oc-blue/25 bg-oc-mist px-4 py-2.5 text-xs font-bold text-oc-blue transition hover:bg-oc-blue hover:text-white active:translate-y-px">View details</button></div>
    </article>
  );
}

export default CredentialCard;
