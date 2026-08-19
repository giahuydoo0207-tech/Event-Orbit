import React, { useEffect, useState } from 'react';
import { fetchStudentAchievements } from '../api/mockApi';
import { useStore } from '../store/useStore';
import { LoadingBar } from '../components/LoadingBar';
import { CredentialCard } from '../components/CredentialCard';
import { CredentialDetailModal } from '../components/CredentialDetailModal';

export function DashboardStudent() {
  const user = useStore((state) => state.user);
  const [achievements, setAchievements] = useState([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedCredential, setSelectedCredential] = useState(null);

  useEffect(() => {
    async function loadAchievements() {
      if (!user.isAuthenticated) return;
      setLoading(true);
      try {
        const res = await fetchStudentAchievements(user);
        setAchievements(res.achievements || []);
        setTotalPoints(res.totalPoints || 0);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadAchievements();
  }, [user]);

  if (loading) {
    return (
      <div className="py-20 text-center space-y-4 max-w-sm mx-auto font-sans">
        <div className="badge-kicker text-[10px] text-slate-400">Retrieving credentials catalog...</div>
        <LoadingBar className="max-w-[140px] mx-auto" />
      </div>
    );
  }

  return (
    <div className="space-y-10 font-sans">
      
      {/* Welcome Banner */}
      <div className="pb-8 border-b border-oc-periwinkle/30 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-oc-mist border border-oc-periwinkle/60 mb-2">
            <span className="w-2 h-2 rounded-full bg-oc-turquoise animate-pulse"></span>
            <span className="badge-kicker text-oc-blue text-[9px]">Verified OCID Student</span>
          </div>
          <h1 className="text-2xl font-black text-oc-ink">Welcome Back, {user.fullName}!</h1>
          <p className="text-xs text-slate-500 font-medium">
            Tracking your verified event participation and digital credentials on Open Campus ID.
          </p>
          {user.ocid && (
            <div className="text-xs font-mono font-bold text-oc-blue mt-1">{user.ocid}</div>
          )}
          {user.mssv && (
            <div className="text-xs text-slate-500">Student ID: {user.mssv}</div>
          )}
        </div>
        
        {/* Total Points summary box */}
        <div className="min-w-[180px] text-center">
          <div className="badge-kicker text-slate-500 mb-1">
            Total Points Earned
          </div>
          <div className="num text-3xl font-bold text-oc-blue">
            {totalPoints} <span className="text-xs font-bold text-slate-500">PTS</span>
          </div>
        </div>
      </div>

      {/* Credentials Catalog */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-black text-oc-ink">Credentials</h2>
          <span className="badge-kicker text-oc-blue">{achievements.length} Credentials</span>
        </div>

        {achievements.length === 0 ? (
          <div className="text-center py-16 bg-white border border-dashed border-oc-periwinkle rounded-xl space-y-2">
            <h3 className="text-sm font-bold text-oc-ink">No credentials claimed yet</h3>
            <p className="text-xs text-slate-500">
              Attend campus events and check in via QR code to earn your first verified event credential.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {achievements.map((ach) => (
              <CredentialCard
                key={ach.id}
                credential={ach}
                recipientName={user.fullName}
                recipientOcid={user.ocid}
                onViewDetails={(cred) => setSelectedCredential(cred)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal View */}
      {selectedCredential && (
        <CredentialDetailModal
          credential={selectedCredential}
          recipientName={user.fullName}
          recipientOcid={user.ocid}
          onClose={() => setSelectedCredential(null)}
        />
      )}
    </div>
  );
}

export default DashboardStudent;
