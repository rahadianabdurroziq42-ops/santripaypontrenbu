import React, { useState } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  CreditCard, 
  Receipt, 
  HandCoins, 
  PlusCircle, 
  X, 
  Printer, 
  CheckCircle,
  CheckCircle2,
  Lock,
  Unlock,
  AlertTriangle,
  QrCode,
  Edit3,
  Trash2,
  ShieldAlert,
  RotateCcw,
  UserCheck,
  UserX,
  Phone,
  Home,
  GraduationCap,
  Sparkles
} from 'lucide-react';
import { Santri, Transaction, PesantrenProfile } from '../types/finance';
import { 
  formatRupiah, 
  checkDailyAllowanceEligibility, 
  getTodayDateString 
} from '../utils/accounting';
import { PrintControlBar } from './PrintControlBar';

interface SantriManagementViewProps {
  santriList: Santri[];
  transactions: Transaction[];
  pesantrenProfile: PesantrenProfile;
  onAddSantri: (newSantri: Omit<Santri, 'id' | 'accountNumber' | 'createdAt'>, initialDeposit: number) => void;
  onUpdateSantri: (updatedSantri: Santri) => void;
  onDeleteSantri: (santriId: string) => void;
  onToggleFreezeSantri: (santriId: string, freeze: boolean) => void;
  onOpenTellerForSantri: (santriId: string) => void;
  onOpenDepositForSantri: (santriId: string) => void;
  onViewStatementForSantri: (santriId: string) => void;
}

