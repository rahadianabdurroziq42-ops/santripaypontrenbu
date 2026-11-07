import React, { useState, useMemo } from 'react';
import { 
  PlusCircle, 
  Search, 
  CreditCard, 
  Banknote, 
  Receipt, 
  HeartHandshake, 
  ArrowRight, 
  CheckCircle2, 
  CheckCircle,
  Clock, 
  UserCheck, 
  X, 
  Check, 
  Wallet,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { Santri, Transaction, PaymentMethod, PesantrenProfile } from '../types/finance';
import { formatRupiah, formatPaymentMethodLabel } from '../utils/accounting';

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
  transactions,
  pesantrenProfile,
  onProcessDeposit,
  onViewReceipt,
}) => {
  // Selected santri ID
  const [selectedSantriId, setSelectedSantriId] = useState<string>(santriList[0]?.id || '');
  
  // Search query for searching santri
  const [searchQuery, setSearchQuery] = useState<string>('');
  
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

  // Filtered santri based on search input (name, account number, NISN, dormitory)
  const filteredSantri = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return santriList.filter((s) => {
      const matchName = s.name.toLowerCase().includes(q);
      const matchAcc = s.accountNumber.toLowerCase().includes(q);
      const matchNis = s.nisn.toLowerCase().includes(q);
      const matchDorm = s.dormitory.toLowerCase().includes(q);
      return matchName || matchAcc || matchNis || matchDorm;
    });
  }, [santriList, searchQuery]);

  // Deposit transactions specifically for the selected santri
  const santriDeposits = useMemo(() => {
    if (!selectedSantri) return [];
    return transactions
      .filter((t) => t.santriId === selectedSantri.id && t.type === 'DEPOSIT_WADIAH')
      .sort((a, b) => {
        const comp = b.date.localeCompare(a.date);
        if (comp !== 0) return comp;
        return (b.time || '').localeCompare(a.time || '');
      });
  }, [selectedSantri, transactions]);

  // Total deposits ever received for this santri
  const totalSantriDeposits = useMemo(() => {
    return santriDeposits.reduce((acc, curr) => acc + curr.amount, 0);
  }, [santriDeposits]);

  // Global recent deposit transactions (all santri)
  const allRecentDeposits = useMemo(() => {
    return transactions
      .filter((t) => t.type === 'DEPOSIT_WADIAH')
      .sort((a, b) => {
        const comp = b.date.localeCompare(a.date);
        if (comp !== 0) return comp;
        return (b.time || '').localeCompare(a.time || '');
      })
      .slice(0, 8);
  }, [transactions]);

  const quickAmounts = [100000, 200000, 300000, 500000, 1000000];

  const [lastFinishedTrx, setLastFinishedTrx] = useState<{ amount: number; santriName: string } | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSantri || amount <= 0) return;
    const currentName = selectedSantri.name;
    const currentAmt = amount;
    onProcessDeposit(
      selectedSantri.id,
      amount,
      method,
      guardianSenderName.trim() || selectedSantri.guardianName,
      notes.trim() || 'Titipan uang saku santri'
    );
    setLastFinishedTrx({ amount: currentAmt, santriName: currentName });
  };

  const handleFinishTransaction = () => {
    setLastFinishedTrx(null);
    setSearchQuery('');
    setAmount(300000);
    setNotes('Titipan uang saku santri');
  };

  return (
    <div className="space-y-6">
      {/* Menu Selesai / Notifikasi Transaksi Berhasil */}
      {lastFinishedTrx && (
        <div className="bg-emerald-50 border-2 border-emerald-500 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md no-print animate-fade-in">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="font-bold text-sm text-emerald-950 flex items-center gap-1.5">
                <span>Setoran Titipan Berhasil Dibukukan</span>
                <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-200 text-emerald-900 font-mono font-bold">
                  +{formatRupiah(lastFinishedTrx.amount)}
                </span>
              </p>
              <p className="text-xs text-emerald-800">
                Titipan untuk santri <strong>{lastFinishedTrx.santriName}</strong> telah tercatat pada Jurnal Umum & Rekening Koran.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleFinishTransaction}
            className="flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer shrink-0"
          >
            <CheckCircle className="w-4 h-4" />
            <span>Menu Selesai (Transaksi Baru)</span>
          </button>
        </div>
      )}

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

      {/* Main Grid: Form Left (7 Cols), Deposits History Right (5 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ======================================================== */}
        {/* KOLOM KIRI: FORMULIR SETORAN TITIPAN (7 COLS) */}
        {/* ======================================================== */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-6 shadow-xs border border-slate-200 space-y-5">
          <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Formulir Setoran Titipan Santri
              </h3>
              <p className="text-xs text-slate-500">
                Cari santri penerima, masukkan nominal titipan, dan simpan transaksi loket
              </p>
            </div>
            <span className="text-[10px] px-2.5 py-1 rounded-full font-bold bg-amber-100 text-amber-800 border border-amber-200">
              Kasir Loket
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Bagian Pencarian & Pemilihan Santri */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Pencarian Santri Penerima Titipan
              </label>

              {/* Input Pencarian Santri */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Ketik Nama Santri / No. Rekening / NISN / Asrama..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-20 py-2.5 text-xs sm:text-sm bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 focus:border-amber-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 font-medium transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-2 px-2 py-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800 bg-slate-200/80 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                  >
                    Hapus
                  </button>
                )}
              </div>

              {/* Menu Pilih Santri yang Ditemukan (Muncul saat mengetik) */}
              {searchQuery.trim().length > 0 && (
                <div className="bg-slate-50/90 rounded-xl p-3 border border-amber-300/80 space-y-2 shadow-xs">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-amber-900 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      <span>Hasil Pencarian ({filteredSantri.length} Santri):</span>
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Klik tombol <strong>Pilih</strong> untuk menetapkan santri
                    </span>
                  </div>

                  {filteredSantri.length === 0 ? (
                    <div className="p-3 text-center text-xs text-slate-500 bg-white rounded-lg border border-dashed border-slate-300">
                      Santri dengan kata kunci &quot;{searchQuery}&quot; tidak ditemukan. Silakan periksa kembali nama, NISN, atau No. Rekening.
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {filteredSantri.map((s) => {
                        const isSelected = selectedSantri?.id === s.id;
                        return (
                          <div
                            key={s.id}
                            onClick={() => handleSelectSantri(s)}
                            className={`p-2.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-amber-100/70 border-amber-500 ring-1 ring-amber-500 text-slate-900'
                                : 'bg-white hover:bg-slate-100/80 border-slate-200 text-slate-800'
                            }`}
                          >
                            <div className="min-w-0 pr-2">
                              <p className="text-xs font-bold text-slate-900 truncate">
                                {s.name}
                              </p>
                              <p className="text-[11px] text-slate-500 truncate">
                                Rek: <span className="font-mono font-semibold text-slate-700">{s.accountNumber}</span> • NISN: {s.nisn} • {s.dormitory.split(' - ')[0]}
                              </p>
                              <p className="text-[10px] text-emerald-700 font-semibold">
                                Saldo Saat Ini: {formatRupiah(s.balance)} • Wali: {s.guardianName}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleSelectSantri(s)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center space-x-1 ${
                                isSelected
                                  ? 'bg-amber-600 text-white shadow-xs'
                                  : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300'
                              }`}
                            >
                              {isSelected ? (
                                <>
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Terpilih</span>
                                </>
                              ) : (
                                <span>Pilih</span>
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Selector Cepat / Pilihan Dropdown jika ingin memilih langsung */}
              <div className="pt-1">
                <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                  <span>Atau pilih langsung dari daftar seluruh santri:</span>
                  <span className="font-semibold text-slate-600">{santriList.length} Santri Terdaftar</span>
                </div>
                <select
                  value={selectedSantriId}
                  onChange={(e) => {
                    const found = santriList.find((s) => s.id === e.target.value);
                    if (found) handleSelectSantri(found);
                  }}
                  className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-800 cursor-pointer"
                >
                  {santriList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} — Rek: {s.accountNumber} ({s.dormitory.split(' - ')[0]}) — Saldo: {formatRupiah(s.balance)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Snapshot Santri Aktif Terpilih (Data yang Tampil Mengacu pada Santri yang Tertulis) */}
            {selectedSantri && (
              <div className="bg-gradient-to-br from-amber-50/80 via-white to-emerald-50/80 border-2 border-amber-300/80 rounded-2xl p-4 shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-amber-200/60">
                  <div className="flex items-center space-x-2">
                    <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-700">
                      <UserCheck className="w-4 h-4" />
                    </span>
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Santri Penerima Terpilih:
                    </span>
                  </div>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Akun Rekening Aktif
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1">
                    <p className="text-sm font-extrabold text-slate-900 leading-tight">
                      {selectedSantri.name}
                    </p>
                    <p className="text-slate-600 font-medium">
                      No. Rekening:{' '}
                      <strong className="text-amber-900 font-mono font-bold bg-amber-100/70 px-1.5 py-0.5 rounded">
                        {selectedSantri.accountNumber}
                      </strong>
                    </p>
                    <p className="text-slate-500 text-[11px]">
                      NISN: {selectedSantri.nisn} • {selectedSantri.dormitory}
                    </p>
                    <p className="text-slate-600 text-[11px]">
                      Wali Santri: <strong className="text-slate-800">{selectedSantri.guardianName}</strong>
                    </p>
                  </div>

                  <div className="bg-white/80 p-3 rounded-xl border border-amber-200/80 flex flex-col justify-between">
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                        Saldo Wadiah Saat Ini
                      </p>
                      <p className="text-base font-black text-emerald-800 font-mono-numbers">
                        {formatRupiah(selectedSantri.balance)}
                      </p>
                    </div>
                    <div className="pt-2 border-t border-slate-100 mt-1">
                      <p className="text-[10px] text-slate-500">Estimasi Saldo Setelah Setor:</p>
                      <p className="text-xs font-extrabold text-amber-900 font-mono-numbers">
                        {formatRupiah(selectedSantri.balance + (amount > 0 ? amount : 0))}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

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

        {/* ======================================================== */}
        {/* KOLOM KANAN: RIWAYAT SETORAN SANTRI & TERAKHIR (5 COLS) */}
        {/* ======================================================== */}
        <div className="lg:col-span-5 space-y-5">
          {/* BAGIAN ATAS: Riwayat Setoran Khusus Atas Nama Santri Tersebut */}
          <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200 space-y-4">
            <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
                  <UserCheck className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                    Riwayat Setoran: {selectedSantri?.name || 'Santri Terpilih'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    No. Rek: <span className="font-mono font-semibold">{selectedSantri?.accountNumber}</span>
                  </p>
                </div>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                {santriDeposits.length} Setoran
              </span>
            </div>

            {/* Ringkasan Akumulasi Setoran Santri */}
            <div className="grid grid-cols-2 gap-2 bg-slate-50 rounded-xl p-2.5 border border-slate-200 text-xs">
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-semibold">Total Titipan Masuk</p>
                <p className="font-extrabold text-emerald-800 font-mono-numbers text-xs sm:text-sm">
                  {formatRupiah(totalSantriDeposits)}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-semibold">Saldo Wadiah Aktif</p>
                <p className="font-extrabold text-slate-900 font-mono-numbers text-xs sm:text-sm">
                  {formatRupiah(selectedSantri?.balance || 0)}
                </p>
              </div>
            </div>

            {/* Daftar Riwayat Khusus Santri Ini */}
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {santriDeposits.length === 0 ? (
                <div className="p-4 text-center rounded-xl bg-slate-50 border border-dashed border-slate-200 text-slate-400 text-xs space-y-1">
                  <AlertCircle className="w-4 h-4 mx-auto text-slate-400" />
                  <p>Belum ada riwayat setoran untuk santri ini.</p>
                  <p className="text-[10px]">Gunakan formulir di samping untuk melakukan setoran pertama.</p>
                </div>
              ) : (
                santriDeposits.map((trx) => (
                  <div
                    key={trx.id}
                    className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition-colors flex items-center justify-between text-xs"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center space-x-1.5 text-[10px] text-slate-500 font-medium">
                        <span>{trx.date}</span>
                        <span>•</span>
                        <span>{trx.time.slice(0, 5)} WIB</span>
                      </div>
                      <p className="font-bold text-slate-900 truncate text-[11px]">
                        Penyetor: {trx.guardianSenderName || selectedSantri.guardianName}
                      </p>
                      <p className="text-[10px] text-slate-500 truncate">
                        {trx.notes || 'Setoran Titipan'}
                      </p>
                      <span className="text-[9px] px-1.5 py-0.2 rounded font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        {formatPaymentMethodLabel(trx.method)}
                      </span>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-xs font-black text-emerald-700 font-mono-numbers">
                        +{formatRupiah(trx.amount)}
                      </p>
                      <button
                        type="button"
                        onClick={() => onViewReceipt(trx, selectedSantri)}
                        className="mt-1 flex items-center space-x-1 text-[10px] text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-2 py-0.5 rounded-lg cursor-pointer ml-auto hover:bg-slate-100"
                        title="Cetak Slip Setoran"
                      >
                        <Receipt className="w-3 h-3 text-slate-500" />
                        <span>Slip</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* BAGIAN BAWAH: Riwayat Setoran Titipan Terakhir (Semua Santri) */}
          <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200 space-y-4">
            <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="p-1.5 rounded-lg bg-amber-100 text-amber-700">
                  <Clock className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                    Riwayat Setoran Titipan Terakhir
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Aktivitas setoran seluruh santri pesantren
                  </p>
                </div>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">
                {allRecentDeposits.length} Catatan
              </span>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {allRecentDeposits.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  Belum ada transaksi setoran titipan tercatat
                </div>
              ) : (
                allRecentDeposits.map((trx) => {
                  const s = santriList.find((item) => item.id === trx.santriId);
                  const isCurrentSantri = trx.santriId === selectedSantri?.id;

                  return (
                    <div
                      key={trx.id}
                      className={`p-2.5 rounded-xl border transition-colors flex items-center justify-between text-xs ${
                        isCurrentSantri
                          ? 'border-amber-300 bg-amber-50/50'
                          : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center space-x-1.5 text-[10px] text-slate-500 font-medium">
                          <span>{trx.date}</span>
                          <span>•</span>
                          <span>{trx.time.slice(0, 5)} WIB</span>
                        </div>
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {trx.santriName}
                        </p>
                        <p className="text-[10px] text-slate-500 truncate">
                          Penyetor: {trx.guardianSenderName || 'Wali Santri'}
                        </p>
                        <span className="text-[9px] text-emerald-700 font-semibold">
                          {formatPaymentMethodLabel(trx.method)}
                        </span>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="text-xs font-black text-emerald-700 font-mono-numbers">
                          +{formatRupiah(trx.amount)}
                        </p>
                        {s && (
                          <button
                            type="button"
                            onClick={() => onViewReceipt(trx, s)}
                            className="mt-1 flex items-center space-x-1 text-[10px] text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-2 py-0.5 rounded-lg cursor-pointer ml-auto hover:bg-slate-100"
                            title="Cetak Slip Setoran"
                          >
                            <Receipt className="w-3 h-3 text-slate-500" />
                            <span>Slip</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-400 text-center">
              Setiap setoran otomatis membukukan kas masuk di Jurnal Umum & Rekening Koran.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
