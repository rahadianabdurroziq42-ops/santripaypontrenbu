import React, { useEffect } from 'react';
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
  // Add class to body when modal is mounted so print styles hide all other background elements
  useEffect(() => {
    document.body.classList.add('has-receipt-modal-active');
    return () => {
      document.body.classList.remove('has-receipt-modal-active');
    };
  }, []);

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
        return 'SETORAN SPP SYAHRIAH';
      case 'WITHDRAWAL_SPP':
        return 'POTONG SALDO UNTUK SPP';
      case 'WITHDRAWAL_OTHER':
      case 'SPECIAL_DISBURSEMENT':
        return transaction.category 
          ? `PENARIKAN: ${transaction.category.toUpperCase()}`
          : 'PENARIKAN KEBUTUHAN SANTRI';
      default:
        return 'STRUK TRANSAKSI KASIR';
    }
  };

  const getAkadLabel = () => {
    if (transaction.type === 'DEPOSIT_SPP' || transaction.type === 'WITHDRAWAL_SPP') {
      return 'Akad: Iuran Syahriah Pesantren';
    }
    return 'Akad: Wadiah Yad Dhamanah';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-xs print-receipt-overlay animate-fade-in">
      {/* Outer Card (on print: width ~300px, zero margin, no shadow, no border, white background) */}
      <div className="bg-white rounded-2xl max-w-[340px] w-full shadow-2xl border border-slate-300 overflow-hidden flex flex-col max-h-[96vh] print:max-w-[300px] print:w-[300px] print:m-0 print:p-0 print:shadow-none print:border-none print:rounded-none">
        
        {/* Top Control Bar (Screen Only - Hidden on Print) */}
        <div className="px-4 py-2.5 bg-slate-900 text-white flex items-center justify-between no-print shrink-0">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span className="font-bold text-xs font-sans tracking-wide">Struk Kasir Transaksi</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors cursor-pointer p-1 rounded-lg hover:bg-slate-800"
            title="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Thermal Receipt Paper Roll (Clean Pure White, Zero Colored Backgrounds) */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 bg-white print:p-0 print:m-0 print:overflow-visible">
          <div className="bg-white p-2 text-black font-mono text-[11px] leading-tight select-text print:p-0 print:text-black">
            
            {/* Header: Nama & Identitas Pesantren */}
            <div className="text-center pb-2 border-b border-dashed border-black">
              <h2 className="text-xs font-black uppercase tracking-wider text-black font-mono">
                {pesantrenProfile.name}
              </h2>
              <p className="text-[10px] text-black font-mono mt-0.5">
                {pesantrenProfile.formalName || 'Pondok Pesantren'}
              </p>
              <p className="text-[9px] text-black font-mono">
                {pesantrenProfile.address || 'Kompleks Pesantren'}
              </p>
              <p className="text-[9px] text-black font-mono">
                Telp: {pesantrenProfile.phone || '-'}
              </p>
              <p className="text-[9px] text-black font-mono font-bold uppercase tracking-widest mt-1">
                LOKET KASIR KEUANGAN
              </p>
            </div>

            {/* Nomor & Waktu Transaksi */}
            <div className="py-2 border-b border-dashed border-black text-[10px] space-y-0.5">
              <div className="flex justify-between">
                <span>NO. BUKTI</span>
                <span className="font-bold">{transaction.transactionNo}</span>
              </div>
              <div className="flex justify-between">
                <span>TANGGAL</span>
                <span>{formatDateIndo(transaction.date)}</span>
              </div>
              <div className="flex justify-between">
                <span>WAKTU</span>
                <span>{transaction.time || '10:00:00 WIB'}</span>
              </div>
              <div className="flex justify-between">
                <span>PETUGAS</span>
                <span className="truncate max-w-[160px] text-right">
                  {transaction.tellerName || 'Bendahara Pesantren'}
                </span>
              </div>
            </div>

            {/* Identitas Santri & Wali */}
            <div className="py-2 border-b border-dashed border-black text-[10px] space-y-0.5">
              <div className="flex justify-between">
                <span>SANTRI</span>
                <span className="font-bold text-black truncate max-w-[180px] text-right">
                  {santri.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span>NO. REK</span>
                <span className="font-bold">{santri.accountNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>NISN</span>
                <span>{santri.nisn}</span>
              </div>
              <div className="flex justify-between">
                <span>WALI SANTRI</span>
                <span className="font-semibold text-black truncate max-w-[180px] text-right">
                  {santri.guardianName || transaction.guardianSenderName || '-'}
                </span>
              </div>
              {transaction.guardianSenderName && transaction.guardianSenderName !== santri.guardianName && (
                <div className="flex justify-between text-[9px]">
                  <span>PENYETOR</span>
                  <span className="truncate max-w-[180px] text-right">
                    {transaction.guardianSenderName}
                  </span>
                </div>
              )}
            </div>

            {/* Detail Item Transaksi (Sama persis antara Setoran & Penarikan) */}
            <div className="py-2 border-b border-dashed border-black">
              <div className="text-[10px] uppercase font-bold text-black tracking-wider mb-1 flex justify-between">
                <span>RINCIAN TRANSAKSI</span>
                <span>JUMLAH</span>
              </div>

              {/* Baris Transaksi Utama */}
              <div className="flex justify-between items-start text-[11px] font-bold pt-0.5">
                <span className="text-black max-w-[190px] leading-tight">
                  {getTransactionTitle()}
                </span>
                <span className="font-bold text-right shrink-0">
                  {formatRupiah(transaction.amount)}
                </span>
              </div>

              {/* Rincian Kategori / Keperluan jika ada */}
              {transaction.category && (
                <div className="text-[9px] text-black mt-0.5">
                  • Keperluan: {transaction.category}
                </div>
              )}

              {/* Catatan Keterangan jika ada */}
              {transaction.notes && (
                <div className="text-[9px] text-black italic mt-0.5 break-words">
                  • Ket: &quot;{transaction.notes}&quot;
                </div>
              )}

              {/* Metode Pembayaran */}
              {transaction.method && (
                <div className="flex justify-between text-[10px] text-black pt-1 mt-1 border-t border-dotted border-black/40">
                  <span>METODE</span>
                  <span className="font-bold">
                    {formatPaymentMethodLabel(transaction.method).toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            {/* Rekap Finansial Saldo (Hitam-Putih Murni, Tanpa Warna) */}
            <div className="py-2 border-b-2 border-dashed border-black space-y-1 text-[11px]">
              <div className="flex justify-between text-black">
                <span>SALDO SEBELUM</span>
                <span>{formatRupiah(transaction.balanceBefore)}</span>
              </div>

              <div className="flex justify-between text-black font-black py-0.5 border-y border-dashed border-black">
                <span className="uppercase">
                  {isDeposit ? 'TOTAL SETOR (+)' : 'TOTAL TARIK (-)'}
                </span>
                <span>
                  {isDeposit ? '+' : '-'}{formatRupiah(transaction.amount)}
                </span>
              </div>

              <div className="flex justify-between text-xs font-black text-black pt-0.5">
                <span className="uppercase">SISA SALDO WADIAH</span>
                <span className="text-xs font-black">
                  {formatRupiah(transaction.balanceAfter)}
                </span>
              </div>
            </div>

            {/* Footer Struk: Akad & Barcode Thermal POS */}
            <div className="pt-2 text-center space-y-1">
              <p className="text-[9px] font-bold text-black uppercase">
                {getAkadLabel()}
              </p>

              {/* Barcode Thermal Kasir Standar */}
              <div className="py-1 flex justify-center items-center gap-[2px]" aria-hidden="true">
                {[3, 1, 4, 1, 5, 9, 2, 6, 5, 3, 5, 8, 9, 7, 9, 3, 2, 3, 8, 4, 6, 2, 6, 4, 3, 3, 8, 3, 2, 7, 9, 5].map((w, idx) => (
                  <span
                    key={idx}
                    className="bg-black h-7 inline-block"
                    style={{ width: `${(w % 3) + 1}px` }}
                  />
                ))}
              </div>
              <p className="text-[8px] tracking-widest text-black font-mono">
                *{transaction.transactionNo}*
              </p>

              <div className="text-[9px] text-black space-y-0.5 pt-0.5">
                <p className="font-bold">
                  *** LUNAS &amp; TERCATAT SAH ***
                </p>
                <p className="text-[8px]">
                  Simpan struk ini sebagai bukti transaksi sah.
                </p>
                <p className="italic text-[8px] font-sans">
                  Jazakumullah Khairan Katsiran
                </p>
              </div>
            </div>

          </div>
        </div>

        {/* Modal Actions (Screen Only - Hidden on Print) */}
        <div className="p-3 bg-white border-t border-slate-200 flex items-center justify-between gap-2 no-print shrink-0">
          <span className="text-xs text-slate-500 font-sans font-medium">Struk Kasir</span>
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
