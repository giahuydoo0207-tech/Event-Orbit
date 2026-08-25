import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchStudentAchievementsByOcid } from '../api/mockApi';
import NotFoundState from '../components/NotFoundState';
import { LoadingBar } from '../components/LoadingBar';
import { CredentialCard } from '../components/CredentialCard';
import { CredentialDetailModal } from '../components/CredentialDetailModal';
import { CredentialEvidenceRow } from '../components/CredentialEvidenceRow';

export function PublicProfile() {
  const { ocid } = useParams();
  const [achievements, setAchievements] = useState([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedCredential, setSelectedCredential] = useState(null);

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
      <div className="py-24 text-center space-y-4 max-w-sm mx-auto font-sans">
        <div className="badge-kicker text-[10px] text-slate-400">Retrieving Public Profile data...</div>
        <LoadingBar className="max-w-[140px] mx-auto" />
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
      <div className="bg-surface border border-border rounded-xl p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
          {/* Avatar circle */}
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-oc-navy text-xl font-extrabold text-white shadow-oc-sm">
            {nameInitials}
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-extrabold text-navy leading-tight">{displayName}</h1>
            <div className="inline-block bg-accent-blue/10 border border-accent-blue/20 text-accent-blue font-mono font-bold text-xs px-2.5 py-0.5 rounded-sm">
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

      {/* Credentials gallery */}
      <div className="space-y-4">
        <div>
          <h2 className="text-md font-bold uppercase tracking-wider text-navy">Credentials</h2>
          <p className="text-xs text-text-secondary mt-1">Digital credential records linked to this Open Campus ID.</p>
        </div>

        {achievements.length === 0 ? (
          <div className="text-center py-16 bg-white border border-border rounded-xl space-y-2">
            <p className="text-sm font-bold text-navy">No credentials earned yet</p>
            <p className="text-xs text-text-secondary">Attend an event to earn your first credential.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {achievements.map((ach) => (
              <CredentialCard
                key={ach.id}
                credential={ach}
                recipientName={displayName}
                recipientOcid={ocid}
                onViewDetails={(cred) => setSelectedCredential(cred)}
              />
            ))}
          </div>
        )}
      </div>

      {selectedCredential && (
        <CredentialDetailModal
          credential={selectedCredential}
          recipientName={displayName}
          recipientOcid={ocid}
          onClose={() => setSelectedCredential(null)}
        />
      )}

      {/* Blockchain Transactions Ledger */}
      {achievements.length > 0 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-bold text-navy">Credential Evidence</h2>
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
                  {achievements.map((ach) => <CredentialEvidenceRow key={ach.id} achievement={ach} />)}
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
