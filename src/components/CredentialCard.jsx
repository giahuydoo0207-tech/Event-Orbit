import React from 'react';
import { CategoryIcon } from './CategoryIcon';
import { getCredentialPresentation, hasRealPoints } from '../lib/credentialPresentation';

const toneClasses = { success: 'border-emerald-200 bg-emerald-50 text-emerald-800', info: 'border-oc-periwinkle bg-oc-mist text-oc-blue', warning: 'border-amber-200 bg-amber-50 text-amber-800', danger: 'border-rose-200 bg-rose-50 text-rose-800', neutral: 'border-slate-200 bg-slate-50 text-slate-700' };

export function CredentialCard({ credential, recipientName, recipientOcid, onViewDetails }) {
  if (!credential) return null;
  const presentation = getCredentialPresentation(credential);
  const recipient = recipientName || credential.studentName || recipientOcid || credential.ocid || 'Recipient unavailable';
  const issuedOn = credential.earnedAt ? new Date(credential.earnedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null;

  return (
    <article className="group relative flex min-h-[350px] flex-col overflow-hidden rounded-2xl border border-oc-periwinkle/70 bg-white p-5 shadow-[0_16px_38px_rgba(20,27,235,0.07)] transition duration-200 hover:-translate-y-0.5 hover:border-oc-blue/35">
      <div className="pointer-events-none absolute -right-14 -top-14 h-40 w-40 rounded-full border border-oc-blue/10" />
      <div className="pointer-events-none absolute -right-7 -top-7 h-28 w-28 rounded-full border border-oc-turquoise/25" />
      <header className="relative flex items-start justify-between gap-4">
        <div className="flex items-center gap-3"><div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-oc-blue/25 bg-oc-mist text-oc-blue"><div className="absolute inset-1.5 rounded-full border border-dashed border-oc-blue/30" /><CategoryIcon category={credential.category || 'Tech'} className="h-6 w-6" /></div><div><p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-oc-blue">Event Orbit</p><p className="mt-0.5 text-xs font-semibold text-slate-500">Digital Credential</p></div></div>
        <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${toneClasses[presentation.tone]}`}>{presentation.label}</span>
      </header>
      <div className="relative mt-7 flex-1">
        <h3 className="break-words text-lg font-black leading-snug text-oc-ink">{credential.eventName || 'Event credential'}</h3>
        <p className="mt-2 text-xs text-slate-500">Awarded to <span className="font-bold text-oc-ink">{recipient}</span></p>
        <dl className="mt-6 grid grid-cols-2 gap-x-4 gap-y-4 border-t border-oc-periwinkle/45 pt-4 text-xs">
          {issuedOn && <div><dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Recorded on</dt><dd className="mt-1 font-semibold text-slate-700">{issuedOn}</dd></div>}
          {hasRealPoints(credential) && <div><dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Points</dt><dd className="mt-1 font-bold text-oc-blue">{credential.points}</dd></div>}
          <div className="col-span-2"><dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Evidence</dt><dd className="mt-1 font-semibold text-slate-700">{presentation.evidence}</dd></div>
          {credential.credentialId && <div className="col-span-2"><dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Credential ID</dt><dd className="mt-1 truncate font-mono text-[11px] text-slate-700">{credential.credentialId}</dd></div>}
          {credential.txHash && <div className="col-span-2"><dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Transaction hash</dt><dd className="mt-1 truncate font-mono text-[11px] text-oc-blue">{credential.txHash}</dd></div>}
        </dl>
      </div>
      <button type="button" onClick={() => onViewDetails?.(credential)} className="relative mt-5 w-full whitespace-nowrap rounded-lg border border-oc-blue/25 bg-oc-mist px-4 py-2.5 text-xs font-bold text-oc-blue transition hover:bg-oc-blue hover:text-white active:translate-y-px">View Credential</button>
    </article>
  );
}

export default CredentialCard;
