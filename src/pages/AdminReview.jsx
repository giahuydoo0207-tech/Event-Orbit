import React, { useEffect, useMemo, useState } from 'react';
import { createChapterApi, fetchAdminConsole, fetchReviewQueue, transitionEventApi, updateAccessApi } from '../api/mockApi';
import useToastStore from '../store/useToastStore';
import { LoadingBar } from '../components/LoadingBar';

const statusClass = 'inline-block rounded-full bg-oc-navy px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-white';
const buttonClass = 'whitespace-nowrap rounded-lg px-3 py-2 text-xs font-bold transition active:translate-y-px disabled:opacity-50';
const sectionTabs = [
  ['events', 'Event Review'],
  ['chapters', 'Chapter Management'],
  ['research', 'Research & Lookup'],
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
  const [searchQuery, setSearchQuery] = useState('');
  const [eventStatus, setEventStatus] = useState('all');
  const [lookupTab, setLookupTab] = useState('events');
  const [creatingChapter, setCreatingChapter] = useState(false);
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

  const query = searchQuery.trim().toLowerCase();
  const filteredEvents = useMemo(() => data.events.filter((event) => {
    const matchesStatus = eventStatus === 'all' || event.status === eventStatus;
    return matchesStatus && (!query || includesQuery([event.name, event.chapter?.name, event.status], query));
  }), [data.events, eventStatus, query]);
  const lookupEvents = useMemo(() => data.events.filter((event) =>
    !query || includesQuery([event.name, event.chapter?.name, event.status], query)
  ), [data.events, query]);
  const filteredChapters = useMemo(() => data.chapters.filter((chapter) =>
    !query || includesQuery([chapter.name, chapter.slug, chapter.category, chapter.ocid], query)
  ), [data.chapters, query]);
  const filteredAdmins = useMemo(() => data.admins.filter((row) =>
    !query || includesQuery([row.ocid, row.status, 'admin'], query)
  ), [data.admins, query]);
  const filteredOrganizers = useMemo(() => data.organizers.filter((row) =>
    !query || includesQuery([row.ocid, row.status, row.chapters?.name, 'organizer'], query)
  ), [data.organizers, query]);

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
    <div className="space-y-6 pb-12">
      <header className="rounded-xl border border-oc-periwinkle/70 bg-white p-5 shadow-oc-sm sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-oc-blue">Academic governance workspace</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-oc-ink">Admin Console</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Review event quality, manage chapters, and audit trusted OCID access.</p>
          </div>
          <label className="block w-full lg:max-w-md">
            <span className="sr-only">Search active admin section</span>
            <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search events, chapters, OCID access, credentials..." className="w-full rounded-lg border border-oc-periwinkle bg-oc-mist/40 px-4 py-3 text-sm text-oc-ink outline-none focus:border-oc-blue focus:ring-2 focus:ring-oc-blue/10" />
          </label>
        </div>
        <dl className="mt-6 grid gap-3 sm:grid-cols-3">
          <SummaryCard label="Pending review" value={data.events.filter((event) => event.status === 'pending_review').length} />
          <SummaryCard label="Chapters" value={data.chapters.length} />
          <SummaryCard label="Active access records" value={[...data.admins, ...data.organizers].filter((row) => row.status === 'active').length} />
        </dl>
      </header>

      {error && (
        <div role="alert" className="rounded-lg border border-oc-blue bg-white p-4 text-sm font-semibold text-oc-ink">
          {error} <button className="ml-3 text-oc-blue underline" onClick={load}>Try again</button>
        </div>
      )}

      <nav className="flex gap-2 overflow-x-auto rounded-xl border border-oc-periwinkle/70 bg-white p-2 shadow-oc-sm" aria-label="Admin sections">
        {sectionTabs.map(([id, label]) => <button key={id} onClick={() => { setActiveSection(id); setSearchQuery(''); }} className={`rounded-lg px-4 py-2.5 text-xs font-bold ${activeSection === id ? 'bg-oc-navy text-white' : 'text-slate-600 hover:bg-oc-mist'}`}>{label}</button>)}
      </nav>

      {activeSection === 'events' && <section aria-labelledby="event-review" className="space-y-4">
        <div>
          <h2 id="event-review" className="text-2xl font-black text-oc-ink">Event Review</h2>
          <p className="mt-1 text-sm text-slate-500">Review active workflow states without changing the event lifecycle.</p>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter events by status">
          {['all', 'pending_review', 'approved', 'published', 'rejected', 'draft'].map((status) => <button key={status} onClick={() => setEventStatus(status)} className={`rounded-lg border px-3 py-2 text-xs font-bold ${eventStatus === status ? 'border-oc-blue bg-oc-blue text-white' : 'border-oc-periwinkle bg-white text-slate-600'}`}>{status === 'all' ? 'All' : status.replaceAll('_', ' ')}</button>)}
        </div>
        <div
          aria-label="Scrollable event review list"
          tabIndex="0"
          className="overflow-hidden rounded-xl border border-oc-periwinkle/70 bg-white shadow-oc-sm"
        >
          <div className="sticky top-0 z-10 hidden grid-cols-[minmax(0,1fr)_minmax(8rem,0.45fr)_5rem_7rem_5rem] gap-4 border-b border-oc-periwinkle/70 bg-oc-mist px-4 py-2.5 font-mono text-[9px] font-bold uppercase tracking-wider text-slate-500 sm:grid">
            <span>Event</span><span>Chapter</span><span>Points</span><span>Status</span><span className="text-right pr-2">Action</span>
          </div>
          <div className="max-h-[305px] overflow-y-auto overscroll-contain no-scrollbar divide-y divide-oc-periwinkle/60">
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

      {activeSection === 'chapters' && <ChapterManagement chapters={filteredChapters} form={chapterForm} setForm={setChapterForm} onSubmit={createChapter} submitting={creatingChapter} />}

      {activeSection === 'research' && <ResearchLookup activeTab={lookupTab} setActiveTab={setLookupTab} events={lookupEvents} chapters={filteredChapters} admins={filteredAdmins} organizers={filteredOrganizers} />}

      {activeSection === 'access' && <section aria-labelledby="access-control" className="space-y-8"><div><h2 id="access-control" className="text-2xl font-black text-oc-ink">Access Control</h2><p className="mt-1 text-sm text-slate-500">Manage verified OCID roles. The server remains the source of truth.</p></div><AccessSection
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
      /></section>}

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

function SummaryCard({ label, value }) {
  return <div className="rounded-xl border border-oc-periwinkle/60 bg-oc-mist/45 p-4"><dt className="text-xs font-bold text-slate-500">{label}</dt><dd className="num mt-2 text-2xl font-black text-oc-navy">{value}</dd></div>;
}

function ChapterManagement({ chapters, form, setForm, onSubmit, submitting }) {
  const update = (field, value) => setForm({ ...form, [field]: value });
  return <section aria-labelledby="chapter-management" className="space-y-4">
    <div><h2 id="chapter-management" className="text-2xl font-black text-oc-ink">Chapter Management</h2><p className="mt-1 text-sm text-slate-500">Create and review trusted campus chapters.</p></div>
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
      <form onSubmit={onSubmit} className="grid gap-4 rounded-xl border border-oc-periwinkle/70 bg-white p-5 shadow-oc-sm sm:grid-cols-2">
        <AdminField label="Chapter name" value={form.name} onChange={(value) => update('name', value)} required />
        <AdminField label="Slug" value={form.slug} onChange={(value) => update('slug', value.toLowerCase().replace(/\s+/g, '-'))} required />
        <AdminField label="Category" value={form.category} onChange={(value) => update('category', value)} required />
        <AdminField label="Chapter OCID" value={form.ocid} onChange={(value) => update('ocid', value)} required />
        <label className="sm:col-span-2"><span className="text-xs font-bold text-oc-ink">Description <span className="font-normal text-slate-400">(optional)</span></span><textarea rows="4" value={form.description} onChange={(event) => update('description', event.target.value)} className="mt-2 w-full rounded-lg border border-oc-periwinkle px-3 py-2.5 text-sm outline-none focus:border-oc-blue" /></label>
        <button disabled={submitting} className="rounded-lg bg-oc-blue px-4 py-3 text-sm font-bold text-white sm:col-span-2">{submitting ? 'Creating chapter...' : 'Create Chapter'}</button>
      </form>
      <div className="space-y-4">
        <div className="rounded-xl border border-oc-periwinkle/70 bg-oc-navy p-5 text-white shadow-oc-sm"><p className="text-[10px] font-bold uppercase tracking-widest text-oc-turquoise">Chapter preview</p><div className="mt-4 border-l-4 border-oc-turquoise pl-4"><h3 className="text-lg font-black">{form.name || 'Chapter name'}</h3><p className="mt-1 text-xs text-white/65">/{form.slug || 'chapter-slug'} · {form.category || 'Category'}</p><p className="mt-3 text-sm leading-6 text-white/80">{form.description || 'A short chapter description will appear here.'}</p></div></div>
        <ChapterList rows={chapters} />
      </div>
    </div>
  </section>;
}

function AdminField({ label, value, onChange, required }) {
  return <label><span className="text-xs font-bold text-oc-ink">{label}</span><input required={required} value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-lg border border-oc-periwinkle px-3 py-2.5 text-sm outline-none focus:border-oc-blue" /></label>;
}

function ChapterList({ rows }) {
  return <div className="max-h-72 overflow-y-auto rounded-xl border border-oc-periwinkle/70 bg-white shadow-oc-sm">{rows.map((chapter) => <article key={chapter.id} className="border-b border-oc-periwinkle/50 p-4 last:border-0"><div className="flex items-start justify-between gap-3"><div><h3 className="text-sm font-black text-oc-ink">{chapter.name}</h3><p className="mt-1 text-xs text-slate-500">/{chapter.slug || 'unavailable'} · {chapter.category || 'Uncategorized'}</p></div><span className="rounded-full bg-oc-mist px-2 py-1 text-[10px] font-bold text-oc-blue">Chapter</span></div></article>)}{rows.length === 0 && <p className="p-6 text-center text-sm text-slate-500" role="status">No chapters match your search.</p>}</div>;
}

function ResearchLookup({ activeTab, setActiveTab, events, chapters, admins, organizers }) {
  const tabs = [['events', 'Events'], ['chapters', 'Chapters'], ['users', 'Users / OCID Access'], ['credentials', 'Credentials / Claims']];
  return <section aria-labelledby="research-lookup" className="space-y-4"><div><h2 id="research-lookup" className="text-2xl font-black text-oc-ink">Research &amp; Lookup</h2><p className="mt-1 text-sm text-slate-500">Search only the admin-safe records already available to this console.</p></div><div className="flex flex-wrap gap-2" role="tablist" aria-label="Research data type">{tabs.map(([id, label]) => <button key={id} role="tab" aria-selected={activeTab === id} onClick={() => setActiveTab(id)} className={`rounded-lg px-3 py-2 text-xs font-bold ${activeTab === id ? 'bg-oc-blue text-white' : 'border border-oc-periwinkle bg-white text-slate-600'}`}>{label}</button>)}</div><div className="rounded-xl border border-oc-periwinkle/70 bg-white p-5 shadow-oc-sm">{activeTab === 'events' && <LookupRows rows={events.map((event) => ({ title: event.name, detail: `${event.chapter?.name || 'Unknown chapter'} · ${event.status}` }))} />}{activeTab === 'chapters' && <LookupRows rows={chapters.map((chapter) => ({ title: chapter.name, detail: `/${chapter.slug || 'unavailable'} · ${chapter.category || 'Uncategorized'}` }))} />}{activeTab === 'users' && <LookupRows rows={[...admins.map((row) => ({ title: row.ocid, detail: `Admin · ${row.status}` })), ...organizers.map((row) => ({ title: row.ocid, detail: `Organizer · ${row.chapters?.name || row.chapter_id} · ${row.status}` }))]} empty="No admin lookup data available yet." />}{activeTab === 'credentials' && <LimitedState />}</div></section>;
}

function LookupRows({ rows, empty = 'No records match your search.' }) {
  if (!rows.length) return <p className="py-8 text-center text-sm text-slate-500" role="status">{empty}</p>;
  return <div className="divide-y divide-oc-periwinkle/50">{rows.map((row, index) => <div key={`${row.title}-${index}`} className="py-3 first:pt-0 last:pb-0"><p className="text-sm font-bold text-oc-ink">{row.title}</p><p className="mt-1 text-xs text-slate-500">{row.detail}</p></div>)}</div>;
}

function LimitedState() {
  return <div className="py-8 text-center" role="status"><p className="text-sm font-bold text-oc-ink">No admin lookup data available yet</p><p className="mt-1 text-xs text-slate-500">Requires admin API support. No credential or claim data is being mocked.</p></div>;
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
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-oc-ink">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">Grant, revoke, reactivate, or delete verified OCID access.</p>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onGrant();
        }}
        className="rounded-xl bg-oc-navy p-5 space-y-3"
      >
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] [&_input]:rounded-lg [&_input]:border-0 [&_input]:px-3 [&_input]:py-3 [&_select]:rounded-lg [&_select]:border-0 [&_select]:px-3 [&_select]:py-3">
          {fields}
          <button className={`${buttonClass} bg-oc-turquoise px-5 text-oc-ink hover:bg-oc-turquoise/90`}>
            {grantLabel}
          </button>
        </div>
        {warning}
      </form>
      <div
        aria-label={`${title} list`}
        tabIndex="0"
        className="rounded-xl border border-oc-periwinkle/70 bg-white shadow-oc-sm overflow-hidden"
      >
        <div className="sticky top-0 z-10 hidden sm:grid sm:grid-cols-[minmax(0,1fr)_130px_180px] gap-4 border-b border-oc-periwinkle/70 bg-oc-mist px-4 py-2.5 font-mono text-[9px] font-bold uppercase tracking-wider text-slate-500">
          <span>Identity &amp; Scope</span>
          <span>Status</span>
          <span className="text-right pr-2">Actions</span>
        </div>
        <div className="max-h-[305px] overflow-y-auto overscroll-contain no-scrollbar divide-y divide-oc-periwinkle/60 px-4">
          {rows.map((row) => (
            <div
              key={row.key}
              className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_130px_180px] sm:items-center sm:gap-4"
            >
              <div className="min-w-0">
                <strong className="text-sm font-bold text-oc-ink truncate block">{row.ocid}</strong>
                <p className="text-xs text-slate-500 truncate">{row.detail}</p>
              </div>
              <div className="min-w-0">
                <span className={statusClass}>{row.status}</span>
                <p className="mt-1 text-[11px] text-slate-500 font-mono">
                  {new Date(row.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center justify-start sm:justify-end gap-2 shrink-0">
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
                  <div className="hidden sm:block w-[72px]" aria-hidden="true" />
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
