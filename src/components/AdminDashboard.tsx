import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { PatientRecord, UserProfile, AuditLog, HospitalConfig } from '../types/hospital';
import { generatePatientExcel, triggerDownload } from '../services/excelExport';
import {
  Activity,
  LogOut,
  Users,
  FileSpreadsheet,
  Download,
  ShieldCheck,
  Search,
  Filter,
  CheckSquare,
  Square,
  Edit2,
  Trash2,
  Archive,
  RefreshCw,
  Copy,
  ArrowRightLeft,
  Eye,
  PlusCircle,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  History,
  Settings,
  ChevronDown,
  ChevronUp,
  Database,
  Calendar,
  Sparkles,
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { user, token, logout } = useAuth();

  // Navigation tab: 'overview' | 'records' | 'export' | 'nurses' | 'audit' | 'settings'
  const [activeTab, setActiveTab] = useState<'overview' | 'records' | 'export' | 'nurses' | 'audit' | 'settings'>('overview');

  // Global Config
  const [config, setConfig] = useState<HospitalConfig | null>(null);

  // Overview Stats
  const [overviewStats, setOverviewStats] = useState<any>(null);
  const [isLoadingOverview, setIsLoadingOverview] = useState(false);

  // Patient Records State
  const [records, setRecords] = useState<PatientRecord[]>([]);
  const [totalRecordsCount, setTotalRecordsCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);
  const [selectedRecordIds, setSelectedRecordIds] = useState<string[]>([]);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState('ALL');
  const [diagnosisFilter, setDiagnosisFilter] = useState('ALL');
  const [ageIntervalFilter, setAgeIntervalFilter] = useState('ALL');
  const [mlcFilter, setMlcFilter] = useState('ALL');
  const [wardFilter, setWardFilter] = useState('ALL');
  const [includeArchived, setIncludeArchived] = useState(false);
  const [sortField, setSortField] = useState<keyof PatientRecord>('serialNumber');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Modals
  const [detailRecord, setDetailRecord] = useState<PatientRecord | null>(null);
  const [editRecord, setEditRecord] = useState<PatientRecord | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [archiveModalRecord, setArchiveModalRecord] = useState<PatientRecord | null>(null);
  const [archiveReason, setArchiveReason] = useState('Patient discharged / moved to long-term storage');
  const [permanentDeleteTarget, setPermanentDeleteTarget] = useState<PatientRecord | null>(null);
  const [moveModalRecord, setMoveModalRecord] = useState<PatientRecord | null>(null);
  const [moveTargetWard, setMoveTargetWard] = useState('MM');

  // Nurses Management State
  const [nursesList, setNursesList] = useState<Array<UserProfile & { activeSessionsCount: number; recordsCount: number; isOnline: boolean }>>([]);
  const [isLoadingNurses, setIsLoadingNurses] = useState(false);
  const [nurseSearch, setNurseSearch] = useState('');
  const [showCreateNurseModal, setShowCreateNurseModal] = useState(false);
  const [newNurseData, setNewNurseData] = useState({
    fullName: '',
    email: '',
    username: '',
    password: '',
    staffId: '',
    department: 'Casualty / Emergency Resuscitation',
  });
  const [createNurseError, setCreateNurseError] = useState<string | null>(null);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditActionFilter, setAuditActionFilter] = useState('ALL');
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);

  // Export State
  const [exportScope, setExportScope] = useState<'all' | 'filtered' | 'selected'>('filtered');
  const [exportSplitDate, setExportSplitDate] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccessMessage, setExportSuccessMessage] = useState<string | null>(null);
  const [exportErrorMessage, setExportErrorMessage] = useState<string | null>(null);

  // Fetch config
  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/config');
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
      }
    } catch (e) {
      console.error('Config fetch failed:', e);
    }
  }, []);

  // Fetch overview stats
  const fetchOverview = useCallback(async () => {
    if (!token) return;
    setIsLoadingOverview(true);
    try {
      const res = await fetch('/api/overview', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setOverviewStats(data);
      }
    } catch (e) {
      console.error('Overview fetch failed:', e);
    } finally {
      setIsLoadingOverview(false);
    }
  }, [token]);

  // Fetch patient records
  const fetchRecords = useCallback(async () => {
    if (!token) return;
    setIsLoadingRecords(true);
    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(pageSize),
        sortBy: String(sortField),
        sortOrder,
        includeArchived: String(includeArchived),
      });

      if (searchTerm.trim()) params.append('search', searchTerm.trim());
      if (specialtyFilter !== 'ALL') params.append('specialtyCategory', specialtyFilter);
      if (diagnosisFilter !== 'ALL') params.append('diagnosis', diagnosisFilter);
      if (ageIntervalFilter !== 'ALL') params.append('ageInterval', ageIntervalFilter);
      if (mlcFilter !== 'ALL') params.append('medicolegalCategory', mlcFilter);
      if (wardFilter !== 'ALL') params.append('transferredOut', wardFilter);

      const res = await fetch(`/api/records?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setRecords(data.records);
        setTotalRecordsCount(data.total);
        setTotalPages(data.totalPages);
      }
    } catch (e) {
      console.error('Records fetch failed:', e);
    } finally {
      setIsLoadingRecords(false);
    }
  }, [
    token,
    currentPage,
    pageSize,
    sortField,
    sortOrder,
    includeArchived,
    searchTerm,
    specialtyFilter,
    diagnosisFilter,
    ageIntervalFilter,
    mlcFilter,
    wardFilter,
  ]);

  // Fetch nurses
  const fetchNurses = useCallback(async () => {
    if (!token) return;
    setIsLoadingNurses(true);
    try {
      const res = await fetch('/api/nurses', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setNursesList(data);
      }
    } catch (e) {
      console.error('Nurses fetch failed:', e);
    } finally {
      setIsLoadingNurses(false);
    }
  }, [token]);

  // Fetch audit logs
  const fetchAuditLogs = useCallback(async () => {
    if (!token) return;
    setIsLoadingAudit(true);
    try {
      const url = auditActionFilter === 'ALL' ? '/api/audit-logs?limit=250' : `/api/audit-logs?limit=250&action=${auditActionFilter}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data);
      }
    } catch (e) {
      console.error('Audit logs fetch failed:', e);
    } finally {
      setIsLoadingAudit(false);
    }
  }, [token, auditActionFilter]);

  // Load appropriate data on tab change
  useEffect(() => {
    fetchConfig();
    if (activeTab === 'overview') fetchOverview();
    if (activeTab === 'records') fetchRecords();
    if (activeTab === 'nurses') fetchNurses();
    if (activeTab === 'audit') fetchAuditLogs();
  }, [activeTab, fetchConfig, fetchOverview, fetchRecords, fetchNurses, fetchAuditLogs]);

  // Trigger search with debounce / page reset
  useEffect(() => {
    if (activeTab === 'records') {
      setCurrentPage(1);
    }
  }, [searchTerm, specialtyFilter, diagnosisFilter, ageIntervalFilter, mlcFilter, wardFilter, includeArchived]);

  // Selection handlers
  const handleSelectAllOnPage = () => {
    if (selectedRecordIds.length === records.length && records.length > 0) {
      setSelectedRecordIds([]);
    } else {
      setSelectedRecordIds(records.map((r) => r.id));
    }
  };

  const handleToggleSelectRow = (id: string) => {
    setSelectedRecordIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Sorting handler
  const handleSort = (field: keyof PatientRecord) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Edit record submit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editRecord) return;

    setIsSavingEdit(true);
    try {
      const res = await fetch(`/api/records/${editRecord.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editRecord),
      });

      if (res.ok) {
        setEditRecord(null);
        fetchRecords();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to update record');
      }
    } catch (err: any) {
      alert(err.message || 'Network error');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Archive (Soft delete)
  const handleArchiveRecord = async () => {
    if (!archiveModalRecord) return;
    try {
      const res = await fetch(`/api/records/${archiveModalRecord.id}?reason=${encodeURIComponent(archiveReason)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setArchiveModalRecord(null);
        fetchRecords();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Restore archived
  const handleRestoreRecord = async (id: string) => {
    try {
      const res = await fetch(`/api/records/${id}/restore`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        fetchRecords();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Permanent Delete
  const handlePermanentDelete = async () => {
    if (!permanentDeleteTarget) return;
    try {
      const res = await fetch(`/api/records/${permanentDeleteTarget.id}?permanent=true`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setPermanentDeleteTarget(null);
        fetchRecords();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Duplicate / Copy
  const handleCopyRecord = async (id: string) => {
    try {
      const res = await fetch(`/api/records/${id}/copy`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        fetchRecords();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Move ward
  const handleMoveRecord = async () => {
    if (!moveModalRecord) return;
    try {
      const res = await fetch(`/api/records/${moveModalRecord.id}/move`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ targetWard: moveTargetWard }),
      });
      if (res.ok) {
        setMoveModalRecord(null);
        fetchRecords();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Nurse approval / activation
  const handleNurseStatusChange = async (nurseId: string, status: 'active' | 'deactivated') => {
    try {
      const res = await fetch(`/api/nurses/${nurseId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        fetchNurses();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Revoke nurse session
  const handleRevokeNurseSession = async (nurseId: string) => {
    try {
      const res = await fetch(`/api/nurses/${nurseId}/revoke-session`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        fetchNurses();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Create nurse directly
  const handleCreateNurse = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateNurseError(null);
    try {
      const res = await fetch('/api/nurses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newNurseData),
      });
      const data = await res.json();
      if (!res.ok) {
        setCreateNurseError(data.error || 'Failed to create nurse');
      } else {
        setShowCreateNurseModal(false);
        setNewNurseData({
          fullName: '',
          email: '',
          username: '',
          password: '',
          staffId: '',
          department: 'Casualty / Emergency Resuscitation',
        });
        fetchNurses();
      }
    } catch (err: any) {
      setCreateNurseError(err.message || 'Network error');
    }
  };

  // Perform genuine Excel export using ExcelJS
  const handleExecuteExport = async () => {
    setIsExporting(true);
    setExportSuccessMessage(null);
    setExportErrorMessage(null);

    try {
      let idsToExport: string[] | undefined = undefined;
      let filterPayload: any = undefined;

      if (exportScope === 'selected') {
        if (selectedRecordIds.length === 0) {
          throw new Error('No records currently selected. Please check records or select "All Records".');
        }
        idsToExport = selectedRecordIds;
      } else if (exportScope === 'filtered') {
        filterPayload = {
          search: searchTerm,
          specialtyCategory: specialtyFilter !== 'ALL' ? specialtyFilter : undefined,
          diagnosis: diagnosisFilter !== 'ALL' ? diagnosisFilter : undefined,
          ageInterval: ageIntervalFilter !== 'ALL' ? ageIntervalFilter : undefined,
          medicolegalCategory: mlcFilter !== 'ALL' ? mlcFilter : undefined,
          transferredOut: wardFilter !== 'ALL' ? wardFilter : undefined,
          includeArchived,
        };
      }

      const res = await fetch('/api/export-excel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          recordIds: idsToExport,
          filters: filterPayload,
          splitByDate: exportSplitDate,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Excel generation failed');
      }

      const blob = await res.blob();
      const filename = `Hospital_Patient_Register_${new Date().toISOString().slice(0, 10)}.xlsx`;
      triggerDownload(blob, filename);

      setExportSuccessMessage(`Excel export generated and downloaded successfully (${filename})!`);
    } catch (err: any) {
      setExportErrorMessage(err.message || 'Export failed.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* Top Navigation Bar - Zone 1 (Brand), Zone 2 (Context), Zone 3 (Primary Action) */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Brand Wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-indigo-700 text-white flex items-center justify-center font-bold shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 leading-tight">
                {config?.hospitalName || 'HOSPITAL MANAGEMENT SYSTEM'}
              </h1>
              <p className="text-xs text-indigo-700 font-semibold tracking-wide uppercase">
                Clinical Command Center & Admin Portal
              </p>
            </div>
          </div>

          {/* Zone 2: Navigation Links (Single-Line Whitespace Nowrap) */}
          <nav className="hidden lg:flex items-center gap-1 text-xs font-semibold text-slate-600">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === 'overview' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('records')}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === 'records' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              Patient Records
            </button>
            <button
              onClick={() => setActiveTab('export')}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === 'export' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              Excel Export
            </button>
            <button
              onClick={() => setActiveTab('nurses')}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === 'nurses' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              Nurse Management
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === 'audit' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              Audit Logs
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === 'settings' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              Clinical Config
            </button>
          </nav>

          {/* Zone 3: Primary Action & Profile */}
          <div className="flex items-center gap-3 shrink-0">
            <span className="hidden sm:inline-block text-xs text-slate-500 font-medium">
              Signed in as <strong className="text-slate-900">{user?.fullName?.split(' ')[0]}</strong>
            </span>
            <button
              onClick={logout}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 text-slate-500" />
              Sign Out
            </button>
          </div>
        </div>

        {/* Mobile Navigation Bar */}
        <div className="lg:hidden flex overflow-x-auto px-4 py-2 border-t border-slate-100 gap-1 bg-slate-50/50 text-xs font-medium">
          {(['overview', 'records', 'export', 'nurses', 'audit', 'settings'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1 rounded-md whitespace-nowrap capitalize ${
                activeTab === tab ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-600'
              }`}
            >
              {tab === 'export' ? 'Excel Export' : tab}
            </button>
          ))}
        </div>
      </header>

      {/* Main Viewport */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* ========================================================================= */}
        {/* TAB 1: OVERVIEW */}
        {/* ========================================================================= */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stat Cards Strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Total Patient Records</span>
                <div className="mt-2 text-2xl font-bold text-slate-900 font-mono tabular-nums">
                  {overviewStats?.totalRecords ?? '0'}
                </div>
                <div className="mt-1 text-[11px] text-slate-500 flex items-center gap-1">
                  <span>{overviewStats?.archivedRecords ?? 0} in archive</span>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Registered Nurses</span>
                <div className="mt-2 text-2xl font-bold text-slate-900 font-mono tabular-nums">
                  {overviewStats?.registeredNurses ?? '0'}
                </div>
                <div className="mt-1 text-[11px] text-amber-700 font-semibold">
                  {overviewStats?.pendingApprovalNurses ?? 0} pending approval
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <span className="text-xs font-semibold text-teal-700 uppercase tracking-wider block">Active On Shift Now</span>
                <div className="mt-2 text-2xl font-bold text-teal-700 font-mono tabular-nums flex items-center gap-2">
                  <span>{overviewStats?.currentlyActiveNurses ?? '0'}</span>
                  <span className="w-2.5 h-2.5 rounded-full bg-teal-500 inline-block" />
                </div>
                <div className="mt-1 text-[11px] text-slate-500">
                  Verified by live session heartbeat
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Nurses Active (24h)</span>
                <div className="mt-2 text-2xl font-bold text-indigo-700 font-mono tabular-nums">
                  {overviewStats?.loggedIn24hNurses ?? '0'}
                </div>
                <div className="mt-1 text-[11px] text-slate-500">
                  Shift participation count
                </div>
              </div>
            </div>

            {/* Split row: Nurse entry breakdown & Daily volume breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Nurse Entry Breakdown */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Records Entered By Each Nurse</h3>
                    <p className="text-xs text-slate-500">Breakdown of patient registrations per staff nurse</p>
                  </div>
                  <button
                    onClick={() => setActiveTab('nurses')}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
                  >
                    Manage Nurses →
                  </button>
                </div>

                {overviewStats?.nurseEntryBreakdown?.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    No nurse submissions recorded yet.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {overviewStats?.nurseEntryBreakdown?.map((item: any) => (
                      <div key={item.nurseId} className="py-3 flex items-center justify-between text-xs">
                        <div>
                          <p className="font-semibold text-slate-900">{item.name}</p>
                          <p className="text-[11px] text-slate-500">{item.email}</p>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-bold text-slate-900 text-sm">{item.count}</span>
                          <span className="text-[11px] text-slate-500 block">records</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Date-wise Daily Volume Breakdown */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Daily Admission Volume</h3>
                    <p className="text-xs text-slate-500">Daily intake counts corresponding to spreadsheet worksheets</p>
                  </div>
                  <button
                    onClick={() => setActiveTab('export')}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
                  >
                    Export Daily Sheets →
                  </button>
                </div>

                {overviewStats?.dailyCounts?.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    No date-wise patient logs found.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {overviewStats?.dailyCounts?.map((d: any) => (
                      <div key={d.date} className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-50 border border-slate-100">
                        <span className="font-mono font-medium text-slate-700 flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                          {d.date}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900">{d.count} records</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Recent Submissions Feed */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Recent Emergency Submissions</h3>
                  <p className="text-xs text-slate-500">Live feed of patient admissions entered at nursing stations</p>
                </div>
                <button
                  onClick={() => setActiveTab('records')}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
                >
                  View All in Spreadsheet →
                </button>
              </div>

              {overviewStats?.recentRecords?.length === 0 ? (
                <div className="p-12 text-center text-xs text-slate-400">
                  No records submitted yet. As nurses submit records from the Nurse Station, they will appear here in real time.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                        <th className="py-2.5 px-3">S NO</th>
                        <th className="py-2.5 px-3">IP NO</th>
                        <th className="py-2.5 px-4">PATIENT NAME</th>
                        <th className="py-2.5 px-3">DIAGNOSIS</th>
                        <th className="py-2.5 px-3">ADMISSION TIME</th>
                        <th className="py-2.5 px-3">TAEI</th>
                        <th className="py-2.5 px-3">MLC</th>
                        <th className="py-2.5 px-3">REGISTERED BY</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {overviewStats?.recentRecords?.map((rec: PatientRecord) => (
                        <tr key={rec.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-700">#{rec.serialNumber}</td>
                          <td className="py-2.5 px-3 font-mono font-medium text-slate-900">{rec.ipNumber}</td>
                          <td className="py-2.5 px-4 font-bold text-slate-900">{rec.patientName}</td>
                          <td className="py-2.5 px-3 font-medium text-slate-800">{rec.diagnosis}</td>
                          <td className="py-2.5 px-3 font-mono text-slate-600">{rec.admissionDatetime}</td>
                          <td className="py-2.5 px-3 font-medium">{rec.taeiCategory}</td>
                          <td className="py-2.5 px-3 font-medium">{rec.medicolegalCategory}</td>
                          <td className="py-2.5 px-3 text-slate-600 font-medium">{rec.createdByName}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: PATIENT RECORDS MANAGEMENT (High-Density Spreadsheet View) */}
        {/* ========================================================================= */}
        {activeTab === 'records' && (
          <div className="space-y-4">
            {/* Filter and Action Toolbar */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
              {/* Top row: Search and bulk actions */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="relative flex-1 min-w-[240px]">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by S NO, IP NO, Patient Name, Diagnosis, or Nurse..."
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setExportScope(selectedRecordIds.length > 0 ? 'selected' : 'filtered');
                      setActiveTab('export');
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-600 rounded-xl transition-colors shadow-xs cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Export to Excel (.xlsx)
                  </button>

                  <button
                    onClick={() => fetchRecords()}
                    className="p-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                    title="Refresh register"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Bottom row: Filter Selectors */}
              <div className="flex flex-wrap items-center gap-2 text-xs pt-2 border-t border-slate-100">
                <span className="text-slate-500 font-semibold flex items-center gap-1">
                  <Filter className="w-3 h-3 text-slate-400" /> Filters:
                </span>

                {/* Specialty */}
                <select
                  value={specialtyFilter}
                  onChange={(e) => setSpecialtyFilter(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium"
                >
                  <option value="ALL">All Specialties</option>
                  {(config?.specialtyCategories || ['SURGERY CASES', 'MEDICINE CASES']).map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>

                {/* Age Interval */}
                <select
                  value={ageIntervalFilter}
                  onChange={(e) => setAgeIntervalFilter(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium"
                >
                  <option value="ALL">All Age Intervals</option>
                  {(config?.ageIntervals || ['12-60', '>60', '<12']).map((i) => (
                    <option key={i} value={i}>{i}</option>
                  ))}
                </select>

                {/* MLC */}
                <select
                  value={mlcFilter}
                  onChange={(e) => setMlcFilter(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium"
                >
                  <option value="ALL">All MLC/NMLC</option>
                  <option value="MLC">MLC (Medicolegal)</option>
                  <option value="NMLC">NMLC (Non-Medicolegal)</option>
                </select>

                {/* Ward */}
                <select
                  value={wardFilter}
                  onChange={(e) => setWardFilter(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium"
                >
                  <option value="ALL">All Destination Wards</option>
                  {(config?.transferWards || ['MS', 'MM', 'NS', 'FM', 'SD ICU', 'M ORTHO', 'FS']).map((w) => (
                    <option key={w} value={w}>{w}</option>
                  ))}
                </select>

                {/* Archive toggle */}
                <label className="inline-flex items-center gap-1.5 cursor-pointer ml-auto text-slate-600">
                  <input
                    type="checkbox"
                    checked={includeArchived}
                    onChange={(e) => setIncludeArchived(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Show Archived</span>
                </label>
              </div>
            </div>

            {/* Selected items action banner */}
            {selectedRecordIds.length > 0 && (
              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-xs flex items-center justify-between animate-in fade-in">
                <span className="font-semibold text-indigo-900">
                  {selectedRecordIds.length} record(s) selected
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setExportScope('selected');
                      setActiveTab('export');
                    }}
                    className="px-3 py-1 bg-teal-700 text-white rounded-lg font-semibold hover:bg-teal-600"
                  >
                    Export Selected to Excel
                  </button>
                  <button
                    onClick={() => setSelectedRecordIds([])}
                    className="px-2 py-1 text-slate-600 hover:text-slate-900 font-medium"
                  >
                    Deselect
                  </button>
                </div>
              </div>
            )}

            {/* Spreadsheet Table Container - Exactly 15 columns matching screenshot */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  {/* Distinctive Excel Header matching uploaded screenshot mint/teal */}
                  <thead>
                    <tr className="bg-[#B8D8D8] text-slate-950 font-bold border-b border-slate-400 select-none">
                      <th className="py-2.5 px-2 text-center w-10 border-r border-slate-300">
                        <button onClick={handleSelectAllOnPage} className="cursor-pointer">
                          {selectedRecordIds.length === records.length && records.length > 0 ? (
                            <CheckSquare className="w-4 h-4 text-indigo-900" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-700" />
                          )}
                        </button>
                      </th>
                      <th
                        onClick={() => handleSort('serialNumber')}
                        className="py-2.5 px-3 text-center border-r border-slate-300 cursor-pointer hover:bg-[#a6cccc]"
                      >
                        <div className="flex items-center justify-center gap-1">
                          S NO
                          {sortField === 'serialNumber' && (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                        </div>
                      </th>
                      <th
                        onClick={() => handleSort('ipNumber')}
                        className="py-2.5 px-3 text-center border-r border-slate-300 cursor-pointer hover:bg-[#a6cccc]"
                      >
                        IP NO
                      </th>
                      <th
                        onClick={() => handleSort('patientName')}
                        className="py-2.5 px-4 text-left border-r border-slate-300 cursor-pointer hover:bg-[#a6cccc]"
                      >
                        NAME
                      </th>
                      <th
                        onClick={() => handleSort('age')}
                        className="py-2.5 px-2 text-center border-r border-slate-300 cursor-pointer hover:bg-[#a6cccc]"
                      >
                        AGE
                      </th>
                      <th className="py-2.5 px-2 text-center border-r border-slate-300">SEX</th>
                      <th className="py-2.5 px-3 text-center border-r border-slate-300 whitespace-nowrap">
                        ADMISSION DATE & TIME
                      </th>
                      <th className="py-2.5 px-3 text-center border-r border-slate-300 whitespace-nowrap">
                        PATIENT RECEIVED TIME
                      </th>
                      <th className="py-2.5 px-3 text-center border-r border-slate-300 whitespace-nowrap">
                        BROAD SPECIALITY CATEGORY
                      </th>
                      <th className="py-2.5 px-4 text-left border-r border-slate-300">DIAGNOSIS</th>
                      <th className="py-2.5 px-3 text-center border-r border-slate-300 whitespace-nowrap">AGE INTERVAL</th>
                      <th className="py-2.5 px-3 text-center border-r border-slate-300 whitespace-nowrap">
                        TAEI PILLAR / TAEI NON PILLAR
                      </th>
                      <th className="py-2.5 px-3 text-center border-r border-slate-300 whitespace-nowrap">
                        MEDICOLEGAL CATEGORY
                      </th>
                      <th className="py-2.5 px-3 text-center border-r border-slate-300 whitespace-nowrap">TRANSFERRED OUT</th>
                      <th className="py-2.5 px-3 text-center border-r border-slate-300 whitespace-nowrap">
                        TRANSFERRED OUT TIME
                      </th>
                      <th className="py-2.5 px-3 text-center border-r border-slate-300 whitespace-nowrap">
                        EMERGENCY RESPONSE TIME
                      </th>
                      <th className="py-2.5 px-3 text-center sticky right-0 bg-[#B8D8D8] z-10 shadow-l">
                        ACTIONS
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {isLoadingRecords ? (
                      <tr>
                        <td colSpan={17} className="py-12 text-center text-slate-500">
                          Loading patient records...
                        </td>
                      </tr>
                    ) : records.length === 0 ? (
                      <tr>
                        <td colSpan={17} className="py-16 text-center text-slate-500">
                          <div className="max-w-md mx-auto space-y-2">
                            <FileSpreadsheet className="w-10 h-10 text-slate-300 mx-auto" />
                            <h4 className="font-semibold text-slate-700">No Patient Records Found</h4>
                            <p className="text-xs text-slate-400">
                              {searchTerm
                                ? 'No records match your active search and filter parameters.'
                                : 'The emergency patient register is currently empty. Staff nurses can register new emergency patients through the Nurse Station.'}
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      records.map((r) => {
                        const isSelected = selectedRecordIds.includes(r.id);
                        const isArchived = !!r.archivedAt;

                        return (
                          <tr
                            key={r.id}
                            className={`border-b border-slate-200 transition-colors ${
                              isArchived
                                ? 'bg-slate-100/70 text-slate-400 italic'
                                : isSelected
                                ? 'bg-indigo-50/70'
                                : 'hover:bg-slate-50/90'
                            }`}
                          >
                            <td className="py-2 px-2 text-center border-r border-slate-200">
                              <button
                                type="button"
                                onClick={() => handleToggleSelectRow(r.id)}
                                className="cursor-pointer"
                              >
                                {isSelected ? (
                                  <CheckSquare className="w-4 h-4 text-indigo-600" />
                                ) : (
                                  <Square className="w-4 h-4 text-slate-400 hover:text-slate-600" />
                                )}
                              </button>
                            </td>

                            {/* 1. S NO */}
                            <td className="py-2 px-3 text-center font-mono font-bold text-slate-700 border-r border-slate-200 tabular-nums">
                              {r.serialNumber}
                            </td>

                            {/* 2. IP NO */}
                            <td className="py-2 px-3 text-center font-mono font-semibold text-slate-900 border-r border-slate-200">
                              {r.ipNumber}
                            </td>

                            {/* 3. NAME */}
                            <td className="py-2 px-4 text-left font-bold text-slate-900 border-r border-slate-200 uppercase whitespace-nowrap">
                              {r.patientName}
                            </td>

                            {/* 4. AGE */}
                            <td className="py-2 px-2 text-center font-mono text-slate-800 border-r border-slate-200 tabular-nums">
                              {r.age}
                            </td>

                            {/* 5. SEX */}
                            <td className="py-2 px-2 text-center font-semibold text-slate-700 border-r border-slate-200">
                              {r.sex}
                            </td>

                            {/* 6. ADMISSION DATE & TIME */}
                            <td className="py-2 px-3 text-center font-mono text-slate-600 border-r border-slate-200 whitespace-nowrap">
                              {r.admissionDatetime}
                            </td>

                            {/* 7. PATIENT RECEIVED TIME */}
                            <td className="py-2 px-3 text-center font-mono text-slate-600 border-r border-slate-200 whitespace-nowrap">
                              {r.patientReceivedTime || '—'}
                            </td>

                            {/* 8. BROAD SPECIALITY CATEGORY */}
                            <td className="py-2 px-3 text-center font-medium text-slate-800 border-r border-slate-200 whitespace-nowrap">
                              {r.specialtyCategory}
                            </td>

                            {/* 9. DIAGNOSIS */}
                            <td className="py-2 px-4 text-left font-semibold text-slate-900 border-r border-slate-200 whitespace-nowrap">
                              {r.diagnosis}
                              {r.correctionRequest && (
                                <span className="ml-2 text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                                  Correction Requested
                                </span>
                              )}
                            </td>

                            {/* 10. AGE INTERVAL */}
                            <td className="py-2 px-3 text-center font-mono text-slate-700 border-r border-slate-200">
                              {r.ageInterval || '—'}
                            </td>

                            {/* 11. TAEI */}
                            <td className="py-2 px-3 text-center font-semibold border-r border-slate-200 whitespace-nowrap">
                              <span className={r.taeiCategory === 'PILLAR' ? 'text-teal-700 font-bold' : 'text-slate-600'}>
                                {r.taeiCategory}
                              </span>
                            </td>

                            {/* 12. MLC */}
                            <td className="py-2 px-3 text-center font-semibold border-r border-slate-200 whitespace-nowrap">
                              <span className={r.medicolegalCategory === 'MLC' ? 'text-amber-800 font-bold' : 'text-slate-600'}>
                                {r.medicolegalCategory}
                              </span>
                            </td>

                            {/* 13. TRANSFERRED OUT */}
                            <td className="py-2 px-3 text-center font-mono font-bold text-slate-800 border-r border-slate-200">
                              {r.transferredOut || '—'}
                            </td>

                            {/* 14. TRANSFERRED OUT TIME */}
                            <td className="py-2 px-3 text-center font-mono text-slate-600 border-r border-slate-200 whitespace-nowrap">
                              {r.transferredOutTime || '—'}
                            </td>

                            {/* 15. EMERGENCY RESPONSE TIME */}
                            <td className="py-2 px-3 text-center font-mono text-slate-600 border-r border-slate-200 whitespace-nowrap">
                              {r.emergencyResponseTime || '—'}
                            </td>

                            {/* Action Menu (Sticky Right) */}
                            <td className="py-2 px-3 text-center sticky right-0 bg-white/95 border-l border-slate-200 whitespace-nowrap">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => setDetailRecord(r)}
                                  className="p-1 text-slate-500 hover:text-indigo-600 rounded"
                                  title="View Full Record Details & Audit Info"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setEditRecord({ ...r })}
                                  className="p-1 text-slate-500 hover:text-indigo-600 rounded"
                                  title="Edit Record"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleCopyRecord(r.id)}
                                  className="p-1 text-slate-500 hover:text-teal-600 rounded"
                                  title="Duplicate / Copy Record"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setMoveModalRecord(r);
                                    setMoveTargetWard(r.transferredOut || 'MS');
                                  }}
                                  className="p-1 text-slate-500 hover:text-amber-600 rounded"
                                  title="Transfer / Move Ward"
                                >
                                  <ArrowRightLeft className="w-3.5 h-3.5" />
                                </button>

                                {isArchived ? (
                                  <button
                                    type="button"
                                    onClick={() => handleRestoreRecord(r.id)}
                                    className="p-1 text-teal-600 hover:text-teal-700 rounded"
                                    title="Restore Archived Record"
                                  >
                                    <RefreshCw className="w-3.5 h-3.5" />
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setArchiveModalRecord(r)}
                                    className="p-1 text-slate-500 hover:text-amber-600 rounded"
                                    title="Archive Record (Soft Delete)"
                                  >
                                    <Archive className="w-3.5 h-3.5" />
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => setPermanentDeleteTarget(r)}
                                  className="p-1 text-slate-400 hover:text-red-600 rounded"
                                  title="Permanent Delete"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination bar */}
              <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-4 text-xs">
                <div className="text-slate-600 font-medium">
                  Showing records <strong className="text-slate-900 font-mono">{(currentPage - 1) * pageSize + (records.length > 0 ? 1 : 0)}</strong> to{' '}
                  <strong className="text-slate-900 font-mono">{(currentPage - 1) * pageSize + records.length}</strong> of{' '}
                  <strong className="text-slate-900 font-mono">{totalRecordsCount}</strong> total
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500">Rows per page:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="px-2 py-1 bg-white border border-slate-200 rounded font-medium text-slate-700"
                    >
                      <option value={15}>15</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className="px-3 py-1 bg-white border border-slate-200 rounded hover:bg-slate-100 disabled:opacity-40 font-medium"
                    >
                      Previous
                    </button>
                    <span className="px-2 text-slate-600 font-mono">
                      {currentPage} / {totalPages}
                    </span>
                    <button
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      className="px-3 py-1 bg-white border border-slate-200 rounded hover:bg-slate-100 disabled:opacity-40 font-medium"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: EXCEL EXPORT STUDIO */}
        {/* ========================================================================= */}
        {activeTab === 'export' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
              <div className="flex items-center gap-3 pb-4 border-b border-slate-200 mb-6">
                <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Official Hospital Excel Export (.xlsx)</h3>
                  <p className="text-xs text-slate-500">
                    Generates authentic Microsoft Excel spreadsheet files preserving the exact 15 columns, hospital formatting, and mint green header styling.
                  </p>
                </div>
              </div>

              {exportSuccessMessage && (
                <div className="mb-6 p-4 rounded-xl bg-teal-50 border border-teal-200 text-teal-900 flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-teal-600 shrink-0" />
                  <p className="text-xs font-semibold">{exportSuccessMessage}</p>
                </div>
              )}

              {exportErrorMessage && (
                <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-900 flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
                  <p className="text-xs font-semibold">{exportErrorMessage}</p>
                </div>
              )}

              <div className="space-y-6 text-xs">
                {/* Export Scope Selector */}
                <div>
                  <label className="block font-bold text-slate-900 mb-2 uppercase tracking-wider">
                    1. Select Records to Include:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <label className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      exportScope === 'filtered' ? 'border-teal-600 bg-teal-50/50 text-teal-950 font-bold' : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                    }`}>
                      <input
                        type="radio"
                        name="exportScope"
                        value="filtered"
                        checked={exportScope === 'filtered'}
                        onChange={() => setExportScope('filtered')}
                        className="sr-only"
                      />
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm">Current Filtered Set</span>
                      </div>
                      <p className="text-[11px] font-normal text-slate-500">
                        Exports records matching your active search and specialty filters.
                      </p>
                    </label>

                    <label className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      exportScope === 'selected' ? 'border-teal-600 bg-teal-50/50 text-teal-950 font-bold' : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                    }`}>
                      <input
                        type="radio"
                        name="exportScope"
                        value="selected"
                        checked={exportScope === 'selected'}
                        onChange={() => setExportScope('selected')}
                        className="sr-only"
                      />
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm">Selected Rows Only</span>
                        <span className="text-xs font-mono font-bold text-teal-700">({selectedRecordIds.length})</span>
                      </div>
                      <p className="text-[11px] font-normal text-slate-500">
                        Exports only the {selectedRecordIds.length} row(s) checked in the records table.
                      </p>
                    </label>

                    <label className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      exportScope === 'all' ? 'border-teal-600 bg-teal-50/50 text-teal-950 font-bold' : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                    }`}>
                      <input
                        type="radio"
                        name="exportScope"
                        value="all"
                        checked={exportScope === 'all'}
                        onChange={() => setExportScope('all')}
                        className="sr-only"
                      />
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm">All Active Records</span>
                      </div>
                      <p className="text-[11px] font-normal text-slate-500">
                        Exports the entire emergency admission register.
                      </p>
                    </label>
                  </div>
                </div>

                {/* Date Split Toggle (Daily Worksheets AUG 11, AUG 12...) */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900">Split into Daily Worksheets (AUG 11, AUG 12...)</h4>
                      <p className="text-slate-500 mt-0.5">
                        Matches the multi-tab layout shown in the original Excel screenshot. Groups records by admission date into separate tabbed sheets within a single workbook.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={exportSplitDate}
                        onChange={(e) => setExportSplitDate(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                    </label>
                  </div>
                </div>

                {/* Column Fidelity Guarantee */}
                <div className="p-4 rounded-xl bg-teal-50/60 border border-teal-200 text-teal-950">
                  <h4 className="font-bold mb-1 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-teal-700" />
                    Spreadsheet Structure Compliance Guarantee:
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-teal-900 text-[11px]">
                    <li>Exact 15 columns matching hospital emergency register structure.</li>
                    <li>IP NO column stored as text format to prevent scientific exponential notation (e.g. 1E+07) and preserve leading zeros.</li>
                    <li>Original hospital mint/teal header background (<code className="font-mono text-teal-800">#C2E2D6</code>) with borders and readable column widths.</li>
                    <li>Built directly from authorized database records using ExcelJS.</li>
                  </ul>
                </div>

                {/* Download Button */}
                <div className="pt-2">
                  <button
                    onClick={handleExecuteExport}
                    disabled={isExporting}
                    className="w-full flex items-center justify-center gap-2 py-3 px-6 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-sm font-bold shadow-md shadow-teal-600/20 active:scale-[0.99] transition-all disabled:opacity-60 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    {isExporting ? 'Generating Genuine Excel File...' : 'Download Official Excel Spreadsheet (.xlsx)'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: NURSE MANAGEMENT */}
        {/* ========================================================================= */}
        {activeTab === 'nurses' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Registered Staff Nurses</h3>
                <p className="text-xs text-slate-500">Monitor active duty nurses, approve registration requests, and govern station access</p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowCreateNurseModal(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-colors cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  Create Nurse Account
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                      <th className="py-2.5 px-4">NURSE NAME</th>
                      <th className="py-2.5 px-4">EMAIL & USERNAME</th>
                      <th className="py-2.5 px-3">STAFF ID</th>
                      <th className="py-2.5 px-3">STATUS</th>
                      <th className="py-2.5 px-3 text-center">DUTY PRESENCE</th>
                      <th className="py-2.5 px-3 text-center">ENTRIES COUNT</th>
                      <th className="py-2.5 px-3">LAST LOGIN</th>
                      <th className="py-2.5 px-4 text-right">ACCESS GOVERNANCE</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {isLoadingNurses ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-500">Loading nurses list...</td>
                      </tr>
                    ) : nursesList.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-400">No nurse accounts registered.</td>
                      </tr>
                    ) : (
                      nursesList.map((nurse) => (
                        <tr key={nurse.id} className="hover:bg-slate-50">
                          <td className="py-3 px-4 font-bold text-slate-900">
                            {nurse.fullName}
                            <span className="block text-[11px] font-normal text-slate-500">{nurse.department}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-mono text-slate-800">{nurse.email}</span>
                            <span className="block text-[11px] text-slate-500">@{nurse.username}</span>
                          </td>
                          <td className="py-3 px-3 font-mono text-slate-700">{nurse.staffId || '—'}</td>
                          <td className="py-3 px-3">
                            {nurse.accountStatus === 'active' && (
                              <span className="text-[11px] font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                                Active
                              </span>
                            )}
                            {nurse.accountStatus === 'pending_approval' && (
                              <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 animate-pulse">
                                Pending Approval
                              </span>
                            )}
                            {nurse.accountStatus === 'deactivated' && (
                              <span className="text-[11px] font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                                Deactivated
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center">
                            {nurse.isOnline ? (
                              <span className="inline-flex items-center gap-1.5 text-xs text-teal-700 font-bold">
                                <span className="w-2 h-2 rounded-full bg-teal-500" />
                                Online
                              </span>
                            ) : (
                              <span className="text-slate-400 text-xs">Offline</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center font-mono font-bold text-slate-800 tabular-nums">
                            {nurse.recordsCount}
                          </td>
                          <td className="py-3 px-3 font-mono text-slate-600">
                            {nurse.lastLoginAt ? new Date(nurse.lastLoginAt).toLocaleString() : 'Never'}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              {nurse.accountStatus === 'pending_approval' && (
                                <button
                                  type="button"
                                  onClick={() => handleNurseStatusChange(nurse.id, 'active')}
                                  className="px-2.5 py-1 bg-teal-600 hover:bg-teal-500 text-white rounded text-[11px] font-semibold cursor-pointer"
                                >
                                  Approve Access
                                </button>
                              )}

                              {nurse.accountStatus === 'active' && (
                                <button
                                  type="button"
                                  onClick={() => handleNurseStatusChange(nurse.id, 'deactivated')}
                                  className="px-2.5 py-1 bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-700 rounded text-[11px] font-semibold border border-slate-200 cursor-pointer"
                                >
                                  Deactivate
                                </button>
                              )}

                              {nurse.accountStatus === 'deactivated' && (
                                <button
                                  type="button"
                                  onClick={() => handleNurseStatusChange(nurse.id, 'active')}
                                  className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded text-[11px] font-semibold border border-indigo-200 cursor-pointer"
                                >
                                  Re-Activate
                                </button>
                              )}

                              {nurse.isOnline && (
                                <button
                                  type="button"
                                  onClick={() => handleRevokeNurseSession(nurse.id)}
                                  className="px-2 py-1 bg-red-100 hover:bg-red-200 text-red-800 rounded text-[11px] font-semibold cursor-pointer"
                                  title="Force logout active session"
                                >
                                  Revoke Session
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: AUDIT LOGS */}
        {/* ========================================================================= */}
        {activeTab === 'audit' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Hospital Security Audit Trail</h3>
                <p className="text-xs text-slate-500">Immutable chronological record of logins, data entries, edits, deletions, and exports</p>
              </div>

              <div className="flex items-center gap-3">
                <select
                  value={auditActionFilter}
                  onChange={(e) => setAuditActionFilter(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
                >
                  <option value="ALL">All Recorded Actions</option>
                  <option value="LOGIN">LOGIN</option>
                  <option value="LOGOUT">LOGOUT</option>
                  <option value="LOGIN_FAILED">LOGIN_FAILED</option>
                  <option value="RECORD_CREATED">RECORD_CREATED</option>
                  <option value="RECORD_UPDATED">RECORD_UPDATED</option>
                  <option value="RECORD_ARCHIVED">RECORD_ARCHIVED</option>
                  <option value="RECORD_RESTORED">RECORD_RESTORED</option>
                  <option value="RECORD_PERMANENTLY_DELETED">RECORD_PERMANENTLY_DELETED</option>
                  <option value="EXCEL_EXPORTED">EXCEL_EXPORTED</option>
                  <option value="NURSE_APPROVED">NURSE_APPROVED</option>
                  <option value="NURSE_DEACTIVATED">NURSE_DEACTIVATED</option>
                </select>

                <button
                  onClick={() => fetchAuditLogs()}
                  className="p-2 text-slate-600 hover:text-slate-900 bg-slate-100 rounded-xl"
                  title="Refresh logs"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                      <th className="py-2.5 px-4">TIMESTAMP</th>
                      <th className="py-2.5 px-3">ACTOR</th>
                      <th className="py-2.5 px-3">ROLE</th>
                      <th className="py-2.5 px-3">ACTION</th>
                      <th className="py-2.5 px-6">CHANGE SUMMARY</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {isLoadingAudit ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-500">Loading audit trail...</td>
                      </tr>
                    ) : auditLogs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-slate-400">No audit events found.</td>
                      </tr>
                    ) : (
                      auditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-4 font-mono text-slate-600 whitespace-nowrap">
                            {new Date(log.timestamp).toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-900 whitespace-nowrap">
                            {log.actorName}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded ${
                              log.actorRole === 'doctor_admin' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'bg-slate-100 text-slate-700'
                            }`}>
                              {log.actorRole}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap font-mono font-bold text-[11px] text-slate-800">
                            {log.action}
                          </td>
                          <td className="py-2.5 px-6 text-slate-700 font-medium">
                            {log.changeSummary}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 6: CLINICAL CONFIG & SUPABASE INTEGRATION */}
        {/* ========================================================================= */}
        {activeTab === 'settings' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
              <div>
                <h3 className="text-base font-bold text-slate-900">Hospital Dropdown & Category Configuration</h3>
                <p className="text-xs text-slate-500">Manage approved values used by nurses in the emergency data entry portal</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <h4 className="font-bold text-slate-900 mb-2">Broad Speciality Categories</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {(config?.specialtyCategories || ['SURGERY CASES', 'MEDICINE CASES']).map((s) => (
                      <span key={s} className="px-2.5 py-1 bg-white border border-slate-300 rounded font-semibold text-slate-800">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <h4 className="font-bold text-slate-900 mb-2">TAEI Categories</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {(config?.taeiCategories || ['PILLAR', 'NON PILLAR']).map((t) => (
                      <span key={t} className="px-2.5 py-1 bg-white border border-slate-300 rounded font-semibold text-slate-800">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <h4 className="font-bold text-slate-900 mb-2">Medicolegal Categories</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {(config?.medicolegalCategories || ['MLC', 'NMLC']).map((m) => (
                      <span key={m} className="px-2.5 py-1 bg-white border border-slate-300 rounded font-semibold text-slate-800">
                        {m}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <h4 className="font-bold text-slate-900 mb-2">Transfer Destination Wards</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {(config?.transferWards || ['MS', 'MM', 'NS', 'FM', 'SD ICU', 'M ORTHO', 'FS']).map((w) => (
                      <span key={w} className="px-2.5 py-1 bg-white border border-slate-300 rounded font-semibold text-slate-800">
                        {w}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Supabase Production Migration Information */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">Supabase & Vercel Deployment Instructions</h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                The schema and Row Level Security policies are prepared in <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-indigo-700">supabase/schema.sql</code>.
                When deploying to Vercel with a Supabase project:
              </p>
              <ol className="list-decimal list-inside space-y-2 text-xs text-slate-700">
                <li>Create a project in Supabase and paste the contents of <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-slate-900">supabase/schema.sql</code> into the Supabase SQL Editor.</li>
                <li>Add <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-slate-900">SUPABASE_URL</code> and <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-slate-900">SUPABASE_SERVICE_ROLE_KEY</code> into your Vercel Project Environment Variables.</li>
                <li>The first Doctor/Admin user is created using the initial credentials defined in <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-slate-900">.env.example</code>.</li>
              </ol>
            </div>
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* RECORD DETAIL MODAL */}
      {/* ========================================================================= */}
      {detailRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-2xl w-full p-6 shadow-2xl text-slate-900 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <div>
                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Emergency Record Detail</span>
                <h3 className="text-base font-bold text-slate-900">
                  S NO #{detailRecord.serialNumber} · IP {detailRecord.ipNumber} ({detailRecord.patientName})
                </h3>
              </div>
              <button onClick={() => setDetailRecord(null)} className="text-slate-400 hover:text-slate-700 text-lg">✕</button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs mb-6">
              <div>
                <span className="text-slate-500 block">Age / Sex</span>
                <strong className="text-slate-900 font-mono">{detailRecord.age} YRS / {detailRecord.sex}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Admission Time</span>
                <strong className="text-slate-900 font-mono">{detailRecord.admissionDatetime}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Received Time</span>
                <strong className="text-slate-900 font-mono">{detailRecord.patientReceivedTime || '—'}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Specialty</span>
                <strong className="text-slate-900">{detailRecord.specialtyCategory}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Diagnosis</span>
                <strong className="text-slate-900">{detailRecord.diagnosis}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Age Interval</span>
                <strong className="text-slate-900 font-mono">{detailRecord.ageInterval || '—'}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">TAEI Category</span>
                <strong className="text-slate-900">{detailRecord.taeiCategory}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Medicolegal</span>
                <strong className="text-slate-900">{detailRecord.medicolegalCategory}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Transferred Out</span>
                <strong className="text-slate-900 font-mono">{detailRecord.transferredOut || '—'}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Transfer Time</span>
                <strong className="text-slate-900 font-mono">{detailRecord.transferredOutTime || '—'}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Emergency Response</span>
                <strong className="text-slate-900 font-mono">{detailRecord.emergencyResponseTime || '—'}</strong>
              </div>
            </div>

            {/* Audit Metadata */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1 text-slate-600">
              <p>Registered by: <strong className="text-slate-900">{detailRecord.createdByName}</strong> on {new Date(detailRecord.createdAt).toLocaleString()}</p>
              {detailRecord.updatedByName && (
                <p>Last modified by: <strong className="text-slate-900">{detailRecord.updatedByName}</strong> on {detailRecord.updatedAt ? new Date(detailRecord.updatedAt).toLocaleString() : ''}</p>
              )}
              {detailRecord.archivedAt && (
                <p className="text-amber-800">Archived on {new Date(detailRecord.archivedAt).toLocaleString()}. Reason: {detailRecord.archiveReason}</p>
              )}
              {detailRecord.correctionRequest && (
                <div className="mt-2 p-2 bg-amber-50 rounded border border-amber-200 text-amber-900">
                  <strong>Pending Nurse Correction Note:</strong> {detailRecord.correctionRequest.note} (by {detailRecord.correctionRequest.nurseName})
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setDetailRecord(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* EDIT RECORD MODAL */}
      {/* ========================================================================= */}
      {editRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-2xl w-full p-6 shadow-2xl text-slate-900 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Edit Patient Record #{editRecord.serialNumber} (IP: {editRecord.ipNumber})
                </h3>
                <p className="text-xs text-slate-500">Administrative changes are logged permanently in the audit trail</p>
              </div>
              <button onClick={() => setEditRecord(null)} className="text-slate-400 hover:text-slate-700 text-lg">✕</button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">IP Number *</label>
                  <input
                    type="text"
                    value={editRecord.ipNumber}
                    onChange={(e) => setEditRecord({ ...editRecord, ipNumber: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg font-mono text-slate-900"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Patient Name *</label>
                  <input
                    type="text"
                    value={editRecord.patientName}
                    onChange={(e) => setEditRecord({ ...editRecord, patientName: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border rounded-lg uppercase font-semibold text-slate-900"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Age *</label>
                  <input
                    type="number"
                    min="0"
                    max="130"
                    value={editRecord.age}
                    onChange={(e) => setEditRecord({ ...editRecord, age: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg font-mono text-slate-900"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Sex</label>
                  <select
                    value={editRecord.sex}
                    onChange={(e) => setEditRecord({ ...editRecord, sex: e.target.value as any })}
                    className="w-full px-3 py-2 border rounded-lg text-slate-900"
                  >
                    <option value="M">M - Male</option>
                    <option value="F">F - Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Diagnosis *</label>
                  <input
                    type="text"
                    value={editRecord.diagnosis}
                    onChange={(e) => setEditRecord({ ...editRecord, diagnosis: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border rounded-lg uppercase font-semibold text-slate-900"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Specialty</label>
                  <select
                    value={editRecord.specialtyCategory}
                    onChange={(e) => setEditRecord({ ...editRecord, specialtyCategory: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-slate-900"
                  >
                    {(config?.specialtyCategories || ['SURGERY CASES', 'MEDICINE CASES']).map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">TAEI Category</label>
                  <select
                    value={editRecord.taeiCategory}
                    onChange={(e) => setEditRecord({ ...editRecord, taeiCategory: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-slate-900"
                  >
                    {(config?.taeiCategories || ['PILLAR', 'NON PILLAR']).map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Medicolegal Category</label>
                  <select
                    value={editRecord.medicolegalCategory}
                    onChange={(e) => setEditRecord({ ...editRecord, medicolegalCategory: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-slate-900"
                  >
                    {(config?.medicolegalCategories || ['MLC', 'NMLC']).map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Transferred Out Ward</label>
                  <select
                    value={editRecord.transferredOut}
                    onChange={(e) => setEditRecord({ ...editRecord, transferredOut: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-slate-900"
                  >
                    {(config?.transferWards || ['MS', 'MM', 'NS', 'FM', 'SD ICU', 'M ORTHO', 'FS']).map((w) => (
                      <option key={w} value={w}>{w}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Transferred Out Time</label>
                  <input
                    type="text"
                    value={editRecord.transferredOutTime}
                    onChange={(e) => setEditRecord({ ...editRecord, transferredOutTime: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg font-mono text-slate-900"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditRecord(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold cursor-pointer"
                >
                  {isSavingEdit ? 'Saving Changes...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ARCHIVE CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      {archiveModalRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-2xl text-slate-900">
            <div className="flex items-center gap-2 mb-3 text-amber-700">
              <Archive className="w-5 h-5" />
              <h3 className="text-sm font-bold text-slate-900">Archive Patient Record (Soft Delete)</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Are you sure you want to move Record #{archiveModalRecord.serialNumber} (IP: {archiveModalRecord.ipNumber} - {archiveModalRecord.patientName}) to the archive? Archived records are hidden from standard nursing views but can be restored by administrators.
            </p>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Reason for Archival:</label>
              <input
                type="text"
                value={archiveReason}
                onChange={(e) => setArchiveReason(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg text-slate-900"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setArchiveModalRecord(null)}
                className="px-3.5 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleArchiveRecord}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Archive Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PERMANENT DELETE WARNING MODAL */}
      {/* ========================================================================= */}
      {permanentDeleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-red-200 max-w-md w-full p-6 shadow-2xl text-slate-900">
            <div className="flex items-center gap-2 mb-3 text-red-600">
              <Trash2 className="w-5 h-5" />
              <h3 className="text-sm font-bold text-red-950">Permanent Deletion Confirmation</h3>
            </div>
            <p className="text-xs text-red-900 leading-relaxed mb-4">
              WARNING: This action permanently removes Record #{permanentDeleteTarget.serialNumber} (IP {permanentDeleteTarget.ipNumber} - {permanentDeleteTarget.patientName}) from the PostgreSQL database. This cannot be undone and will be permanently recorded in the administrator audit log.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPermanentDeleteTarget(null)}
                className="px-3.5 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePermanentDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Permanently Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MOVE RECORD WARD MODAL */}
      {/* ========================================================================= */}
      {moveModalRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-2xl text-slate-900">
            <div className="flex items-center gap-2 mb-3 text-slate-800">
              <ArrowRightLeft className="w-5 h-5 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900">Transfer Patient to Destination Ward</h3>
            </div>
            <p className="text-xs text-slate-600 mb-4">
              Transfer Record #{moveModalRecord.serialNumber} (IP: {moveModalRecord.ipNumber} - {moveModalRecord.patientName}) to a new ward.
            </p>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Select Destination Ward:</label>
              <select
                value={moveTargetWard}
                onChange={(e) => setMoveTargetWard(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg text-slate-900 font-medium"
              >
                {(config?.transferWards || ['MS', 'MM', 'NS', 'FM', 'SD ICU', 'M ORTHO', 'FS']).map((w) => (
                  <option key={w} value={w}>{w}</option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setMoveModalRecord(null)}
                className="px-3.5 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleMoveRecord}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Transfer Patient
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CREATE NURSE MODAL */}
      {/* ========================================================================= */}
      {showCreateNurseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-2xl text-slate-900">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Create Staff Nurse Account</h3>
                <p className="text-xs text-slate-500">Account created directly by Doctor/Admin is active immediately</p>
              </div>
              <button onClick={() => setShowCreateNurseModal(false)} className="text-slate-400 hover:text-slate-700 text-lg">✕</button>
            </div>

            <form onSubmit={handleCreateNurse} className="space-y-3 text-xs">
              {createNurseError && (
                <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-900">{createNurseError}</div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Legal Name *</label>
                <input
                  type="text"
                  value={newNurseData.fullName}
                  onChange={(e) => setNewNurseData({ ...newNurseData, fullName: e.target.value })}
                  placeholder="Staff Nurse Deepa K."
                  className="w-full px-3 py-2 border rounded-lg text-slate-900"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email *</label>
                  <input
                    type="email"
                    value={newNurseData.email}
                    onChange={(e) => setNewNurseData({ ...newNurseData, email: e.target.value })}
                    placeholder="deepa@hospital.org"
                    className="w-full px-3 py-2 border rounded-lg text-slate-900"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Username *</label>
                  <input
                    type="text"
                    value={newNurseData.username}
                    onChange={(e) => setNewNurseData({ ...newNurseData, username: e.target.value })}
                    placeholder="nurse_deepa"
                    className="w-full px-3 py-2 border rounded-lg text-slate-900"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Staff ID</label>
                  <input
                    type="text"
                    value={newNurseData.staffId}
                    onChange={(e) => setNewNurseData({ ...newNurseData, staffId: e.target.value })}
                    placeholder="NUR-4520"
                    className="w-full px-3 py-2 border rounded-lg text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Department</label>
                  <input
                    type="text"
                    value={newNurseData.department}
                    onChange={(e) => setNewNurseData({ ...newNurseData, department: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Temporary Password *</label>
                <input
                  type="password"
                  value={newNurseData.password}
                  onChange={(e) => setNewNurseData({ ...newNurseData, password: e.target.value })}
                  placeholder="Minimum 8 characters"
                  className="w-full px-3 py-2 border rounded-lg text-slate-900"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowCreateNurseModal(false)}
                  className="px-3.5 py-2 bg-slate-100 text-slate-700 rounded-xl font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold cursor-pointer"
                >
                  Create & Activate Nurse
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
