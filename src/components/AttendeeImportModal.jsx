import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
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

  // Sync selectedEventId when modal opens or eventId/events change
  useEffect(() => {
    if (isOpen) {
      console.log(`[AttendeeImportModal] Opened - eventId prop: ${eventId}, selectedEventId: ${selectedEventId}, step: ${step}`);
      if (eventId) {
        setSelectedEventId(eventId);
      } else if (events && events.length > 0) {
        setSelectedEventId(events[0].id);
      }
    }
  }, [isOpen, eventId, events]);

  useEffect(() => {
    if (isOpen) {
      console.log(`[AttendeeImportModal] Current step: ${step}, progress: ${progress}%`);
    }
  }, [step, progress, isOpen]);

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
    } else if (ext === 'xlsx' || ext === 'xls') {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const json = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

          if (!json || json.length === 0) {
            setParsingError('The uploaded Excel worksheet is empty.');
            return;
          }
          const normalized = json.map(normalizeRow);
          setParsedRows(json);
          setMappedData(normalized);
          setStep('preview');
        } catch (err) {
          setParsingError(`Excel file error: ${err.message}`);
        }
      };
      reader.readAsArrayBuffer(fileObj);
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
    console.log(`[AttendeeImportModal] handleConfirmImport STARTED for event: ${targetEventId}, rows: ${mappedData.length}`);

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
        console.log(`[AttendeeImportModal] Processing batch ${i + 1}/${totalBatches}`);

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

      console.log(`[AttendeeImportModal] Batch COMPLETED! Issued: ${aggregatedResults.issuedList.length}, Dupes: ${aggregatedResults.alreadyIssuedList.length}, Unmatched: ${aggregatedResults.unmatchedList.length}`);
      setResults(aggregatedResults);
      setStep('results');
      showToast(`Processing complete! Issued ${aggregatedResults.issuedList.length} badges.`, 'success');
      
      if (handleSuccessCallback) {
        console.log('[AttendeeImportModal] Invoking handleSuccessCallback background data reload');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
      <div className="bg-white border border-border rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-slate-50">
          <div>
            <h2 className="text-base font-bold text-navy flex items-center gap-2">
              Import & Auto-Issue Event Badges
              <span className="bg-accent-blue/10 text-accent-blue text-[10px] uppercase font-extrabold px-2 py-0.5 rounded">
                Partner Import
              </span>
            </h2>
            <p className="text-xs text-text-secondary mt-0.5">
              Upload external attendee lists (.xlsx/.csv from Luma, Ticketbox, FB Events) to issue Soulbound Badges.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-text-secondary hover:bg-slate-200 transition-colors text-lg"
          >
            &times;
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">

          {/* Event Selector */}
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
                <option value="">No events available in this chapter</option>
              ) : (
                events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.name} (+{ev.points} pts) &bull; {new Date(ev.datetime).toLocaleDateString()}
                  </option>
                ))
              )}
            </select>
          </div>

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
                className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
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
                    2. File Data Preview & Header Mapping
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

              {/* Clean Borderless Metrics */}
              <div className="grid grid-cols-2 gap-6 text-xs font-mono">
                <div className="flex justify-between items-center py-1 px-0.5">
                  <span className="text-emerald-800 font-extrabold flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Valid Identifiable Rows:</span>
                  </span>
                  <span className="font-extrabold text-emerald-700 text-base num">{validRowsCount}</span>
                </div>
                <div className="flex justify-between items-center py-1 px-0.5">
                  <span className="text-amber-800 font-extrabold flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    <span>Missing MSSV & Email:</span>
                  </span>
                  <span className="font-extrabold text-amber-700 text-base num">{invalidRowsCount}</span>
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
                            {row.mssv ? row.mssv : <span className="text-slate-400 italic">Unset</span>}
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
                <h3 className="text-base font-bold text-navy">Processing & Issuing Badges...</h3>
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
            <div className="space-y-6">
              <div className="border-b border-border pb-4">
                <h3 className="text-lg font-extrabold text-navy">Import & Badge Issuance Summary</h3>
                <p className="text-xs text-text-secondary">
                  Processed <span className="num font-bold text-oc-blue">{results.totalProcessed}</span> records. Badges issued and on-chain SBTs dispatched.
                </p>
              </div>

              {/* Results Stat Cards with Taste Skill Vector Status Icons & Space Mono Nums */}
              <div className="grid grid-cols-3 gap-4">
                {/* Card 1: Issued */}
                <div className="bg-emerald-50/70 border border-emerald-200/60 rounded-xl p-4 flex flex-col justify-between transition-all hover:shadow-sm">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                    <svg className="w-3.5 h-3.5 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Badges Issued</span>
                  </div>
                  <div className="num text-3xl font-extrabold text-emerald-700 tracking-tight mt-3">
                    {results.issuedList.length}
                  </div>
                </div>

                {/* Card 2: Dupes */}
                <div className="bg-amber-50/70 border border-amber-200/60 rounded-xl p-4 flex flex-col justify-between transition-all hover:shadow-sm">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-800">
                    <svg className="w-3.5 h-3.5 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                    </svg>
                    <span>Already Issued</span>
                  </div>
                  <div className="num text-3xl font-extrabold text-amber-700 tracking-tight mt-3">
                    {results.alreadyIssuedList.length}
                  </div>
                </div>

                {/* Card 3: Unmatched */}
                <div className="bg-rose-50/70 border border-rose-200/60 rounded-xl p-4 flex flex-col justify-between transition-all hover:shadow-sm">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-rose-800">
                    <svg className="w-3.5 h-3.5 text-rose-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span>Unmatched Rows</span>
                  </div>
                  <div className="num text-3xl font-extrabold text-rose-700 tracking-tight mt-3">
                    {results.unmatchedList.length}
                  </div>
                </div>
              </div>

              {/* Unmatched List Breakdown Table */}
              {results.unmatchedList.length > 0 && (
                <div className="bg-rose-50/40 border border-rose-200/70 rounded-xl p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="badge-kicker text-[10px] font-bold text-rose-900 tracking-wider">
                      Unmatched Attendees (<span className="num">{results.unmatchedList.length}</span>)
                    </h4>
                    <span className="text-[10px] text-rose-700 font-medium">
                      Remind these students to register an OCID account to claim badges.
                    </span>
                  </div>

                  <div className="bg-white border border-rose-100 rounded-lg overflow-x-auto max-h-44 shadow-xs">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-rose-100/40 border-b border-rose-100">
                          <th className="p-2.5 badge-kicker text-[9px] text-rose-900">MSSV</th>
                          <th className="p-2.5 badge-kicker text-[9px] text-rose-900">Email</th>
                          <th className="p-2.5 badge-kicker text-[9px] text-rose-900">Name</th>
                          <th className="p-2.5 badge-kicker text-[9px] text-rose-900">Reason</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-rose-50/80">
                        {results.unmatchedList.map((item, idx) => (
                          <tr key={idx} className="hover:bg-rose-50/40 transition-colors">
                            <td className="p-2.5 font-mono text-xs font-semibold text-oc-ink">{item.mssv}</td>
                            <td className="p-2.5 text-slate-600 text-xs">{item.email}</td>
                            <td className="p-2.5 font-medium text-oc-ink text-xs">{item.name}</td>
                            <td className="p-2.5">
                              <StatusBadge
                                status="unmatched"
                                label={
                                  item.reason.includes('both MSSV and Email')
                                    ? 'MISSING INFO'
                                    : item.reason.includes('Duplicate')
                                    ? 'DUPLICATE ROW'
                                    : 'NO OCID ACCOUNT'
                                }
                              />
                            </td>
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
            {step === 'results' ? 'Close Window' : 'Cancel'}
          </button>

          {step === 'preview' && (
            <button
              type="button"
              onClick={handleConfirmImport}
              className="px-6 py-2 bg-navy text-white hover:bg-navy-light text-xs font-semibold rounded-lg transition-colors shadow-sm"
            >
              Confirm & Issue {mappedData.length} Badges
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