export const SantriManagementView: React.FC<SantriManagementViewProps> = ({
  santriList,
  transactions,
  pesantrenProfile,
  onAddSantri,
  onUpdateSantri,
  onDeleteSantri,
  onToggleFreezeSantri,
  onOpenTellerForSantri,
  onOpenDepositForSantri,
  onViewStatementForSantri,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDormitory, setSelectedDormitory] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'AKTIF' | 'DIBEKUKAN' | 'CUTI_ALUMNI'>('ALL');
  
  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingSantri, setEditingSantri] = useState<Santri | null>(null);
  const [freezingSantri, setFreezingSantri] = useState<Santri | null>(null);
  const [unfreezingSantri, setUnfreezingSantri] = useState<Santri | null>(null);
  const [deletingSantri, setDeletingSantri] = useState<Santri | null>(null);
  const [selectedCardSantri, setSelectedCardSantri] = useState<Santri | null>(null);
  
  // Toast notification state
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'warning' | 'info'; text: string } | null>(null);

  const showToast = (text: string, type: 'success' | 'warning' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Form state for adding new Santri
  const [formData, setFormData] = useState({
    name: '',
    nisn: '',
    gender: 'L' as 'L' | 'P',
    dormitory: 'Asrama Al-Fatih - Kamar 01',
    className: 'Kelas 1 Aliyah (SMA)',
    guardianName: '',
    guardianPhone: '',
    guardianAddress: '',
    initialDeposit: 200000,
  });

  // Edit form state
  const [editFormData, setEditFormData] = useState<{
    name: string;
    nisn: string;
    gender: 'L' | 'P';
    dormitory: string;
    className: string;
    guardianName: string;
    guardianPhone: string;
    guardianAddress: string;
    dailyAllowanceLimit: number;
    status: 'AKTIF' | 'DIBEKUKAN' | 'CUTI' | 'ALUMNI' | 'NONAKTIF';
  }>({
    name: '',
    nisn: '',
    gender: 'L',
    dormitory: '',
    className: '',
    guardianName: '',
    guardianPhone: '',
    guardianAddress: '',
    dailyAllowanceLimit: 10000,
    status: 'AKTIF',
  });

  const todayStr = getTodayDateString();

  // Metrics
  const totalSantriCount = santriList.length;
  const aktifCount = santriList.filter((s) => s.status === 'AKTIF').length;
  const dibekukanCount = santriList.filter((s) => s.status === 'DIBEKUKAN' || s.status === 'NONAKTIF').length;
  const alumniCutiCount = santriList.filter((s) => s.status === 'ALUMNI' || s.status === 'CUTI').length;
  const totalWadiahBalance = santriList.reduce((acc, curr) => acc + curr.balance, 0);

  // Dormitories list
  const dormitories = Array.from(new Set(santriList.map((s) => s.dormitory.split(' - ')[0])));

  // Filtered Santri List
  const filteredSantri = santriList.filter((s) => {
    const q = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !q ||
      s.name.toLowerCase().includes(q) ||
      s.nisn.toLowerCase().includes(q) ||
      s.accountNumber.toLowerCase().includes(q) ||
      s.guardianName.toLowerCase().includes(q) ||
      s.dormitory.toLowerCase().includes(q) ||
      s.className.toLowerCase().includes(q);

    const matchesDorm = selectedDormitory === 'ALL' || s.dormitory.startsWith(selectedDormitory);

    let matchesStatus = true;
    if (statusFilter === 'AKTIF') matchesStatus = s.status === 'AKTIF';
    else if (statusFilter === 'DIBEKUKAN') matchesStatus = s.status === 'DIBEKUKAN' || s.status === 'NONAKTIF';
    else if (statusFilter === 'CUTI_ALUMNI') matchesStatus = s.status === 'CUTI' || s.status === 'ALUMNI';

    return matchesSearch && matchesDorm && matchesStatus;
  });

  // Open Edit Modal
  const handleOpenEdit = (santri: Santri) => {
    setEditingSantri(santri);
    setEditFormData({
      name: santri.name,
      nisn: santri.nisn,
      gender: santri.gender,
      dormitory: santri.dormitory,
      className: santri.className,
      guardianName: santri.guardianName,
      guardianPhone: santri.guardianPhone || '',
      guardianAddress: santri.guardianAddress || '',
      dailyAllowanceLimit: santri.dailyAllowanceLimit || 10000,
      status: santri.status,
    });
  };

  // Submit Edit Santri
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSantri) return;

    const updated: Santri = {
      ...editingSantri,
      name: editFormData.name.trim(),
      nisn: editFormData.nisn.trim(),
      gender: editFormData.gender,
      dormitory: editFormData.dormitory.trim(),
      className: editFormData.className.trim(),
      guardianName: editFormData.guardianName.trim(),
      guardianPhone: editFormData.guardianPhone.trim(),
      guardianAddress: editFormData.guardianAddress.trim(),
      dailyAllowanceLimit: Number(editFormData.dailyAllowanceLimit) || 10000,
      status: editFormData.status,
    };

    onUpdateSantri(updated);
    setEditingSantri(null);
    showToast(`Data santri "${updated.name}" berhasil diperbarui!`, 'success');
  };

  // Confirm Freeze (Bekukan Rekening)
  const handleConfirmFreeze = () => {
    if (!freezingSantri) return;
    onToggleFreezeSantri(freezingSantri.id, true);
    showToast(`Rekening santri ${freezingSantri.name} (${freezingSantri.accountNumber}) telah dibekukan. Saldo tetap aman tersimpan.`, 'warning');
    setFreezingSantri(null);
  };

  // Confirm Unfreeze (Aktifkan Kembali Rekening)
  const handleConfirmUnfreeze = () => {
    if (!unfreezingSantri) return;
    onToggleFreezeSantri(unfreezingSantri.id, false);
    showToast(`Rekening santri ${unfreezingSantri.name} (${unfreezingSantri.accountNumber}) berhasil diaktifkan kembali! Santri siap bertransaksi.`, 'success');
    setUnfreezingSantri(null);
  };

  // Confirm Delete
  const handleConfirmDelete = () => {
    if (!deletingSantri) return;
    onDeleteSantri(deletingSantri.id);
    showToast(`Data santri ${deletingSantri.name} telah berhasil dihapus.`, 'info');
    setDeletingSantri(null);
  };

  // Submit Create New Santri
  const handleCreateSantriSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.nisn || !formData.guardianName) return;

    onAddSantri(
      {
        name: formData.name,
        nisn: formData.nisn,
        gender: formData.gender,
        dormitory: formData.dormitory,
        className: formData.className,
        guardianName: formData.guardianName,
        guardianPhone: formData.guardianPhone || '0812-0000-0000',
        guardianAddress: formData.guardianAddress || 'Alamat Wali Santri',
        balance: 0,
        dailyAllowanceLimit: 10000,
        status: 'AKTIF',
        avatarSeed: formData.name.split(' ')[0],
      },
      formData.initialDeposit
    );

    setIsAddModalOpen(false);
    showToast(`Santri baru "${formData.name}" berhasil didaftarkan!`, 'success');
    // Reset form
    setFormData({
      name: '',
      nisn: '',
      gender: 'L',
      dormitory: 'Asrama Al-Fatih - Kamar 01',
      className: 'Kelas 1 Aliyah (SMA)',
      guardianName: '',
      guardianPhone: '',
      guardianAddress: '',
      initialDeposit: 200000,
    });
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 transition-all transform animate-bounce">
          <div
            className={`flex items-center space-x-2 px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold ${
              toastMessage.type === 'success'
                ? 'bg-emerald-900 text-emerald-100 border-emerald-700'
                : toastMessage.type === 'warning'
                ? 'bg-amber-900 text-amber-100 border-amber-700'
                : 'bg-slate-900 text-slate-100 border-slate-700'
            }`}
          >
            {toastMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
            {toastMessage.type === 'warning' && <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />}
            {toastMessage.type === 'info' && <Sparkles className="w-4 h-4 text-blue-400 shrink-0" />}
            <span>{toastMessage.text}</span>
            <button
              onClick={() => setToastMessage(null)}
              className="ml-2 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Overview Cards & Quick Status Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 no-print">
        {/* Total Santri */}
        <div 
          onClick={() => setStatusFilter('ALL')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'ALL'
              ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
              : 'bg-white text-slate-800 border-slate-200 hover:border-slate-400'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${statusFilter === 'ALL' ? 'text-slate-300' : 'text-slate-500'}`}>
              Total Santri
            </span>
            <Users className={`w-4 h-4 ${statusFilter === 'ALL' ? 'text-emerald-400' : 'text-slate-600'}`} />
          </div>
          <p className="text-xl font-black font-mono-numbers mt-1.5">{totalSantriCount}</p>
          <p className={`text-[10px] mt-0.5 ${statusFilter === 'ALL' ? 'text-slate-300' : 'text-slate-500'}`}>
            Semua rekening terdaftar
          </p>
        </div>

        {/* Rekening Aktif */}
        <div 
          onClick={() => setStatusFilter('AKTIF')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'AKTIF'
              ? 'bg-emerald-900 text-white border-emerald-900 shadow-sm'
              : 'bg-white text-slate-800 border-slate-200 hover:border-emerald-400'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${statusFilter === 'AKTIF' ? 'text-emerald-200' : 'text-emerald-700'}`}>
              Rekening Aktif
            </span>
            <UserCheck className={`w-4 h-4 ${statusFilter === 'AKTIF' ? 'text-emerald-300' : 'text-emerald-600'}`} />
          </div>
          <p className="text-xl font-black font-mono-numbers mt-1.5 text-emerald-600 dark:text-emerald-400">
            {aktifCount}
          </p>
          <p className={`text-[10px] mt-0.5 ${statusFilter === 'AKTIF' ? 'text-emerald-200' : 'text-slate-500'}`}>
            Bebas transaksi loket & jajan
          </p>
        </div>

        {/* Rekening Dibekukan */}
        <div 
          onClick={() => setStatusFilter('DIBEKUKAN')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'DIBEKUKAN'
              ? 'bg-rose-900 text-white border-rose-900 shadow-sm'
              : 'bg-white text-slate-800 border-slate-200 hover:border-rose-400'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${statusFilter === 'DIBEKUKAN' ? 'text-rose-200' : 'text-rose-700'}`}>
              Rekening Dibekukan
            </span>
            <Lock className={`w-4 h-4 ${statusFilter === 'DIBEKUKAN' ? 'text-rose-300' : 'text-rose-600'}`} />
          </div>
          <p className="text-xl font-black font-mono-numbers mt-1.5 text-rose-600 dark:text-rose-400">
            {dibekukanCount}
          </p>
          <p className={`text-[10px] mt-0.5 ${statusFilter === 'DIBEKUKAN' ? 'text-rose-200' : 'text-slate-500'}`}>
            Santri keluar / nonaktif
          </p>
        </div>

        {/* Total Saldo Titipan */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 text-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
              Total Saldo Wadiah
            </span>
            <CreditCard className="w-4 h-4 text-emerald-700" />
          </div>
          <p className="text-xl font-black font-mono-numbers mt-1.5 text-emerald-900">
            {formatRupiah(totalWadiahBalance)}
          </p>
          <p className="text-[10px] text-emerald-700 mt-0.5">
            Dana titipan 100% aman
          </p>
        </div>
      </div>

      {/* Top Action & Search Bar */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div>
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-emerald-700" />
            <h2 className="text-base font-bold text-slate-900">
              Data Santri & Manajemen Rekening Wadiah
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola data santri, perubahan profil, pembekuan rekening santri tidak aktif, dan aktivasi ulang secara cepat dan efisien.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Quick Search */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Ketik nama / No rekening / NIS / NISN..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Status */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="ALL">Semua Status ({totalSantriCount})</option>
            <option value="AKTIF">Hanya Aktif ({aktifCount})</option>
            <option value="DIBEKUKAN">Hanya Dibekukan ({dibekukanCount})</option>
            <option value="CUTI_ALUMNI">Cuti / Alumni ({alumniCutiCount})</option>
          </select>

          {/* Dormitory Dropdown */}
          <select
            value={selectedDormitory}
            onChange={(e) => setSelectedDormitory(e.target.value)}
            className="px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="ALL">Semua Asrama</option>
            {dormitories.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          {/* Add Santri Button */}
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center space-x-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-600 active:scale-95 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Santri Baru</span>
          </button>
        </div>
      </div>

      {/* Santri Table View */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-sans">
            <thead>
              <tr className="bg-slate-900 text-white uppercase text-[11px] tracking-wider">
                <th className="px-4 py-3 text-left w-28">No. Rekening</th>
                <th className="px-4 py-3 text-left">Nama Santri & NISN</th>
                <th className="px-4 py-3 text-left">Asrama & Kelas</th>
                <th className="px-4 py-3 text-left">Wali Santri</th>
                <th className="px-4 py-3 text-right w-32">Saldo Wadiah</th>
                <th className="px-4 py-3 text-center w-36">Status Rekening</th>
                <th className="px-4 py-3 text-center w-52 no-print">Aksi & Manajemen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredSantri.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400 italic">
                    Tidak ditemukan santri yang sesuai dengan kata kunci pencarian.
                  </td>
                </tr>
              ) : (
                filteredSantri.map((santri) => {
                  const eligibility = checkDailyAllowanceEligibility(santri, transactions, todayStr);
                  const isFrozen = santri.status === 'DIBEKUKAN' || santri.status === 'NONAKTIF';
                  const isCuti = santri.status === 'CUTI';
                  const isAlumni = santri.status === 'ALUMNI';
                  const isAktif = santri.status === 'AKTIF';

                  return (
                    <tr 
                      key={santri.id} 
                      className={`hover:bg-slate-50 transition-colors ${
                        isFrozen ? 'bg-rose-50/30' : isCuti ? 'bg-amber-50/20' : ''
                      }`}
                    >
                      {/* Account Number */}
                      <td className="px-4 py-3 font-mono text-[11px] font-bold text-slate-700 whitespace-nowrap">
                        <span className="bg-slate-100 px-2 py-1 rounded text-slate-900 border border-slate-200">
                          {santri.accountNumber}
                        </span>
                      </td>

                      {/* Name & NISN */}
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-2.5">
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
                              isFrozen
                                ? 'bg-rose-100 text-rose-700'
                                : santri.gender === 'L' 
                                ? 'bg-blue-100 text-blue-700' 
                                : 'bg-rose-100 text-rose-700'
                            }`}
                          >
                            {santri.name.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center space-x-1.5">
                              <p className={`font-bold ${isFrozen ? 'text-slate-600 line-through' : 'text-slate-900'}`}>
                                {santri.name}
                              </p>
                              {santri.gender === 'L' ? (
                                <span className="text-[9px] px-1 rounded bg-blue-50 text-blue-700 border border-blue-200">
                                  L
                                </span>
                              ) : (
                                <span className="text-[9px] px-1 rounded bg-rose-50 text-rose-700 border border-rose-200">
                                  P
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-500 font-mono">NISN: {santri.nisn}</p>
                          </div>
                        </div>
                      </td>

                      {/* Dormitory & Class */}
                      <td className="px-4 py-3 text-slate-700">
                        <p className="font-medium">{santri.dormitory}</p>
                        <p className="text-[10px] text-slate-500">{santri.className}</p>
                      </td>

                      {/* Guardian */}
                      <td className="px-4 py-3 text-slate-700">
                        <p className="font-semibold">{santri.guardianName}</p>
                        <p className="text-[10px] text-slate-500 font-mono">{santri.guardianPhone}</p>
                      </td>

                      {/* Saldo Wadiah */}
                      <td className="px-4 py-3 text-right font-mono-numbers">
                        <span className={`font-black text-sm ${isFrozen ? 'text-slate-600' : 'text-emerald-800'}`}>
                          {formatRupiah(santri.balance)}
                        </span>
                        <p className="text-[9px] text-slate-400">
                          Limit: {formatRupiah(santri.dailyAllowanceLimit || 10000)}/hr
                        </p>
                      </td>

                      {/* Status Rekening */}
                      <td className="px-4 py-3 text-center">
                        {isAktif ? (
                          <div className="inline-flex flex-col items-center">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                              <span>Aktif</span>
                            </span>
                            {eligibility.status === 'ALREADY_TAKEN' && (
                              <span className="text-[9px] text-slate-400 mt-0.5">Sudah jajan hari ini</span>
                            )}
                          </div>
                        ) : isFrozen ? (
                          <div className="inline-flex flex-col items-center">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                              <Lock className="w-3 h-3 text-rose-600" />
                              <span>Dibekukan</span>
                            </span>
                            <span className="text-[9px] text-rose-600 font-medium mt-0.5">Santri Tidak Aktif</span>
                          </div>
                        ) : isCuti ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            <span>Cuti Santri</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-300">
                            <span>Alumni Santri</span>
                          </span>
                        )}
                      </td>

                      {/* Action buttons (SIMPEL, EFEKTIF, EFISIEN) */}
                      <td className="px-4 py-3 text-center no-print">
                        <div className="flex items-center justify-center space-x-1">
                          {/* 1. EDIT DATA SANTRI */}
                          <button
                            onClick={() => handleOpenEdit(santri)}
                            title="Edit Data Santri & Limit"
                            className="p-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white transition-all cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {/* 2. BEKUKAN ATAU AKTIFKAN KEMBALI REKENING */}
                          {isAktif ? (
                            <button
                              onClick={() => setFreezingSantri(santri)}
                              title="Bekukan Rekening (Bagi Santri Tidak Aktif / Keluar)"
                              className="p-1.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-600 hover:text-white transition-all cursor-pointer"
                            >
                              <Lock className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => setUnfreezingSantri(santri)}
                              title="Aktifkan Kembali Rekening yang Dibekukan"
                              className="px-2 py-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-all cursor-pointer flex items-center space-x-1 font-bold text-[10px] shadow-xs"
                            >
                              <Unlock className="w-3 h-3" />
                              <span>Aktifkan</span>
                            </button>
                          )}

                          {/* 3. TRANSAKSI LOKET JAJAN (Hanya bila Aktif) */}
                          {isAktif && (
                            <button
                              onClick={() => onOpenTellerForSantri(santri.id)}
                              title="Loket Penarikan Jajan Rp 10.000"
                              className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white transition-all cursor-pointer"
                            >
                              <HandCoins className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* 4. SETOR TITIPAN WADIAH */}
                          <button
                            onClick={() => onOpenDepositForSantri(santri.id)}
                            title="Setor Titipan Wali"
                            className="p-1.5 rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-600 hover:text-white transition-all cursor-pointer"
                          >
                            <PlusCircle className="w-3.5 h-3.5" />
                          </button>

                          {/* 5. REKENING KORAN */}
                          <button
                            onClick={() => onViewStatementForSantri(santri.id)}
                            title="Buka Rekening Koran"
                            className="p-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-800 hover:text-white transition-all cursor-pointer"
                          >
                            <Receipt className="w-3.5 h-3.5" />
                          </button>

                          {/* 6. CETAK KARTU DIGITAL */}
                          <button
                            onClick={() => setSelectedCardSantri(santri)}
                            title="Cetak Smart Card Wadiah"
                            className="p-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white transition-all cursor-pointer"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                          </button>

                          {/* 7. HAPUS DATA SANTRI */}
                          <button
                            onClick={() => setDeletingSantri(santri)}
                            title="Hapus Data Santri"
                            className="p-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-600 hover:text-white transition-all cursor-pointer"
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
      </div>

      {/* ======================================================== */}
      {/* MODAL 1: EDIT DATA SANTRI                                */}
      {/* ======================================================== */}
      {editingSantri && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs no-print">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Edit3 className="w-4 h-4 text-emerald-400" />
                <div>
                  <h3 className="font-bold text-sm">Edit Data Santri & Rekening</h3>
                  <p className="text-[11px] text-slate-400 font-mono">
                    {editingSantri.accountNumber} • Saldo: {formatRupiah(editingSantri.balance)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingSantri(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 overflow-y-auto space-y-3.5 text-xs">
              {/* Nama & NISN */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nama Lengkap Santri</label>
                  <input
                    type="text"
                    required
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">NISN / Nomor Induk</label>
                  <input
                    type="text"
                    required
                    value={editFormData.nisn}
                    onChange={(e) => setEditFormData({ ...editFormData, nisn: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
              </div>

              {/* Gender, Asrama, Kelas */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Jenis Kelamin</label>
                  <select
                    value={editFormData.gender}
                    onChange={(e) => setEditFormData({ ...editFormData, gender: e.target.value as 'L' | 'P' })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="L">Laki-laki (Ikhwan)</option>
                    <option value="P">Perempuan (Akhwat)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Asrama</label>
                  <input
                    type="text"
                    value={editFormData.dormitory}
                    onChange={(e) => setEditFormData({ ...editFormData, dormitory: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kelas</label>
                  <input
                    type="text"
                    value={editFormData.className}
                    onChange={(e) => setEditFormData({ ...editFormData, className: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Data Wali */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nama Orang Tua / Wali</label>
                  <input
                    type="text"
                    required
                    value={editFormData.guardianName}
                    onChange={(e) => setEditFormData({ ...editFormData, guardianName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">No. WhatsApp / HP Wali</label>
                  <input
                    type="text"
                    value={editFormData.guardianPhone}
                    onChange={(e) => setEditFormData({ ...editFormData, guardianPhone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
              </div>

              {/* Alamat Wali */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Alamat Domisili Wali</label>
                <input
                  type="text"
                  value={editFormData.guardianAddress}
                  onChange={(e) => setEditFormData({ ...editFormData, guardianAddress: e.target.value })}
                  placeholder="Kota / Kabupaten tempat tinggal wali"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Limit Jajan & Status */}
              <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-200">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Batas Jajan Harian (Rp)</label>
                  <input
                    type="number"
                    min="1000"
                    step="1000"
                    value={editFormData.dailyAllowanceLimit}
                    onChange={(e) => setEditFormData({ ...editFormData, dailyAllowanceLimit: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono font-bold"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">Standar pesantren: Rp 10.000 / hari</p>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Status Keaktifan Santri</label>
                  <select
                    value={editFormData.status}
                    onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
                  >
                    <option value="AKTIF">AKTIF (Bisa Transaksi)</option>
                    <option value="DIBEKUKAN">DIBEKUKAN (Santri Keluar / Nonaktif)</option>
                    <option value="CUTI">CUTI (Sementara)</option>
                    <option value="ALUMNI">ALUMNI (Telah Lulus)</option>
                  </select>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {editFormData.status === 'DIBEKUKAN' ? 'Rekening terkunci, saldo aman' : 'Status rekening'}
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingSantri(null)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg shadow-xs cursor-pointer flex items-center space-x-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Simpan Perubahan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: KONFIRMASI PEMBEKUAN REKENING (BEKUKAN)         */}
      {/* ======================================================== */}
      {freezingSantri && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs no-print">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="px-5 py-4 bg-amber-600 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ShieldAlert className="w-5 h-5 text-amber-100" />
                <h3 className="font-bold text-sm">Bekukan Rekening Santri</h3>
              </div>
              <button
                onClick={() => setFreezingSantri(null)}
                className="text-amber-200 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-2">
                <p className="font-bold text-sm text-amber-950">
                  Apakah Anda yakin ingin membekukan rekening santri ini?
                </p>
                <div className="bg-white p-3 rounded-lg border border-amber-200 text-xs space-y-1">
                  <p><span className="text-slate-500">Nama Santri:</span> <strong className="text-slate-900">{freezingSantri.name}</strong></p>
                  <p><span className="text-slate-500">No. Rekening:</span> <span className="font-mono font-bold text-slate-800">{freezingSantri.accountNumber}</span></p>
                  <p><span className="text-slate-500">Sisa Saldo Wadiah:</span> <strong className="text-emerald-800 font-mono font-black">{formatRupiah(freezingSantri.balance)}</strong></p>
                  <p><span className="text-slate-500">Wali Santri:</span> <span>{freezingSantri.guardianName} ({freezingSantri.guardianPhone})</span></p>
                </div>
              </div>

              <div className="space-y-2 text-slate-600 leading-relaxed">
                <p className="font-semibold text-slate-800">Dampak Pembekuan Rekening:</p>
                <ul className="list-disc pl-5 space-y-1 text-slate-600">
                  <li>Santri <strong>tidak dapat melakukan penarikan jajan harian</strong> di loket kasir.</li>
                  <li><strong>Saldo titipan wadiah tetap aman 100%</strong> dan tidak akan hilang atau terpotong biaya apapun.</li>
                  <li>Jika santri di kemudian hari aktif kembali, bendahara dapat <strong>mengaktifkan kembali rekening ini kapan saja dengan 1 klik</strong>.</li>
                </ul>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setFreezingSantri(null)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmFreeze}
                  className="flex items-center space-x-1.5 px-5 py-2 font-bold bg-amber-600 hover:bg-amber-700 active:scale-95 text-white rounded-lg shadow-xs cursor-pointer"
                >
                  <Lock className="w-4 h-4" />
                  <span>Bekukan Rekening Sekarang</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: AKTIFKAN KEMBALI REKENING YANG DIBEKUKAN         */}
      {/* ======================================================== */}
      {unfreezingSantri && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs no-print">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="px-5 py-4 bg-emerald-800 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-300" />
                <h3 className="font-bold text-sm">Aktifkan Kembali Rekening Santri</h3>
              </div>
              <button
                onClick={() => setUnfreezingSantri(null)}
                className="text-emerald-300 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 space-y-2">
                <p className="font-bold text-sm">
                  Aktifkan kembali rekening untuk santri yang masuk kembali:
                </p>
                <div className="bg-white p-3 rounded-lg border border-emerald-200 text-xs space-y-1">
                  <p><span className="text-slate-500">Nama Santri:</span> <strong className="text-slate-900">{unfreezingSantri.name}</strong></p>
                  <p><span className="text-slate-500">No. Rekening:</span> <span className="font-mono font-bold text-slate-800">{unfreezingSantri.accountNumber}</span></p>
                  <p><span className="text-slate-500">Saldo Wadiah Tersedia:</span> <strong className="text-emerald-800 font-mono font-black">{formatRupiah(unfreezingSantri.balance)}</strong></p>
                  <p><span className="text-slate-500">Asrama & Kelas:</span> <span>{unfreezingSantri.dormitory} - {unfreezingSantri.className}</span></p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-slate-600">
                <p>
                  Setelah diaktifkan kembali, status santri akan menjadi <strong>AKTIF</strong>. Santri dapat langsung mengambil jajan harian Rp 10.000 di loket dan wali santri dapat melakukan setoran titipan wadiah seperti biasa.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setUnfreezingSantri(null)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmUnfreeze}
                  className="flex items-center space-x-1.5 px-5 py-2 font-bold bg-emerald-700 hover:bg-emerald-600 active:scale-95 text-white rounded-lg shadow-xs cursor-pointer"
                >
                  <Unlock className="w-4 h-4" />
                  <span>Aktifkan Rekening Sekarang</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 4: HAPUS DATA SANTRI (DENGAN PROTEKSI SALDO WADIAH)  */}
      {/* ======================================================== */}
      {deletingSantri && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs no-print">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="px-5 py-4 bg-rose-700 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Trash2 className="w-5 h-5 text-rose-200" />
                <h3 className="font-bold text-sm">Hapus Rekening Santri</h3>
              </div>
              <button
                onClick={() => setDeletingSantri(null)}
                className="text-rose-200 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1">
                <p><span className="text-slate-500">Nama Santri:</span> <strong className="text-slate-900">{deletingSantri.name}</strong></p>
                <p><span className="text-slate-500">No. Rekening:</span> <span className="font-mono font-bold text-slate-800">{deletingSantri.accountNumber}</span></p>
                <p><span className="text-slate-500">Saldo Wadiah:</span> <strong className="text-slate-900 font-mono font-bold">{formatRupiah(deletingSantri.balance)}</strong></p>
              </div>

              {/* Peringatan jika masih ada sisa saldo */}
              {deletingSantri.balance > 0 ? (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 space-y-2">
                  <div className="flex items-start space-x-2">
                    <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-amber-950">Peringatan Amanah Syariah Saldo Titipan!</p>
                      <p className="text-[11px] text-amber-800 mt-1 leading-relaxed">
                        Santri ini masih memiliki sisa saldo titipan wadiah sebesar <strong>{formatRupiah(deletingSantri.balance)}</strong>. 
                        Pastikan saldo telah diserahkan / dikembalikan secara tunai kepada santri atau wali santri.
                      </p>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-amber-200 flex justify-between items-center">
                    <span className="text-[10px] text-amber-800">Saran: Bekukan saja agar riwayat aman.</span>
                    <button
                      type="button"
                      onClick={() => {
                        const target = deletingSantri;
                        setDeletingSantri(null);
                        setFreezingSantri(target);
                      }}
                      className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded font-bold text-[10px] cursor-pointer"
                    >
                      Bekukan Saja
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-slate-600">
                  Data santri dan rekening wadiah akan dihapus permanen dari daftar santri aktif. Riwayat transaksi masa lalu tetap tersimpan dalam sistem akuntansi.
                </p>
              )}

              <div className="pt-3 border-t border-slate-200 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setDeletingSantri(null)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="flex items-center space-x-1 px-4 py-2 font-bold bg-rose-600 hover:bg-rose-700 active:scale-95 text-white rounded-lg shadow-xs cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus Permanen</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 5: TAMBAH SANTRI BARU                              */}
      {/* ======================================================== */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs no-print">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm">Registrasi Rekening Wadiah Santri Baru</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSantriSubmit} className="p-6 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nama Lengkap Santri</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Contoh: Muhammad Ilham"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">NISN (Nomor Induk)</label>
                  <input
                    type="text"
                    required
                    value={formData.nisn}
                    onChange={(e) => setFormData({ ...formData, nisn: e.target.value })}
                    placeholder="Contoh: 0081239999"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Jenis Kelamin</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value as 'L' | 'P' })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="L">Laki-laki (Ikhwan)</option>
                    <option value="P">Perempuan (Akhwat)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Asrama</label>
                  <input
                    type="text"
                    value={formData.dormitory}
                    onChange={(e) => setFormData({ ...formData, dormitory: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kelas</label>
                  <input
                    type="text"
                    value={formData.className}
                    onChange={(e) => setFormData({ ...formData, className: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nama Orang Tua / Wali</label>
                  <input
                    type="text"
                    required
                    value={formData.guardianName}
                    onChange={(e) => setFormData({ ...formData, guardianName: e.target.value })}
                    placeholder="Contoh: H. Abdul Rasyid"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">No. WhatsApp / HP Wali</label>
                  <input
                    type="text"
                    value={formData.guardianPhone}
                    onChange={(e) => setFormData({ ...formData, guardianPhone: e.target.value })}
                    placeholder="0812-xxxx-xxxx"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Setoran Titipan Awal (Rupiah)</label>
                <input
                  type="number"
                  min="0"
                  step="10000"
                  value={formData.initialDeposit}
                  onChange={(e) => setFormData({ ...formData, initialDeposit: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono-numbers font-bold"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Otomatis dicatat sebagai setoran wadiah pertama dengan batas harian jajan Rp 10.000.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg shadow-xs cursor-pointer"
                >
                  Simpan & Buka Rekening
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 6: DIGITAL SANTRI SMART CARD                       */}
      {/* ======================================================== */}
      {selectedCardSantri && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs no-print">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <span className="font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-emerald-400" />
                <span>Kartu Santri Wadiah (Smart Card Mini Pesantren)</span>
              </span>
              <button
                onClick={() => setSelectedCardSantri(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 bg-slate-100 flex flex-col items-center">
              {/* The Physical Card Mockup */}
              <div className="w-full aspect-[85.6/53.98] rounded-2xl bg-gradient-to-br from-emerald-950 via-emerald-900 to-slate-950 text-white p-5 shadow-2xl border border-emerald-500/40 relative overflow-hidden flex flex-col justify-between select-none">
                <div className="absolute right-0 top-0 opacity-10 font-arabic text-7xl font-black pointer-events-none">
                  وديعة
                </div>

                {/* Card Header */}
                <div className="flex items-start justify-between relative z-10">
                  <div>
                    <h4 className="font-black text-xs uppercase tracking-wider text-emerald-200">
                      {pesantrenProfile.name}
                    </h4>
                    <p className="text-[9px] text-slate-300">
                      KARTU TITIPAN WADIAH SANTRI
                    </p>
                  </div>
                  <span className="font-arabic text-amber-300 text-xs font-bold">
                    بِسْمِ اللَّهِ
                  </span>
                </div>

                {/* Chip & Contactless Icon */}
                <div className="flex items-center space-x-3 my-1">
                  <div className="w-9 h-7 rounded-md bg-gradient-to-tr from-amber-400 via-amber-200 to-amber-500 border border-amber-600/60 shadow-xs flex items-center justify-center">
                    <div className="w-5 h-4 border border-amber-700/40 rounded-xs"></div>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-mono tracking-widest">
                    JAJAN HARIAN {formatRupiah(selectedCardSantri.dailyAllowanceLimit || 10000)}
                  </span>
                </div>

                {/* Card Number & Holder */}
                <div className="relative z-10">
                  <p className="font-mono text-sm sm:text-base font-bold tracking-widest text-slate-100 shadow-xs">
                    {selectedCardSantri.accountNumber.replace(/\./g, '  ')}
                  </p>
                  <div className="flex justify-between items-end mt-2">
                    <div>
                      <p className="text-[9px] uppercase tracking-wider text-emerald-300">Nama Santri</p>
                      <p className="font-bold text-xs text-white truncate max-w-[190px]">
                        {selectedCardSantri.name}
                      </p>
                      <p className="text-[8px] text-slate-400">
                        NISN: {selectedCardSantri.nisn} • {selectedCardSantri.dormitory.split(' - ')[0]}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] uppercase tracking-wider text-emerald-300">Status</p>
                      <p className="font-mono text-xs font-black text-amber-300">
                        {selectedCardSantri.status}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Barcode / QR Simulation for scanner */}
              <div className="mt-4 bg-white p-3 rounded-xl border border-slate-300 flex items-center space-x-4 w-full">
                <QrCode className="w-12 h-12 text-slate-800 shrink-0" />
                <div className="text-xs">
                  <p className="font-bold text-slate-800">Scan Barcode di Loket Jajan</p>
                  <p className="text-[10px] text-slate-500">
                    Bawakan kartu ini ke loket teller bendahara pesantren setiap pagi/istirahat untuk pencairan jajan harian.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <button
                onClick={() => setSelectedCardSantri(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                Tutup
              </button>
              <PrintControlBar
                documentTitle={`Kartu Wadiah Santri - ${selectedCardSantri?.name || 'Santri'}`}
                defaultOrientation="portrait"
                defaultPaperSize="A4"
                buttonLabel="Cetak Kartu"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
