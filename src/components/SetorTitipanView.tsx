import React, { useState, useMemo } from 'react';
import { 
  PlusCircle, 
  CreditCard, 
  Banknote, 
  HeartHandshake, 
  ArrowRight
} from 'lucide-react';
import { Santri, Transaction, PaymentMethod, PesantrenProfile } from '../types/finance';
import { formatRupiah } from '../utils/accounting';
import { SantriSelectTable } from './SantriSelectTable';

interface SetorTitipanViewProps {
  santriList: Santri[];
  transactions: Transaction[];
  pesantrenProfile: PesantrenProfile;
  onProcessDeposit: (
    santriId: string,
    amount: number,
    method: PaymentMethod,
    guardianName: string,
    notes: string
  ) => void;
  onViewReceipt: (trx: Transaction, santri: Santri) => void;
}

export const SetorTitipanView: React.FC<SetorTitipanViewProps> = ({
  santriList,
  transactions: _transactions,
  pesantrenProfile,
  onProcessDeposit,
  onViewReceipt: _onViewReceipt,
}) => {
  // Selected santri ID
  const [selectedSantriId, setSelectedSantriId] = useState<string>(santriList[0]?.id || '');
  
  // Deposit form state
  const [amount, setAmount] = useState<number>(300000);
  const [method, setMethod] = useState<PaymentMethod>('BANK_TRANSFER_BSI');
  const [guardianSenderName, setGuardianSenderName] = useState<string>('');
  const [notes, setNotes] = useState<string>('Titipan uang saku santri');

  // Currently selected santri object
  const selectedSantri = useMemo(() => {
    return santriList.find((s) => s.id === selectedSantriId) || santriList[0];
  }, [santriList, selectedSantriId]);

  // Handle selecting a santri: updates selected ID and defaults guardian name
  const handleSelectSantri = (santri: Santri) => {
    setSelectedSantriId(santri.id);
    setGuardianSenderName(santri.guardianName);
  };

  const quickAmounts = [100000, 200000, 300000, 500000, 1000000];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSantri || amount <= 0) return;
    onProcessDeposit(
      selectedSantri.id,
      amount,
      method,
      guardianSenderName.trim() || selectedSantri.guardianName,
      notes.trim() || 'Titipan uang saku santri'
    );
  };

  return (
    <div className="space-y-6">

      {/* Top Description Banner */}
      <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div className="flex items-center space-x-3.5">
          <div className="p-3 bg-amber-100 text-amber-800 rounded-xl shrink-0">
            <PlusCircle className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold text-slate-900">
                Loket Bendahara: Setor Titipan Wali Santri
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 border border-amber-200">
                Akad Wadiah
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Penerimaan dan pencatatan dana titipan dari orang tua santri ({pesantrenProfile.name})
            </p>
          </div>
        </div>

        <div className="text-left md:text-right text-xs bg-amber-50/80 border border-amber-200 px-4 py-2.5 rounded-xl">
          <p className="text-slate-500 text-[11px] font-medium">Batas Pengambilan Jajan Harian:</p>
          <p className="font-bold text-amber-900 font-mono-numbers text-xs">
            Maksimal Rp 10.000 / Hari (Disiplin 1x Penarikan)
          </p>
        </div>
      </div>

      {/* Formulir Setoran Titipan (Terpusat) */}
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-xs border border-slate-200 space-y-5">
          <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                Formulir Setoran Titipan Santri
              </h3>
              <p className="text-xs text-slate-500">
                Verifikasi data santri, wali santri, dan sisa saldo sebelum memproses transaksi
              </p>
            </div>
            <span className="text-[10px] px-2.5 py-1 rounded-full font-bold bg-amber-100 text-amber-800 border border-amber-200">
              Kasir Loket
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Bagian Tabel Verifikasi & Pemilihan Santri (Nama Santri, Wali Santri, Sisa Saldo) */}
            <SantriSelectTable
              santriList={santriList}
              selectedSantriId={selectedSantriId}
              onSelectSantri={handleSelectSantri}
              accentColor="amber"
              estimatedDelta={amount}
              label="Verifikasi Data Santri Penerima Titipan:"
              placeholder="Cari nama santri, nama wali, NISN, atau no. rekening..."
            />

            {/* Nominal Setoran */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Nominal Setoran Titipan (Rupiah)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 font-bold text-slate-500 text-sm">Rp</span>
                <input
                  type="number"
                  min="10000"
                  step="5000"
                  required
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full pl-11 pr-4 py-2.5 text-base font-bold text-slate-900 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono-numbers"
                />
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {quickAmounts.map((q) => (
                  <button
                    type="button"
                    key={q}
                    onClick={() => setAmount(q)}
                    className={`px-3 py-1 text-xs rounded-lg border font-mono-numbers transition-all cursor-pointer ${
                      amount === q
                        ? 'bg-amber-600 text-white border-amber-600 font-bold shadow-xs'
                        : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {formatRupiah(q)}
                  </button>
                ))}
              </div>
            </div>

            {/* Kanal Setoran Pembayaran */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Metode Pembayaran
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {/* Sebelah Kiri: Tunai Bendahara */}
                <button
                  type="button"
                  onClick={() => setMethod('CASH')}
                  className={`p-2.5 rounded-xl border flex items-center space-x-2 text-left cursor-pointer transition-all ${
                    method === 'CASH'
                      ? 'border-amber-600 bg-amber-50 text-amber-950 font-bold ring-1 ring-amber-600 shadow-xs'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Banknote className="w-4 h-4 text-amber-600 shrink-0" />
                  <div>
                    <p className="font-semibold">Tunai Bendahara</p>
                    <p className="text-[10px] text-slate-500">Langsung di Loket Pesantren</p>
                  </div>
                </button>

                {/* Sebelah Kanan: Transfer Via Bank */}
                <button
                  type="button"
                  onClick={() => setMethod('BANK_TRANSFER_BSI')}
                  className={`p-2.5 rounded-xl border flex items-center space-x-2 text-left cursor-pointer transition-all ${
                    method === 'BANK_TRANSFER_BSI'
                      ? 'border-amber-600 bg-amber-50 text-amber-950 font-bold ring-1 ring-amber-600 shadow-xs'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <CreditCard className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <p className="font-semibold">Transfer Via Bank</p>
                    <p className="text-[10px] text-slate-500">Semua Rekening Bank & ATM</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Wali Penyetor & Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Orang Tua / Penyetor
                </label>
                <input
                  type="text"
                  value={guardianSenderName || selectedSantri?.guardianName || ''}
                  onChange={(e) => setGuardianSenderName(e.target.value)}
                  placeholder="Nama Ayah / Ibu / Wali"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Catatan / Doa untuk Santri
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Contoh: Titipan uang saku jajan"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                />
              </div>
            </div>

            {/* Sharia Akad Box */}
            <div className="p-3 bg-emerald-50/80 rounded-xl border border-emerald-200 text-[11px] text-emerald-900 flex items-start space-x-2.5">
              <HeartHandshake className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Kaidah Akad Wadiah Yad Dhamanah:</p>
                <p className="text-[10px] text-emerald-800 leading-relaxed mt-0.5">
                  Dana yang disetorkan adalah titipan murni dari orang tua untuk anak tercinta yang dikelola amanah oleh bendahara pesantren. Santri dapat mengambil jajan harian maksimal Rp 10.000 satu kali per hari.
                </p>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={!selectedSantri || amount <= 0}
                className="w-full flex items-center justify-center space-x-2 py-3 rounded-xl font-bold text-xs sm:text-sm uppercase tracking-wider bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 active:scale-98 text-white shadow-md shadow-amber-700/30 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>Proses Setoran {formatRupiah(amount)} ({selectedSantri?.name || 'Santri'})</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
