import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchStudentAchievementsByOcid } from '../api/mockApi';
import NotFoundState from '../components/NotFoundState';

export function PublicProfile() {
  const { ocid } = useParams();
  const [achievements, setAchievements] = useState([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPublicData() {
      setLoading(true);
      try {
        // Query achievements STRICTLY filtered by the matching ocid in route parameter
        const res = await fetchStudentAchievementsByOcid(ocid);
        setAchievements(res.achievements);
        setTotalPoints(res.totalPoints);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadPublicData();
  }, [ocid]);

  if (loading) {
    return (
      <div className="py-24 text-center space-y-4 max-w-lg mx-auto">
        <div className="text-sm font-medium text-text-secondary">Retrieving Public Profile data...</div>
        <div className="w-10 h-1 bg-border rounded-full mx-auto overflow-hidden relative">
          <div className="absolute top-0 left-0 bottom-0 bg-accent-blue w-1/2 rounded-full animate-[pulse_1s_infinite]"></div>
        </div>
      </div>
    );
  }

  // Check if student profile exists in demo database
  const profileExists = ocid === 'alex.edu' || ocid === 'sarah.edu';
  if (!profileExists) {
    return (
      <NotFoundState
        title="Profile not found"
        message="No profile found for this OCID."
        backTo="/events"
        backLabel="Browse events"
      />
    );
  }

  // Parse initials from name or ocid
  const nameInitials = ocid ? ocid.split('.')[0].substring(0, 2).toUpperCase() : 'ST';
  const displayName = ocid ? ocid.split('.')[0].replace(/^\w/, (c) => c.toUpperCase()) + ' Student' : 'Student User';

  return (
    <div className="max-w-4xl mx-auto py-10 space-y-12">
      
      {/* Back link */}
      <div>
        <Link to="/events" className="text-xs font-bold text-text-secondary hover:text-navy uppercase tracking-wider">
          &larr; Back to Events
        </Link>
      </div>

      {/* Main Profile Info Card */}
      <div className="bg-surface border border-border rounded-2xl p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
          {/* Avatar circle */}
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-white font-extrabold text-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 shadow-sm shrink-0">
            {nameInitials}
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-extrabold text-navy leading-tight">{displayName}</h1>
            <div className="inline-block bg-accent-blue/10 border border-accent-blue/20 text-accent-blue font-mono font-bold text-xs px-2.5 py-0.5 rounded">
              {ocid}
            </div>
            <div className="text-[10px] text-text-secondary">
              Joined September 2025
            </div>
          </div>
        </div>

        {/* Stats box */}
        <div className="grid grid-cols-2 gap-4 border-l border-border/50 pl-6 min-w-[200px]">
          <div>
            <div className="text-[9px] text-text-secondary uppercase font-bold tracking-widest">Events Attended</div>
            <div className="text-2xl font-black text-navy">{achievements.length}</div>
          </div>
          <div>
            <div className="text-[9px] text-text-secondary uppercase font-bold tracking-widest">Total Points</div>
            <div className="text-2xl font-black text-accent-blue">{totalPoints} pts</div>
          </div>
        </div>
      </div>

      {/* Badges gallery (verified tokens) */}
      <div className="space-y-4">
        <div>
          <h2 className="text-md font-bold uppercase tracking-wider text-navy">Verified Soulbound Token Badges</h2>
          <p className="text-xs text-text-secondary mt-1">SBT credentials certified on EDU Chain Testnet.</p>
        </div>

        {achievements.length === 0 ? (
          <div className="text-center py-16 bg-white border border-border rounded-xl space-y-2">
            <p className="text-sm font-bold text-navy">No badges earned yet</p>
            <p className="text-xs text-text-secondary">Attend an event to earn your first SBT.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
            {achievements.map((ach) => (
              <div key={ach.id} className="bg-white border border-border rounded-xl p-4 text-center space-y-3 shadow-sm hover:shadow-md transition-all">
                <div className="aspect-square w-20 mx-auto rounded-lg overflow-hidden bg-slate-50 border border-border">
                  <img
                    src={ach.badgeImage}
                    alt={ach.eventName}
                    className="object-cover w-full h-full"
                  />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xs font-bold text-navy line-clamp-1 leading-tight">{ach.eventName}</h3>
                  <div className="text-[9px] text-accent-blue font-bold">+{ach.points} pts</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Blockchain Transactions Ledger */}
      {achievements.length > 0 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-md font-bold uppercase tracking-wider text-navy">Public Transaction Ledger</h2>
            <p className="text-xs text-text-secondary mt-1">Independent receipts verifying credentials on block explorer.</p>
          </div>

          <div className="bg-white border border-border rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-border uppercase tracking-widest text-[9px] font-bold text-text-secondary">
                    <th className="p-4">Event Name</th>
                    <th className="p-4">Points</th>
                    <th className="p-4">Transaction Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {achievements.map((ach) => (
                    <tr key={ach.id} className="hover:bg-slate-50/50">
                      <td className="p-4 font-semibold text-navy">{ach.eventName}</td>
                      <td className="p-4 text-success font-bold">+{ach.points} pts</td>
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
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
export default PublicProfile;
