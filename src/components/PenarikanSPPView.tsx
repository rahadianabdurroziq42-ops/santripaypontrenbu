import React, { useState, useMemo } from 'react';
import { 
  FileCheck, 
  Search, 
  AlertTriangle, 
  CheckCircle2, 
  Calendar, 
  UserCheck, 
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
        </div>
      </div>

      {/* Formulir Potong Saldo SPP Terpusat */}
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-teal-600" />
              <span>Formulir Potong Saldo Titipan untuk SPP</span>
            </h2>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
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

            {/* Snapshot Santri Terpilih */}
            {selectedSantri && (
              <div className="p-3.5 rounded-xl bg-teal-50/70 border border-teal-200 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <UserCheck className="w-4 h-4 text-teal-700" />
                    <span className="font-bold text-slate-900">{selectedSantri.name}</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-teal-100 text-teal-800 border border-teal-300">
                      {selectedSantri.gender === 'L' ? 'Santriwan' : 'Santriwati'}
                    </span>
                  </div>
                  <span className="font-mono text-[11px] text-slate-600">NISN: {selectedSantri.nisn}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-slate-600 pt-1 border-t border-teal-200/60">
                  <div>Rekening: <strong className="font-mono text-slate-800">{selectedSantri.accountNumber}</strong></div>
                  <div>Asrama: <strong className="text-slate-800">{selectedSantri.dormitory}</strong></div>
                  <div>Saldo: <strong className="text-emerald-700 font-mono-numbers">{formatRupiah(selectedSantri.balance)}</strong></div>
                </div>
              </div>
            )}

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
      </div>
    </div>
  );
};

