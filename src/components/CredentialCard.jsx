import React from 'react';
import { CategoryIcon } from './CategoryIcon';

/**
 * CredentialCard Component — Digital Credential & Certificate Record
 * Replaces the old event thumbnail card with an authentic, professional digital credential.
 */
export function CredentialCard({ credential, recipientName, recipientOcid, onViewDetails }) {
  if (!credential) return null;

  const eventName = credential.eventName || 'Verified Event Attendance';
  const earnedDate = credential.earnedAt
    ? new Date(credential.earnedAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Recent';

  // Determine credential status badge (No fake on-chain claims)
  const isSample = credential.isSample || credential.id?.toString().startsWith('sample-');
  const isClaimed = credential.mintStatus === 'claimed' || credential.mintStatus === 'success';
  const isPending = credential.mintStatus === 'pending' || credential.mintStatus === 'minting';

  let statusLabel = 'ISSUED';
  let statusStyle = 'bg-emerald-50 text-emerald-700 border-emerald-200';

  if (isSample) {
    statusLabel = 'SAMPLE';
    statusStyle = 'bg-slate-100 text-slate-700 border-slate-200';
  } else if (isClaimed) {
    statusLabel = 'CLAIMED';
    statusStyle = 'bg-oc-mist text-oc-blue border-oc-periwinkle';
  } else if (isPending) {
    statusLabel = 'PENDING';
    statusStyle = 'bg-amber-50 text-amber-700 border-amber-200';
  }

  const credentialId = credential.credentialId || (credential.id ? `EO-${String(credential.id).slice(0, 8).toUpperCase()}` : null);
  const recipient = recipientName || credential.studentName || recipientOcid || credential.ocid || 'Verified Student';
  const points = Number(credential.points) || 0;

  return (
    <article className="group relative flex flex-col justify-between rounded-2xl border border-oc-periwinkle/80 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-oc-blue/40 hover:shadow-md">
      
      {/* ── Top Certificate Header & Seal ── */}
      <div>
        <div className="relative mb-4 flex items-center justify-between rounded-xl bg-gradient-to-br from-oc-mist to-slate-50 p-4 border border-oc-periwinkle/40 overflow-hidden">
          {/* Subtle Guilloche / Orbit watermark lines */}
          <div className="pointer-events-none absolute -right-6 -bottom-6 h-28 w-28 rounded-full border border-oc-blue/10" />
          <div className="pointer-events-none absolute -right-3 -bottom-3 h-20 w-20 rounded-full border border-oc-blue/10" />
          <div className="pointer-events-none absolute -left-8 -top-8 h-24 w-24 rounded-full border border-oc-turquoise/20" />

          {/* Left: Certificate Emblem Seal */}
          <div className="relative flex items-center gap-3">
            <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white shadow-sm border border-oc-periwinkle/80">
              <div className="absolute inset-1 rounded-full border border-dashed border-oc-blue/30" />
              <CategoryIcon category={credential.category || 'Tech'} className="h-5 w-5 text-oc-blue" />
            </div>
            <div>
              <p className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-oc-blue">
                Event Orbit
              </p>
              <p className="font-mono text-[10px] font-semibold text-slate-500">
                Digital Credential
              </p>
            </div>
          </div>

          {/* Right: Status Pill */}
          <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-mono text-[9px] font-bold tracking-wider ${statusStyle}`}>
            <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
            {statusLabel}
          </span>
        </div>

        {/* ── Credential Info ── */}
        <div className="space-y-3">
          <div>
            <h3 className="text-base font-black text-oc-ink leading-snug group-hover:text-oc-blue transition-colors line-clamp-2">
              {eventName}
            </h3>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              Awarded to: <span className="font-bold text-oc-ink">{recipient}</span>
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-oc-periwinkle/40 text-[11px]">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Issued Date</span>
              <span className="font-medium text-slate-700">{earnedDate}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Performance</span>
              {points > 0 ? (
                <span className="font-bold text-oc-blue">+{points} Points</span>
              ) : (
                <span className="font-medium text-slate-700">Participation</span>
              )}
            </div>
          </div>

          {credentialId && (
            <div className="pt-2 border-t border-oc-periwinkle/40 flex items-center justify-between text-[10px]">
              <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Credential ID</span>
              <span className="font-mono text-slate-600 truncate max-w-[130px] font-semibold">{credentialId}</span>
            </div>
          )}

          {credential.txHash && (
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Tx Hash</span>
              <span className="font-mono text-oc-blue truncate max-w-[120px]">{credential.txHash}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom Action ── */}
      <div className="mt-4 pt-3 border-t border-oc-periwinkle/50">
        <button
          type="button"
          onClick={() => onViewDetails && onViewDetails(credential)}
          className="w-full rounded-lg bg-oc-mist/80 py-2.5 text-center text-xs font-bold text-oc-blue border border-oc-periwinkle/70 hover:bg-oc-blue hover:text-white hover:border-oc-blue transition-all active:scale-[0.99]"
        >
          View Credential
        </button>
      </div>
    </article>
  );
}

export default CredentialCard;
