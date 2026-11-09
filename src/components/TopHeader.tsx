import { 
  Menu, 
  Clock, 
  ShieldCheck, 
  Wallet,
  ChevronRight,
  LogIn
} from 'lucide-react';
import { PesantrenProfile, AuthUser } from '../types/finance';
import { formatRupiah } from '../utils/accounting';

import { User } from 'firebase/auth';

interface TopHeaderProps {
  activeTab: string;
  onOpenMobileMenu: () => void;
  pesantrenProfile: PesantrenProfile;
  totalWadiah: number;
  totalActiveSantri: number;
  currentUser: AuthUser | User | null;
  userRole?: 'PENGURUS' | 'BENDAHARA';
  isCloudConnected: boolean;
  onSignOut: () => void;
  onGoToLanding: () => void;
  onToggleRole?: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  activeTab,
  onOpenMobileMenu,
  pesantrenProfile,
  totalWadiah,
  totalActiveSantri,
  currentUser,
  userRole = 'PENGURUS',
  isCloudConnected,
  onSignOut,
  onGoToLanding,
  onToggleRole,
}) => {
  const currentDate = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const getPageInfo = () => {
    switch (activeTab) {
      case 'dashboard':
        return { parent: 'Menu Utama', title: 'Dashboard', badge: 'Kas Syariah' };
      case 'penarikan-jajan':
      case 'loket-jajan':
        return { parent: 'Menu Bendahara • Penarikan', title: 'Penarikan Jajan + Kebutuhan Lainnya', badge: 'Uang Saku & Keperluan' };
      case 'setor-spp':
        return { parent: 'Menu Bendahara • Setoran', title: 'Setoran SPP Syahriah Santri', badge: 'Pembayaran SPP' };
      case 'setor-titipan':
        return { parent: 'Menu Bendahara • Setoran', title: 'Setor Titipan Uang Saku', badge: 'Top Up Wadiah' };
      case 'penarikan-spp':
        return { parent: 'Menu Bendahara • Penarikan', title: 'Penarikan SPP dari Saldo Titipan', badge: 'Auto-Debet SPP' };
      case 'santri':
        return { parent: 'Menu Utama', title: 'Data Santri & Rekening Wadiah', badge: `${totalActiveSantri} Santri Terdaftar` };
      case 'bku':
        return { parent: 'Laporan & Akuntansi', title: 'Buku Kas Umum (BKU)', badge: 'Arus Kas & Saldo Berjalan' };
      case 'buku-kas-besar':
        return { parent: 'Laporan & Akuntansi', title: 'Buku Kas Besar (Ledger)', badge: 'Buku Besar Kas & Bank' };
      case 'neraca':
        return { parent: 'Laporan & Akuntansi', title: 'Neraca (Skontro & Staffel/Druffel)', badge: 'PSAK Syariah 101' };
      case 'rekening-koran':
        return { parent: 'Laporan & Akuntansi', title: 'Rekening Koran Wadiah', badge: 'Bank Statement' };
      case 'rekap-tanggal':
        return { parent: 'Laporan & Akuntansi', title: 'Rekap Rentang Tanggal', badge: 'Arus Kas' };
      case 'jurnal':
        return { parent: 'Laporan & Akuntansi', title: 'Jurnal Umum Syariah', badge: 'Double-entry' };
      case 'profil':
        return { parent: 'Pengaturan', title: 'Profil Lembaga & Logo', badge: 'Identitas Resmi' };
      default:
        return { parent: 'Menu Bendahara', title: 'Penarikan Jajan + Kebutuhan', badge: 'Syariah' };
    }
  };

  const page = getPageInfo();

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs no-print">
      {/* Top Banner on Mobile / Micro bar */}
      <div className="bg-gradient-to-r from-emerald-950 to-slate-900 text-white px-4 py-1.5 text-[11px] flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="font-arabic text-amber-300 font-semibold text-xs">
            بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
          </span>
          <span className="hidden sm:inline text-slate-400">|</span>
          <span className="hidden sm:inline text-emerald-200">
            {pesantrenProfile.formalName}
          </span>
        </div>

        <div className="flex items-center space-x-3 text-slate-300">
          {/* Cloud Sync Status Badge */}
          <div className="flex items-center space-x-1.5 px-2 py-0.5 rounded-full bg-slate-800/80 border border-slate-700 text-[10px]">
            <span className={`w-2 h-2 rounded-full ${isCloudConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <span className="font-mono text-slate-200">
              {isCloudConnected ? 'Cloud Realtime Aktif' : 'Cloud Menghubungkan...'}
            </span>
          </div>

          <div className="hidden sm:flex items-center space-x-1">
            <Clock className="w-3 h-3 text-amber-300" />
            <span className="font-mono text-[10px]">{currentDate}</span>
          </div>
          <span className="hidden md:flex items-center space-x-1 text-emerald-300 font-mono text-[10px]">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            <span>Maks 1x / Santri / Hari</span>
          </span>
        </div>
      </div>

      {/* Main Bar */}
      <div className="px-4 py-2.5 sm:py-3 flex items-center justify-between gap-3">
        {/* Left: Mobile hamburger & Breadcrumbs */}
        <div className="flex items-center space-x-3">
          <button
            onClick={onOpenMobileMenu}
            className="md:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Buka Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div>
            <div className="flex items-center space-x-1.5 text-[11px] text-slate-500 font-medium">
              <span>{page.parent}</span>
              <ChevronRight className="w-3 h-3 text-slate-400" />
              <span className="text-slate-700 font-bold">{page.title}</span>
            </div>
            <div className="flex items-center space-x-2 mt-0.5">
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                {page.title}
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 font-mono">
                {page.badge}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Total Wadiah Metric & Google Auth */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          <div className="hidden xs:flex items-center space-x-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
            <div className="p-1 bg-emerald-100 text-emerald-800 rounded-lg">
              <Wallet className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">
                Total Titipan Wadiah
              </p>
              <p className="text-xs font-black text-slate-900 font-mono-numbers">
                {formatRupiah(totalWadiah)}
              </p>
            </div>
          </div>

          {/* User Profile / Google Sign-in */}
          {currentUser ? (
            <div className="flex items-center space-x-2 bg-emerald-50/70 border border-emerald-200 px-2.5 py-1 rounded-xl">
              {currentUser.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.displayName || 'Petugas'}
                  className="w-7 h-7 rounded-full object-cover border border-emerald-300"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-emerald-700 text-white flex items-center justify-center text-xs font-bold font-mono">
                  {(currentUser.displayName || currentUser.email || 'B')[0].toUpperCase()}
                </div>
              )}
              <div className="hidden sm:block text-left">
                <p className="text-xs font-bold text-slate-900 leading-tight truncate max-w-[150px]">
                  {currentUser.displayName || (userRole === 'PENGURUS' ? 'Pengurus Pesantren' : 'Bendahara Loket')}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`w-2 h-2 rounded-full ${userRole === 'PENGURUS' ? 'bg-amber-500' : 'bg-teal-500'}`}></span>
                  <span className={`text-[10px] font-bold ${userRole === 'PENGURUS' ? 'text-amber-800' : 'text-teal-800'}`}>
                    {userRole === 'PENGURUS' ? 'Pengurus (Full Akses)' : 'Bendahara (Kasir Loket)'}
                  </span>
                  {onToggleRole && (
                    <button
                      type="button"
                      onClick={onToggleRole}
                      className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 transition-colors cursor-pointer"
                      title="Klik untuk beralih antara peran Pengurus dan Bendahara"
                    >
                      Ganti Peran ⇄
                    </button>
                  )}
                </div>
              </div>
              <button
                onClick={onSignOut}
                className="text-[11px] px-2 py-1 text-slate-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer font-medium ml-1"
                title="Keluar"
              >
                Keluar
              </button>
            </div>
          ) : (
            <button
              onClick={onGoToLanding}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Login Bendahara</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
