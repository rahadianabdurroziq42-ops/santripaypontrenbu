import React, { useState, useMemo } from 'react';
import { 
  FileCheck, 
  Search, 
  Wallet, 
  AlertTriangle, 
  CheckCircle2, 
  Calendar, 
  UserCheck, 
  Receipt,
  ArrowRight,
  ShieldCheck,
  Building2,
  Printer,
  History,
  MinusCircle
} from 'lucide-react';
import { Santri, Transaction, PesantrenProfile } from '../types/finance';
import { formatRupiah } from '../utils/accounting';

interface PenarikanSPPViewProps {
  santriList: Santri[];
  transactions: Transaction[];
  pesantrenProfile: PesantrenProfile;
  onProcessSPPWithdrawal: (
    santriId: string,
    amount: number,
    sppMonth: string,
    notes: string
  ) => void;
  onViewReceipt: (trx: Transaction, santri: Santri) => void;
}

const MONTHS_LIST = [
  'Juli 2026',
  'Agustus 2026',
  'September 2026',
  'Oktober 2026',
  'November 2026',
  'Desember 2026',
  'Januari 2027',
  'Februari 2027',
  'Maret 2027',
  'April 2027',
  'Mei 2027',
  'Juni 2027'
];

export const PenarikanSPPView: React.FC<PenarikanSPPViewProps> = ({
  santriList,
  transactions,
  pesantrenProfile,
  onProcessSPPWithdrawal,
  onViewReceipt,
}) => {
  const [selectedSantriId, setSelectedSantriId] = useState<string>(santriList[0]?.id || '');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('November 2026');
  const [deductionAmount, setDeductionAmount] = useState<number>(450000);
  const [notes, setNotes] = useState<string>('Pelunasan SPP Syahriah via Potong Saldo Titipan');

  const selectedSantri = useMemo(() => {
    return santriList.find((s) => s.id === selectedSantriId) || santriList[0];
  }, [santriList, selectedSantriId]);

  const filteredSantriList = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return santriList;
    return santriList.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.nisn.includes(q) ||
        s.accountNumber.includes(q) ||
        s.dormitory.toLowerCase().includes(q) ||
        s.className.toLowerCase().includes(q)
    );
  }, [santriList, searchQuery]);

  const isBalanceSufficient = selectedSantri ? selectedSantri.balance >= deductionAmount : false;
  const remainingBalanceAfter = selectedSantri ? selectedSantri.balance - deductionAmount : 0;

  // History of SPP deductions from Wadiah
  const sppDeductionTransactions = useMemo(() => {
    return transactions.filter(
      (t) =>
        t.type === 'WITHDRAWAL_SPP' ||
        (t.type === 'SPECIAL_DISBURSEMENT' && t.notes && t.notes.toLowerCase().includes('spp'))
    );
  }, [transactions]);

  const totalDeductedSPP = useMemo(() => {
    return sppDeductionTransactions.reduce((sum, t) => sum + t.amount, 0);
  }, [sppDeductionTransactions]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSantri || deductionAmount <= 0 || !isBalanceSufficient) return;

    const fullNotes = `Penarikan/Potong Saldo SPP ${selectedMonth}: ${notes}`;
    onProcessSPPWithdrawal(
      selectedSantri.id,
      deductionAmount,
      selectedMonth,
      fullNotes
    );

    setNotes('Pelunasan SPP Syahriah via Potong Saldo Titipan');
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-teal-900 via-emerald-950 to-slate-900 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-400/30">
                Menu Bendahara • Penarikan
              </span>
              <span className="text-[11px] font-semibold text-slate-300">
                Auto-Debet / Potong Saldo Wadiah
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2.5">
              <MinusCircle className="w-6 h-6 text-teal-400" />
              <span>Penarikan SPP dari Saldo Titipan</span>
            </h1>
            <p className="text-xs sm:text-sm text-teal-100/80 mt-1 max-w-2xl">
              Pemotongan uang SPP santri yang dibayarkan langsung dari saldo titipan wadiah atas instruksi / persetujuan orang tua santri.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/15 text-right shrink-0">
            <span className="text-[11px] font-semibold text-teal-200 uppercase tracking-wider block">
              Total SPP Dipotong dari Wadiah
            </span>
            <span className="text-xl sm:text-2xl font-black text-amber-300 font-mono-numbers">
              {formatRupiah(totalDeductedSPP)}
            </span>
            <span className="text-[10px] text-slate-300 block mt-0.5">
              {sppDeductionTransactions.length} Transaksi Pelunasan
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Form Left (7 cols), Selected Santri Detail Right (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form Penarikan SPP (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-teal-600" />
              <span>Formulir Potong Saldo Titipan untuk SPP</span>
            </h2>
            <span className="text-xs text-slate-500">
              Debet Rekening Wadiah
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 1. Pilih Santri */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Pilih Santri:
              </label>
              <div className="relative mb-2">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari Nama Santri / NISN / No. Rekening..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
                />
              </div>

              <select
                value={selectedSantriId}
                onChange={(e) => setSelectedSantriId(e.target.value)}
                className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                {filteredSantriList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} - Saldo: {formatRupiah(s.balance)} ({s.dormitory})
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Bulan SPP & Nominal */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Bulan SPP yang Dilunasi:
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    {MONTHS_LIST.map((m) => (
                      <option key={m} value={m}>
                        SPP Bulan {m}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Nominal SPP yang Dipotong:
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-bold text-slate-500">
                    Rp
                  </span>
                  <input
                    type="number"
                    min={10000}
                    step={10000}
                    value={deductionAmount}
                    onChange={(e) => setDeductionAmount(Number(e.target.value))}
                    className="w-full pl-9 pr-3 py-2 text-xs font-bold text-slate-900 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono-numbers"
                  />
                </div>
                <div className="flex gap-1.5 mt-1.5">
                  {[350000, 450000, 500000, 600000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setDeductionAmount(preset)}
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-lg border transition-colors ${
                        deductionAmount === preset
                          ? 'bg-teal-700 text-white border-teal-700'
                          : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      {preset / 1000}rb
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 3. Catatan Keterangan */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Keterangan / Berita Acara Pemotongan:
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {/* Validasi Saldo Box */}
            <div className={`p-4 rounded-xl border text-xs space-y-2 ${
              isBalanceSufficient 
                ? 'bg-teal-50/70 border-teal-200 text-teal-900' 
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}>
              <div className="flex items-center justify-between">
                <span className="font-semibold">Saldo Titipan Wadiah Saat Ini:</span>
                <span className="font-bold font-mono-numbers text-sm">
                  {formatRupiah(selectedSantri?.balance || 0)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold">Nominal SPP yang Akan Ditarik:</span>
                <span className="font-bold font-mono-numbers text-sm text-rose-600">
                  - {formatRupiah(deductionAmount)}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between font-bold">
                <span>Perkiraan Sisa Saldo Wadiah:</span>
                <span className={`font-mono-numbers text-sm ${isBalanceSufficient ? 'text-teal-700' : 'text-rose-700'}`}>
                  {formatRupiah(remainingBalanceAfter)}
                </span>
              </div>

              {!isBalanceSufficient && (
                <div className="flex items-center gap-2 pt-1 text-rose-700 font-semibold">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>
                    Saldo titipan santri tidak mencukupi untuk pemotongan SPP sebesar {formatRupiah(deductionAmount)}. Harap hubungi wali santri untuk melakukan setor titipan terlebih dahulu.
                  </span>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={!selectedSantri || deductionAmount <= 0 || !isBalanceSufficient}
                className="w-full py-3 px-4 bg-teal-700 hover:bg-teal-800 disabled:opacity-40 text-white font-bold text-sm rounded-xl shadow-md shadow-teal-950/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>Proses Potong Saldo Wadiah & Lunasi SPP</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Selected Santri Info (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {selectedSantri && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-xl bg-teal-100 text-teal-800 font-bold text-base flex items-center justify-center shrink-0">
                  {selectedSantri.name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900 truncate">
                      {selectedSantri.name}
                    </h3>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-teal-50 text-teal-700 border border-teal-200">
                      {selectedSantri.gender === 'L' ? 'Santriwan' : 'Santriwati'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-mono">
                    NISN: {selectedSantri.nisn} • {selectedSantri.className}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">
                    {selectedSantri.dormitory}
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">No. Rekening Wadiah:</span>
                  <span className="font-mono font-semibold text-slate-800">{selectedSantri.accountNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Wali Santri:</span>
                  <span className="font-semibold text-slate-800">{selectedSantri.guardianName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">No. HP Wali:</span>
                  <span className="font-mono text-slate-700">{selectedSantri.guardianPhone}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-200">
                  <span className="text-slate-700 font-bold">Saldo Titipan Wadiah:</span>
                  <span className="font-black text-emerald-700 font-mono-numbers text-sm">
                    {formatRupiah(selectedSantri.balance)}
                  </span>
                </div>
              </div>

              {/* Status SPP Auto-Debet Santri Ini */}
              <div>
                <h4 className="text-xs font-bold text-slate-800 mb-2 flex items-center justify-between">
                  <span>Riwayat Pemotongan SPP Santri Ini:</span>
                </h4>

                {sppDeductionTransactions.filter(t => t.santriId === selectedSantri.id).length === 0 ? (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 text-xs">
                    Belum ada riwayat pemotongan SPP dari saldo titipan santri ini.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {sppDeductionTransactions
                      .filter(t => t.santriId === selectedSantri.id)
                      .map((trx) => (
                        <div
                          key={trx.id}
                          className="p-2.5 rounded-xl border border-slate-200 hover:border-teal-300 bg-white flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-bold text-rose-700 block font-mono-numbers">
                              - {formatRupiah(trx.amount)}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {trx.date} • {trx.notes}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => onViewReceipt(trx, selectedSantri)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-teal-100 hover:text-teal-800 text-slate-600 transition-colors cursor-pointer"
                            title="Cetak Kuitansi"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Table: Riwayat Seluruh Pemotongan SPP dari Saldo Titipan */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-teal-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Riwayat Penarikan SPP dari Saldo Wadiah (Terbaru)
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            Total {sppDeductionTransactions.length} Transaksi Potong Saldo
          </span>
        </div>

        {sppDeductionTransactions.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs">
            Belum ada transaksi pemotongan SPP dari saldo titipan wadiah.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                  <th className="py-2.5 px-3">No. Transaksi</th>
                  <th className="py-2.5 px-3">Tanggal & Waktu</th>
                  <th className="py-2.5 px-3">Nama Santri</th>
                  <th className="py-2.5 px-3">Keterangan</th>
                  <th className="py-2.5 px-3 text-right">Nominal Dipotong</th>
                  <th className="py-2.5 px-3 text-right">Sisa Saldo</th>
                  <th className="py-2.5 px-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sppDeductionTransactions.slice(0, 8).map((trx) => {
                  const santri = santriList.find((s) => s.id === trx.santriId) || selectedSantri;
                  return (
                    <tr key={trx.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-medium text-slate-700">
                        {trx.transactionNo}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 font-mono">
                        {trx.date} {trx.time ? `• ${trx.time}` : ''}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800">
                        {trx.santriName}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {trx.notes}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-rose-600 font-mono-numbers">
                        - {formatRupiah(trx.amount)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-slate-700 font-mono-numbers">
                        {formatRupiah(trx.balanceAfter)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => onViewReceipt(trx, santri)}
                          className="px-2.5 py-1 text-[11px] font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Printer className="w-3 h-3" />
                          Kuitansi
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
