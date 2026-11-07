export type TransactionType =
  | 'DEPOSIT_WADIAH'       // Setoran titipan dari orang tua santri
  | 'DEPOSIT_SPP'          // Setoran pembayaran SPP / Syahriah bulanan
  | 'WITHDRAWAL_JAJAN'     // Penarikan uang jajan harian santri (maks 10rb / 1x sehari)
  | 'WITHDRAWAL_OTHER'     // Penarikan kebutuhan santri lainnya (kitab, obat, seragam, dll)
  | 'WITHDRAWAL_SPP'       // Penarikan / pemotongan saldo titipan untuk pembayaran SPP
  | 'SPECIAL_DISBURSEMENT' // Pengeluaran khusus (berobat, kitab, laundry darurat atas izin wali)
  | 'ADMIN_INCOME'         // Infaq / jasa admin sukarela pesantren
  | 'OPERATIONAL_EXPENSE'; // Pengeluaran kasir/ATK

export type PaymentMethod = 'CASH' | 'BANK_TRANSFER_BSI' | 'BANK_TRANSFER_MANDIRI' | 'QRIS_PESANTREN';

export interface Santri {
  id: string;
  nisn: string;
  accountNumber: string; // Nomor Rekening Wadiah Santri (e.g. 501.2026.001)
  name: string;
  gender: 'L' | 'P';
  dormitory: string;     // e.g., 'Asrama Abu Bakar - Kamar 04'
  className: string;     // e.g., 'Kelas 2 Aliyah / Wustha'
  guardianName: string;  // Nama Ayah / Ibu / Wali
  guardianPhone: string;
  guardianAddress: string;
  balance: number;       // Saldo titipan berjalan (Rupiah)
  dailyAllowanceLimit: number; // Default Rp 10.000
  status: 'AKTIF' | 'DIBEKUKAN' | 'CUTI' | 'ALUMNI' | 'NONAKTIF';
  avatarSeed: string;
  createdAt: string;
}

export interface Transaction {
  id: string;
  transactionNo: string;   // e.g. TRX-WDH-20261019-0012
  date: string;            // YYYY-MM-DD
  time: string;            // HH:mm:ss
  santriId: string;
  santriName: string;
  accountNumber: string;
  type: TransactionType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  method: PaymentMethod;
  tellerName: string;
  notes: string;
  guardianSenderName?: string;
  category: string;
}

export interface JournalLine {
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
}

export interface JournalEntry {
  id: string;
  entryNo: string;
  date: string;
  referenceNo: string;
  description: string;
  lines: JournalLine[];
}

export interface AccountCOA {
  code: string;
  name: string;
  category: 'ASET_LANCAR' | 'KEWAJIBAN_LANCAR' | 'EKUITAS' | 'PENDAPATAN' | 'BEBAN';
  normalBalance: 'DEBIT' | 'KREDIT';
  description: string;
}

export interface PesantrenProfile {
  name: string;
  formalName: string;
  subtitle: string;
  tagline: string;
  address: string;
  district: string;
  phone: string;
  email: string;
  bankAccountBSI: string;
  headOfTreasury: string; // Bendahara Pesantren
  treasuryNIP: string;
  mudir: string;          // Pengasuh / Pimpinan Pondok
  defaultDailyLimit: number; // 10000
  logoUrl?: string;       // Custom uploaded logo data URL
  motto?: string;         // Motto pesantren
}

export interface NeracaData {
  asOfDate: string;
  aktiva: {
    kasTunaiTitipan: number;      // Kas fisik titipan di brankas bendahara
    kasBankTitipan: number;       // Kas titipan di rekening bank (Transfer Via Bank)
    totalAktiva: number;          // Total kas titipan yang dikelola bendahara
  };
  pasiva: {
    kewajibanTitipanWadiah: number; // Total saldo titipan uang saku milik seluruh santri
    totalPasiva: number;            // Total kewajiban titipan bendahara kepada santri & wali
  };
  isBalanced: boolean;
  discrepancy: number;
  totalSantriWithBalance: number;
  totalPenarikanJajan: number;      // Total akumulasi penarikan uang jajan santri
  countPenarikanJajan: number;      // Jumlah transaksi penarikan jajan santri
  totalSetoranTitipan: number;      // Total akumulasi titipan uang saku masuk dari wali
  countSetoranTitipan: number;      // Jumlah transaksi setoran titipan
}

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
  role?: 'PENGURUS' | 'BENDAHARA';
}
