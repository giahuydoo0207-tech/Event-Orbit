import React, { useState, useEffect, useRef } from 'react';
import readXlsxFile from 'read-excel-file/browser';
import Papa from 'papaparse';
import { StatusBadge } from './StatusBadge';
import { importAttendeesBatchApi } from '../api/mockApi';
import useToastStore from '../store/useToastStore';

export function AttendeeImportModal({ isOpen, onClose, events = [], eventId, chapterId, onImportSuccess, onSuccess }) {
  const handleSuccessCallback = onImportSuccess || onSuccess;
  const [selectedEventId, setSelectedEventId] = useState(eventId || events[0]?.id || '');
  const [file, setFile] = useState(null);
  const [parsedRows, setParsedRows] = useState([]);
  const [mappedData, setMappedData] = useState([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [parsingError, setParsingError] = useState('');
  
  // Processing & Batch state
  const [step, setStep] = useState('upload'); // 'upload' | 'preview' | 'processing' | 'results'
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  
  // Results summary
  const [results, setResults] = useState({
    issuedList: [],
    alreadyIssuedList: [],
    unmatchedList: [],
    totalProcessed: 0
  });

  const fileInputRef = useRef(null);
  const showToast = useToastStore((state) => state.showToast);
  const copyToClipboard = async (text, successMessage = 'Copied to clipboard.') => {
    try { await navigator.clipboard.writeText(text); showToast(successMessage, 'success'); }
    catch (err) { console.error('Clipboard copy failed:', err); showToast('Failed to copy link.', 'error'); }
  };

  // Sync selectedEventId when modal opens or eventId/events change
  useEffect(() => {
    if (isOpen) {
      if (eventId) {
        setSelectedEventId(eventId);
      } else if (events && events.length > 0) {
        setSelectedEventId(events[0].id);
      }
    }
  }, [isOpen, eventId, events]);

  if (!isOpen) return null;

  const removeAccents = (str) => {
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D');
  };

  // Flexible Header Normalizer with Vietnamese accent removal
  const normalizeRow = (row) => {
    let mssv = '';
    let email = '';
    let name = '';

    Object.keys(row).forEach((key) => {
      const cleanKey = removeAccents(key.trim().toLowerCase()).replace(/[^a-z0-9]/g, '');
      const val = (row[key] !== null && row[key] !== undefined) ? String(row[key]).trim() : '';

      if (!mssv && (
        cleanKey === 'mssv' || cleanKey === 'studentid' || cleanKey === 'masv' || cleanKey === 'svid' ||
        cleanKey.includes('mssv') || cleanKey.includes('masinhvien') || cleanKey.includes('studentid')
      )) {
        mssv = val;
      }
      if (!email && (
        cleanKey === 'email' || cleanKey === 'mail' || cleanKey === 'emailaddress' || cleanKey === 'diachiemail' ||
        cleanKey.includes('email') || cleanKey.includes('mail')
      )) {
        email = val;
      }
      if (!name && (
        cleanKey === 'name' || cleanKey === 'fullname' || cleanKey === 'ten' || cleanKey === 'hoten' || cleanKey === 'studentname' ||
        cleanKey.includes('name') || cleanKey.includes('ten') || cleanKey.includes('hoten') || cleanKey.includes('hovaten') || cleanKey.includes('sinhvien')
      )) {
        name = val;
      }
    });

    return { mssv, email, name, raw: row };
  };

  const processFile = (fileObj) => {
    setParsingError('');
    setFile(fileObj);

    const ext = fileObj.name.split('.').pop().toLowerCase();

    if (fileObj.size > 5 * 1024 * 1024) {
      setParsingError('The attendee file must be 5MB or smaller.');
      return;
    }

    if (ext === 'csv') {
      Papa.parse(fileObj, {
        header: true,
        skipEmptyLines: true,
        complete: (res) => {
          if (!res.data || res.data.length === 0) {
            setParsingError('The uploaded CSV file contains no data rows.');
            return;
          }
          const normalized = res.data.map(normalizeRow);
          setParsedRows(res.data);
          setMappedData(normalized);
          setStep('preview');
        },
        error: (err) => {
          setParsingError(`CSV parsing error: ${err.message}`);
        }
      });
    } else if (ext === 'xlsx') {
      readXlsxFile(fileObj)
        .then((rows) => {
          if (!rows || rows.length < 2) {
            setParsingError('The uploaded Excel worksheet is empty.');
            return;
          }

          const headers = rows[0].map((value) => String(value ?? '').trim());
          const json = rows.slice(1, 5001).map((row) => Object.fromEntries(
            headers.map((header, index) => [header, row[index] ?? '']),
          ));
          const normalized = json.map(normalizeRow);
          setParsedRows(json);
          setMappedData(normalized);
          setStep('preview');
        })
        .catch((err) => {
          setParsingError(`Excel file error: ${err.message}`);
        });
    } else {
      setParsingError('Unsupported file format. Please upload a .csv or .xlsx file.');
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  // Start Batch Submission
  const handleConfirmImport = async () => {
    const targetEventId = selectedEventId || eventId;
    if (!targetEventId) {
      showToast('Please select a target event before proceeding.', 'error');
      return;
    }

    if (mappedData.length === 0) {
      showToast('No valid rows found to process.', 'error');
      return;
    }

    setStep('processing');
    setProgress(5);
    setStatusText('Initiating attendee list processing...');

    // Yield DOM rendering tick so React renders processing spinner & progress bar
    await new Promise(r => setTimeout(r, 100));

    const batchSize = 50;
    const totalRows = mappedData.length;
    const totalBatches = Math.ceil(totalRows / batchSize);

    const aggregatedResults = {
      issuedList: [],
      alreadyIssuedList: [],
      unmatchedList: [],
      totalProcessed: 0
    };

    try {
      for (let i = 0; i < totalBatches; i++) {
        const start = i * batchSize;
        const end = Math.min(start + batchSize, totalRows);
        const chunk = mappedData.slice(start, end);

        const currentStartPercent = Math.round((start / totalRows) * 100);
        setProgress(Math.max(5, currentStartPercent));
        setStatusText(`Processing batch ${i + 1} of ${totalBatches} (${start + 1} - ${end} of ${totalRows} rows)...`);
        // Yield DOM tick
        await new Promise(r => setTimeout(r, 60));

        const res = await importAttendeesBatchApi(targetEventId, chunk);

        if (res.issuedList) aggregatedResults.issuedList.push(...res.issuedList);
        if (res.alreadyIssuedList) aggregatedResults.alreadyIssuedList.push(...res.alreadyIssuedList);
        if (res.unmatchedList) aggregatedResults.unmatchedList.push(...res.unmatchedList);
        aggregatedResults.totalProcessed += res.processedCount || chunk.length;

        const currentEndPercent = Math.round(((i + 1) / totalBatches) * 100);
        setProgress(currentEndPercent);

        // Yield DOM tick
        await new Promise(r => setTimeout(r, 60));
      }

      setResults(aggregatedResults);
      setStep('results');
      showToast(`Processing complete. Created ${aggregatedResults.issuedList.length} credential records.`, 'success');
      
      if (handleSuccessCallback) {
        handleSuccessCallback();
      }
    } catch (err) {
      console.error('[AttendeeImportModal] Import processing failed:', err);
      showToast(err.message || 'Import failed due to server error.', 'error');
      setStep('preview');
    }
  };

  const handleReset = () => {
    setFile(null);
    setParsedRows([]);
    setMappedData([]);
    setStep('upload');
    setParsingError('');
    setProgress(0);
  };

  // Check column validity
  const validRowsCount = mappedData.filter(r => r.mssv || r.email).length;
  const invalidRowsCount = mappedData.length - validRowsCount;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy/60 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="attendee-import-title" className="flex max-h-[94dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-xl border border-border bg-white shadow-oc-lg sm:max-h-[90dvh] sm:rounded-xl">
        
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-border bg-slate-50 px-4 py-4 sm:px-6">
          <div>
            <h2 id="attendee-import-title" className="text-base font-bold text-navy flex items-center gap-2">
              Import Participant Records
            </h2>
            <p className="text-xs text-text-secondary mt-0.5">
              Upload a CSV or Excel file, preview the records, then confirm the import.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close attendee import"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg text-text-secondary transition-colors hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-oc-blue/30"
          >
            &times;
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 space-y-6 overflow-y-auto p-4 sm:p-6">

          {/* Event Selector */}
          {step !== 'results' && (
          <div className="bg-surface border border-border rounded-xl p-4 space-y-2">
            <label className="block text-xs font-bold text-navy uppercase tracking-wider">
              1. Select Target Event *
            </label>
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              disabled={step === 'processing'}
              className="w-full border border-border rounded-lg p-2.5 text-xs text-navy font-semibold focus:outline-none focus:border-accent-blue bg-white"
            >
              {events.length === 0 ? (
                <option value={eventId || ''}>{eventId ? 'Current event' : 'No events available in this chapter'}</option>
              ) : (
                events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.name} (+{ev.points} pts) &bull; {new Date(ev.datetime).toLocaleDateString()}
                  </option>
                ))
              )}
            </select>
          </div>
          )}

          {/* STEP 1: Upload Step */}
          {step === 'upload' && (
            <div className="space-y-4">
              <label className="block text-xs font-bold text-navy uppercase tracking-wider">
                2. Upload Attendee File (.xlsx or .csv)
              </label>

              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-colors sm:p-10 ${
                  isDragOver
                    ? 'border-accent-blue bg-accent-blue/5 scale-[0.99]'
                    : 'border-border bg-slate-50 hover:bg-slate-100/80 hover:border-accent-blue/50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv, .xlsx, .xls"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <div className="space-y-3 pointer-events-none">
                  <div className="w-12 h-12 rounded-full bg-accent-blue/10 text-accent-blue flex items-center justify-center mx-auto text-xl font-bold">
                    &uarr;
                  </div>
                  <div>
                    <div className="text-sm font-bold text-navy">
                      Drag & Drop your Excel or CSV file here
                    </div>
                    <div className="text-xs text-text-secondary mt-1">
                      or click to browse from your device
                    </div>
                  </div>
                  <div className="text-[10px] text-text-secondary font-mono bg-white border border-border inline-block px-3 py-1 rounded-full">
                    Required headers: MSSV (Student ID) or Email
                  </div>
                </div>
              </div>

              {parsingError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-medium">
                  {parsingError}
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Preview Step */}
          {step === 'preview' && (
            <div className="space-y-5">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xs font-bold text-navy uppercase tracking-wider">
                    2. File Data Preview &amp; Header Mapping
                  </h3>
                  <p className="text-xs text-text-secondary mt-0.5">
                    File: <span className="font-semibold text-navy">{file?.name}</span> ({mappedData.length} total rows)
                  </p>
                </div>
                <button
                  onClick={handleReset}
                  className="text-xs text-text-secondary hover:text-navy underline"
                >
                  Choose another file
                </button>
              </div>


              {/* Taste Skill Unified Metric Bar Frame */}
              <div className="bg-slate-50/90 border border-oc-periwinkle/40 rounded-xl p-3.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 shadow-xs">
                {/* Metric 1: Valid Rows */}
                <div className="flex-1 flex items-center justify-between gap-3 min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                    <span className="text-[10px] sm:text-[11px] font-mono font-bold uppercase tracking-wider text-slate-600 whitespace-nowrap truncate" title="Identifiable Rows (MSSV or Email)">
                      IDENTIFIABLE (MSSV / EMAIL)
                    </span>
                  </div>
                  <span className="num font-mono text-xl font-extrabold text-emerald-700 tracking-tight shrink-0 ml-2">
                    {validRowsCount}
                  </span>
                </div>

                {/* Vertical hairline divider */}
                <div className="hidden sm:block h-7 w-[1px] bg-oc-periwinkle/40 shrink-0" />

                {/* Metric 2: Invalid Rows */}
                <div className="flex-1 flex items-center justify-between gap-3 min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                    <span className="text-[10px] sm:text-[11px] font-mono font-bold uppercase tracking-wider text-slate-600 whitespace-nowrap truncate" title="Unidentifiable Rows (No MSSV & No Email)">
                      UNIDENTIFIABLE (NO DATA)
                    </span>
                  </div>
                  <span className="num font-mono text-xl font-extrabold text-amber-700 tracking-tight shrink-0 ml-2">
                    {invalidRowsCount}
                  </span>
                </div>
              </div>

              {/* Preview Table */}
              <div className="bg-white border border-border rounded-xl overflow-hidden shadow-sm">
                <div className="px-4 py-2 bg-slate-50 border-b border-border flex justify-between items-center text-[10px] font-bold uppercase text-text-secondary">
                  <span>Showing first 8 mapped preview rows</span>
                  <span>Header Auto-Mapped</span>
                </div>
                <div className="overflow-x-auto max-h-60">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100/70 border-b border-border uppercase text-[9px] font-bold text-text-secondary">
                        <th className="p-3">#</th>
                        <th className="p-3">MSSV (Student ID)</th>
                        <th className="p-3">Email Address</th>
                        <th className="p-3">Full Name</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {mappedData.slice(0, 8).map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-3 text-text-secondary font-mono text-[10px]">{idx + 1}</td>
                          <td className="p-3 font-mono font-semibold text-navy">
                            {row.mssv ? (
                              row.mssv
                            ) : (
                              <span className="inline-flex items-center gap-1 font-mono text-[10px] font-extrabold text-amber-700 uppercase tracking-wider">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                                <span>Unset (Email Match Only)</span>
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-text-secondary">
                            {row.email ? row.email : <span className="text-slate-400 italic">Unset</span>}
                          </td>
                          <td className="p-3 font-medium text-navy">
                            {row.name || 'Attendee'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Processing State */}
          {step === 'processing' && (
            <div className="py-12 text-center space-y-6">
              <div className="w-12 h-12 border-4 border-accent-blue border-t-transparent rounded-full animate-spin mx-auto"></div>
              <div className="space-y-2">
                <h3 className="text-base font-bold text-navy">Processing Credential Records...</h3>
                <p className="text-xs text-text-secondary font-medium">{statusText}</p>
              </div>

              {/* Progress Bar */}
              <div className="max-w-md mx-auto space-y-1.5">
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-border">
                  <div
                    className="bg-accent-blue h-full transition-all duration-300 rounded-full"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <div className="text-right text-[10px] font-bold text-accent-blue font-mono">
                  {progress}% Completed
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Results Dashboard */}
          {step === 'results' && (
            <div className="space-y-6 pt-4">
              <div className="border-b border-border pb-4">
                <h3 className="text-lg font-extrabold text-navy">Import and Credential Record Summary</h3>
                <p className="text-xs text-text-secondary">
                  Processed <span className="num font-bold text-oc-blue">{results.totalProcessed}</span> records from the uploaded file.
                </p>
                <p className="mt-2 text-xs text-text-secondary">{results.unmatchedList.some((item) => item.claimUrl) ? 'Send claim links to unmatched students so they can verify with Open Campus ID.' : 'No claim links were needed for this import.'}</p>
              </div>

              <div className="grid grid-cols-1 overflow-hidden rounded-lg border border-oc-periwinkle bg-oc-mist sm:grid-cols-3 sm:divide-x sm:divide-oc-periwinkle">
                {[['RECORDS CREATED', results.issuedList.length], ['ALREADY RECORDED', results.alreadyIssuedList.length], ['CLAIM LINKS', results.unmatchedList.filter((item) => item.claimUrl).length]].map(([label, value]) => <div key={label} className="flex items-center justify-between px-4 py-2.5"><span className="font-mono text-[10px] font-bold tracking-wider text-oc-navy">{label}</span><span className="font-mono text-xl font-extrabold text-oc-blue">{value}</span></div>)}
              </div>

              {results.alreadyIssuedList.length > 0 && <section className="space-y-3"><h4 className="font-mono text-[10px] font-bold tracking-wider text-oc-navy">ALREADY RECORDED</h4><div className="overflow-x-auto rounded-lg border border-oc-periwinkle"><table className="w-full text-left text-xs"><thead className="bg-oc-mist"><tr><th className="p-2.5">Name</th><th className="p-2.5">MSSV</th><th className="p-2.5">Email</th><th className="p-2.5">Reason</th></tr></thead><tbody>{results.alreadyIssuedList.map((item, idx) => <tr key={idx} className="border-t border-oc-periwinkle"><td className="p-2.5 font-semibold text-oc-navy">{item.name}</td><td className="p-2.5 font-mono">{item.mssv}</td><td className="p-2.5">{item.email}</td><td className="p-2.5 text-text-secondary">{item.reason}</td></tr>)}</tbody></table></div></section>}

              {/* Unmatched List Breakdown Table */}
              {results.unmatchedList.length > 0 && (
                <div className="bg-oc-mist border border-oc-periwinkle rounded-xl p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="badge-kicker text-[10px] font-bold text-oc-navy tracking-wider">
                      Unmatched Attendees (<span className="num">{results.unmatchedList.length}</span>)
                    </h4>
                    <div className="flex items-center gap-3"><span className="text-[10px] text-text-secondary font-medium">Send the claim link to each student so they can self-claim their credential.</span>{results.unmatchedList.some((item) => item.claimUrl) && <button onClick={() => copyToClipboard(results.unmatchedList.filter((item) => item.claimUrl).map((item) => `${item.name}: ${item.claimUrl}`).join('\n'), 'Claim links copied to clipboard.')} className="shrink-0 rounded-md border border-oc-blue/30 px-2 py-1 text-[10px] font-bold text-oc-blue">Copy All</button>}</div>
                  </div>

                  <div className={`bg-white border border-oc-periwinkle rounded-lg overflow-x-auto ${results.unmatchedList.length > 6 ? 'max-h-64 overflow-y-auto' : ''}`}>
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-oc-mist border-b border-oc-periwinkle">
                          <th className="p-2.5 badge-kicker min-w-32 whitespace-nowrap text-[9px] text-oc-navy">MSSV</th>
                          <th className="p-2.5 badge-kicker text-[9px] text-oc-navy">Email</th>
                          <th className="p-2.5 badge-kicker text-[9px] text-oc-navy">Name</th>
                          <th className="p-2.5 badge-kicker text-[9px] text-oc-navy">Reason</th>
                          <th className="p-2.5 badge-kicker whitespace-nowrap text-right text-[9px] text-oc-navy">Claim Link</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-oc-periwinkle">
                        {results.unmatchedList.map((item, idx) => (
                          <tr key={idx} className="hover:bg-oc-mist transition-colors">
                            <td className="p-2.5 whitespace-nowrap font-mono text-xs font-semibold text-oc-ink">{item.mssv}</td>
                            <td className="p-2.5 text-slate-600 text-xs">{item.email}</td>
                            <td className="p-2.5 font-medium text-oc-ink text-xs">{item.name}</td>
                            <td className="p-2.5"><span className="whitespace-nowrap rounded-sm bg-oc-navy px-2 py-1 font-mono text-[9px] font-bold text-white/80">{item.reason.includes('both MSSV and Email') ? 'MISSING INFO' : item.reason.includes('Duplicate') ? 'DUPLICATE ROW' : 'NO OCID ACCOUNT'}</span></td>
                            <td className="p-2.5 text-right">{item.claimUrl ? <button onClick={() => copyToClipboard(item.claimUrl)} title="Copy claim link" aria-label="Copy claim link" className="rounded-md border border-oc-blue/30 px-2 py-1 text-[10px] font-bold text-oc-blue">Copy</button> : <span className="text-slate-400">N/A</span>}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-border bg-slate-50 flex justify-between items-center">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-border text-navy bg-white hover:bg-slate-100 text-xs font-semibold rounded-lg"
          >
            {step === 'results' ? 'Close' : 'Cancel'}
          </button>

          {step === 'preview' && (
            <button
              type="button"
              onClick={handleConfirmImport}
              className="px-6 py-2 bg-navy text-white hover:bg-navy-light text-xs font-semibold rounded-lg transition-colors shadow-sm"
            >
              Confirm Import {mappedData.length} Attendees
            </button>
          )}

          {step === 'results' && (
            <button
              type="button"
              onClick={handleReset}
              className="px-5 py-2 bg-accent-blue text-white hover:bg-accent-hover text-xs font-semibold rounded-lg transition-colors"
            >
              Import Another File
            </button>
          )}
        </div>

      </div>
    </div>
  );
}

export default AttendeeImportModal;
