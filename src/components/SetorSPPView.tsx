import React, { useState, useMemo } from 'react';
import { 
  GraduationCap, 
  CreditCard, 
  Banknote, 
  Calendar, 
  FileCheck2,
  CheckCircle2
} from 'lucide-react';
import { Santri, Transaction, PaymentMethod, PesantrenProfile } from '../types/finance';
import { SantriSelectTable } from './SantriSelectTable';

interface SetorSPPViewProps {
  santriList: Santri[];
  transactions: Transaction[];
  pesantrenProfile: PesantrenProfile;
  onProcessSPPDeposit: (
    santriId: string,
    amount: number,
    sppMonth: string,
    method: PaymentMethod,
    payerName: string,
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

export const SetorSPPView: React.FC<SetorSPPViewProps> = ({
  santriList,
  transactions: _transactions,
  pesantrenProfile: _pesantrenProfile,
  onProcessSPPDeposit,
  onViewReceipt: _onViewReceipt,
}) => {
  const [selectedSantriId, setSelectedSantriId] = useState<string>(santriList[0]?.id || '');
  const [selectedMonth, setSelectedMonth] = useState<string>('November 2026');
  const [sppAmount, setSppAmount] = useState<number>(450000);
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [payerName, setPayerName] = useState<string>('');
  const [notes, setNotes] = useState<string>('Pembayaran SPP Syahriah Pesantren');

  const selectedSantri = useMemo(() => {
    return santriList.find((s) => s.id === selectedSantriId) || santriList[0];
  }, [santriList, selectedSantriId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSantri || sppAmount <= 0) return;

    const fullNotes = `SPP Bulan ${selectedMonth}: ${notes}`;
    onProcessSPPDeposit(
      selectedSantri.id,
      sppAmount,
      selectedMonth,
      method,
      payerName.trim() || selectedSantri.guardianName,
      fullNotes
    );

    // Reset note
    setNotes('Pembayaran SPP Syahriah Pesantren');
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                Menu Pengurus & Bendahara • Setoran SPP
              </span>
              <span className="text-[11px] font-semibold text-slate-300">
                Iuran Syahriah & SPP
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2.5">
              <GraduationCap className="w-6 h-6 text-emerald-400" />
              <span>Setoran SPP Syahriah Santri</span>
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100/80 mt-1 max-w-2xl">
              Pencatatan setoran uang SPP bulanan santri secara langsung melalui loket bendahara (menambah saldo kas dan rekening santri).
            </p>
          </div>
        </div>
      </div>

      {/* Formulir Setoran SPP Terpusat */}
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
              <FileCheck2 className="w-5 h-5 text-emerald-600" />
              <span>Formulir Pembayaran SPP Syahriah</span>
            </h2>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Penerimaan Kas Bendahara
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* 1. Verifikasi Data Santri via Tabel (Nama Santri, Wali Santri, Sisa Saldo) */}
            <SantriSelectTable
              santriList={santriList}
              selectedSantriId={selectedSantriId}
              onSelectSantri={(santri) => setSelectedSantriId(santri.id)}
              accentColor="emerald"
              estimatedDelta={sppAmount}
              label="Verifikasi Data Santri Pembayar SPP:"
              placeholder="Cari nama santri, wali santri, NISN, atau no. rekening..."
            />

            {/* 2. Pilih Bulan Pembayaran & Nominal SPP */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                  Bulan Pembayaran SPP:
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
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
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                  Nominal Pembayaran SPP:
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-bold text-slate-500">
                    Rp
                  </span>
                  <input
                    type="number"
                    min={10000}
                    step={10000}
                    value={sppAmount}
                    onChange={(e) => setSppAmount(Number(e.target.value))}
                    className="w-full pl-9 pr-3 py-2 text-xs font-bold text-slate-900 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono-numbers"
                  />
                </div>
                <div className="flex gap-1.5 mt-1.5">
                  {[350000, 450000, 500000, 600000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setSppAmount(preset)}
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-lg border transition-colors cursor-pointer ${
                        sppAmount === preset
                          ? 'bg-emerald-600 text-white border-emerald-600 font-bold'
                          : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      {preset / 1000}rb
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 3. Metode Pembayaran */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                Metode Pembayaran:
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setMethod('CASH')}
                  className={`p-3 rounded-xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                    method === 'CASH'
                      ? 'border-emerald-600 bg-emerald-50/80 text-emerald-900 font-bold shadow-xs'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <Banknote className={`w-4 h-4 ${method === 'CASH' ? 'text-emerald-600' : 'text-slate-400'}`} />
                  <div>
                    <span className="text-xs block">Tunai (Kasir Loket)</span>
                    <span className="text-[10px] text-slate-500">Uang tunai brankas bendahara</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setMethod('BANK_TRANSFER_BSI')}
                  className={`p-3 rounded-xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                    method === 'BANK_TRANSFER_BSI'
                      ? 'border-emerald-600 bg-emerald-50/80 text-emerald-900 font-bold shadow-xs'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <CreditCard className={`w-4 h-4 ${method === 'BANK_TRANSFER_BSI' ? 'text-emerald-600' : 'text-slate-400'}`} />
                  <div>
                    <span className="text-xs block">Transfer Bank BSI</span>
                    <span className="text-[10px] text-slate-500">Rekening resmi pesantren</span>
                  </div>
                </button>
              </div>
            </div>

            {/* 4. Nama Penyetor & Catatan */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                  Nama Penyetor (Wali / Santri):
                </label>
                <input
                  type="text"
                  placeholder={selectedSantri?.guardianName || 'Nama Ayah / Ibu'}
                  value={payerName}
                  onChange={(e) => setPayerName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                  Catatan Kuitansi:
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>
            </div>

            {/* Tombol Simpan */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={!selectedSantri || sppAmount <= 0}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-md shadow-emerald-900/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>Simpan Setoran SPP &amp; Terbitkan Kuitansi</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
