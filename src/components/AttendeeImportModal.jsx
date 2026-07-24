import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { importAttendeesBatchApi } from '../api/mockApi';
import useToastStore from '../store/useToastStore';

export function AttendeeImportModal({ isOpen, onClose, events = [], chapterId, onImportSuccess }) {
  const [selectedEventId, setSelectedEventId] = useState(events[0]?.id || '');
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

  if (!isOpen) return null;

  // Flexible Header Normalizer
  const normalizeRow = (row) => {
    let mssv = '';
    let email = '';
    let name = '';

    Object.keys(row).forEach((key) => {
      const cleanKey = key.trim().toLowerCase().replace(/[\s\-_]+/g, '');
      const val = (row[key] !== null && row[key] !== undefined) ? String(row[key]).trim() : '';

      if (!mssv && (cleanKey === 'mssv' || cleanKey === 'studentid' || cleanKey === 'masv' || cleanKey === 'svid')) {
        mssv = val;
      }
      if (!email && (cleanKey === 'email' || cleanKey === 'mail' || cleanKey === 'emailaddress' || cleanKey === 'diachiemail')) {
        email = val;
      }
      if (!name && (cleanKey === 'name' || cleanKey === 'fullname' || cleanKey === 'ten' || cleanKey === 'hoten' || cleanKey === 'studentname')) {
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
    if (!selectedEventId) {
      showToast('Please select a target event before proceeding.', 'error');
      return;
    }

    if (mappedData.length === 0) {
      showToast('No valid rows found to process.', 'error');
      return;
    }

    setStep('processing');
    setProgress(0);
    setStatusText('Initiating attendee list processing...');

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

        setStatusText(`Processing batch ${i + 1} of ${totalBatches} (${start + 1} - ${end} of ${totalRows} rows)...`);

        const res = await importAttendeesBatchApi(selectedEventId, chunk);

        if (res.issuedList) aggregatedResults.issuedList.push(...res.issuedList);
        if (res.alreadyIssuedList) aggregatedResults.alreadyIssuedList.push(...res.alreadyIssuedList);
        if (res.unmatchedList) aggregatedResults.unmatchedList.push(...res.unmatchedList);
        aggregatedResults.totalProcessed += res.processedCount || chunk.length;

        const percent = Math.round(((i + 1) / totalBatches) * 100);
        setProgress(percent);
      }

      setResults(aggregatedResults);
      setStep('results');
      showToast('Attendee list processing complete!', 'success');
      if (onImportSuccess) onImportSuccess();
    } catch (err) {
      console.error('Import processing failed:', err);
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

              {/* Status Pills */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex justify-between items-center">
                  <span className="text-emerald-800 font-semibold">Valid Identifiable Rows:</span>
                  <span className="font-bold text-emerald-700 text-sm">{validRowsCount}</span>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex justify-between items-center">
                  <span className="text-amber-800 font-semibold">Missing MSSV & Email:</span>
                  <span className="font-bold text-amber-700 text-sm">{invalidRowsCount}</span>
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
                  Processed {results.totalProcessed} records. Badges issued and on-chain SBTs dispatched.
                </p>
              </div>

              {/* Results Stat Cards */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                  <div className="text-[10px] font-bold uppercase text-emerald-800 tracking-wider">
                    Badges Issued
                  </div>
                  <div className="text-3xl font-extrabold text-emerald-700 mt-1">
                    {results.issuedList.length}
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
                  <div className="text-[10px] font-bold uppercase text-amber-800 tracking-wider">
                    Already Issued / Dupes
                  </div>
                  <div className="text-3xl font-extrabold text-amber-700 mt-1">
                    {results.alreadyIssuedList.length}
                  </div>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                  <div className="text-[10px] font-bold uppercase text-red-800 tracking-wider">
                    Unmatched Rows
                  </div>
                  <div className="text-3xl font-extrabold text-red-700 mt-1">
                    {results.unmatchedList.length}
                  </div>
                </div>
              </div>

              {/* Unmatched List Breakdown if any */}
              {results.unmatchedList.length > 0 && (
                <div className="bg-red-50/50 border border-red-200 rounded-xl p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-bold text-red-900 uppercase tracking-wider">
                      Unmatched Attendees ({results.unmatchedList.length})
                    </h4>
                    <span className="text-[10px] text-red-700">
                      Share these MSSVs/emails to remind students to register an OCID account.
                    </span>
                  </div>

                  <div className="bg-white border border-red-100 rounded-lg overflow-x-auto max-h-40">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-red-100/50 uppercase text-[9px] font-bold text-red-900">
                          <th className="p-2">MSSV</th>
                          <th className="p-2">Email</th>
                          <th className="p-2">Name</th>
                          <th className="p-2">Reason</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-red-50">
                        {results.unmatchedList.map((item, idx) => (
                          <tr key={idx}>
                            <td className="p-2 font-mono text-[10px] font-semibold text-navy">{item.mssv}</td>
                            <td className="p-2 text-text-secondary">{item.email}</td>
                            <td className="p-2 font-medium">{item.name}</td>
                            <td className="p-2 text-red-600 text-[10px]">{item.reason}</td>
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
