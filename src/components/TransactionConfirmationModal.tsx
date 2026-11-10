import React from 'react';
import { 
  AlertTriangle, 
  CheckCircle2, 
  X, 
  ShieldAlert
} from 'lucide-react';
import { Santri } from '../types/finance';
import { formatRupiah } from '../utils/accounting';

export interface TransactionConfirmationData {
  title: string;
  transactionType: 'DEPOSIT_WADIAH' | 'WITHDRAWAL_JAJAN' | 'DEPOSIT_SPP' | 'WITHDRAWAL_SPP' | 'WITHDRAWAL_OTHER';
  typeName: string;
  santri: Santri;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  method?: string;
  notes?: string;
  category?: string;
  onConfirm: () => void;
}

interface TransactionConfirmationModalProps {
  data: TransactionConfirmationData | null;
  onCancel: () => void;
}

export const TransactionConfirmationModal: React.FC<TransactionConfirmationModalProps> = ({
  data,
  onCancel,
}) => {
  if (!data) return null;

  const isDeposit = data.transactionType === 'DEPOSIT_WADIAH' || data.transactionType === 'DEPOSIT_SPP';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in no-print">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Header Peringatan */}
        <div className="px-5 py-4 bg-gradient-to-r from-amber-600 to-amber-700 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-amber-500/30 border border-white/20 text-white shrink-0">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base leading-tight">
                Peringatan Konfirmasi Transaksi
              </h3>
              <p className="text-[11px] text-amber-100">
                Periksa kembali kebenaran data sebelum menyelesaikan
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="text-amber-100 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
            title="Batal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-4 text-xs">
          {/* Detail Santri */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              Santri Bersangkutan
            </span>
            <div className="flex items-center justify-between">
              <span className="text-sm font-black text-slate-900">{data.santri.name}</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                {data.santri.className}
              </span>
            </div>
            <p className="text-[11px] text-slate-600">
              Wali Santri: <strong className="text-slate-800">{data.santri.guardianName}</strong>
            </p>
            <p className="text-[11px] text-slate-500 font-mono">
              Rek: {data.santri.accountNumber} • NISN: {data.santri.nisn}
            </p>
          </div>

          {/* Rincian Transaksi */}
          <div className="space-y-2 border border-slate-200 rounded-xl p-3.5 bg-white">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Jenis Transaksi:</span>
              <span className={`px-2 py-0.5 rounded-md font-bold text-[11px] border ${
                isDeposit 
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}>
                {data.typeName}
              </span>
            </div>

            {data.method && (
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Metode Pembayaran:</span>
                <span className="font-semibold text-slate-800">{data.method}</span>
              </div>
            )}

            {data.notes && (
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Keterangan:</span>
                <span className="font-semibold text-slate-800 text-right truncate max-w-[200px]">
                  {data.notes}
                </span>
              </div>
            )}

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-slate-600 font-bold">Nominal yang Diproses:</span>
              <span className={`text-base font-black font-mono font-mono-numbers ${
                isDeposit ? 'text-emerald-700' : 'text-rose-700'
              }`}>
                {isDeposit ? '+' : '-'}{formatRupiah(data.amount)}
              </span>
            </div>

            <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-slate-500 block">Saldo Sebelumnya:</span>
                <span className="font-mono font-semibold text-slate-700 font-mono-numbers">
                  {formatRupiah(data.balanceBefore)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-slate-500 block">Sisa Saldo Sesudah:</span>
                <span className="font-mono font-bold text-slate-900 font-mono-numbers">
                  {formatRupiah(data.balanceAfter)}
                </span>
              </div>
            </div>
          </div>

          {/* Kotak Peringatan Edukatif */}
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/80 text-[11px] text-amber-900 flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Pastikan uang fisik / bukti transfer telah diverifikasi. Setelah menekan tombol <strong>Selesaikan Transaksi</strong>, data akan langsung dibukukan ke dalam Jurnal Umum dan struk kuitansi akan diterbitkan.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-5 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
          >
            Batal
          </button>

          <button
            type="button"
            onClick={() => {
              data.onConfirm();
            }}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:scale-95 text-white font-bold text-xs shadow-md shadow-emerald-950/20 transition-all flex items-center gap-1.5 cursor-pointer ring-2 ring-emerald-500/20"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Ya, Selesaikan Transaksi</span>
          </button>
        </div>
      </div>
    </div>
  );
};
