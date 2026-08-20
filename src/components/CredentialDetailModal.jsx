import React from 'react';
import { CategoryIcon } from './CategoryIcon';
import { getClaimPresentation, getCredentialPresentation, hasRealPoints, hasRealTransaction } from '../lib/credentialPresentation';

function DetailItem({ label, value, mono = false, span = false }) {
  const displayedValue = value === null || value === undefined || value === '' ? 'Not recorded' : value;
  return <div className={span ? 'sm:col-span-2' : ''}><dt className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">{label}</dt><dd className={`mt-1 break-words text-sm font-semibold text-slate-700 ${mono ? 'font-mono text-xs' : ''}`}>{displayedValue}</dd></div>;
}

function formatDate(value, withTime = false) {
  if (!value) return null;
  return new Date(value).toLocaleString('en-US', withTime ? { dateStyle: 'long', timeStyle: 'short' } : { dateStyle: 'long' });
}

export function CredentialDetailModal({ credential, recipientName, recipientOcid, onClose }) {
  if (!credential) return null;
  const claim = getClaimPresentation(credential);
  const issuance = getCredentialPresentation(credential);
  const recipient = recipientName || recipientOcid || credential.ocid || 'Not recorded';
  const realTransaction = hasRealTransaction(credential);
  const optionalEvidence = [
    ['Token ID', credential.tokenId],
    ['Contract address', credential.contractAddress],
    ['Network', credential.network],
    ['Verification source', credential.verificationSource],
    ['Claimed at', formatDate(credential.claimedAt, true)],
    ['Issued at', formatDate(credential.issuedAt, true)],
  ].filter(([, value]) => value !== null && value !== undefined && value !== '');

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-oc-navy/70 p-0 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={onClose}>
      <section role="dialog" aria-modal="true" aria-labelledby="credential-modal-title" className="max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl sm:p-7" onMouseDown={(event) => event.stopPropagation()}>
        <header className="flex items-start justify-between gap-4 border-b border-oc-periwinkle/60 pb-5">
          <div className="flex min-w-0 items-start gap-3"><div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-oc-blue/25 bg-oc-mist text-oc-blue"><div className="absolute inset-1.5 rounded-full border border-dashed border-oc-blue/30" /><CategoryIcon category={credential.category || 'Tech'} className="h-5 w-5" /></div><div className="min-w-0"><p className="text-[9px] font-bold uppercase tracking-[0.14em] text-oc-blue">Event Orbit Credential</p><h2 id="credential-modal-title" className="mt-1 break-words text-xl font-black leading-snug text-oc-ink">{credential.eventName || 'Event credential'}</h2><p className="mt-1 text-xs font-semibold text-slate-500">Issued by {credential.issuerName || 'issuer not recorded'}</p></div></div>
          <button type="button" onClick={onClose} className="shrink-0 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 active:translate-y-px">Close</button>
        </header>

        <div className="mt-5 rounded-xl border border-oc-periwinkle/70 bg-oc-mist/55 p-5"><p className="text-xs font-semibold text-slate-500">Awarded to</p><p className="mt-1 break-words text-2xl font-black text-oc-ink">{recipient}</p>{recipientOcid && <p className="mt-1 break-all font-mono text-xs font-bold text-oc-blue">{recipientOcid}</p>}</div>

        <section className="mt-5"><h3 className="text-xs font-black text-oc-ink">Credential record</h3><dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-4 rounded-xl border border-slate-200 p-4 sm:grid-cols-2"><DetailItem label="Issuer" value={credential.issuerName} /><DetailItem label="Event date" value={formatDate(credential.eventDate)} /><DetailItem label="Recorded date" value={formatDate(credential.earnedAt, true)} /><DetailItem label="Points" value={hasRealPoints(credential) ? String(credential.points) : null} /><DetailItem label="Claim status" value={claim.label} /><DetailItem label="Issuance status" value={issuance.label} /><DetailItem label="Credential ID" value={credential.credentialId} mono span /></dl></section>

        <section className="mt-5"><h3 className="text-xs font-black text-oc-ink">Issuance and verification evidence</h3><dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2"><DetailItem label="Evidence state" value={issuance.evidence} /><DetailItem label="Transaction hash" value={realTransaction ? credential.txHash : 'Not available'} mono span />{optionalEvidence.map(([label, value]) => <DetailItem key={label} label={label} value={value} mono={label.includes('ID') || label.includes('address')} span={label === 'Contract address'} />)}</dl></section>
      </section>
    </div>
  );
}

export default CredentialDetailModal;
