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
      <div className="student-achievement-hero relative flex flex-col items-start justify-between gap-6 overflow-hidden rounded-xl bg-oc-navy p-6 text-white shadow-oc-lg sm:p-8 md:flex-row md:items-center">
        <div className="space-y-2">
          <div className="text-xs font-bold text-oc-turquoise">Open Campus ID Student</div>
          <h1 className="text-2xl font-black leading-tight text-white sm:text-3xl">My Achievements</h1>
          <p className="text-sm font-medium text-oc-periwinkle">Your event participation and credential records.</p>
          {user.ocid && <div className="font-mono text-xs font-bold text-oc-turquoise">{user.ocid}</div>}
          {user.mssv && <div className="text-xs text-oc-periwinkle">Student ID: {user.mssv}</div>}
        </div>
        <div className="w-full rounded-xl border border-white/15 bg-white/10 px-5 py-4 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] md:w-auto md:min-w-[180px] md:text-center">
          <div className="mb-1 text-xs font-bold text-oc-periwinkle">Total points earned</div>
          <div className="num text-3xl font-bold text-white">{totalPoints} <span className="text-xs font-bold text-oc-turquoise">PTS</span></div>
        </div>
      </div>

      {readyClaims[0] && <section className="surface-card bg-oc-mist px-5 py-4" aria-labelledby="credential-action-title"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><h2 id="credential-action-title" className="text-sm font-black text-oc-ink">Your credential is ready to claim</h2><p className="mt-1 text-sm leading-6 text-slate-600">Your participant record for "{readyClaims[0].event?.name || 'this event'}" has been confirmed. Claim your credential to add it to your profile.</p></div><div className="flex shrink-0 flex-wrap gap-2">{readyClaims[0].event?.slug && <Link to={`/e/${readyClaims[0].event.slug}`} className="action-secondary">View Event</Link>}<Link to={readyClaims[0].claimUrl} className="action-primary">Claim Credential</Link></div></div></section>}

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div><h2 className="text-xl font-black text-oc-ink">Credential portfolio</h2><p className="mt-1 text-sm text-slate-600">Claim and issuance evidence remain clearly separated.</p></div>
          <span className="rounded-full bg-oc-mist px-3 py-1 text-xs font-bold text-oc-blue">{achievements.length} total</span>
        </div>
        {achievements.length === 0 ? (
          <div className="empty-state student-empty-state space-y-2"><div className="student-empty-icon" aria-hidden="true"><span /></div><h3 className="text-sm font-bold text-oc-ink">No credentials claimed yet</h3><p className="text-sm text-slate-500">Confirmed participation records and claimed credentials will appear here.</p></div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">{achievements.map((achievement) => <CredentialCard key={achievement.id} credential={achievement} recipientName={user.fullName} recipientOcid={user.ocid} onViewDetails={setSelectedCredential} variant="student" />)}</div>
        )}
      </div>

      {selectedCredential && <CredentialDetailModal credential={selectedCredential} recipientName={user.fullName} recipientOcid={user.ocid} onClose={() => setSelectedCredential(null)} />}
    </div>
  );
}

export default DashboardStudent;
