import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchReadyCredentialClaims, fetchStudentAchievements } from '../api/mockApi';
import { useStore } from '../store/useStore';
import { LoadingBar } from '../components/LoadingBar';
import { CredentialCard } from '../components/CredentialCard';
import { CredentialDetailModal } from '../components/CredentialDetailModal';

export function DashboardStudent() {
  const user = useStore((state) => state.user);
  const [achievements, setAchievements] = useState([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [readyClaims, setReadyClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCredential, setSelectedCredential] = useState(null);

  useEffect(() => {
    async function loadAchievements() {
      if (!user.isAuthenticated) return;
      setLoading(true);
      try {
        const [result, claims] = await Promise.all([fetchStudentAchievements(user), fetchReadyCredentialClaims().catch(() => [])]);
        setAchievements(result.achievements || []);
        setTotalPoints(result.totalPoints || 0);
        setReadyClaims(claims);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    loadAchievements();
  }, [user]);

  if (loading) return <div className="mx-auto max-w-sm space-y-4 py-20 text-center font-sans"><div className="badge-kicker text-[10px] text-slate-400">Retrieving credentials catalog...</div><LoadingBar className="mx-auto max-w-[140px]" /></div>;

  return (
    <div className="space-y-10 font-sans">
      <div className="flex flex-col items-start justify-between gap-6 border-b border-oc-periwinkle/30 pb-8 md:flex-row md:items-center">
        <div className="space-y-1"><div className="mb-2 inline-flex items-center rounded-full border border-oc-periwinkle/60 bg-oc-mist px-2.5 py-0.5"><span className="badge-kicker text-[9px] text-oc-blue">Open Campus ID Student</span></div><h1 className="text-2xl font-black text-oc-ink">Welcome Back, {user.fullName}!</h1><p className="text-xs font-medium text-slate-500">Your event participation and credential records.</p>{user.ocid && <div className="mt-1 font-mono text-xs font-bold text-oc-blue">{user.ocid}</div>}{user.mssv && <div className="text-xs text-slate-500">Student ID: {user.mssv}</div>}</div>
        <div className="min-w-[180px] text-center"><div className="badge-kicker mb-1 text-slate-500">Total Points Earned</div><div className="num text-3xl font-bold text-oc-blue">{totalPoints} <span className="text-xs font-bold text-slate-500">PTS</span></div></div>
      </div>

      {readyClaims[0] && <section className="rounded-xl border border-oc-blue/20 bg-oc-mist px-5 py-4" aria-labelledby="credential-action-title"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><h2 id="credential-action-title" className="text-sm font-black text-oc-ink">Your credential is ready to claim</h2><p className="mt-1 text-xs leading-relaxed text-slate-600">Your participant record for "{readyClaims[0].event?.name || 'this event'}" has been confirmed. Claim your credential to add it to your profile.</p></div><div className="flex shrink-0 flex-wrap gap-2">{readyClaims[0].event?.slug && <Link to={`/e/${readyClaims[0].event.slug}`} className="whitespace-nowrap rounded-lg border border-oc-blue/30 bg-white px-4 py-2 text-xs font-bold text-oc-blue active:translate-y-px">View Event</Link>}<Link to={readyClaims[0].claimUrl} className="whitespace-nowrap rounded-lg bg-oc-blue px-4 py-2 text-xs font-bold text-white active:translate-y-px">Claim Credential</Link></div></div></section>}

      <div className="space-y-4"><div className="flex items-center justify-between"><h2 className="text-lg font-black text-oc-ink">Credentials</h2><span className="badge-kicker text-oc-blue">{achievements.length} Credentials</span></div>{achievements.length === 0 ? <div className="space-y-2 rounded-xl border border-dashed border-oc-periwinkle bg-white py-16 text-center"><h3 className="text-sm font-bold text-oc-ink">No credentials claimed yet</h3><p className="text-xs text-slate-500">Confirmed participation records and claimed credentials will appear here.</p></div> : <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">{achievements.map((achievement) => <CredentialCard key={achievement.id} credential={achievement} recipientName={user.fullName} recipientOcid={user.ocid} onViewDetails={setSelectedCredential} />)}</div>}</div>

      {selectedCredential && <CredentialDetailModal credential={selectedCredential} recipientName={user.fullName} recipientOcid={user.ocid} onClose={() => setSelectedCredential(null)} />}
    </div>
  );
}

export default DashboardStudent;
