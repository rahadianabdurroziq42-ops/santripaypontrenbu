import React from 'react';
import { Printer, CheckCircle, X } from 'lucide-react';
import { Transaction, Santri, PesantrenProfile } from '../types/finance';
import { formatRupiah, formatDateIndo, formatPaymentMethodLabel } from '../utils/accounting';

interface ReceiptModalProps {
  transaction: Transaction;
  santri: Santri;
  pesantrenProfile: PesantrenProfile;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  transaction,
  santri,
  pesantrenProfile,
  onClose,
}) => {
  const handlePrint = () => {
    window.print();
  };

  const isDeposit = transaction.type === 'DEPOSIT_WADIAH' || transaction.type === 'DEPOSIT_SPP';

  const getTransactionTitle = () => {
    switch (transaction.type) {
      case 'DEPOSIT_WADIAH':
        return 'STRUK SETORAN TITIPAN WADIAH';
      case 'WITHDRAWAL_JAJAN':
        return 'STRUK PENARIKAN JAJAN HARIAN';
      case 'DEPOSIT_SPP':
        return 'STRUK SETORAN SPP SYAHRIAH';
      case 'WITHDRAWAL_SPP':
        return 'STRUK POTONG SALDO SPP';
      case 'WITHDRAWAL_OTHER':
      case 'SPECIAL_DISBURSEMENT':
        return 'STRUK PENARIKAN KEBUTUHAN';
      default:
        return 'STRUK BUKTI TRANSAKSI';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs print-receipt-overlay animate-fade-in">
      <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] print:max-w-none print:shadow-none print:border-none print:rounded-none">
        
        {/* Modal Top Bar (Hidden on Print) */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between no-print">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            <div>
              <span className="font-bold text-sm block leading-tight">Bukti Transaksi Selesai</span>
              <span className="text-[10px] text-emerald-400 font-medium">Tercatat di Jurnal & Rekening</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors cursor-pointer p-1"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Thermal Receipt Container (Simplified Layout) */}
        <div className="p-5 overflow-y-auto flex-1 bg-slate-50 print:p-0 print:bg-white print:overflow-visible">
          <div className="bg-white border border-slate-300 rounded-xl p-5 shadow-xs print-card print:border-none print:shadow-none print:p-2 text-slate-800 font-mono-numbers">
            
            {/* Header Pesantren */}
            <div className="text-center pb-3 border-b border-dashed border-slate-300">
              <h2 className="text-sm font-black uppercase tracking-wide text-slate-900">
                {pesantrenProfile.name}
              </h2>
              <p className="text-[11px] text-slate-600 font-sans mt-0.5">
                SantriPay Syariah • {pesantrenProfile.district || 'Pesantren'}
              </p>
              <p className="text-[10px] text-slate-400 font-sans">
                Telp: {pesantrenProfile.phone || '-'}
              </p>
            </div>

            {/* Judul Struk & Waktu */}
            <div className="py-2.5 text-center border-b border-dashed border-slate-300">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-900 block">
                {getTransactionTitle()}
              </span>
              <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                {transaction.transactionNo}
              </p>
              <p className="text-[10px] text-slate-500 font-sans">
                {formatDateIndo(transaction.date)} {transaction.time ? `• ${transaction.time}` : ''}
              </p>
            </div>

            {/* Data Santri */}
            <div className="py-2.5 text-xs space-y-1.5 border-b border-dashed border-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans">Santri:</span>
                <span className="font-bold text-slate-900 font-sans truncate max-w-[190px]">{santri.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans">No. Rekening:</span>
                <span className="font-mono font-semibold text-slate-800">{santri.accountNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans">NISN / Kelas:</span>
                <span className="font-sans text-slate-700">{santri.nisn} ({santri.className})</span>
              </div>
              {transaction.guardianSenderName && (
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Wali / Penyetor:</span>
                  <span className="font-sans text-slate-700 truncate max-w-[180px]">{transaction.guardianSenderName}</span>
                </div>
              )}
              {transaction.method && (
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Metode:</span>
                  <span className="font-sans font-medium text-slate-800">{formatPaymentMethodLabel(transaction.method)}</span>
                </div>
              )}
              {transaction.notes && (
                <div className="flex justify-between pt-0.5 text-[11px]">
                  <span className="text-slate-500 font-sans">Ket:</span>
                  <span className="font-sans text-slate-700 text-right truncate max-w-[200px]">{transaction.notes}</span>
                </div>
              )}
            </div>

            {/* Rincian Finansial Nominal */}
            <div className="py-3 space-y-2 border-b border-dashed border-slate-300">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500 font-sans">Saldo Sebelum:</span>
                <span className="font-medium text-slate-700">{formatRupiah(transaction.balanceBefore)}</span>
              </div>

              <div className="flex justify-between items-center text-sm font-bold bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <span className="text-slate-800 font-sans text-xs">
                  {isDeposit ? 'Jumlah Setor:' : 'Jumlah Tarik:'}
                </span>
                <span className={`text-base font-black font-mono-numbers ${isDeposit ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {isDeposit ? '+' : '-'}{formatRupiah(transaction.amount)}
                </span>
              </div>

              <div className="flex justify-between text-xs pt-0.5">
                <span className="text-slate-800 font-bold font-sans">Sisa Saldo Wadiah:</span>
                <span className="font-black text-slate-900 font-mono-numbers">{formatRupiah(transaction.balanceAfter)}</span>
              </div>
            </div>

            {/* Footer Ringkas */}
            <div className="pt-3 text-center text-[10px] text-slate-500 font-sans space-y-1">
              <p>Kasir: <strong className="text-slate-700">{transaction.tellerName || 'Bendahara Pesantren'}</strong></p>
              <p className="italic text-slate-400">
                "Jazakumullah Khairan Katsiran. Semoga berkah."
              </p>
            </div>
          </div>
        </div>

        {/* Modal Actions (Hidden on Print, No Paper Size Selection) */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between gap-2.5 no-print">
          <span className="text-xs text-slate-500 font-medium">Struk Kasir</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center space-x-1.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Struk</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex items-center space-x-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-950/20 transition-all cursor-pointer"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Selesai</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
