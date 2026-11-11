import React, { useState, useMemo } from 'react';
import { 
  Building2, 
  Search, 
  ShieldCheck, 
  HandCoins, 
  Calendar, 
  Clock, 
  ArrowRight, 
  Lock, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  EyeOff,
  Printer, 
  Receipt,
  Landmark,
  KeyRound,
  LogIn,
  LogOut,
  Sparkles,
  Mail
} from 'lucide-react';
import { Santri, Transaction, PesantrenProfile, AuthUser } from '../types/finance';
import { 
  formatRupiah, 
  formatDateIndo, 
  checkDailyAllowanceEligibility,
  getTodayDateString 
} from '../utils/accounting';
import { User } from 'firebase/auth';

interface LandingPageProps {
  santriList: Santri[];
  transactions: Transaction[];
  pesantrenProfile: PesantrenProfile;
  currentUser: AuthUser | User | null;
  isCloudConnected: boolean;
  onSignInGoogle?: () => void;
  onSignOut: () => void;
  onEnterDashboard: () => void;
  onLoginBendahara?: (user: AuthUser) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  santriList,
  transactions,
  pesantrenProfile,
  currentUser,
  isCloudConnected,
  onSignOut,
  onEnterDashboard,
  onLoginBendahara,
}) => {
  // Login form state for Bendahara: username and password as requested
  const [loginUsername, setLoginUsername] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string>('');
  const [loginSuccess, setLoginSuccess] = useState<boolean>(false);

  // Single unified search field for parents as requested: "ketik nama / No rekening / NIS / NISN"
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected student for detailed parent view
  const [selectedSantriId, setSelectedSantriId] = useState<string>('');

  const todayStr = getTodayDateString();

  // Default date range: 1st of current month to today
  const defaultStartDate = useMemo(() => {
    const d = new Date();
    d.setDate(1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}-01`;
  }, []);

  const [startDate, setStartDate] = useState<string>(defaultStartDate);
  const [endDate, setEndDate] = useState<string>(todayStr);

  // Check if parent has typed in the search field
  // Requirement: "tidak perlu ditampilkan nama seluruh santri, nama disini hanya muncul ketika diketik manual"
  const hasSearchQuery = Boolean(searchQuery.trim().length > 0);

  // Filter students based on single search query matching Name OR Account Number OR NIS/NISN
  const filteredSantri = useMemo(() => {
    if (!hasSearchQuery) return [];
    const q = searchQuery.trim().toLowerCase();

    return santriList.filter((s) => {
      const matchName = s.name.toLowerCase().includes(q);
      const matchAcc = s.accountNumber.toLowerCase().includes(q);
      const matchNis = s.nisn.toLowerCase().includes(q);
      return matchName || matchAcc || matchNis;
    });
  }, [santriList, searchQuery, hasSearchQuery]);

  // The active student being monitored: only when search query is active and matches exist
  const activeSantri = useMemo(() => {
    if (!hasSearchQuery || filteredSantri.length === 0) return null;
    if (selectedSantriId) {
      const found = filteredSantri.find((s) => s.id === selectedSantriId);
      if (found) return found;
    }
    return filteredSantri[0] || null;
  }, [hasSearchQuery, selectedSantriId, filteredSantri]);

  // Filter student transactions:
  // "rentang tanggal pengecekan dari tanggal dan sampai dengan tanggal, tampilkan transaksi jajan santri.
  // ubah tampilan riwayat uang jajan menjadi menurun sesuai transaksi terakhir.
  // ini dimaksud kan agar orang tua /wali tidak kesulitan membaca saldo yang masih tersisa dengan melihat saldo terakhir paling bawah"
  const santriWithdrawals = useMemo(() => {
    if (!activeSantri) return [];
    return transactions
      .filter((t) => {
        if (t.santriId !== activeSantri.id) return false;
        if (t.type !== 'WITHDRAWAL_JAJAN') return false;
        if (startDate && t.date < startDate) return false;
        if (endDate && t.date > endDate) return false;
        return true;
      })
      .sort((a, b) => {
        // Chronological order: from oldest to newest (menurun ke transaksi terakhir di baris paling bawah)
        const dateComp = a.date.localeCompare(b.date);
        if (dateComp !== 0) return dateComp;
        return (a.time || '').localeCompare(b.time || '');
      });
  }, [activeSantri, transactions, startDate, endDate]);

  // Total penarikan jajan selama rentang periode yang dipilih
  const totalWithdrawalPeriod = useMemo(() => {
    return santriWithdrawals.reduce((sum, t) => sum + t.amount, 0);
  }, [santriWithdrawals]);

  // Today's allowance status for this child
  const dailyStatus = useMemo(() => {
    if (!activeSantri) return null;
    return checkDailyAllowanceEligibility(activeSantri, transactions, todayStr);
  }, [activeSantri, transactions, todayStr]);

  const handleSelectSantri = (santri: Santri) => {
    setSelectedSantriId(santri.id);
  };

  const handlePrintStatement = () => {
    window.print();
  };

  // Login submission handler: Pengurus (Full Access) vs Bendahara (Restricted Access)
  const handleFormLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    const cleanUser = loginUsername.trim().toLowerCase();
    const cleanPass = loginPassword.trim();

    // 1. AKUN PENGURUS: Akses Full (Setoran SPP & Titipan, Penarikan Jajan+Kebutuhan & SPP, Laporan)
    if ((cleanUser === 'bendahara01@gmail.com' || cleanUser === 'bendahara01') && cleanPass === 'bendahara01') {
      setLoginSuccess(true);
      const pengurusUser: AuthUser = {
        uid: 'pengurus-admin-01',
        email: 'bendahara01@gmail.com',
        displayName: 'Pengurus Pesantren (Full Access)',
        photoURL: null,
        role: 'PENGURUS',
      };
      setTimeout(() => {
        if (onLoginBendahara) {
          onLoginBendahara(pengurusUser);
        } else {
          onEnterDashboard();
        }
      }, 350);
      return;
    }

    // 2. AKUN BENDAHARA: Akses Terbatas (Setoran: Titipan saja, Penarikan: Jajan + Kebutuhan saja; Menu SPP dihilangkan)
    if ((cleanUser === 'bendahara@gmail.com' || cleanUser === 'bendahara') && cleanPass === 'bendahara') {
      setLoginSuccess(true);
      const bendaharaUser: AuthUser = {
        uid: 'bendahara-loket-02',
        email: 'bendahara@gmail.com',
        displayName: 'Bendahara Kasir Loket',
        photoURL: null,
        role: 'BENDAHARA',
      };
      setTimeout(() => {
        if (onLoginBendahara) {
          onLoginBendahara(bendaharaUser);
        } else {
          onEnterDashboard();
        }
      }, 350);
      return;
    }

    setLoginError('Username atau password salah! Pastikan kredensial login Anda sudah benar.');
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* Top Header Bar */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Brand & Logo */}
          <div className="flex items-center space-x-3">
            {pesantrenProfile.logoUrl ? (
              <img
                src={pesantrenProfile.logoUrl}
                alt={pesantrenProfile.name}
                className="w-10 h-10 object-contain rounded-xl bg-white p-1 border border-slate-700 shadow-sm"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white font-bold text-lg shadow-md">
                <Landmark className="w-5 h-5 text-white" />
              </div>
            )}
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-sm sm:text-base tracking-tight text-white">
                  SantriPay Syariah
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Wadiah Online
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate max-w-[200px] sm:max-w-md">
                {pesantrenProfile.formalName}
              </p>
            </div>
          </div>

          {/* Right Status */}
          <div className="flex items-center space-x-2">
            {/* Realtime cloud status */}
            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-slate-800/90 border border-slate-700 text-xs">
              <span className={`w-2 h-2 rounded-full ${isCloudConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <span className="text-slate-300 text-[11px] font-mono">
                {isCloudConnected ? 'Cloud Realtime Aktif' : 'Sistem Aktif'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Welcome Banner */}
      <section className="bg-gradient-to-b from-slate-950 via-slate-900 to-slate-900 py-6 sm:py-8 border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-3">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Sistem Kas Titipan Wadiah & Kontrol Uang Jajan Harian Santri</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            Transparansi Uang Jajan Santri & Loket Kasir Syariah
          </h1>

          <p className="text-slate-400 text-xs sm:text-sm max-w-2xl mx-auto">
            Orang tua dapat memantau penarikan jajan dan sisa saldo anak secara mandiri (Mode Baca). 
            Pengurus mengelola kasir loket dengan batasan disiplin maksimal Rp 10.000 / hari.
          </p>
        </div>
      </section>

      {/* Main Dual Grid: Left Side (Portal Orang Tua Read-Only) & Right Side (Portal Login Bendahara) */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* ======================================================== */}
          {/* SISI KIRI: PORTAL ORANG TUA (MODE READ-ONLY) (7 COLS) */}
          {/* ======================================================== */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-slate-800/80 backdrop-blur-md rounded-2xl p-5 sm:p-6 border border-slate-700/80 shadow-xl space-y-5">
              
              {/* Header Box: Mode Read-Only */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-700/80 gap-3">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                      <Eye className="w-4 h-4" />
                    </span>
                    <h2 className="text-base sm:text-lg font-black text-white">
                      Portal Pemantauan Orang Tua / Wali
                    </h2>
                  </div>
                  <p className="text-xs text-slate-400">
                    Pantau arus penarikan uang jajan dan saldo titipan anak Anda di pesantren
                  </p>
                </div>

                <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-sky-950/80 text-sky-300 border border-sky-800 text-xs font-semibold self-start sm:self-auto">
                  <Lock className="w-3.5 h-3.5 text-sky-400" />
                  <span>Mode Read-Only (Hanya Baca)</span>
                </div>
              </div>

              {/* 1 Field Pencarian Santri (Tanpa Header Field) */}
              <div className="bg-slate-900/90 rounded-2xl p-3 sm:p-4 border border-slate-700/80 space-y-3 shadow-inner">
                <div className="relative flex items-center">
                  <div className="absolute left-3.5 text-slate-400 pointer-events-none flex items-center">
                    <Search className="w-5 h-5 text-emerald-400" />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ketik nama / No rekening / NIS / NISN"
                    className="w-full pl-11 pr-24 py-3 bg-slate-800/90 hover:bg-slate-800 border border-slate-700 focus:border-emerald-500 rounded-xl text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all font-medium"
                    autoComplete="off"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedSantriId('');
                      }}
                      className="absolute right-3 px-2.5 py-1 text-xs font-semibold text-amber-400 hover:text-amber-300 bg-slate-700/70 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                    >
                      Reset
                    </button>
                  )}
                </div>

                {/* Quick Selection Dropdown / Chips - HANYA muncul jika orang tua telah mengetik di salah satu field */}
                {hasSearchQuery && (
                  <div className="pt-3 border-t border-slate-800 space-y-2">
                    {filteredSantri.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 items-start">
                        {/* Sebelah Kiri: Pilih santri yang ditemukan */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Pilih santri yang ditemukan ({filteredSantri.length}):</span>
                            </p>
                            <span className="text-[10px] text-slate-400">
                              {filteredSantri.length === 1 ? '1 Santri cocok' : 'Klik untuk memilih'}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-1">
                            {filteredSantri.map((s) => {
                              const isSelected = activeSantri?.id === s.id;
                              return (
                                <button
                                  key={s.id}
                                  type="button"
                                  onClick={() => handleSelectSantri(s)}
                                  className={`px-3 py-2 rounded-xl text-left transition-all cursor-pointer border ${
                                    isSelected
                                      ? 'bg-emerald-600/30 border-emerald-500 text-white ring-1 ring-emerald-500 shadow-md'
                                      : 'bg-slate-800/90 hover:bg-slate-750 text-slate-300 border-slate-700 hover:border-slate-600 hover:text-white'
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-1">
                                    <span className="font-bold text-xs truncate text-white">{s.name}</span>
                                    {isSelected && (
                                      <span className="text-[9px] bg-emerald-500 text-white px-1.5 py-0.5 rounded font-bold uppercase tracking-wider shrink-0">
                                        Terpilih
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center space-x-2 text-[10px] text-slate-400 mt-1 font-mono">
                                    <span>NIS: <strong className="text-slate-300">{s.nisn}</strong></span>
                                    <span>•</span>
                                    <span>Rek: <strong className="text-emerald-300">{s.accountNumber}</strong></span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Sebelah Kanan (Disampingnya): Rentang Tanggal Pengecekan */}
                        <div className="space-y-2 bg-slate-900/90 p-3 rounded-xl border border-slate-700/80">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Rentang Tanggal Pengecekan:</span>
                            </span>
                            <span className="text-[10px] text-emerald-400 font-semibold font-mono">
                              Filter Periode
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                                Dari Tanggal
                              </label>
                              <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                                Sampai Dengan Tanggal
                              </label>
                              <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                              />
                            </div>
                          </div>

                          {/* Quick Date Presets */}
                          <div className="flex items-center justify-between pt-1 text-[10px] border-t border-slate-800/80">
                            <span className="text-slate-400">Pilihan Cepat:</span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setStartDate(todayStr);
                                  setEndDate(todayStr);
                                }}
                                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer"
                              >
                                Hari Ini
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const d = new Date();
                                  d.setDate(d.getDate() - 7);
                                  const y = d.getFullYear();
                                  const m = String(d.getMonth() + 1).padStart(2, '0');
                                  const day = String(d.getDate()).padStart(2, '0');
                                  setStartDate(`${y}-${m}-${day}`);
                                  setEndDate(todayStr);
                                }}
                                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer"
                              >
                                7 Hari
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const d = new Date();
                                  d.setDate(1);
                                  const y = d.getFullYear();
                                  const m = String(d.getMonth() + 1).padStart(2, '0');
                                  setStartDate(`${y}-${m}-01`);
                                  setEndDate(todayStr);
                                }}
                                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer"
                              >
                                Bulan Ini
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="py-2.5 px-3 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center space-x-2 text-amber-300 text-xs">
                        <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>Tidak ditemukan santri dengan kriteria tersebut. Mohon periksa kembali ejaan Nama, No. Rekening, atau NIS.</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Santri Card & Balance Overview */}
              {activeSantri ? (
                <div className="space-y-4">
                  {/* Santri Bio Card */}
                  <div className="bg-gradient-to-br from-slate-900 to-slate-850 rounded-xl p-4 border border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-xl bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 flex items-center justify-center font-bold text-lg font-mono">
                        {activeSantri.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="text-base font-black text-white">
                            {activeSantri.name}
                          </h3>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            activeSantri.status === 'AKTIF' 
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          }`}>
                            {activeSantri.status}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 mt-1">
                          <span>NIS: <strong className="text-slate-200 font-mono">{activeSantri.nisn}</strong></span>
                          <span>•</span>
                          <span>No. Rek: <strong className="text-emerald-300 font-mono">{activeSantri.accountNumber}</strong></span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Wali: {activeSantri.guardianName}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={handlePrintStatement}
                      className="no-print self-start sm:self-auto flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold rounded-lg border border-slate-700 transition-colors cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Cetak Bukti</span>
                    </button>
                  </div>

                  {/* Rentang Tanggal Filter Bar */}
                  <div className="bg-slate-900/90 rounded-xl p-3.5 border border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print">
                    <div className="flex items-center space-x-2 text-xs text-slate-300">
                      <Calendar className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="font-bold text-white">Rentang Tanggal Pengecekan Jajan:</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <div className="flex items-center space-x-1.5">
                        <span className="text-[11px] text-slate-400">Dari:</span>
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                        />
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <span className="text-[11px] text-slate-400">s/d:</span>
                        <input
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                        />
                      </div>
                      <div className="flex items-center gap-1 text-[10px]">
                        <button
                          type="button"
                          onClick={() => {
                            setStartDate(todayStr);
                            setEndDate(todayStr);
                          }}
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer"
                        >
                          Hari Ini
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const d = new Date();
                            d.setDate(d.getDate() - 7);
                            const y = d.getFullYear();
                            const m = String(d.getMonth() + 1).padStart(2, '0');
                            const day = String(d.getDate()).padStart(2, '0');
                            setStartDate(`${y}-${m}-${day}`);
                            setEndDate(todayStr);
                          }}
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer"
                        >
                          7 Hari
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const d = new Date();
                            d.setDate(1);
                            const y = d.getFullYear();
                            const m = String(d.getMonth() + 1).padStart(2, '0');
                            setStartDate(`${y}-${m}-01`);
                            setEndDate(todayStr);
                          }}
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer"
                        >
                          Bulan Ini
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Highlight: Total Penarikan Jajan Santri Periode Terpilih & Status Hari Ini */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Total Penarikan Jajan Card (Ubah Saldo Terakhir Menjadi Total Penarikan Jajan Selama Periode Terpilih) */}
                    <div className="bg-gradient-to-br from-rose-950/70 to-slate-900 rounded-xl p-4 border border-rose-800/60 shadow-inner">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-rose-300">
                          Total Penarikan Jajan Santri
                        </span>
                        <HandCoins className="w-4 h-4 text-rose-400" />
                      </div>
                      <p className="text-2xl sm:text-3xl font-black text-rose-300 font-mono-numbers mt-2">
                        {formatRupiah(totalWithdrawalPeriod)}
                      </p>
                      <p className="text-[11px] text-rose-200/80 mt-1">
                        Total {santriWithdrawals.length}x penarikan jajan santri periode ({formatDateIndo(startDate)} s/d {formatDateIndo(endDate)})
                      </p>
                    </div>

                    {/* Status Penarikan Hari Ini */}
                    <div className="bg-slate-900 rounded-xl p-4 border border-slate-700/80">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          Status Jajan Hari Ini
                        </span>
                        <Clock className="w-4 h-4 text-amber-400" />
                      </div>
                      <div className="mt-2">
                        {dailyStatus?.status === 'ALREADY_TAKEN' ? (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Sudah Mengambil Jajan Hari Ini</span>
                            </span>
                            <p className="text-[11px] text-slate-400">
                              Batas disiplin 1x sehari (Rp 10.000) terpenuhi. Dapat mengambil kembali besok.
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Belum Mengambil Jajan Hari Ini</span>
                            </span>
                            <p className="text-[11px] text-slate-400">
                              Santri berhak mencairkan jajan maksimal Rp 10.000 di loket kasir.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Tabel Riwayat Penarikan Jajan Santri */}
                  {/* CRITICAL NOTE: "dana titipan tidak perlu ditampilkan" -> Only show WITHDRAWAL_JAJAN */}
                  <div className="space-y-2 pt-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center space-x-2">
                        <Receipt className="w-4 h-4 text-rose-400" />
                        <h4 className="text-xs sm:text-sm font-bold text-white">
                          Riwayat Penarikan Uang Jajan
                        </h4>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                          {formatDateIndo(startDate)} s/d {formatDateIndo(endDate)}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 italic">
                        *Urutan menurun ke transaksi terakhir di baris bawah
                      </span>
                    </div>

                    <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-900/60">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-800/80 text-slate-300 border-b border-slate-700">
                            <tr>
                              <th className="py-2.5 px-3 font-semibold">Tanggal & Waktu</th>
                              <th className="py-2.5 px-3 font-semibold">No. Transaksi</th>
                              <th className="py-2.5 px-3 font-semibold text-right">Jumlah Penarikan</th>
                              <th className="py-2.5 px-3 font-semibold text-right">Saldo Terakhir</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800 text-slate-200">
                            {santriWithdrawals.length > 0 ? (
                              santriWithdrawals.map((t, idx) => {
                                const isLatest = idx === santriWithdrawals.length - 1;
                                return (
                                  <tr 
                                    key={t.id} 
                                    className={`transition-colors ${
                                      isLatest 
                                        ? 'bg-emerald-950/20 hover:bg-emerald-950/30' 
                                        : 'hover:bg-slate-800/40'
                                    }`}
                                  >
                                    <td className="py-2.5 px-3">
                                      <div className="font-semibold text-white flex items-center space-x-1.5">
                                        <span>{formatDateIndo(t.date)}</span>
                                        {isLatest && (
                                          <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                                            Terakhir
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-[10px] text-slate-400 font-mono">
                                        {t.time || 'Waktu loket'}
                                      </div>
                                    </td>
                                    <td className="py-2.5 px-3">
                                      <span className="font-mono text-[11px] text-slate-300">
                                        {t.transactionNo}
                                      </span>
                                      <div className="text-[10px] text-slate-500">
                                        {t.notes || 'Penarikan Jajan Harian'}
                                      </div>
                                    </td>
                                    <td className="py-2.5 px-3 text-right">
                                      <span className="font-black text-rose-400 font-mono-numbers">
                                        - {formatRupiah(t.amount)}
                                      </span>
                                      <div className="text-[9px] text-rose-400/80">Jajan Harian</div>
                                    </td>
                                    <td className="py-2.5 px-3 text-right">
                                      <span className={`font-bold font-mono-numbers ${isLatest ? 'text-emerald-300 font-black text-sm' : 'text-slate-200'}`}>
                                        {formatRupiah(t.balanceAfter)}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })
                            ) : (
                              <tr>
                                <td colSpan={4} className="py-6 text-center text-slate-500 text-xs">
                                  Tidak ada riwayat penarikan jajan santri pada rentang tanggal {formatDateIndo(startDate)} s/d {formatDateIndo(endDate)}.
                                </td>
                              </tr>
                            )}
                          </tbody>
                          {santriWithdrawals.length > 0 && (
                            <tfoot className="bg-slate-800/95 border-t-2 border-emerald-500/40 text-xs">
                              <tr>
                                <td colSpan={2} className="py-3 px-3 text-slate-300">
                                  <div className="flex items-center space-x-1.5">
                                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                                    <span className="font-bold text-white uppercase text-[11px] tracking-wider">
                                      Saldo Sisa Terakhir Santri Saat Ini
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-slate-400 mt-0.5">
                                    (Dilihat dari transaksi terakhir paling bawah)
                                  </div>
                                </td>
                                <td className="py-3 px-3 text-right">
                                  <div className="text-[10px] text-slate-400">Total Periode:</div>
                                  <div className="font-mono font-bold text-rose-300">
                                    - {formatRupiah(totalWithdrawalPeriod)}
                                  </div>
                                </td>
                                <td className="py-3 px-3 text-right">
                                  <div className="text-[10px] text-emerald-400 font-semibold">Sisa Saldo Terakhir:</div>
                                  <div className="font-mono text-base font-black text-emerald-300">
                                    {formatRupiah(activeSantri.balance)}
                                  </div>
                                </td>
                              </tr>
                            </tfoot>
                          )}
                        </table>
                      </div>
                    </div>
                  </div>

                </div>
              ) : hasSearchQuery ? (
                <div className="p-8 text-center bg-slate-900/90 rounded-2xl border border-slate-700/80 space-y-3">
                  <div className="w-12 h-12 mx-auto rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-white">
                      Santri Tidak Ditemukan
                    </h3>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      Tidak ada santri yang sesuai dengan kriteria yang dimasukkan. Pastikan ejaan Nama, No. Rekening, atau NIS sudah benar.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedSantriId('');
                    }}
                    className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
                  >
                    Reset & Coba Lagi
                  </button>
                </div>
              ) : (
                <div className="p-8 text-center bg-slate-900/40 rounded-2xl border border-dashed border-slate-700/80 space-y-3">
                  <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                    <Search className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-white">
                      Cari Data Santri / Anak Anda
                    </h3>
                    <p className="text-xs text-slate-400 max-w-md mx-auto">
                      Silakan ketik <strong className="text-emerald-400">nama / No rekening / NIS / NISN</strong> pada kolom pencarian di atas untuk memantau saldo dan riwayat uang jajan santri.
                    </p>
                  </div>
                  <div className="pt-2 flex flex-wrap justify-center items-center gap-2 text-[11px] text-slate-400">
                    <span className="px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700/80 flex items-center gap-1">
                      <Lock className="w-3 h-3 text-sky-400" />
                      <span>Mode Read-Only (Aman & Privat)</span>
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700/80 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-400" />
                      <span>Terhubung Cloud Realtime</span>
                    </span>
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* ======================================================== */}
          {/* SISI KANAN: PORTAL LOGIN (5 COLS) */}
          {/* ======================================================== */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-gradient-to-b from-slate-800/95 to-slate-850/95 backdrop-blur-md rounded-2xl p-6 sm:p-7 border border-slate-700/80 shadow-2xl space-y-6">
              
              {/* Header Box - Bersih: Hanya "Login" */}
              <div className="space-y-1.5 pb-4 border-b border-slate-700/80">
                <h2 className="text-xl font-black text-white tracking-tight">
                  Login
                </h2>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Silakan masukkan akun Anda untuk mengakses sistem.
                </p>
              </div>

              {/* Login State: Authenticated Session vs Clean Form */}
              {currentUser ? (
                <div className="p-5 rounded-2xl bg-emerald-950/60 border border-emerald-800/80 space-y-4">
                  <div className="flex items-center space-x-3.5">
                    {currentUser.photoURL ? (
                      <img
                        src={currentUser.photoURL}
                        alt={currentUser.displayName || 'Pengguna'}
                        className="w-12 h-12 rounded-full border-2 border-emerald-400 object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-lg font-mono shadow-inner">
                        {(currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span className="text-xs font-bold text-emerald-300">
                          Sesi Aktif
                        </span>
                      </div>
                      <p className="text-sm font-black text-white truncate">
                        {currentUser.displayName || 'Pengguna'}
                      </p>
                      <p className="text-xs text-slate-300 font-mono truncate">
                        {currentUser.email}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 flex flex-col gap-2.5">
                    <button
                      onClick={onEnterDashboard}
                      className="w-full py-2.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-emerald-950/50 transition-all flex items-center justify-center space-x-2 cursor-pointer"
                    >
                      <span>Masuk</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={onSignOut}
                      className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition-colors flex items-center justify-center space-x-1.5 cursor-pointer border border-slate-700"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Keluar (Logout)</span>
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleFormLogin} className="space-y-4">
                  <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-700/80 space-y-4 shadow-inner">
                    <div className="flex items-center space-x-2 pb-2 border-b border-slate-800 text-xs font-bold text-slate-200">
                      <KeyRound className="w-4 h-4 text-emerald-400" />
                      <span>Form Login Kredensial</span>
                    </div>

                    {/* Field 1: Username / Email */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-slate-300">
                        Username / Email
                      </label>
                      <div className="relative flex items-center">
                        <div className="absolute left-3.5 text-slate-400 pointer-events-none">
                          <Mail className="w-4 h-4 text-emerald-400" />
                        </div>
                        <input
                          type="text"
                          placeholder="Masukkan username atau email..."
                          value={loginUsername}
                          onChange={(e) => {
                            setLoginUsername(e.target.value);
                            if (loginError) setLoginError('');
                          }}
                          className="w-full pl-10 pr-3 py-2.5 bg-slate-800 border border-slate-700 focus:border-emerald-500 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40 font-medium transition-all"
                          autoComplete="username"
                          required
                        />
                      </div>
                    </div>

                    {/* Field 2: Password */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-slate-300">
                        Password
                      </label>
                      <div className="relative flex items-center">
                        <div className="absolute left-3.5 text-slate-400 pointer-events-none">
                          <Lock className="w-4 h-4 text-amber-400" />
                        </div>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Masukkan password..."
                          value={loginPassword}
                          onChange={(e) => {
                            setLoginPassword(e.target.value);
                            if (loginError) setLoginError('');
                          }}
                          className="w-full pl-10 pr-10 py-2.5 bg-slate-800 border border-slate-700 focus:border-emerald-500 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40 font-medium transition-all"
                          autoComplete="current-password"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer p-1"
                          aria-label={showPassword ? 'Sembunyikan password' : 'Lihat password'}
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Error Box */}
                    {loginError && (
                      <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start space-x-2 text-rose-300 text-xs animate-shake">
                        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                        <span className="font-medium">{loginError}</span>
                      </div>
                    )}

                    {/* Success Box */}
                    {loginSuccess && (
                      <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center space-x-2 text-emerald-300 text-xs">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span className="font-bold">Login Berhasil! Mengalihkan...</span>
                      </div>
                    )}

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={loginSuccess}
                      className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-emerald-950/50 transition-all flex items-center justify-center space-x-2 cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-75 disabled:cursor-not-allowed"
                    >
                      <LogIn className="w-4 h-4" />
                      <span>Masuk</span>
                    </button>
                  </div>

                  {/* Privacy & Security Note */}
                  <div className="pt-2 text-center">
                    <p className="text-[11px] text-slate-500 flex items-center justify-center gap-1.5 font-medium">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500/80" />
                      <span>Privasi Terjaga • Akses Terbatas Khusus Bendahara Pesantren</span>
                    </p>
                  </div>
                </form>
              )}

            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950 py-6 text-slate-500 text-xs mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <Building2 className="w-4 h-4 text-emerald-500" />
            <p className="text-slate-400">
              <strong>{pesantrenProfile.formalName}</strong> • {pesantrenProfile.address}
            </p>
          </div>
          <p className="text-[11px] text-slate-500">
            Sistem Informasi Keuangan Pesantren Syariah & Kas Titipan Santri
          </p>
        </div>
      </footer>
    </div>
  );
};
