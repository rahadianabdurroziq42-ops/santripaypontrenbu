import React, { useState, useMemo } from 'react';
import { 
  BookOpenCheck, 
  Printer, 
  Calendar, 
  Banknote, 
  CreditCard, 
  ShieldCheck, 
  RotateCcw,
  HandCoins,
  CheckCircle2,
  Wallet,
  ArrowRight,
  Filter
} from 'lucide-react';
import { Santri, Transaction, PesantrenProfile } from '../types/finance';
import { formatRupiah, formatDateIndo, getTodayDateString } from '../utils/accounting';
import { PrintControlBar } from './PrintControlBar';

interface BukuKasBesarViewProps {
  transactions?: Transaction[];
  santriList?: Santri[];
  pesantrenProfile?: PesantrenProfile;
}

type MasterAccountKey = 'ALL' | '1-1000' | '1-1010' | '2-1000';

interface LedgerRow {
  date: string;
  time: string;
  refNo: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  santriName?: string;
  accountNumber?: string;
}

export const BukuKasBesarView: React.FC<BukuKasBesarViewProps> = ({
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

  // Default to 2024-01-01 to immediately display all accounts and transactions
  const [startDate, setStartDate] = useState<string>('2024-01-01');
  const [endDate, setEndDate] = useState<string>(todayStr);
  const [selectedAccount, setSelectedAccount] = useState<MasterAccountKey>('ALL');

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

  // Sort chronological with bulletproof safety
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

  // Master Accounts Data Builder
  const accountData = useMemo(() => {
    // 1. Akun 1-1000: Kas Tunai Bendahara
    let kasTunaiOpening = 0;
    for (const trx of sortedChronological) {
      if (!trx || !trx.date) continue;
      const methodStr = String(trx.method || '').toUpperCase();
      const amt = Number(trx.amount) || 0;
      if (trx.date < startDate) {
        if (trx.type === 'DEPOSIT_WADIAH' && !methodStr.includes('BANK')) {
          kasTunaiOpening += amt;
        } else if (trx.type === 'WITHDRAWAL_JAJAN' || trx.type === 'SPECIAL_DISBURSEMENT') {
          kasTunaiOpening -= amt;
        }
      }
    }

    let kasTunaiBalance = kasTunaiOpening;
    let kasTunaiDebit = 0;
    let kasTunaiCredit = 0;
    const kasTunaiRows: LedgerRow[] = [];

    // 2. Akun 1-1010: Kas Rekening Transfer Via Bank
    let kasBankOpening = 0;
    for (const trx of sortedChronological) {
      if (!trx || !trx.date) continue;
      const methodStr = String(trx.method || '').toUpperCase();
      const amt = Number(trx.amount) || 0;
      if (trx.date < startDate) {
        if (trx.type === 'DEPOSIT_WADIAH' && methodStr.includes('BANK')) {
          kasBankOpening += amt;
        }
      }
    }

    let kasBankBalance = kasBankOpening;
    let kasBankDebit = 0;
    let kasBankCredit = 0;
    const kasBankRows: LedgerRow[] = [];

    // 3. Akun 2-1000: Kewajiban Simpanan Wadiah Santri
    let wadiahOpening = 0;
    for (const trx of sortedChronological) {
      if (!trx || !trx.date) continue;
      const amt = Number(trx.amount) || 0;
      if (trx.date < startDate) {
        if (trx.type === 'DEPOSIT_WADIAH') {
          wadiahOpening += amt;
        } else if (trx.type === 'WITHDRAWAL_JAJAN' || trx.type === 'SPECIAL_DISBURSEMENT') {
          wadiahOpening -= amt;
        }
      }
    }

    let wadiahBalance = wadiahOpening;
    let wadiahDebit = 0;
    let wadiahCredit = 0;
    const wadiahRows: LedgerRow[] = [];

    // Process transactions in period
    const periodTransactions = sortedChronological.filter((t) => {
      if (!t || !t.date) return false;
      return t.date >= startDate && t.date <= endDate;
    });

    for (const trx of periodTransactions) {
      if (!trx) continue;
      const methodStr = String(trx.method || '').toUpperCase();
      const isBank = methodStr.includes('BANK');
      const amt = Number(trx.amount) || 0;
      const sName = String(trx.santriName || 'Santri');
      const accNo = String(trx.accountNumber || '-');
      const trxNo = String(trx.transactionNo || '-');

      if (trx.type === 'DEPOSIT_WADIAH') {
        if (isBank) {
          kasBankDebit += amt;
          kasBankBalance += amt;
          kasBankRows.push({
            date: trx.date || '',
            time: trx.time || '',
            refNo: trxNo,
            description: `Penerimaan titipan transfer wali: ${sName} (Rek. ${accNo})`,
            debit: amt,
            credit: 0,
            balance: kasBankBalance,
            santriName: sName,
            accountNumber: accNo,
          });
        } else {
          kasTunaiDebit += amt;
          kasTunaiBalance += amt;
          kasTunaiRows.push({
            date: trx.date || '',
            time: trx.time || '',
            refNo: trxNo,
            description: `Penerimaan titipan tunai loket: ${sName} (Rek. ${accNo})`,
            debit: amt,
            credit: 0,
            balance: kasTunaiBalance,
            santriName: sName,
            accountNumber: accNo,
          });
        }

        // Post to Wadiah Liability (Credit increases liability)
        wadiahCredit += amt;
        wadiahBalance += amt;
        wadiahRows.push({
          date: trx.date || '',
          time: trx.time || '',
          refNo: trxNo,
          description: `Penambahan saldo titipan wadiah: ${sName} [${accNo}]`,
          debit: 0,
          credit: amt,
          balance: wadiahBalance,
          santriName: sName,
          accountNumber: accNo,
        });
      } else if (trx.type === 'WITHDRAWAL_JAJAN' || trx.type === 'SPECIAL_DISBURSEMENT') {
        // Disbursed in cash at loket
        kasTunaiCredit += amt;
        kasTunaiBalance -= amt;
        kasTunaiRows.push({
          date: trx.date || '',
          time: trx.time || '',
          refNo: trxNo,
          description: `Pencairan jajan harian tunai: ${sName} [${accNo}]`,
          debit: 0,
          credit: amt,
          balance: kasTunaiBalance,
          santriName: sName,
          accountNumber: accNo,
        });

        // Debit decreases Wadiah Liability
        wadiahDebit += amt;
        wadiahBalance -= amt;
        wadiahRows.push({
          date: trx.date || '',
          time: trx.time || '',
          refNo: trxNo,
          description: `Pelunasan jajan harian wadiah: ${sName} [${accNo}]`,
          debit: amt,
          credit: 0,
          balance: wadiahBalance,
          santriName: sName,
          accountNumber: accNo,
        });
      }
    }

    return {
      '1-1000': {
        code: '1-1000',
        name: 'Kas Fisik Tunai Bendahara Pesantren',
        type: 'ASET_LANCAR',
        normalBalance: 'DEBIT',
        description: 'Uang fisik tunai di brankas loket jajan untuk pencairan jajan santri harian',
        openingBalance: kasTunaiOpening,
        totalDebit: kasTunaiDebit,
        totalCredit: kasTunaiCredit,
        closingBalance: kasTunaiBalance,
        rows: kasTunaiRows,
      },
      '1-1010': {
        code: '1-1010',
        name: 'Kas Rekening Bank Syariah (Transfer Via Bank)',
        type: 'ASET_LANCAR',
        normalBalance: 'DEBIT',
        description: 'Rekening bank syariah penampung setoran transfer titipan dari wali santri',
        openingBalance: kasBankOpening,
        totalDebit: kasBankDebit,
        totalCredit: kasBankCredit,
        closingBalance: kasBankBalance,
        rows: kasBankRows,
      },
      '2-1000': {
        code: '2-1000',
        name: 'Kewajiban Simpanan Wadiah Titipan Santri',
        type: 'KEWAJIBAN_LANCAR',
        normalBalance: 'KREDIT',
        description: 'Total hak saldo titipan uang saku milik seluruh santri aktif (Akad Wadiah Yad Dhamanah)',
        openingBalance: wadiahOpening,
        totalDebit: wadiahDebit,
        totalCredit: wadiahCredit,
        closingBalance: wadiahBalance,
        rows: wadiahRows,
      },
    };
  }, [sortedChronological, startDate, endDate]);

  const handlePrint = () => {
    window.print();
  };

  const accountsToRender = useMemo(() => {
    if (selectedAccount === 'ALL') {
      return [accountData['1-1000'], accountData['1-1010'], accountData['2-1000']].filter(Boolean);
    }
    return [accountData[selectedAccount]].filter(Boolean);
  }, [selectedAccount, accountData]);

  return (
    <div className="space-y-6">
      {/* Top Filter Bar */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 no-print flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
              <BookOpenCheck className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>Buku Kas Besar (General Ledger Kas & Wadiah)</span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-mono font-bold">
                  Buku Besar Akun
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Pengelompokan mutasi debet, kredit, dan saldo per akun master kas tunai, bank syariah, dan kewajiban wadiah
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

          {/* Date inputs */}
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
            documentTitle="Buku Kas Besar (Ledger Kas & Wadiah)"
            defaultOrientation="landscape"
            defaultPaperSize="F4"
            buttonLabel="Cetak Buku Besar"
          />
        </div>
      </div>

      {/* Account Selector Tabs (No Print) */}
      <div className="bg-white rounded-2xl p-3 shadow-sm border border-slate-200 no-print flex flex-wrap items-center gap-2">
        <button
          onClick={() => setSelectedAccount('ALL')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            selectedAccount === 'ALL'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Semua Akun Buku Besar (3 Akun)
        </button>

        <button
          onClick={() => setSelectedAccount('1-1000')}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            selectedAccount === '1-1000'
              ? 'bg-amber-600 text-white shadow-xs font-bold'
              : 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100'
          }`}
        >
          <Banknote className="w-3.5 h-3.5" />
          <span>1-1000 Kas Fisik Tunai Bendahara</span>
        </button>

        <button
          onClick={() => setSelectedAccount('1-1010')}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            selectedAccount === '1-1010'
              ? 'bg-emerald-700 text-white shadow-xs font-bold'
              : 'bg-emerald-50 text-emerald-900 border border-emerald-200 hover:bg-emerald-100'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>1-1010 Kas Rekening Transfer Via Bank</span>
        </button>

        <button
          onClick={() => setSelectedAccount('2-1000')}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            selectedAccount === '2-1000'
              ? 'bg-teal-800 text-white shadow-xs font-bold'
              : 'bg-teal-50 text-teal-900 border border-teal-200 hover:bg-teal-100'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>2-1000 Kewajiban Simpanan Wadiah</span>
        </button>
      </div>

      {/* KPI Cards: Overview of the 3 Master Accounts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 no-print">
        {/* Account 1 */}
        <div className="bg-white rounded-2xl p-4 border border-amber-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-amber-900 text-xs font-bold">
            <span className="flex items-center gap-1.5">
              <Banknote className="w-4 h-4 text-amber-600" />
              <span>1-1000 Kas Fisik Tunai</span>
            </span>
            <span className="font-mono text-[10px] bg-amber-100 px-1.5 py-0.2 rounded font-bold">
              Loket Jajan
            </span>
          </div>
          <p className="text-xl font-black text-slate-900 font-mono-numbers mt-2">
            {formatRupiah(accountData?.['1-1000']?.closingBalance || 0)}
          </p>
          <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-600 font-mono-numbers flex justify-between">
            <span className="text-emerald-700 font-semibold">Debet: +{formatRupiah(accountData?.['1-1000']?.totalDebit || 0)}</span>
            <span className="text-rose-600 font-semibold">Kredit: -{formatRupiah(accountData?.['1-1000']?.totalCredit || 0)}</span>
          </div>
        </div>

        {/* Account 2 */}
        <div className="bg-white rounded-2xl p-4 border border-emerald-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-emerald-900 text-xs font-bold">
            <span className="flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              <span>1-1010 Kas Transfer Via Bank</span>
            </span>
            <span className="font-mono text-[10px] bg-emerald-100 px-1.5 py-0.2 rounded font-bold">
              Rekening Bank
            </span>
          </div>
          <p className="text-xl font-black text-slate-900 font-mono-numbers mt-2">
            {formatRupiah(accountData?.['1-1010']?.closingBalance || 0)}
          </p>
          <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-600 font-mono-numbers flex justify-between">
            <span className="text-emerald-700 font-semibold">Debet: +{formatRupiah(accountData?.['1-1010']?.totalDebit || 0)}</span>
            <span className="text-slate-400 font-semibold">Kredit: -{formatRupiah(accountData?.['1-1010']?.totalCredit || 0)}</span>
          </div>
        </div>

        {/* Account 3 */}
        <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-sm border border-slate-800">
          <div className="flex items-center justify-between text-emerald-300 text-xs font-bold">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>2-1000 Kewajiban Wadiah</span>
            </span>
            <span className="font-mono text-[10px] bg-emerald-900/80 text-emerald-200 px-1.5 py-0.2 rounded border border-emerald-700">
              Hak Seluruh Santri
            </span>
          </div>
          <p className="text-xl font-black text-emerald-300 font-mono-numbers mt-2">
            {formatRupiah(accountData?.['2-1000']?.closingBalance || 0)}
          </p>
          <div className="mt-2 pt-2 border-t border-slate-800 text-[11px] text-slate-300 font-mono-numbers flex justify-between">
            <span className="text-rose-300 font-semibold">Debet (Jajan): -{formatRupiah(accountData?.['2-1000']?.totalDebit || 0)}</span>
            <span className="text-emerald-300 font-semibold">Kredit (Setor): +{formatRupiah(accountData?.['2-1000']?.totalCredit || 0)}</span>
          </div>
        </div>
      </div>

      {/* Main Print / Report Container */}
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
              BUKU KAS BESAR (BUKU BESAR KAS & WADIAH)
            </h2>
            <p className="text-xs text-slate-600 font-medium mt-0.5">
              Periode: {formatDateIndo(startDate)} s/d {formatDateIndo(endDate)} (Dinyatakan dalam Rupiah)
            </p>
          </div>
        </div>

        {/* Render each Ledger Account */}
        <div className="space-y-8">
          {accountsToRender.map((acc) => (
            <div key={acc.code} className="border border-slate-300 rounded-xl overflow-hidden font-sans">
              {/* Account Header Banner */}
              <div className="bg-slate-900 text-white px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs bg-emerald-700 px-2 py-0.5 rounded font-bold">
                      {acc.code}
                    </span>
                    <h3 className="text-sm font-bold tracking-tight">
                      {acc.name}
                    </h3>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    {acc.description} • Saldo Normal: <strong>{acc.normalBalance}</strong>
                  </p>
                </div>

                <div className="text-right sm:text-right shrink-0">
                  <span className="text-[10px] text-slate-400 block uppercase font-mono">Saldo Akhir Akun</span>
                  <span className="text-base font-black font-mono-numbers text-emerald-300">
                    {formatRupiah(acc.closingBalance)}
                  </span>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 font-bold uppercase text-[10px] tracking-wider border-b border-slate-300">
                      <th className="px-3 py-2.5 text-center w-10">No</th>
                      <th className="px-3 py-2.5 text-left w-24">Tanggal</th>
                      <th className="px-3 py-2.5 text-left w-28">No. Bukti</th>
                      <th className="px-3 py-2.5 text-left">Keterangan / Uraian Transaksi</th>
                      <th className="px-3 py-2.5 text-right w-32">Debet (Rp)</th>
                      <th className="px-3 py-2.5 text-right w-32">Kredit (Rp)</th>
                      <th className="px-3 py-2.5 text-right w-36">Saldo Berjalan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-mono-numbers">
                    {/* Saldo Awal Akun */}
                    <tr className="bg-slate-50 font-bold text-slate-700">
                      <td className="px-3 py-2 text-center">-</td>
                      <td className="px-3 py-2">{formatDateIndo(startDate)}</td>
                      <td className="px-3 py-2 font-mono text-[10px] text-slate-400">SALDO-AWAL</td>
                      <td className="px-3 py-2 font-sans font-bold text-slate-800">
                        Saldo Awal per {formatDateIndo(startDate)}
                      </td>
                      <td className="px-3 py-2 text-right text-slate-400">-</td>
                      <td className="px-3 py-2 text-right text-slate-400">-</td>
                      <td className="px-3 py-2 text-right font-black text-slate-900 bg-slate-100/70">
                        {formatRupiah(acc.openingBalance)}
                      </td>
                    </tr>

                    {/* Transaction lines */}
                    {acc.rows.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-6 text-center text-slate-400 italic font-sans">
                          Tidak ada mutasi transaksi pada akun ini dalam periode yang dipilih. Silakan klik "Semua Periode" untuk melihat seluruh mutasi.
                        </td>
                      </tr>
                    ) : (
                      acc.rows.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-3 py-2 text-center text-slate-400">{rIdx + 1}</td>
                          <td className="px-3 py-2 text-slate-700 whitespace-nowrap">
                            <div>{row.date}</div>
                            <div className="text-[10px] text-slate-400">{row.time}</div>
                          </td>
                          <td className="px-3 py-2 font-mono text-[10px] text-slate-500 whitespace-nowrap">
                            {row.refNo}
                          </td>
                          <td className="px-3 py-2 font-sans text-slate-800 font-medium">
                            {row.description}
                          </td>
                          <td className="px-3 py-2 text-right font-bold text-slate-900">
                            {row.debit > 0 ? formatRupiah(row.debit) : '-'}
                          </td>
                          <td className="px-3 py-2 text-right font-bold text-slate-900">
                            {row.credit > 0 ? formatRupiah(row.credit) : '-'}
                          </td>
                          <td className="px-3 py-2 text-right font-black text-slate-900 bg-slate-50/60">
                            {formatRupiah(row.balance)}
                          </td>
                        </tr>
                      ))
                    )}

                    {/* Total Mutasi Akun */}
                    <tr className="bg-slate-800 text-white font-bold text-xs">
                      <td colSpan={4} className="px-3 py-2.5 text-right uppercase tracking-wider font-sans">
                        TOTAL MUTASI & SALDO AKHIR {acc.code}
                      </td>
                      <td className="px-3 py-2.5 text-right font-black text-emerald-300">
                        {formatRupiah(acc.totalDebit)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-black text-rose-300">
                        {formatRupiah(acc.totalCredit)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-black text-emerald-400 bg-slate-900">
                        {formatRupiah(acc.closingBalance)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ))}
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
