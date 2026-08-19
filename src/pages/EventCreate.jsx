import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createEventApi, transitionEventApi } from '../api/mockApi';
import { useStore } from '../store/useStore';
import useToastStore from '../store/useToastStore';

import { THEMES } from '../constants/themes';
export { THEMES };

const KEYWORDS = ['AI', 'Python', 'Web3', 'Blockchain', 'Solidity', 'UX', 'UI', 'Design', 'Startup', 'Pitching', 'Business', 'Charity', 'Social', 'Health'];

export function EventCreate() {
  const navigate = useNavigate();
  const { chapterId } = useParams();
  const user = useStore((state) => state.user);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [datetime, setDatetime] = useState('');
  const [locationType, setLocationType] = useState('In-person');
  const [location, setLocation] = useState('');
  const [capacity, setCapacity] = useState(100);
  const [points, setPoints] = useState(5);
  const [selectedTheme, setSelectedTheme] = useState('Minimal');
  const [category, setCategory] = useState('Tech');
  const [visibility, setVisibility] = useState('Public');
  const [coverSeed, setCoverSeed] = useState('hcmc');
  const [imageMode, setImageMode] = useState('seed'); // 'seed' | 'upload'
  const [coverImageData, setCoverImageData] = useState('');
  const [imageError, setImageError] = useState('');
  const [customTags, setCustomTags] = useState([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Auto-extracted tags based on description keyword matching
  const [aiTags, setAiTags] = useState([]);

  useEffect(() => {
    // Basic AI tag extraction logic
    const descLower = description.toLowerCase();
    const extracted = KEYWORDS.filter(kw => descLower.includes(kw.toLowerCase()));
    setAiTags(extracted);
  }, [description]);

  const handleAddCustomTag = (e) => {
    e.preventDefault();
    if (newTagInput.trim() && !customTags.includes(newTagInput.trim())) {
      setCustomTags([...customTags, newTagInput.trim()]);
      setNewTagInput('');
    }
  };

  const handleRemoveCustomTag = (tag) => {
    setCustomTags(customTags.filter(t => t !== tag));
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageError('');
    if (file.size > 1.5 * 1024 * 1024) {
      setImageError('Image must be under 1.5MB for the demo build.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setCoverImageData(reader.result); // base64 string
    reader.readAsDataURL(file);
  };

  const showToast = useToastStore((state) => state.showToast);

  const handleSubmit = async (e, mode = 'draft') => {
    if (e?.preventDefault) e.preventDefault();
    if (!title.trim()) return showToast('Event title is required.', 'error');
    if (!description.trim()) return showToast('Short description is required.', 'error');
    if (!content.trim()) return showToast('Event content is required.', 'error');
    if (!datetime) return showToast('Date & time is required.', 'error');
    if (!location.trim()) return showToast('Location details are required.', 'error');
    if (!points || Number(points) <= 0) return showToast('Points Reward must be greater than 0.', 'error');

    setSubmitting(true);
    try {
      const allTags = Array.from(new Set([...aiTags, ...customTags]));
      const coverImage = imageMode === 'upload' && coverImageData
        ? coverImageData
        : `https://picsum.photos/seed/${coverSeed || 'orbit'}/800/400`;

      const newEvent = await createEventApi({
        name: title,
        description,
        content,
        datetime,
        location,
        locationType,
        capacity: Number(capacity) || 50,
        points: Number(points) || 5,
        theme: selectedTheme,
        category,
        tags: allTags,
        coverImage,
        autoPublish: false,
        chapterId: chapterId || null
      });

      if (mode === 'submit' && newEvent?.id) {
        try {
          await transitionEventApi(newEvent.id, 'submit');
          showToast('Event submitted for admin review successfully.', 'success');
        } catch (transErr) {
          console.warn('Auto transition failed, saved as draft:', transErr);
          showToast('Draft event created. Please click Submit for Review from chapter management.', 'info');
        }
      } else {
        showToast('Draft event saved successfully.', 'success');
      }

      navigate(`/manage/${chapterId || 'fit'}`);
    } catch (err) {
      showToast(err.message || 'Failed to create event', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Preview styling helper
  const themeStyle = THEMES[selectedTheme] || THEMES.Minimal;
  const allTagsCombined = Array.from(new Set([...aiTags, ...customTags]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-oc-ink">Create New Event</h1>
        <p className="text-xs text-slate-500 mt-1 font-medium">
          Draft your event details and configure your verified digital credential reward structures on Open Campus ID.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        
        {/* Form Column */}
        <div className="bg-white border border-oc-periwinkle/70 rounded-2xl p-6 md:p-8 space-y-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Title */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">
                Event Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Solidity Workshop for Beginners"
                className="w-full border-b border-border py-2 text-sm focus:outline-none focus:border-accent-blue"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">
                Short Description * (Type to trigger AI Auto-Tags)
              </label>
              <textarea
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Write a short summary (1-2 sentences) of the event for cards and search indexing..."
                className="w-full border border-border rounded p-3 text-sm focus:outline-none focus:border-accent-blue min-h-[60px] resize-y"
              />

              {/* AI Auto-tags Preview */}
              {aiTags.length > 0 && (
                <div className="mt-2 p-3 bg-surface rounded border border-dashed border-border">
                  <div className="text-[10px] text-text-secondary uppercase font-bold tracking-widest mb-1.5">
                    AI Suggested Skills
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {aiTags.map(tag => (
                      <span key={tag} className="bg-navy-light/10 text-navy-light text-[10px] font-semibold px-2 py-0.5 rounded border border-navy-light/20">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Event Content (Rich/Full details) */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">
                Event Content *
              </label>
              <textarea
                required
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Describe the full event agenda, what attendees should expect, prerequisites, agenda schedule..."
                className="w-full border border-border rounded p-3 text-sm focus:outline-none focus:border-accent-blue min-h-[150px] resize-y"
              />
            </div>

            {/* Custom tags input */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">
                Custom Tags
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  placeholder="e.g. Coding"
                  className="w-1/2 border-b border-border py-1.5 text-xs focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddCustomTag}
                  className="bg-surface border border-border px-3 py-1.5 rounded text-xs font-semibold"
                >
                  Add Tag
                </button>
              </div>
              <div className="flex flex-wrap gap-1">
                {customTags.map(tag => (
                  <span key={tag} className="bg-slate-100 text-slate-800 text-[10px] font-semibold px-2 py-0.5 rounded border border-slate-200 flex items-center gap-1">
                    {tag}
                    <button type="button" onClick={() => handleRemoveCustomTag(tag)} className="text-[10px] font-bold text-error">
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Meta row 1: Category & Cover Image */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full border-b border-border py-2 text-sm focus:outline-none"
                >
                  <option value="Tech">Tech</option>
                  <option value="Design">Design</option>
                  <option value="Business">Business</option>
                  <option value="Social">Social</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">
                  Cover Image
                </label>
                <div className="flex gap-2 text-[10px] mb-1">
                  <button
                    type="button"
                    onClick={() => { setImageMode('seed'); setImageError(''); }}
                    className={`px-2 py-1 border rounded font-semibold transition-all ${
                      imageMode === 'seed'
                        ? 'bg-navy text-white border-navy'
                        : 'bg-white text-navy border-border hover:bg-slate-50'
                    }`}
                  >
                    Use placeholder
                  </button>
                  <button
                    type="button"
                    onClick={() => { setImageMode('upload'); setImageError(''); }}
                    className={`px-2 py-1 border rounded font-semibold transition-all ${
                      imageMode === 'upload'
                        ? 'bg-navy text-white border-navy'
                        : 'bg-white text-navy border-border hover:bg-slate-50'
                    }`}
                  >
                    Upload image
                  </button>
                </div>

                {imageMode === 'seed' ? (
                  <input
                    type="text"
                    value={coverSeed}
                    onChange={(e) => setCoverSeed(e.target.value)}
                    placeholder="e.g. matrix"
                    className="w-full border-b border-border py-2 text-sm focus:outline-none"
                  />
                ) : (
                  <div className="space-y-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="w-full text-xs text-text-secondary file:mr-2 file:py-1 file:px-2 file:rounded file:border file:border-border file:text-[10px] file:bg-surface file:text-navy hover:file:bg-slate-50 file:cursor-pointer"
                    />
                    {imageError && (
                      <div className="text-[10px] text-error font-medium">{imageError}</div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Meta row 2 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">
                  Date & Time *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={datetime}
                  onChange={(e) => setDatetime(e.target.value)}
                  className="w-full border-b border-border py-2 text-sm focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">
                  Location Type
                </label>
                <select
                  value={locationType}
                  onChange={(e) => setLocationType(e.target.value)}
                  className="w-full border-b border-border py-2 text-sm focus:outline-none"
                >
                  <option value="In-person">In-person</option>
                  <option value="Online">Online</option>
                  <option value="Hybrid">Hybrid</option>
                </select>
              </div>
            </div>

            {/* Location Details */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">
                Location Details *
              </label>
              <input
                type="text"
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Hall A, 3rd Floor / Google Meet Link"
                className="w-full border-b border-border py-2 text-sm focus:outline-none"
              />
            </div>

            {/* Capacity / SBT points */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">
                  Max Capacity
                </label>
                <input
                  type="number"
                  min="1"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  className="w-full border-b border-border py-2 text-sm focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">
                  Points Reward *
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={points}
                  onChange={(e) => setPoints(e.target.value)}
                  className="w-full border-b border-border py-2 text-sm focus:outline-none"
                />
              </div>
            </div>

            {/* Theme / Category */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">
                  Event Page Theme
                </label>
                <select
                  value={selectedTheme}
                  onChange={(e) => setSelectedTheme(e.target.value)}
                  className="w-full border-b border-border py-2 text-sm focus:outline-none"
                >
                  {Object.keys(THEMES).map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">
                  Event Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full border-b border-border py-2 text-sm focus:outline-none"
                >
                  <option value="Tech">Tech</option>
                  <option value="AI">AI</option>
                  <option value="Blockchain">Blockchain</option>
                  <option value="Design">Design</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Career">Career</option>
                </select>
              </div>
            </div>

            {/* Cover Image Upload / Custom Seed */}
            <div className="space-y-3 pt-2">
              <label className="block text-xs font-semibold text-text-secondary uppercase">
                Event Cover Image
              </label>
              
              <div className="flex gap-4 text-xs font-medium">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="imageMode"
                    value="seed"
                    checked={imageMode === 'seed'}
                    onChange={() => setImageMode('seed')}
                  />
                  <span>Preset / Keyword</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="imageMode"
                    value="upload"
                    checked={imageMode === 'upload'}
                    onChange={() => setImageMode('upload')}
                  />
                  <span>Upload Image File</span>
                </label>
              </div>

              {imageMode === 'seed' ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={coverSeed}
                    onChange={(e) => setCoverSeed(e.target.value)}
                    placeholder="Keyword (e.g. ai, hackathon, web3)"
                    className="flex-1 border-b border-border py-1 text-sm focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setCoverSeed(Math.random().toString(36).substring(7))}
                    className="px-3 py-1 bg-slate-100 text-slate-600 rounded text-xs font-medium hover:bg-slate-200"
                  >
                    Randomize
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-oc-blue/10 file:text-oc-blue hover:file:bg-oc-blue/20 cursor-pointer"
                  />
                  {coverImageData && (
                    <span className="text-[11px] text-emerald-600 font-medium block">
                      Custom image loaded for preview.
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* AI Enhancement Section */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleEnhanceContent}
                disabled={isAiGenerating || (!title && !description)}
                className="w-full py-2.5 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 hover:border-purple-300 text-purple-700 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                <span>{isAiGenerating ? '✨ AI Generating Details...' : '✨ Enhance Description & Suggest Tags with AI'}</span>
              </button>
            </div>

            {/* Submit Action Buttons */}
            <div className="pt-6 border-t border-border flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => navigate(`/manage/${chapterId || 'fit'}`)}
                className="px-5 py-2.5 border border-border text-text-secondary hover:text-navy rounded text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={(e) => handleSubmit(e, 'draft')}
                disabled={submitting}
                className="px-5 py-2.5 border border-oc-blue text-oc-blue hover:bg-oc-blue/5 rounded text-xs font-semibold transition-all disabled:opacity-50"
              >
                {submitting ? 'Saving...' : 'Save as Draft'}
              </button>
              <button
                type="button"
                onClick={(e) => handleSubmit(e, 'submit')}
                disabled={submitting}
                className="px-6 py-2.5 bg-accent-blue hover:bg-accent-hover text-white rounded text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit for Review'}
              </button>
            </div>
          </form>
        </div>

        {/* Live Preview Column */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-text-secondary uppercase">
            <span>Live Card Preview</span>
            <span className="text-[10px] text-accent-blue">{selectedTheme} Theme</span>
          </div>

          <div className={`border border-border rounded-2xl overflow-hidden shadow-lg transition-all ${themeStyle.card}`}>
            {/* Header Banner */}
            <div className="relative aspect-[2.4/1] w-full bg-slate-800 flex items-end p-6">
              <img
                src={imageMode === 'upload' && coverImageData ? coverImageData : `https://picsum.photos/seed/${coverSeed || 'orbit'}/800/400`}
                alt="Event cover preview"
                className="absolute inset-0 w-full h-full object-cover opacity-60"
              />
              <div className="relative z-10 space-y-1">
                <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${themeStyle.badge}`}>
                  {category}
                </span>
              </div>
            </div>

            {/* Content Preview */}
            <div className="p-6 space-y-4">
              <div>
                <h2 className="text-xl font-bold leading-tight">
                  {title || 'Untitled Event Preview'}
                </h2>
                
                {/* Meta details preview */}
                <div className="text-xs space-y-1.5 opacity-80 pt-2 border-t border-dashed border-slate-300/30">
                  <div>Type: {locationType}</div>
                  <div>Location: {location || 'No location set'}</div>
                  <div>Date: {datetime ? new Date(datetime).toLocaleString() : 'No date set'}</div>
                  <div>Attendance Capacity: {capacity} attendees</div>
                </div>
              </div>

              {/* Description & Content preview */}
              <div className="text-xs leading-relaxed border-t border-slate-300/30 pt-4 space-y-2">
                <p className="font-semibold">{description || 'Write short details in the form to generate event summary preview...'}</p>
                {content && content.split('\n\n').map((paragraph, i) => (
                  <p key={i} className="opacity-80">{paragraph}</p>
                ))}
              </div>

              {/* Tags */}
              {allTagsCombined.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {allTagsCombined.map(tag => (
                    <span key={tag} className="text-[10px] font-semibold px-2 py-0.5 rounded border border-current/25 bg-current/5">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Action Button Preview */}
              <div className="border-t border-slate-300/30 pt-6 flex justify-between items-center">
                <div className="flex items-center gap-1 text-sm font-bold">
                  <span>POINTS</span>
                  <span className={themeStyle.accentText}>+{points} pts</span>
                </div>
                <button
                  type="button"
                  className={`px-6 py-2.5 rounded text-xs font-semibold uppercase tracking-wider ${themeStyle.accent}`}
                >
                  Register to Event
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
export default EventCreate;
