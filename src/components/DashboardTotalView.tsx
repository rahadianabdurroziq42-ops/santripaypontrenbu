import React, { useMemo } from 'react';
import { 
  LayoutDashboard, 
  Wallet, 
  Landmark, 
  HandCoins, 
  Users, 
  CheckCircle2, 
  ArrowDownLeft, 
  ArrowUpRight, 
  PlusCircle, 
  MinusCircle, 
  Coins, 
  ShieldCheck, 
  Scale, 
  Sparkles,
  ShoppingBag,
  GraduationCap,
  Calendar,
  Clock,
  ArrowRight
} from 'lucide-react';
import { Santri, Transaction, PesantrenProfile, AuthUser } from '../types/finance';
import { 
  formatRupiah, 
  formatDateIndo, 
  getTodayDateString, 
  checkDailyAllowanceEligibility 
} from '../utils/accounting';
import { User } from 'firebase/auth';

interface DashboardTotalViewProps {
  santriList: Santri[];
  transactions: Transaction[];
  pesantrenProfile: PesantrenProfile;
  totalWadiah: number;
  currentUser: AuthUser | User | null;
  userRole?: 'PENGURUS' | 'BENDAHARA';
  isCloudConnected: boolean;
  onNavigateTab: (tabId: string) => void;
  onOpenDeposit: () => void;
  onOpenTellerForSantri: (santriId: string) => void;
}

