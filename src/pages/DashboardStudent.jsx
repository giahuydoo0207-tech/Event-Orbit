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
        <div className="text-sm font-medium text-text-secondary">Retrieving achievements catalog...</div>
        <div className="w-10 h-1 bg-border rounded-full mx-auto overflow-hidden relative">
          <div className="absolute top-0 left-0 bottom-0 bg-accent-blue w-1/2 rounded-full animate-[pulse_1s_infinite]"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      
      {/* Welcome Banner */}
      <div className="bg-surface border border-border rounded-2xl p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-navy">Welcome Back, {user.fullName}!</h1>
          <p className="text-xs text-text-secondary">
            Tracking your Open Campus verified event participation and SBT awards.
          </p>
          {user.ocid && (
            <div className="text-xs font-mono text-accent-blue mt-1">{user.ocid}</div>
          )}
          {user.mssv && (
            <div className="text-xs text-text-secondary">Student ID: {user.mssv}</div>
          )}
        </div>
        
        {/* Total Points summary box */}
        <div className="bg-white border border-border rounded-xl p-4 md:p-6 min-w-[160px] text-center shadow-sm">
          <div className="text-[10px] text-text-secondary uppercase font-bold tracking-widest mb-1">
            Total Points Accumulated
          </div>
          <div className="text-3xl font-extrabold text-navy">
            {totalPoints} <span className="text-xs font-semibold text-text-secondary">pts</span>
          </div>
        </div>
      </div>

      {/* Badges Gallery Grid */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-navy">Verified Badge Wallet</h2>
          <p className="text-xs text-text-secondary">
            Soulbound Tokens issued directly to your wallet for verified event attendance.
          </p>
        </div>

        {achievements.length === 0 ? (
          <div className="text-center py-16 bg-surface border border-dashed border-border rounded-xl">
            <h3 className="text-sm font-semibold text-navy">No badges issued yet</h3>
            <p className="text-xs text-text-secondary mt-1">Register and check-in to your first event to earn badges.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
            {achievements.map((ach) => {
              const dateStr = new Date(ach.earnedAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              });
              
              return (
                <div key={ach.id} className="bg-white border border-border rounded-xl p-4 text-center hover:shadow-md transition-all space-y-3">
                  <div className="aspect-square w-24 mx-auto rounded-lg overflow-hidden bg-slate-100 border border-border">
                    <img
                      src={ach.badgeImage}
                      alt={ach.eventName}
                      className="object-cover w-full h-full"
                    />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-xs font-bold text-navy line-clamp-1 leading-tight">
                      {ach.eventName}
                    </h3>
                    <div className="text-[10px] text-accent-blue font-bold">
                      +{ach.points} movement points
                    </div>
                    <div className="text-[9px] text-text-secondary">{dateStr}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Activity History table */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-navy">Attendance History Logs</h2>
          <p className="text-xs text-text-secondary">Audit log of your validated check-in timestamps and blockchain transactions.</p>
        </div>

        {achievements.length > 0 && (
          <div className="bg-white border border-border rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-border uppercase tracking-widest text-[9px] font-bold text-text-secondary">
                    <th className="p-4">Event Name</th>
                    <th className="p-4">Points</th>
                    <th className="p-4">Date Earned</th>
                    <th className="p-4">Blockchain Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {achievements.map((ach) => {
                    const fullDate = new Date(ach.earnedAt).toLocaleString('en-US');
                    return (
                      <tr key={ach.id} className="hover:bg-slate-50/50">
                        <td className="p-4 font-semibold text-navy">{ach.eventName}</td>
                        <td className="p-4 text-success font-bold">+{ach.points} pts</td>
                        <td className="p-4 text-text-secondary">{fullDate}</td>
                        <td className="p-4">
                          <a
                            href={`https://edu-chain-testnet.blockscout.com/tx/${ach.txHash}`}
                            target="_blank"
                            rel="noreferrer"
                            className="font-mono text-accent-blue hover:underline"
                          >
                            {ach.txHash.substring(0, 10)}...{ach.txHash.substring(ach.txHash.length - 4)}
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
export default DashboardStudent;
