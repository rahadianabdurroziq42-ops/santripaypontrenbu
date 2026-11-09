import React, { useState } from 'react';
import { 
  X, 
  PlusCircle, 
  ArrowRight, 
  CreditCard, 
  Banknote, 
  HeartHandshake
} from 'lucide-react';
import { Santri, PaymentMethod } from '../types/finance';
import { formatRupiah } from '../utils/accounting';
import { SantriSelectTable } from './SantriSelectTable';

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  santriList: Santri[];
  onProcessDeposit: (
    santriId: string,
    amount: number,
    method: PaymentMethod,
    guardianName: string,
    notes: string
  ) => void;
}

export const DepositModal: React.FC<DepositModalProps> = ({
  isOpen,
  onClose,
  santriList,
  onProcessDeposit,
}) => {
  const [selectedSantriId, setSelectedSantriId] = useState<string>(santriList[0]?.id || '');
  const [amount, setAmount] = useState<number>(300000);
  const [method, setMethod] = useState<PaymentMethod>('BANK_TRANSFER_BSI');
  const [guardianSenderName, setGuardianSenderName] = useState<string>('');
  const [notes, setNotes] = useState<string>('Titipan uang jajan santri');

  if (!isOpen) return null;

  const selectedSantri = santriList.find((s) => s.id === selectedSantriId) || santriList[0];

  const handleSelectSantri = (s: Santri) => {
    setSelectedSantriId(s.id);
    setGuardianSenderName(s.guardianName);
  };

  const quickAmounts = [100000, 200000, 300000, 500000, 1000000];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSantri || amount <= 0) return;
    onProcessDeposit(
      selectedSantri.id,
      amount,
      method,
      guardianSenderName || selectedSantri.guardianName,
      notes
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs no-print">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-amber-700 via-amber-800 to-amber-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-amber-600/60 rounded-lg border border-amber-400/40">
              <PlusCircle className="w-5 h-5 text-amber-100" />
            </div>
            <div>
              <h2 className="text-base font-bold">
                Setoran Titipan Wali Santri (Top Up Wadiah)
              </h2>
              <p className="text-xs text-amber-200/90">
                Penerimaan titipan uang saku dari orang tua ke kas bendahara pesantren
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-amber-200 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          {/* Santri Selection via Verification Table */}
          <SantriSelectTable
            santriList={santriList}
            selectedSantriId={selectedSantriId}
            onSelectSantri={handleSelectSantri}
            accentColor="amber"
            estimatedDelta={amount}
            label="Verifikasi Data Santri Penerima Titipan:"
            placeholder="Cari nama santri, wali santri, NISN, atau no. rekening..."
          />

          {/* Amount Input */}
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

            {/* Quick buttons */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {quickAmounts.map((q) => (
                <button
                  type="button"
                  key={q}
                  onClick={() => setAmount(q)}
                  className={`px-3 py-1 text-xs rounded-lg border font-mono-numbers transition-all cursor-pointer ${
                    amount === q
                      ? 'bg-amber-600 text-white border-amber-600 font-bold'
                      : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {formatRupiah(q)}
                </button>
              ))}
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Kanal Penyetoran Titipan
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {/* Sebelah Kiri: Tunai Bendahara */}
              <button
                type="button"
                onClick={() => setMethod('CASH')}
                className={`p-2.5 rounded-xl border flex items-center space-x-2 text-left cursor-pointer ${
                  method === 'CASH'
                    ? 'border-amber-600 bg-amber-50 text-amber-950 font-bold ring-1 ring-amber-600'
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
                className={`p-2.5 rounded-xl border flex items-center space-x-2 text-left cursor-pointer ${
                  method === 'BANK_TRANSFER_BSI'
                    ? 'border-amber-600 bg-amber-50 text-amber-950 font-bold ring-1 ring-amber-600'
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

          {/* Guardian Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nama Orang Tua / Penyetor
              </label>
              <input
                type="text"
                value={guardianSenderName || selectedSantri?.guardianName || ''}
                onChange={(e) => setGuardianSenderName(e.target.value)}
                placeholder="Nama Ayah/Ibu/Wali"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
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
                placeholder="Contoh: Titipan jajan bulan ini"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Sharia Akad Statement */}
          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-[11px] text-emerald-900 flex items-start space-x-2.5">
            <HeartHandshake className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Iqrar Akad Wadiah Yad Dhamanah:</p>
              <p className="text-[10px] text-emerald-800 leading-relaxed mt-0.5">
                &quot;Uang yang disetorkan ini adalah titipan murni dari wali santri kepada bendahara pesantren untuk kebutuhan uang saku santri secara disiplin (maksimal Rp 10.000 per hari, 1 kali sehari).&quot;
              </p>
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Batal
            </button>

            <button
              type="submit"
              className="flex items-center space-x-2 px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider bg-amber-600 hover:bg-amber-500 active:scale-95 text-white shadow-md shadow-amber-600/30 transition-all cursor-pointer"
            >
              <span>Konfirmasi Setoran {formatRupiah(amount)}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
