import React, { useState, useEffect } from 'react';
import { 
  Santri, 
  Transaction, 
  PesantrenProfile, 
  PaymentMethod,
  AuthUser
} from './types/finance';
import { 
  initialSantriList, 
  initialTransactions, 
  defaultPesantrenProfile 
} from './data/initialData';
import { 
  checkDailyAllowanceEligibility, 
  getTodayDateString, 
  getCurrentTimeString,
  formatRupiah,
  formatPaymentMethodLabel,
  isCreditTransaction,
  isDebitTransaction
} from './utils/accounting';
import {
  auth,
  signInWithGoogle,
  logOut,
  testConnection,
  subscribeToSantri,
  subscribeToTransactions,
  subscribeToProfile,
  saveSantriToCloud,
  deleteSantriFromCloud,
  updateSantriBalanceInCloud,
  saveTransactionToCloud,
  saveProfileToCloud,
  seedInitialDataToCloud,
  replaceAllSantriInCloud,
  purgeSampleDataFromCloud,
} from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';

import { Sidebar } from './components/Sidebar';
import { TopHeader } from './components/TopHeader';
import { DashboardTotalView } from './components/DashboardTotalView';
import { DashboardTellerView } from './components/DashboardTellerView';
import { SetorTitipanView } from './components/SetorTitipanView';
import { SetorSPPView } from './components/SetorSPPView';
import { PenarikanSPPView } from './components/PenarikanSPPView';
import { NeracaView } from './components/NeracaView';
import { RekeningKoranView } from './components/RekeningKoranView';
import { LaporanRekapView } from './components/LaporanRekapView';
import { SantriManagementView } from './components/SantriManagementView';
import { ImportedSantriItem, ImportMode } from './components/ImportSantriModal';
import { JurnalUmumView } from './components/JurnalUmumView';
import { ProfilPesantrenView } from './components/ProfilPesantrenView';
import { BukuKasUmumView } from './components/BukuKasUmumView';
import { BukuKasBesarView } from './components/BukuKasBesarView';
import { LandingPage } from './components/LandingPage';
import { QuickTellerModal } from './components/QuickTellerModal';
import { ReceiptModal } from './components/ReceiptModal';
import { 
  TransactionConfirmationModal, 
  TransactionConfirmationData 
} from './components/TransactionConfirmationModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ShieldCheck, RotateCcw, Calculator, ShieldAlert, Link2 } from 'lucide-react';

const STORAGE_KEY_SANTRI = 'santripay_santri_v1';
const STORAGE_KEY_TRX = 'santripay_transactions_v1';
const STORAGE_KEY_PROFILE = 'santripay_profile_v1';
const STORAGE_KEY_AUTH = 'santripay_auth_bendahara_v1';

// Daftar santri sample awal yang harus dimusnahkan secara menyeluruh
const SAMPLE_SANTRI_NAMES = [
  'Muhammad Rayhan Pratama',
  'Aisyah Nur Ramadhani',
  'Ahmad Fadhil Muzakki',
  'Fatimah Azzahra',
  'M. Bilal Habiburrahman',
  'Khadijah Al-Munawwarah',
  'Ibrahim Malik Ibrahim',
  'Zahra Khairunnisa',
];

const SAMPLE_TRX_IDS = new Set([
  'trx-101', 'trx-102', 'trx-103', 'trx-104', 'trx-105', 'trx-106', 'trx-107', 'trx-108',
  'trx-201', 'trx-202', 'trx-203', 'trx-204', 'trx-205', 'trx-206', 'trx-207', 'trx-208',
  'trx-301', 'trx-302', 'trx-303', 'trx-304', 'trx-305',
  'trx-spp-001', 'trx-spp-002', 'trx-spp-003'
]);

export function isSampleSantri(santri: Santri): boolean {
  if (!santri) return false;
  return (
    SAMPLE_SANTRI_NAMES.includes(santri.name) ||
    ['snt-001', 'snt-002', 'snt-003', 'snt-004', 'snt-005', 'snt-006', 'snt-007', 'snt-008'].includes(santri.id)
  );
}

export function isSampleTransaction(t: Transaction): boolean {
  if (!t) return false;
  if (SAMPLE_TRX_IDS.has(t.id)) return true;
  if (t.transactionNo && (t.transactionNo.includes('20261001-001') || t.transactionNo.includes('20261010-003'))) return true;
  if (SAMPLE_SANTRI_NAMES.includes(t.santriName)) return true;
  if (t.santriId && ['snt-001', 'snt-002', 'snt-003', 'snt-004', 'snt-005', 'snt-006', 'snt-007', 'snt-008'].includes(t.santriId)) {
    return true;
  }
  return false;
}

// Helpers to ensure account numbers are strictly 501.2026.xxx
function normalizeSantriList(list: Santri[]): Santri[] {
  return list.map((s) => ({
    ...s,
    accountNumber: s.accountNumber ? s.accountNumber.replace(/501\.2024\./g, '501.2026.') : s.accountNumber,
  }));
}

function normalizeTransactionsList(list: Transaction[]): Transaction[] {
  return list.map((t) => ({
    ...t,
    accountNumber: t.accountNumber ? t.accountNumber.replace(/501\.2024\./g, '501.2026.') : t.accountNumber,
  }));
}

