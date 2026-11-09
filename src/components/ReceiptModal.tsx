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
        return 'SETORAN TITIPAN WADIAH';
      case 'WITHDRAWAL_JAJAN':
        return 'PENARIKAN JAJAN HARIAN';
      case 'DEPOSIT_SPP':
        return 'PEMBAYARAN SPP SYAHRIAH';
      case 'WITHDRAWAL_SPP':
        return 'POTONG SALDO UNTUK SPP';
      case 'WITHDRAWAL_OTHER':
      case 'SPECIAL_DISBURSEMENT':
        return 'PENARIKAN KEBUTUHAN SANTRI';
      default:
        return 'STRUK BUKTI TRANSAKSI';
    }
  };

  const getAkadLabel = () => {
    if (transaction.type === 'DEPOSIT_SPP' || transaction.type === 'WITHDRAWAL_SPP') {
      return 'Akad: Iuran Syahriah Pesantren';
    }
    return 'Akad: Wadiah Yad Dhamanah (Titipan)';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs print-receipt-overlay animate-fade-in">
      <div className="bg-white rounded-2xl max-w-[380px] w-full shadow-2xl border border-slate-300 overflow-hidden flex flex-col max-h-[96vh] print:max-w-[320px] print:mx-auto print:shadow-none print:border-none print:rounded-none">
        
        {/* Top Control Bar (Screen Only) */}
        <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between no-print shrink-0">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span className="font-bold text-xs tracking-wide">Struk Transaksi Kasir</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors cursor-pointer p-1 rounded-lg hover:bg-slate-800"
            title="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Thermal Receipt Paper Roll Container */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 bg-slate-100 print:p-0 print:bg-white print:overflow-visible">
          <div className="bg-white border border-slate-300/80 rounded-lg p-5 shadow-sm print-card print:border-none print:shadow-none print:p-2 text-slate-900 font-mono text-xs leading-relaxed">
            
            {/* Header: Nama & Identitas Pesantren */}
            <div className="text-center pb-3 border-b-2 border-dashed border-slate-400">
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-950 font-sans">
                {pesantrenProfile.name}
              </h2>
              <p className="text-[10px] text-slate-600 font-sans mt-0.5">
                {pesantrenProfile.formalName || 'Pondok Pesantren'}
              </p>
              <p className="text-[10px] text-slate-500 font-sans">
                {pesantrenProfile.address || 'Kompleks Pesantren'} • Telp: {pesantrenProfile.phone || '-'}
              </p>
              <p className="text-[9px] text-slate-400 uppercase tracking-widest mt-1">
                LOKET KASIR KEUANGAN SYARIAH
              </p>
            </div>

            {/* Nomor & Waktu Transaksi */}
            <div className="py-2.5 border-b border-dashed border-slate-300 text-[11px] space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">No. Trx</span>
                <span className="font-bold text-slate-900">{transaction.transactionNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tanggal</span>
                <span>{formatDateIndo(transaction.date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Waktu</span>
                <span>{transaction.time || '10:00:00 WIB'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Petugas / Kasir</span>
                <span className="truncate max-w-[170px] text-right font-semibold">
                  {transaction.tellerName || 'Bendahara Pesantren'}
                </span>
              </div>
            </div>

            {/* Identitas Santri & Wali (Verifikasi Data) */}
            <div className="py-2.5 border-b border-dashed border-slate-300 text-[11px] space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Santri</span>
                <span className="font-bold text-slate-950 truncate max-w-[180px] text-right">
                  {santri.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">No. Rekening</span>
                <span className="font-bold">{santri.accountNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">NISN / Kelas</span>
                <span>{santri.nisn} ({santri.className || '-'})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Wali Santri</span>
                <span className="font-semibold text-slate-900 truncate max-w-[180px] text-right">
                  {santri.guardianName || transaction.guardianSenderName || '-'}
                </span>
              </div>
              {transaction.guardianSenderName && transaction.guardianSenderName !== santri.guardianName && (
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-500">Penyetor</span>
                  <span className="text-slate-800 truncate max-w-[180px] text-right">
                    {transaction.guardianSenderName}
                  </span>
                </div>
              )}
            </div>

            {/* Detail Item Transaksi (Tampilan Detail Kasir) */}
            <div className="py-3 border-b-2 border-dashed border-slate-400">
              <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1.5 flex justify-between">
                <span>Rincian Transaksi</span>
                <span>Jumlah (Rp)</span>
              </div>

              {/* Baris Transaksi Utama */}
              <div className="flex justify-between items-start text-xs font-bold pt-1">
                <span className="text-slate-950 max-w-[200px] leading-tight">
                  {getTransactionTitle()}
                </span>
                <span className="font-black text-right shrink-0">
                  {formatRupiah(transaction.amount)}
                </span>
              </div>

              {/* Rincian Kategori / Keperluan */}
              {transaction.category && (
                <div className="text-[10px] text-slate-600 mt-0.5">
                  • Keperluan: {transaction.category}
                </div>
              )}

              {/* Catatan / Keterangan Tambahan */}
              {transaction.notes && (
                <div className="text-[10px] text-slate-600 italic mt-0.5 break-words">
                  • Ket: &quot;{transaction.notes}&quot;
                </div>
              )}

              {/* Metode Pembayaran */}
              {transaction.method && (
                <div className="flex justify-between text-[10px] text-slate-600 pt-1.5 mt-1 border-t border-slate-200">
                  <span>Metode Transaksi</span>
                  <span className="font-bold text-slate-900">
                    {formatPaymentMethodLabel(transaction.method)}
                  </span>
                </div>
              )}
            </div>

            {/* Rekap Saldo & Total Finansial */}
            <div className="py-3 border-b-2 border-dashed border-slate-400 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Saldo Sebelum</span>
                <span>{formatRupiah(transaction.balanceBefore)}</span>
              </div>

              <div className="flex justify-between text-slate-950 font-black py-1 border-y border-dashed border-slate-300">
                <span className="uppercase">
                  {isDeposit ? 'Total Diterima (+)' : 'Total Ditarik (-)'}
                </span>
                <span className={isDeposit ? 'text-emerald-800' : 'text-slate-950'}>
                  {isDeposit ? '+' : '-'}{formatRupiah(transaction.amount)}
                </span>
              </div>

              <div className="flex justify-between text-xs font-black text-slate-950 pt-0.5">
                <span className="uppercase">Sisa Saldo Wadiah</span>
                <span className="text-sm font-black">
                  {formatRupiah(transaction.balanceAfter)}
                </span>
              </div>
            </div>

            {/* Footer Struk: Akad Syariah & Barcode Standar Kasir */}
            <div className="pt-3 text-center space-y-2">
              <p className="text-[10px] font-semibold text-slate-700">
                {getAkadLabel()}
              </p>

              {/* Barcode Simulation */}
              <div className="py-1 flex justify-center items-center gap-[2px] opacity-80" aria-hidden="true">
                {[3, 1, 4, 1, 5, 9, 2, 6, 5, 3, 5, 8, 9, 7, 9, 3, 2, 3, 8, 4, 6, 2, 6, 4, 3, 3, 8, 3, 2, 7, 9, 5].map((w, idx) => (
                  <span
                    key={idx}
                    className="bg-slate-900 h-8 inline-block"
                    style={{ width: `${(w % 3) + 1}px` }}
                  />
                ))}
              </div>
              <p className="text-[9px] tracking-widest text-slate-500 font-mono">
                *{transaction.transactionNo}*
              </p>

              <div className="text-[10px] text-slate-600 space-y-0.5 pt-1">
                <p className="font-bold text-slate-800">
                  *** LUNAS &amp; TERCATAT SAH ***
                </p>
                <p className="text-[9px] text-slate-500">
                  Simpan struk ini sebagai bukti transaksi resmi.
                </p>
                <p className="italic text-[9px] text-slate-400 font-sans">
                  Jazakumullah Khairan Katsiran
                </p>
              </div>
            </div>

          </div>
        </div>

        {/* Modal Actions (Screen Only) */}
        <div className="p-3.5 bg-white border-t border-slate-200 flex items-center justify-between gap-2.5 no-print shrink-0">
          <span className="text-xs text-slate-500 font-sans font-medium">Struk Siap Cetak</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center space-x-1.5 px-4 py-2 bg-slate-900 hover:bg-black active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer font-sans"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Struk</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer font-sans"
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
