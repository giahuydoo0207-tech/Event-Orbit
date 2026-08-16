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
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
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
    <div className="space-y-16 pb-16">
      <header className="max-w-3xl border-b-4 border-oc-blue pb-8">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-oc-blue">Administration</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-oc-ink md:text-5xl">Control what earns public trust.</h1>
        <p className="mt-4 max-w-[62ch] text-sm leading-6 text-slate-600">
          Review events and manage verified OCID access. Every change is enforced by the server and invalidates existing sessions.
        </p>
      </header>

      {error && (
        <div role="alert" className="rounded-md border border-oc-blue bg-white p-4 text-sm font-semibold text-oc-ink">
          {error} <button className="ml-3 text-oc-blue underline" onClick={load}>Try again</button>
        </div>
      )}

      <section aria-labelledby="event-review" className="space-y-6">
        <div>
          <h2 id="event-review" className="text-2xl font-black text-oc-ink">Event Review</h2>
          <p className="mt-1 text-sm text-slate-500">All active workflow states, ordered by submission time.</p>
        </div>
        <div
          aria-label="Scrollable event review list"
          tabIndex="0"
          className="rounded-lg border border-oc-periwinkle/70 bg-white shadow-oc-sm overflow-hidden"
        >
          <div className="sticky top-0 z-10 hidden grid-cols-[minmax(0,1fr)_minmax(8rem,0.45fr)_5rem_7rem_5rem] gap-4 border-b border-oc-periwinkle/70 bg-oc-mist px-4 py-2.5 font-mono text-[9px] font-bold uppercase tracking-wider text-slate-500 sm:grid">
            <span>Event</span><span>Chapter</span><span>Points</span><span>Status</span><span className="text-right pr-2">Action</span>
          </div>
          <div className="max-h-[305px] overflow-y-auto overscroll-contain no-scrollbar divide-y divide-oc-periwinkle/60">
            {data.events.map((event) => (
              <EventReviewRow key={event.id} event={event} onReview={setSelectedEvent} />
            ))}
          </div>
          {data.events.length === 0 && (
            <div className="p-8 text-center" role="status">
              <p className="text-sm font-semibold text-oc-ink">No events are available for review.</p>
              <p className="mt-1 text-xs text-slate-500">New submissions will appear here.</p>
            </div>
          )}
        </div>
      </section>

      <AccessSection
        title="Organizer Access"
        warning={
          activeConflict ? (
            <div className="flex items-center gap-2 rounded-md bg-amber-400/20 border border-amber-400/40 px-3 py-2 text-xs font-semibold text-amber-200">
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
        rows={data.organizers.map((row) => ({
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
        rows={data.admins.map((row) => ({
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
      />

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
      <section role="dialog" aria-modal="true" aria-labelledby="event-review-title" className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-t-md bg-white p-5 sm:rounded-md sm:p-7" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-5 border-b border-oc-periwinkle/70 pb-5">
          <div className="min-w-0">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-oc-blue">Event Review</p>
            <h2 id="event-review-title" className="mt-2 break-words text-2xl font-black text-oc-ink">{event.name}</h2>
          </div>
          <button autoFocus className={`${buttonClass} border border-slate-400 text-slate-700`} onClick={onClose}>
            Close
          </button>
        </div>

        <div className="py-6">
          <span className={statusClass}>{status}</span>
          <dl className="mt-5 grid min-w-0 gap-x-8 gap-y-5 text-xs sm:grid-cols-2">
            <EventDetail label="Chapter" value={event.chapter?.name || 'Unknown'} />
            <EventDetail label="Schedule" value={new Date(event.datetime).toLocaleString()} />
            <EventDetail label="Location" value={event.location || 'Not set'} />
            {event.submittedBy && <EventDetail label="Submitted by" value={event.submittedBy} mono />}
            <EventDetail label="Points" value={event.points ?? 'Not set'} />
          </dl>
          {event.description && (
            <div className="mt-6 pt-5 border-t border-oc-periwinkle/70">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500 mb-2">Description</p>
              <p className="text-xs leading-6 text-slate-700 whitespace-pre-line">{event.description}</p>
            </div>
          )}
          {event.rejectionReason && (
            <p className="mt-6 border-l-2 border-oc-blue pl-3 text-xs leading-5 text-slate-600">
              <span className="font-bold text-oc-ink">Rejection reason:</span> {event.rejectionReason}
            </p>
          )}
        </div>

        <div className="border-t border-oc-periwinkle/70 pt-5">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Decision</p>
          {hasAction ? (
            <div className="mt-3 space-y-3">
              {event.status === 'pending_review' && (
                <div className="flex flex-wrap gap-2">
                  <button className={`${buttonClass} bg-oc-blue text-white`} onClick={() => transition(event.id, 'approve')}>
                    Approve
                  </button>
                  <button className={`${buttonClass} border border-oc-navy text-oc-navy`} onClick={() => setRejection({ eventId: event.id, reason: '' })}>
                    Reject
                  </button>
                </div>
              )}
              {event.status === 'approved' && (
                <button className={`${buttonClass} bg-oc-turquoise text-oc-ink`} onClick={() => transition(event.id, 'publish')}>
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
                    className="w-full resize-y rounded-md border border-slate-400 px-3 py-2 text-xs focus:border-oc-blue focus:outline-none"
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      disabled={!rejection.reason.trim()}
                      className={`${buttonClass} bg-oc-navy text-white`}
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
        className="rounded-md bg-oc-navy p-5 space-y-3"
      >
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] [&_input]:rounded-md [&_input]:border-0 [&_input]:px-3 [&_input]:py-3 [&_select]:rounded-md [&_select]:border-0 [&_select]:px-3 [&_select]:py-3">
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
        className="rounded-lg border border-oc-periwinkle/70 bg-white shadow-oc-sm overflow-hidden"
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
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl border border-oc-periwinkle/70 space-y-4"
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