export default function App() {
  // Authentication & Cloud Realtime State
  const [currentUser, setCurrentUser] = useState<AuthUser | User | null>(() => {
    try {
      const savedAuth = localStorage.getItem(STORAGE_KEY_AUTH);
      if (savedAuth) return JSON.parse(savedAuth);
    } catch (e) {
      console.error('Failed to parse saved auth', e);
    }
    return null;
  });
  const [currentUserRole, setCurrentUserRole] = useState<'PENGURUS' | 'BENDAHARA'>(() => {
    try {
      const savedRole = localStorage.getItem('santripay_user_role');
      if (savedRole === 'BENDAHARA' || savedRole === 'PENGURUS') return savedRole;
      const savedAuth = localStorage.getItem(STORAGE_KEY_AUTH);
      if (savedAuth) {
        const p = JSON.parse(savedAuth);
        if (p.role === 'BENDAHARA' || p.email === 'bendahara@gmail.com') return 'BENDAHARA';
        if (p.role === 'PENGURUS') return 'PENGURUS';
      }
    } catch (e) {
      console.error('Failed to load user role', e);
    }
    return 'PENGURUS';
  });
  const [isCloudConnected, setIsCloudConnected] = useState<boolean>(() => {
    return Boolean(localStorage.getItem(STORAGE_KEY_AUTH));
  });

  // Load state from localStorage with strict filtering to eliminate any sample data
  const [santriList, setSantriList] = useState<Santri[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SANTRI);
      if (saved) {
        const parsed = normalizeSantriList(JSON.parse(saved));
        const clean = parsed.filter((s) => !isSampleSantri(s));
        if (clean.length !== parsed.length) {
          localStorage.setItem(STORAGE_KEY_SANTRI, JSON.stringify(clean));
        }
        return clean;
      }
    } catch (e) {
      console.error('Failed to load santri data from storage', e);
    }
    return [];
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_TRX);
      if (saved) {
        const parsed = normalizeTransactionsList(JSON.parse(saved));
        const clean = parsed.filter((t) => !isSampleTransaction(t));
        if (clean.length !== parsed.length) {
          localStorage.setItem(STORAGE_KEY_TRX, JSON.stringify(clean));
        }
        return clean;
      }
    } catch (e) {
      console.error('Failed to load transactions data from storage', e);
    }
    return [];
  });

  const [pesantrenProfile, setPesantrenProfile] = useState<PesantrenProfile>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PROFILE);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load profile from storage', e);
    }
    return defaultPesantrenProfile;
  });

  // View mode: 'landing' (Portal Orang Tua + Login Bendahara) or 'dashboard' (Back-office Bendahara)
  const [viewMode, setViewMode] = useState<'landing' | 'dashboard'>('landing');

  // Default to 'dashboard' which is Penarikan Jajan (Rp 10.000)
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isOpenMobile, setIsOpenMobile] = useState<boolean>(false);

  // Modals state (triggered when needed)
  const [isTellerModalOpen, setIsTellerModalOpen] = useState(false);
  
  // Selected santri for modals or views
  const [selectedSantriId, setSelectedSantriId] = useState<string>(santriList[0]?.id || '');

  // Receipt popup state
  const [receiptTrx, setReceiptTrx] = useState<Transaction | null>(null);
  const [receiptSantri, setReceiptSantri] = useState<Santri | null>(null);
  const [pendingConfirmation, setPendingConfirmation] = useState<TransactionConfirmationData | null>(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  // Initialize Firebase connection & Auth listener
  useEffect(() => {
    testConnection();
    // Musnahkan data sample dari Cloud Firestore jika masih tersisa
    purgeSampleDataFromCloud().catch((e) => console.warn('Purge sample error:', e));

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        setIsCloudConnected(true);
      } else {
        // If not Firebase Google user, check if local Bendahara auth exists
        try {
          const savedAuth = localStorage.getItem(STORAGE_KEY_AUTH);
          if (savedAuth) {
            setCurrentUser(JSON.parse(savedAuth));
            setIsCloudConnected(true);
            return;
          }
        } catch (e) {
          console.error(e);
        }
        setCurrentUser(null);
        setIsCloudConnected(false);
      }
    });

    return () => {
      unsubscribeAuth();
    };
  }, []);

  // Real-time Firestore synchronizer (active across the entire application)
  useEffect(() => {
    setIsCloudConnected(true);

    const unsubSantri = subscribeToSantri(
      (cloudSantri) => {
        if (cloudSantri) {
          const clean = cloudSantri.filter((s) => !isSampleSantri(s));
          setSantriList(normalizeSantriList(clean));
        }
      },
      (err) => {
        console.warn('Realtime santri sync notice:', err);
      }
    );

    const unsubTrx = subscribeToTransactions(
      (cloudTrx) => {
        if (cloudTrx) {
          const clean = cloudTrx.filter((t) => !isSampleTransaction(t));
          const normalizedCloud = normalizeTransactionsList(clean);
          normalizedCloud.sort((a, b) => {
            const dComp = b.date.localeCompare(a.date);
            if (dComp !== 0) return dComp;
            return (b.time || '').localeCompare(a.time || '');
          });
          setTransactions(normalizedCloud);
        }
      },
      (err) => {
        console.warn('Realtime transactions sync notice:', err);
      }
    );

    const unsubProfile = subscribeToProfile(
      (cloudProfile) => {
        if (cloudProfile && cloudProfile.name) {
          setPesantrenProfile(cloudProfile);
        }
      },
      (err) => {
        console.warn('Realtime profile sync notice:', err);
      }
    );

    return () => {
      unsubSantri();
      unsubTrx();
      unsubProfile();
    };
  }, []);

  // Sync to localStorage as offline cache
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SANTRI, JSON.stringify(santriList));
    } catch (e) {
      console.error('Error saving santri data', e);
    }
  }, [santriList]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_TRX, JSON.stringify(transactions));
    } catch (e) {
      console.error('Error saving transactions data', e);
    }
  }, [transactions]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(pesantrenProfile));
    } catch (e) {
      console.error('Error saving profile data', e);
    }
  }, [pesantrenProfile]);

  // Otomatis sinkronkan transaksi agar 100% selaras dengan daftar santri aktif
  // 1. Hilangkan seluruh catatan transaksi yang tidak bersangkut-paut dengan santri aktif
  // 2. Pastikan saldo awal santri tercatat di transaksi sehingga: Saldo Kas = Total Saldo Santri
  useEffect(() => {
    if (santriList.length === 0) {
      if (transactions.length > 0) {
        setTransactions([]);
        try {
          localStorage.setItem(STORAGE_KEY_TRX, JSON.stringify([]));
        } catch (e) {
          console.error(e);
        }
      }
      return;
    }

    const activeIds = new Set(santriList.map((s) => s.id));
    const activeNames = new Set(santriList.map((s) => s.name));

    // 1. Bersihkan transaksi lama/zombie yang merujuk ke santri yang sudah dihapus atau sample data
    const validTrx = transactions.filter((t) => {
      if (!t) return false;
      if (isSampleTransaction(t)) return false;
      if (t.type === 'DEPOSIT_SPP' && !t.santriId) return true;
      return (t.santriId && activeIds.has(t.santriId)) || activeNames.has(t.santriName);
    });

    let modified = validTrx.length !== transactions.length;
    const finalTrxList = [...validTrx];

    // 2. Untuk setiap santri aktif dengan saldo > 0: pastikan ada transaksi setorannya
    santriList.forEach((s, idx) => {
      if (s.balance <= 0) return;

      const myTrx = finalTrxList.filter((t) => t.santriId === s.id || t.santriName === s.name);
      const totalIn = myTrx.filter((t) => isCreditTransaction(t.type)).reduce((acc, t) => acc + t.amount, 0);
      const totalOut = myTrx.filter((t) => isDebitTransaction(t.type)).reduce((acc, t) => acc + t.amount, 0);
      const net = totalIn - totalOut;

      const existingInitialIdx = finalTrxList.findIndex((t) => t.id === `trx-saldoawal-${s.id}`);

      if (existingInitialIdx !== -1) {
        if (net !== s.balance) {
          const currentInit = finalTrxList[existingInitialIdx];
          const adjustedAmount = Math.max(0, currentInit.amount + (s.balance - net));
          finalTrxList[existingInitialIdx] = {
            ...currentInit,
            amount: adjustedAmount,
            balanceAfter: s.balance,
          };
          modified = true;
          saveTransactionToCloud(finalTrxList[existingInitialIdx]).catch((e) => console.warn('Cloud save error:', e));
        }
      } else if (myTrx.length === 0 || net !== s.balance) {
        const diff = s.balance - net;
        const initialTrx: Transaction = {
          id: `trx-saldoawal-${s.id}`,
          transactionNo: `TRX-WDH-${todayStr.replace(/-/g, '')}-${String(idx + 1).padStart(3, '0')}`,
          date: s.createdAt || todayStr,
          time: '08:00:00',
          santriId: s.id,
          santriName: s.name,
          accountNumber: s.accountNumber,
          type: 'DEPOSIT_WADIAH',
          amount: myTrx.length === 0 ? s.balance : Math.max(0, diff),
          balanceBefore: 0,
          balanceAfter: s.balance,
          method: 'CASH',
          tellerName: 'Kasir Loket Bendahara',
          guardianSenderName: s.guardianName || 'Wali Santri',
          notes: 'Setoran Saldo Awal Titipan Wadiah Siswa',
          category: 'Setoran Titipan Wali',
        };
        finalTrxList.unshift(initialTrx);
        modified = true;
        saveTransactionToCloud(initialTrx).catch((e) => console.warn('Cloud save error:', e));
      }
    });

    if (modified) {
      finalTrxList.sort((a, b) => {
        const dComp = b.date.localeCompare(a.date);
        if (dComp !== 0) return dComp;
        return (b.time || '').localeCompare(a.time || '');
      });
      setTransactions(finalTrxList);
      try {
        localStorage.setItem(STORAGE_KEY_TRX, JSON.stringify(finalTrxList));
      } catch (e) {
        console.error(e);
      }
    }
  }, [santriList]);

  // Derived metrics
  const totalWadiah = santriList.reduce((acc, curr) => acc + curr.balance, 0);
  const todayStr = getTodayDateString();
  const santriAlreadyTakenCount = santriList.filter((s) => {
    const el = checkDailyAllowanceEligibility(s, transactions, todayStr);
    return el.status === 'ALREADY_TAKEN';
  }).length;

  // Rumus Finansial Kas Terpadu (Menghubungkan 2 Akun ke 1 Database):
  // 1. Total Setoran = Setoran Titipan + Setoran SPP
  // 2. Total Penarikan = Penarikan Jajan + Kebutuhan Lainnya + Penarikan SPP
  // 3. Saldo Akhir Kas = Total Setoran - Total Penarikan
  const financialTotals = React.useMemo(() => {
    const totalSetoranTitipan = transactions
      .filter((t) => t.type === 'DEPOSIT_WADIAH')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalSetoranSPP = transactions
      .filter((t) => t.type === 'DEPOSIT_SPP')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalSetoran = totalSetoranTitipan + totalSetoranSPP;

    const totalPenarikanJajan = transactions
      .filter((t) => t.type === 'WITHDRAWAL_JAJAN')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalPenarikanKebutuhan = transactions
      .filter((t) => t.type === 'WITHDRAWAL_OTHER')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalPenarikanSPP = transactions
      .filter((t) => t.type === 'WITHDRAWAL_SPP')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalPenarikan = totalPenarikanJajan + totalPenarikanKebutuhan + totalPenarikanSPP;
    const saldoAkhirKas = totalSetoran - totalPenarikan;

    return {
      totalSetoranTitipan,
      totalSetoranSPP,
      totalSetoran,
      totalPenarikanJajan,
      totalPenarikanKebutuhan,
      totalPenarikanSPP,
      totalPenarikan,
      saldoAkhirKas,
    };
  }, [transactions]);

  // Bendahara Credential & Google Login / Logout handlers
  const handleLoginBendahara = (user: AuthUser) => {
    setCurrentUser(user);
    const role: 'PENGURUS' | 'BENDAHARA' =
      user.role || (user.email === 'bendahara@gmail.com' ? 'BENDAHARA' : 'PENGURUS');
    setCurrentUserRole(role);
    setIsCloudConnected(true);
    try {
      localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(user));
      localStorage.setItem('santripay_user_role', role);
    } catch (e) {
      console.error('Failed to save auth to storage', e);
    }

    // If Bendahara role, ensure restricted tabs are redirected to allowed tabs
    if (role === 'BENDAHARA' && (activeTab === 'setor-spp' || activeTab === 'penarikan-spp')) {
      setActiveTab('setor-titipan');
    }

    setViewMode('dashboard');
  };

  const handleSignInGoogle = async () => {
    try {
      await signInWithGoogle();
      setViewMode('dashboard');
    } catch (error) {
      console.error('Gagal login Google:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      await logOut();
    } catch (error) {
      console.error('Gagal keluar:', error);
    }
    localStorage.removeItem(STORAGE_KEY_AUTH);
    localStorage.removeItem('santripay_user_role');
    setCurrentUser(null);
    setCurrentUserRole('PENGURUS');
    setIsCloudConnected(false);
    setViewMode('landing');
  };

  const handleToggleRole = () => {
    const newRole: 'PENGURUS' | 'BENDAHARA' = currentUserRole === 'PENGURUS' ? 'BENDAHARA' : 'PENGURUS';
    setCurrentUserRole(newRole);
    try {
      localStorage.setItem('santripay_user_role', newRole);
      if (currentUser) {
        const updatedUser = {
          ...currentUser,
          role: newRole,
          displayName: newRole === 'PENGURUS' ? 'Pengurus Pesantren (Full Access)' : 'Bendahara Kasir Loket',
        };
        setCurrentUser(updatedUser as any);
        localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(updatedUser));
      }
    } catch (e) {
      console.error('Failed to update role in storage', e);
    }

    if (newRole === 'BENDAHARA' && (activeTab === 'setor-spp' || activeTab === 'penarikan-spp')) {
      setActiveTab('setor-titipan');
    }
  };

  // Execution Helpers (Apply state & save to Firestore after confirmation)
  const executeWithdrawal = (santriId: string, amount: number, notes: string) => {
    const santri = santriList.find((s) => s.id === santriId);
    if (!santri) return;

    const balanceBefore = santri.balance;
    const balanceAfter = balanceBefore - amount;

    const newTrx: Transaction = {
      id: `trx-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      transactionNo: `TRX-JJN-${todayStr.replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`,
      date: todayStr,
      time: getCurrentTimeString(),
      santriId: santri.id,
      santriName: santri.name,
      accountNumber: santri.accountNumber,
      type: 'WITHDRAWAL_JAJAN',
      amount,
      balanceBefore,
      balanceAfter,
      method: 'CASH',
      tellerName: currentUser?.displayName ? `${currentUser.displayName} (Loket)` : 'Ust. M. Ridwan (Teller Loket)',
      notes: notes || 'Uang Jajan Harian (Batas Rp 10.000 / Hari)',
      category: 'Uang Jajan Harian',
    };

    const updatedSantri: Santri = { ...santri, balance: balanceAfter };

    setSantriList((prev) => {
      const next = prev.map((s) => (s.id === santriId ? updatedSantri : s));
      try {
        localStorage.setItem(STORAGE_KEY_SANTRI, JSON.stringify(next));
      } catch (e) {
        console.error('Storage error:', e);
      }
      return next;
    });

    setTransactions((prev) => {
      const next = [newTrx, ...prev];
      try {
        localStorage.setItem(STORAGE_KEY_TRX, JSON.stringify(next));
      } catch (e) {
        console.error('Storage error:', e);
      }
      return next;
    });

    saveTransactionToCloud(newTrx).catch((e) => console.error('Cloud save trx error:', e));
    saveSantriToCloud(updatedSantri).catch((e) => console.error('Cloud balance error:', e));

    setIsTellerModalOpen(false);
    setReceiptTrx(newTrx);
    setReceiptSantri(updatedSantri);
  };

  const executeDeposit = (
    santriId: string,
    amount: number,
    method: PaymentMethod,
    guardianName: string,
    notes: string
  ) => {
    const santri = santriList.find((s) => s.id === santriId);
    if (!santri || amount <= 0) return;

    const balanceBefore = santri.balance;
    const balanceAfter = balanceBefore + amount;

    const newTrx: Transaction = {
      id: `trx-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      transactionNo: `TRX-WDH-${todayStr.replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`,
      date: todayStr,
      time: getCurrentTimeString(),
      santriId: santri.id,
      santriName: santri.name,
      accountNumber: santri.accountNumber,
      type: 'DEPOSIT_WADIAH',
      amount,
      balanceBefore,
      balanceAfter,
      method,
      tellerName: method.includes('BANK') 
        ? 'Sistem Otomatis (Transfer Bank)' 
        : (currentUser?.displayName ? `${currentUser.displayName} (Kasir Loket)` : 'Ust. H. Ahmad Fauzi (Kasir Loket)'),
      guardianSenderName: guardianName || santri.guardianName,
      notes: notes || 'Setoran Titipan Uang Saku Santri',
      category: 'Setoran Titipan Wali',
    };

    const updatedSantri: Santri = { ...santri, balance: balanceAfter };

    setSantriList((prev) => {
      const next = prev.map((s) => (s.id === santriId ? updatedSantri : s));
      try {
        localStorage.setItem(STORAGE_KEY_SANTRI, JSON.stringify(next));
      } catch (e) {
        console.error('Storage error:', e);
      }
      return next;
    });

    setTransactions((prev) => {
      const next = [newTrx, ...prev];
      try {
        localStorage.setItem(STORAGE_KEY_TRX, JSON.stringify(next));
      } catch (e) {
        console.error('Storage error:', e);
      }
      return next;
    });

    saveTransactionToCloud(newTrx).catch((e) => console.error('Cloud save trx error:', e));
    saveSantriToCloud(updatedSantri).catch((e) => console.error('Cloud balance error:', e));

    setReceiptTrx(newTrx);
    setReceiptSantri(updatedSantri);
  };

  const executeSPPDeposit = (
    santriId: string,
    amount: number,
    sppMonth: string,
    method: PaymentMethod,
    payerName: string,
    notes: string
  ) => {
    const santri = santriList.find((s) => s.id === santriId);
    if (!santri || amount <= 0) return;

    const balanceBefore = santri.balance;
    const balanceAfter = balanceBefore + amount;

    const newTrx: Transaction = {
      id: `trx-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      transactionNo: `TRX-SPP-${todayStr.replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`,
      date: todayStr,
      time: getCurrentTimeString(),
      santriId: santri.id,
      santriName: santri.name,
      accountNumber: santri.accountNumber,
      type: 'DEPOSIT_SPP',
      amount,
      balanceBefore,
      balanceAfter,
      method,
      tellerName: method.includes('BANK') 
        ? 'Sistem Otomatis (Transfer Bank)' 
        : (currentUser?.displayName ? `${currentUser.displayName} (Kasir Loket)` : 'Ust. H. Ahmad Fauzi (Kasir Loket)'),
      guardianSenderName: payerName || santri.guardianName,
      notes: notes || `Pembayaran SPP Bulan ${sppMonth}`,
      category: 'Setoran SPP Syahriah',
    };

    const updatedSantri: Santri = { ...santri, balance: balanceAfter };

    setSantriList((prev) => {
      const next = prev.map((s) => (s.id === santriId ? updatedSantri : s));
      try {
        localStorage.setItem(STORAGE_KEY_SANTRI, JSON.stringify(next));
      } catch (e) {
        console.error('Storage error:', e);
      }
      return next;
    });

    setTransactions((prev) => {
      const next = [newTrx, ...prev];
      try {
        localStorage.setItem(STORAGE_KEY_TRX, JSON.stringify(next));
      } catch (e) {
        console.error('Storage error:', e);
      }
      return next;
    });

    saveTransactionToCloud(newTrx).catch((e) => console.error('Cloud save trx error:', e));
    saveSantriToCloud(updatedSantri).catch((e) => console.error('Cloud balance error:', e));

    setReceiptTrx(newTrx);
    setReceiptSantri(updatedSantri);
  };

  const executeSPPWithdrawal = (
    santriId: string,
    amount: number,
    sppMonth: string,
    notes: string
  ) => {
    const santri = santriList.find((s) => s.id === santriId);
    if (!santri || amount <= 0 || santri.balance < amount) return;

    const balanceBefore = santri.balance;
    const balanceAfter = balanceBefore - amount;

    const newTrx: Transaction = {
      id: `trx-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      transactionNo: `TRX-POT-SPP-${todayStr.replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`,
      date: todayStr,
      time: getCurrentTimeString(),
      santriId: santri.id,
      santriName: santri.name,
      accountNumber: santri.accountNumber,
      type: 'WITHDRAWAL_SPP',
      amount,
      balanceBefore,
      balanceAfter,
      method: 'CASH',
      tellerName: currentUser?.displayName ? `${currentUser.displayName} (Bendahara)` : 'Ust. H. Ahmad Fauzi (Bendahara)',
      guardianSenderName: santri.guardianName,
      notes: notes || `Pelunasan SPP ${sppMonth} via Potong Saldo Wadiah`,
      category: 'Penarikan SPP dari Saldo Titipan',
    };

    const updatedSantri: Santri = { ...santri, balance: balanceAfter };

    setSantriList((prev) => {
      const next = prev.map((s) => (s.id === santriId ? updatedSantri : s));
      try {
        localStorage.setItem(STORAGE_KEY_SANTRI, JSON.stringify(next));
      } catch (e) {
        console.error('Storage error:', e);
      }
      return next;
    });

    setTransactions((prev) => {
      const next = [newTrx, ...prev];
      try {
        localStorage.setItem(STORAGE_KEY_TRX, JSON.stringify(next));
      } catch (e) {
        console.error('Storage error:', e);
      }
      return next;
    });

    saveTransactionToCloud(newTrx).catch((e) => console.error('Cloud save trx error:', e));
    saveSantriToCloud(updatedSantri).catch((e) => console.error('Cloud balance error:', e));

    setReceiptTrx(newTrx);
    setReceiptSantri(updatedSantri);
  };

  const executeCustomWithdrawal = (
    santriId: string,
    amount: number,
    category: string,
    notes: string
  ) => {
    const santri = santriList.find((s) => s.id === santriId);
    if (!santri || amount <= 0 || santri.balance < amount) return;

    const balanceBefore = santri.balance;
    const balanceAfter = balanceBefore - amount;

    const newTrx: Transaction = {
      id: `trx-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      transactionNo: `TRX-KBT-${todayStr.replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`,
      date: todayStr,
      time: getCurrentTimeString(),
      santriId: santri.id,
      santriName: santri.name,
      accountNumber: santri.accountNumber,
      type: 'WITHDRAWAL_OTHER',
      amount,
      balanceBefore,
      balanceAfter,
      method: 'CASH',
      tellerName: currentUser?.displayName ? `${currentUser.displayName} (Kasir Loket)` : 'Ust. H. Ahmad Fauzi (Kasir Loket)',
      guardianSenderName: santri.guardianName,
      notes: notes || `Pengambilan Keperluan: ${category}`,
      category: `Penarikan: ${category}`,
    };

    const updatedSantri: Santri = { ...santri, balance: balanceAfter };

    setSantriList((prev) => {
      const next = prev.map((s) => (s.id === santriId ? updatedSantri : s));
      try {
        localStorage.setItem(STORAGE_KEY_SANTRI, JSON.stringify(next));
      } catch (e) {
        console.error('Storage error:', e);
      }
      return next;
    });

    setTransactions((prev) => {
      const next = [newTrx, ...prev];
      try {
        localStorage.setItem(STORAGE_KEY_TRX, JSON.stringify(next));
      } catch (e) {
        console.error('Storage error:', e);
      }
      return next;
    });

    saveTransactionToCloud(newTrx).catch((e) => console.error('Cloud save trx error:', e));
    saveSantriToCloud(updatedSantri).catch((e) => console.error('Cloud balance error:', e));

    setReceiptTrx(newTrx);
    setReceiptSantri(updatedSantri);
  };

  // Process Withdrawal (Jajan 10.000 max, 1x a day) with Confirmation Popup
  const handleProcessWithdrawal = (santriId: string, amount: number, notes: string) => {
    const santri = santriList.find((s) => s.id === santriId);
    if (!santri) return;

    // Strict validation
    const eligibility = checkDailyAllowanceEligibility(santri, transactions, todayStr);
    if (!eligibility.canWithdraw) {
      console.warn(`Pencairan Ditolak: ${eligibility.reason}`);
      return;
    }

    const withdrawAmount = Math.min(amount, eligibility.maxAllowed, santri.dailyAllowanceLimit || 10000);
    const balanceBefore = santri.balance;
    const balanceAfter = balanceBefore - withdrawAmount;

    setPendingConfirmation({
      title: 'Konfirmasi Penarikan Jajan Harian',
      transactionType: 'WITHDRAWAL_JAJAN',
      typeName: 'Pencairan Jajan Harian',
      santri,
      amount: withdrawAmount,
      balanceBefore,
      balanceAfter,
      method: 'Tunai Kasir',
      notes: notes || 'Uang Jajan Harian (Maks. Rp 10.000 / Hari)',
      onConfirm: () => {
        executeWithdrawal(santriId, withdrawAmount, notes);
        setPendingConfirmation(null);
      },
    });
  };

  // Quick dispense from cards (1 click) with Confirmation Popup
  const handleQuickDispense = (santriId: string) => {
    handleProcessWithdrawal(santriId, 10000, 'Pencairan Jajan Harian');
  };

  // Process Deposit (Top Up Titipan Orang Tua) with Confirmation Popup
  const handleProcessDeposit = (
    santriId: string,
    amount: number,
    method: PaymentMethod,
    guardianName: string,
    notes: string
  ) => {
    const santri = santriList.find((s) => s.id === santriId);
    if (!santri || amount <= 0) return;

    const balanceBefore = santri.balance;
    const balanceAfter = balanceBefore + amount;

    setPendingConfirmation({
      title: 'Konfirmasi Setoran Titipan Wadiah',
      transactionType: 'DEPOSIT_WADIAH',
      typeName: 'Setoran Titipan Wadiah',
      santri,
      amount,
      balanceBefore,
      balanceAfter,
      method: formatPaymentMethodLabel(method),
      notes: notes || 'Titipan uang saku santri',
      onConfirm: () => {
        executeDeposit(santriId, amount, method, guardianName, notes);
        setPendingConfirmation(null);
      },
    });
  };

  // Process SPP Deposit (Setoran SPP Syahriah) with Confirmation Popup
  const handleProcessSPPDeposit = (
    santriId: string,
    amount: number,
    sppMonth: string,
    method: PaymentMethod,
    payerName: string,
    notes: string
  ) => {
    const santri = santriList.find((s) => s.id === santriId);
    if (!santri || amount <= 0) return;

    const balanceBefore = santri.balance;
    const balanceAfter = balanceBefore + amount;

    setPendingConfirmation({
      title: 'Konfirmasi Setoran SPP Syahriah',
      transactionType: 'DEPOSIT_SPP',
      typeName: `Setoran SPP (${sppMonth})`,
      santri,
      amount,
      balanceBefore,
      balanceAfter,
      method: formatPaymentMethodLabel(method),
      notes: notes || `Pembayaran SPP Bulan ${sppMonth}`,
      onConfirm: () => {
        executeSPPDeposit(santriId, amount, sppMonth, method, payerName, notes);
        setPendingConfirmation(null);
      },
    });
  };

  // Process SPP Withdrawal from Wadiah Balance with Confirmation Popup
  const handleProcessSPPWithdrawal = (
    santriId: string,
    amount: number,
    sppMonth: string,
    notes: string
  ) => {
    const santri = santriList.find((s) => s.id === santriId);
    if (!santri || amount <= 0 || santri.balance < amount) return;

    const balanceBefore = santri.balance;
    const balanceAfter = balanceBefore - amount;

    setPendingConfirmation({
      title: 'Konfirmasi Potong Saldo Wadiah untuk SPP',
      transactionType: 'WITHDRAWAL_SPP',
      typeName: `Potong Saldo SPP (${sppMonth})`,
      santri,
      amount,
      balanceBefore,
      balanceAfter,
      method: 'Auto-Debet Saldo Wadiah',
      notes: notes || `Pelunasan SPP ${sppMonth} via Potong Saldo Wadiah`,
      onConfirm: () => {
        executeSPPWithdrawal(santriId, amount, sppMonth, notes);
        setPendingConfirmation(null);
      },
    });
  };

  // Process Custom Withdrawal with Confirmation Popup
  const handleProcessCustomWithdrawal = (
    santriId: string,
    amount: number,
    category: string,
    notes: string
  ) => {
    const santri = santriList.find((s) => s.id === santriId);
    if (!santri || amount <= 0 || santri.balance < amount) return;

    const balanceBefore = santri.balance;
    const balanceAfter = balanceBefore - amount;

    setPendingConfirmation({
      title: 'Konfirmasi Penarikan Kebutuhan Santri',
      transactionType: 'WITHDRAWAL_OTHER',
      typeName: `Penarikan Kebutuhan (${category})`,
      santri,
      amount,
      balanceBefore,
      balanceAfter,
      method: 'Tunai Kasir',
      category,
      notes: notes || `Pengambilan Keperluan: ${category}`,
      onConfirm: () => {
        executeCustomWithdrawal(santriId, amount, category, notes);
        setPendingConfirmation(null);
      },
    });
  };

  // Add Santri Handler
  const handleAddSantri = (
    newSantriData: Omit<Santri, 'id' | 'accountNumber' | 'createdAt'>,
    initialDeposit: number
  ) => {
    const nextIndex = santriList.length + 1;
    const id = `snt-${String(nextIndex).padStart(3, '0')}`;
    const accountNumber = `501.2026.${String(nextIndex).padStart(3, '0')}`;

    const newSantri: Santri = {
      ...newSantriData,
      id,
      accountNumber,
      balance: initialDeposit > 0 ? initialDeposit : 0,
      createdAt: todayStr,
    };

    setSantriList((prev) => [...prev, newSantri]);

    // Save to Cloud Firestore
    saveSantriToCloud(newSantri).catch((e) => console.error('Cloud add santri error:', e));

    if (initialDeposit > 0) {
      const depositTrx: Transaction = {
        id: `trx-${Date.now()}`,
        transactionNo: `TRX-WDH-${todayStr.replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`,
        date: todayStr,
        time: getCurrentTimeString(),
        santriId: newSantri.id,
        santriName: newSantri.name,
        accountNumber: newSantri.accountNumber,
        type: 'DEPOSIT_WADIAH',
        amount: initialDeposit,
        balanceBefore: 0,
        balanceAfter: initialDeposit,
        method: 'CASH',
        tellerName: currentUser?.displayName ? `${currentUser.displayName} (Kasir Loket)` : 'Ust. H. Ahmad Fauzi (Kasir Loket)',
        guardianSenderName: newSantri.guardianName,
        notes: 'Setoran Awal Buka Rekening Wadiah Santri',
        category: 'Setoran Titipan Wali',
      };
      setTransactions((prev) => [depositTrx, ...prev]);
      saveTransactionToCloud(depositTrx).catch((e) => console.error('Cloud deposit trx error:', e));
    }
  };

  // Batch Import Santri Handler from Excel (supports 100% REPLACE or APPEND)
  const handleImportSantriList = (items: ImportedSantriItem[], mode: ImportMode = 'REPLACE') => {
    const newSantriList: Santri[] = [];
    const newTrxList: Transaction[] = [];
    let currentIndex = mode === 'REPLACE' ? 0 : santriList.length;

    items.forEach((item, index) => {
      currentIndex++;
      const id = `santri-${Date.now()}-${String(currentIndex).padStart(3, '0')}`;
      const accountNumber = `501.2026.${String(currentIndex).padStart(3, '0')}`;
      const initialDeposit = item.initialDeposit > 0 ? item.initialDeposit : 0;

      const newSantri: Santri = {
        id,
        accountNumber,
        nisn: item.nisn,
        name: item.name,
        gender: item.gender,
        guardianName: item.guardianName,
        guardianPhone: item.guardianPhone,
        guardianAddress: item.guardianAddress,
        balance: initialDeposit,
        dailyAllowanceLimit: item.dailyAllowanceLimit || 10000,
        status: 'AKTIF',
        avatarSeed: item.name.split(' ')[0],
        createdAt: todayStr,
      };

      newSantriList.push(newSantri);

      if (initialDeposit > 0) {
        const depositTrx: Transaction = {
          id: `trx-${Date.now()}-${index}`,
          transactionNo: `TRX-WDH-${todayStr.replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`,
          date: todayStr,
          time: getCurrentTimeString(),
          santriId: newSantri.id,
          santriName: newSantri.name,
          accountNumber: newSantri.accountNumber,
          type: 'DEPOSIT_WADIAH',
          amount: initialDeposit,
          balanceBefore: 0,
          balanceAfter: initialDeposit,
          method: 'CASH',
          tellerName: currentUser?.displayName ? `${currentUser.displayName} (Kasir Loket)` : 'Ust. H. Ahmad Fauzi (Kasir Loket)',
          guardianSenderName: newSantri.guardianName,
          notes: 'Setoran Awal Buka Rekening Wadiah (Impor Excel)',
          category: 'Setoran Titipan Wali',
        };
        newTrxList.push(depositTrx);
      }
    });

    if (mode === 'REPLACE') {
      // 100% GANTI TOTAL: Hapus seluruh data sample/lama, ganti total dengan hasil impor
      setSantriList(newSantriList);
      if (newSantriList.length > 0) {
        setSelectedSantriId(newSantriList[0].id);
      }
      setTransactions(newTrxList);
      
      // Update cache lokal langsung secara sinkron
      try {
        localStorage.setItem(STORAGE_KEY_SANTRI, JSON.stringify(newSantriList));
        localStorage.setItem(STORAGE_KEY_TRX, JSON.stringify(newTrxList));
      } catch (e) {
        console.error('Error writing clean import to localStorage:', e);
      }

      // Sinkronkan pergantian total ke Cloud Firestore (hapus dokumen transaksi lama & santri lama)
      replaceAllSantriInCloud(newSantriList, newTrxList).catch((e) =>
        console.error('Cloud replace santri error:', e)
      );
    } else {
      // APPEND: Tambahkan ke data yang sudah ada
      setSantriList((prev) => [...prev, ...newSantriList]);
      if (newTrxList.length > 0) {
        setTransactions((prev) => [...newTrxList, ...prev]);
        newTrxList.forEach((t) => saveTransactionToCloud(t).catch((e) => console.error(e)));
      }
      newSantriList.forEach((s) => saveSantriToCloud(s).catch((e) => console.error(e)));
    }
  };

  // Update santri data handler (edit)
  const handleUpdateSantri = (updatedSantri: Santri) => {
    setSantriList((prev) => prev.map((s) => (s.id === updatedSantri.id ? updatedSantri : s)));
    saveSantriToCloud(updatedSantri).catch((e) => console.error('Cloud update santri error:', e));
  };

  // Delete santri handler
  const handleDeleteSantri = (santriId: string) => {
    setSantriList((prev) => prev.filter((s) => s.id !== santriId));
    deleteSantriFromCloud(santriId).catch((e) => console.error('Cloud delete santri error:', e));
  };

  // Toggle freeze / unfreeze account handler
  const handleToggleFreezeSantri = (santriId: string, freeze: boolean) => {
    setSantriList((prev) => {
      const nextList = prev.map((s) => {
        if (s.id === santriId) {
          const nextStatus = freeze ? ('DIBEKUKAN' as const) : ('AKTIF' as const);
          const updatedSantri: Santri = { ...s, status: nextStatus };
          saveSantriToCloud(updatedSantri).catch((e) => console.error('Cloud freeze toggle error:', e));
          return updatedSantri;
        }
        return s;
      });
      return nextList;
    });
  };

  // Update profile handler (with persistent local storage and cloud sync)
  const handleUpdateProfile = async (newProfile: PesantrenProfile) => {
    setPesantrenProfile(newProfile);
    try {
      localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(newProfile));
    } catch (e) {
      console.error('Storage profile error:', e);
    }
    try {
      await saveProfileToCloud(newProfile);
    } catch (e) {
      console.error('Cloud profile error:', e);
    }
  };

  // Reset to clean initial (triggers modal instead of window.confirm)
  const handleResetData = () => {
    setIsResetConfirmOpen(true);
  };

  const handleExecuteReset = () => {
    localStorage.removeItem(STORAGE_KEY_SANTRI);
    localStorage.removeItem(STORAGE_KEY_TRX);
    localStorage.removeItem(STORAGE_KEY_PROFILE);
    setSantriList([]);
    setTransactions([]);
    setPesantrenProfile(defaultPesantrenProfile);

    // Bersihkan seluruh koleksi di Cloud Firestore agar 100% bersih
    replaceAllSantriInCloud([], []).catch((e) => console.error('Cloud seed reset error:', e));

    setIsResetConfirmOpen(false);
  };

  // Render Landing Page (Portal Orang Tua Read-Only + Login Bendahara)
  // Strict Privacy: Hanya bendahara yang telah login melalui username & password yang dapat membuka dashboard
  if (viewMode === 'landing' || !currentUser) {
    return (
      <LandingPage
        santriList={santriList}
        transactions={transactions}
        pesantrenProfile={pesantrenProfile}
        currentUser={currentUser}
        isCloudConnected={isCloudConnected}
        onSignOut={handleSignOut}
        onEnterDashboard={() => {
          if (currentUser) {
            setViewMode('dashboard');
          }
        }}
        onLoginBendahara={handleLoginBendahara}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-800 flex font-sans">
      {/* Sidebar: Loket Bendahara with sub-menus & Laporan Keuangan with sub-menus */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pesantrenProfile={pesantrenProfile}
        totalWadiah={totalWadiah}
        santriAlreadyTakenCount={santriAlreadyTakenCount}
        totalActiveSantri={santriList.length}
        userRole={currentUserRole}
        onResetData={handleResetData}
        isOpenMobile={isOpenMobile}
        onCloseMobile={() => setIsOpenMobile(false)}
      />

      {/* Main Content Area (Offset by Sidebar width on desktop md:pl-72) */}
      <div className={`flex-1 md:pl-72 flex flex-col min-w-0 min-h-screen ${receiptTrx ? 'print:hidden' : ''}`}>
        {/* Top Header Navigation Bar with Cloud Realtime status & Google Auth */}
        <TopHeader
          activeTab={activeTab}
          onOpenMobileMenu={() => setIsOpenMobile(true)}
          pesantrenProfile={pesantrenProfile}
          totalWadiah={totalWadiah}
          totalActiveSantri={santriList.length}
          currentUser={currentUser}
          userRole={currentUserRole}
          isCloudConnected={isCloudConnected}
          onSignOut={handleSignOut}
          onGoToLanding={() => setViewMode('landing')}
        />

        {/* View Content */}
        <main className={`flex-1 p-4 sm:p-6 lg:p-8 ${receiptTrx ? 'print:hidden' : ''}`}>
          <ErrorBoundary fallbackTitle="Kendala Memuat Tampilan Akuntansi">
            {/* MENU: DASHBOARD */}
            {activeTab === 'dashboard' && (
              <DashboardTotalView
                santriList={santriList}
                transactions={transactions}
                pesantrenProfile={pesantrenProfile}
                totalWadiah={totalWadiah}
                currentUser={currentUser}
                userRole={currentUserRole}
                isCloudConnected={isCloudConnected}
                onNavigateTab={(tabId) => setActiveTab(tabId)}
                onOpenDeposit={() => setActiveTab('setor-titipan')}
                onOpenTellerForSantri={(id) => {
                  setSelectedSantriId(id);
                  setIsTellerModalOpen(true);
                }}
              />
            )}

            {/* MENU BENDAHARA • PENARIKAN - Sub-menu: Jajan + Kebutuhan Lainnya */}
            {(activeTab === 'penarikan-jajan' || activeTab === 'loket-jajan') && (
              <DashboardTellerView
                santriList={santriList}
                transactions={transactions}
                pesantrenProfile={pesantrenProfile}
                totalWadiah={totalWadiah}
                onOpenTellerForSantri={(id) => {
                  setSelectedSantriId(id);
                  setIsTellerModalOpen(true);
                }}
                onOpenDeposit={() => setActiveTab('setor-titipan')}
                onQuickDispense={handleQuickDispense}
                onViewStatement={(id) => {
                  setSelectedSantriId(id);
                  setActiveTab('rekening-koran');
                }}
                onProcessCustomWithdrawal={handleProcessCustomWithdrawal}
                onViewReceipt={(trx, santri) => {
                  setReceiptTrx(trx);
                  setReceiptSantri(santri);
                }}
              />
            )}

            {/* MENU BENDAHARA • SETORAN - Sub-menu: SPP (Hanya untuk Pengurus) */}
            {activeTab === 'setor-spp' && (
              currentUserRole === 'BENDAHARA' ? (
                <div className="bg-white rounded-2xl p-8 border border-amber-200 shadow-sm text-center max-w-lg mx-auto my-8 space-y-4">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
                    <ShieldAlert className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Akses Menu Setoran SPP Dibatasi
                    </h3>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      Akun <strong>Bendahara</strong> dikhususkan untuk loket kasir harian (Setoran Titipan dan Penarikan Jajan + Kebutuhan). Akses pengelolaan SPP dipegang penuh oleh akun <strong>Pengurus</strong>.
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('setor-titipan')}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md"
                  >
                    Buka Menu Setoran Titipan
                  </button>
                </div>
              ) : (
                <SetorSPPView
                  santriList={santriList}
                  transactions={transactions}
                  pesantrenProfile={pesantrenProfile}
                  onProcessSPPDeposit={handleProcessSPPDeposit}
                  onViewReceipt={(trx, santri) => {
                    setReceiptTrx(trx);
                    setReceiptSantri(santri);
                  }}
                />
              )
            )}

            {/* MENU BENDAHARA • SETORAN - Sub-menu: Titipan */}
            {activeTab === 'setor-titipan' && (
              <SetorTitipanView
                santriList={santriList}
                transactions={transactions}
                pesantrenProfile={pesantrenProfile}
                onProcessDeposit={handleProcessDeposit}
                onViewReceipt={(trx, santri) => {
                  setReceiptTrx(trx);
                  setReceiptSantri(santri);
                }}
              />
            )}

            {/* MENU BENDAHARA • PENARIKAN - Sub-menu: SPP (Hanya untuk Pengurus) */}
            {activeTab === 'penarikan-spp' && (
              currentUserRole === 'BENDAHARA' ? (
                <div className="bg-white rounded-2xl p-8 border border-amber-200 shadow-sm text-center max-w-lg mx-auto my-8 space-y-4">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
                    <ShieldAlert className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Akses Menu Penarikan SPP Dibatasi
                    </h3>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      Akun <strong>Bendahara</strong> dikhususkan untuk loket kasir harian (Setoran Titipan dan Penarikan Jajan + Kebutuhan). Akses penarikan / pemotongan SPP dipegang penuh oleh akun <strong>Pengurus</strong>.
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('penarikan-jajan')}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md"
                  >
                    Buka Penarikan Jajan + Kebutuhan
                  </button>
                </div>
              ) : (
                <PenarikanSPPView
                  santriList={santriList}
                  transactions={transactions}
                  pesantrenProfile={pesantrenProfile}
                  onProcessSPPWithdrawal={handleProcessSPPWithdrawal}
                  onViewReceipt={(trx, santri) => {
                    setReceiptTrx(trx);
                    setReceiptSantri(santri);
                  }}
                />
              )
            )}

            {/* MENU UTAMA: Data Santri & Rekening */}
            {activeTab === 'santri' && (
              <SantriManagementView
                santriList={santriList}
                transactions={transactions}
                pesantrenProfile={pesantrenProfile}
                onAddSantri={handleAddSantri}
                onImportSantriList={handleImportSantriList}
                onUpdateSantri={handleUpdateSantri}
                onDeleteSantri={handleDeleteSantri}
                onToggleFreezeSantri={handleToggleFreezeSantri}
                onOpenTellerForSantri={(id) => {
                  setSelectedSantriId(id);
                  setIsTellerModalOpen(true);
                }}
                onOpenDepositForSantri={(id) => {
                  setSelectedSantriId(id);
                  setActiveTab('setor-titipan');
                }}
                onViewStatementForSantri={(id) => {
                  setSelectedSantriId(id);
                  setActiveTab('rekening-koran');
                }}
              />
            )}

            {/* BUKU KAS - Sub-menu 1: Buku Kas Umum (BKU) */}
            {activeTab === 'bku' && (
              <BukuKasUmumView
                transactions={transactions}
                santriList={santriList}
                pesantrenProfile={pesantrenProfile}
              />
            )}

            {/* BUKU KAS - Sub-menu 2: Buku Kas Besar */}
            {activeTab === 'buku-kas-besar' && (
              <BukuKasBesarView
                transactions={transactions}
                santriList={santriList}
                pesantrenProfile={pesantrenProfile}
              />
            )}

            {/* LAPORAN KEUANGAN - Sub-menu 1: Neraca (Skontro & Staffel/Druffel) */}
            {activeTab === 'neraca' && (
              <NeracaView
                santriList={santriList}
                transactions={transactions}
                pesantrenProfile={pesantrenProfile}
              />
            )}

            {/* LAPORAN KEUANGAN - Sub-menu 2: Rekening Koran */}
            {activeTab === 'rekening-koran' && (
              <RekeningKoranView
                santriList={santriList}
                transactions={transactions}
                pesantrenProfile={pesantrenProfile}
              />
            )}

            {/* LAPORAN KEUANGAN - Sub-menu 3: Rekap Rentang Tanggal */}
            {activeTab === 'rekap-tanggal' && (
              <LaporanRekapView
                transactions={transactions}
                santriList={santriList}
                pesantrenProfile={pesantrenProfile}
              />
            )}

            {/* LAPORAN KEUANGAN - Sub-menu 4: Jurnal Umum Syariah */}
            {activeTab === 'jurnal' && (
              <JurnalUmumView
                transactions={transactions}
                pesantrenProfile={pesantrenProfile}
              />
            )}

            {/* PENGATURAN - Profil Pesantren & Logo */}
            {activeTab === 'profil' && (
              <ProfilPesantrenView
                pesantrenProfile={pesantrenProfile}
                onUpdateProfile={handleUpdateProfile}
              />
            )}
          </ErrorBoundary>
        </main>

        {/* Footer */}
        <footer className="bg-slate-900 text-slate-400 text-xs py-5 px-6 border-t border-slate-800 no-print mt-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <p>
                <strong>{pesantrenProfile.formalName}</strong> • Rekening Wadiah Titipan Santri
              </p>
            </div>

            <div className="flex items-center space-x-4">
              <span className="text-slate-500 hidden sm:inline">
                Kaidah Disiplin: Maksimal Jajan Rp 10.000 / Hari (1x Penarikan)
              </span>
              <button
                onClick={handleResetData}
                className="flex items-center space-x-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[11px] transition-colors cursor-pointer border border-slate-700"
              >
                <RotateCcw className="w-3 h-3 text-amber-400" />
                <span>Reset Data</span>
              </button>
            </div>
          </div>
        </footer>
      </div>

      {/* Modals for Quick Actions if invoked from santri row */}
      <QuickTellerModal
        isOpen={isTellerModalOpen}
        onClose={() => setIsTellerModalOpen(false)}
        santriList={santriList}
        transactions={transactions}
        pesantrenProfile={pesantrenProfile}
        onProcessWithdrawal={handleProcessWithdrawal}
      />

      {/* Peringatan Konfirmasi Transaksi Popup */}
      <TransactionConfirmationModal
        data={pendingConfirmation}
        onCancel={() => setPendingConfirmation(null)}
      />

      {receiptTrx && receiptSantri && (
        <ReceiptModal
          transaction={receiptTrx}
          santri={receiptSantri}
          pesantrenProfile={pesantrenProfile}
          onClose={() => {
            setReceiptTrx(null);
            setReceiptSantri(null);
          }}
        />
      )}

      {/* Reset Confirmation Dialog (No window.confirm) */}
      {isResetConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mb-4">
              <RotateCcw className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Kosongkan & Bersihkan Seluruh Data?
            </h3>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Tindakan ini akan mengosongkan seluruh data transaksi dan saldo santri (Rp 0), sehingga siap untuk diisi dengan data murni hasil impor Excel Anda.
            </p>
            <div className="mt-6 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => setIsResetConfirmOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteReset}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 transition-colors cursor-pointer shadow-md"
              >
                Ya, Reset Data Sekarang
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
