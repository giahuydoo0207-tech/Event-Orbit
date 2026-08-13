import React, { useEffect, useState } from 'react';
import { fetchAdminConsole, fetchReviewQueue, transitionEventApi, updateAccessApi } from '../api/mockApi';
import useToastStore from '../store/useToastStore';
import { LoadingBar } from '../components/LoadingBar';

const statusClass = 'inline-block bg-oc-navy text-white px-2 py-1 rounded-md font-mono text-[10px] font-bold uppercase tracking-wider';
const buttonClass = 'whitespace-nowrap rounded-md px-3 py-2 text-xs font-bold transition active:translate-y-px disabled:opacity-50';

export default function AdminReview() {
  const [data, setData] = useState({ events: [], admins: [], organizers: [], chapters: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [organizerForm, setOrganizerForm] = useState({ ocid: '', chapterId: '' });
  const [adminOcid, setAdminOcid] = useState('');
  const [rejection, setRejection] = useState({ eventId: '', reason: '' });
  const showToast = useToastStore((state) => state.showToast);
  const load = async () => {
    setError('');
    try { const [events, access] = await Promise.all([fetchReviewQueue(), fetchAdminConsole()]); setData({ events, ...access }); }
    catch (e) { setError(e.message); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  const transition = async (eventId, action, reason) => { try { await transitionEventApi(eventId, action, reason); setRejection({ eventId: '', reason: '' }); await load(); showToast('Event status updated.', 'success'); } catch (e) { showToast(e.message, 'error'); } };
  const updateAccess = async (payload) => { try { await updateAccessApi(payload); await load(); showToast('Access updated. Existing sessions were revoked.', 'success'); } catch (e) { showToast(e.message, 'error'); } };
  if (loading) return <div className="py-24 text-center" role="status" aria-live="polite"><p className="mb-4 text-sm font-semibold text-slate-600">Loading admin console...</p><LoadingBar className="max-w-[140px] mx-auto" /></div>;
  return <div className="space-y-16 pb-16">
    <header className="max-w-3xl border-b-4 border-oc-blue pb-8">
      <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-oc-blue">Administration</p>
      <h1 className="mt-3 text-4xl font-black tracking-tight text-oc-ink md:text-5xl">Control what earns public trust.</h1>
      <p className="mt-4 max-w-[62ch] text-sm leading-6 text-slate-600">Review events and manage verified OCID access. Every change is enforced by the server and invalidates existing sessions.</p>
    </header>
    {error && <div role="alert" className="rounded-md border border-oc-blue bg-white p-4 text-sm font-semibold text-oc-ink">{error} <button className="ml-3 text-oc-blue underline" onClick={load}>Try again</button></div>}

    <section aria-labelledby="event-review" className="space-y-6">
      <div><h2 id="event-review" className="text-2xl font-black text-oc-ink">Event Review</h2><p className="mt-1 text-sm text-slate-500">All active workflow states, ordered by submission time.</p></div>
      <div className="min-w-0 divide-y divide-oc-periwinkle/70 border-y border-oc-periwinkle/70">
        {data.events.map(event=><EventReviewItem key={event.id} event={event} rejection={rejection} setRejection={setRejection} transition={transition}/>) }
        {data.events.length===0&&<div className="p-8 text-center" role="status"><p className="text-sm font-semibold text-oc-ink">No events are available for review.</p><p className="mt-1 text-xs text-slate-500">New submissions will appear here.</p></div>}
      </div>
    </section>

    <AccessSection title="Organizer Access" fields={<><input aria-label="Organizer OCID" required placeholder="verified-name.edu" value={organizerForm.ocid} onChange={e=>setOrganizerForm({...organizerForm,ocid:e.target.value})}/><select aria-label="Chapter" required value={organizerForm.chapterId} onChange={e=>setOrganizerForm({...organizerForm,chapterId:e.target.value})}><option value="">Select chapter</option>{data.chapters.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></>} onGrant={()=>updateAccess({resource:'organizer',action:'grant',...organizerForm})} grantLabel="Grant Organizer Access" rows={data.organizers.map(row=>({key:`${row.chapter_id}:${row.ocid}`,ocid:row.ocid,detail:row.chapters?.name||row.chapter_id,...row}))} onToggle={row=>updateAccess({resource:'organizer',action:row.status==='active'?'revoke':'reactivate',ocid:row.ocid,chapterId:row.chapter_id})}/>
    <AccessSection title="Admin Access" fields={<input aria-label="Admin OCID" required placeholder="verified-name.edu" value={adminOcid} onChange={e=>setAdminOcid(e.target.value)}/>} onGrant={()=>updateAccess({resource:'admin',action:'grant',ocid:adminOcid})} grantLabel="Grant Admin Access" rows={data.admins.map(row=>({key:row.ocid,ocid:row.ocid,detail:'Platform administrator',...row}))} onToggle={row=>updateAccess({resource:'admin',action:row.status==='active'?'revoke':'reactivate',ocid:row.ocid})}/>
  </div>;
}

function EventReviewItem({ event, rejection, setRejection, transition }) {
  const hasAction = event.status === 'pending_review' || event.status === 'approved';
  const status = event.status?.replaceAll('_', ' ') || 'unknown';

  return <article className="grid min-w-0 gap-6 py-6 lg:grid-cols-[minmax(0,1fr)_16rem] lg:gap-8 lg:py-8">
    <div className="min-w-0">
      <div className="flex min-w-0 flex-col items-start gap-3 sm:flex-row sm:justify-between">
        <h3 className="break-words text-base font-black text-oc-ink">{event.name}</h3>
        <span className={statusClass}>{status}</span>
      </div>
      <dl className="mt-5 grid min-w-0 gap-x-8 gap-y-4 text-xs sm:grid-cols-2">
        <EventDetail label="Chapter" value={event.chapter?.name || 'Unknown'} />
        <EventDetail label="Schedule" value={new Date(event.datetime).toLocaleString()} />
        <EventDetail label="Location" value={event.location || 'Not set'} />
        <EventDetail label="Submitted by" value={event.submittedBy || 'Not recorded'} mono />
        <EventDetail label="Points" value={event.points ?? 'Not set'} />
      </dl>
      {event.rejectionReason&&<p className="mt-5 border-l-2 border-oc-blue pl-3 text-xs leading-5 text-slate-600"><span className="font-bold text-oc-ink">Rejection reason:</span> {event.rejectionReason}</p>}
    </div>

    <div className="min-w-0 border-t border-oc-periwinkle/60 pt-5 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Decision</p>
      {hasAction ? <div className="mt-3 space-y-3">
        {event.status==='pending_review'&&<div className="flex flex-wrap gap-2"><button className={`${buttonClass} bg-oc-blue text-white`} onClick={()=>transition(event.id,'approve')}>Approve</button><button className={`${buttonClass} border border-oc-navy text-oc-navy`} onClick={()=>setRejection({eventId:event.id,reason:''})}>Reject</button></div>}
        {event.status==='approved'&&<button className={`${buttonClass} bg-oc-turquoise text-oc-ink`} onClick={()=>transition(event.id,'publish')}>Publish</button>}
        {rejection.eventId===event.id&&<div className="space-y-2"><label htmlFor={`rejection-${event.id}`} className="block text-xs font-bold text-oc-ink">Rejection reason</label><textarea id={`rejection-${event.id}`} rows="3" value={rejection.reason} onChange={e=>setRejection({...rejection,reason:e.target.value})} className="w-full resize-y rounded-md border border-slate-400 px-3 py-2 text-xs focus:border-oc-blue focus:outline-none"/><div className="flex flex-wrap gap-2"><button disabled={!rejection.reason.trim()} className={`${buttonClass} bg-oc-navy text-white`} onClick={()=>transition(event.id,'reject',rejection.reason)}>Confirm Reject</button><button className={`${buttonClass} border border-slate-400 text-slate-700`} onClick={()=>setRejection({eventId:'',reason:''})}>Cancel</button></div></div>}
      </div> : <p className="mt-3 text-xs font-semibold leading-5 text-slate-600">{event.status==='draft' ? 'Awaiting organizer submission.' : 'No admin decision required.'}</p>}
    </div>
  </article>;
}

function EventDetail({ label, value, mono = false }) {
  return <div className="min-w-0"><dt className="font-mono text-[9px] font-bold uppercase tracking-wider text-slate-400">{label}</dt><dd className={`mt-1 break-words font-semibold text-slate-700 ${mono ? 'font-mono text-[11px]' : ''}`}>{value}</dd></div>;
}

function AccessSection({ title, fields, onGrant, grantLabel, rows, onToggle }) {
  return <section className="space-y-6"><div><h2 className="text-2xl font-black text-oc-ink">{title}</h2><p className="mt-1 text-sm text-slate-500">Grant, revoke, or reactivate verified OCID access.</p></div><form onSubmit={e=>{e.preventDefault();onGrant();}} className="grid gap-3 rounded-md bg-oc-navy p-5 md:grid-cols-[1fr_1fr_auto] [&_input]:rounded-md [&_input]:border-0 [&_input]:px-3 [&_input]:py-3 [&_select]:rounded-md [&_select]:border-0 [&_select]:px-3 [&_select]:py-3">{fields}<button className={`${buttonClass} bg-oc-turquoise px-5 text-oc-ink`}>{grantLabel}</button></form><div className="divide-y divide-oc-periwinkle/60 border-y border-oc-periwinkle/60">{rows.map(row=><div key={row.key} className="grid gap-3 py-4 md:grid-cols-[1fr_1fr_auto] md:items-center"><div><strong className="text-sm text-oc-ink">{row.ocid}</strong><p className="text-xs text-slate-500">{row.detail}</p></div><div><span className={statusClass}>{row.status}</span><p className="mt-1 text-[11px] text-slate-500">{new Date(row.created_at).toLocaleDateString()}</p></div><button className={`${buttonClass} border border-oc-navy text-oc-navy`} onClick={()=>onToggle(row)}>{row.status==='active'?'Revoke':'Reactivate'}</button></div>)}{rows.length===0&&<p className="py-6 text-sm text-slate-500">No access records yet.</p>}</div></section>;
}
