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
  dormitory?: string;    // Opsional / dihilangkan
  className?: string;    // Opsional / dihilangkan
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
    // 1. Akun Kelolaan Bendahara (Titipan Wadiah Uang Saku)
    kasTunaiTitipan: number;        // 1-1000 Kas Fisik Tunai Titipan (Bendahara)
    kasBankTitipan: number;         // 1-1010 Kas Rekening Bank Titipan (Bendahara)
    totalAktivaBendahara: number;   // Subtotal Aktiva Bendahara
    // 2. Akun Kelolaan Pengurus (Dana SPP Pesantren)
    kasTunaiSPP: number;            // 1-1100 Kas Fisik Tunai SPP (Pengurus)
    kasBankSPP: number;             // 1-1110 Kas Rekening Bank SPP (Pengurus)
    totalAktivaPengurus: number;    // Subtotal Aktiva Pengurus
    // Total Terpadu
    totalAktiva: number;
  };
  pasiva: {
    // 1. Tanggung Jawab Bendahara (Kewajiban Titipan Wadiah)
    kewajibanTitipanWadiah: number; // 2-1000 Simpanan Wadiah Santri
    totalPasivaBendahara: number;   // Subtotal Pasiva Bendahara
    // 2. Tanggung Jawab Pengurus (Dana SPP Syahriah)
    danaPenerimaanSPP: number;      // 2-2000 Dana Penerimaan & Pengelolaan SPP
    totalPasivaPengurus: number;    // Subtotal Pasiva Pengurus
    // Total Terpadu
    totalPasiva: number;
  };
  isBalanced: boolean;
  discrepancy: number;
  totalSantriWithBalance: number;
  // Metrik Kelolaan Bendahara
  totalPenarikanJajan: number;      // Total penarikan jajan & kebutuhan santri
  countPenarikanJajan: number;      // Jumlah transaksi penarikan santri
  totalSetoranTitipan: number;      // Total setoran uang saku titipan
  countSetoranTitipan: number;      // Jumlah transaksi setoran titipan
  // Metrik Kelolaan Pengurus
  totalSetoranSPP: number;          // Total setoran pembayaran SPP
  countSetoranSPP: number;          // Jumlah transaksi setoran SPP
  totalPenarikanSPP: number;        // Total penyaluran/pengeluaran dana SPP
  countPenarikanSPP: number;        // Jumlah transaksi penyaluran SPP
}

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
  role?: 'PENGURUS' | 'BENDAHARA';
}
