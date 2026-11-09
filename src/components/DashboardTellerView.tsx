import React, { useState, useMemo } from 'react';
import { 
  HandCoins, 
  Wallet, 
  ShieldCheck, 
  Lock, 
  CheckCircle2, 
  AlertTriangle, 
  Search,
  Coins,
  Building2,
  Table,
  LayoutGrid,
  ShoppingBag,
  BookOpen,
  Stethoscope,
  Shirt,
  Sparkles,
  Printer,
  History,
  MinusCircle
} from 'lucide-react';
import { Santri, Transaction, PesantrenProfile } from '../types/finance';
import { 
  formatRupiah, 
  checkDailyAllowanceEligibility, 
  getTodayDateString 
} from '../utils/accounting';
import { SantriSelectTable } from './SantriSelectTable';

interface DashboardTellerViewProps {
  santriList: Santri[];
  transactions: Transaction[];
  pesantrenProfile: PesantrenProfile;
  totalWadiah: number;
  onOpenTellerForSantri: (santriId: string) => void;
  onOpenDeposit: () => void;
  onQuickDispense: (santriId: string) => void;
  onViewStatement: (santriId: string) => void;
  onProcessCustomWithdrawal?: (
    santriId: string,
    amount: number,
    category: string,
    notes: string
  ) => void;
  onViewReceipt?: (trx: Transaction, santri: Santri) => void;
}

const KEBUTUHAN_CATEGORIES = [
  { id: 'Kitab & Buku', label: 'Kitab & Buku Pelajaran', defaultNote: 'Pembelian kitab kuning & buku pelajaran', icon: BookOpen },
  { id: 'Kesehatan & Obat', label: 'Kesehatan & Obat (UKS / Berobat)', defaultNote: 'Biaya berobat / obat santri', icon: Stethoscope },
  { id: 'Seragam & Pakaian', label: 'Seragam, Jilbab & Pakaian', defaultNote: 'Pembelian seragam / jilbab / sarung santri', icon: Shirt },
  { id: 'Perlengkapan Asrama', label: 'Perlengkapan Asrama & Mandi', defaultNote: 'Perlengkapan mandi & kebutuhan kamar asrama', icon: ShoppingBag },
  { id: 'Laundry & Kebersihan', label: 'Laundry & Kebersihan', defaultNote: 'Biaya cuci pakaian laundry santri', icon: Sparkles },
  { id: 'Uang Saku Pulang / Izin', label: 'Uang Saku Pulang / Izin Libur', defaultNote: 'Uang saku perjalanan pulang / izin libur', icon: HandCoins },
  { id: 'Kebutuhan Lainnya', label: 'Keperluan Mendesak Lainnya', defaultNote: 'Keperluan khusus mendesak santri', icon: MinusCircle },
];

