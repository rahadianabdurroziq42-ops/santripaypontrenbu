import React, { useState, useMemo } from 'react';
import { 
  Scale, 
  Columns, 
  Rows, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  ShieldCheck, 
  Info, 
  Wallet, 
  HandCoins, 
  ArrowDownRight, 
  Landmark, 
  Search, 
  ArrowDownLeft, 
  BookOpen, 
  Layers, 
  ArrowUpRight
} from 'lucide-react';
import { Santri, Transaction, PesantrenProfile } from '../types/finance';
import { 
  calculateNeraca, 
  formatRupiah, 
  formatDateIndo, 
  getTodayDateString,
  isCreditTransaction,
  isDebitTransaction,
  getTransactionDescription,
  formatPaymentMethodLabel
} from '../utils/accounting';
import { PrintControlBar } from './PrintControlBar';

interface NeracaViewProps {
  santriList: Santri[];
  transactions: Transaction[];
  pesantrenProfile: PesantrenProfile;
}

type NeracaFormat = 'SKONTRO' | 'STAFFEL';
type ViewMode = 'NERACA' | 'BUKU_PEMBANTU' | 'SEMUA';
type AccountKey = 'ALL' | '1-1000' | '1-1010' | '2-1000';
type MutationFilter = 'ALL' | 'SETORAN' | 'PENARIKAN';

interface AccountLedgerItem {
  id: string;
  date: string;
  time: string;
  transactionNo: string;
  santriName: string;
  accountNumber: string;
  description: string;
  notes?: string;
  isDeposit: boolean;
  amountIn: number;   // Setoran / Penambahan Saldo Akun
  amountOut: number;  // Penarikan / Pengurangan Saldo Akun
  runningBalance: number;
  method: string;
  tellerName: string;
}

