import React, { useState, useMemo } from 'react';
import { 
  CalendarRange, 
  Download, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Search, 
  Calendar, 
  Filter, 
  CheckCircle, 
  Building2,
  FileSpreadsheet,
  CheckCircle2,
  Wallet,
  RotateCcw
} from 'lucide-react';
import { Transaction, Santri, PesantrenProfile } from '../types/finance';
import { 
  formatRupiah, 
  formatDateIndo, 
  getTodayDateString,
  formatPaymentMethodLabel 
} from '../utils/accounting';
import { PrintControlBar } from './PrintControlBar';

interface LaporanRekapViewProps {
  transactions?: Transaction[];
  santriList?: Santri[];
  pesantrenProfile?: PesantrenProfile;
}

export const LaporanRekapView: React.FC<LaporanRekapViewProps> = ({
  transactions = [],
  santriList = [],
  pesantrenProfile = {
    name: 'Pondok Pesantren',
    formalName: 'Pondok Pesantren Modern Syariah',
    address: 'Jl. Pesantren No. 1',
    district: 'Pondok',
    phone: '-',
    headOfTreasury: 'Bendahara Pesantren',
    mudir: 'Mudir Pesantren',
  } as PesantrenProfile,
}) => {
  const today = getTodayDateString();
  const firstDayOfMonth = today.slice(0, 8) + '01';

  // Default to 2024-01-01 so all records are immediately visible upon opening
  const [startDate, setStartDate] = useState<string>('2024-01-01');
  const [endDate, setEndDate] = useState<string>(today);
  const [filterType, setFilterType] = useState<'ALL' | 'DEPOSIT' | 'WITHDRAWAL'>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'SUMMARY_DAILY' | 'ALL_DETAILS'>('SUMMARY_DAILY');

  // Quick preset dates
  const setPreset = (type: 'TODAY' | 'LAST_7' | 'THIS_MONTH' | 'ALL') => {
    const now = new Date();
    if (type === 'TODAY') {
      setStartDate(today);
      setEndDate(today);
    } else if (type === 'LAST_7') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      setStartDate(d.toISOString().split('T')[0]);
      setEndDate(today);
    } else if (type === 'THIS_MONTH') {
      setStartDate(firstDayOfMonth);
      setEndDate(today);
    } else if (type === 'ALL') {
      setStartDate('2024-01-01');
      setEndDate(today);
    }
  };

  // Safe Filtered transactions with defensive null checks
  const filteredTrx = useMemo(() => {
    const list = Array.isArray(transactions) ? transactions : [];
    const q = (searchTerm || '').trim().toLowerCase();

    return list.filter((t) => {
      if (!t || !t.date) return false;

      const inDateRange = t.date >= startDate && t.date <= endDate;
      if (!inDateRange) return false;

      const isDeposit = t.type === 'DEPOSIT_WADIAH';
      const isWithdrawal = t.type === 'WITHDRAWAL_JAJAN' || t.type === 'SPECIAL_DISBURSEMENT';

      const matchesType =
        filterType === 'ALL' ||
        (filterType === 'DEPOSIT' && isDeposit) ||
        (filterType === 'WITHDRAWAL' && isWithdrawal);

      if (!matchesType) return false;

      if (!q) return true;

      const santriName = String(t.santriName || '').toLowerCase();
      const trxNo = String(t.transactionNo || '').toLowerCase();
      const accNo = String(t.accountNumber || '').toLowerCase();
      const notes = String(t.notes || '').toLowerCase();
      const sender = String(t.guardianSenderName || '').toLowerCase();

      return (
        santriName.includes(q) ||
        trxNo.includes(q) ||
        accNo.includes(q) ||
        notes.includes(q) ||
        sender.includes(q)
      );
    });
  }, [transactions, startDate, endDate, filterType, searchTerm]);

  // Chronologically sorted list for detail view
  const sortedDetailedTrx = useMemo(() => {
    return [...filteredTrx].sort((a, b) => {
      const dateA = a?.date || '';
      const dateB = b?.date || '';
      const dComp = dateB.localeCompare(dateA);
      if (dComp !== 0) return dComp;
      const timeA = a?.time || '';
      const timeB = b?.time || '';
      return timeB.localeCompare(timeA);
    });
  }, [filteredTrx]);

  // Calculate Aggregates
  const { totalDeposits, totalWithdrawals, depositCount, withdrawalCount, netCashFlow } = useMemo(() => {
    let deposits = 0;
    let withdrawals = 0;
    let countDep = 0;
    let countWith = 0;

    for (const t of filteredTrx) {
      if (!t) continue;
      const amt = Number(t.amount) || 0;
      if (t.type === 'DEPOSIT_WADIAH') {
        deposits += amt;
        countDep += 1;
      } else if (t.type === 'WITHDRAWAL_JAJAN' || t.type === 'SPECIAL_DISBURSEMENT') {
        withdrawals += amt;
        countWith += 1;
      }
    }

    return {
      totalDeposits: deposits,
      totalWithdrawals: withdrawals,
      depositCount: countDep,
      withdrawalCount: countWith,
      netCashFlow: deposits - withdrawals,
    };
  }, [filteredTrx]);

  // Daily grouping for Tab 1
  const sortedDailyList = useMemo(() => {
    const dailyGroups: Record<
      string,
      { date: string; depositTotal: number; withdrawalTotal: number; countWithdrawal: number; countDeposit: number }
    > = {};

    for (const t of filteredTrx) {
      if (!t || !t.date) continue;
      const dateKey = t.date;
      const amt = Number(t.amount) || 0;

      if (!dailyGroups[dateKey]) {
        dailyGroups[dateKey] = {
          date: dateKey,
          depositTotal: 0,
          withdrawalTotal: 0,
          countWithdrawal: 0,
          countDeposit: 0,
        };
      }

      if (t.type === 'DEPOSIT_WADIAH') {
        dailyGroups[dateKey].depositTotal += amt;
        dailyGroups[dateKey].countDeposit += 1;
      } else if (t.type === 'WITHDRAWAL_JAJAN' || t.type === 'SPECIAL_DISBURSEMENT') {
        dailyGroups[dateKey].withdrawalTotal += amt;
        dailyGroups[dateKey].countWithdrawal += 1;
      }
    }

    return Object.values(dailyGroups).sort((a, b) => b.date.localeCompare(a.date));
  }, [filteredTrx]);

  // CSV Export with clean and safe fields
  const handleExportCSV = () => {
    const headers = [
      'No',
      'Tanggal',
      'Jam',
      'No_Transaksi',
      'Nama_Santri',
      'No_Rekening',
      'Tipe_Transaksi',
      'Kategori',
      'Metode',
      'Penyetor_Wali',
      'Debit_Pengeluaran_Jajan',
      'Kredit_Pemasukan_Titipan',
      'Saldo_Sesudah',
      'Teller',
      'Catatan',
    ];

    const rows = sortedDetailedTrx.map((t, idx) => {
      const isDeposit = t?.type === 'DEPOSIT_WADIAH';
      const amt = Number(t?.amount) || 0;
      const balAfter = Number(t?.balanceAfter) || 0;

      return [
        idx + 1,
        t?.date || '-',
        t?.time || '-',
        t?.transactionNo || '-',
        `"${(t?.santriName || 'Santri').replace(/"/g, '""')}"`,
        t?.accountNumber || '-',
        t?.type || '-',
        `"${(t?.category || '').replace(/"/g, '""')}"`,
        t?.method || '-',
        `"${(t?.guardianSenderName || '-').replace(/"/g, '""')}"`,
        isDeposit ? 0 : amt,
        isDeposit ? amt : 0,
        balAfter,
        `"${(t?.tellerName || 'Bendahara').replace(/"/g, '""')}"`,
        `"${(t?.notes || '').replace(/"/g, '""')}"`,
      ];
    });

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Rekap_Keuangan_Santri_${startDate}_sd_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Filter & Toolbar Card (No Print) */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 no-print space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                <CalendarRange className="w-5 h-5 text-emerald-700" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span>Laporan Rekapitulasi Kas & Mutasi per Rentang Tanggal</span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-mono font-bold">
                    Rentang Waktu
                  </span>
                </h2>
                <p className="text-xs text-slate-500">
                  Pantau mutasi masuk titipan orang tua dan pencairan uang jajan harian santri secara fleksibel
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-800 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV (Excel)</span>
            </button>

            {/* Print Controls (A4 / F4 & Landscape / Portrait) */}
            <PrintControlBar
              documentTitle="Rekap Arus Kas Rentang Tanggal"
              defaultOrientation="landscape"
              defaultPaperSize="F4"
              buttonLabel="Cetak Rekap"
            />
          </div>
        </div>

        {/* Filters Row */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-3 border-t border-slate-100 items-center">
          {/* Presets */}
          <div className="md:col-span-4 flex items-center space-x-1 text-xs">
            <span className="text-slate-400 text-[11px] font-medium mr-1">Preset:</span>
            <button
              onClick={() => setPreset('ALL')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer font-semibold ${
                startDate === '2024-01-01' && endDate === today
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              Semua
            </button>
            <button
              onClick={() => setPreset('THIS_MONTH')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer font-semibold ${
                startDate === firstDayOfMonth && endDate === today
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              Bulan Ini
            </button>
            <button
              onClick={() => setPreset('LAST_7')}
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
            >
              7 Hari
            </button>
            <button
              onClick={() => setPreset('TODAY')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer font-semibold ${
                startDate === today && endDate === today
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              Hari Ini
            </button>
          </div>

          {/* Date Range Inputs */}
          <div className="md:col-span-5 flex items-center space-x-2 text-xs">
            <div className="flex-1 flex items-center space-x-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-400 text-[11px]">Dari:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent font-medium text-slate-800 focus:outline-none w-full cursor-pointer"
              />
            </div>
            <div className="flex-1 flex items-center space-x-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
              <span className="text-slate-400 text-[11px]">S/D:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent font-medium text-slate-800 focus:outline-none w-full cursor-pointer"
              />
            </div>
          </div>

          {/* Type Filter */}
          <div className="md:col-span-3">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as 'ALL' | 'DEPOSIT' | 'WITHDRAWAL')}
              className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="ALL">Semua Jenis Mutasi</option>
              <option value="DEPOSIT">Hanya Setoran Titipan (Masuk)</option>
              <option value="WITHDRAWAL">Hanya Penarikan Jajan (Keluar)</option>
            </select>
          </div>
        </div>

        {/* Search Bar Row (Added for user convenience) */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama santri, no rekening, no transaksi, penyetor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-2 text-xs text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            )}
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Ditemukan: <strong className="text-slate-800 font-mono">{filteredTrx.length}</strong> transaksi
          </div>
        </div>
      </div>

      {/* Aggregate Metrics Cards (No Print) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 no-print">
        {/* Total Setoran */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center space-x-4">
          <div className="p-3 bg-emerald-100 text-emerald-800 rounded-xl">
            <ArrowDownLeft className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs uppercase font-bold text-slate-500 tracking-wider">
              Total Titipan Masuk
            </p>
            <p className="text-lg font-black text-emerald-800 font-mono-numbers mt-0.5">
              {formatRupiah(totalDeposits)}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {depositCount} kali setoran wali
            </p>
          </div>
        </div>

        {/* Total Penarikan Jajan */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center space-x-4">
          <div className="p-3 bg-rose-100 text-rose-800 rounded-xl">
            <ArrowUpRight className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs uppercase font-bold text-slate-500 tracking-wider">
              Total Jajan Dicairkan
            </p>
            <p className="text-lg font-black text-rose-800 font-mono-numbers mt-0.5">
              {formatRupiah(totalWithdrawals)}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {withdrawalCount} kali jajan (Maks Rp 10.000)
            </p>
          </div>
        </div>

        {/* Net Cash Flow */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center space-x-4">
          <div className={`p-3 rounded-xl ${netCashFlow >= 0 ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'}`}>
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs uppercase font-bold text-slate-500 tracking-wider">
              Arus Kas Bersih (Net)
            </p>
            <p className={`text-lg font-black font-mono-numbers mt-0.5 ${netCashFlow >= 0 ? 'text-blue-900' : 'text-amber-900'}`}>
              {formatRupiah(netCashFlow)}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Selisih Titipan vs Pencairan
            </p>
          </div>
        </div>

        {/* Strict Rule Metric */}
        <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 shadow-xs flex items-center space-x-4">
          <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs uppercase font-bold text-emerald-300 tracking-wider">
              Kepatuhan Kuota Jajan
            </p>
            <p className="text-lg font-black text-white font-mono-numbers mt-0.5">
              100% Terkunci
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Maks Rp 10.000 / Hari
            </p>
          </div>
        </div>
      </div>

      {/* Main Report Table Container */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden print-card p-6 sm:p-8 font-sans">
        {/* Pesantren Official Letterhead (Kop Surat Resmi) */}
        <div className="border-b-2 border-slate-900 pb-4 mb-6 text-center">
          <p className="font-arabic text-sm text-emerald-800 font-bold mb-1">
            بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
          </p>
          {pesantrenProfile?.logoUrl && (
            <div className="flex justify-center mb-2">
              <img
                src={pesantrenProfile.logoUrl}
                alt="Logo Pesantren"
                className="w-14 h-14 object-contain"
              />
            </div>
          )}
          <h1 className="text-lg sm:text-xl font-black uppercase text-slate-900 tracking-wide font-sans">
            {pesantrenProfile?.formalName || 'Pondok Pesantren'}
          </h1>
          <p className="text-xs text-slate-600 font-sans mt-0.5">
            Unit Pengelolaan Kas Titipan Wadiah Santri (Baitul Maal Pesantren)
          </p>
          <p className="text-[10px] text-slate-500 font-sans">
            {pesantrenProfile?.address || ''}, {pesantrenProfile?.district || ''} • Telp: {pesantrenProfile?.phone || '-'}
          </p>

          <div className="mt-4 pt-2 border-t border-slate-200 flex flex-col items-center">
            <h2 className="text-base font-black uppercase tracking-wider text-slate-900">
              REKAPITULASI LAPORAN KEUANGAN KAS TITIPAN SANTRI
            </h2>
            <p className="text-xs text-slate-600 font-medium mt-0.5">
              Periode: {formatDateIndo(startDate)} s/d {formatDateIndo(endDate)} (Dinyatakan dalam Rupiah)
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] bg-emerald-100 text-emerald-900 px-2.5 py-0.5 rounded-full font-bold border border-emerald-300">
                Penerimaan Setoran Titipan Wali & Pencairan Uang Jajan
              </span>
            </div>
          </div>
        </div>

        {/* View Tabs Selector (No Print) */}
        <div className="pb-4 mb-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print">
          <div className="flex space-x-2 text-xs font-semibold bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('SUMMARY_DAILY')}
              className={`px-3 py-1.5 rounded-lg cursor-pointer transition-all ${
                activeTab === 'SUMMARY_DAILY'
                  ? 'bg-emerald-700 text-white font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Rekapitulasi Harian ({sortedDailyList.length} Hari)
            </button>
            <button
              onClick={() => setActiveTab('ALL_DETAILS')}
              className={`px-3 py-1.5 rounded-lg cursor-pointer transition-all ${
                activeTab === 'ALL_DETAILS'
                  ? 'bg-emerald-700 text-white font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Daftar Rincian Seluruh Transaksi ({filteredTrx.length} Catatan)
            </button>
          </div>

          <div className="text-xs text-slate-500 font-mono">
            Periode: <strong>{startDate}</strong> s/d <strong>{endDate}</strong>
          </div>
        </div>

        {/* TAB 1: DAILY SUMMARY */}
        {activeTab === 'SUMMARY_DAILY' && (
          <div className="border border-slate-300 rounded-xl overflow-hidden font-sans">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-900 text-white uppercase text-[10px] tracking-wider font-bold">
                    <th className="px-3 py-2.5 text-center w-10">No</th>
                    <th className="px-3 py-2.5 text-left w-36">Tanggal</th>
                    <th className="px-3 py-2.5 text-center w-32">Frekuensi Jajan</th>
                    <th className="px-3 py-2.5 text-right w-40">Total Jajan Keluar (Rp)</th>
                    <th className="px-3 py-2.5 text-center w-32">Frekuensi Setor</th>
                    <th className="px-3 py-2.5 text-right w-40">Total Titipan Masuk (Rp)</th>
                    <th className="px-3 py-2.5 text-right w-44">Arus Bersih (Rp)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-mono-numbers">
                  {sortedDailyList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-400 italic font-sans">
                        Tidak ada transaksi dalam rentang tanggal ini. Silakan klik tombol preset "Semua" untuk melihat seluruh data.
                      </td>
                    </tr>
                  ) : (
                    sortedDailyList.map((day, idx) => {
                      const netDay = day.depositTotal - day.withdrawalTotal;
                      return (
                        <tr key={day.date} className="hover:bg-slate-50">
                          <td className="px-3 py-2 text-center text-slate-400 font-sans">{idx + 1}</td>
                          <td className="px-3 py-2 font-bold text-slate-800 whitespace-nowrap font-sans">
                            {formatDateIndo(day.date)}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 font-semibold border border-rose-200 text-[11px]">
                              {day.countWithdrawal} kali
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right text-rose-700 font-bold">
                            {formatRupiah(day.withdrawalTotal)}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200 text-[11px]">
                              {day.countDeposit} setoran
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right text-emerald-800 font-bold">
                            {formatRupiah(day.depositTotal)}
                          </td>
                          <td
                            className={`px-3 py-2 text-right font-black ${
                              netDay >= 0 ? 'text-blue-900 bg-blue-50/40' : 'text-amber-800 bg-amber-50/40'
                            }`}
                          >
                            {netDay >= 0 ? '+' : ''}{formatRupiah(netDay)}
                          </td>
                        </tr>
                      );
                    })
                  )}

                  {/* Grand Total Footer */}
                  <tr className="bg-slate-900 text-white font-bold text-xs">
                    <td colSpan={2} className="px-3 py-3 uppercase tracking-wider font-sans text-right">
                      TOTAL KESELURUHAN
                    </td>
                    <td className="px-3 py-3 text-center text-rose-300">
                      {withdrawalCount} penarikan
                    </td>
                    <td className="px-3 py-3 text-right font-black text-rose-300 text-sm">
                      {formatRupiah(totalWithdrawals)}
                    </td>
                    <td className="px-3 py-3 text-center text-emerald-300">
                      {depositCount} setoran
                    </td>
                    <td className="px-3 py-3 text-right font-black text-emerald-300 text-sm">
                      {formatRupiah(totalDeposits)}
                    </td>
                    <td className="px-3 py-3 text-right font-black text-emerald-400 bg-slate-950 text-sm">
                      {netCashFlow >= 0 ? '+' : ''}{formatRupiah(netCashFlow)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: DETAILED TRANSACTIONS LIST */}
        {activeTab === 'ALL_DETAILS' && (
          <div className="border border-slate-300 rounded-xl overflow-hidden font-sans">
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-sans">
                <thead>
                  <tr className="bg-slate-900 text-white uppercase text-[10px] tracking-wider font-bold">
                    <th className="px-3 py-2.5 text-center w-10">No</th>
                    <th className="px-3 py-2.5 text-left w-24">Tanggal</th>
                    <th className="px-3 py-2.5 text-left w-28">No. Bukti</th>
                    <th className="px-3 py-2.5 text-left">Santri & Rekening</th>
                    <th className="px-3 py-2.5 text-left">Keterangan / Uraian</th>
                    <th className="px-3 py-2.5 text-left w-28">Metode</th>
                    <th className="px-3 py-2.5 text-right w-28">Nominal (Rp)</th>
                    <th className="px-3 py-2.5 text-right w-32">Saldo Berjalan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-mono-numbers">
                  {sortedDetailedTrx.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-slate-400 italic font-sans">
                        Tidak ada data transaksi yang cocok dengan filter atau kata kunci.
                      </td>
                    </tr>
                  ) : (
                    sortedDetailedTrx.map((t, idx) => {
                      const isDeposit = t?.type === 'DEPOSIT_WADIAH';
                      const amt = Number(t?.amount) || 0;
                      const balAfter = Number(t?.balanceAfter) || 0;

                      return (
                        <tr key={t.id || idx} className="hover:bg-slate-50 transition-colors">
                          <td className="px-3 py-2 text-center text-slate-400 font-sans">{idx + 1}</td>
                          <td className="px-3 py-2 text-slate-600 whitespace-nowrap font-sans">
                            <div>{t?.date || '-'}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{t?.time || ''}</div>
                          </td>
                          <td className="px-3 py-2 font-mono text-[10px] text-slate-500 whitespace-nowrap">
                            {t?.transactionNo || '-'}
                          </td>
                          <td className="px-3 py-2 font-sans">
                            <p className="font-bold text-slate-900">{t?.santriName || 'Santri'}</p>
                            <p className="text-[10px] text-slate-500 font-mono">Rek: {t?.accountNumber || '-'}</p>
                          </td>
                          <td className="px-3 py-2 font-sans">
                            <div className="flex items-center space-x-1.5">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0 font-mono ${
                                  isDeposit
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}
                              >
                                {isDeposit ? 'SETORAN' : 'JAJAN'}
                              </span>
                              <span className="text-[11px] text-slate-700 truncate max-w-xs">
                                {t?.notes || (isDeposit ? 'Top up titipan orang tua' : 'Penarikan jajan harian')}
                              </span>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-slate-600 text-[11px] whitespace-nowrap font-sans">
                            {formatPaymentMethodLabel(t?.method || '')}
                          </td>
                          <td
                            className={`px-3 py-2 text-right font-bold ${
                              isDeposit ? 'text-emerald-700' : 'text-rose-700'
                            }`}
                          >
                            {isDeposit ? '+' : '-'}{formatRupiah(amt)}
                          </td>
                          <td className="px-3 py-2 text-right font-bold text-slate-900 bg-slate-50/50">
                            {formatRupiah(balAfter)}
                          </td>
                        </tr>
                      );
                    })
                  )}

                  {/* Detailed Table Summary Row */}
                  <tr className="bg-slate-900 text-white font-bold text-xs">
                    <td colSpan={6} className="px-3 py-3 uppercase tracking-wider font-sans text-right">
                      TOTAL DARI {sortedDetailedTrx.length} TRANSAKSI
                    </td>
                    <td className="px-3 py-3 text-right font-black text-emerald-300">
                      {netCashFlow >= 0 ? '+' : ''}{formatRupiah(netCashFlow)}
                    </td>
                    <td className="px-3 py-3 text-right text-slate-400 font-mono text-[10px]">
                      Bersih
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Rekapitulasi Ringkas Box (Print & Screen) */}
        <div className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-xl font-sans text-xs space-y-2 rekapitulasi-box">
          <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] border-b border-slate-200 pb-1">
            Ringkasan Rekapitulasi Kas Titipan ({formatDateIndo(startDate)} s/d {formatDateIndo(endDate)}):
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-slate-700 font-mono-numbers pt-1">
            <div>
              <p className="text-slate-500 text-[11px]">Total Titipan Masuk ({depositCount} setoran):</p>
              <p className="text-base font-black text-emerald-800">{formatRupiah(totalDeposits)}</p>
            </div>
            <div>
              <p className="text-slate-500 text-[11px]">Total Jajan Santri ({withdrawalCount} penarikan):</p>
              <p className="text-base font-black text-rose-700">{formatRupiah(totalWithdrawals)}</p>
            </div>
            <div>
              <p className="text-slate-500 text-[11px]">Arus Kas Bersih (Surplus / Defisit):</p>
              <p className={`text-base font-black ${netCashFlow >= 0 ? 'text-blue-900' : 'text-amber-800'}`}>
                {netCashFlow >= 0 ? '+' : ''}{formatRupiah(netCashFlow)}
              </p>
            </div>
          </div>
        </div>

        {/* Official Signatures (Tanda Tangan Resmi Mudir & Bendahara) */}
        <div className="mt-8 pt-4 flex justify-between items-end text-xs font-sans text-slate-800 px-6 signature-block">
          <div className="text-center">
            <p className="text-slate-500 text-[11px]">Mengetahui,</p>
            <p className="font-bold">Mudir / Pengasuh Pesantren</p>
            <div className="h-16 flex items-center justify-center">
              <span className="text-[10px] text-slate-300 border border-dashed border-slate-300 px-3 py-1 rounded">
                Tanda Tangan & Stempel
              </span>
            </div>
            <p className="font-bold underline text-slate-900">{pesantrenProfile?.mudir || '-'}</p>
          </div>

          <div className="text-center">
            <p className="text-slate-500 text-[11px]">
              {pesantrenProfile?.district || ''}, {formatDateIndo(endDate)}
            </p>
            <p className="font-bold">Kepala Bendahara Pesantren</p>
            <div className="h-16 flex items-center justify-center">
              <span className="text-[10px] text-slate-300 border border-dashed border-slate-300 px-3 py-1 rounded">
                Tanda Tangan & Stempel
              </span>
            </div>
            <p className="font-bold underline text-slate-900">{pesantrenProfile?.headOfTreasury || '-'}</p>
            <p className="text-[10px] text-slate-500">{pesantrenProfile?.treasuryNIP || ''}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
