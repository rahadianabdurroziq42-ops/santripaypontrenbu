import React, { useState } from 'react';
import { 
  Scale, 
  Columns, 
  Rows, 
  Printer, 
  CheckCircle2, 
  AlertCircle, 
  Calendar,
  ShieldCheck,
  Info,
  Wallet,
  ArrowRightLeft,
  HandCoins,
  ArrowDownRight,
  ArrowUpRight,
  TrendingDown
} from 'lucide-react';
import { Santri, Transaction, PesantrenProfile } from '../types/finance';
import { 
  calculateNeraca, 
  formatRupiah, 
  formatDateIndo, 
  getTodayDateString 
} from '../utils/accounting';
import { PrintControlBar } from './PrintControlBar';

interface NeracaViewProps {
  santriList: Santri[];
  transactions: Transaction[];
  pesantrenProfile: PesantrenProfile;
}

export const NeracaView: React.FC<NeracaViewProps> = ({
  santriList,
  transactions,
  pesantrenProfile,
}) => {
  const [formatType, setFormatType] = useState<'SKONTRO' | 'STAFFEL'>('SKONTRO');
  const [asOfDate, setAsOfDate] = useState<string>(getTodayDateString());

  const neraca = calculateNeraca(santriList, transactions, asOfDate);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Controls & Explanation Bar */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 no-print flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Scale className="w-5 h-5 text-emerald-700" />
            <h2 className="text-base font-bold text-slate-900">
              Neraca Kas Titipan Santri (Akad Wadiah Murni)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Eksklusif mencatat arus dana titipan orang tua dan penarikan uang jajan harian santri
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* As Of Date Picker */}
          <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-500 font-medium">Per Tanggal:</span>
            <input
              type="date"
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer"
            />
          </div>

          {/* Toggle Skontro vs Staffel / Druffel */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
            <button
              onClick={() => setFormatType('SKONTRO')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                formatType === 'SKONTRO'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              <span>Bentuk Skontro (Horizontal)</span>
            </button>
            <button
              onClick={() => setFormatType('STAFFEL')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                formatType === 'STAFFEL'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Rows className="w-3.5 h-3.5" />
              <span>Bentuk Staffel / Druffel (Vertikal)</span>
            </button>
          </div>

          {/* Print Controls (A4 / F4 & Landscape / Portrait) */}
          <PrintControlBar
            documentTitle={`Laporan Neraca Wadiah (${formatType === 'SKONTRO' ? 'Bentuk Skontro' : 'Bentuk Staffel/Druffel'})`}
            defaultOrientation={formatType === 'SKONTRO' ? 'landscape' : 'portrait'}
            defaultPaperSize="A4"
            buttonLabel="Cetak Neraca"
          />
        </div>
      </div>

      {/* Balance Indicator Status Box (No Print) */}
      <div className="no-print">
        {neraca.isBalanced ? (
          <div className="bg-emerald-50 border border-emerald-300 rounded-xl px-4 py-3 flex items-center justify-between text-xs text-emerald-900">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-semibold">
                Status Neraca: <strong>SEIMBANG (BALANCE 100%)</strong>. Total Kas Titipan yang Ada = Total Kewajiban Titipan Seluruh Santri.
              </span>
            </div>
            <div className="font-mono-numbers font-bold text-emerald-800 text-right">
              Total Titipan: {formatRupiah(neraca.aktiva.totalAktiva)}
            </div>
          </div>
        ) : (
          <div className="bg-rose-50 border border-rose-300 rounded-xl px-4 py-3 flex items-center justify-between text-xs text-rose-900">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span className="font-semibold">
                Status Neraca: Terdapat Selisih {formatRupiah(neraca.discrepancy)}.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Main Neraca Paper Layout */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200 print-card font-mono-numbers">
        {/* Formal Pesantren Letterhead */}
        <div className="border-b-2 border-slate-900 pb-4 mb-6 text-center">
          <p className="font-arabic text-sm text-emerald-800 font-bold mb-1">
            بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
          </p>
          {pesantrenProfile.logoUrl && (
            <div className="flex justify-center mb-2">
              <img
                src={pesantrenProfile.logoUrl}
                alt="Logo Pesantren"
                className="w-14 h-14 object-contain"
              />
            </div>
          )}
          <h1 className="text-lg sm:text-xl font-black uppercase text-slate-900 tracking-wide font-sans">
            {pesantrenProfile.formalName}
          </h1>
          <p className="text-xs text-slate-600 font-sans mt-0.5">
            Unit Pengelolaan Kas Titipan Wadiah Santri (Baitul Maal Pesantren)
          </p>
          <p className="text-[10px] text-slate-500 font-sans">
            {pesantrenProfile.address}, {pesantrenProfile.district} • Telp: {pesantrenProfile.phone}
          </p>
          <div className="mt-3 pt-2 border-t border-slate-200 flex flex-col items-center">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 font-sans">
              LAPORAN NERACA KAS TITIPAN SANTRI ({formatType === 'STAFFEL' ? 'STAFFEL / DRUFFEL' : 'SKONTRO'})
            </h2>
            <p className="text-xs text-slate-500 font-sans font-medium">
              Per {formatDateIndo(neraca.asOfDate)} (Dinyatakan dalam Rupiah)
            </p>
            <span className="mt-1 text-[10px] bg-emerald-100 text-emerald-900 px-2.5 py-0.5 rounded-full font-sans font-bold border border-emerald-300">
              Struktur Khusus: Arus Titipan Orang Tua & Penarikan Jajan Santri
            </span>
          </div>
        </div>

        {/* Ringkasan Akumulasi Realisasi Titipan & Total Penarikan Uang Jajan Santri */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6 font-sans">
          {/* Card 1: Total Titipan Masuk */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
            <div className="flex items-center justify-between text-slate-500 text-[11px] font-semibold">
              <span className="flex items-center gap-1.5">
                <ArrowDownRight className="w-4 h-4 text-emerald-600" />
                <span>Total Titipan Masuk (Wali)</span>
              </span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-mono">
                {neraca.countSetoranTitipan} Transaksi
              </span>
            </div>
            <p className="text-base font-black text-slate-900 font-mono-numbers mt-1.5">
              {formatRupiah(neraca.totalSetoranTitipan)}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Akumulasi setoran uang saku via loket tunai & bank
            </p>
          </div>

          {/* Card 2: Total Penarikan Uang Jajan Santri (Highlighted) */}
          <div className="bg-amber-50/80 border-2 border-amber-400 rounded-xl p-3.5 shadow-xs">
            <div className="flex items-center justify-between text-amber-950 text-[11px] font-bold">
              <span className="flex items-center gap-1.5">
                <HandCoins className="w-4 h-4 text-amber-700" />
                <span>Total Penarikan Uang Jajan</span>
              </span>
              <span className="text-[10px] bg-amber-200 text-amber-900 px-1.5 py-0.2 rounded font-mono font-bold">
                {neraca.countPenarikanJajan}x Pencairan
              </span>
            </div>
            <p className="text-base font-black text-amber-900 font-mono-numbers mt-1.5">
              {formatRupiah(neraca.totalPenarikanJajan)}
            </p>
            <p className="text-[10px] text-amber-800 mt-0.5 font-medium">
              Uang jajan harian yang telah ditarik santri di loket
            </p>
          </div>

          {/* Card 3: Sisa Kas Titipan Berjalan */}
          <div className="bg-emerald-50/70 border border-emerald-300 rounded-xl p-3.5">
            <div className="flex items-center justify-between text-emerald-900 text-[11px] font-semibold">
              <span className="flex items-center gap-1.5">
                <Wallet className="w-4 h-4 text-emerald-700" />
                <span>Sisa Saldo Kas Titipan</span>
              </span>
              <span className="text-[10px] bg-emerald-200 text-emerald-900 px-1.5 py-0.2 rounded font-mono font-bold">
                {neraca.totalSantriWithBalance} Santri Aktif
              </span>
            </div>
            <p className="text-base font-black text-emerald-950 font-mono-numbers mt-1.5">
              {formatRupiah(neraca.pasiva.totalPasiva)}
            </p>
            <p className="text-[10px] text-emerald-700 mt-0.5">
              Total hak saldo santri yang siap dicairkan jajan
            </p>
          </div>
        </div>

        {/* FORMAT 1: SKONTRO (HORIZONTAL / T-ACCOUNT) */}
        {formatType === 'SKONTRO' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-2">
            {/* AKTIVA: SISI KIRI (KAS FISIK & BANK TITIPAN) */}
            <div className="border border-slate-300 rounded-xl overflow-hidden flex flex-col justify-between">
              <div>
                <div className="bg-slate-900 text-white px-4 py-2.5 text-xs font-bold uppercase tracking-wider flex justify-between font-sans">
                  <span>AKTIVA (KAS TITIPAN SANTRI)</span>
                  <span>JUMLAH (RP)</span>
                </div>

                <div className="p-4 space-y-4 text-xs font-sans">
                  <div>
                    <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] border-b border-slate-200 pb-1 flex items-center justify-between">
                      <span>Kas Titipan yang Dikelola Bendahara</span>
                      <span className="text-[10px] font-normal text-slate-500">Aset Lancar</span>
                    </h4>

                    <div className="mt-3 space-y-3">
                      {/* Kas Fisik Tunai Bendahara */}
                      <div className="flex justify-between items-start text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                        <div>
                          <p className="font-bold text-slate-900">Kas Fisik Tunai Bendahara</p>
                          <p className="text-[10px] text-slate-500 font-mono">1-1000 (Brankas Loket Jajan)</p>
                          <p className="text-[10px] text-slate-500 mt-0.5 italic">
                            Uang tunai titipan untuk pencairan jajan harian santri
                          </p>
                        </div>
                        <span className="font-black text-slate-900 font-mono-numbers text-sm">
                          {formatRupiah(neraca.aktiva.kasTunaiTitipan)}
                        </span>
                      </div>

                      {/* Kas Rekening Bank Titipan Transfer */}
                      <div className="flex justify-between items-start text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                        <div>
                          <p className="font-bold text-slate-900">Kas Rekening Bank (Transfer Via Bank)</p>
                          <p className="text-[10px] text-slate-500 font-mono">1-1010 (Rekening Transfer Via Bank Wadiah Santri)</p>
                          <p className="text-[10px] text-slate-500 mt-0.5 italic">
                            Dana titipan orang tua yang masuk via transfer bank
                          </p>
                        </div>
                        <span className="font-black text-slate-900 font-mono-numbers text-sm">
                          {formatRupiah(neraca.aktiva.kasBankTitipan)}
                        </span>
                      </div>

                      {/* Ringkasan Realisasi Jajan di Sisi Kas */}
                      <div className="flex justify-between items-center text-slate-700 bg-amber-50/60 p-2.5 rounded-lg border border-amber-200">
                        <div className="flex items-center space-x-2">
                          <HandCoins className="w-4 h-4 text-amber-700 shrink-0" />
                          <div>
                            <p className="font-bold text-amber-950 text-xs">Total Penarikan Uang Jajan Santri</p>
                            <p className="text-[10px] text-amber-800">Telah dicairkan secara tunai di loket bendahara</p>
                          </div>
                        </div>
                        <span className="font-black text-amber-900 font-mono-numbers text-xs">
                          {formatRupiah(neraca.totalPenarikanJajan)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Total Aktiva Footer */}
              <div className="bg-emerald-50 border-t-2 border-slate-900 p-3.5 flex justify-between items-center font-sans">
                <div>
                  <span className="font-bold text-slate-900 text-xs uppercase tracking-wider block">
                    TOTAL AKTIVA (KAS TITIPAN)
                  </span>
                  <span className="text-[10px] text-emerald-800">Uang fisik tunai + saldo bank titipan</span>
                </div>
                <span className="font-black text-base text-emerald-950 font-mono-numbers">
                  {formatRupiah(neraca.aktiva.totalAktiva)}
                </span>
              </div>
            </div>

            {/* PASIVA: SISI KANAN (KEWAJIBAN TITIPAN WADIAH SANTRI) */}
            <div className="border border-slate-300 rounded-xl overflow-hidden flex flex-col justify-between">
              <div>
                <div className="bg-slate-900 text-white px-4 py-2.5 text-xs font-bold uppercase tracking-wider flex justify-between font-sans">
                  <span>PASIVA (KEWAJIBAN TITIPAN WADIAH)</span>
                  <span>JUMLAH (RP)</span>
                </div>

                <div className="p-4 space-y-4 text-xs font-sans">
                  <div>
                    <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] border-b border-slate-200 pb-1 flex items-center justify-between">
                      <span>Hak Saldo Titipan Milik Santri</span>
                      <span className="text-[10px] font-normal text-slate-500">Kewajiban Wadiah</span>
                    </h4>

                    <div className="mt-3 space-y-3">
                      {/* Simpanan Wadiah Santri */}
                      <div className="flex justify-between items-start text-slate-700 bg-emerald-50/60 p-2.5 rounded-lg border border-emerald-200">
                        <div>
                          <p className="font-bold text-emerald-950">Simpanan Wadiah Titipan Santri</p>
                          <p className="text-[10px] text-slate-500 font-mono">2-1000 (Akad Wadiah Yad Dhamanah)</p>
                          <p className="text-[10px] text-slate-600 mt-0.5">
                            Total saldo titipan uang saku seluruh santri aktif ({neraca.totalSantriWithBalance} santri memiliki saldo)
                          </p>
                        </div>
                        <span className="font-black text-emerald-900 font-mono-numbers text-sm">
                          {formatRupiah(neraca.pasiva.kewajibanTitipanWadiah)}
                        </span>
                      </div>

                      {/* Rincian Arus Wadiah: Masuk vs Ditarik Jajan Santri */}
                      <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1.5 text-[11px]">
                        <div className="flex justify-between text-slate-600">
                          <span>Akumulasi Titipan Diterima:</span>
                          <span className="font-semibold font-mono-numbers">{formatRupiah(neraca.totalSetoranTitipan)}</span>
                        </div>
                        <div className="flex justify-between text-amber-950 font-bold bg-amber-100/80 px-2 py-1.5 rounded border border-amber-300">
                          <span className="flex items-center gap-1.5">
                            <HandCoins className="w-3.5 h-3.5 text-amber-700" />
                            <span>Total Penarikan Uang Jajan Santri:</span>
                          </span>
                          <span className="font-mono-numbers text-rose-700">- {formatRupiah(neraca.totalPenarikanJajan)}</span>
                        </div>
                        <div className="flex justify-between text-emerald-950 font-bold border-t border-slate-200 pt-1">
                          <span>Sisa Hak Saldo Titipan Seluruh Santri:</span>
                          <span className="font-mono-numbers">{formatRupiah(neraca.pasiva.kewajibanTitipanWadiah)}</span>
                        </div>
                      </div>

                      {/* Penjelasan Transparansi */}
                      <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-600 space-y-1">
                        <div className="flex items-center space-x-1.5 font-bold text-slate-800">
                          <ShieldCheck className="w-4 h-4 text-emerald-600" />
                          <span>Prinsip Titipan Murni (Amanah):</span>
                        </div>
                        <p className="text-[10px] leading-relaxed text-slate-500">
                          Seluruh dana yang ada di tangan bendahara adalah hak milik santri dari pemberian orang tua. Setiap penarikan jajan harian (maks. Rp 10.000) langsung mendebet pos kewajiban ini.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Total Pasiva Footer */}
              <div className="bg-emerald-50 border-t-2 border-slate-900 p-3.5 flex justify-between items-center font-sans">
                <div>
                  <span className="font-bold text-slate-900 text-xs uppercase tracking-wider block">
                    TOTAL PASIVA (KEWAJIBAN TITIPAN)
                  </span>
                  <span className="text-[10px] text-emerald-800">Total hutang titipan kepada santri & wali</span>
                </div>
                <span className="font-black text-base text-emerald-950 font-mono-numbers">
                  {formatRupiah(neraca.pasiva.totalPasiva)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* FORMAT 2: STAFFEL (VERTIKAL BERJENJANG) */}
        {formatType === 'STAFFEL' && (
          <div className="border border-slate-300 rounded-xl overflow-hidden font-sans">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-900 text-white font-bold uppercase tracking-wider text-[11px]">
                  <th className="px-4 py-2.5 text-left w-24">Kode Akun</th>
                  <th className="px-4 py-2.5 text-left">Uraian Akun Kas Titipan</th>
                  <th className="px-4 py-2.5 text-right w-44">Rincian (Rp)</th>
                  <th className="px-4 py-2.5 text-right w-44">Total (Rp)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {/* 1. AKTIVA */}
                <tr className="bg-slate-100 font-bold text-slate-900">
                  <td colSpan={4} className="px-4 py-2 text-xs uppercase tracking-wider">
                    I. AKTIVA (ASET KAS TITIPAN SANTRI)
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-2 text-slate-500 font-mono">1-1000</td>
                  <td className="px-4 py-2 text-slate-800">
                    <p className="font-semibold">Kas Fisik Tunai Bendahara Pesantren</p>
                    <p className="text-[10px] text-slate-500">Uang tunai titipan orang tua untuk pencairan jajan harian di loket</p>
                  </td>
                  <td className="px-4 py-2 text-right font-mono-numbers">{formatRupiah(neraca.aktiva.kasTunaiTitipan)}</td>
                  <td></td>
                </tr>
                <tr>
                  <td className="px-4 py-2 text-slate-500 font-mono">1-1010</td>
                  <td className="px-4 py-2 text-slate-800">
                    <p className="font-semibold">Kas Rekening Bank Syariah (Transfer Via Bank)</p>
                    <p className="text-[10px] text-slate-500">Dana titipan orang tua yang disetor melalui transfer perbankan</p>
                  </td>
                  <td className="px-4 py-2 text-right font-mono-numbers">{formatRupiah(neraca.aktiva.kasBankTitipan)}</td>
                  <td></td>
                </tr>
                <tr className="bg-emerald-50/70 font-bold text-slate-900 border-t-2 border-b border-emerald-300">
                  <td className="px-4 py-2.5"></td>
                  <td className="px-4 py-2.5 uppercase tracking-wide">TOTAL AKTIVA (KAS TITIPAN YANG DIKELOLA)</td>
                  <td></td>
                  <td className="px-4 py-2.5 text-right font-black font-mono-numbers text-sm text-emerald-950">
                    {formatRupiah(neraca.aktiva.totalAktiva)}
                  </td>
                </tr>

                {/* 2. PASIVA */}
                <tr className="bg-slate-100 font-bold text-slate-900">
                  <td colSpan={4} className="px-4 py-2 text-xs uppercase tracking-wider">
                    II. PASIVA (KEWAJIBAN TITIPAN WADIAH SANTRI)
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-2 text-slate-500 font-mono">2-1000A</td>
                  <td className="px-4 py-2 text-slate-800">
                    <p className="font-semibold">Akumulasi Titipan Uang Saku Masuk (Wali Santri)</p>
                    <p className="text-[10px] text-slate-500">
                      Total penerimaan titipan uang saku dari orang tua ({neraca.countSetoranTitipan} transaksi masuk)
                    </p>
                  </td>
                  <td className="px-4 py-2 text-right font-mono-numbers text-slate-800">
                    {formatRupiah(neraca.totalSetoranTitipan)}
                  </td>
                  <td></td>
                </tr>
                <tr className="bg-amber-50/70 border-y border-amber-200">
                  <td className="px-4 py-2 text-amber-800 font-mono font-bold">2-1000B</td>
                  <td className="px-4 py-2 text-amber-950">
                    <div className="flex items-center gap-1.5">
                      <HandCoins className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                      <p className="font-bold">Total Penarikan Uang Jajan Santri (Dicairkan di Loket)</p>
                    </div>
                    <p className="text-[10px] text-amber-800">
                      Akumulasi penarikan uang jajan harian santri ({neraca.countPenarikanJajan} transaksi pencairan, maks. Rp 10.000 / hari)
                    </p>
                  </td>
                  <td className="px-4 py-2 text-right font-mono-numbers font-bold text-rose-700">
                    - {formatRupiah(neraca.totalPenarikanJajan)}
                  </td>
                  <td></td>
                </tr>
                <tr className="bg-emerald-50/50">
                  <td className="px-4 py-2 text-slate-500 font-mono">2-1000</td>
                  <td className="px-4 py-2 text-slate-800">
                    <p className="font-bold text-emerald-950">Sisa Bersih Simpanan Titipan Wadiah Santri</p>
                    <p className="text-[10px] text-slate-500">
                      Total hak saldo titipan seluruh santri aktif ({neraca.totalSantriWithBalance} santri memiliki saldo)
                    </p>
                  </td>
                  <td className="px-4 py-2 text-right font-mono-numbers font-bold text-emerald-800">
                    {formatRupiah(neraca.pasiva.kewajibanTitipanWadiah)}
                  </td>
                  <td className="px-4 py-2 text-right font-black font-mono-numbers text-emerald-950">
                    {formatRupiah(neraca.pasiva.kewajibanTitipanWadiah)}
                  </td>
                </tr>
                <tr className="bg-slate-900 text-white font-bold text-xs uppercase tracking-wider">
                  <td className="px-4 py-2.5"></td>
                  <td className="px-4 py-2.5">TOTAL PASIVA (KEWAJIBAN TITIPAN SANTRI)</td>
                  <td></td>
                  <td className="px-4 py-2.5 text-right font-black font-mono-numbers text-sm text-emerald-300">
                    {formatRupiah(neraca.pasiva.totalPasiva)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Sharia Accounting Notes: Specific to this pure 2-flow model */}
        <div className="mt-6 pt-4 border-t border-slate-200 text-[11px] text-slate-500 font-sans space-y-1.5">
          <div className="flex items-start space-x-2">
            <Info className="w-4 h-4 text-emerald-700 mt-0.5 shrink-0" />
            <div>
              <strong className="text-slate-800">Prinsip Akuntansi Kas Titipan Murni (Custodial Accounting):</strong>
              <p className="mt-0.5 text-slate-600 leading-relaxed">
                1. <strong>Arus Masuk:</strong> Dana titipan uang saku dari orang tua santri menambah Kas (Aktiva) dan diakui seutuhnya sebagai Kewajiban Simpanan Wadiah Santri (Pasiva).
              </p>
              <p className="text-slate-600 leading-relaxed">
                2. <strong>Arus Keluar:</strong> Penarikan jajan harian oleh santri (maksimal Rp 10.000 / hari, 1x sehari) mengurangi Kas Tunai Bendahara (Aktiva) dan mengurangi Kewajiban Titipan Wadiah Santri (Pasiva).
              </p>
              <p className="text-slate-600 leading-relaxed">
                3. Tidak ada pos modal operasional, pendapatan, atau piutang yayasan yang dicampuradukkan dalam neraca ini, sehingga <strong>Total Kas Titipan selalu persis seimbang dengan Total Saldo Hak Santri</strong>.
              </p>
            </div>
          </div>
        </div>

        {/* Official Signatures */}
        <div className="mt-8 pt-4 flex justify-between items-end text-xs font-sans text-slate-800 px-6">
          <div className="text-center">
            <p className="text-slate-500 text-[11px]">Mengetahui,</p>
            <p className="font-bold">Mudir / Pengasuh Pesantren</p>
            <div className="h-16 flex items-center justify-center">
              <span className="text-[10px] text-slate-300 border border-dashed border-slate-300 px-3 py-1 rounded">
                Tanda Tangan & Stempel
              </span>
            </div>
            <p className="font-bold underline text-slate-900">{pesantrenProfile.mudir}</p>
          </div>

          <div className="text-center">
            <p className="text-slate-500 text-[11px]">{pesantrenProfile.district}, {formatDateIndo(neraca.asOfDate)}</p>
            <p className="font-bold">Kepala Bendahara Pesantren</p>
            <div className="h-16 flex items-center justify-center">
              <span className="text-[10px] text-slate-300 border border-dashed border-slate-300 px-3 py-1 rounded">
                Tanda Tangan & Stempel
              </span>
            </div>
            <p className="font-bold underline text-slate-900">{pesantrenProfile.headOfTreasury}</p>
            <p className="text-[10px] text-slate-500">{pesantrenProfile.treasuryNIP}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