export const NeracaView: React.FC<NeracaViewProps> = ({
  santriList,
  transactions,
  pesantrenProfile,
}) => {
  const [formatType, setFormatType] = useState<NeracaFormat>('SKONTRO');
  const [viewMode, setViewMode] = useState<ViewMode>('SEMUA');
  const [asOfDate, setAsOfDate] = useState<string>(getTodayDateString());
  const [selectedAccount, setSelectedAccount] = useState<AccountKey>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [mutationFilter, setMutationFilter] = useState<MutationFilter>('ALL');

  // Hitung Neraca Saldo
  const neraca = calculateNeraca(santriList, transactions, asOfDate);

  // Transaksi relevan sampai dengan asOfDate, diurutkan kronologis
  const relevantTrx = useMemo(() => {
    return [...transactions]
      .filter((t) => t.date <= asOfDate)
      .sort((a, b) => {
        const dateA = `${a.date} ${a.time || '00:00:00'}`;
        const dateB = `${b.date} ${b.time || '00:00:00'}`;
        const comp = dateA.localeCompare(dateB);
        if (comp !== 0) return comp;
        return (a.id || '').localeCompare(b.id || '');
      });
  }, [transactions, asOfDate]);

  // 1. PENCATATAN TRANSAKSI AKUN 1-1000: KAS FISIK TUNAI BENDAHARA
  const ledgerKasTunai = useMemo(() => {
    let balance = 0;
    let totalIn = 0;
    let totalOut = 0;
    const items: AccountLedgerItem[] = [];

    const cashTrx = relevantTrx.filter((t) => !(t.method || '').includes('BANK'));

    cashTrx.forEach((t) => {
      const isDeposit = isCreditTransaction(t.type);
      const isWithdrawal = isDebitTransaction(t.type);
      const amtIn = isDeposit ? t.amount : 0;
      const amtOut = isWithdrawal ? t.amount : 0;

      if (isDeposit) {
        balance += amtIn;
        totalIn += amtIn;
      } else if (isWithdrawal) {
        balance -= amtOut;
        totalOut += amtOut;
      }

      items.push({
        id: t.id,
        date: t.date,
        time: t.time || '08:00:00',
        transactionNo: t.transactionNo,
        santriName: t.santriName,
        accountNumber: t.accountNumber,
        description: getTransactionDescription(t),
        notes: t.notes,
        isDeposit,
        amountIn: amtIn,
        amountOut: amtOut,
        runningBalance: balance,
        method: t.method,
        tellerName: t.tellerName,
      });
    });

    return {
      code: '1-1000',
      name: 'Kas Fisik Tunai Bendahara',
      typeLabel: 'Aset Lancar (Kas Tunai)',
      category: 'AKTIVA',
      totalIn,
      totalOut,
      finalBalance: balance,
      items,
    };
  }, [relevantTrx]);

  // 2. PENCATATAN TRANSAKSI AKUN 1-1010: KAS REKENING BANK SYARIAH (TRANSFER)
  const ledgerKasBank = useMemo(() => {
    let balance = 0;
    let totalIn = 0;
    let totalOut = 0;
    const items: AccountLedgerItem[] = [];

    const bankTrx = relevantTrx.filter((t) => (t.method || '').includes('BANK'));

    bankTrx.forEach((t) => {
      const isDeposit = isCreditTransaction(t.type);
      const isWithdrawal = isDebitTransaction(t.type);
      const amtIn = isDeposit ? t.amount : 0;
      const amtOut = isWithdrawal ? t.amount : 0;

      if (isDeposit) {
        balance += amtIn;
        totalIn += amtIn;
      } else if (isWithdrawal) {
        balance -= amtOut;
        totalOut += amtOut;
      }

      items.push({
        id: t.id,
        date: t.date,
        time: t.time || '08:00:00',
        transactionNo: t.transactionNo,
        santriName: t.santriName,
        accountNumber: t.accountNumber,
        description: getTransactionDescription(t),
        notes: t.notes,
        isDeposit,
        amountIn: amtIn,
        amountOut: amtOut,
        runningBalance: balance,
        method: t.method,
        tellerName: t.tellerName,
      });
    });

    return {
      code: '1-1010',
      name: 'Kas Rekening Bank Syariah (Transfer)',
      typeLabel: 'Aset Lancar (Bank Wadiah)',
      category: 'AKTIVA',
      totalIn,
      totalOut,
      finalBalance: balance,
      items,
    };
  }, [relevantTrx]);

  // 3. PENCATATAN TRANSAKSI AKUN 2-1000: KEWAJIBAN SIMPANAN WADIAH SANTRI
  const ledgerWadiah = useMemo(() => {
    let balance = 0;
    let totalIn = 0;
    let totalOut = 0;
    const items: AccountLedgerItem[] = [];

    relevantTrx.forEach((t) => {
      const isDeposit = isCreditTransaction(t.type);
      const isWithdrawal = isDebitTransaction(t.type);
      const amtIn = isDeposit ? t.amount : 0;
      const amtOut = isWithdrawal ? t.amount : 0;

      if (isDeposit) {
        balance += amtIn;
        totalIn += amtIn;
      } else if (isWithdrawal) {
        balance -= amtOut;
        totalOut += amtOut;
      }

      items.push({
        id: t.id,
        date: t.date,
        time: t.time || '08:00:00',
        transactionNo: t.transactionNo,
        santriName: t.santriName,
        accountNumber: t.accountNumber,
        description: getTransactionDescription(t),
        notes: t.notes,
        isDeposit,
        amountIn: amtIn,
        amountOut: amtOut,
        runningBalance: balance,
        method: t.method,
        tellerName: t.tellerName,
      });
    });

    return {
      code: '2-1000',
      name: 'Kewajiban Simpanan Wadiah Santri',
      typeLabel: 'Kewajiban Titipan (Hak Santri)',
      category: 'PASIVA',
      totalIn,
      totalOut,
      finalBalance: balance,
      items,
    };
  }, [relevantTrx]);

  // List of accounts for rendering
  const allAccountLedgers = useMemo(() => {
    const list = [ledgerKasTunai, ledgerKasBank, ledgerWadiah];
    if (selectedAccount === 'ALL') return list;
    return list.filter((a) => a.code === selectedAccount);
  }, [selectedAccount, ledgerKasTunai, ledgerKasBank, ledgerWadiah]);

  // Helper filter search
  const filterAccountItems = (items: AccountLedgerItem[]) => {
    const q = searchTerm.trim().toLowerCase();
    return items.filter((item) => {
      // Filter Mutation Type
      if (mutationFilter === 'SETORAN' && !item.isDeposit) return false;
      if (mutationFilter === 'PENARIKAN' && item.isDeposit) return false;

      // Filter Search
      if (!q) return true;
      return (
        item.santriName.toLowerCase().includes(q) ||
        item.transactionNo.toLowerCase().includes(q) ||
        item.accountNumber.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        (item.notes || '').toLowerCase().includes(q)
      );
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Controls & Navigation Bar */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 no-print flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Scale className="w-5 h-5 text-emerald-700" />
            <h2 className="text-base font-bold text-slate-900">
              Neraca Kas Titipan & Pencatatan Transaksi Tiap Akun
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Laporan posisi keuangan kas titipan wadiah dan rincian mutasi setoran & penarikan tiap akun
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* As Of Date Picker */}
          <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-500 font-medium">Per Tanggal:</span>
            <input
              type="date"
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer"
            />
          </div>

          {/* View Mode Toggle */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
            <button
              onClick={() => setViewMode('SEMUA')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                viewMode === 'SEMUA'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua Tampilan
            </button>
            <button
              onClick={() => setViewMode('NERACA')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                viewMode === 'NERACA'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Neraca Saja
            </button>
            <button
              onClick={() => setViewMode('BUKU_PEMBANTU')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                viewMode === 'BUKU_PEMBANTU'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Rincian Tiap Akun
            </button>
          </div>

          {/* Toggle Skontro vs Staffel when Neraca is visible */}
          {viewMode !== 'BUKU_PEMBANTU' && (
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
              <button
                onClick={() => setFormatType('SKONTRO')}
                title="Format Horizontal (T-Account)"
                className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  formatType === 'SKONTRO'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Columns className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Skontro</span>
              </button>
              <button
                onClick={() => setFormatType('STAFFEL')}
                title="Format Vertikal (Berjenjang)"
                className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  formatType === 'STAFFEL'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Rows className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Staffel</span>
              </button>
            </div>
          )}

          {/* Print Controls */}
          <PrintControlBar
            documentTitle={`Laporan Neraca Kas Titipan & Pencatatan Akun per ${asOfDate}`}
            defaultOrientation={formatType === 'SKONTRO' && viewMode === 'NERACA' ? 'landscape' : 'portrait'}
            defaultPaperSize="A4"
            buttonLabel="Cetak Laporan"
          />
        </div>
      </div>

      {/* Balance Indicator Status Box (No Print) */}
      <div className="no-print">
        {neraca.isBalanced ? (
          <div className="bg-emerald-50 border border-emerald-300 rounded-xl px-4 py-3 flex items-center justify-between text-xs text-emerald-900">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-semibold">
                Status Neraca: <strong>SEIMBANG (BALANCE 100%)</strong>. Total Aktiva (Kas Tunai + Kas Bank) = Total Kewajiban Simpanan Santri.
              </span>
            </div>
            <div className="font-mono-numbers font-bold text-emerald-800 text-right">
              Total Titipan: {formatRupiah(neraca.aktiva.totalAktiva)}
            </div>
          </div>
        ) : (
          <div className="bg-rose-50 border border-rose-300 rounded-xl px-4 py-3 flex items-center justify-between text-xs text-rose-900">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span className="font-semibold">
                Status Neraca: Terdapat Selisih {formatRupiah(neraca.discrepancy)}.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Main Neraca Paper Layout */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200 print-card font-mono-numbers">
        {/* Formal Pesantren Letterhead */}
        <div className="border-b-2 border-slate-900 pb-4 mb-6 text-center">
          <p className="font-arabic text-sm text-emerald-800 font-bold mb-1">
            بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
          </p>
          {pesantrenProfile.logoUrl && (
            <div className="flex justify-center mb-2">
              <img
                src={pesantrenProfile.logoUrl}
                alt="Logo Pesantren"
                className="w-14 h-14 object-contain"
              />
            </div>
          )}
          <h1 className="text-lg sm:text-xl font-black uppercase text-slate-900 tracking-wide font-sans">
            {pesantrenProfile.formalName}
          </h1>
          <p className="text-xs text-slate-600 font-sans mt-0.5">
            Unit Pengelolaan Kas Titipan Wadiah Santri (Baitul Maal Pesantren)
          </p>
          <p className="text-[10px] text-slate-500 font-sans">
            {pesantrenProfile.address}, {pesantrenProfile.district} • Telp: {pesantrenProfile.phone}
          </p>
          <div className="mt-3 pt-2 border-t border-slate-200 flex flex-col items-center">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 font-sans">
              LAPORAN NERACA KAS TITIPAN & PENCATATAN TRANSAKSI AKUN
            </h2>
            <p className="text-xs text-slate-500 font-sans font-medium">
              Per {formatDateIndo(neraca.asOfDate)} (Dinyatakan dalam Rupiah)
            </p>
            <span className="mt-1 text-[10px] bg-emerald-100 text-emerald-900 px-2.5 py-0.5 rounded-full font-sans font-bold border border-emerald-300">
              Struktur Khusus: Akad Wadiah Murni (Arus Titipan Masuk & Penarikan Jajan/Kebutuhan Santri)
            </span>
          </div>
        </div>

        {/* SECTION 1: RINGKASAN NERACA */}
        {(viewMode === 'NERACA' || viewMode === 'SEMUA') && (
          <div className="space-y-6 mb-8">
            {/* Ringkasan Akumulasi Realisasi Titipan & Total Penarikan Uang Jajan Santri */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-sans">
              {/* Card 1: Total Titipan Masuk */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                <div className="flex items-center justify-between text-slate-500 text-[11px] font-semibold">
                  <span className="flex items-center gap-1.5">
                    <ArrowDownRight className="w-4 h-4 text-emerald-600" />
                    <span>Total Setoran Masuk (Wali)</span>
                  </span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-mono font-bold">
                    {neraca.countSetoranTitipan} Transaksi
                  </span>
                </div>
                <p className="text-base font-black text-slate-900 font-mono-numbers mt-1.5">
                  {formatRupiah(neraca.totalSetoranTitipan)}
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Akumulasi setoran uang saku via loket tunai & bank
                </p>
              </div>

              {/* Card 2: Total Penarikan Santri */}
              <div className="bg-amber-50/80 border-2 border-amber-400 rounded-xl p-3.5 shadow-xs">
                <div className="flex items-center justify-between text-amber-950 text-[11px] font-bold">
                  <span className="flex items-center gap-1.5">
                    <HandCoins className="w-4 h-4 text-amber-700" />
                    <span>Total Penarikan Santri</span>
                  </span>
                  <span className="text-[10px] bg-amber-200 text-amber-900 px-1.5 py-0.2 rounded font-mono font-bold">
                    {neraca.countPenarikanJajan}x Transaksi
                  </span>
                </div>
                <p className="text-base font-black text-amber-900 font-mono-numbers mt-1.5">
                  {formatRupiah(neraca.totalPenarikanJajan)}
                </p>
                <p className="text-[10px] text-amber-800 mt-0.5 font-medium">
                  Uang jajan & keperluan santri yang telah dicairkan
                </p>
              </div>

              {/* Card 3: Sisa Kas Titipan Berjalan */}
              <div className="bg-emerald-50/70 border border-emerald-300 rounded-xl p-3.5">
                <div className="flex items-center justify-between text-emerald-900 text-[11px] font-semibold">
                  <span className="flex items-center gap-1.5">
                    <Wallet className="w-4 h-4 text-emerald-700" />
                    <span>Sisa Saldo Kas Titipan</span>
                  </span>
                  <span className="text-[10px] bg-emerald-200 text-emerald-900 px-1.5 py-0.2 rounded font-mono font-bold">
                    {neraca.totalSantriWithBalance} Santri Bersaldo
                  </span>
                </div>
                <p className="text-base font-black text-emerald-950 font-mono-numbers mt-1.5">
                  {formatRupiah(neraca.pasiva.totalPasiva)}
                </p>
                <p className="text-[10px] text-emerald-700 mt-0.5">
                  Total hak saldo santri yang siap dicairkan
                </p>
              </div>
            </div>

            {/* FORMAT 1: SKONTRO (HORIZONTAL / T-ACCOUNT) */}
            {formatType === 'SKONTRO' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-2">
                {/* AKTIVA: SISI KIRI (KAS FISIK & BANK TITIPAN) */}
                <div className="border border-slate-300 rounded-xl overflow-hidden flex flex-col justify-between">
                  <div>
                    <div className="bg-slate-900 text-white px-4 py-2.5 text-xs font-bold uppercase tracking-wider flex justify-between font-sans">
                      <span>AKTIVA (KAS TITIPAN SANTRI)</span>
                      <span>JUMLAH (RP)</span>
                    </div>

                    <div className="p-4 space-y-4 text-xs font-sans">
                      <div>
                        <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] border-b border-slate-200 pb-1 flex items-center justify-between">
                          <span>Kas Titipan yang Dikelola Bendahara</span>
                          <span className="text-[10px] font-normal text-slate-500">Aset Lancar</span>
                        </h4>

                        <div className="mt-3 space-y-3">
                          {/* Kas Fisik Tunai Bendahara */}
                          <div className="flex justify-between items-start text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                            <div>
                              <p className="font-bold text-slate-900">Kas Fisik Tunai Bendahara</p>
                              <p className="text-[10px] text-slate-500 font-mono">1-1000 (Brankas Loket Tunai)</p>
                              <p className="text-[10px] text-slate-500 mt-0.5 italic">
                                Uang tunai titipan untuk pencairan jajan & kebutuhan santri
                              </p>
                            </div>
                            <span className="font-black text-slate-900 font-mono-numbers text-sm">
                              {formatRupiah(neraca.aktiva.kasTunaiTitipan)}
                            </span>
                          </div>

                          {/* Kas Rekening Bank Titipan Transfer */}
                          <div className="flex justify-between items-start text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                            <div>
                              <p className="font-bold text-slate-900">Kas Rekening Bank Syariah</p>
                              <p className="text-[10px] text-slate-500 font-mono">1-1010 (Rekening Transfer Bank Wadiah)</p>
                              <p className="text-[10px] text-slate-500 mt-0.5 italic">
                                Dana titipan orang tua yang masuk via transfer bank
                              </p>
                            </div>
                            <span className="font-black text-slate-900 font-mono-numbers text-sm">
                              {formatRupiah(neraca.aktiva.kasBankTitipan)}
                            </span>
                          </div>

                          {/* Ringkasan Realisasi Jajan di Sisi Kas */}
                          <div className="flex justify-between items-center text-slate-700 bg-amber-50/60 p-2.5 rounded-lg border border-amber-200">
                            <div className="flex items-center space-x-2">
                              <HandCoins className="w-4 h-4 text-amber-700 shrink-0" />
                              <div>
                                <p className="font-bold text-amber-950 text-xs">Total Penarikan Santri</p>
                                <p className="text-[10px] text-amber-800">Telah dicairkan secara tunai di loket bendahara</p>
                              </div>
                            </div>
                            <span className="font-black text-amber-900 font-mono-numbers text-xs">
                              {formatRupiah(neraca.totalPenarikanJajan)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Total Aktiva Footer */}
                  <div className="bg-emerald-50 border-t-2 border-slate-900 p-3.5 flex justify-between items-center font-sans">
                    <div>
                      <span className="font-bold text-slate-900 text-xs uppercase tracking-wider block">
                        TOTAL AKTIVA (KAS TITIPAN)
                      </span>
                      <span className="text-[10px] text-emerald-800">Uang fisik tunai + saldo bank titipan</span>
                    </div>
                    <span className="font-black text-base text-emerald-950 font-mono-numbers">
                      {formatRupiah(neraca.aktiva.totalAktiva)}
                    </span>
                  </div>
                </div>

                {/* PASIVA: SISI KANAN (KEWAJIBAN TITIPAN WADIAH SANTRI) */}
                <div className="border border-slate-300 rounded-xl overflow-hidden flex flex-col justify-between">
                  <div>
                    <div className="bg-slate-900 text-white px-4 py-2.5 text-xs font-bold uppercase tracking-wider flex justify-between font-sans">
                      <span>PASIVA (KEWAJIBAN TITIPAN WADIAH)</span>
                      <span>JUMLAH (RP)</span>
                    </div>

                    <div className="p-4 space-y-4 text-xs font-sans">
                      <div>
                        <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] border-b border-slate-200 pb-1 flex items-center justify-between">
                          <span>Hak Saldo Titipan Milik Santri</span>
                          <span className="text-[10px] font-normal text-slate-500">Kewajiban Wadiah</span>
                        </h4>

                        <div className="mt-3 space-y-3">
                          {/* Simpanan Wadiah Santri */}
                          <div className="flex justify-between items-start text-slate-700 bg-emerald-50/60 p-2.5 rounded-lg border border-emerald-200">
                            <div>
                              <p className="font-bold text-emerald-950">Simpanan Wadiah Titipan Santri</p>
                              <p className="text-[10px] text-slate-500 font-mono">2-1000 (Akad Wadiah Yad Dhamanah)</p>
                              <p className="text-[10px] text-slate-600 mt-0.5">
                                Total saldo titipan uang saku seluruh santri aktif ({neraca.totalSantriWithBalance} santri memiliki saldo)
                              </p>
                            </div>
                            <span className="font-black text-emerald-900 font-mono-numbers text-sm">
                              {formatRupiah(neraca.pasiva.kewajibanTitipanWadiah)}
                            </span>
                          </div>

                          {/* Rincian Arus Wadiah: Masuk vs Ditarik Santri */}
                          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1.5 text-[11px]">
                            <div className="flex justify-between text-slate-600">
                              <span>Akumulasi Titipan Diterima (+):</span>
                              <span className="font-semibold font-mono-numbers text-emerald-700">{formatRupiah(neraca.totalSetoranTitipan)}</span>
                            </div>
                            <div className="flex justify-between text-amber-950 font-bold bg-amber-100/80 px-2 py-1.5 rounded border border-amber-300">
                              <span className="flex items-center gap-1.5">
                                <HandCoins className="w-3.5 h-3.5 text-amber-700" />
                                <span>Total Penarikan Santri (-):</span>
                              </span>
                              <span className="font-mono-numbers text-rose-700">- {formatRupiah(neraca.totalPenarikanJajan)}</span>
                            </div>
                            <div className="flex justify-between text-emerald-950 font-bold border-t border-slate-200 pt-1">
                              <span>Sisa Hak Saldo Titipan Seluruh Santri:</span>
                              <span className="font-mono-numbers">{formatRupiah(neraca.pasiva.kewajibanTitipanWadiah)}</span>
                            </div>
                          </div>

                          {/* Penjelasan Transparansi */}
                          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-600 space-y-1">
                            <div className="flex items-center space-x-1.5 font-bold text-slate-800">
                              <ShieldCheck className="w-4 h-4 text-emerald-600" />
                              <span>Prinsip Titipan Murni (Amanah):</span>
                            </div>
                            <p className="text-[10px] leading-relaxed text-slate-500">
                              Seluruh dana yang ada di tangan bendahara adalah hak murni milik santri. Setiap setoran menambah kewajiban titipan, dan setiap penarikan langsung mendebet pos kewajiban ini.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Total Pasiva Footer */}
                  <div className="bg-emerald-50 border-t-2 border-slate-900 p-3.5 flex justify-between items-center font-sans">
                    <div>
                      <span className="font-bold text-slate-900 text-xs uppercase tracking-wider block">
                        TOTAL PASIVA (KEWAJIBAN TITIPAN)
                      </span>
                      <span className="text-[10px] text-emerald-800">Total hutang titipan kepada seluruh santri</span>
                    </div>
                    <span className="font-black text-base text-emerald-950 font-mono-numbers">
                      {formatRupiah(neraca.pasiva.totalPasiva)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* FORMAT 2: STAFFEL (VERTIKAL BERJENJANG) */}
            {formatType === 'STAFFEL' && (
              <div className="border border-slate-300 rounded-xl overflow-hidden font-sans">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-900 text-white font-bold uppercase tracking-wider text-[11px]">
                      <th className="px-4 py-2.5 text-left w-24">Kode Akun</th>
                      <th className="px-4 py-2.5 text-left">Uraian Akun Kas Titipan</th>
                      <th className="px-4 py-2.5 text-right w-44">Rincian (Rp)</th>
                      <th className="px-4 py-2.5 text-right w-44">Total (Rp)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {/* 1. AKTIVA */}
                    <tr className="bg-slate-100 font-bold text-slate-900">
                      <td colSpan={4} className="px-4 py-2 text-xs uppercase tracking-wider">
                        I. AKTIVA (ASET KAS TITIPAN SANTRI)
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-slate-500 font-mono">1-1000</td>
                      <td className="px-4 py-2 text-slate-800">
                        <p className="font-semibold">Kas Fisik Tunai Bendahara Pesantren</p>
                        <p className="text-[10px] text-slate-500">Uang tunai titipan untuk pencairan jajan & kebutuhan santri di loket</p>
                      </td>
                      <td className="px-4 py-2 text-right font-mono-numbers">{formatRupiah(neraca.aktiva.kasTunaiTitipan)}</td>
                      <td></td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-slate-500 font-mono">1-1010</td>
                      <td className="px-4 py-2 text-slate-800">
                        <p className="font-semibold">Kas Rekening Bank Syariah (Transfer Via Bank)</p>
                        <p className="text-[10px] text-slate-500">Dana titipan orang tua yang disetor melalui transfer perbankan</p>
                      </td>
                      <td className="px-4 py-2 text-right font-mono-numbers">{formatRupiah(neraca.aktiva.kasBankTitipan)}</td>
                      <td></td>
                    </tr>
                    <tr className="bg-emerald-50/70 font-bold text-slate-900 border-t-2 border-b border-emerald-300">
                      <td className="px-4 py-2.5"></td>
                      <td className="px-4 py-2.5 uppercase tracking-wide">TOTAL AKTIVA (KAS TITIPAN YANG DIKELOLA)</td>
                      <td></td>
                      <td className="px-4 py-2.5 text-right font-black font-mono-numbers text-sm text-emerald-950">
                        {formatRupiah(neraca.aktiva.totalAktiva)}
                      </td>
                    </tr>

                    {/* 2. PASIVA */}
                    <tr className="bg-slate-100 font-bold text-slate-900">
                      <td colSpan={4} className="px-4 py-2 text-xs uppercase tracking-wider">
                        II. PASIVA (KEWAJIBAN TITIPAN WADIAH SANTRI)
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-slate-500 font-mono">2-1000A</td>
                      <td className="px-4 py-2 text-slate-800">
                        <p className="font-semibold">Akumulasi Titipan Uang Saku Masuk (Wali Santri)</p>
                        <p className="text-[10px] text-slate-500">
                          Total penerimaan titipan uang saku dari orang tua ({neraca.countSetoranTitipan} transaksi masuk)
                        </p>
                      </td>
                      <td className="px-4 py-2 text-right font-mono-numbers text-slate-800">
                        {formatRupiah(neraca.totalSetoranTitipan)}
                      </td>
                      <td></td>
                    </tr>
                    <tr className="bg-amber-50/70 border-y border-amber-200">
                      <td className="px-4 py-2 text-amber-800 font-mono font-bold">2-1000B</td>
                      <td className="px-4 py-2 text-amber-950">
                        <div className="flex items-center gap-1.5">
                          <HandCoins className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                          <p className="font-bold">Total Penarikan Santri (Dicairkan di Loket)</p>
                        </div>
                        <p className="text-[10px] text-amber-800">
                          Akumulasi penarikan uang jajan & kebutuhan santri ({neraca.countPenarikanJajan} transaksi)
                        </p>
                      </td>
                      <td className="px-4 py-2 text-right font-mono-numbers font-bold text-rose-700">
                        - {formatRupiah(neraca.totalPenarikanJajan)}
                      </td>
                      <td></td>
                    </tr>
                    <tr className="bg-emerald-50/50">
                      <td className="px-4 py-2 text-slate-500 font-mono">2-1000</td>
                      <td className="px-4 py-2 text-slate-800">
                        <p className="font-bold text-emerald-950">Sisa Bersih Simpanan Titipan Wadiah Santri</p>
                        <p className="text-[10px] text-slate-500">
                          Total hak saldo titipan seluruh santri aktif ({neraca.totalSantriWithBalance} santri memiliki saldo)
                        </p>
                      </td>
                      <td className="px-4 py-2 text-right font-mono-numbers font-bold text-emerald-800">
                        {formatRupiah(neraca.pasiva.kewajibanTitipanWadiah)}
                      </td>
                      <td className="px-4 py-2 text-right font-black font-mono-numbers text-emerald-950">
                        {formatRupiah(neraca.pasiva.kewajibanTitipanWadiah)}
                      </td>
                    </tr>
                    <tr className="bg-slate-900 text-white font-bold text-xs uppercase tracking-wider">
                      <td className="px-4 py-2.5"></td>
                      <td className="px-4 py-2.5">TOTAL PASIVA (KEWAJIBAN TITIPAN SANTRI)</td>
                      <td></td>
                      <td className="px-4 py-2.5 text-right font-black font-mono-numbers text-sm text-emerald-300">
                        {formatRupiah(neraca.pasiva.totalPasiva)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* SECTION 2: PENCATATAN TRANSAKSI TIAP AKUN (BUKU PEMBANTU NERACA) */}
        {(viewMode === 'BUKU_PEMBANTU' || viewMode === 'SEMUA') && (
          <div className="space-y-6 pt-4 border-t-2 border-slate-900">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <div className="flex items-center space-x-2">
                  <BookOpen className="w-5 h-5 text-emerald-700" />
                  <h3 className="text-base font-bold text-slate-900 font-sans uppercase tracking-wide">
                    Pencatatan Transaksi Tiap Akun Neraca (Buku Pembantu / Sub-Ledger)
                  </h3>
                </div>
                <p className="text-xs text-slate-500 font-sans mt-0.5">
                  Rincian seluruh mutasi setoran dan penarikan yang membentuk saldo akhir setiap akun pada Neraca per {formatDateIndo(asOfDate)}
                </p>
              </div>

              {/* Account Selector Pill Tabs */}
              <div className="flex flex-wrap items-center gap-1.5 no-print font-sans text-xs">
                <button
                  onClick={() => setSelectedAccount('ALL')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    selectedAccount === 'ALL'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Semua Akun (3)
                </button>
                <button
                  onClick={() => setSelectedAccount('1-1000')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                    selectedAccount === '1-1000'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                  }`}
                >
                  <Wallet className="w-3.5 h-3.5" />
                  <span>1-1000 Kas Tunai</span>
                </button>
                <button
                  onClick={() => setSelectedAccount('1-1010')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                    selectedAccount === '1-1010'
                      ? 'bg-blue-700 text-white shadow-xs'
                      : 'bg-blue-50 text-blue-800 hover:bg-blue-100'
                  }`}
                >
                  <Landmark className="w-3.5 h-3.5" />
                  <span>1-1010 Kas Bank</span>
                </button>
                <button
                  onClick={() => setSelectedAccount('2-1000')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                    selectedAccount === '2-1000'
                      ? 'bg-purple-700 text-white shadow-xs'
                      : 'bg-purple-50 text-purple-800 hover:bg-purple-100'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>2-1000 Kewajiban Wadiah</span>
                </button>
              </div>
            </div>

            {/* Filter Bar (No Print) */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print font-sans text-xs">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Cari nama santri, no transaksi, rekening, uraian..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-slate-500 font-semibold">Tampilkan:</span>
                <select
                  value={mutationFilter}
                  onChange={(e) => setMutationFilter(e.target.value as MutationFilter)}
                  className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="ALL">Semua Mutasi (Setoran & Penarikan)</option>
                  <option value="SETORAN">Hanya Setoran Masuk (+)</option>
                  <option value="PENARIKAN">Hanya Penarikan Keluar (-)</option>
                </select>
              </div>
            </div>

            {/* Account Tables */}
            <div className="space-y-8">
              {allAccountLedgers.map((account) => {
                const filteredItems = filterAccountItems(account.items);
                const subtotalIn = filteredItems.reduce((acc, it) => acc + it.amountIn, 0);
                const subtotalOut = filteredItems.reduce((acc, it) => acc + it.amountOut, 0);

                return (
                  <div
                    key={account.code}
                    className="border border-slate-300 rounded-2xl overflow-hidden shadow-xs bg-white"
                  >
                    {/* Account Header Banner */}
                    <div className="bg-slate-900 text-white p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 font-sans">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-emerald-400 font-mono font-bold text-sm border border-slate-700">
                          {account.code}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <h4 className="font-bold text-sm text-white tracking-wide">
                              {account.name}
                            </h4>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                                account.category === 'AKTIVA'
                                  ? 'bg-emerald-900/80 text-emerald-300 border border-emerald-700'
                                  : 'bg-purple-900/80 text-purple-300 border border-purple-700'
                              }`}
                            >
                              {account.category} • {account.typeLabel}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Pencatatan real-time arus setoran dan penarikan yang terhubung ke Neraca
                          </p>
                        </div>
                      </div>

                      {/* Summary Metrics for this Account */}
                      <div className="flex items-center space-x-4 bg-slate-800/80 px-4 py-2 rounded-xl border border-slate-700 text-xs">
                        <div>
                          <p className="text-[10px] uppercase text-emerald-400 font-bold flex items-center gap-1">
                            <ArrowDownLeft className="w-3 h-3" />
                            <span>Total Setoran (+)</span>
                          </p>
                          <p className="font-bold text-emerald-300 font-mono-numbers mt-0.5">
                            {formatRupiah(account.totalIn)}
                          </p>
                        </div>
                        <div className="h-6 w-px bg-slate-700"></div>
                        <div>
                          <p className="text-[10px] uppercase text-rose-400 font-bold flex items-center gap-1">
                            <ArrowUpRight className="w-3 h-3" />
                            <span>Total Penarikan (-)</span>
                          </p>
                          <p className="font-bold text-rose-300 font-mono-numbers mt-0.5">
                            {formatRupiah(account.totalOut)}
                          </p>
                        </div>
                        <div className="h-6 w-px bg-slate-700"></div>
                        <div>
                          <p className="text-[10px] uppercase text-white font-bold">Saldo Akhir Akun</p>
                          <p className="font-black text-amber-300 font-mono-numbers mt-0.5 text-sm">
                            {formatRupiah(account.finalBalance)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Table of Transactions */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300 text-[11px] font-sans">
                            <th className="px-3 py-2.5 text-center w-12">No</th>
                            <th className="px-3 py-2.5 text-left w-24">Tanggal</th>
                            <th className="px-3 py-2.5 text-left w-28">No. Transaksi</th>
                            <th className="px-3 py-2.5 text-left">Nama Santri & Rekening</th>
                            <th className="px-3 py-2.5 text-left">Uraian Transaksi</th>
                            <th className="px-3 py-2.5 text-left w-28">Metode</th>
                            <th className="px-3 py-2.5 text-right w-28">Setoran (+)</th>
                            <th className="px-3 py-2.5 text-right w-28">Penarikan (-)</th>
                            <th className="px-3 py-2.5 text-right w-32">Saldo Akun (Rp)</th>
                            <th className="px-3 py-2.5 text-left w-24">Petugas</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 font-sans">
                          {filteredItems.length === 0 ? (
                            <tr>
                              <td colSpan={10} className="px-4 py-8 text-center text-slate-400 italic">
                                Belum ada pencatatan transaksi untuk akun ini yang cocok dengan filter.
                              </td>
                            </tr>
                          ) : (
                            filteredItems.map((item, idx) => (
                              <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                                <td className="px-3 py-2 text-center text-slate-400 text-[11px]">
                                  {idx + 1}
                                </td>
                                <td className="px-3 py-2 text-slate-600 whitespace-nowrap font-mono text-[11px]">
                                  <div>{item.date}</div>
                                  <div className="text-[10px] text-slate-400">{item.time.slice(0, 5)}</div>
                                </td>
                                <td className="px-3 py-2 font-mono text-[10px] text-slate-500 whitespace-nowrap">
                                  {item.transactionNo}
                                </td>
                                <td className="px-3 py-2">
                                  <p className="font-bold text-slate-900">{item.santriName || 'Santri'}</p>
                                  <p className="text-[10px] text-slate-500 font-mono">Rek: {item.accountNumber || '-'}</p>
                                </td>
                                <td className="px-3 py-2 text-slate-800">
                                  <div className="flex items-center space-x-1.5">
                                    <span
                                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0 font-mono ${
                                        item.isDeposit
                                          ? 'bg-emerald-100 text-emerald-800'
                                          : 'bg-rose-100 text-rose-800'
                                      }`}
                                    >
                                      {item.isDeposit ? 'SETORAN' : 'PENARIKAN'}
                                    </span>
                                    <span className="text-[11px] font-medium text-slate-700 truncate max-w-xs">
                                      {item.description}
                                    </span>
                                  </div>
                                  {item.notes && (
                                    <p className="text-[10px] text-slate-400 italic mt-0.5">{item.notes}</p>
                                  )}
                                </td>
                                <td className="px-3 py-2 text-slate-600 text-[11px] whitespace-nowrap">
                                  {formatPaymentMethodLabel(item.method)}
                                </td>
                                <td className="px-3 py-2 text-right font-mono-numbers font-bold text-emerald-700">
                                  {item.amountIn > 0 ? formatRupiah(item.amountIn) : '-'}
                                </td>
                                <td className="px-3 py-2 text-right font-mono-numbers font-bold text-rose-700">
                                  {item.amountOut > 0 ? formatRupiah(item.amountOut) : '-'}
                                </td>
                                <td className="px-3 py-2 text-right font-mono-numbers font-bold text-slate-900 bg-slate-50/50">
                                  {formatRupiah(item.runningBalance)}
                                </td>
                                <td className="px-3 py-2 text-slate-500 text-[10px] whitespace-nowrap">
                                  {item.tellerName || 'Bendahara'}
                                </td>
                              </tr>
                            ))
                          )}

                          {/* Subtotal Footer Row */}
                          <tr className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300 font-sans">
                            <td colSpan={6} className="px-3 py-2.5 text-right uppercase text-[11px] tracking-wide">
                              TOTAL MUTASI {account.code} ({filteredItems.length} TRANSAKSI)
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono-numbers text-emerald-800 font-bold">
                              {formatRupiah(subtotalIn)}
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono-numbers text-rose-800 font-bold">
                              {formatRupiah(subtotalOut)}
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono-numbers text-slate-950 font-black text-xs bg-slate-200/60">
                              {formatRupiah(account.finalBalance)}
                            </td>
                            <td></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Sharia Accounting Notes */}
        <div className="mt-8 pt-4 border-t border-slate-200 text-[11px] text-slate-500 font-sans space-y-1.5">
          <div className="flex items-start space-x-2">
            <Info className="w-4 h-4 text-emerald-700 mt-0.5 shrink-0" />
            <div>
              <strong className="text-slate-800">Prinsip Akuntansi Kas Titipan Murni (Custodial Accounting):</strong>
              <p className="mt-0.5 text-slate-600 leading-relaxed">
                1. <strong>Arus Setoran:</strong> Dana titipan uang saku dari orang tua menambah Kas Tunai / Bank (Aktiva) dan diakui seutuhnya sebagai Kewajiban Simpanan Wadiah Santri (Pasiva).
              </p>
              <p className="text-slate-600 leading-relaxed">
                2. <strong>Arus Penarikan:</strong> Pencairan uang jajan dan kebutuhan santri di loket mengurangi Kas Fisik Tunai Bendahara (Aktiva) dan langsung mendebet pos Kewajiban Simpanan Wadiah Santri (Pasiva).
              </p>
              <p className="text-slate-600 leading-relaxed">
                3. Total Aktiva (Kas Tunai + Kas Bank) selalu persis seimbang dengan Total Pasiva (Total Kewajiban Titipan Wadiah Seluruh Santri), tanpa selisih.
              </p>
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
            <p className="font-bold underline text-slate-900">{pesantrenProfile.mudir}</p>
          </div>

          <div className="text-center">
            <p className="text-slate-500 text-[11px]">{pesantrenProfile.district}, {formatDateIndo(neraca.asOfDate)}</p>
            <p className="font-bold">Kepala Bendahara Pesantren</p>
            <div className="h-16 flex items-center justify-center">
              <span className="text-[10px] text-slate-300 border border-dashed border-slate-300 px-3 py-1 rounded">
                Tanda Tangan & Stempel
              </span>
            </div>
            <p className="font-bold underline text-slate-900">{pesantrenProfile.headOfTreasury}</p>
            <p className="text-[10px] text-slate-500">{pesantrenProfile.treasuryNIP}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