export const DashboardTotalView: React.FC<DashboardTotalViewProps> = ({
  santriList,
  transactions,
  pesantrenProfile,
  totalWadiah,
  currentUser,
  userRole = 'PENGURUS',
  isCloudConnected,
  onNavigateTab,
  onOpenDeposit,
  onOpenTellerForSantri,
}) => {
  const todayStr = getTodayDateString();

  // 1. Akumulasi Semua Total Finansial
  const totals = useMemo(() => {
    // Setoran
    const setoranTitipanTrx = transactions.filter((t) => t.type === 'DEPOSIT_WADIAH');
    const totalSetoranTitipan = setoranTitipanTrx.reduce((sum, t) => sum + t.amount, 0);

    const setoranSPPTrx = transactions.filter((t) => t.type === 'DEPOSIT_SPP');
    const totalSetoranSPP = setoranSPPTrx.reduce((sum, t) => sum + t.amount, 0);

    const totalSetoran = totalSetoranTitipan + totalSetoranSPP;
    const totalTrxSetoran = setoranTitipanTrx.length + setoranSPPTrx.length;

    // Penarikan
    const penarikanJajanTrx = transactions.filter((t) => t.type === 'WITHDRAWAL_JAJAN');
    const totalPenarikanJajan = penarikanJajanTrx.reduce((sum, t) => sum + t.amount, 0);

    const penarikanKebutuhanTrx = transactions.filter((t) => t.type === 'WITHDRAWAL_OTHER' || t.type === 'SPECIAL_DISBURSEMENT');
    const totalPenarikanKebutuhan = penarikanKebutuhanTrx.reduce((sum, t) => sum + t.amount, 0);

    const penarikanSPPTrx = transactions.filter((t) => t.type === 'WITHDRAWAL_SPP');
    const totalPenarikanSPP = penarikanSPPTrx.reduce((sum, t) => sum + t.amount, 0);

    const totalPenarikan = totalPenarikanJajan + totalPenarikanKebutuhan + totalPenarikanSPP;
    const totalTrxPenarikan = penarikanJajanTrx.length + penarikanKebutuhanTrx.length + penarikanSPPTrx.length;

    // Saldo Akhir Kas Terpadu (Rumus Terpadu: Setoran - Penarikan)
    const saldoAkhirKas = totalSetoran - totalPenarikan;

    // Transaksi Hari Ini
    const todayTrx = transactions.filter((t) => t.date === todayStr);
    const todaySetoran = todayTrx
      .filter((t) => t.type === 'DEPOSIT_WADIAH' || t.type === 'DEPOSIT_SPP')
      .reduce((sum, t) => sum + t.amount, 0);
    const todayPenarikan = todayTrx
      .filter((t) => t.type === 'WITHDRAWAL_JAJAN' || t.type === 'WITHDRAWAL_OTHER' || t.type === 'WITHDRAWAL_SPP')
      .reduce((sum, t) => sum + t.amount, 0);
    const todayNetCash = todaySetoran - todayPenarikan;

    return {
      totalSetoranTitipan,
      countSetoranTitipan: setoranTitipanTrx.length,
      totalSetoranSPP,
      countSetoranSPP: setoranSPPTrx.length,
      totalSetoran,
      totalTrxSetoran,

      totalPenarikanJajan,
      countPenarikanJajan: penarikanJajanTrx.length,
      totalPenarikanKebutuhan,
      countPenarikanKebutuhan: penarikanKebutuhanTrx.length,
      totalPenarikanSPP,
      countPenarikanSPP: penarikanSPPTrx.length,
      totalPenarikan,
      totalTrxPenarikan,

      saldoAkhirKas,

      todaySetoran,
      todayPenarikan,
      todayNetCash,
      todayCount: todayTrx.length,
    };
  }, [transactions, todayStr]);

  // 2. Statistik Santri
  const santriStats = useMemo(() => {
    const totalSantri = santriList.length;
    const activeSantri = santriList.filter((s) => s.status === 'AKTIF').length;
    const frozenSantri = santriList.filter((s) => s.status === 'DIBEKUKAN').length;

    const alreadyTakenJajanToday = santriList.filter((s) => {
      const el = checkDailyAllowanceEligibility(s, transactions, todayStr);
      return el.status === 'ALREADY_TAKEN';
    }).length;

    const readyForJajanToday = totalSantri - alreadyTakenJajanToday;

    const avgBalance = totalSantri > 0 ? Math.round(totalWadiah / totalSantri) : 0;
    const highestBalance = santriList.reduce((max, s) => Math.max(max, s.balance), 0);
    const lowestBalance = santriList.reduce((min, s) => Math.min(min, s.balance), Infinity);

    return {
      totalSantri,
      activeSantri,
      frozenSantri,
      alreadyTakenJajanToday,
      readyForJajanToday,
      avgBalance,
      highestBalance: highestBalance === -Infinity ? 0 : highestBalance,
      lowestBalance: lowestBalance === Infinity ? 0 : lowestBalance,
    };
  }, [santriList, transactions, todayStr, totalWadiah]);

  // 3. Mutasi 8 Transaksi Terbaru
  const recentTransactions = useMemo(() => {
    return [...transactions].slice(0, 8);
  }, [transactions]);

  return (
    <div className="space-y-6">
      {/* HEADER UTAMA: DASHBOARD SEMUA TOTAL */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 rounded-2xl p-6 text-white shadow-xl border border-emerald-800/60 relative overflow-hidden">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-emerald-300 font-mono font-semibold">
                {formatDateIndo(todayStr)}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-white flex items-center gap-2.5">
              <LayoutDashboard className="w-7 h-7 text-emerald-400" />
              <span>Dashboard</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
              Ikhtisar keuangan kas pesantren, saldo titipan wadiah, rincian setoran, dan penarikan yang terintegrasi secara realtime.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end gap-2 shrink-0">
            {/* Status Akun Pengguna */}
            <div className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-2 ${
              userRole === 'PENGURUS'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-teal-500/20 text-teal-300 border-teal-500/40'
            }`}>
              <ShieldCheck className="w-4 h-4" />
              <span>{userRole === 'PENGURUS' ? 'Pengurus (Akses Penuh)' : 'Bendahara (Loket Kasir)'}</span>
            </div>

            <div className="text-[11px] text-slate-400 flex items-center gap-1.5 font-mono">
              <span className={`w-2 h-2 rounded-full ${isCloudConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
              <span>{isCloudConnected ? 'Cloud Firestore Terhubung' : 'Mode Offline Lokal'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4 KARTU GRAND TOTAL UTAMA (GRID 4 KOLOM) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KARTU 1: SALDO AKHIR KAS TERPADU */}
        <div className="bg-gradient-to-br from-emerald-900 to-teal-950 text-white rounded-2xl p-5 border border-emerald-600/40 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase font-bold tracking-wider text-emerald-300">
              1. Saldo Kas Terpadu
            </span>
            <div className="p-2 bg-emerald-500/20 text-emerald-300 rounded-xl border border-emerald-500/30">
              <Landmark className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-300 font-mono font-mono-numbers mt-2">
            {formatRupiah(totals.saldoAkhirKas)}
          </div>
          <div className="mt-2 pt-2 border-t border-emerald-800/80 text-[10px] text-emerald-200/90 flex justify-between items-center">
            <span>Rumus Kas:</span>
            <span className="font-mono font-semibold">Total Setoran - Penarikan</span>
          </div>
        </div>

        {/* KARTU 2: TOTAL SALDO TITIPAN WADIAH SANTRI */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase font-bold tracking-wider text-slate-500">
              2. Total Tabungan Wadiah
            </span>
            <div className="p-2 bg-teal-100 text-teal-800 rounded-xl">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-teal-800 font-mono font-mono-numbers mt-2">
            {formatRupiah(totalWadiah)}
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-500 flex justify-between items-center">
            <span>Total Saldo Santri:</span>
            <span className="font-semibold text-slate-700">{santriStats.totalSantri} Santri Terdaftar</span>
          </div>
        </div>

        {/* KARTU 3: TOTAL SEMUA SETORAN (UANG MASUK) */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase font-bold tracking-wider text-emerald-600">
              3. Total Semua Setoran
            </span>
            <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-700 font-mono font-mono-numbers mt-2">
            {formatRupiah(totals.totalSetoran)}
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-500 flex justify-between items-center">
            <span>Total Transaksi:</span>
            <span className="font-mono font-semibold text-emerald-700">{totals.totalTrxSetoran}x Pembukuan</span>
          </div>
        </div>

        {/* KARTU 4: TOTAL SEMUA PENARIKAN (UANG KELUAR) */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase font-bold tracking-wider text-rose-600">
              4. Total Semua Penarikan
            </span>
            <div className="p-2 bg-rose-100 text-rose-800 rounded-xl">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-rose-700 font-mono font-mono-numbers mt-2">
            {formatRupiah(totals.totalPenarikan)}
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-500 flex justify-between items-center">
            <span>Total Transaksi:</span>
            <span className="font-mono font-semibold text-rose-700">{totals.totalTrxPenarikan}x Pencairan</span>
          </div>
        </div>
      </div>

      {/* DUA KOLOM BESAR: RINCIAN SEMUA TOTAL SETORAN VS RINCIAN SEMUA TOTAL PENARIKAN */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* KOLOM KIRI: RINCIAN TOTAL SETORAN */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                <PlusCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Rincian Total Setoran Kas (Uang Masuk)
                </h3>
                <p className="text-xs text-slate-500">
                  Akumulasi penerimaan dana dari titipan wali dan pembayaran SPP
                </p>
              </div>
            </div>
            <span className="text-xs font-mono font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
              {formatRupiah(totals.totalSetoran)}
            </span>
          </div>

          <div className="space-y-3">
            {/* Item 1: Setoran Titipan Wadiah */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold">
                  <Coins className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-800">
                    Setoran Uang Saku Titipan (Wadiah)
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Penerimaan dari orang tua/wali untuk uang saku santri ({totals.countSetoranTitipan} transaksi)
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-sm sm:text-base font-black text-teal-800 font-mono font-mono-numbers">
                  {formatRupiah(totals.totalSetoranTitipan)}
                </span>
                <span className="text-[10px] text-teal-600 block font-semibold">
                  {totals.totalSetoran > 0 ? Math.round((totals.totalSetoranTitipan / totals.totalSetoran) * 100) : 0}% dari setoran
                </span>
              </div>
            </div>

            {/* Item 2: Setoran SPP Syahriah */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-800">
                    Setoran Iuran SPP / Syahriah
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Penerimaan pembayaran SPP bulanan santri ({totals.countSetoranSPP} transaksi)
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-sm sm:text-base font-black text-emerald-700 font-mono font-mono-numbers">
                  {formatRupiah(totals.totalSetoranSPP)}
                </span>
                <span className="text-[10px] text-emerald-600 block font-semibold">
                  {totals.totalSetoran > 0 ? Math.round((totals.totalSetoranSPP / totals.totalSetoran) * 100) : 0}% dari setoran
                </span>
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={() => onNavigateTab('setor-titipan')}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
            >
              <span>Buka Form Setoran Titipan</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* KOLOM KANAN: RINCIAN TOTAL PENARIKAN */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 bg-rose-100 text-rose-800 rounded-xl">
                <MinusCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Rincian Total Penarikan Kas (Uang Keluar)
                </h3>
                <p className="text-xs text-slate-500">
                  Pencairan uang jajan, belanja kebutuhan santri, dan potongan SPP
                </p>
              </div>
            </div>
            <span className="text-xs font-mono font-black text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
              {formatRupiah(totals.totalPenarikan)}
            </span>
          </div>

          <div className="space-y-3">
            {/* Item 1: Jajan Harian Santri */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                  <HandCoins className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-800">
                    Uang Jajan Harian Santri
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Batas disiplin Rp 10.000 / hari ({totals.countPenarikanJajan} transaksi)
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-sm sm:text-base font-black text-amber-800 font-mono font-mono-numbers">
                  {formatRupiah(totals.totalPenarikanJajan)}
                </span>
                <span className="text-[10px] text-amber-700 block font-semibold">
                  {totals.totalPenarikan > 0 ? Math.round((totals.totalPenarikanJajan / totals.totalPenarikan) * 100) : 0}% penarikan
                </span>
              </div>
            </div>

            {/* Item 2: Kebutuhan Lainnya (Kitab, Seragam, Obat) */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-800">
                    Kebutuhan Lainnya (Kitab, Obat, Seragam)
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Pencairan kebutuhan khusus santri ({totals.countPenarikanKebutuhan} transaksi)
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-sm sm:text-base font-black text-indigo-800 font-mono font-mono-numbers">
                  {formatRupiah(totals.totalPenarikanKebutuhan)}
                </span>
                <span className="text-[10px] text-indigo-600 block font-semibold">
                  {totals.totalPenarikan > 0 ? Math.round((totals.totalPenarikanKebutuhan / totals.totalPenarikan) * 100) : 0}% penarikan
                </span>
              </div>
            </div>

            {/* Item 3: Penarikan SPP dari Saldo Wadiah */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-800 flex items-center justify-center font-bold">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-800">
                    Penarikan / Auto-Debet SPP
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Potong saldo wadiah santri untuk pelunasan SPP ({totals.countPenarikanSPP} transaksi)
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-sm sm:text-base font-black text-rose-700 font-mono font-mono-numbers">
                  {formatRupiah(totals.totalPenarikanSPP)}
                </span>
                <span className="text-[10px] text-rose-600 block font-semibold">
                  {totals.totalPenarikan > 0 ? Math.round((totals.totalPenarikanSPP / totals.totalPenarikan) * 100) : 0}% penarikan
                </span>
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={() => onNavigateTab('penarikan-jajan')}
              className="text-xs font-bold text-rose-700 hover:text-rose-800 flex items-center gap-1 cursor-pointer"
            >
              <span>Buka Loket Penarikan Jajan</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* STATISTIK ARUS KAS HARI INI & KONTROL DISIPLIN SANTRI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Kolom 1: Arus Kas Masuk Hari Ini */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-emerald-600" />
              <span>Penerimaan Masuk Hari Ini</span>
            </span>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">
              Hari Ini
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-700 font-mono font-mono-numbers">
            + {formatRupiah(totals.todaySetoran)}
          </div>
          <p className="text-[11px] text-slate-500">
            Total penerimaan kas baru yang disetor pada {formatDateIndo(todayStr)}
          </p>
        </div>

        {/* Kolom 2: Arus Kas Keluar Hari Ini */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-rose-600" />
              <span>Pengeluaran Kas Hari Ini</span>
            </span>
            <span className="text-[10px] bg-rose-100 text-rose-800 px-2 py-0.5 rounded font-bold">
              Hari Ini
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-rose-700 font-mono font-mono-numbers">
            - {formatRupiah(totals.todayPenarikan)}
          </div>
          <p className="text-[11px] text-slate-500">
            Total pencairan dana santri yang keluar pada {formatDateIndo(todayStr)}
          </p>
        </div>

        {/* Kolom 3: Disiplin Jajan Santri Hari Ini */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-amber-600" />
              <span>Disiplin Jajan Hari Ini</span>
            </span>
            <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-bold">
              Maks 1x / Hari
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono font-mono-numbers">
            {santriStats.alreadyTakenJajanToday} / {santriStats.totalSantri} Santri
          </div>
          <p className="text-[11px] text-slate-500">
            {santriStats.readyForJajanToday} santri masih memiliki hak penarikan jajan harian hari ini.
          </p>
        </div>
      </div>

      {/* TABEL MUTASI TRANSAKSI TERAKHIR LINTAS AKUN */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Scale className="w-5 h-5 text-emerald-700" />
              <span>Mutasi Transaksi Terakhir (Buku Kas Terpadu)</span>
            </h3>
            <p className="text-xs text-slate-500">
              Riwayat transaksi terkini yang tercatat pada sistem keuangan pesantren
            </p>
          </div>
          <button
            onClick={() => onNavigateTab('bku')}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer self-start sm:self-auto"
          >
            <span>Buka Buku Kas Umum Lengkap</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3 font-semibold">Tanggal & Waktu</th>
                <th className="py-2.5 px-3 font-semibold">No. Transaksi</th>
                <th className="py-2.5 px-3 font-semibold">Nama Santri</th>
                <th className="py-2.5 px-3 font-semibold">Jenis Transaksi</th>
                <th className="py-2.5 px-3 font-semibold text-right">Nominal</th>
                <th className="py-2.5 px-3 font-semibold text-right">Saldo Sesudah</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {recentTransactions.map((t) => {
                const isDeposit = t.type.startsWith('DEPOSIT');
                return (
                  <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="font-semibold text-slate-900">{formatDateIndo(t.date)}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{t.time || 'Loket'}</div>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                      {t.transactionNo}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-900">
                      {t.santriName}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        isDeposit
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-rose-100 text-rose-800 border border-rose-300'
                      }`}>
                        {t.category || t.type}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap font-mono font-bold">
                      <span className={isDeposit ? 'text-emerald-700' : 'text-rose-700'}>
                        {isDeposit ? '+' : '-'} {formatRupiah(t.amount)}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800 whitespace-nowrap">
                      {formatRupiah(t.balanceAfter)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
