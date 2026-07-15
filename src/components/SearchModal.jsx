import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { CHAPTERS } from '../api/mockData';

export function SearchModal({ isOpen, onClose }) {
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);
  const navigate = useNavigate();

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current.focus(), 50);
    }
    if (isOpen) setQuery('');
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  // Search logic: client-side filter on localStorage events + static CHAPTERS
  const getResults = () => {
    const q = query.toLowerCase().trim();
    if (!q) return { events: [], chapters: [] };

    // Read events from localStorage (same key used by mockApi)
    let allEvents = [];
    try {
      const raw = localStorage.getItem('orbit_events_react');
      if (raw) allEvents = JSON.parse(raw);
    } catch { /* ignore */ }

    const events = allEvents.filter(
      (e) => e.name?.toLowerCase().includes(q) || e.tags?.some((t) => t.toLowerCase().includes(q))
    ).slice(0, 5);

    const chapters = CHAPTERS.filter(
      (c) => c.name.toLowerCase().includes(q) || c.category.toLowerCase().includes(q)
    ).slice(0, 5);

    return { events, chapters };
  };

  const results = getResults();
  const hasResults = results.events.length > 0 || results.chapters.length > 0;
  const hasQuery = query.trim().length > 0;

  const handleNavigate = (path) => {
    onClose();
    navigate(path);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-navy/40 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative bg-white rounded-xl border border-border shadow-2xl w-full max-w-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
          <svg className="w-4 h-4 text-text-secondary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search events, chapters..."
            className="flex-1 bg-transparent text-sm text-navy placeholder-text-secondary outline-none"
          />
          <kbd className="hidden sm:inline-block text-[10px] font-mono text-text-secondary border border-border rounded px-1.5 py-0.5">ESC</kbd>
        </div>

        {/* Results */}
        <div className="max-h-[50vh] overflow-y-auto">
          {hasQuery && !hasResults && (
            <div className="py-12 text-center">
              <p className="text-sm font-bold text-navy">No results for "{query}"</p>
              <p className="text-xs text-text-secondary mt-1">Try a different search term.</p>
            </div>
          )}

          {results.events.length > 0 && (
            <div className="px-3 pt-3 pb-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary px-2 mb-2">Events</p>
              {results.events.map((event) => (
                <button
                  key={event.id}
                  onClick={() => handleNavigate(`/e/${event.slug}`)}
                  className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-surface transition-colors flex items-center gap-3"
                >
                  <div className="w-8 h-8 rounded bg-accent-blue/10 flex items-center justify-center shrink-0">
                    <svg className="w-3.5 h-3.5 text-accent-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-navy truncate">{event.name}</div>
                    <div className="text-[10px] text-text-secondary truncate">{event.tags?.join(', ')}</div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {results.chapters.length > 0 && (
            <div className="px-3 pt-3 pb-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary px-2 mb-2">Chapters</p>
              {results.chapters.map((chapter) => (
                <button
                  key={chapter.id}
                  onClick={() => handleNavigate(`/chapters/${chapter.slug}`)}
                  className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-surface transition-colors flex items-center gap-3"
                >
                  <div className={`w-8 h-8 rounded flex items-center justify-center text-white text-[10px] font-bold bg-gradient-to-br ${chapter.avatarGradient || 'from-slate-600 to-slate-900'} shrink-0`}>
                    {chapter.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-navy truncate">{chapter.name}</div>
                    <div className="text-[10px] text-text-secondary">{chapter.category}</div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {!hasQuery && (
            <div className="py-10 text-center">
              <p className="text-xs text-text-secondary">Type to search events and chapters</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SearchModal;
