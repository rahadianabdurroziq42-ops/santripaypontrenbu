import React, { useState } from 'react';
import { BookOpen, Printer, Search, CheckCircle2, Filter } from 'lucide-react';
import { Transaction, PesantrenProfile } from '../types/finance';
import { generateJournalForTransaction, formatRupiah, formatDateIndo } from '../utils/accounting';
import { PrintControlBar } from './PrintControlBar';

interface JurnalUmumViewProps {
  transactions: Transaction[];
  pesantrenProfile: PesantrenProfile;
}

export const JurnalUmumView: React.FC<JurnalUmumViewProps> = ({
  transactions,
  pesantrenProfile,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Generate journal entries for all transactions sorted chronologically
  const journalEntries = transactions
    .slice()
    .sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`))
    .map((t) => generateJournalForTransaction(t))
    .filter((entry) => {
      const matchSearch =
        entry.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.entryNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.referenceNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.lines.some((l) => l.accountName.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchSearch;
    });

  let totalDebit = 0;
  let totalCredit = 0;

  journalEntries.forEach((entry) => {
    entry.lines.forEach((l) => {
      totalDebit += l.debit;
      totalCredit += l.credit;
    });
  });

  const isBalanced = totalDebit === totalCredit;

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 no-print flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <BookOpen className="w-5 h-5 text-emerald-700" />
            <h2 className="text-base font-bold text-slate-900">
              Buku Jurnal Umum (General Journal Akuntansi Syariah)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Pencatatan ganda otomatis (Double Entry Bookkeeping) untuk setiap aliran dana titipan dan jajan
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari akun, nama santri, no ref..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Print Controls (A4 / F4 & Landscape / Portrait) */}
          <PrintControlBar
            documentTitle="Buku Jurnal Umum Syariah"
            defaultOrientation="landscape"
            defaultPaperSize="F4"
            buttonLabel="Cetak Jurnal"
          />
        </div>
      </div>

      {/* Audit Balance Status */}
      <div className="no-print">
        {isBalanced ? (
          <div className="bg-emerald-50 border border-emerald-300 rounded-xl px-4 py-3 flex items-center justify-between text-xs text-emerald-900">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-semibold">
                Keseimbangan Audit Jurnal: <strong>BALANCE</strong> (Total Debet = Total Kredit).
              </span>
            </div>
            <div className="font-mono-numbers font-bold text-emerald-800">
              {formatRupiah(totalDebit)}
            </div>
          </div>
        ) : null}
      </div>

      {/* Main Journal Paper */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200 print-card font-sans">
        {/* Printable Header */}
        <div className="text-center pb-4 mb-4 border-b border-slate-200 print-only hidden">
          <h1 className="text-base font-black uppercase text-slate-900">
            {pesantrenProfile.formalName}
          </h1>
          <h2 className="text-sm font-bold uppercase text-slate-800">
            BUKU JURNAL UMUM AKUNTANSI SYARIAH
          </h2>
        </div>

        <div className="border border-slate-300 rounded-xl overflow-hidden font-sans">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-900 text-white uppercase text-[11px] tracking-wider">
                <th className="px-3 py-2.5 text-left w-24">Tanggal</th>
                <th className="px-3 py-2.5 text-left w-32">No. Bukti / Ref</th>
                <th className="px-3 py-2.5 text-left">Nama Perkiraan (Akun) & Keterangan</th>
                <th className="px-3 py-2.5 text-center w-24">Ref Akun</th>
                <th className="px-3 py-2.5 text-right w-32">Debet (Rp)</th>
                <th className="px-3 py-2.5 text-right w-32">Kredit (Rp)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {journalEntries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400 italic">
                    Belum ada entri jurnal yang tercatat.
                  </td>
                </tr>
              ) : (
                journalEntries.map((entry) => (
                  <React.Fragment key={entry.id}>
                    {/* Header Row for each Transaction */}
                    <tr className="bg-slate-50/80 font-semibold text-slate-700 text-[11px]">
                      <td className="px-3 py-1.5 font-mono text-slate-600">
                        {entry.date}
                      </td>
                      <td className="px-3 py-1.5 font-mono text-slate-500 text-[10px]">
                        {entry.referenceNo}
                      </td>
                      <td colSpan={4} className="px-3 py-1.5 italic text-slate-800">
                        {entry.description}
                      </td>
                    </tr>

                    {/* Debit and Credit Rows */}
                    {entry.lines.map((line, idx) => {
                      const isCreditLine = line.credit > 0;
                      return (
                        <tr key={idx} className="hover:bg-slate-50/40">
                          <td></td>
                          <td></td>
                          <td className={`px-3 py-1.5 text-slate-800 ${isCreditLine ? 'pl-8' : 'pl-3 font-semibold'}`}>
                            {line.accountName}
                          </td>
                          <td className="px-3 py-1.5 text-center font-mono text-[10px] text-slate-500">
                            {line.accountCode}
                          </td>
                          <td className="px-3 py-1.5 text-right font-mono-numbers text-slate-900 font-medium">
                            {line.debit > 0 ? formatRupiah(line.debit) : '-'}
                          </td>
                          <td className="px-3 py-1.5 text-right font-mono-numbers text-slate-900 font-medium">
                            {line.credit > 0 ? formatRupiah(line.credit) : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))
              )}

              {/* Total Row */}
              <tr className="bg-slate-900 text-white font-bold text-xs uppercase tracking-wider">
                <td colSpan={4} className="px-3 py-3 text-right">
                  TOTAL DEBET & KREDIT
                </td>
                <td className="px-3 py-3 text-right font-mono-numbers text-emerald-300 font-black">
                  {formatRupiah(totalDebit)}
                </td>
                <td className="px-3 py-3 text-right font-mono-numbers text-emerald-300 font-black">
                  {formatRupiah(totalCredit)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
