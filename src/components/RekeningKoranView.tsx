import React, { useState } from 'react';
import { 
  Receipt, 
  Printer, 
  Search, 
  Calendar, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Building2, 
  ShieldCheck,
  CheckCircle,
  FileSpreadsheet
} from 'lucide-react';
import { Santri, Transaction, PesantrenProfile } from '../types/finance';
import { 
  getRekeningKoran, 
  formatRupiah, 
  formatDateIndo, 
  getTodayDateString 
} from '../utils/accounting';
import { PrintControlBar } from './PrintControlBar';

interface RekeningKoranViewProps {
  santriList: Santri[];
  transactions: Transaction[];
  pesantrenProfile: PesantrenProfile;
}

export const RekeningKoranView: React.FC<RekeningKoranViewProps> = ({
  santriList,
  transactions,
  pesantrenProfile,
}) => {
  const [selectedSantriId, setSelectedSantriId] = useState<string>(santriList[0]?.id || '');
  
  // Default to past 30 days
  const today = getTodayDateString();
  const past30 = new Date();
  past30.setDate(past30.getDate() - 30);
  const past30Str = past30.toISOString().split('T')[0];

  const [startDate, setStartDate] = useState<string>(past30Str);
  const [endDate, setEndDate] = useState<string>(today);
  const [searchTerm, setSearchTerm] = useState('');

  const statement = getRekeningKoran(
    selectedSantriId,
    startDate,
    endDate,
    santriList,
    transactions
  );

  const handlePrint = () => {
    window.print();
  };

  const filteredSantri = santriList.filter((s) =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.nisn.includes(searchTerm) ||
    s.accountNumber.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      {/* Selector & Date Filter Controls (No Print) */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 no-print flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Searchable Santri Selector */}
        <div className="flex-1 max-w-lg space-y-1.5">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            Pilih Rekening Santri (Cari Nama / NISN / No. Rekening)
          </label>
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Ketik nama santri, NISN, no rek..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>
            <select
              value={selectedSantriId}
              onChange={(e) => setSelectedSantriId(e.target.value)}
              className="flex-1 px-3 py-1.5 text-xs font-semibold bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
            >
              {filteredSantri.length === 0 ? (
                <option value="">Santri tidak ditemukan</option>
              ) : (
                filteredSantri.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} - Rek: {s.accountNumber} ({formatRupiah(s.balance)})
                  </option>
                ))
              )}
            </select>
          </div>
          {searchTerm && (
            <p className="text-[11px] text-emerald-700 font-medium">
              Ditemukan {filteredSantri.length} santri dari pencarian "{searchTerm}"
            </p>
          )}
        </div>

        {/* Date Range Picker */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500">Dari:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent font-medium text-slate-800 focus:outline-none cursor-pointer"
            />
          </div>

          <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
            <span className="text-slate-500">Sampai:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent font-medium text-slate-800 focus:outline-none cursor-pointer"
            />
          </div>

          {/* Print Controls (A4 / F4 & Landscape / Portrait) */}
          <PrintControlBar
            documentTitle={`Rekening Koran Wadiah - ${statement?.santri?.name || 'Santri'}`}
            defaultOrientation="portrait"
            defaultPaperSize="A4"
            buttonLabel="Cetak Rekening Koran"
          />
        </div>
      </div>

      {/* Official Islamic Bank Statement / Rekening Koran */}
      {statement ? (
        <div className="bg-white rounded-2xl p-6 sm:p-10 shadow-sm border border-slate-200 print-card font-mono-numbers">
          {/* Header Formal Pesantren */}
          <div className="border-b-2 border-slate-900 pb-5 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center space-x-4">
                {pesantrenProfile.logoUrl ? (
                  <div className="w-14 h-14 rounded-2xl bg-white p-1 border border-slate-200 shadow-xs flex items-center justify-center shrink-0 overflow-hidden">
                    <img
                      src={pesantrenProfile.logoUrl}
                      alt="Logo Pesantren"
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-slate-900 flex items-center justify-center text-emerald-400 border border-emerald-500/40 shrink-0">
                    <Building2 className="w-8 h-8" />
                  </div>
                )}
                <div>
                  <p className="font-arabic text-xs text-emerald-800 font-bold mb-0.5">
                    بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                  </p>
                  <h1 className="text-lg sm:text-xl font-black uppercase text-slate-900 tracking-tight font-sans">
                    {pesantrenProfile.formalName}
                  </h1>
                  <p className="text-xs text-slate-600 font-sans">
                    Unit Baitul Maal & Pengelolaan Rekening Wadiah Titipan Santri
                  </p>
                  <p className="text-[11px] text-slate-500 font-sans">
                    {pesantrenProfile.address}, {pesantrenProfile.district} • Telp: {pesantrenProfile.phone}
                  </p>
                </div>
              </div>

              <div className="text-left sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200">
                <span className="inline-block px-3 py-1 bg-emerald-900 text-emerald-100 text-xs font-bold uppercase tracking-wider rounded-lg font-sans">
                  REKENING KORAN WADIAH
                </span>
                <p className="text-xs text-slate-600 font-sans mt-1">
                  Periode Mutasi:
                </p>
                <p className="text-xs font-bold text-slate-900 font-sans">
                  {formatDateIndo(statement.startDate)} s/d {formatDateIndo(statement.endDate)}
                </p>
              </div>
            </div>
          </div>

          {/* Account & Nasabah Information Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs font-sans mb-6">
            <div className="space-y-1.5">
              <div className="flex justify-between border-b border-slate-200 pb-1">
                <span className="text-slate-500">Nomor Rekening Wadiah</span>
                <span className="font-mono font-bold text-slate-900">{statement.santri.accountNumber}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-1">
                <span className="text-slate-500">Nama Santri (Nasabah)</span>
                <span className="font-bold text-slate-900">{statement.santri.name}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-1">
                <span className="text-slate-500">Nomor Induk / NISN</span>
                <span className="font-semibold text-slate-800">{statement.santri.nisn}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Asrama & Kelas</span>
                <span className="font-medium text-slate-800">{statement.santri.dormitory} ({statement.santri.className})</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between border-b border-slate-200 pb-1">
                <span className="text-slate-500">Wali Santri (Pemberi Titipan)</span>
                <span className="font-semibold text-slate-900">{statement.santri.guardianName}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-1">
                <span className="text-slate-500">Kontak / Telepon Wali</span>
                <span className="font-medium text-slate-800">{statement.santri.guardianPhone}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-1">
                <span className="text-slate-500">Jenis Akad Syariah</span>
                <span className="font-bold text-emerald-800">Wadiah Yad Dhamanah</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Ketentuan Jajan Harian</span>
                <span className="font-bold text-amber-800">Maks. Rp 10.000 / Hari (1x)</span>
              </div>
            </div>
          </div>

          {/* Account Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="bg-white border border-slate-300 p-3 rounded-xl">
              <p className="text-[10px] uppercase font-bold text-slate-500 font-sans">Saldo Awal</p>
              <p className="text-sm sm:text-base font-bold text-slate-800 mt-1">
                {formatRupiah(statement.openingBalance)}
              </p>
            </div>

            <div className="bg-emerald-50/60 border border-emerald-300 p-3 rounded-xl">
              <div className="flex items-center space-x-1 text-emerald-700 text-[10px] uppercase font-bold font-sans">
                <ArrowDownLeft className="w-3 h-3" />
                <span>Total Setoran (+)</span>
              </div>
              <p className="text-sm sm:text-base font-bold text-emerald-800 mt-1">
                {formatRupiah(statement.totalCredit)}
              </p>
            </div>

            <div className="bg-rose-50/60 border border-rose-300 p-3 rounded-xl">
              <div className="flex items-center space-x-1 text-rose-700 text-[10px] uppercase font-bold font-sans">
                <ArrowUpRight className="w-3 h-3" />
                <span>Total Penarikan (-)</span>
              </div>
              <p className="text-sm sm:text-base font-bold text-rose-800 mt-1">
                {formatRupiah(statement.totalDebit)}
              </p>
            </div>

            <div className="bg-slate-900 text-white p-3 rounded-xl border border-slate-800">
              <p className="text-[10px] uppercase font-bold text-emerald-300 font-sans">Saldo Akhir</p>
              <p className="text-sm sm:text-base font-black text-white mt-1">
                {formatRupiah(statement.closingBalance)}
              </p>
            </div>
          </div>

          {/* Mutation Details Table */}
          <div className="border border-slate-300 rounded-xl overflow-hidden font-sans mb-6">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-900 text-white font-bold uppercase tracking-wider text-[11px]">
                  <th className="px-3 py-2.5 text-left w-24">Tanggal</th>
                  <th className="px-3 py-2.5 text-left w-28">No. Transaksi</th>
                  <th className="px-3 py-2.5 text-left">Uraian / Keterangan</th>
                  <th className="px-3 py-2.5 text-right w-28">Debet (Rp)</th>
                  <th className="px-3 py-2.5 text-right w-28">Kredit (Rp)</th>
                  <th className="px-3 py-2.5 text-right w-32">Saldo (Rp)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {/* Opening Balance Row */}
                <tr className="bg-slate-50 font-semibold text-slate-700">
                  <td className="px-3 py-2 text-slate-500 font-mono text-[11px]">{statement.startDate}</td>
                  <td className="px-3 py-2 text-slate-400 font-mono text-[10px]">-</td>
                  <td className="px-3 py-2 italic">SALDO AWAL PERIODE</td>
                  <td className="px-3 py-2 text-right text-slate-400">-</td>
                  <td className="px-3 py-2 text-right text-slate-400">-</td>
                  <td className="px-3 py-2 text-right font-bold text-slate-900 font-mono-numbers">
                    {formatRupiah(statement.openingBalance)}
                  </td>
                </tr>

                {statement.lines.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400 italic">
                      Tidak ada mutasi transaksi pada rentang tanggal yang dipilih
                    </td>
                  </tr>
                ) : (
                  statement.lines.map((line) => (
                    <tr key={line.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-3 py-2 text-slate-600 font-mono text-[11px] whitespace-nowrap">
                        {line.date} <span className="text-slate-400 text-[10px]">{line.time.slice(0, 5)}</span>
                      </td>
                      <td className="px-3 py-2 font-mono text-[10px] text-slate-500 whitespace-nowrap">
                        {line.transactionNo}
                      </td>
                      <td className="px-3 py-2 text-slate-800">
                        <p className="font-semibold">{line.description}</p>
                        {line.notes && (
                          <p className="text-[10px] text-slate-500 italic mt-0.5">{line.notes}</p>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right font-mono-numbers text-rose-700 font-medium">
                        {line.debit > 0 ? formatRupiah(line.debit) : '-'}
                      </td>
                      <td className="px-3 py-2 text-right font-mono-numbers text-emerald-700 font-bold">
                        {line.credit > 0 ? formatRupiah(line.credit) : '-'}
                      </td>
                      <td className="px-3 py-2 text-right font-mono-numbers font-bold text-slate-900">
                        {formatRupiah(line.balance)}
                      </td>
                    </tr>
                  ))
                )}

                {/* Closing Summary Row */}
                <tr className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-900">
                  <td colSpan={3} className="px-3 py-2.5 text-right uppercase text-[11px] tracking-wider">
                    TOTAL MUTASI & SALDO AKHIR
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono-numbers text-rose-800 font-bold">
                    {formatRupiah(statement.totalDebit)}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono-numbers text-emerald-800 font-bold">
                    {formatRupiah(statement.totalCredit)}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono-numbers text-emerald-950 font-black text-sm">
                    {formatRupiah(statement.closingBalance)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Sharia Statement Notes & Digital Stamp Authorization */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end pt-2 text-xs font-sans">
            <div className="text-[11px] text-slate-500 space-y-1">
              <p className="font-semibold text-slate-700">Ketentuan & Syarat Rekening Wadiah Pesantren:</p>
              <p>1. Rekening ini dikelola berdasarkan prinsip titipan syariah murni (Wadiah Yad Dhamanah).</p>
              <p>2. Pengambilan jajan harian santri dibatasi maksimal Rp 10.000 per hari (1 kali sehari) untuk melatih kemandirian dan hidup hemat santri.</p>
              <p>3. Rekening koran ini merupakan dokumen resmi yang dapat dipertanggungjawabkan kepada orang tua/wali santri.</p>
            </div>

            {/* Official Digital Signature & Stamp */}
            <div className="flex justify-end">
              <div className="text-center relative">
                <p className="text-[11px] text-slate-500">
                  {pesantrenProfile.district}, {formatDateIndo(today)}
                </p>
                <p className="font-bold text-slate-900 text-xs mt-0.5">
                  Bendahara Kas Titipan Pesantren
                </p>

                {/* Digital Stamp Simulation */}
                <div className="h-16 flex items-center justify-center my-1 relative">
                  <div className="border-2 border-emerald-700/80 rounded-xl px-4 py-1 text-emerald-800 font-bold text-[10px] uppercase tracking-wider transform -rotate-3 bg-emerald-50/50 shadow-xs">
                    <p className="font-black">TERCATAT RESMI</p>
                    <p className="text-[8px] tracking-normal font-sans">Baitul Maal Darul Ma'arif</p>
                  </div>
                </div>

                <p className="font-bold underline text-slate-900 text-xs">
                  {pesantrenProfile.headOfTreasury}
                </p>
                <p className="text-[10px] text-slate-500">{pesantrenProfile.treasuryNIP}</p>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
