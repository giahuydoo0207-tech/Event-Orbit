import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useOCAuth } from '@opencampus/ocid-connect-js';
import { getAuthHeaders } from '../api/mockApi';
import { useStore } from '../store/useStore';
import { hasTrustedStudentIdentity } from '../../lib/studentIdentity';

export default function ClaimBadge() {
  const { token } = useParams();
  const { ocAuth } = useOCAuth();
  const user = useStore((state) => state.user);
  const logout = useStore((state) => state.logout);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [claiming, setClaiming] = useState(false);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    fetch(`/api/claim?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || 'Unable to load this claim link.');
        setData(body);
      })
      .catch((err) => setError(err.message));
  }, [token]);

  const claim = async () => {
    if (!canClaim) {
      setError('This Open Campus ID is not authorized to claim this credential.');
      return;
    }
    setClaiming(true);
    setError('');
    try {
      const res = await fetch('/api/claim', { method: 'POST', headers: { 'Content-Type': 'application/json', ...getAuthHeaders() }, credentials: 'include', body: JSON.stringify({ claimToken: token }) });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Unable to claim this credential.');
      setSuccess(body);
    } catch (err) { setError(err.message); } finally { setClaiming(false); }
  };

  const recipient = data?.claim?.importMssv || data?.claim?.importEmail;
  const normalizeIdentity = (value) => String(value || '').trim().toLowerCase();
  const intendedIdentities = [data?.claim?.importMssv, data?.claim?.importEmail].map(normalizeIdentity).filter(Boolean);
  const currentIdentities = [user?.mssv, user?.email, user?.ocid].map(normalizeIdentity).filter(Boolean);
  const hasStudentIdentity = hasTrustedStudentIdentity(user);
  const identityMatches = intendedIdentities.length > 0 && intendedIdentities.some((identity) => currentIdentities.includes(identity));
  const hasIdentityMismatch = Boolean(user?.isAuthenticated && intendedIdentities.length > 0 && !identityMatches);
  const canClaim = Boolean(user?.isAuthenticated && hasStudentIdentity && !hasIdentityMismatch);
  const currentIdentity = user?.ocid || user?.mssv || user?.email || 'unknown identity';
  const reconnect = async () => {
    await logout();
    ocAuth.signInWithRedirect({ state: 'opencampus' });
  };
  return <main className="min-h-[100dvh] bg-oc-navy px-4 py-10 font-sans text-white sm:px-8">
    <div className="mx-auto grid min-h-[calc(100dvh-5rem)] max-w-5xl items-center gap-10 md:grid-cols-[1.1fr_.9fr]">
      <section className="space-y-6">
        <p className="font-mono text-xs font-bold tracking-[0.16em] text-oc-turquoise">OPEN CAMPUS DIGITAL CREDENTIAL</p>
        <h1 className="max-w-xl text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">Claim your event credential.</h1>
        {data && <><p className="text-lg text-white/75">{data.event.name}</p><p className="font-mono text-sm text-oc-turquoise">{data.event.points} POINTS</p></>}
      </section>
      <section className="border border-white/20 bg-white/5 p-6 sm:p-8 rounded-xl">
        {!data && !error && <p className="font-mono text-sm text-white/65" aria-live="polite">Loading claim details...</p>}
        {error && <p className="text-sm leading-6 text-white/80" role="alert">{error}</p>}
        {data && !success && <div className="space-y-6"><div><p className="font-mono text-xs tracking-[0.12em] text-oc-turquoise">THIS LINK IS FOR</p><p className="mt-2 text-xl font-bold">{data.claim.importName}</p><p className="mt-1 text-sm text-white/70">{recipient}</p></div>{user?.isAuthenticated ? <div className="space-y-4"><p className="text-sm text-white/70">Connected as {currentIdentity}</p>{!hasStudentIdentity || hasIdentityMismatch ? <div className="space-y-4"><p className="border-l-2 border-oc-turquoise pl-4 text-sm leading-6 text-white/80" role="alert">{!hasStudentIdentity ? "This account does not have a trusted student identity. Please sign out and reconnect with the student's Open Campus ID." : `This link appears to be for ${data.claim.importName} (${recipient}), but you are connected as ${currentIdentity}.`}</p><button onClick={reconnect} className="w-full rounded-lg bg-oc-turquoise px-5 py-3 text-sm font-extrabold text-oc-navy transition active:translate-y-px">Sign out and reconnect</button></div> : <button onClick={claim} disabled={claiming} className="w-full rounded-lg bg-oc-turquoise px-5 py-3 text-sm font-extrabold text-oc-navy transition active:translate-y-px disabled:opacity-60">{claiming ? 'Claiming...' : 'Claim My Credential'}</button>}</div> : <button onClick={() => ocAuth.signInWithRedirect({ state: 'opencampus' })} className="w-full rounded-lg bg-oc-turquoise px-5 py-3 text-sm font-extrabold text-oc-navy transition active:translate-y-px">Connect with Open Campus ID</button>}</div>}
        {success && <div className="space-y-5"><div className="border border-oc-turquoise bg-oc-navy p-5"><p className="font-mono text-xs font-bold tracking-[0.16em] text-oc-turquoise">OPEN CAMPUS ID</p><p className="mt-3 text-3xl font-extrabold tracking-tight text-oc-turquoise">CLAIMED</p></div><p className="text-lg font-bold">{success.eventName}</p><p className="font-mono text-sm text-white/70">{success.points} POINTS</p>{success.txHash && <p className="break-all font-mono text-xs text-white/60">Transaction: {success.txHash}</p>}</div>}
      </section>
    </div>
  </main>;
}
