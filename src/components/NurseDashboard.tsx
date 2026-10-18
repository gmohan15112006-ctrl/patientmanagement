import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { PatientRecord, HospitalConfig } from '../types/hospital';
import {
  Activity,
  LogOut,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  User,
  FileSpreadsheet,
  Send,
  HelpCircle,
  Hash,
  ChevronDown,
} from 'lucide-react';

export const NurseDashboard: React.FC = () => {
  const { user, token, logout } = useAuth();
  const [config, setConfig] = useState<HospitalConfig | null>(null);
  const [recentRecords, setRecentRecords] = useState<PatientRecord[]>([]);
  const [isLoadingRecent, setIsLoadingRecent] = useState(false);

  // Form State matching the 15 columns exactly
  const getInitialFormState = () => {
    const now = new Date();
    // Format: "11.08.2026 12.16AM" or standard ISO
    const dateFormatted = `${String(now.getDate()).padStart(2, '0')}.${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()} ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}`;
    const timeFormatted = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    return {
      ipNumber: '',
      patientName: '',
      age: '',
      sex: 'M' as 'M' | 'F' | 'Other',
      admissionDatetime: dateFormatted,
      patientReceivedTime: timeFormatted,
      specialtyCategory: 'SURGERY CASES',
      diagnosis: '',
      ageInterval: '12-60',
      taeiCategory: 'PILLAR',
      medicolegalCategory: 'MLC',
      transferredOut: 'MS',
      transferredOutTime: '',
      emergencyResponseTime: '5 mins',
    };
  };

  const [formData, setFormData] = useState(getInitialFormState());
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<{ serialNumber: number; ipNumber: string; patientName: string } | null>(null);

  // Correction Request Modal State
  const [correctionTargetRecord, setCorrectionTargetRecord] = useState<PatientRecord | null>(null);
  const [correctionNote, setCorrectionNote] = useState('');
  const [isSubmittingCorrection, setIsSubmittingCorrection] = useState(false);
  const [correctionSuccessMsg, setCorrectionSuccessMsg] = useState<string | null>(null);

  // Fetch hospital config
  useEffect(() => {
    fetch('/api/config')
      .then((res) => res.json())
      .then((data) => setConfig(data))
      .catch((err) => console.error('Failed to load config:', err));
  }, []);

  // Fetch nurse's own recent records
  const loadRecentRecords = useCallback(async () => {
    if (!token) return;
    setIsLoadingRecent(true);
    try {
      const res = await fetch('/api/records?onlyMyRecords=true&limit=25', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setRecentRecords(data.records);
      }
    } catch (e) {
      console.error('Failed to load recent records:', e);
    } finally {
      setIsLoadingRecent(false);
    }
  }, [token]);

  useEffect(() => {
    loadRecentRecords();
  }, [loadRecentRecords]);

  // Handle Age change and auto-suggest age interval
  const handleAgeChange = (val: string) => {
    setFormData((prev) => {
      const num = parseInt(val, 10);
      let autoInterval = prev.ageInterval;
      if (!isNaN(num)) {
        if (num > 60) autoInterval = '>60';
        else if (num >= 12) autoInterval = '12-60';
        else autoInterval = '<12';
      }
      return { ...prev, age: val, ageInterval: autoInterval };
    });
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.ipNumber.trim()) {
      errors.ipNumber = 'IP Number is required (e.g. 9985 or 10004)';
    }
    if (!formData.patientName.trim()) {
      errors.patientName = 'Patient Name is required';
    }
    if (!formData.age || isNaN(Number(formData.age)) || Number(formData.age) < 0 || Number(formData.age) > 130) {
      errors.age = 'Valid age between 0 and 130 is required';
    }
    if (!formData.admissionDatetime.trim()) {
      errors.admissionDatetime = 'Admission date & time is required';
    }
    if (!formData.diagnosis.trim()) {
      errors.diagnosis = 'Emergency diagnosis is required (e.g. RTA, POISONING)';
    }
    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccess(null);
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors({});

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/records', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          age: Number(formData.age),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormErrors({ submit: data.error || 'Failed to save record.' });
      } else {
        setSaveSuccess({
          serialNumber: data.record.serialNumber,
          ipNumber: data.record.ipNumber,
          patientName: data.record.patientName,
        });
        // Reset form for next patient entry
        setFormData(getInitialFormState());
        loadRecentRecords();
      }
    } catch (err: any) {
      setFormErrors({ submit: err.message || 'Network connection failed.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    if (window.confirm('Clear all unsaved fields in this patient form?')) {
      setFormData(getInitialFormState());
      setFormErrors({});
      setSaveSuccess(null);
    }
  };

  const handleQuickDiagnosis = (diag: string) => {
    setFormData((prev) => ({
      ...prev,
      diagnosis: diag,
      // Common clinical associations: RTA is typically SURGERY + PILLAR + MLC
      specialtyCategory: ['RTA', 'RTA WITH HI', 'ASSAULT', 'ACUTE APPENDICITIS'].includes(diag)
        ? 'SURGERY CASES'
        : prev.specialtyCategory,
      taeiCategory: ['RTA', 'RTA WITH HI', 'POISONING'].includes(diag) ? 'PILLAR' : prev.taeiCategory,
      medicolegalCategory: ['RTA', 'RTA WITH HI', 'ASSAULT', 'POISONING'].includes(diag) ? 'MLC' : 'NMLC',
    }));
  };

  const submitCorrectionRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctionTargetRecord || !correctionNote.trim()) return;

    setIsSubmittingCorrection(true);
    try {
      const res = await fetch(`/api/records/${correctionTargetRecord.id}/correction-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ note: correctionNote }),
      });

      if (res.ok) {
        setCorrectionSuccessMsg(
          `Correction request submitted for S NO #${correctionTargetRecord.serialNumber} (IP: ${correctionTargetRecord.ipNumber}). The administrator will review and update the record.`
        );
        setCorrectionNote('');
        loadRecentRecords();
      }
    } catch (err) {
      console.error('Failed to submit correction:', err);
    } finally {
      setIsSubmittingCorrection(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-12">
      {/* Top Header - Zone 1 (Wordmark), Zone 2 (Shift Context), Zone 3 (Action) */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Zone 1: Wordmark */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold shadow-xs">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 leading-tight">
                {config?.hospitalName || 'HOSPITAL EMERGENCY DATA SYSTEM'}
              </h1>
              <p className="text-xs text-teal-700 font-semibold tracking-wide uppercase">
                Emergency Nurse Station · Casualty Register
              </p>
            </div>
          </div>

          {/* Zone 2: Shift Context */}
          <div className="hidden md:flex items-center gap-6 text-xs text-slate-600 font-medium">
            <div className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-teal-600" />
              <span>Duty Staff: <strong className="text-slate-900">{user?.fullName}</strong></span>
              <span className="text-slate-400">({user?.staffId || 'RN'})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Shift: <strong className="text-slate-900">Emergency 24/7 Intake</strong></span>
            </div>
          </div>

          {/* Zone 3: Secure Logout Action */}
          <div className="flex items-center gap-3">
            <button
              onClick={logout}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 text-slate-500" />
              Secure Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* Success Banner */}
        {saveSuccess && (
          <div className="mb-6 p-4 rounded-xl bg-teal-50 border border-teal-200 text-teal-900 flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-200 shadow-xs">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-teal-600 shrink-0" />
              <div>
                <h4 className="text-sm font-bold text-teal-950">
                  Record Saved Permanently · S NO #{saveSuccess.serialNumber}
                </h4>
                <p className="text-xs text-teal-800">
                  Patient <strong>{saveSuccess.patientName}</strong> (IP: {saveSuccess.ipNumber}) has been recorded in the central emergency database.
                </p>
              </div>
            </div>
            <button
              onClick={() => setSaveSuccess(null)}
              className="text-xs text-teal-700 hover:text-teal-900 font-semibold px-2 py-1 rounded"
            >
              Dismiss
            </button>
          </div>
        )}

        {formErrors.submit && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-900 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
            <p className="text-xs font-semibold">{formErrors.submit}</p>
          </div>
        )}

        {/* 15-Column Emergency Patient Data Entry Form Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden mb-8">
          <div className="bg-gradient-to-r from-teal-900 via-slate-900 to-slate-900 px-6 py-4 text-white flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-teal-500 text-slate-950">
                  Emergency Intake
                </span>
                <h2 className="text-base font-bold text-white tracking-tight">
                  Patient Data-Entry Form (15 Standard Columns)
                </h2>
              </div>
              <p className="text-xs text-teal-200/80 mt-1">
                Enter emergency admission records directly into the hospital ledger. Serial numbers are generated sequentially.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetForm}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 rounded-lg border border-slate-700 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Form
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6">
            {/* Quick-Pick Common Diagnoses Bar */}
            <div className="mb-6 pb-4 border-b border-slate-100">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Common Emergency Diagnoses (Click to Quick-Fill Category & Medicolegal defaults):
              </label>
              <div className="flex flex-wrap gap-1.5">
                {(config?.commonDiagnoses || ['RTA', 'POISONING', 'ASF', 'CHEST PAIN', 'FEVER', 'ASSAULT', 'CVA', 'GIDDINESS']).map((diag) => (
                  <button
                    key={diag}
                    type="button"
                    onClick={() => handleQuickDiagnosis(diag)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                      formData.diagnosis === diag
                        ? 'bg-teal-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-teal-50 hover:text-teal-800 border border-slate-200'
                    }`}
                  >
                    {diag}
                  </button>
                ))}
              </div>
            </div>

            {/* Structured 15-Column Field Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4 text-xs">
              {/* 1. S NO */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  1. S NO (Sequential Record Number)
                </label>
                <div className="relative">
                  <div className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-500 font-mono flex items-center justify-between">
                    <span>Auto-Generated Sequentially on Save</span>
                    <Hash className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </div>
                <span className="text-[10px] text-slate-500 mt-0.5 block">Managed centrally by database sequence</span>
              </div>

              {/* 2. IP NO */}
              <div>
                <label className="block font-semibold text-slate-900 mb-1">
                  2. IP NO (Inpatient / Hospital Number) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.ipNumber}
                  onChange={(e) => setFormData({ ...formData, ipNumber: e.target.value })}
                  placeholder="e.g. 9985, 10004, or 009982"
                  className={`w-full px-3 py-2 bg-white border rounded-lg text-slate-900 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-teal-500 ${
                    formErrors.ipNumber ? 'border-red-500 bg-red-50/20' : 'border-slate-300'
                  }`}
                  required
                />
                {formErrors.ipNumber && <p className="text-[11px] text-red-600 mt-1">{formErrors.ipNumber}</p>}
                <span className="text-[10px] text-slate-500 mt-0.5 block">Preserves leading zeroes and alphanumeric IDs</span>
              </div>

              {/* 3. NAME */}
              <div>
                <label className="block font-semibold text-slate-900 mb-1">
                  3. NAME (Patient Full Name) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.patientName}
                  onChange={(e) => setFormData({ ...formData, patientName: e.target.value.toUpperCase() })}
                  placeholder="e.g. PERIYASAMY, JEVA, RAMU"
                  className={`w-full px-3 py-2 bg-white border rounded-lg text-slate-900 uppercase font-semibold text-sm focus:outline-none focus:ring-1 focus:ring-teal-500 ${
                    formErrors.patientName ? 'border-red-500 bg-red-50/20' : 'border-slate-300'
                  }`}
                  required
                />
                {formErrors.patientName && <p className="text-[11px] text-red-600 mt-1">{formErrors.patientName}</p>}
              </div>

              {/* 4. AGE */}
              <div>
                <label className="block font-semibold text-slate-900 mb-1">
                  4. AGE (Years) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  max="130"
                  value={formData.age}
                  onChange={(e) => handleAgeChange(e.target.value)}
                  placeholder="e.g. 24, 47, 64"
                  className={`w-full px-3 py-2 bg-white border rounded-lg text-slate-900 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-teal-500 ${
                    formErrors.age ? 'border-red-500 bg-red-50/20' : 'border-slate-300'
                  }`}
                  required
                />
                {formErrors.age && <p className="text-[11px] text-red-600 mt-1">{formErrors.age}</p>}
              </div>

              {/* 5. SEX */}
              <div>
                <label className="block font-semibold text-slate-900 mb-1">
                  5. SEX <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={formData.sex}
                    onChange={(e) => setFormData({ ...formData, sex: e.target.value as any })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-medium text-sm appearance-none focus:outline-none focus:ring-1 focus:ring-teal-500"
                  >
                    <option value="M">M - Male</option>
                    <option value="F">F - Female</option>
                    <option value="Other">Other</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                </div>
              </div>

              {/* 6. ADMISSION DATE & TIME */}
              <div>
                <label className="block font-semibold text-slate-900 mb-1">
                  6. ADMISSION DATE & TIME <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.admissionDatetime}
                  onChange={(e) => setFormData({ ...formData, admissionDatetime: e.target.value })}
                  placeholder="11.08.2026 12.16AM"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
                  required
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">Format: DD.MM.YYYY HH.MM AM/PM</span>
              </div>

              {/* 7. PATIENT RECEIVED TIME */}
              <div>
                <label className="block font-semibold text-slate-900 mb-1">
                  7. PATIENT RECEIVED TIME
                </label>
                <input
                  type="text"
                  value={formData.patientReceivedTime}
                  onChange={(e) => setFormData({ ...formData, patientReceivedTime: e.target.value })}
                  placeholder="12.20AM"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              {/* 8. BROAD SPECIALITY CATEGORY */}
              <div>
                <label className="block font-semibold text-slate-900 mb-1">
                  8. BROAD SPECIALITY CATEGORY
                </label>
                <div className="relative">
                  <select
                    value={formData.specialtyCategory}
                    onChange={(e) => setFormData({ ...formData, specialtyCategory: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-medium text-sm appearance-none focus:outline-none focus:ring-1 focus:ring-teal-500"
                  >
                    {(config?.specialtyCategories || ['SURGERY CASES', 'MEDICINE CASES']).map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                </div>
              </div>

              {/* 9. DIAGNOSIS */}
              <div>
                <label className="block font-semibold text-slate-900 mb-1">
                  9. DIAGNOSIS <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.diagnosis}
                  onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value.toUpperCase() })}
                  placeholder="e.g. RTA, POISONING, CHEST PAIN"
                  className={`w-full px-3 py-2 bg-white border rounded-lg text-slate-900 uppercase font-semibold text-sm focus:outline-none focus:ring-1 focus:ring-teal-500 ${
                    formErrors.diagnosis ? 'border-red-500 bg-red-50/20' : 'border-slate-300'
                  }`}
                  required
                />
                {formErrors.diagnosis && <p className="text-[11px] text-red-600 mt-1">{formErrors.diagnosis}</p>}
              </div>

              {/* 10. AGE INTERVAL */}
              <div>
                <label className="block font-semibold text-slate-900 mb-1">
                  10. AGE INTERVAL
                </label>
                <div className="relative">
                  <select
                    value={formData.ageInterval}
                    onChange={(e) => setFormData({ ...formData, ageInterval: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-medium text-sm appearance-none focus:outline-none focus:ring-1 focus:ring-teal-500"
                  >
                    {(config?.ageIntervals || ['12-60', '>60', '<12']).map((interval) => (
                      <option key={interval} value={interval}>
                        {interval}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                </div>
              </div>

              {/* 11. TAEI PILLAR / TAEI NON PILLAR */}
              <div>
                <label className="block font-semibold text-slate-900 mb-1">
                  11. TAEI PILLAR / TAEI NON PILLAR
                </label>
                <div className="relative">
                  <select
                    value={formData.taeiCategory}
                    onChange={(e) => setFormData({ ...formData, taeiCategory: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-medium text-sm appearance-none focus:outline-none focus:ring-1 focus:ring-teal-500"
                  >
                    {(config?.taeiCategories || ['PILLAR', 'NON PILLAR']).map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                </div>
              </div>

              {/* 12. MEDICOLEGAL CATEGORY */}
              <div>
                <label className="block font-semibold text-slate-900 mb-1">
                  12. MEDICOLEGAL CATEGORY
                </label>
                <div className="relative">
                  <select
                    value={formData.medicolegalCategory}
                    onChange={(e) => setFormData({ ...formData, medicolegalCategory: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-medium text-sm appearance-none focus:outline-none focus:ring-1 focus:ring-teal-500"
                  >
                    {(config?.medicolegalCategories || ['MLC', 'NMLC']).map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                </div>
              </div>

              {/* 13. TRANSFERRED OUT */}
              <div>
                <label className="block font-semibold text-slate-900 mb-1">
                  13. TRANSFERRED OUT (Destination Ward)
                </label>
                <div className="relative">
                  <select
                    value={formData.transferredOut}
                    onChange={(e) => setFormData({ ...formData, transferredOut: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-medium text-sm appearance-none focus:outline-none focus:ring-1 focus:ring-teal-500"
                  >
                    {(config?.transferWards || ['MS', 'MM', 'NS', 'FM', 'SD ICU', 'M ORTHO', 'FS', 'MICU']).map((w) => (
                      <option key={w} value={w}>
                        {w}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                </div>
              </div>

              {/* 14. TRANSFERRED OUT TIME */}
              <div>
                <label className="block font-semibold text-slate-900 mb-1">
                  14. TRANSFERRED OUT TIME
                </label>
                <input
                  type="text"
                  value={formData.transferredOutTime}
                  onChange={(e) => setFormData({ ...formData, transferredOutTime: e.target.value })}
                  placeholder="e.g. 02.15PM or 14:15"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              {/* 15. EMERGENCY RESPONSE TIME */}
              <div>
                <label className="block font-semibold text-slate-900 mb-1">
                  15. EMERGENCY RESPONSE TIME
                </label>
                <input
                  type="text"
                  value={formData.emergencyResponseTime}
                  onChange={(e) => setFormData({ ...formData, emergencyResponseTime: e.target.value })}
                  placeholder="e.g. 5 mins, 10 mins"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>
            </div>

            {/* Form Actions */}
            <div className="mt-8 pt-5 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="w-2 h-2 rounded-full bg-teal-500 inline-block" />
                <span>All entries are securely audited and permanently stored with staff credentials.</span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  Clear Fields
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-600/20 active:scale-[0.99] transition-all disabled:opacity-60 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  {isSubmitting ? 'Saving to Database...' : 'Save Patient Record'}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Shift Records Table - Protected Read-Only View */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-teal-600" />
                My Shift Intake Log (Read-Only)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Displays emergency records submitted by you during your active duty. Protected from direct nurse deletion/editing per hospital policy.
              </p>
            </div>

            <div className="text-xs text-slate-500 font-medium">
              Total Shift Records: <strong className="text-slate-900 tabular-nums font-mono">{recentRecords.length}</strong>
            </div>
          </div>

          {isLoadingRecent ? (
            <div className="p-8 text-center text-xs text-slate-500">Loading duty records...</div>
          ) : recentRecords.length === 0 ? (
            <div className="p-12 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 text-slate-400 mb-3">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-semibold text-slate-800">No Patient Records Logged Yet</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Use the emergency intake form above to register emergency patient admissions. Saved entries will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-teal-50 text-teal-950 font-bold border-b border-teal-100">
                    <th className="py-2.5 px-3">S NO</th>
                    <th className="py-2.5 px-3">IP NO</th>
                    <th className="py-2.5 px-4">PATIENT NAME</th>
                    <th className="py-2.5 px-2 text-center">AGE/SEX</th>
                    <th className="py-2.5 px-3">ADMISSION TIME</th>
                    <th className="py-2.5 px-3">SPECIALTY</th>
                    <th className="py-2.5 px-4">DIAGNOSIS</th>
                    <th className="py-2.5 px-2 text-center">TAEI</th>
                    <th className="py-2.5 px-2 text-center">MLC</th>
                    <th className="py-2.5 px-3 text-center">WARD</th>
                    <th className="py-2.5 px-3 text-right">CORRECTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentRecords.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-700">{r.serialNumber}</td>
                      <td className="py-2.5 px-3 font-mono font-medium text-slate-900">{r.ipNumber}</td>
                      <td className="py-2.5 px-4 font-bold text-slate-900">{r.patientName}</td>
                      <td className="py-2.5 px-2 text-center text-slate-600 font-mono">
                        {r.age} / {r.sex}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">{r.admissionDatetime}</td>
                      <td className="py-2.5 px-3 text-slate-700">{r.specialtyCategory}</td>
                      <td className="py-2.5 px-4 font-semibold text-slate-800">{r.diagnosis}</td>
                      <td className="py-2.5 px-2 text-center">
                        <span className={`text-[10px] font-semibold ${r.taeiCategory === 'PILLAR' ? 'text-teal-700 font-bold' : 'text-slate-500'}`}>
                          {r.taeiCategory}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <span className={`text-[10px] font-semibold ${r.medicolegalCategory === 'MLC' ? 'text-amber-700 font-bold' : 'text-slate-500'}`}>
                          {r.medicolegalCategory}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-semibold text-slate-800">{r.transferredOut || '—'}</td>
                      <td className="py-2.5 px-3 text-right">
                        {r.correctionRequest ? (
                          <span className="text-[10px] text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            Correction Pending
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setCorrectionTargetRecord(r);
                              setCorrectionSuccessMsg(null);
                            }}
                            className="text-[11px] text-teal-700 hover:text-teal-900 font-medium underline underline-offset-2"
                          >
                            Request Correction
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Authorized Correction Request Workflow Modal */}
      {correctionTargetRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full shadow-2xl text-slate-900">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Submit Correction Request</h3>
                <p className="text-xs text-slate-500">
                  Record #{correctionTargetRecord.serialNumber} (IP: {correctionTargetRecord.ipNumber} - {correctionTargetRecord.patientName})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCorrectionTargetRecord(null)}
                className="text-slate-400 hover:text-slate-700 text-lg p-1"
              >
                ✕
              </button>
            </div>

            {correctionSuccessMsg ? (
              <div className="py-4 text-center space-y-3">
                <CheckCircle2 className="w-10 h-10 text-teal-600 mx-auto" />
                <p className="text-xs text-slate-800 font-medium leading-relaxed">{correctionSuccessMsg}</p>
                <button
                  type="button"
                  onClick={() => setCorrectionTargetRecord(null)}
                  className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={submitCorrectionRequest} className="space-y-4 text-xs">
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
                  <p className="font-semibold mb-0.5">Hospital Clinical Policy:</p>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    Submitted records cannot be modified directly by nurses. Please explain the exact data correction required (e.g. correct age, corrected diagnosis, or IP typo). The Doctor/Admin will execute and audit the change.
                  </p>
                </div>

                <div>
                  <label className="block font-semibold text-slate-800 mb-1">
                    Describe Required Correction *
                  </label>
                  <textarea
                    rows={4}
                    value={correctionNote}
                    onChange={(e) => setCorrectionNote(e.target.value)}
                    placeholder="e.g. Patient age was entered as 47, verified from Aadhar card as 54. Please correct."
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-500"
                    required
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setCorrectionTargetRecord(null)}
                    className="px-3.5 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingCorrection}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-bold cursor-pointer disabled:opacity-60"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {isSubmittingCorrection ? 'Sending...' : 'Send Request to Doctor'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
