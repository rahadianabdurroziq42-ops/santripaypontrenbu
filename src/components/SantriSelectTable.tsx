import React, { useState, useMemo } from 'react';
import { Search, Check, AlertCircle } from 'lucide-react';
import { Santri } from '../types/finance';
import { formatRupiah } from '../utils/accounting';

export interface SantriSelectTableProps {
  santriList: Santri[];
  selectedSantriId: string;
  onSelectSantri: (santri: Santri) => void;
  accentColor?: 'emerald' | 'amber' | 'indigo' | 'teal';
  label?: string;
  placeholder?: string;
  estimatedDelta?: number; // positive for deposit (+), negative for withdrawal (-)
  showBalancePreview?: boolean;
}

export const SantriSelectTable: React.FC<SantriSelectTableProps> = ({
  santriList,
  selectedSantriId,
  onSelectSantri,
  accentColor = 'emerald',
  label = 'Pilih Santri (Verifikasi Data Santri, Wali & Saldo):',
  placeholder = 'Cari nama santri, wali santri, NISN, atau no. rekening...',
  estimatedDelta = 0,
  showBalancePreview = true,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected santri
  const selectedSantri = useMemo(() => {
    return santriList.find((s) => s.id === selectedSantriId) || santriList[0];
  }, [santriList, selectedSantriId]);

  // Filter santri by name, guardian name, account number, NISN, or class
  const filteredSantriList = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return santriList;
    return santriList.filter((s) => {
      const matchName = s.name.toLowerCase().includes(q);
      const matchGuardian = s.guardianName?.toLowerCase().includes(q) || false;
      const matchAcc = s.accountNumber.toLowerCase().includes(q);
      const matchNis = s.nisn.toLowerCase().includes(q);
      return matchName || matchGuardian || matchAcc || matchNis;
    });
  }, [santriList, searchQuery]);

  // Accent styling mappings
  const colorStyles = {
    emerald: {
      ring: 'focus:ring-emerald-500',
      borderFocus: 'focus:border-emerald-500',
      icon: 'text-emerald-600',
      badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      rowActive: 'bg-emerald-50/90 font-bold',
      radioActive: 'border-emerald-600 bg-emerald-600',
      textActive: 'text-emerald-950 font-bold',
      balanceActive: 'font-black text-emerald-700',
      summaryBg: 'bg-emerald-50/80 border-emerald-200 text-emerald-950',
      summaryTag: 'bg-emerald-600 text-white',
      deltaText: 'text-emerald-700',
    },
    amber: {
      ring: 'focus:ring-amber-500',
      borderFocus: 'focus:border-amber-500',
      icon: 'text-amber-600',
      badge: 'bg-amber-100 text-amber-800 border-amber-300',
      rowActive: 'bg-amber-50/90 font-bold',
      radioActive: 'border-amber-600 bg-amber-600',
      textActive: 'text-amber-950 font-bold',
      balanceActive: 'font-black text-amber-800',
      summaryBg: 'bg-amber-50/80 border-amber-200 text-amber-950',
      summaryTag: 'bg-amber-600 text-white',
      deltaText: 'text-amber-700',
    },
    indigo: {
      ring: 'focus:ring-indigo-500',
      borderFocus: 'focus:border-indigo-500',
      icon: 'text-indigo-600',
      badge: 'bg-indigo-100 text-indigo-800 border-indigo-300',
      rowActive: 'bg-indigo-50/90 font-bold',
      radioActive: 'border-indigo-600 bg-indigo-600',
      textActive: 'text-indigo-950 font-bold',
      balanceActive: 'font-black text-indigo-700',
      summaryBg: 'bg-indigo-50/80 border-indigo-200 text-indigo-950',
      summaryTag: 'bg-indigo-600 text-white',
      deltaText: 'text-indigo-700',
    },
    teal: {
      ring: 'focus:ring-teal-500',
      borderFocus: 'focus:border-teal-500',
      icon: 'text-teal-600',
      badge: 'bg-teal-100 text-teal-800 border-teal-300',
      rowActive: 'bg-teal-50/90 font-bold',
      radioActive: 'border-teal-600 bg-teal-600',
      textActive: 'text-teal-950 font-bold',
      balanceActive: 'font-black text-teal-800',
      summaryBg: 'bg-teal-50/80 border-teal-200 text-teal-950',
      summaryTag: 'bg-teal-700 text-white',
      deltaText: 'text-teal-700',
    },
  }[accentColor];

  const estimatedNewBalance = selectedSantri ? selectedSantri.balance + estimatedDelta : 0;

  return (
    <div className="space-y-2.5">
      {/* Label & Instructions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
          {label}
        </label>
        <span className="text-[11px] text-slate-500">
          Klik baris santri untuk memilih dan memverifikasi
        </span>
      </div>

      {/* Search Input */}
      <div className="relative flex items-center">
        <div className="absolute left-3 text-slate-400 pointer-events-none">
          <Search className={`w-4 h-4 ${colorStyles.icon}`} />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={placeholder}
          className={`w-full pl-9 pr-20 py-2.5 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 ${colorStyles.ring} ${colorStyles.borderFocus} shadow-xs placeholder-slate-400 font-medium transition-all`}
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-2.5 px-2.5 py-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            Hapus
          </button>
        )}
      </div>

      {/* Tabel Santri: 3 Kolom Sesuai Permintaan (Nama Santri, Wali Santri, Sisa Saldo) */}
      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
        <div className="max-h-56 overflow-y-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-100 text-slate-700 sticky top-0 z-10 border-b border-slate-200 text-[11px] uppercase tracking-wider font-bold">
              <tr>
                <th className="py-2.5 px-3">Nama Santri</th>
                <th className="py-2.5 px-3">Wali Santri</th>
                <th className="py-2.5 px-3 text-right">Sisa Saldo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSantriList.length > 0 ? (
                filteredSantriList.map((s) => {
                  const isSelected = selectedSantri?.id === s.id;
                  return (
                    <tr
                      key={s.id}
                      onClick={() => onSelectSantri(s)}
                      className={`transition-colors cursor-pointer select-none ${
                        isSelected
                          ? `${colorStyles.rowActive}`
                          : 'hover:bg-slate-50/80 text-slate-700'
                      }`}
                    >
                      {/* Kolom 1: Nama Santri */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center space-x-2.5">
                          <div
                            className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                              isSelected
                                ? colorStyles.radioActive
                                : 'border-slate-300 bg-white'
                            }`}
                          >
                            {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white"></span>}
                          </div>
                          <div className="min-w-0">
                            <span
                              className={`block truncate leading-tight ${
                                isSelected ? colorStyles.textActive : 'text-slate-900 font-semibold'
                              }`}
                            >
                              {s.name}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              NISN: {s.nisn}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Kolom 2: Wali Santri */}
                      <td className="py-2.5 px-3">
                        <span className={`truncate block max-w-[170px] ${isSelected ? 'font-bold text-slate-900' : 'text-slate-700 font-medium'}`}>
                          {s.guardianName || '-'}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono block">
                          Rek: {s.accountNumber}
                        </span>
                      </td>

                      {/* Kolom 3: Sisa Saldo */}
                      <td className="py-2.5 px-3 text-right">
                        <span
                          className={`font-mono font-mono-numbers block ${
                            isSelected
                              ? colorStyles.balanceActive
                              : 'font-bold text-slate-900'
                          }`}
                        >
                          {formatRupiah(s.balance)}
                        </span>
                        {s.balance === 0 && (
                          <span className="text-[10px] text-rose-500 font-semibold">
                            Saldo Rp 0
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-slate-400 text-xs">
                    <AlertCircle className="w-5 h-5 mx-auto mb-1 text-slate-300" />
                    Tidak ada santri yang cocok dengan &quot;{searchQuery}&quot;.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Bar Verifikasi Data Santri Terpilih */}
        {selectedSantri && (
          <div className={`p-3 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs ${colorStyles.summaryBg}`}>
            <div className="flex items-center space-x-2.5 min-w-0">
              <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1 ${colorStyles.summaryTag}`}>
                <Check className="w-3 h-3" />
                <span>Terverifikasi</span>
              </span>
              <div className="min-w-0">
                <p className="font-extrabold text-slate-900 truncate leading-tight">
                  {selectedSantri.name}
                </p>
                <p className="text-[11px] text-slate-600 truncate">
                  Wali: <strong className="text-slate-800">{selectedSantri.guardianName}</strong> • Rek: <span className="font-mono">{selectedSantri.accountNumber}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-right shrink-0">
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">
                  Sisa Saldo Saat Ini
                </span>
                <span className="font-mono font-black text-slate-900 text-sm font-mono-numbers">
                  {formatRupiah(selectedSantri.balance)}
                </span>
              </div>

              {showBalancePreview && estimatedDelta !== 0 && (
                <div className="pl-3 border-l border-slate-300/60">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">
                    Estimasi Saldo Baru
                  </span>
                  <span className={`font-mono font-black text-sm font-mono-numbers ${colorStyles.deltaText}`}>
                    {formatRupiah(estimatedNewBalance)}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
