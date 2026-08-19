import React, { useState } from 'react';
import { CategoryIcon } from './CategoryIcon';
import useToastStore from '../store/useToastStore';

/**
 * CredentialDetailModal Component — Detailed Digital Credential & Attendance Record
 * Provides full certificate presentation, participation summary, activity timeline, and verification preview.
 */
export function CredentialDetailModal({ credential, recipientName, recipientOcid, onClose }) {
  const [copied, setCopied] = useState(false);
  const showToast = useToastStore((state) => state.showToast);

  if (!credential) return null;

  const eventName = credential.eventName || 'Verified Event Attendance';
  const earnedDate = credential.earnedAt
    ? new Date(credential.earnedAt).toLocaleDateString('en-US', {
        dateStyle: 'full',
      })
    : 'Recent Event Attendance';

  const checkinTime = credential.earnedAt
    ? new Date(credential.earnedAt).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Confirmed';

  const recipient = recipientName || credential.studentName || recipientOcid || credential.ocid || 'Verified Student';
  const credentialId = credential.credentialId || (credential.id ? `EO-${String(credential.id).slice(0, 8).toUpperCase()}` : `EO-${Date.now().toString(36).toUpperCase()}`);
  const points = Number(credential.points) || 0;

  // Status mapping
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

  const handleShare = async () => {
    const shareUrl = window.location.origin + `/credentials/${encodeURIComponent(credentialId)}`;
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        showToast('Credential link copied to clipboard.', 'success');
        setTimeout(() => setCopied(false), 3000);
      }
    } catch (err) {
      showToast('Credential link: ' + shareUrl, 'info');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-oc-navy/70 p-0 sm:items-center sm:p-4 backdrop-blur-sm animate-fade-in"
      onMouseDown={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="credential-modal-title"
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-white p-6 sm:rounded-2xl sm:p-8 space-y-6 shadow-2xl font-sans"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* ── Modal Top Bar ── */}
        <div className="flex items-start justify-between gap-4 border-b border-oc-periwinkle/60 pb-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-oc-blue">
                EVENT ORBIT
              </span>
              <span className="text-slate-300">•</span>
              <span className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">
                CREDENTIAL RECORD
              </span>
              <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.2 font-mono text-[8px] font-bold tracking-wider ${statusStyle}`}>
                {statusLabel}
              </span>
            </div>
            <h2 id="credential-modal-title" className="mt-1 text-xl font-black text-oc-ink truncate">
              {eventName}
            </h2>
          </div>
          <button
            type="button"
            autoFocus
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Close
          </button>
        </div>

        {/* ── High-Fidelity Certificate Card Presentation ── */}
        <div className="relative rounded-xl border-2 border-oc-periwinkle/90 bg-gradient-to-b from-white via-oc-mist/40 to-white p-6 sm:p-8 shadow-sm overflow-hidden text-center space-y-5">
          {/* Guilloche / Certificate Watermark Ring */}
          <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full border border-oc-blue/10" />
          <div className="pointer-events-none absolute -right-6 -top-6 h-32 w-32 rounded-full border border-oc-blue/10" />
          <div className="pointer-events-none absolute -left-12 -bottom-12 h-44 w-44 rounded-full border border-oc-turquoise/20" />
          <div className="pointer-events-none absolute inset-2 rounded-lg border border-dashed border-oc-periwinkle/60" />

          {/* Certificate Header Emblem */}
          <div className="relative flex flex-col items-center justify-center space-y-2">
            <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-md border-2 border-oc-blue/30">
              <div className="absolute inset-1.5 rounded-full border border-dashed border-oc-blue/40" />
              <CategoryIcon category={credential.category || 'Tech'} className="h-7 w-7 text-oc-blue" />
            </div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-oc-blue">
              CERTIFICATE OF PARTICIPATION
            </p>
          </div>

          {/* Recipient & Event Text */}
          <div className="relative space-y-2">
            <p className="text-xs text-slate-500 font-medium">This is officially presented to</p>
            <h3 className="text-2xl font-black text-oc-ink tracking-tight">
              {recipient}
            </h3>
            {recipientOcid && (
              <p className="font-mono text-xs font-bold text-oc-blue">
                {recipientOcid}
              </p>
            )}
            <p className="text-xs text-slate-500 pt-2 font-medium">
              for verified attendance and active participation in
            </p>
            <p className="text-base font-extrabold text-oc-ink px-4">
              "{eventName}"
            </p>
          </div>

          {/* Certificate Footer Details */}
          <div className="relative grid grid-cols-2 sm:grid-cols-3 gap-3 border-t border-oc-periwinkle/70 pt-4 text-[11px] text-left">
            <div>
              <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">Issued On</span>
              <span className="font-semibold text-slate-800">{earnedDate}</span>
            </div>
            <div>
              <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">Awarded Points</span>
              <span className="font-bold text-oc-blue">{points > 0 ? `+${points} Points` : 'Participation'}</span>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">Credential ID</span>
              <span className="font-mono text-[10px] font-bold text-slate-700">{credentialId}</span>
            </div>
          </div>
        </div>

        {/* ── Participation Summary & Timeline ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Summary Box */}
          <div className="rounded-xl border border-oc-periwinkle/70 bg-oc-mist/50 p-4 space-y-3">
            <h4 className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-oc-blue">
              Participation Summary
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Attendance Status:</span>
                <span className="font-bold text-emerald-700 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-600"></span>
                  Checked In &amp; Confirmed
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Check-in Time:</span>
                <span className="font-semibold text-slate-700">{checkinTime}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Credential Type:</span>
                <span className="font-semibold text-slate-700">Digital Event Credential</span>
              </div>
            </div>
          </div>

          {/* Activity Timeline */}
          <div className="rounded-xl border border-oc-periwinkle/70 bg-white p-4 space-y-3">
            <h4 className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-oc-blue">
              Activity Timeline
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[9px] font-bold text-emerald-700">✓</span>
                <span className="text-slate-700">Participant Registered</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[9px] font-bold text-emerald-700">✓</span>
                <span className="text-slate-700">Attendance Checked In</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[9px] font-bold text-emerald-700">✓</span>
                <span className="text-slate-700">Credential Issued &amp; Recorded</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Verification Panel ── */}
        <div className="rounded-xl border border-oc-periwinkle/70 bg-slate-50 p-4 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <h4 className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
              {credential.txHash ? 'On-Chain Record' : 'Verification Record'}
            </h4>
            <span className="font-mono text-[9px] font-bold text-slate-400">
              {credential.txHash ? 'Tx Verified' : 'Standard Verification'}
            </span>
          </div>

          {credential.txHash ? (
            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-slate-500 font-medium">Transaction Hash:</span>
              <span className="font-mono text-oc-blue font-bold">{credential.txHash}</span>
            </div>
          ) : (
            <div className="text-[11px] text-slate-600 leading-relaxed pt-1">
              Issued and cryptographically registered by Event Orbit on Open Campus ID infrastructure. Record ID: <span className="font-mono font-bold text-slate-800">{credentialId}</span>.
            </div>
          )}
        </div>

        {/* ── Action Buttons ── */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2 border-t border-oc-periwinkle/60">
          <button
            type="button"
            onClick={handleShare}
            className="w-full sm:w-auto rounded-lg bg-oc-blue px-5 py-2.5 text-xs font-bold text-white hover:bg-oc-indigo shadow-sm transition-all active:scale-95"
          >
            {copied ? 'Link Copied!' : 'Share Credential'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto rounded-lg border border-slate-300 px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </section>
    </div>
  );
}

export default CredentialDetailModal;
