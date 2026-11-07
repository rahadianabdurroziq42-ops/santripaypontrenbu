import React, { useState } from 'react';
import { 
  X, 
  Search, 
  HandCoins, 
  AlertTriangle, 
  CheckCircle2, 
  Lock, 
  Wallet, 
  User, 
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { Santri, Transaction, PesantrenProfile } from '../types/finance';
import { 
  formatRupiah, 
  checkDailyAllowanceEligibility, 
  getTodayDateString 
} from '../utils/accounting';

interface QuickTellerModalProps {
  isOpen: boolean;
  onClose: () => void;
  santriList: Santri[];
  transactions: Transaction[];
  pesantrenProfile: PesantrenProfile;
  onProcessWithdrawal: (santriId: string, amount: number, notes: string) => void;
}

export const QuickTellerModal: React.FC<QuickTellerModalProps> = ({
  isOpen,
  onClose,
  santriList,
  transactions,
  pesantrenProfile,
  onProcessWithdrawal,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSantriId, setSelectedSantriId] = useState<string>(santriList[0]?.id || '');
  const [notes, setNotes] = useState('Uang Jajan Harian');
  const [activeDormitoryFilter, setActiveDormitoryFilter] = useState('ALL');

  if (!isOpen) return null;

  const todayStr = getTodayDateString();

  // Extract unique dormitories for quick filter
  const dormitories = Array.from(
    new Set(santriList.map((s) => s.dormitory.split(' - ')[0]))
  );

  const filteredSantri = santriList.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.nisn.includes(searchTerm) ||
      s.accountNumber.includes(searchTerm) ||
      s.dormitory.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesDorm =
      activeDormitoryFilter === 'ALL' ||
      s.dormitory.startsWith(activeDormitoryFilter);

    return matchesSearch && matchesDorm;
  });

  const selectedSantri = santriList.find((s) => s.id === selectedSantriId) || santriList[0];
  const eligibility = selectedSantri
    ? checkDailyAllowanceEligibility(selectedSantri, transactions, todayStr)
    : null;

  const handleWithdraw = () => {
    if (!selectedSantri || !eligibility || !eligibility.canWithdraw) return;
    onProcessWithdrawal(selectedSantri.id, eligibility.maxAllowed, notes);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs no-print">
      <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-950 via-emerald-900 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-700/60 rounded-lg border border-emerald-500/40">
              <HandCoins className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                <span>Loket Teller: Penarikan Jajan Santri</span>
                <span className="text-[10px] bg-emerald-500/30 text-emerald-200 border border-emerald-400/30 px-2 py-0.5 rounded font-mono">
                  Maks. Rp 10.000 / Hari
                </span>
              </h2>
              <p className="text-xs text-emerald-200/80">
                Pencairan otomatis dengan validasi kuota 1 kali per hari (Akad Wadiah)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Split view (Left: Santri Directory / Search; Right: Verification & Dispenser) */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12">
          {/* Left Column: Santri Directory (5 cols) */}
          <div className="md:col-span-5 border-r border-slate-200 flex flex-col bg-slate-50/50">
            {/* Search Input */}
            <div className="p-3 border-b border-slate-200 bg-white">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari Nama / NISN / No Rek / Asrama..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                />
              </div>

              {/* Dormitory quick tags */}
              <div className="flex space-x-1 overflow-x-auto mt-2 pt-1 pb-1 scrollbar-none text-[11px]">
                <button
                  onClick={() => setActiveDormitoryFilter('ALL')}
                  className={`px-2 py-0.5 rounded-full whitespace-nowrap cursor-pointer ${
                    activeDormitoryFilter === 'ALL'
                      ? 'bg-emerald-800 text-white font-semibold'
                      : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                  }`}
                >
                  Semua
                </button>
                {dormitories.map((dorm) => (
                  <button
                    key={dorm}
                    onClick={() => setActiveDormitoryFilter(dorm)}
                    className={`px-2 py-0.5 rounded-full whitespace-nowrap cursor-pointer ${
                      activeDormitoryFilter === dorm
                        ? 'bg-emerald-800 text-white font-semibold'
                        : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                    }`}
                  >
                    {dorm.replace('Asrama ', '')}
                  </button>
                ))}
              </div>
            </div>

            {/* Santri List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5 max-h-[380px] md:max-h-[460px]">
              {filteredSantri.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  Tidak ada santri ditemukan
                </div>
              ) : (
                filteredSantri.map((santri) => {
                  const check = checkDailyAllowanceEligibility(santri, transactions, todayStr);
                  const isSelected = selectedSantri?.id === santri.id;

                  return (
                    <div
                      key={santri.id}
                      onClick={() => setSelectedSantriId(santri.id)}
                      className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all flex items-center justify-between ${
                        isSelected
                          ? 'bg-emerald-50 border-emerald-500 shadow-sm ring-1 ring-emerald-500'
                          : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                            santri.gender === 'L'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-rose-100 text-rose-700'
                          }`}
                        >
                          {santri.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">
                            {santri.name}
                          </p>
                          <p className="text-[10px] text-slate-500 truncate">
                            {santri.accountNumber} • {santri.dormitory.split(' - ')[0]}
                          </p>
                          <p className="text-[11px] font-semibold text-emerald-800 font-mono-numbers">
                            Saldo: {formatRupiah(santri.balance)}
                          </p>
                        </div>
                      </div>

                      {/* Status Tag */}
                      <div className="shrink-0 ml-2">
                        {check.status === 'INACTIVE' ? (
                          <span className="flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-300">
                            <Lock className="w-3 h-3" />
                            <span>Dibekukan</span>
                          </span>
                        ) : check.status === 'ALREADY_TAKEN' ? (
                          <span className="flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-300">
                            <Lock className="w-3 h-3" />
                            <span>Sudah Ambil</span>
                          </span>
                        ) : check.status === 'INSUFFICIENT_BALANCE' ? (
                          <span className="flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Saldo Kurang</span>
                          </span>
                        ) : (
                          <span className="flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Siap Ambil</span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Selected Santri Status & Dispenser Action (7 cols) */}
          <div className="md:col-span-7 p-5 flex flex-col justify-between overflow-y-auto bg-white">
            {selectedSantri && eligibility ? (
              <div className="space-y-4">
                {/* Santri Identity Card */}
                <div className="bg-gradient-to-br from-slate-900 to-emerald-950 text-white rounded-xl p-4 shadow-md relative overflow-hidden">
                  <div className="absolute -right-4 -bottom-4 opacity-10 font-black text-8xl font-arabic pointer-events-none select-none">
                    وديعة
                  </div>

                  <div className="flex items-start justify-between relative z-10">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-xl bg-emerald-600/30 border border-emerald-400/40 flex items-center justify-center text-white font-bold text-lg">
                        {selectedSantri.name.charAt(0)}
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-emerald-300 tracking-wider">
                          Rekening Wadiah Santri
                        </span>
                        <h3 className="text-base font-bold text-white leading-tight">
                          {selectedSantri.name}
                        </h3>
                        <p className="text-xs text-slate-300">
                          NISN: {selectedSantri.nisn} | No. Rek: {selectedSantri.accountNumber}
                        </p>
                      </div>
                    </div>

                    <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {selectedSantri.status}
                    </span>
                  </div>

                  {/* Metadata Row */}
                  <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-emerald-800/60 text-xs">
                    <div>
                      <p className="text-[10px] text-slate-400">Asrama & Kamar</p>
                      <p className="font-semibold text-slate-200">{selectedSantri.dormitory}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400">Wali Santri (Pemberi Titipan)</p>
                      <p className="font-semibold text-slate-200">{selectedSantri.guardianName}</p>
                    </div>
                  </div>

                  {/* Big Balance Box */}
                  <div className="mt-4 bg-slate-950/70 p-3 rounded-lg border border-emerald-600/30 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-slate-400">
                        Total Saldo Titipan Saat Ini
                      </p>
                      <p className="text-xl font-black text-emerald-400 font-mono-numbers">
                        {formatRupiah(selectedSantri.balance)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-slate-400">Batas Jajan Harian</p>
                      <p className="text-xs font-bold text-amber-300 font-mono-numbers">
                        Rp {selectedSantri.dailyAllowanceLimit.toLocaleString('id-ID')} / Hari (1x)
                      </p>
                    </div>
                  </div>
                </div>

                {/* ELIGIBILITY & STATUS BANNER (Strict Rule Verification) */}
                {eligibility.status === 'INACTIVE' && (
                  <div className="bg-rose-50 border-2 border-rose-300 rounded-xl p-4 text-rose-900 shadow-sm animate-pulse-once">
                    <div className="flex items-start space-x-3">
                      <div className="p-2 bg-rose-200 text-rose-800 rounded-lg shrink-0 mt-0.5">
                        <Lock className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-rose-950 flex items-center gap-1.5">
                          <span>PENARIKAN DITOLAK: REKENING SANTRI DIBEKUKAN / NONAKTIF</span>
                        </h4>
                        <p className="text-xs text-rose-800 mt-1 leading-relaxed">
                          Rekening santri saat ini berstatus <strong>{selectedSantri.status}</strong> (tidak aktif / keluar). Penarikan uang jajan tidak dapat diproses.
                        </p>
                        <div className="mt-2 text-[11px] bg-rose-100/80 p-2 rounded-md border border-rose-200 font-medium">
                          <strong>Solusi:</strong> Jika santri telah aktif kembali belajar di pesantren, bendahara dapat mengaktifkan kembali rekening ini melalui menu <strong>Data Santri</strong>.
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {eligibility.status === 'ALREADY_TAKEN' && (
                  <div className="bg-rose-50 border-2 border-rose-300 rounded-xl p-4 text-rose-900 shadow-sm animate-pulse-once">
                    <div className="flex items-start space-x-3">
                      <div className="p-2 bg-rose-200 text-rose-800 rounded-lg shrink-0 mt-0.5">
                        <Lock className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-rose-950 flex items-center gap-1.5">
                          <span>PENARIKAN DITOLAK: SUDAH DIAMBIL HARI INI</span>
                        </h4>
                        <p className="text-xs text-rose-800 mt-1 leading-relaxed">
                          Santri ini telah mengambil jajan sebesar{' '}
                          <strong className="underline">
                            {formatRupiah(eligibility.todayWithdrawal?.amount || 10000)}
                          </strong>{' '}
                          pada pukul{' '}
                          <strong>{eligibility.todayWithdrawal?.time || '-'} WIB</strong> hari ini.
                        </p>
                        <div className="mt-2 text-[11px] bg-rose-100/80 p-2 rounded-md border border-rose-200 font-medium">
                          <strong>Kaidah Sistem Pesantren:</strong> Pengambilan uang saku santri ke bendahara dibatasi maksimal <strong>1 kali setiap hari</strong> sebesar Rp 10.000. Kuota jajan baru akan dibuka kembali besok pagi.
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {eligibility.status === 'INSUFFICIENT_BALANCE' && (
                  <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 text-amber-900 shadow-sm">
                    <div className="flex items-start space-x-3">
                      <div className="p-2 bg-amber-200 text-amber-800 rounded-lg shrink-0 mt-0.5">
                        <AlertTriangle className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-amber-950">
                          SALDO TITIPAN TIDAK MENCUKUPI
                        </h4>
                        <p className="text-xs text-amber-800 mt-1">
                          Saldo titipan santri saat ini {formatRupiah(selectedSantri.balance)}, sehingga tidak mencukupi untuk penarikan jajan penuh Rp 10.000.
                        </p>
                        <p className="text-xs text-amber-900 font-semibold mt-2">
                          Silakan hubungi wali ({selectedSantri.guardianName} - {selectedSantri.guardianPhone}) untuk melakukan setoran titipan wadiah baru.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {eligibility.status === 'ELIGIBLE' && (
                  <div className="bg-emerald-50 border-2 border-emerald-400 rounded-xl p-4 text-emerald-900 shadow-sm">
                    <div className="flex items-start space-x-3">
                      <div className="p-2 bg-emerald-200 text-emerald-800 rounded-lg shrink-0 mt-0.5">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-emerald-950 flex items-center gap-1.5">
                          <span>KUOTA TERSEDIA: DAPAT MENGAMBIL HARI INI</span>
                        </h4>
                        <p className="text-xs text-emerald-800 mt-1">
                          Santri belum melakukan penarikan jajan hari ini. Saldo titipan mencukupi.
                        </p>
                        <div className="mt-2 flex items-center justify-between bg-emerald-100/80 p-2.5 rounded-lg border border-emerald-300">
                          <span className="text-xs font-semibold text-emerald-900">
                            Nominal Penarikan Yang Disetujui:
                          </span>
                          <span className="text-base font-black text-emerald-950 font-mono-numbers">
                            {formatRupiah(eligibility.maxAllowed)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Notes Input */}
                <div className="pt-1">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Catatan Kasir / Kebutuhan
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Contoh: Uang Jajan Harian / Makan Siang"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            ) : null}

            {/* Action Bar Bottom */}
            <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-between">
              <button
                onClick={onClose}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>

              <button
                disabled={!eligibility?.canWithdraw}
                onClick={handleWithdraw}
                className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer ${
                  eligibility?.canWithdraw
                    ? 'bg-emerald-700 hover:bg-emerald-600 active:scale-95 text-white shadow-emerald-700/30 hover:shadow-lg'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                }`}
              >
                {eligibility?.status === 'INACTIVE' ? (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Rekening Dibekukan</span>
                  </>
                ) : eligibility?.status === 'ALREADY_TAKEN' ? (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Sistem Terkunci (Sudah Ambil 1x)</span>
                  </>
                ) : eligibility?.status === 'INSUFFICIENT_BALANCE' ? (
                  <>
                    <ShieldAlert className="w-4 h-4" />
                    <span>Saldo Kurang</span>
                  </>
                ) : (
                  <>
                    <HandCoins className="w-4 h-4 text-emerald-100" />
                    <span>Proses Penarikan Rp 10.000</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
