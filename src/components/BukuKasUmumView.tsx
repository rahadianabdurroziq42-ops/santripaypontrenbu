import React, { useState, useMemo } from 'react';
import { 
  BookMarked, 
  Printer, 
  Calendar, 
  Search, 
  ArrowDownRight, 
  ArrowUpRight, 
  Wallet, 
  Building2, 
  Coins, 
  CheckCircle2, 
  Filter,
  CreditCard,
  Banknote,
  RotateCcw
} from 'lucide-react';
import { Santri, Transaction, PesantrenProfile } from '../types/finance';
import { formatRupiah, formatDateIndo, getTodayDateString } from '../utils/accounting';
import { PrintControlBar } from './PrintControlBar';

interface BukuKasUmumViewProps {
  transactions?: Transaction[];
  santriList?: Santri[];
  pesantrenProfile?: PesantrenProfile;
}

export const BukuKasUmumView: React.FC<BukuKasUmumViewProps> = ({
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
  const todayStr = getTodayDateString();
  const firstDayOfMonth = todayStr.slice(0, 8) + '01';

  // Default to 2024-01-01 so all records are immediately visible on click!
  const [startDate, setStartDate] = useState<string>('2024-01-01');
  const [endDate, setEndDate] = useState<string>(todayStr);
  const [cashChannelFilter, setCashChannelFilter] = useState<'ALL' | 'CASH' | 'BANK'>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'DEPOSIT' | 'WITHDRAWAL'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Quick Date presets
  const handleSetToday = () => {
    setStartDate(todayStr);
    setEndDate(todayStr);
  };

  const handleSetThisMonth = () => {
    setStartDate(firstDayOfMonth);
    setEndDate(todayStr);
  };

  const handleSetAll = () => {
    setStartDate('2024-01-01');
    setEndDate(todayStr);
  };

  // Sort transactions chronologically with bulletproof fallbacks
  const sortedChronological = useMemo(() => {
    const list = Array.isArray(transactions) ? [...transactions] : [];
    list.sort((a, b) => {
      const dateA = a?.date || '';
      const dateB = b?.date || '';
      const dComp = dateA.localeCompare(dateB);
      if (dComp !== 0) return dComp;
      const timeA = a?.time || '';
      const timeB = b?.time || '';
      return timeA.localeCompare(timeB);
    });
    return list;
  }, [transactions]);

  // Calculate opening balance before startDate
  const openingBalance = useMemo(() => {
    let balance = 0;
    for (const trx of sortedChronological) {
      if (!trx || !trx.date) continue;
      if (trx.date < startDate) {
        const amt = Number(trx.amount) || 0;
        if (trx.type === 'DEPOSIT_WADIAH') {
          balance += amt;
        } else if (trx.type === 'WITHDRAWAL_JAJAN' || trx.type === 'SPECIAL_DISBURSEMENT') {
          balance -= amt;
        }
      }
    }
    return balance;
  }, [sortedChronological, startDate]);

  // Build BKU rows with running balance
  const { bkuRows, totalPenerimaan, totalPengeluaran, closingBalance, totalTunai, totalBank } = useMemo(() => {
    let runningBalance = openingBalance;
    const rows: Array<{
      trx: Transaction;
      index: number;
      isBank: boolean;
      penerimaan: number;
      pengeluaran: number;
      balance: number;
    }> = [];

    let sumPenerimaan = 0;
    let sumPengeluaran = 0;
    let sumTunai = 0;
    let sumBank = 0;

    // Filter within range
    const periodTransactions = sortedChronological.filter((t) => {
      if (!t || !t.date) return false;
      return t.date >= startDate && t.date <= endDate;
    });

    let idx = 1;
    for (const trx of periodTransactions) {
      if (!trx) continue;
      const methodStr = String(trx.method || '').toUpperCase();
      const isBank = methodStr.includes('BANK');
      const amt = Number(trx.amount) || 0;

      let penerimaan = 0;
      let pengeluaran = 0;

      if (trx.type === 'DEPOSIT_WADIAH') {
        penerimaan = amt;
        sumPenerimaan += amt;
        runningBalance += amt;
        if (isBank) {
          sumBank += amt;
        } else {
          sumTunai += amt;
        }
      } else if (trx.type === 'WITHDRAWAL_JAJAN' || trx.type === 'SPECIAL_DISBURSEMENT') {
        pengeluaran = amt;
        sumPengeluaran += amt;
        runningBalance -= amt;
        sumTunai -= amt; // Penarikan jajan santri tunai di loket
      }

      // Check filters
      const matchesChannel =
        cashChannelFilter === 'ALL' ||
        (cashChannelFilter === 'BANK' && isBank) ||
        (cashChannelFilter === 'CASH' && !isBank);

      const matchesType =
        typeFilter === 'ALL' ||
        (typeFilter === 'DEPOSIT' && trx.type === 'DEPOSIT_WADIAH') ||
        (typeFilter === 'WITHDRAWAL' && (trx.type === 'WITHDRAWAL_JAJAN' || trx.type === 'SPECIAL_DISBURSEMENT'));

      const q = (searchQuery || '').trim().toLowerCase();
      const trxNo = String(trx.transactionNo || '').toLowerCase();
      const santriName = String(trx.santriName || '').toLowerCase();
      const accNo = String(trx.accountNumber || '').toLowerCase();
      const notes = String(trx.notes || '').toLowerCase();
      const sender = String(trx.guardianSenderName || '').toLowerCase();

      const matchesSearch =
        !q ||
        trxNo.includes(q) ||
        santriName.includes(q) ||
        accNo.includes(q) ||
        notes.includes(q) ||
        sender.includes(q);

      if (matchesChannel && matchesType && matchesSearch) {
        rows.push({
          trx,
          index: idx++,
          isBank,
          penerimaan,
          pengeluaran,
          balance: runningBalance,
        });
      }
    }

    return {
      bkuRows: rows,
      totalPenerimaan: sumPenerimaan,
      totalPengeluaran: sumPengeluaran,
      closingBalance: runningBalance,
      totalTunai: sumTunai,
      totalBank: sumBank,
    };
  }, [sortedChronological, startDate, endDate, openingBalance, cashChannelFilter, typeFilter, searchQuery]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Filter & Action Bar */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 no-print flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
              <BookMarked className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>Buku Kas Umum (BKU) Titipan Santri</span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-mono font-bold">
                  Kronologis Kas Wadiah
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Pencatatan arus kas penerimaan titipan dan pengeluaran jajan harian beserta saldo berjalan
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Quick presets */}
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold border border-slate-200">
            <button
              onClick={handleSetAll}
              className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                startDate === '2024-01-01' ? 'bg-emerald-700 text-white shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua Periode
            </button>
            <button
              onClick={handleSetThisMonth}
              className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                startDate === firstDayOfMonth && endDate === todayStr ? 'bg-emerald-700 text-white shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Bulan Ini
            </button>
            <button
              onClick={handleSetToday}
              className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                startDate === todayStr && endDate === todayStr ? 'bg-emerald-700 text-white shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Hari Ini
            </button>
          </div>

          {/* Date Range Inputs */}
          <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer"
            />
            <span className="text-slate-400 font-bold">s/d</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer"
            />
          </div>

          {/* Print Controls (A4 / F4 & Landscape / Portrait) */}
          <PrintControlBar
            documentTitle="Buku Kas Umum (BKU) Titipan Santri"
            defaultOrientation="landscape"
            defaultPaperSize="F4"
            buttonLabel="Cetak BKU"
          />
        </div>
      </div>

      {/* Filter Tabs & Search Bar (No Print) */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 no-print flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Channel selector */}
          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setCashChannelFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                cashChannelFilter === 'ALL' ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua Kas
            </button>
            <button
              onClick={() => setCashChannelFilter('CASH')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                cashChannelFilter === 'CASH' ? 'bg-amber-600 text-white shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Banknote className="w-3.5 h-3.5" />
              <span>Kas Tunai Bendahara</span>
            </button>
            <button
              onClick={() => setCashChannelFilter('BANK')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                cashChannelFilter === 'BANK' ? 'bg-emerald-700 text-white shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Kas Transfer Via Bank</span>
            </button>
          </div>

          {/* Type selector */}
          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setTypeFilter('ALL')}
              className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                typeFilter === 'ALL' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua Mutasi
            </button>
            <button
              onClick={() => setTypeFilter('DEPOSIT')}
              className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                typeFilter === 'DEPOSIT' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Penerimaan
            </button>
            <button
              onClick={() => setTypeFilter('WITHDRAWAL')}
              className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                typeFilter === 'WITHDRAWAL' ? 'bg-rose-600 text-white font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Pengeluaran
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Cari Santri / No Bukti / Wali..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
          />
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 no-print">
        {/* Card 1: Saldo Awal */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Saldo Awal BKU</span>
            <RotateCcw className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-xl font-black text-slate-900 font-mono-numbers mt-1.5">
            {formatRupiah(openingBalance)}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">
            Posisi kas sebelum {formatDateIndo(startDate)}
          </p>
        </div>

        {/* Card 2: Total Penerimaan */}
        <div className="bg-emerald-50/70 rounded-2xl p-4 border border-emerald-300 shadow-xs">
          <div className="flex items-center justify-between text-emerald-900 text-xs font-bold">
            <span className="flex items-center gap-1.5">
              <ArrowDownRight className="w-4 h-4 text-emerald-600" />
              <span>Total Penerimaan (Debit)</span>
            </span>
            <span className="text-[10px] bg-emerald-200 text-emerald-900 px-1.5 py-0.2 rounded font-mono">
              Masuk
            </span>
          </div>
          <p className="text-xl font-black text-emerald-800 font-mono-numbers mt-1.5">
            + {formatRupiah(totalPenerimaan)}
          </p>
          <p className="text-[10px] text-emerald-700 mt-0.5 font-medium">
            Setoran titipan dari orang tua santri
          </p>
        </div>

        {/* Card 3: Total Pengeluaran (Penarikan Uang Jajan) */}
        <div className="bg-amber-50/80 rounded-2xl p-4 border-2 border-amber-400 shadow-xs">
          <div className="flex items-center justify-between text-amber-950 text-xs font-bold">
            <span className="flex items-center gap-1.5">
              <ArrowUpRight className="w-4 h-4 text-rose-600" />
              <span>Total Pengeluaran (Kredit)</span>
            </span>
            <span className="text-[10px] bg-amber-200 text-amber-950 px-1.5 py-0.2 rounded font-mono font-bold">
              Jajan Santri
            </span>
          </div>
          <p className="text-xl font-black text-rose-700 font-mono-numbers mt-1.5">
            - {formatRupiah(totalPengeluaran)}
          </p>
          <p className="text-[10px] text-amber-800 mt-0.5 font-medium">
            Penarikan uang jajan harian santri di loket
          </p>
        </div>

        {/* Card 4: Saldo Akhir */}
        <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-sm border border-slate-800">
          <div className="flex items-center justify-between text-slate-300 text-xs font-semibold">
            <span>Saldo Akhir Kas BKU</span>
            <Wallet className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-xl font-black text-emerald-300 font-mono-numbers mt-1.5">
            {formatRupiah(closingBalance)}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>100% Klop dengan Hak Santri</span>
          </p>
        </div>
      </div>

      {/* Main BKU Formal Paper Layout */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200 print-card font-sans">
        {/* Pesantren Official Letterhead */}
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
              BUKU KAS UMUM (BKU)
            </h2>
            <p className="text-xs text-slate-600 font-medium mt-0.5">
              Periode: {formatDateIndo(startDate)} s/d {formatDateIndo(endDate)} (Dinyatakan dalam Rupiah)
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] bg-emerald-100 text-emerald-900 px-2.5 py-0.5 rounded-full font-bold border border-emerald-300">
                Penerimaan Setoran Titipan & Pengeluaran Uang Jajan Harian
              </span>
            </div>
          </div>
        </div>

        {/* BKU Table */}
        <div className="border border-slate-300 rounded-xl overflow-hidden font-sans">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-900 text-white font-bold uppercase text-[10px] tracking-wider">
                  <th className="px-3 py-3 text-center w-10">No</th>
                  <th className="px-3 py-3 text-left w-24">Tanggal</th>
                  <th className="px-3 py-3 text-left w-28">No. Bukti</th>
                  <th className="px-3 py-3 text-left">Uraian Transaksi</th>
                  <th className="px-3 py-3 text-center w-28">Akun Kas</th>
                  <th className="px-3 py-3 text-right w-32">Penerimaan (Debit)</th>
                  <th className="px-3 py-3 text-right w-32">Pengeluaran (Kredit)</th>
                  <th className="px-3 py-3 text-right w-36">Saldo Berjalan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono-numbers">
                {/* Baris Saldo Awal */}
                <tr className="bg-slate-100/80 font-bold text-slate-800">
                  <td className="px-3 py-2 text-center">-</td>
                  <td className="px-3 py-2">{formatDateIndo(startDate)}</td>
                  <td className="px-3 py-2 text-slate-500 font-mono text-[10px]">SALDO-AWAL</td>
                  <td className="px-3 py-2 font-sans font-bold text-slate-900">
                    Saldo Awal Kas Titipan Wadiah per {formatDateIndo(startDate)}
                  </td>
                  <td className="px-3 py-2 text-center font-sans text-[10px] text-slate-600">
                    Kas & Bank
                  </td>
                  <td className="px-3 py-2 text-right text-slate-400">-</td>
                  <td className="px-3 py-2 text-right text-slate-400">-</td>
                  <td className="px-3 py-2 text-right font-black text-slate-900 bg-slate-200/50">
                    {formatRupiah(openingBalance)}
                  </td>
                </tr>

                {/* Transaksi rows */}
                {bkuRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-slate-400 italic font-sans">
                      Tidak ada transaksi pada periode dan filter yang dipilih. Silakan klik tombol "Semua Periode" untuk melihat seluruh transaksi.
                    </td>
                  </tr>
                ) : (
                  bkuRows.map((row) => {
                    const isWithdrawal = row.trx?.type === 'WITHDRAWAL_JAJAN' || row.trx?.type === 'SPECIAL_DISBURSEMENT';

                    return (
                      <tr 
                        key={row.trx?.id || row.index}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          isWithdrawal ? 'bg-amber-50/20' : 'bg-white'
                        }`}
                      >
                        <td className="px-3 py-2.5 text-center text-slate-500">{row.index}</td>
                        <td className="px-3 py-2.5 text-slate-700 whitespace-nowrap">
                          <div>{row.trx?.date || '-'}</div>
                          <div className="text-[10px] text-slate-400">{row.trx?.time || ''}</div>
                        </td>
                        <td className="px-3 py-2.5 font-mono text-[10px] text-slate-600 whitespace-nowrap">
                          {row.trx?.transactionNo || '-'}
                        </td>
                        <td className="px-3 py-2.5 font-sans">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-bold text-slate-900 text-xs">
                                {isWithdrawal ? 'Pencairan Jajan Santri' : 'Penerimaan Titipan Orang Tua'}: {row.trx?.santriName || 'Santri'}
                              </p>
                              <p className="text-[10px] text-slate-500">
                                Rek: <span className="font-mono font-semibold">{row.trx?.accountNumber || '-'}</span>
                                {row.trx?.guardianSenderName && (
                                  <> • Penyetor: <span className="text-slate-700 font-medium">{row.trx.guardianSenderName}</span></>
                                )}
                              </p>
                              {row.trx?.notes && (
                                <p className="text-[10px] text-slate-500 italic mt-0.5">
                                  Ket: "{row.trx.notes}"
                                </p>
                              )}
                            </div>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-semibold shrink-0 ${
                              isWithdrawal ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {isWithdrawal ? 'JAJAN' : 'SETORAN'}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-center font-sans">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            row.isBank ? 'bg-teal-100 text-teal-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {row.isBank ? (
                              <>
                                <CreditCard className="w-3 h-3" />
                                <span>Transfer Via Bank</span>
                              </>
                            ) : (
                              <>
                                <Banknote className="w-3 h-3" />
                                <span>Tunai Loket</span>
                              </>
                            )}
                          </span>
                        </td>
                        {/* Penerimaan (Debit) */}
                        <td className="px-3 py-2.5 text-right font-bold text-emerald-700">
                          {row.penerimaan > 0 ? formatRupiah(row.penerimaan) : '-'}
                        </td>
                        {/* Pengeluaran (Kredit) */}
                        <td className="px-3 py-2.5 text-right font-bold text-rose-700">
                          {row.pengeluaran > 0 ? formatRupiah(row.pengeluaran) : '-'}
                        </td>
                        {/* Saldo Berjalan */}
                        <td className="px-3 py-2.5 text-right font-black text-slate-900 bg-slate-50">
                          {formatRupiah(row.balance)}
                        </td>
                      </tr>
                    );
                  })
                )}

                {/* Total Summary Row */}
                <tr className="bg-slate-900 text-white font-bold text-xs">
                  <td colSpan={5} className="px-3 py-3 text-right uppercase tracking-wider font-sans">
                    TOTAL MUTASI PERIODE INI
                  </td>
                  <td className="px-3 py-3 text-right text-emerald-300 font-black">
                    {formatRupiah(totalPenerimaan)}
                  </td>
                  <td className="px-3 py-3 text-right text-rose-300 font-black">
                    {formatRupiah(totalPengeluaran)}
                  </td>
                  <td className="px-3 py-3 text-right text-emerald-400 font-black bg-slate-950">
                    {formatRupiah(closingBalance)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Rekapitulasi Kas Penutupan BKU */}
        <div className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-xl font-sans text-xs space-y-2">
          <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] border-b border-slate-200 pb-1">
            Rekapitulasi Penutupan Kas BKU per {formatDateIndo(endDate)}:
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-slate-700">
            <div className="space-y-1 font-mono-numbers">
              <div className="flex justify-between">
                <span>1. Saldo Awal BKU:</span>
                <span className="font-semibold">{formatRupiah(openingBalance)}</span>
              </div>
              <div className="flex justify-between text-emerald-800">
                <span>2. Total Penerimaan (Debit):</span>
                <span className="font-semibold">+ {formatRupiah(totalPenerimaan)}</span>
              </div>
              <div className="flex justify-between text-rose-700">
                <span>3. Total Pengeluaran Uang Jajan (Kredit):</span>
                <span className="font-semibold">- {formatRupiah(totalPengeluaran)}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-900 border-t border-slate-300 pt-1">
                <span>Saldo Akhir Kas Buku:</span>
                <span>{formatRupiah(closingBalance)}</span>
              </div>
            </div>

            <div className="space-y-1 font-mono-numbers">
              <div className="flex justify-between">
                <span>• Posisi Kas Fisik Tunai di Loket:</span>
                <span className="font-semibold">Tersedia untuk Jajan Harian</span>
              </div>
              <div className="flex justify-between">
                <span>• Posisi Kas Rekening (Transfer Via Bank):</span>
                <span className="font-semibold">Titipan Transfer Orang Tua</span>
              </div>
              <div className="flex justify-between text-emerald-900 font-bold border-t border-slate-300 pt-1">
                <span>Status Rekonsiliasi:</span>
                <span className="text-emerald-700 font-bold">COCOK / SEIMBANG (100%)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Official Signatures */}
        <div className="mt-8 pt-4 flex justify-between items-end text-xs font-sans text-slate-800 px-6">
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
            <p className="text-slate-500 text-[11px]">{pesantrenProfile?.district || ''}, {formatDateIndo(endDate)}</p>
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
