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
  ArrowUpRight,
  UserCheck,
  GraduationCap,
  Building2,
  Users
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
type AccountKey = 'ALL' | '1-1000' | '1-1010' | '2-1000' | '1-1100' | '1-1110' | '2-2000';
type MutationFilter = 'ALL' | 'SETORAN' | 'PENARIKAN';
type UserFilter = 'ALL' | 'PENGURUS' | 'BENDAHARA';

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
  userRole: 'PENGURUS' | 'BENDAHARA';
}

interface AccountGroup {
  code: string;
  name: string;
  typeLabel: string;
  category: 'AKTIVA' | 'PASIVA';
  userRole: 'PENGURUS' | 'BENDAHARA';
  description: string;
  totalIn: number;
  totalOut: number;
  finalBalance: number;
  items: AccountLedgerItem[];
}

export const NeracaView: React.FC<NeracaViewProps> = ({
  santriList,
  transactions,
  pesantrenProfile,
}) => {
  const [formatType, setFormatType] = useState<NeracaFormat>('SKONTRO');
  const [viewMode, setViewMode] = useState<ViewMode>('SEMUA');
  const [asOfDate, setAsOfDate] = useState<string>(getTodayDateString());
  const [selectedUserFilter, setSelectedUserFilter] = useState<UserFilter>('ALL');
  const [selectedAccount, setSelectedAccount] = useState<AccountKey>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [mutationFilter, setMutationFilter] = useState<MutationFilter>('ALL');

  // Hitung Neraca Saldo Terpadu
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

  // Helper identifikasi user pelaksana transaksi
  const getUserRole = (trx: Transaction): 'PENGURUS' | 'BENDAHARA' => {
    if (trx.type === 'DEPOSIT_SPP' || trx.type === 'WITHDRAWAL_SPP' || (trx.category && trx.category.includes('SPP'))) {
      return 'PENGURUS';
    }
    return 'BENDAHARA';
  };

  // ==========================================
  // KELOMPOK AKUN KELOLAAN BENDAHARA (TITIPAN WADIAH)
  // ==========================================

  // 1. Akun 1-1000: Kas Fisik Tunai Titipan (Bendahara)
  const ledgerKasTunaiBendahara = useMemo<AccountGroup>(() => {
    let balance = 0;
    let totalIn = 0;
    let totalOut = 0;
    const items: AccountLedgerItem[] = [];

    const cashWadiahTrx = relevantTrx.filter(
      (t) => getUserRole(t) === 'BENDAHARA' && !(t.method || '').includes('BANK')
    );

    cashWadiahTrx.forEach((t) => {
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
        userRole: 'BENDAHARA',
      });
    });

    return {
      code: '1-1000',
      name: 'Kas Fisik Tunai Titipan (Loket Bendahara)',
      typeLabel: 'Aset Lancar Kas Tunai',
      category: 'AKTIVA',
      userRole: 'BENDAHARA',
      description: 'Kas fisik uang tunai di brankas bendahara untuk pencairan jajan & kebutuhan harian santri',
      totalIn,
      totalOut,
      finalBalance: neraca.aktiva.kasTunaiTitipan,
      items,
    };
  }, [relevantTrx, neraca.aktiva.kasTunaiTitipan]);

  // 2. Akun 1-1010: Kas Rekening Bank Titipan (Bendahara)
  const ledgerKasBankBendahara = useMemo<AccountGroup>(() => {
    let balance = 0;
    let totalIn = 0;
    let totalOut = 0;
    const items: AccountLedgerItem[] = [];

    const bankWadiahTrx = relevantTrx.filter(
      (t) => getUserRole(t) === 'BENDAHARA' && (t.method || '').includes('BANK')
    );

    bankWadiahTrx.forEach((t) => {
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
        userRole: 'BENDAHARA',
      });
    });

    return {
      code: '1-1010',
      name: 'Kas Rekening Bank Titipan (Transfer Bendahara)',
      typeLabel: 'Aset Lancar Bank Wadiah',
      category: 'AKTIVA',
      userRole: 'BENDAHARA',
      description: 'Kas titipan uang saku dari orang tua yang disetor melalui transfer perbankan',
      totalIn,
      totalOut,
      finalBalance: neraca.aktiva.kasBankTitipan,
      items,
    };
  }, [relevantTrx, neraca.aktiva.kasBankTitipan]);

  // 3. Akun 2-1000: Kewajiban Simpanan Wadiah Santri (Bendahara)
  const ledgerWadiahBendahara = useMemo<AccountGroup>(() => {
    let balance = 0;
    let totalIn = 0;
    let totalOut = 0;
    const items: AccountLedgerItem[] = [];

    const wadiahTrx = relevantTrx.filter((t) => getUserRole(t) === 'BENDAHARA');

    wadiahTrx.forEach((t) => {
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
        userRole: 'BENDAHARA',
      });
    });

    return {
      code: '2-1000',
      name: 'Kewajiban Simpanan Wadiah Santri (Hak Uang Saku)',
      typeLabel: 'Kewajiban Wadiah Yad Dhamanah',
      category: 'PASIVA',
      userRole: 'BENDAHARA',
      description: 'Hutang amanah titipan uang saku seluruh santri aktif yang siap dicairkan untuk kebutuhan harian',
      totalIn,
      totalOut,
      finalBalance: neraca.pasiva.kewajibanTitipanWadiah,
      items,
    };
  }, [relevantTrx, neraca.pasiva.kewajibanTitipanWadiah]);

  // ==========================================
  // KELOMPOK AKUN KELOLAAN PENGURUS (DANA SPP PESANTREN)
  // ==========================================

  // 4. Akun 1-1100: Kas Fisik Tunai SPP (Pengurus)
  const ledgerKasTunaiPengurus = useMemo<AccountGroup>(() => {
    let balance = 0;
    let totalIn = 0;
    let totalOut = 0;
    const items: AccountLedgerItem[] = [];

    const cashSPPTrx = relevantTrx.filter(
      (t) => getUserRole(t) === 'PENGURUS' && !(t.method || '').includes('BANK')
    );

    cashSPPTrx.forEach((t) => {
      const isDeposit = t.type === 'DEPOSIT_SPP';
      const isWithdrawal = t.type === 'WITHDRAWAL_SPP';
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
        description: t.notes || 'Pembayaran SPP Syahriah Bulanan (Tunai TU)',
        notes: t.notes,
        isDeposit,
        amountIn: amtIn,
        amountOut: amtOut,
        runningBalance: balance,
        method: t.method,
        tellerName: t.tellerName,
        userRole: 'PENGURUS',
      });
    });

    return {
      code: '1-1100',
      name: 'Kas Fisik Tunai Dana SPP (Kantor TU Pengurus)',
      typeLabel: 'Aset Lancar Kas SPP',
      category: 'AKTIVA',
      userRole: 'PENGURUS',
      description: 'Penerimaan uang tunai pembayaran SPP syahriah bulanan santri di kantor tata usaha pengurus',
      totalIn,
      totalOut,
      finalBalance: neraca.aktiva.kasTunaiSPP,
      items,
    };
  }, [relevantTrx, neraca.aktiva.kasTunaiSPP]);

  // 5. Akun 1-1110: Kas Rekening Bank Penerimaan SPP (Pengurus)
  const ledgerKasBankPengurus = useMemo<AccountGroup>(() => {
    let balance = 0;
    let totalIn = 0;
    let totalOut = 0;
    const items: AccountLedgerItem[] = [];

    const bankSPPTrx = relevantTrx.filter(
      (t) => getUserRole(t) === 'PENGURUS' && (t.method || '').includes('BANK')
    );

    bankSPPTrx.forEach((t) => {
      const isDeposit = t.type === 'DEPOSIT_SPP';
      const isWithdrawal = t.type === 'WITHDRAWAL_SPP';
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
        description: t.notes || 'Pembayaran SPP via Transfer Rekening Pesantren',
        notes: t.notes,
        isDeposit,
        amountIn: amtIn,
        amountOut: amtOut,
        runningBalance: balance,
        method: t.method,
        tellerName: t.tellerName,
        userRole: 'PENGURUS',
      });
    });

    return {
      code: '1-1110',
      name: 'Kas Rekening Bank SPP (Transfer Bank Pengurus)',
      typeLabel: 'Aset Lancar Bank SPP',
      category: 'AKTIVA',
      userRole: 'PENGURUS',
      description: 'Rekening bank khusus penerimaan transfer pembayaran SPP dari wali santri',
      totalIn,
      totalOut,
      finalBalance: neraca.aktiva.kasBankSPP,
      items,
    };
  }, [relevantTrx, neraca.aktiva.kasBankSPP]);

  // 6. Akun 2-2000: Dana Penerimaan & Pengelolaan SPP Syahriah (Pengurus)
  const ledgerDanaSPPPengurus = useMemo<AccountGroup>(() => {
    let balance = 0;
    let totalIn = 0;
    let totalOut = 0;
    const items: AccountLedgerItem[] = [];

    const sppTrx = relevantTrx.filter((t) => getUserRole(t) === 'PENGURUS');

    sppTrx.forEach((t) => {
      const isDeposit = t.type === 'DEPOSIT_SPP';
      const isWithdrawal = t.type === 'WITHDRAWAL_SPP';
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
        description: t.notes || (isDeposit ? 'Penerimaan Setoran SPP Santri' : 'Alokasi Penyaluran Dana SPP'),
        notes: t.notes,
        isDeposit,
        amountIn: amtIn,
        amountOut: amtOut,
        runningBalance: balance,
        method: t.method,
        tellerName: t.tellerName,
        userRole: 'PENGURUS',
      });
    });

    return {
      code: '2-2000',
      name: 'Dana Penerimaan & Pengelolaan SPP Syahriah',
      typeLabel: 'Dana Titipan Terikat Pesantren',
      category: 'PASIVA',
      userRole: 'PENGURUS',
      description: 'Dana operasional pendidikan pesantren yang bersumber dari akumulasi setoran SPP santri',
      totalIn,
      totalOut,
      finalBalance: neraca.pasiva.danaPenerimaanSPP,
      items,
    };
  }, [relevantTrx, neraca.pasiva.danaPenerimaanSPP]);

  // List of all accounts
  const allAccountGroups = useMemo<AccountGroup[]>(() => {
    return [
      ledgerKasTunaiBendahara,
      ledgerKasBankBendahara,
      ledgerWadiahBendahara,
      ledgerKasTunaiPengurus,
      ledgerKasBankPengurus,
      ledgerDanaSPPPengurus,
    ];
  }, [
    ledgerKasTunaiBendahara,
    ledgerKasBankBendahara,
    ledgerWadiahBendahara,
    ledgerKasTunaiPengurus,
    ledgerKasBankPengurus,
    ledgerDanaSPPPengurus,
  ]);

  // Filtered account ledgers based on selected user and account
  const displayedAccountLedgers = useMemo(() => {
    let list = allAccountGroups;

    // Filter by User
    if (selectedUserFilter !== 'ALL') {
      list = list.filter((a) => a.userRole === selectedUserFilter);
    }

    // Filter by specific account code
    if (selectedAccount !== 'ALL') {
      list = list.filter((a) => a.code === selectedAccount);
    }

    return list;
  }, [allAccountGroups, selectedUserFilter, selectedAccount]);

  // Helper filter search & mutation type
  const filterAccountItems = (items: AccountLedgerItem[]) => {
    const q = searchTerm.trim().toLowerCase();
    return items.filter((item) => {
      // Filter User Role
      if (selectedUserFilter !== 'ALL' && item.userRole !== selectedUserFilter) return false;

      // Filter Mutation Type
      if (mutationFilter === 'SETORAN' && !item.isDeposit) return false;
      if (mutationFilter === 'PENARIKAN' && item.isDeposit) return false;

      // Filter Search Keyword
      if (!q) return true;
      return (
        item.santriName.toLowerCase().includes(q) ||
        item.transactionNo.toLowerCase().includes(q) ||
        item.accountNumber.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        (item.notes || '').toLowerCase().includes(q) ||
        item.tellerName.toLowerCase().includes(q)
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
              Neraca Keuangan Terpadu (Pantau Transaksi Pengurus & Bendahara)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Laporan posisi keuangan terpadu: Kas Titipan Wadiah (Bendahara) & Kas Dana SPP Pesantren (Pengurus)
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
            documentTitle={`Laporan Neraca Keuangan Pesantren per ${asOfDate}`}
            defaultOrientation={formatType === 'SKONTRO' && viewMode === 'NERACA' ? 'landscape' : 'portrait'}
            defaultPaperSize="A4"
            buttonLabel="Cetak Laporan"
          />
        </div>
      </div>

      {/* Filter Bar: Pemantau Transaksi Tiap User (Pengurus & Bendahara) */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-sm border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 no-print">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-amber-400 border border-slate-700">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">
              Filter Pemantau Transaksi Tiap User di Neraca
            </h3>
            <p className="text-[11px] text-slate-300">
              Pilih untuk melihat transaksi spesifik yang dilakukan oleh Pengurus TU atau Bendahara Loket
            </p>
          </div>
        </div>

        <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700 text-xs">
          <button
            type="button"
            onClick={() => {
              setSelectedUserFilter('ALL');
              setSelectedAccount('ALL');
            }}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              selectedUserFilter === 'ALL'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Semua User (Terpadu)
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedUserFilter('BENDAHARA');
              setSelectedAccount('ALL');
            }}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
              selectedUserFilter === 'BENDAHARA'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-300 hover:text-emerald-300'
            }`}
          >
            <Wallet className="w-3.5 h-3.5 text-emerald-300" />
            <span>User Bendahara (Titipan Wadiah)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedUserFilter('PENGURUS');
              setSelectedAccount('ALL');
            }}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
              selectedUserFilter === 'PENGURUS'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-300 hover:text-amber-300'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5 text-amber-300" />
            <span>User Pengurus (Dana SPP)</span>
          </button>
        </div>
      </div>

      {/* Balance Indicator Status Box (No Print) */}
      <div className="no-print">
        {neraca.isBalanced ? (
          <div className="bg-emerald-50 border border-emerald-300 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-emerald-900">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-semibold">
                Status Neraca: <strong>SEIMBANG (BALANCE 100%)</strong>. Total Aktiva (Kas Bendahara + Kas Pengurus) = Total Pasiva (Kewajiban Wadiah + Dana SPP).
              </span>
            </div>
            <div className="font-mono-numbers font-bold text-emerald-900 text-right">
              Total Kas Terpadu: {formatRupiah(neraca.aktiva.totalAktiva)}
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
            Laporan Keuangan Terpadu Baitul Maal & Unit Tata Usaha Pesantren
          </p>
          <p className="text-[10px] text-slate-500 font-sans">
            {pesantrenProfile.address}, {pesantrenProfile.district} • Telp: {pesantrenProfile.phone}
          </p>
          <div className="mt-3 pt-2 border-t border-slate-200 flex flex-col items-center">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 font-sans">
              LAPORAN NERACA TERPADU & PENCATATAN TRANSAKSI DUA USER
            </h2>
            <p className="text-xs text-slate-500 font-sans font-medium">
              Per {formatDateIndo(neraca.asOfDate)} (Dinyatakan dalam Rupiah)
            </p>
            <div className="mt-1 flex flex-wrap items-center justify-center gap-1.5 font-sans">
              <span className="text-[10px] bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-full font-bold border border-emerald-300">
                User Bendahara: Kas Titipan Wadiah Uang Saku
              </span>
              <span className="text-[10px] bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full font-bold border border-amber-300">
                User Pengurus: Kas Dana SPP Syahriah Pesantren
              </span>
            </div>
          </div>
        </div>

        {/* SECTION 1: RINGKASAN NERACA */}
        {(viewMode === 'NERACA' || viewMode === 'SEMUA') && (
          <div className="space-y-6 mb-8">
            {/* 3 Metric Summary Cards: Bendahara vs Pengurus vs Total */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-sans">
              {/* Card 1: User Bendahara (Titipan Wadiah) */}
              <div className="bg-emerald-50/70 border-2 border-emerald-300 rounded-xl p-4">
                <div className="flex items-center justify-between text-emerald-900 text-xs font-bold border-b border-emerald-200 pb-2">
                  <span className="flex items-center gap-1.5">
                    <Wallet className="w-4 h-4 text-emerald-700" />
                    <span>USER BENDAHARA (TITIPAN WADIAH)</span>
                  </span>
                  <span className="text-[10px] bg-emerald-200 text-emerald-950 px-2 py-0.5 rounded-full font-mono">
                    {neraca.countSetoranTitipan + neraca.countPenarikanJajan} Trx
                  </span>
                </div>
                <div className="mt-3 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Setoran Titipan Masuk (+):</span>
                    <span className="font-bold text-emerald-800 font-mono-numbers">
                      {formatRupiah(neraca.totalSetoranTitipan)}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Penarikan Jajan & Kebutuhan (-):</span>
                    <span className="font-bold text-rose-700 font-mono-numbers">
                      - {formatRupiah(neraca.totalPenarikanJajan)}
                    </span>
                  </div>
                  <div className="flex justify-between text-emerald-950 font-black border-t border-emerald-200 pt-1.5 text-sm">
                    <span>Sisa Kas Titipan Wadiah:</span>
                    <span className="font-mono-numbers">
                      {formatRupiah(neraca.aktiva.totalAktivaBendahara)}
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-emerald-700 mt-2 italic">
                  Akun: 1-1000 (Tunai), 1-1010 (Bank), 2-1000 (Hak Santri)
                </p>
              </div>

              {/* Card 2: User Pengurus (Dana SPP Pesantren) */}
              <div className="bg-amber-50/70 border-2 border-amber-300 rounded-xl p-4">
                <div className="flex items-center justify-between text-amber-950 text-xs font-bold border-b border-amber-200 pb-2">
                  <span className="flex items-center gap-1.5">
                    <GraduationCap className="w-4 h-4 text-amber-700" />
                    <span>USER PENGURUS (DANA SPP)</span>
                  </span>
                  <span className="text-[10px] bg-amber-200 text-amber-950 px-2 py-0.5 rounded-full font-mono">
                    {neraca.countSetoranSPP + neraca.countPenarikanSPP} Trx
                  </span>
                </div>
                <div className="mt-3 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Penerimaan SPP Masuk (+):</span>
                    <span className="font-bold text-emerald-800 font-mono-numbers">
                      {formatRupiah(neraca.totalSetoranSPP)}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Penyaluran / Beban SPP (-):</span>
                    <span className="font-bold text-rose-700 font-mono-numbers">
                      - {formatRupiah(neraca.totalPenarikanSPP)}
                    </span>
                  </div>
                  <div className="flex justify-between text-amber-950 font-black border-t border-amber-200 pt-1.5 text-sm">
                    <span>Sisa Kas Dana SPP:</span>
                    <span className="font-mono-numbers">
                      {formatRupiah(neraca.aktiva.totalAktivaPengurus)}
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-amber-800 mt-2 italic">
                  Akun: 1-1100 (Tunai SPP), 1-1110 (Bank SPP), 2-2000 (Dana SPP)
                </p>
              </div>

              {/* Card 3: Total Konsolidasi Pesantren */}
              <div className="bg-slate-900 text-white rounded-xl p-4 border border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-emerald-400 text-xs font-bold border-b border-slate-800 pb-2">
                    <span className="flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-emerald-400" />
                      <span>TOTAL KONSOLIDASI PESANTREN</span>
                    </span>
                    <span className="text-[10px] bg-emerald-900/80 text-emerald-300 px-2 py-0.5 rounded-full font-mono font-bold">
                      Aktiva = Pasiva
                    </span>
                  </div>
                  <div className="mt-3 space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-300">
                      <span>Total Kas Titipan (Bendahara):</span>
                      <span className="font-bold font-mono-numbers text-white">
                        {formatRupiah(neraca.aktiva.totalAktivaBendahara)}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Total Kas SPP (Pengurus):</span>
                      <span className="font-bold font-mono-numbers text-white">
                        {formatRupiah(neraca.aktiva.totalAktivaPengurus)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-800 pt-2 mt-3 flex justify-between items-center">
                  <span className="text-xs uppercase tracking-wider text-emerald-300 font-bold">
                    TOTAL KAS TERPADU:
                  </span>
                  <span className="text-base font-black text-emerald-300 font-mono-numbers">
                    {formatRupiah(neraca.aktiva.totalAktiva)}
                  </span>
                </div>
              </div>
            </div>

            {/* FORMAT 1: SKONTRO (HORIZONTAL / T-ACCOUNT) */}
            {formatType === 'SKONTRO' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-2">
                {/* AKTIVA: SISI KIRI */}
                <div className="border border-slate-300 rounded-xl overflow-hidden flex flex-col justify-between">
                  <div>
                    <div className="bg-slate-900 text-white px-4 py-2.5 text-xs font-bold uppercase tracking-wider flex justify-between font-sans">
                      <span>AKTIVA (ASET KAS PESANTREN)</span>
                      <span>JUMLAH (RP)</span>
                    </div>

                    <div className="p-4 space-y-4 text-xs font-sans">
                      {/* I. Aset Kelolaan Bendahara */}
                      <div>
                        <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] border-b border-emerald-300 pb-1 flex items-center justify-between">
                          <span className="text-emerald-800 font-bold">I. Kas Titipan Wadiah (Kelolaan Bendahara)</span>
                          <span className="text-[10px] font-normal text-slate-500 font-mono">Loket Jajan</span>
                        </h4>

                        <div className="mt-2 space-y-2">
                          <div className="flex justify-between items-center text-slate-700 bg-emerald-50/40 p-2 rounded-lg border border-emerald-200">
                            <div>
                              <p className="font-bold text-slate-900">Kas Fisik Tunai Titipan</p>
                              <p className="text-[10px] text-slate-500 font-mono">1-1000 (Brankas Loket Bendahara)</p>
                            </div>
                            <span className="font-bold text-slate-900 font-mono-numbers">
                              {formatRupiah(neraca.aktiva.kasTunaiTitipan)}
                            </span>
                          </div>

                          <div className="flex justify-between items-center text-slate-700 bg-emerald-50/40 p-2 rounded-lg border border-emerald-200">
                            <div>
                              <p className="font-bold text-slate-900">Kas Rekening Bank Titipan</p>
                              <p className="text-[10px] text-slate-500 font-mono">1-1010 (Transfer Bank Wadiah Bendahara)</p>
                            </div>
                            <span className="font-bold text-slate-900 font-mono-numbers">
                              {formatRupiah(neraca.aktiva.kasBankTitipan)}
                            </span>
                          </div>

                          <div className="flex justify-between items-center text-emerald-950 font-bold px-2 py-1 bg-emerald-100/60 rounded">
                            <span>Subtotal Kas Kelolaan Bendahara:</span>
                            <span className="font-mono-numbers">{formatRupiah(neraca.aktiva.totalAktivaBendahara)}</span>
                          </div>
                        </div>
                      </div>

                      {/* II. Aset Kelolaan Pengurus */}
                      <div>
                        <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] border-b border-amber-300 pb-1 flex items-center justify-between">
                          <span className="text-amber-900 font-bold">II. Kas Dana SPP Pesantren (Kelolaan Pengurus)</span>
                          <span className="text-[10px] font-normal text-slate-500 font-mono">Kantor TU</span>
                        </h4>

                        <div className="mt-2 space-y-2">
                          <div className="flex justify-between items-center text-slate-700 bg-amber-50/40 p-2 rounded-lg border border-amber-200">
                            <div>
                              <p className="font-bold text-slate-900">Kas Fisik Tunai Dana SPP</p>
                              <p className="text-[10px] text-slate-500 font-mono">1-1100 (Kas Kantor TU Pengurus)</p>
                            </div>
                            <span className="font-bold text-slate-900 font-mono-numbers">
                              {formatRupiah(neraca.aktiva.kasTunaiSPP)}
                            </span>
                          </div>

                          <div className="flex justify-between items-center text-slate-700 bg-amber-50/40 p-2 rounded-lg border border-amber-200">
                            <div>
                              <p className="font-bold text-slate-900">Kas Rekening Bank Penerimaan SPP</p>
                              <p className="text-[10px] text-slate-500 font-mono">1-1110 (Rekening Transfer SPP Pengurus)</p>
                            </div>
                            <span className="font-bold text-slate-900 font-mono-numbers">
                              {formatRupiah(neraca.aktiva.kasBankSPP)}
                            </span>
                          </div>

                          <div className="flex justify-between items-center text-amber-950 font-bold px-2 py-1 bg-amber-100/60 rounded">
                            <span>Subtotal Kas Kelolaan Pengurus:</span>
                            <span className="font-mono-numbers">{formatRupiah(neraca.aktiva.totalAktivaPengurus)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Total Aktiva Footer */}
                  <div className="bg-slate-100 border-t-2 border-slate-900 p-3.5 flex justify-between items-center font-sans">
                    <div>
                      <span className="font-bold text-slate-900 text-xs uppercase tracking-wider block">
                        TOTAL AKTIVA (KAS TERPADU)
                      </span>
                      <span className="text-[10px] text-slate-500">Kas Bendahara + Kas Pengurus</span>
                    </div>
                    <span className="font-black text-base text-slate-950 font-mono-numbers">
                      {formatRupiah(neraca.aktiva.totalAktiva)}
                    </span>
                  </div>
                </div>

                {/* PASIVA: SISI KANAN */}
                <div className="border border-slate-300 rounded-xl overflow-hidden flex flex-col justify-between">
                  <div>
                    <div className="bg-slate-900 text-white px-4 py-2.5 text-xs font-bold uppercase tracking-wider flex justify-between font-sans">
                      <span>PASIVA (KEWAJIBAN & DANA PESANTREN)</span>
                      <span>JUMLAH (RP)</span>
                    </div>

                    <div className="p-4 space-y-4 text-xs font-sans">
                      {/* I. Tanggung Jawab Bendahara */}
                      <div>
                        <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] border-b border-emerald-300 pb-1 flex items-center justify-between">
                          <span className="text-emerald-800 font-bold">I. Kewajiban Titipan Wadiah (Bendahara)</span>
                          <span className="text-[10px] font-normal text-slate-500 font-mono">Hak Santri</span>
                        </h4>

                        <div className="mt-2 space-y-2">
                          <div className="flex justify-between items-start text-slate-700 bg-emerald-50/40 p-2.5 rounded-lg border border-emerald-200">
                            <div>
                              <p className="font-bold text-slate-900">Simpanan Titipan Wadiah Santri</p>
                              <p className="text-[10px] text-slate-500 font-mono">2-1000 (Akad Wadiah Yad Dhamanah)</p>
                              <p className="text-[10px] text-slate-600 mt-0.5">
                                Hak saldo uang saku {neraca.totalSantriWithBalance} santri aktif
                              </p>
                            </div>
                            <span className="font-bold text-slate-900 font-mono-numbers">
                              {formatRupiah(neraca.pasiva.kewajibanTitipanWadiah)}
                            </span>
                          </div>

                          <div className="flex justify-between items-center text-emerald-950 font-bold px-2 py-1 bg-emerald-100/60 rounded">
                            <span>Subtotal Pasiva Bendahara:</span>
                            <span className="font-mono-numbers">{formatRupiah(neraca.pasiva.totalPasivaBendahara)}</span>
                          </div>
                        </div>
                      </div>

                      {/* II. Tanggung Jawab Pengurus */}
                      <div>
                        <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] border-b border-amber-300 pb-1 flex items-center justify-between">
                          <span className="text-amber-900 font-bold">II. Dana Penerimaan SPP (Pengurus)</span>
                          <span className="text-[10px] font-normal text-slate-500 font-mono">Operasional</span>
                        </h4>

                        <div className="mt-2 space-y-2">
                          <div className="flex justify-between items-start text-slate-700 bg-amber-50/40 p-2.5 rounded-lg border border-amber-200">
                            <div>
                              <p className="font-bold text-slate-900">Dana Penerimaan & Pengelolaan SPP</p>
                              <p className="text-[10px] text-slate-500 font-mono">2-2000 (Dana Terikat SPP Syahriah)</p>
                              <p className="text-[10px] text-slate-600 mt-0.5">
                                Bersih penerimaan SPP setelah dialokasikan operasional
                              </p>
                            </div>
                            <span className="font-bold text-slate-900 font-mono-numbers">
                              {formatRupiah(neraca.pasiva.danaPenerimaanSPP)}
                            </span>
                          </div>

                          <div className="flex justify-between items-center text-amber-950 font-bold px-2 py-1 bg-amber-100/60 rounded">
                            <span>Subtotal Pasiva Pengurus:</span>
                            <span className="font-mono-numbers">{formatRupiah(neraca.pasiva.totalPasivaPengurus)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Total Pasiva Footer */}
                  <div className="bg-slate-100 border-t-2 border-slate-900 p-3.5 flex justify-between items-center font-sans">
                    <div>
                      <span className="font-bold text-slate-900 text-xs uppercase tracking-wider block">
                        TOTAL PASIVA (KEWAJIBAN & DANA)
                      </span>
                      <span className="text-[10px] text-slate-500">Kewajiban Wadiah + Dana SPP</span>
                    </div>
                    <span className="font-black text-base text-slate-950 font-mono-numbers">
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
                      <th className="px-4 py-2.5 text-left">Uraian Akun Neraca Terpadu</th>
                      <th className="px-4 py-2.5 text-left w-32">Pengelola User</th>
                      <th className="px-4 py-2.5 text-right w-36">Rincian (Rp)</th>
                      <th className="px-4 py-2.5 text-right w-40">Subtotal / Total (Rp)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {/* 1. AKTIVA */}
                    <tr className="bg-slate-100 font-bold text-slate-900">
                      <td colSpan={5} className="px-4 py-2 text-xs uppercase tracking-wider">
                        I. AKTIVA (ASET KAS TERPADU PESANTREN)
                      </td>
                    </tr>
                    {/* Kelolaan Bendahara */}
                    <tr>
                      <td className="px-4 py-2 text-slate-500 font-mono">1-1000</td>
                      <td className="px-4 py-2 text-slate-800">
                        <p className="font-semibold">Kas Fisik Tunai Titipan (Brankas Loket)</p>
                        <p className="text-[10px] text-slate-500">Uang saku tunai titipan orang tua untuk pencairan jajan santri</p>
                      </td>
                      <td className="px-4 py-2">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 font-mono">
                          BENDAHARA
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right font-mono-numbers">{formatRupiah(neraca.aktiva.kasTunaiTitipan)}</td>
                      <td></td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-slate-500 font-mono">1-1010</td>
                      <td className="px-4 py-2 text-slate-800">
                        <p className="font-semibold">Kas Rekening Bank Titipan (Transfer Bank)</p>
                        <p className="text-[10px] text-slate-500">Dana titipan orang tua yang disetor via perbankan syariah</p>
                      </td>
                      <td className="px-4 py-2">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 font-mono">
                          BENDAHARA
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right font-mono-numbers">{formatRupiah(neraca.aktiva.kasBankTitipan)}</td>
                      <td></td>
                    </tr>
                    <tr className="bg-emerald-50/60 font-semibold text-emerald-950">
                      <td className="px-4 py-1.5"></td>
                      <td colSpan={3} className="px-4 py-1.5 italic text-[11px]">Subtotal Kas Kelolaan Bendahara (Titipan Wadiah)</td>
                      <td className="px-4 py-1.5 text-right font-mono-numbers font-bold text-emerald-900">
                        {formatRupiah(neraca.aktiva.totalAktivaBendahara)}
                      </td>
                    </tr>

                    {/* Kelolaan Pengurus */}
                    <tr>
                      <td className="px-4 py-2 text-slate-500 font-mono">1-1100</td>
                      <td className="px-4 py-2 text-slate-800">
                        <p className="font-semibold">Kas Fisik Tunai Dana SPP (Kantor TU)</p>
                        <p className="text-[10px] text-slate-500">Penerimaan SPP syahriah bulanan santri tunai di kantor pengurus</p>
                      </td>
                      <td className="px-4 py-2">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 font-mono">
                          PENGURUS
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right font-mono-numbers">{formatRupiah(neraca.aktiva.kasTunaiSPP)}</td>
                      <td></td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-slate-500 font-mono">1-1110</td>
                      <td className="px-4 py-2 text-slate-800">
                        <p className="font-semibold">Kas Rekening Bank Penerimaan SPP (Transfer Bank)</p>
                        <p className="text-[10px] text-slate-500">Rekening perbankan khusus pembayaran SPP syahriah santri</p>
                      </td>
                      <td className="px-4 py-2">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 font-mono">
                          PENGURUS
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right font-mono-numbers">{formatRupiah(neraca.aktiva.kasBankSPP)}</td>
                      <td></td>
                    </tr>
                    <tr className="bg-amber-50/60 font-semibold text-amber-950">
                      <td className="px-4 py-1.5"></td>
                      <td colSpan={3} className="px-4 py-1.5 italic text-[11px]">Subtotal Kas Kelolaan Pengurus (Dana SPP Pesantren)</td>
                      <td className="px-4 py-1.5 text-right font-mono-numbers font-bold text-amber-900">
                        {formatRupiah(neraca.aktiva.totalAktivaPengurus)}
                      </td>
                    </tr>

                    <tr className="bg-slate-200/80 font-bold text-slate-900 border-t-2 border-b-2 border-slate-900">
                      <td className="px-4 py-2.5"></td>
                      <td colSpan={3} className="px-4 py-2.5 uppercase tracking-wide">TOTAL AKTIVA (KAS TERPADU KESELURUHAN)</td>
                      <td className="px-4 py-2.5 text-right font-black font-mono-numbers text-sm text-slate-950">
                        {formatRupiah(neraca.aktiva.totalAktiva)}
                      </td>
                    </tr>

                    {/* 2. PASIVA */}
                    <tr className="bg-slate-100 font-bold text-slate-900">
                      <td colSpan={5} className="px-4 py-2 text-xs uppercase tracking-wider">
                        II. PASIVA (KEWAJIBAN TITIPAN & DANA PESANTREN)
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-slate-500 font-mono">2-1000</td>
                      <td className="px-4 py-2 text-slate-800">
                        <p className="font-bold text-slate-900">Kewajiban Simpanan Wadiah Santri (Hak Uang Saku)</p>
                        <p className="text-[10px] text-slate-500">
                          Total hak saldo titipan uang saku milik seluruh santri aktif ({neraca.totalSantriWithBalance} santri bersaldo)
                        </p>
                      </td>
                      <td className="px-4 py-2">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 font-mono">
                          BENDAHARA
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right font-mono-numbers font-bold text-emerald-800">
                        {formatRupiah(neraca.pasiva.kewajibanTitipanWadiah)}
                      </td>
                      <td className="px-4 py-2 text-right font-mono-numbers font-bold text-emerald-900">
                        {formatRupiah(neraca.pasiva.totalPasivaBendahara)}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-slate-500 font-mono">2-2000</td>
                      <td className="px-4 py-2 text-slate-800">
                        <p className="font-bold text-slate-900">Dana Penerimaan & Pengelolaan SPP Syahriah</p>
                        <p className="text-[10px] text-slate-500">
                          Total akumulasi pembayaran SPP santri setelah penyaluran untuk operasional pendidikan
                        </p>
                      </td>
                      <td className="px-4 py-2">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 font-mono">
                          PENGURUS
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right font-mono-numbers font-bold text-amber-800">
                        {formatRupiah(neraca.pasiva.danaPenerimaanSPP)}
                      </td>
                      <td className="px-4 py-2 text-right font-mono-numbers font-bold text-amber-900">
                        {formatRupiah(neraca.pasiva.totalPasivaPengurus)}
                      </td>
                    </tr>

                    <tr className="bg-slate-900 text-white font-bold text-xs uppercase tracking-wider">
                      <td className="px-4 py-2.5"></td>
                      <td colSpan={3} className="px-4 py-2.5">TOTAL PASIVA (KEWAJIBAN & DANA KESELURUHAN)</td>
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

        {/* SECTION 2: PENCATATAN TRANSAKSI TIAP AKUN & TIAP USER */}
        {(viewMode === 'BUKU_PEMBANTU' || viewMode === 'SEMUA') && (
          <div className="space-y-6 pt-6 border-t-2 border-slate-900">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <div className="flex items-center space-x-2">
                  <BookOpen className="w-5 h-5 text-emerald-700" />
                  <h3 className="text-base font-bold text-slate-900 font-sans uppercase tracking-wide">
                    Pencatatan Transaksi Tiap Akun (Buku Pembantu / Sub-Ledger Neraca)
                  </h3>
                </div>
                <p className="text-xs text-slate-500 font-sans mt-0.5">
                  Rincian transaksi per akun untuk memantau transaksi yang dilakukan oleh User Pengurus dan User Bendahara
                </p>
              </div>

              {/* Account Selector Pill Tabs */}
              <div className="flex flex-wrap items-center gap-1.5 no-print font-sans text-xs">
                <button
                  type="button"
                  onClick={() => setSelectedAccount('ALL')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    selectedAccount === 'ALL'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Semua Akun ({displayedAccountLedgers.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedAccount('1-1000')}
                  className={`px-2.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center space-x-1 ${
                    selectedAccount === '1-1000'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                  }`}
                >
                  <Wallet className="w-3 h-3" />
                  <span>1-1000 Tunai Titipan</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedAccount('1-1010')}
                  className={`px-2.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center space-x-1 ${
                    selectedAccount === '1-1010'
                      ? 'bg-teal-700 text-white shadow-xs'
                      : 'bg-teal-50 text-teal-800 hover:bg-teal-100'
                  }`}
                >
                  <Landmark className="w-3 h-3" />
                  <span>1-1010 Bank Titipan</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedAccount('2-1000')}
                  className={`px-2.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center space-x-1 ${
                    selectedAccount === '2-1000'
                      ? 'bg-emerald-800 text-white shadow-xs'
                      : 'bg-emerald-50 text-emerald-900 hover:bg-emerald-100'
                  }`}
                >
                  <Layers className="w-3 h-3" />
                  <span>2-1000 Wadiah Santri</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedAccount('1-1100')}
                  className={`px-2.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center space-x-1 ${
                    selectedAccount === '1-1100'
                      ? 'bg-amber-700 text-white shadow-xs'
                      : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                  }`}
                >
                  <GraduationCap className="w-3 h-3" />
                  <span>1-1100 Tunai SPP</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedAccount('1-1110')}
                  className={`px-2.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center space-x-1 ${
                    selectedAccount === '1-1110'
                      ? 'bg-amber-800 text-white shadow-xs'
                      : 'bg-amber-50 text-amber-900 hover:bg-amber-100'
                  }`}
                >
                  <Landmark className="w-3 h-3" />
                  <span>1-1110 Bank SPP</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedAccount('2-2000')}
                  className={`px-2.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center space-x-1 ${
                    selectedAccount === '2-2000'
                      ? 'bg-indigo-700 text-white shadow-xs'
                      : 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100'
                  }`}
                >
                  <Layers className="w-3 h-3" />
                  <span>2-2000 Dana SPP</span>
                </button>
              </div>
            </div>

            {/* Filter Bar (No Print) */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print font-sans text-xs">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Cari santri, no transaksi, petugas, uraian..."
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

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center space-x-1.5">
                  <span className="text-slate-500 font-semibold">User:</span>
                  <select
                    value={selectedUserFilter}
                    onChange={(e) => setSelectedUserFilter(e.target.value as UserFilter)}
                    className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  >
                    <option value="ALL">Semua User</option>
                    <option value="BENDAHARA">User Bendahara</option>
                    <option value="PENGURUS">User Pengurus</option>
                  </select>
                </div>

                <div className="flex items-center space-x-1.5">
                  <span className="text-slate-500 font-semibold">Mutasi:</span>
                  <select
                    value={mutationFilter}
                    onChange={(e) => setMutationFilter(e.target.value as MutationFilter)}
                    className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  >
                    <option value="ALL">Semua Mutasi</option>
                    <option value="SETORAN">Hanya Setoran (+)</option>
                    <option value="PENARIKAN">Hanya Penarikan (-)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Account Tables */}
            <div className="space-y-8">
              {displayedAccountLedgers.map((account) => {
                const filteredItems = filterAccountItems(account.items);
                const subtotalIn = filteredItems.reduce((acc, it) => acc + it.amountIn, 0);
                const subtotalOut = filteredItems.reduce((acc, it) => acc + it.amountOut, 0);
                const isPengurus = account.userRole === 'PENGURUS';

                return (
                  <div
                    key={account.code}
                    className={`border rounded-2xl overflow-hidden shadow-xs bg-white ${
                      isPengurus ? 'border-amber-300' : 'border-emerald-300'
                    }`}
                  >
                    {/* Account Header Banner */}
                    <div className="bg-slate-900 text-white p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 font-sans">
                      <div className="flex items-center space-x-3">
                        <div
                          className={`w-11 h-11 rounded-xl flex items-center justify-center font-mono font-black text-sm border ${
                            isPengurus
                              ? 'bg-amber-950 text-amber-300 border-amber-700'
                              : 'bg-emerald-950 text-emerald-300 border-emerald-700'
                          }`}
                        >
                          {account.code}
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-bold text-sm text-white tracking-wide">
                              {account.name}
                            </h4>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-black font-mono tracking-wider ${
                                isPengurus
                                  ? 'bg-amber-500 text-slate-950'
                                  : 'bg-emerald-500 text-slate-950'
                              }`}
                            >
                              USER {account.userRole}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-slate-800 text-slate-300 border border-slate-700">
                              {account.category} • {account.typeLabel}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {account.description}
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
                            <th className="px-3 py-2.5 text-center w-28">User Operator</th>
                            <th className="px-3 py-2.5 text-left w-28">No. Transaksi</th>
                            <th className="px-3 py-2.5 text-left">Nama Santri & Rekening</th>
                            <th className="px-3 py-2.5 text-left">Uraian Transaksi</th>
                            <th className="px-3 py-2.5 text-left w-24">Metode</th>
                            <th className="px-3 py-2.5 text-right w-28">Setoran (+)</th>
                            <th className="px-3 py-2.5 text-right w-28">Penarikan (-)</th>
                            <th className="px-3 py-2.5 text-right w-32">Saldo Akun (Rp)</th>
                            <th className="px-3 py-2.5 text-left w-28">Petugas / Teller</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 font-sans">
                          {filteredItems.length === 0 ? (
                            <tr>
                              <td colSpan={11} className="px-4 py-8 text-center text-slate-400 italic">
                                Belum ada pencatatan transaksi untuk akun ini ({account.code}) yang cocok dengan filter.
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
                                <td className="px-3 py-2 text-center whitespace-nowrap">
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold font-mono ${
                                      item.userRole === 'PENGURUS'
                                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                        : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                    }`}
                                  >
                                    {item.userRole}
                                  </span>
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
                                <td className="px-3 py-2 text-slate-600 text-[10px] whitespace-nowrap">
                                  {item.tellerName || (item.userRole === 'PENGURUS' ? 'Pengurus TU' : 'Bendahara Loket')}
                                </td>
                              </tr>
                            ))
                          )}

                          {/* Subtotal Footer Row */}
                          <tr className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300 font-sans">
                            <td colSpan={7} className="px-3 py-2.5 text-right uppercase text-[11px] tracking-wide">
                              TOTAL MUTASI AKUN {account.code} ({filteredItems.length} TRANSAKSI)
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
              <strong className="text-slate-800">Prinsip Pemisahan Kas Dua User di Neraca Pesantren:</strong>
              <p className="mt-0.5 text-slate-600 leading-relaxed">
                1. <strong>Tanggung Jawab User Bendahara (Akun 1-1000, 1-1010, 2-1000):</strong> Mengelola kas titipan uang saku (Akad Wadiah Murni). Uang saku adalah hak milik santri dan titipan orang tua untuk pencairan jajan harian dan kebutuhan santri.
              </p>
              <p className="text-slate-600 leading-relaxed">
                2. <strong>Tanggung Jawab User Pengurus (Akun 1-1100, 1-1110, 2-2000):</strong> Mengelola kas penerimaan SPP syahriah bulanan untuk pembiayaan operasional pendidikan pesantren (gaji ustadz, dapur/konsumsi, fasilitas).
              </p>
              <p className="text-slate-600 leading-relaxed">
                3. Seluruh transaksi kedua user ini tercatat secara terpisah dan transparan pada Neraca, dengan total aktiva terpadu persis seimbang dengan total pasiva terpadu tanpa selisih.
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
