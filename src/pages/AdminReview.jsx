import React, { useEffect, useMemo, useState } from 'react';
import { createChapterApi, fetchAdminConsole, fetchReviewQueue, transitionEventApi, updateAccessApi } from '../api/mockApi';
import useToastStore from '../store/useToastStore';
import { LoadingBar } from '../components/LoadingBar';

const statusClass = 'inline-block rounded-full bg-oc-navy px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-white';
const buttonClass = 'whitespace-nowrap rounded-lg px-3 py-2 text-xs font-bold transition active:translate-y-px disabled:opacity-50';
const sectionTabs = [
  ['events', 'Event Review'],
  ['chapters', 'Chapter Management'],
  ['access', 'Access Control'],
];

const includesQuery = (values, query) => values.some((value) => String(value ?? '').toLowerCase().includes(query));

export default function AdminReview() {
  const [data, setData] = useState({ events: [], admins: [], organizers: [], chapters: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [organizerForm, setOrganizerForm] = useState({ ocid: '', chapterId: '' });
  const [adminOcid, setAdminOcid] = useState('');
  const [rejection, setRejection] = useState({ eventId: '', reason: '' });
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [activeSection, setActiveSection] = useState('events');
  const [sectionSearch, setSectionSearch] = useState({ events: '', chapters: '', access: '' });
  const [eventStatus, setEventStatus] = useState('all');
  const [creatingChapter, setCreatingChapter] = useState(false);
  const [chapterFormOpen, setChapterFormOpen] = useState(true);
  const [chapterForm, setChapterForm] = useState({ name: '', slug: '', category: '', ocid: '', description: '' });
  const showToast = useToastStore((state) => state.showToast);

  const load = async () => {
    setError('');
    try {
      const [events, access] = await Promise.all([fetchReviewQueue(), fetchAdminConsole()]);
      setData({ events, ...access });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!selectedEvent && !deleteTarget) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') {
        setSelectedEvent(null);
        setRejection({ eventId: '', reason: '' });
        setDeleteTarget(null);
      }
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [selectedEvent, deleteTarget]);

  const transition = async (eventId, action, reason) => {
    try {
      await transitionEventApi(eventId, action, reason);
      setRejection({ eventId: '', reason: '' });
      await load();
      setSelectedEvent(null);
      showToast('Event status updated.', 'success');
    } catch (e) {
      showToast(e.message, 'error');
    }
  };

  const updateAccess = async (payload) => {
    try {
      await updateAccessApi(payload);
      await load();
      showToast('Access updated. Existing sessions were revoked.', 'success');
    } catch (e) {
      showToast(e.message, 'error');
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await updateAccessApi({
        resource: deleteTarget.resource,
        action: 'delete',
        ocid: deleteTarget.ocid,
        chapterId: deleteTarget.chapterId,
      });
      setDeleteTarget(null);
      await load();
      showToast('Access record permanently deleted.', 'success');
    } catch (e) {
      showToast(e.message, 'error');
    }
  };

  const closeReview = () => {
    setSelectedEvent(null);
    setRejection({ eventId: '', reason: '' });
  };

  const eventQuery = sectionSearch.events.trim().toLowerCase();
  const chapterQuery = sectionSearch.chapters.trim().toLowerCase();
  const accessQuery = sectionSearch.access.trim().toLowerCase();
  const filteredEvents = useMemo(() => data.events.filter((event) => {
    const matchesStatus = eventStatus === 'all' || event.status === eventStatus;
    return matchesStatus && (!eventQuery || includesQuery([event.name, event.chapter?.name, event.status], eventQuery));
  }), [data.events, eventStatus, eventQuery]);
  const filteredChapters = useMemo(() => data.chapters.filter((chapter) =>
    !chapterQuery || includesQuery([chapter.name, chapter.slug, chapter.category, chapter.ocid], chapterQuery)
  ), [data.chapters, chapterQuery]);
  const filteredAdmins = useMemo(() => data.admins.filter((row) =>
    !accessQuery || includesQuery([row.ocid, row.status, 'admin'], accessQuery)
  ), [data.admins, accessQuery]);
  const filteredOrganizers = useMemo(() => data.organizers.filter((row) =>
    !accessQuery || includesQuery([row.ocid, row.status, row.chapters?.name, 'organizer'], accessQuery)
  ), [data.organizers, accessQuery]);

  const createChapter = async (event) => {
    event.preventDefault();
    setCreatingChapter(true);
    try {
      await createChapterApi(chapterForm);
      setChapterForm({ name: '', slug: '', category: '', ocid: '', description: '' });
      await load();
      showToast('Chapter created successfully.', 'success');
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setCreatingChapter(false);
    }
  };

  // Check client-side if organizerForm.ocid is already active for another chapter
  const activeConflict = organizerForm.ocid.trim()
    ? data.organizers.find(
        (o) =>
          o.ocid.toLowerCase() === organizerForm.ocid.trim().toLowerCase() &&
          o.status === 'active'
      )
    : null;

  if (loading) {
    return (
      <div className="py-24 text-center" role="status" aria-live="polite">
        <p className="mb-4 text-sm font-semibold text-slate-600">Loading admin console...</p>
        <LoadingBar className="max-w-[140px] mx-auto" />
      </div>
    );
  }

  return (
    <div className="pb-10">
      <div className="overflow-hidden rounded-xl border border-[#DCE3F5] bg-white shadow-[0_12px_32px_rgba(7,10,63,0.07)]">
        <header data-visual-direction="header-b" className="border-t-[6px] border-t-oc-navy bg-white px-4 pb-4 pt-5 sm:px-6 sm:pb-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#00A9A5]">ACADEMIC GOVERNANCE WORKSPACE</p>
            <h1 className="mt-1.5 text-2xl font-black tracking-tight text-oc-ink">Admin Console</h1>
            <p className="mt-1.5 max-w-2xl text-sm font-medium leading-5 text-[#63708A]">Review event quality, manage chapters, and audit trusted OCID access.</p>
          </div>
          <dl className="mt-4 grid grid-cols-3 overflow-hidden rounded-xl border border-[#DCE3F5] bg-[#DCE3F5] gap-px sm:max-w-2xl">
            <SummaryCard icon="pending" label="Pending" value={data.events.filter((event) => event.status === 'pending_review').length} />
            <SummaryCard icon="chapters" label="Chapters" value={data.chapters.length} />
            <SummaryCard icon="access" label="Active access" value={[...data.admins, ...data.organizers].filter((row) => row.status === 'active').length} />
          </dl>
        </header>

      {error && (
        <div role="alert" className="m-4 rounded-lg border border-oc-blue bg-[#F5F7FF] p-4 text-sm font-semibold text-oc-ink sm:m-6">
          {error} <button className="ml-3 text-oc-blue underline" onClick={load}>Try again</button>
        </div>
      )}

      <nav className="flex gap-2 overflow-x-auto border-y border-[#DCE3F5] bg-[#FBFCFF] p-2.5 sm:px-6" aria-label="Admin sections">
        {sectionTabs.map(([id, label]) => <button key={id} onClick={() => setActiveSection(id)} className={`rounded-lg px-4 py-2.5 text-xs font-bold transition-colors ${activeSection === id ? 'bg-[#1D24FF] text-white' : 'text-[#63708A] hover:bg-white hover:text-[#070A3F]'}`}>{label}</button>)}
      </nav>

      <div className="bg-white p-4 sm:p-6 lg:p-8">
      {activeSection === 'events' && <section data-visual-direction="event-review-g" aria-labelledby="event-review" className="space-y-3">
        <div>
          <h2 id="event-review" className="text-2xl font-black text-oc-ink">Event Review</h2>
          <p className="mt-1 text-sm text-slate-500">Review active workflow states without changing the event lifecycle.</p>
        </div>
        <div className="space-y-2.5 rounded-xl border border-[#DCE3F5] bg-[#FBFCFF] p-3">
          <input type="search" value={sectionSearch.events} onChange={(event) => setSectionSearch({ ...sectionSearch, events: event.target.value })} placeholder="Search events" aria-label="Search events" className="w-full rounded-lg border border-[#DCE3F5] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1D24FF]" />
          <div className="flex flex-nowrap gap-2 overflow-x-auto pb-0.5" role="group" aria-label="Filter events by status">
          {['all', 'pending_review', 'approved', 'published', 'rejected', 'draft'].map((status) => <button key={status} onClick={() => setEventStatus(status)} className={`shrink-0 rounded-lg border px-3 py-2 text-xs font-bold ${eventStatus === status ? 'border-[#1D24FF] bg-[#1D24FF] text-white' : 'border-[#DCE3F5] bg-white text-[#63708A]'}`}>{status === 'all' ? 'All' : status.replaceAll('_', ' ')}</button>)}
          </div>
        </div>
        <div
          aria-label="Event review list"
          className="overflow-hidden rounded-xl border border-[#DCE3F5] bg-white shadow-[0_8px_24px_rgba(7,10,63,0.04)]"
        >
          <div className="sticky top-0 z-10 hidden grid-cols-[minmax(0,1fr)_minmax(8rem,0.45fr)_5rem_7rem_5rem] gap-4 border-b border-oc-periwinkle/70 bg-oc-mist px-4 py-2.5 font-mono text-[9px] font-bold uppercase tracking-wider text-slate-500 sm:grid">
            <span>Event</span><span>Chapter</span><span>Points</span><span>Status</span><span className="text-right pr-2">Action</span>
          </div>
          <div className="divide-y divide-[#E7EBF7]">
            {filteredEvents.map((event) => (
              <EventReviewRow key={event.id} event={event} onReview={setSelectedEvent} />
            ))}
          </div>
          {filteredEvents.length === 0 && (
            <div className="p-8 text-center" role="status">
              <p className="text-sm font-semibold text-oc-ink">No events match this view.</p>
              <p className="mt-1 text-xs text-slate-500">Adjust the status filter or search query.</p>
            </div>
          )}
        </div>
      </section>}

      {activeSection === 'chapters' && <ChapterManagement chapters={filteredChapters} form={chapterForm} setForm={setChapterForm} onSubmit={createChapter} submitting={creatingChapter} search={sectionSearch.chapters} onSearch={(value) => setSectionSearch({ ...sectionSearch, chapters: value })} formOpen={chapterFormOpen} onToggleForm={() => setChapterFormOpen((open) => !open)} />}

      {activeSection === 'access' && <section data-visual-direction="access-control-h" aria-labelledby="access-control" className="space-y-6"><div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h2 id="access-control" className="text-2xl font-black text-oc-ink">Access Control</h2><p className="mt-1 text-sm text-slate-500">Manage verified OCID roles. The server remains the source of truth.</p></div><input type="search" value={sectionSearch.access} onChange={(event) => setSectionSearch({ ...sectionSearch, access: event.target.value })} placeholder="Search OCID, role, or chapter" aria-label="Search OCID access records" className="w-full rounded-lg border border-[#DCE3F5] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1D24FF] sm:max-w-xs" /></div><AccessSection
        title="Organizer Access"
        warning={
          activeConflict ? (
            <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-300 px-3 py-2 text-xs font-semibold text-amber-900">
              <span>⚠️</span>
              <span>
                <strong>{activeConflict.ocid}</strong> is currently active for <em>"{activeConflict.chapters?.name || activeConflict.chapter_id}"</em>. Revoke that access first before assigning a new chapter.
              </span>
            </div>
          ) : null
        }
        fields={
          <>
            <input
              aria-label="Organizer OCID"
              required
              placeholder="verified-name.edu"
              value={organizerForm.ocid}
              onChange={(e) => setOrganizerForm({ ...organizerForm, ocid: e.target.value })}
            />
            <select
              aria-label="Chapter"
              required
              value={organizerForm.chapterId}
              onChange={(e) => setOrganizerForm({ ...organizerForm, chapterId: e.target.value })}
            >
              <option value="">Select chapter</option>
              {data.chapters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </>
        }
        onGrant={() => updateAccess({ resource: 'organizer', action: 'grant', ...organizerForm })}
        grantLabel="Grant Organizer Access"
        rows={filteredOrganizers.map((row) => ({
          key: `${row.chapter_id}:${row.ocid}`,
          resource: 'organizer',
          ocid: row.ocid,
          chapter_id: row.chapter_id,
          detail: row.chapters?.name || row.chapter_id,
          ...row,
        }))}
        onToggle={(row) =>
          updateAccess({
            resource: 'organizer',
            action: row.status === 'active' ? 'revoke' : 'reactivate',
            ocid: row.ocid,
            chapterId: row.chapter_id,
          })
        }
        onDelete={(row) =>
          setDeleteTarget({
            resource: 'organizer',
            ocid: row.ocid,
            chapterId: row.chapter_id,
            detail: row.chapters?.name || row.chapter_id,
          })
        }
      />

      <AccessSection
        title="Admin Access"
        fields={
          <input
            aria-label="Admin OCID"
            required
            placeholder="verified-name.edu"
            value={adminOcid}
            onChange={(e) => setAdminOcid(e.target.value)}
          />
        }
        onGrant={() => updateAccess({ resource: 'admin', action: 'grant', ocid: adminOcid })}
        grantLabel="Grant Admin Access"
        rows={filteredAdmins.map((row) => ({
          key: row.ocid,
          resource: 'admin',
          ocid: row.ocid,
          detail: 'Platform administrator',
          ...row,
        }))}
        onToggle={(row) =>
          updateAccess({
            resource: 'admin',
            action: row.status === 'active' ? 'revoke' : 'reactivate',
            ocid: row.ocid,
          })
        }
        onDelete={(row) =>
          setDeleteTarget({
            resource: 'admin',
            ocid: row.ocid,
            detail: 'Platform administrator',
          })
        }
      /><aside className="rounded-lg border border-[#DCE3F5] bg-[#F5F7FF] px-4 py-3 text-xs text-[#63708A]">Credential lookup requires a dedicated admin-safe API.</aside></section>}
      </div>
      </div>

      {selectedEvent && (
        <EventReviewModal
          event={selectedEvent}
          rejection={rejection}
          setRejection={setRejection}
          transition={transition}
          onClose={closeReview}
        />
      )}

      {deleteTarget && (
        <DeleteConfirmModal
          target={deleteTarget}
          onConfirm={confirmDelete}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

function SummaryCard({ icon, label, value }) {
  return <div className="flex min-h-16 items-center justify-center gap-2 bg-white px-2.5 py-2.5 sm:px-3"><MetricIcon kind={icon} /><div className="min-w-0"><dt className="truncate text-[9px] font-bold uppercase tracking-wide text-[#63708A]">{label}</dt><dd className="num mt-0.5 text-xl font-black leading-none text-[#070A3F]">{value}</dd></div></div>;
}

function MetricIcon({ kind }) {
  const iconClass = 'h-4 w-4';
  const wrapperClass = 'flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E8FBFA] text-[#078EAC]';
  if (kind === 'pending') return <span data-metric-icon="pending" aria-hidden="true" className={wrapperClass}><svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="8" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5V12l3 2" /></svg></span>;
  if (kind === 'chapters') return <span data-metric-icon="chapters" aria-hidden="true" className={wrapperClass}><svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M5 5.5A2.5 2.5 0 0 1 7.5 3H11v15H7.5A2.5 2.5 0 0 0 5 20.5v-15ZM19 5.5A2.5 2.5 0 0 0 16.5 3H13v15h3.5a2.5 2.5 0 0 1 2.5 2.5v-15Z" /></svg></span>;
  return <span data-metric-icon="access" aria-hidden="true" className={wrapperClass}><svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M8.5 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3.5 19a5 5 0 0 1 10 0M16 10a2.5 2.5 0 1 0 0-5M15 14.5a4.5 4.5 0 0 1 5.5 4.5" /></svg></span>;
}

function ChapterManagement({ chapters, form, setForm, onSubmit, submitting, search, onSearch, formOpen, onToggleForm }) {
  const update = (field, value) => setForm({ ...form, [field]: value });
  return <section data-visual-direction="chapter-management-c" aria-labelledby="chapter-management" className="space-y-4">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div><h2 id="chapter-management" className="text-2xl font-black text-oc-ink">Chapter Management</h2><p className="mt-1 text-sm text-slate-500">Create and review trusted campus chapters.</p></div>
      <div className="flex w-full gap-2 sm:w-auto"><input type="search" value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Search chapters" aria-label="Search chapters" className="min-w-0 flex-1 rounded-lg border border-[#DCE3F5] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1D24FF] sm:w-64" /><button type="button" onClick={onToggleForm} aria-expanded={formOpen} className="rounded-lg bg-[#1D24FF] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#141BEB]">{formOpen ? 'Close' : '+ New Chapter'}</button></div>
    </div>
    {formOpen && <form onSubmit={onSubmit} className="grid gap-3 rounded-xl border border-[#DCE3F5] bg-white p-4 shadow-[0_8px_24px_rgba(7,10,63,0.04)] sm:grid-cols-2 sm:p-5">
        <div className="sm:col-span-2 flex items-center justify-between border-b border-[#E7EBF7] pb-3"><div><h3 className="text-sm font-black text-oc-ink">Create Chapter</h3><p className="mt-0.5 text-xs text-slate-500">Add a trusted campus organization.</p></div><span className="rounded-full bg-[#EEF1FF] px-2.5 py-1 text-[9px] font-bold uppercase text-[#1D24FF]">Preview: /{form.slug || 'chapter-slug'}</span></div>
        <AdminField label="Chapter name" value={form.name} onChange={(value) => update('name', value)} required />
        <AdminField label="Slug" value={form.slug} onChange={(value) => update('slug', value.toLowerCase().replace(/\s+/g, '-'))} required />
        <AdminField label="Category" value={form.category} onChange={(value) => update('category', value)} required />
        <AdminField label="Chapter OCID" value={form.ocid} onChange={(value) => update('ocid', value)} required />
        <label className="sm:col-span-2"><span className="text-xs font-bold text-oc-ink">Description <span className="font-normal text-slate-400">(optional)</span></span><textarea rows="3" value={form.description} onChange={(event) => update('description', event.target.value)} className="mt-1.5 w-full rounded-lg border border-[#DCE3F5] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1D24FF]" /></label>
        <div className="sm:col-span-2 flex justify-end gap-2"><button type="button" onClick={onToggleForm} className="rounded-lg px-4 py-2.5 text-xs font-bold text-[#63708A] hover:bg-[#F5F7FF]">Cancel</button><button disabled={submitting} className="rounded-lg bg-[#1D24FF] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#141BEB]">{submitting ? 'Creating chapter...' : 'Create Chapter'}</button></div>
      </form>}
    <div><div className="mb-2 flex items-center justify-between"><h3 className="text-sm font-black text-oc-ink">Chapters</h3><span className="text-xs font-semibold text-slate-500">{chapters.length} records</span></div><ChapterList rows={chapters} /></div>
  </section>;
}

function AdminField({ label, value, onChange, required }) {
  return <label><span className="text-xs font-bold text-oc-ink">{label}</span><input required={required} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1.5 w-full rounded-lg border border-[#DCE3F5] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1D24FF]" /></label>;
}

function ChapterList({ rows }) {
  return <div className="overflow-hidden rounded-xl border border-[#DCE3F5] bg-white shadow-[0_8px_24px_rgba(7,10,63,0.04)]"><div className="hidden grid-cols-[minmax(0,1fr)_minmax(7rem,.45fr)_minmax(7rem,.5fr)_minmax(9rem,.65fr)] gap-4 border-b border-[#E7EBF7] bg-[#F7F8FF] px-4 py-2.5 text-[9px] font-bold uppercase tracking-wider text-slate-500 md:grid"><span>Chapter</span><span>Slug</span><span>Category</span><span>Chapter OCID</span></div>{rows.map((chapter) => <article key={chapter.id} className="grid gap-1 border-b border-[#E7EBF7] px-4 py-3 last:border-0 md:grid-cols-[minmax(0,1fr)_minmax(7rem,.45fr)_minmax(7rem,.5fr)_minmax(9rem,.65fr)] md:items-center md:gap-4"><h3 className="truncate text-sm font-black text-oc-ink">{chapter.name}</h3><p className="truncate text-xs text-slate-500">/{chapter.slug || 'unavailable'}</p><p className="truncate text-xs font-semibold text-slate-600">{chapter.category || 'Uncategorized'}</p><p className="truncate font-mono text-[11px] text-slate-500">{chapter.ocid || 'Not available'}</p></article>)}{rows.length === 0 && <p className="p-6 text-center text-sm text-slate-500" role="status">No chapters match your search.</p>}</div>;
}

function EventReviewRow({ event, onReview }) {
  const status = event.status?.replaceAll('_', ' ') || 'unknown';

  return (
    <article className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(8rem,0.45fr)_5rem_7rem_5rem] sm:gap-4">
      <div className="min-w-0">
        <h3 className="truncate text-sm font-black text-oc-ink">{event.name}</h3>
        <p className="mt-1 truncate text-[11px] text-slate-500 sm:hidden">
          {event.chapter?.name || 'Unknown'} · {event.points ?? 'Not set'} points
        </p>
      </div>
      <p className="hidden min-w-0 truncate text-xs font-semibold text-slate-600 sm:block">
        {event.chapter?.name || 'Unknown'}
      </p>
      <p className="hidden text-xs font-bold text-oc-ink sm:block">{event.points ?? 'Not set'}</p>
      <span className={`${statusClass} hidden w-fit sm:inline-block`}>{status}</span>
      <button className={`${buttonClass} border border-oc-navy text-oc-navy`} onClick={() => onReview(event)}>
        Review
      </button>
      <span className={`${statusClass} col-span-2 w-fit sm:hidden`}>{status}</span>
    </article>
  );
}

function EventReviewModal({ event, rejection, setRejection, transition, onClose }) {
  const hasAction = event.status === 'pending_review' || event.status === 'approved';
  const status = event.status?.replaceAll('_', ' ') || 'unknown';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-oc-navy/70 p-0 sm:items-center sm:p-6" onMouseDown={onClose}>
      <section role="dialog" aria-modal="true" aria-labelledby="event-review-title" className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-t-xl bg-white p-5 sm:rounded-xl sm:p-7 space-y-6 shadow-oc-lg" onMouseDown={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-start justify-between gap-5 border-b border-oc-periwinkle/70 pb-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-oc-blue">
                {event.category || 'EVENT REVIEW'}
              </span>
              <span className={statusClass}>{status}</span>
            </div>
            <h2 id="event-review-title" className="mt-1 break-words text-2xl font-black text-oc-ink">{event.name}</h2>
          </div>
          <button autoFocus className={`${buttonClass} border border-slate-400 text-slate-700 hover:bg-slate-50`} onClick={onClose}>
            Close
          </button>
        </div>

        {/* Visual Cover Banner if present */}
        {event.coverImage && (
          <div className="aspect-[2.4/1] w-full bg-slate-100 overflow-hidden rounded-lg border border-oc-periwinkle/70 shadow-oc-sm">
            <img
              src={event.coverImage}
              alt={event.name}
              className="object-cover w-full h-full"
              onError={(e) => {
                e.target.src = 'https://picsum.photos/seed/default/800/400';
              }}
            />
          </div>
        )}

        {/* Metadata Grid */}
        <dl className="grid min-w-0 gap-x-6 gap-y-4 rounded-lg bg-oc-mist/60 border border-oc-periwinkle/50 p-4 text-xs sm:grid-cols-2">
          <EventDetail label="Chapter" value={event.chapter?.name || 'Unknown'} />
          <EventDetail label="Schedule" value={new Date(event.datetime).toLocaleString()} />
          <EventDetail label="Location" value={`${event.locationType || 'In-person'}: ${event.location || 'Not set'}`} />
          {event.submittedBy && <EventDetail label="Submitted by" value={event.submittedBy} mono />}
          <EventDetail label="Attendance Capacity" value={`${event.capacity ?? 'Unlimited'} attendees`} />
          <EventDetail label="Points Reward" value={`+${event.points ?? 5} pts`} />
        </dl>

        {/* Summary Description */}
        {event.description && (
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 mb-1.5">Summary</p>
            <p className="text-xs font-semibold leading-6 text-oc-ink bg-slate-50 border border-slate-200/70 rounded-lg p-3.5 whitespace-pre-line">
              {event.description}
            </p>
          </div>
        )}

        {/* Full Event Content / Agenda */}
        {event.content && (
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 mb-1.5">Full Event Details &amp; Content</p>
            <div className="text-xs leading-6 text-slate-700 bg-white border border-oc-periwinkle/60 rounded-lg p-4 space-y-2 whitespace-pre-line">
              {event.content}
            </div>
          </div>
        )}

        {/* Tags */}
        {event.tags && event.tags.length > 0 && (
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 mb-1.5">Tags</p>
            <div className="flex flex-wrap gap-1.5">
              {event.tags.map((tag) => (
                <span key={tag} className="rounded border border-oc-periwinkle/80 bg-oc-mist px-2.5 py-1 font-mono text-[10px] font-bold text-oc-ink">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {event.rejectionReason && (
          <p className="border-l-2 border-red-500 bg-red-50 p-3 text-xs leading-5 text-red-800 rounded-r-md">
            <span className="font-bold">Previous rejection reason:</span> {event.rejectionReason}
          </p>
        )}

        {/* Admin Decision Section */}
        <div className="border-t border-oc-periwinkle/70 pt-5">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Admin Decision</p>
          {hasAction ? (
            <div className="mt-3 space-y-3">
              {event.status === 'pending_review' && (
                <div className="flex flex-wrap gap-2">
                  <button className={`${buttonClass} bg-oc-blue text-white hover:bg-oc-blue/90`} onClick={() => transition(event.id, 'approve')}>
                    Approve
                  </button>
                  <button className={`${buttonClass} border border-oc-navy text-oc-navy hover:bg-oc-navy/5`} onClick={() => setRejection({ eventId: event.id, reason: '' })}>
                    Reject
                  </button>
                </div>
              )}
              {event.status === 'approved' && (
                <button className={`${buttonClass} bg-oc-turquoise text-oc-ink hover:bg-oc-turquoise/90`} onClick={() => transition(event.id, 'publish')}>
                  Publish
                </button>
              )}
              {rejection.eventId === event.id && (
                <div className="space-y-2">
                  <label htmlFor={`rejection-${event.id}`} className="block text-xs font-bold text-oc-ink">Rejection reason</label>
                  <textarea
                    id={`rejection-${event.id}`}
                    rows="3"
                    value={rejection.reason}
                    onChange={(e) => setRejection({ ...rejection, reason: e.target.value })}
                    className="w-full resize-y rounded-lg border border-slate-400 px-3 py-2 text-xs focus:border-oc-blue focus:outline-none"
                    placeholder="Provide a clear reason for the organizer..."
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      disabled={!rejection.reason.trim()}
                      className={`${buttonClass} bg-oc-navy text-white disabled:opacity-50`}
                      onClick={() => transition(event.id, 'reject', rejection.reason)}
                    >
                      Confirm Reject
                    </button>
                    <button className={`${buttonClass} border border-slate-400 text-slate-700`} onClick={() => setRejection({ eventId: '', reason: '' })}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="mt-3 text-xs font-semibold leading-5 text-slate-600">
              {event.status === 'draft' ? 'Awaiting organizer submission.' : 'No admin decision required.'}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

function EventDetail({ label, value, mono = false }) {
  return (
    <div className="min-w-0">
      <dt className="font-mono text-[9px] font-bold uppercase tracking-wider text-slate-400">{label}</dt>
      <dd className={`mt-1 break-words font-semibold text-slate-700 ${mono ? 'font-mono text-[11px]' : ''}`}>{value}</dd>
    </div>
  );
}

function AccessSection({ title, warning, fields, onGrant, grantLabel, rows, onToggle, onDelete }) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-black text-oc-ink">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">Grant, revoke, reactivate, or delete verified OCID access.</p>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onGrant();
        }}
        className="space-y-3 rounded-xl border border-[#DCE3F5] bg-white p-4 shadow-[0_8px_24px_rgba(7,10,63,0.04)]"
      >
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] [&_input]:rounded-lg [&_input]:border [&_input]:border-[#DCE3F5] [&_input]:bg-white [&_input]:px-3 [&_input]:py-2.5 [&_select]:rounded-lg [&_select]:border [&_select]:border-[#DCE3F5] [&_select]:bg-white [&_select]:px-3 [&_select]:py-2.5">
          {fields}
          <button className={`${buttonClass} bg-[#1D24FF] px-5 text-white hover:bg-[#141BEB]`}>
            {grantLabel}
          </button>
        </div>
        {warning}
      </form>
      <div
        aria-label={`${title} list`}
        className="overflow-hidden rounded-xl border border-[#DCE3F5] bg-white shadow-[0_8px_24px_rgba(7,10,63,0.04)]"
      >
        <div className="hidden lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(8rem,.6fr)_6rem_7rem_11rem] gap-4 border-b border-[#E7EBF7] bg-[#F7F8FF] px-4 py-2.5 font-mono text-[9px] font-bold uppercase tracking-wider text-slate-500">
          <span>Identity &amp; Scope</span><span>Chapter</span><span>Status</span><span>Granted on</span><span className="text-right pr-2">Actions</span>
        </div>
        <div className="divide-y divide-[#E7EBF7] px-4">
          {rows.map((row) => (
            <div
              key={row.key}
              className="grid gap-3 py-3 lg:grid-cols-[minmax(0,1fr)_minmax(8rem,.6fr)_6rem_7rem_11rem] lg:items-center lg:gap-4"
            >
              <div className="min-w-0">
                <strong className="text-sm font-bold text-oc-ink truncate block">{row.ocid}</strong>
                <p className="text-[11px] text-slate-500 truncate">{row.resource === 'admin' ? 'Platform administrator' : 'Organizer access'}</p>
              </div>
              <p className="truncate text-xs font-semibold text-slate-600">{row.detail}</p>
              <span className={statusClass}>{row.status}</span>
              <p className="text-[11px] text-slate-500 font-mono">{new Date(row.created_at).toLocaleDateString()}</p>
              <div className="flex items-center justify-start lg:justify-end gap-2 shrink-0">
                <button
                  className={`${buttonClass} w-24 text-center ${
                    row.status === 'active'
                      ? 'border border-oc-navy text-oc-navy hover:bg-oc-navy/5'
                      : 'border border-oc-blue text-oc-blue hover:bg-oc-blue/5'
                  }`}
                  onClick={() => onToggle(row)}
                >
                  {row.status === 'active' ? 'Revoke' : 'Reactivate'}
                </button>
                {row.status === 'revoked' && onDelete ? (
                  <button
                    className={`${buttonClass} w-[72px] text-center border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300`}
                    onClick={() => onDelete(row)}
                    title="Permanently delete access record"
                  >
                    Delete
                  </button>
                ) : (
                  <div className="hidden lg:block w-[72px]" aria-hidden="true" />
                )}
              </div>
            </div>
          ))}
          {rows.length === 0 && (
            <div className="py-8 text-center" role="status">
              <p className="text-sm font-semibold text-oc-ink">No access records yet.</p>
              <p className="mt-1 text-xs text-slate-500">Newly granted accounts will appear here.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function DeleteConfirmModal({ target, onConfirm, onClose }) {
  if (!target) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-oc-navy/70 p-4 backdrop-blur-sm"
      onMouseDown={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-dialog-title"
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-oc-lg border border-oc-periwinkle/70 space-y-4"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <h3 id="delete-dialog-title" className="text-lg font-black text-oc-ink">
              Permanently Delete Access?
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-600">
              Permanently delete the <strong>{target.resource}</strong> access record for <strong>{target.ocid}</strong>
              {target.detail ? ` (${target.detail})` : ''}? This action cannot be undone.
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button
            autoFocus
            className={`${buttonClass} border border-slate-300 text-slate-700 hover:bg-slate-100`}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className={`${buttonClass} bg-red-600 text-white hover:bg-red-700`}
            onClick={onConfirm}
          >
            Confirm Delete
          </button>
        </div>
      </section>
    </div>
  );
}
