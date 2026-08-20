import React from 'react';
import { CategoryIcon } from './CategoryIcon';
import { getCredentialPresentation, hasRealPoints } from '../lib/credentialPresentation';

export function CredentialDetailModal({ credential, recipientName, recipientOcid, onClose }) {
  if (!credential) return null;
  const presentation = getCredentialPresentation(credential);
  const recipient = recipientName || recipientOcid || credential.ocid || 'Recipient unavailable';
  const recordedOn = credential.earnedAt ? new Date(credential.earnedAt).toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' }) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-oc-navy/70 p-0 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={onClose}>
      <section role="dialog" aria-modal="true" aria-labelledby="credential-modal-title" className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-white p-6 shadow-2xl sm:rounded-2xl sm:p-8" onMouseDown={(event) => event.stopPropagation()}>
        <header className="flex items-start justify-between gap-4 border-b border-oc-periwinkle/60 pb-5">
          <div className="flex min-w-0 items-center gap-3"><div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-oc-blue/25 bg-oc-mist text-oc-blue"><div className="absolute inset-1.5 rounded-full border border-dashed border-oc-blue/30" /><CategoryIcon category={credential.category || 'Tech'} className="h-5 w-5" /></div><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-oc-blue">Event Orbit Credential</p><h2 id="credential-modal-title" className="mt-1 break-words text-xl font-black leading-snug text-oc-ink">{credential.eventName || 'Event credential'}</h2></div></div>
          <button type="button" onClick={onClose} className="shrink-0 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 active:translate-y-px">Close</button>
        </header>

        <div className="relative mt-6 overflow-hidden rounded-xl border border-oc-periwinkle/80 bg-gradient-to-br from-oc-mist/70 to-white p-6">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full border border-oc-blue/10" />
          <p className="text-xs font-semibold text-slate-500">Awarded to</p><p className="mt-1 text-2xl font-black text-oc-ink">{recipient}</p>
          {recipientOcid && <p className="mt-1 font-mono text-xs font-bold text-oc-blue">{recipientOcid}</p>}
          <dl className="relative mt-6 grid grid-cols-1 gap-4 border-t border-oc-periwinkle/60 pt-5 sm:grid-cols-2">
            <div><dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Claim status</dt><dd className="mt-1 font-bold text-oc-ink">Claimed</dd></div>
            <div><dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Issuance status</dt><dd className="mt-1 font-bold text-oc-ink">{presentation.label}</dd></div>
            {recordedOn && <div><dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Recorded on</dt><dd className="mt-1 text-sm font-semibold text-slate-700">{recordedOn}</dd></div>}
            {hasRealPoints(credential) && <div><dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Points</dt><dd className="mt-1 text-sm font-bold text-oc-blue">{credential.points}</dd></div>}
            {credential.credentialId && <div className="sm:col-span-2"><dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Credential ID</dt><dd className="mt-1 break-all font-mono text-xs text-slate-700">{credential.credentialId}</dd></div>}
          </dl>
        </div>

        <section className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h3 className="text-xs font-black text-oc-ink">Transaction and verification evidence</h3>
          {credential.txHash ? <><p className="mt-2 text-xs text-slate-600">A transaction hash is recorded for this credential.</p><p className="mt-2 break-all font-mono text-xs text-oc-blue">{credential.txHash}</p></> : <p className="mt-2 text-xs leading-relaxed text-slate-600">No transaction hash or independent verification result is available for this credential.</p>}
        </section>
      </section>
    </div>
  );
}

export default CredentialDetailModal;