export const DashboardTellerView: React.FC<DashboardTellerViewProps> = ({
  santriList,
  transactions,
  pesantrenProfile,
  totalWadiah,
  onOpenTellerForSantri,
  onQuickDispense,
  onViewStatement,
  onProcessCustomWithdrawal,
  onViewReceipt,
}) => {
  // Main sub-menu view mode: 'JAJAN' or 'KEBUTUHAN_LAIN'
  const [activeMode, setActiveMode] = useState<'JAJAN' | 'KEBUTUHAN_LAIN'>('JAJAN');

  // State for Jajan
  const [filterMode, setFilterMode] = useState<'ALL' | 'READY' | 'ALREADY_TAKEN'>('READY');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDormitory, setSelectedDormitory] = useState('ALL');
  const [displayLayout, setDisplayLayout] = useState<'TABLE' | 'CARDS'>('TABLE');

  // State for Kebutuhan Lainnya
  const [customSantriId, setCustomSantriId] = useState<string>(santriList[0]?.id || '');
  const [customAmount, setCustomAmount] = useState<number>(50000);
  const [customCategory, setCustomCategory] = useState<string>('Kitab & Buku');
  const [customNotes, setCustomNotes] = useState<string>('Pembelian kitab pelajaran semester baru');

  const todayStr = getTodayDateString();

  // Transactions today
  const todayTransactions = transactions.filter((t) => t.date === todayStr);
  const todayWithdrawals = todayTransactions.filter((t) => t.type === 'WITHDRAWAL_JAJAN');
  const totalJajanToday = todayWithdrawals.reduce((sum, t) => sum + t.amount, 0);

  // Special / other withdrawals history
  const otherWithdrawals = useMemo(() => {
    return transactions.filter(
      (t) =>
        t.type === 'SPECIAL_DISBURSEMENT' ||
        t.type === 'WITHDRAWAL_OTHER' ||
        (t.category && t.category !== 'Setoran Titipan Wali' && t.category !== 'Uang Jajan Santri' && !t.category.includes('SPP'))
    );
  }, [transactions]);

  const totalOtherWithdrawals = useMemo(() => {
    return otherWithdrawals.reduce((sum, t) => sum + t.amount, 0);
  }, [otherWithdrawals]);

  // Compute status for all santri (Jajan)
  const santriStatusList = santriList.map((santri) => {
    const eligibility = checkDailyAllowanceEligibility(santri, transactions, todayStr);
    return {
      santri,
      eligibility,
    };
  });

  const readySantriCount = santriStatusList.filter((s) => s.eligibility.canWithdraw).length;
  const alreadyTakenCount = santriStatusList.filter((s) => s.eligibility.status === 'ALREADY_TAKEN').length;

  // Dormitories list
  const dormitories = Array.from(new Set(santriList.map((s) => s.dormitory.split(' - ')[0])));

  const filteredList = santriStatusList.filter(({ santri, eligibility }) => {
    const matchesSearch =
      santri.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      santri.nisn.includes(searchTerm) ||
      santri.accountNumber.includes(searchTerm) ||
      santri.dormitory.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesDorm = selectedDormitory === 'ALL' || santri.dormitory.startsWith(selectedDormitory);

    if (!matchesSearch || !matchesDorm) return false;

    if (filterMode === 'READY') return eligibility.canWithdraw;
    if (filterMode === 'ALREADY_TAKEN') return eligibility.status === 'ALREADY_TAKEN';
    return true;
  });

  // Selected santri for Kebutuhan Lain
  const selectedCustomSantri = useMemo(() => {
    return santriList.find((s) => s.id === customSantriId) || santriList[0];
  }, [santriList, customSantriId]);

  const isCustomBalanceSufficient = selectedCustomSantri ? selectedCustomSantri.balance >= customAmount : false;

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomSantri || customAmount <= 0 || !isCustomBalanceSufficient) return;
    if (onProcessCustomWithdrawal) {
      onProcessCustomWithdrawal(
        selectedCustomSantri.id,
        customAmount,
        customCategory,
        customNotes
      );
    }
    setCustomNotes('Keperluan santri');
  };

  return (
    <div className="space-y-6">
      {/* Main Teller Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Navigation Tabs between Jajan vs Kebutuhan Lainnya */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveMode('JAJAN')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeMode === 'JAJAN'
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <HandCoins className="w-4 h-4" />
              <span>Penarikan Jajan Harian</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                activeMode === 'JAJAN' ? 'bg-emerald-900 text-emerald-200' : 'bg-slate-100 text-slate-500'
              }`}>
                Maks. Rp 10.000 / Hari
              </span>
            </button>

            <button
              onClick={() => setActiveMode('KEBUTUHAN_LAIN')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeMode === 'KEBUTUHAN_LAIN'
                  ? 'bg-indigo-700 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Penarikan Kebutuhan Lainnya</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                activeMode === 'KEBUTUHAN_LAIN' ? 'bg-indigo-900 text-indigo-200' : 'bg-slate-100 text-slate-500'
              }`}>
                Kitab, Obat, Seragam, dll.
              </span>
            </button>
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Menu Bendahara • Penarikan
          </div>
        </div>

        {/* MODE 1: PENARIKAN JAJAN HARIAN (RP 10.000) */}
        {activeMode === 'JAJAN' && (
          <div className="p-5 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <HandCoins className="w-5 h-5 text-emerald-700" />
                  <span>Loket Penarikan Jajan Santri (Maks. Rp 10.000 / 1x Sehari)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Pengambilan uang saku harian santri. Kuota otomatis terkunci setelah diambil 1 kali pada hari ini.
                </p>
              </div>

              {/* View Layout Toggle */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setDisplayLayout('TABLE')}
                  className={`p-2 rounded-lg border text-xs font-medium flex items-center space-x-1.5 transition-colors cursor-pointer ${
                    displayLayout === 'TABLE'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                  title="Tampilan Tabel"
                >
                  <Table className="w-4 h-4" />
                  <span className="hidden sm:inline">Tabel</span>
                </button>
                <button
                  onClick={() => setDisplayLayout('CARDS')}
                  className={`p-2 rounded-lg border text-xs font-medium flex items-center space-x-1.5 transition-colors cursor-pointer ${
                    displayLayout === 'CARDS'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                  title="Tampilan Kartu"
                >
                  <LayoutGrid className="w-4 h-4" />
                  <span className="hidden sm:inline">Kartu</span>
                </button>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col md:flex-row gap-3 pt-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari Nama Santri, NISN, No. Rekening, atau Asrama..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                />
              </div>

              {/* Filter Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setFilterMode('READY')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    filterMode === 'READY'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Siap Ambil ({readySantriCount})
                </button>
                <button
                  onClick={() => setFilterMode('ALREADY_TAKEN')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    filterMode === 'ALREADY_TAKEN'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Sudah Ambil ({alreadyTakenCount})
                </button>
                <button
                  onClick={() => setFilterMode('ALL')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    filterMode === 'ALL'
                      ? 'bg-slate-800 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Semua ({santriList.length})
                </button>

                {/* Dormitory Dropdown */}
                <select
                  value={selectedDormitory}
                  onChange={(e) => setSelectedDormitory(e.target.value)}
                  className="bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl px-3 py-2 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="ALL">Semua Asrama</option>
                  {dormitories.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Santri Data Display: Table or Cards */}
            {filteredList.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                Tidak ada data santri yang cocok dengan filter.
              </div>
            ) : displayLayout === 'TABLE' ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                      <th className="py-2.5 px-3">Santri</th>
                      <th className="py-2.5 px-3">Asrama & Kelas</th>
                      <th className="py-2.5 px-3">Saldo Wadiah</th>
                      <th className="py-2.5 px-3">Status Hari Ini</th>
                      <th className="py-2.5 px-3 text-center">Aksi Teller</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredList.map(({ santri, eligibility }) => (
                      <tr key={santri.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-slate-900">{santri.name}</div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            NISN: {santri.nisn} • {santri.accountNumber}
                          </div>
                          <div className="text-[10px] text-slate-600">
                            Wali: <strong className="text-slate-800">{santri.guardianName}</strong>
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="text-slate-800 font-medium">{santri.dormitory}</div>
                          <div className="text-[10px] text-slate-500">{santri.className}</div>
                        </td>
                        <td className="py-2.5 px-3 font-bold text-emerald-700 font-mono-numbers">
                          {formatRupiah(santri.balance)}
                        </td>
                        <td className="py-2.5 px-3">
                          {eligibility.canWithdraw ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Bisa Ambil (Rp 10.000)
                            </span>
                          ) : eligibility.status === 'ALREADY_TAKEN' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              <Lock className="w-3 h-3 text-amber-600" />
                              Sudah Ambil {eligibility.todayWithdrawal?.time ? `(${eligibility.todayWithdrawal.time})` : ''}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              <AlertTriangle className="w-3 h-3 text-rose-600" />
                              Saldo Kurang
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {eligibility.canWithdraw ? (
                              <button
                                onClick={() => onQuickDispense(santri.id)}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs cursor-pointer"
                              >
                                Cairkan Rp 10.000
                              </button>
                            ) : (
                              <button
                                disabled
                                className="px-3 py-1.5 bg-slate-100 text-slate-400 rounded-lg text-xs font-medium cursor-not-allowed"
                              >
                                Terkunci
                              </button>
                            )}

                            <button
                              onClick={() => onViewStatement(santri.id)}
                              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                              title="Lihat Mutasi Rekening"
                            >
                              Mutasi
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredList.map(({ santri, eligibility }) => (
                  <div
                    key={santri.id}
                    className="p-4 rounded-xl border border-slate-200 hover:border-emerald-300 transition-all bg-white flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-bold text-slate-900 text-xs sm:text-sm">{santri.name}</h4>
                          <span className="text-[10px] text-slate-500 font-mono">{santri.accountNumber}</span>
                        </div>
                        <span className="text-xs font-bold text-emerald-700 font-mono-numbers">
                          {formatRupiah(santri.balance)}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600">{santri.dormitory}</p>
                    </div>

                    <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
                      {eligibility.canWithdraw ? (
                        <button
                          onClick={() => onQuickDispense(santri.id)}
                          className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors"
                        >
                          Cairkan Rp 10.000
                        </button>
                      ) : (
                        <button
                          disabled
                          className="w-full py-2 bg-slate-100 text-slate-400 rounded-lg text-xs font-medium cursor-not-allowed"
                        >
                          Sudah Diambil Hari Ini
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* MODE 2: PENARIKAN KEBUTUHAN LAINNYA (KITAB, SERAGAM, OBAT, DLL) */}
        {activeMode === 'KEBUTUHAN_LAIN' && (
          <div className="p-5 space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-indigo-700" />
                <span>Penarikan Kebutuhan Lainnya (Kitab, Seragam, Kesehatan, Laundry, dll.)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Pencairan dana titipan santri untuk keperluan khusus di luar uang jajan harian, dengan nominal sesuai kebutuhan dan izin orang tua / wali.
              </p>
            </div>

            <div className="max-w-3xl mx-auto">
              <div className="bg-slate-50/70 rounded-xl p-5 sm:p-6 border border-slate-200 space-y-4 shadow-xs">
                <form onSubmit={handleCustomSubmit} className="space-y-4">
                  {/* Pilihan Santri yang Membutuhkan (Tabel: Nama Santri, Wali Santri, Sisa Saldo) */}
                  <SantriSelectTable
                    santriList={santriList}
                    selectedSantriId={customSantriId}
                    onSelectSantri={(santri) => setCustomSantriId(santri.id)}
                    accentColor="indigo"
                    estimatedDelta={-customAmount}
                    label="Pilih Santri yang Membutuhkan (Verifikasi Nama, Wali & Saldo):"
                    placeholder="Cari nama santri, wali santri, NISN, atau no. rekening..."
                  />

                  {/* Kategori Keperluan (Dropdown) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                      <span>Kategori Keperluan:</span>
                      <span className="text-[10px] text-indigo-700 font-semibold font-mono">Pilihan Dropdown</span>
                    </label>
                    <select
                      value={customCategory}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCustomCategory(val);
                        const found = KEBUTUHAN_CATEGORIES.find((cat) => cat.id === val);
                        if (found) {
                          setCustomNotes(found.defaultNote);
                        }
                      }}
                      className="w-full text-xs font-bold p-2.5 sm:p-3 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs cursor-pointer text-slate-900"
                    >
                      {KEBUTUHAN_CATEGORIES.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.label}
                        </option>
                      ))}
                    </select>

                    {/* Preview Badge Kategori Terpilih */}
                    {(() => {
                      const activeCat = KEBUTUHAN_CATEGORIES.find((c) => c.id === customCategory) || KEBUTUHAN_CATEGORIES[0];
                      const Icon = activeCat.icon;
                      return (
                        <div className="mt-2 flex items-center gap-2 p-2 rounded-lg bg-indigo-50/80 border border-indigo-200/80 text-indigo-900 text-[11px]">
                          <Icon className="w-3.5 h-3.5 text-indigo-700 shrink-0" />
                          <span>Kategori: <strong>{activeCat.label}</strong></span>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Nominal Penarikan */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Nominal Penarikan Keperluan:
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-500">
                        Rp
                      </span>
                      <input
                        type="number"
                        min={5000}
                        step={5000}
                        value={customAmount}
                        onChange={(e) => setCustomAmount(Number(e.target.value))}
                        className="w-full pl-9 pr-3 py-2 text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono-numbers"
                      />
                    </div>
                    {/* Preset Nominal (Termasuk 10rb dan 20rb) */}
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {[10000, 20000, 50000, 75000, 100000, 150000, 200000].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setCustomAmount(preset)}
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-lg border transition-colors cursor-pointer ${
                            customAmount === preset
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {preset / 1000}rb
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Keterangan */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Rincian Keterangan & Izin Wali:
                    </label>
                    <input
                      type="text"
                      value={customNotes}
                      onChange={(e) => setCustomNotes(e.target.value)}
                      placeholder="Contoh: Beli Kitab Fathul Qorib atas izin wali santri"
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Validasi Saldo */}
                  <div className={`p-3 rounded-xl border text-xs space-y-1 ${
                    isCustomBalanceSufficient ? 'bg-indigo-50/70 border-indigo-200 text-indigo-900' : 'bg-rose-50 border-rose-200 text-rose-900'
                  }`}>
                    <div className="flex justify-between">
                      <span>Saldo Titipan Santri Saat Ini:</span>
                      <span className="font-bold font-mono-numbers">{formatRupiah(selectedCustomSantri?.balance || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Penarikan Kebutuhan:</span>
                      <span className="font-bold font-mono-numbers text-rose-600">- {formatRupiah(customAmount)}</span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-slate-200 font-bold">
                      <span>Sisa Saldo Setelah Dicairkan:</span>
                      <span className="font-mono-numbers">{formatRupiah((selectedCustomSantri?.balance || 0) - customAmount)}</span>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={!selectedCustomSantri || customAmount <= 0 || !isCustomBalanceSufficient}
                    className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold text-sm rounded-xl shadow-md shadow-indigo-900/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Cairkan Kebutuhan & Terbitkan Struk</span>
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
