import React, { useEffect, useState } from 'react';
import { fetchStudentAchievements } from '../api/mockApi';
import { useStore } from '../store/useStore';

export function DashboardStudent() {
  const user = useStore((state) => state.user);
  const [achievements, setAchievements] = useState([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAchievements() {
      if (!user.isAuthenticated) return;
      setLoading(true);
      try {
        const res = await fetchStudentAchievements(user);
        setAchievements(res.achievements);
        setTotalPoints(res.totalPoints);
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
      <div className="py-20 text-center space-y-4 max-w-sm mx-auto">
        <div className="text-xs font-semibold text-slate-500">Retrieving achievements catalog...</div>
        <div className="w-12 h-1.5 bg-oc-periwinkle/40 rounded-full mx-auto overflow-hidden relative">
          <div className="absolute top-0 left-0 bottom-0 bg-oc-blue w-1/2 rounded-full animate-pulse"></div>
        </div>
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
            Tracking your Open Campus verified event participation and SBT awards on EDU Chain.
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

      {/* Badges & Achievements Catalog */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-black text-oc-ink">Soulbound Token Badges</h2>
          <span className="badge-kicker text-oc-blue">{achievements.length} Credentials</span>
        </div>

        {achievements.length === 0 ? (
          <div className="text-center py-16 bg-white border border-dashed border-oc-periwinkle rounded-2xl space-y-2">
            <h3 className="text-sm font-bold text-oc-ink">No credentials claimed yet</h3>
            <p className="text-xs text-slate-500">
              Attend campus events and check in via QR code to earn your first verified SBT badge.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {achievements.map((ach) => (
              <div
                key={ach.id}
                className="bg-white border border-oc-periwinkle/70 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all space-y-4"
              >
                <div className="relative h-40 bg-oc-mist rounded-xl overflow-hidden flex items-center justify-center p-4 border border-oc-periwinkle/40">
                  <img
                    src={ach.badgeImage}
                    alt={ach.eventName}
                    className="max-h-full max-w-full object-contain rounded-lg shadow-sm"
                  />
                  <div className="absolute top-2 right-2">
                    <span className="badge-kicker bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full text-[9px]">
                      VERIFIED ON-CHAIN
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-oc-ink leading-snug">{ach.eventName}</h3>
                  <div className="badge-kicker text-oc-blue text-[10px]">+ {ach.points} Points</div>
                  <div className="text-[10px] text-slate-500 font-medium pt-1">
                    Earned: {new Date(ach.earnedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                </div>

                {ach.txHash && (
                  <div className="pt-3 border-t border-oc-periwinkle/40 flex justify-between items-center text-[10px]">
                    <span className="text-slate-400 font-medium">Tx Hash:</span>
                    <span className="font-mono text-oc-blue truncate max-w-[120px]">{ach.txHash}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default DashboardStudent;
