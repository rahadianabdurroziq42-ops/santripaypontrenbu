import { Santri, Transaction, PesantrenProfile, AccountCOA } from '../types/finance';

export const defaultPesantrenProfile: PesantrenProfile = {
  name: "Darul Ma'arif Syariah",
  formalName: "Pondok Pesantren & Lembaga Muamalah Syariah Darul Ma'arif",
  subtitle: "Sistem Administrasi Kas Titipan Santri (Akad Wadiah Yad Dhamanah)",
  tagline: "Amanah, Transparan, Disiplin & Sesuai Syariat Islam",
  address: "Jl. Pesantren Luhur No. 99, Cibeber",
  district: "Kabupaten Jombang, Jawa Timur 61419",
  phone: "(0321) 865-9921 / WhatsApp: 0812-3456-7890",
  email: "keuangan@darulmaarif-syariah.ponpes.id",
  bankAccountBSI: "Transfer Via Bank (Rek. 712-8899-001 a.n. Titipan Santri)",
  headOfTreasury: "Ust. H. Ahmad Fauzi, S.E.I., M.E.Sy.",
  treasuryNIP: "NIP. 19840612.201001.1.003",
  mudir: "K.H. Muhammad Syukron Ma'mun, Lc., M.A.",
  defaultDailyLimit: 10000, // Rp 10.000
  motto: "Yarfa'ullahu Diini Amanu Mingkum Waddini Utulngilmu darojat",
};

export const defaultCOA: AccountCOA[] = [
  {
    code: '1-1000',
    name: 'Kas Tunai Bendahara Pesantren',
    category: 'ASET_LANCAR',
    normalBalance: 'DEBIT',
    description: 'Uang fisik tunai di brankas bendahara untuk pencairan jajan harian santri',
  },
  {
    code: '1-1010',
    name: 'Kas Rekening Bank (Transfer Via Bank Titipan Wadiah)',
    category: 'ASET_LANCAR',
    normalBalance: 'DEBIT',
    description: 'Rekening bank penampung titipan transfer dari wali santri',
  },
  {
    code: '1-1020',
    name: 'Kas Kecil Teller Loket Santri',
    category: 'ASET_LANCAR',
    normalBalance: 'DEBIT',
    description: 'Floating cash kasir loket jajan santri',
  },
  {
    code: '2-1000',
    name: 'Simpanan Wadiah Titipan Santri',
    category: 'KEWAJIBAN_LANCAR',
    normalBalance: 'KREDIT',
    description: 'Kewajiban titipan uang jajan dari orang tua santri yang belum dicairkan',
  },
  {
    code: '2-1010',
    name: 'Titipan Dana Darurat Santri',
    category: 'KEWAJIBAN_LANCAR',
    normalBalance: 'KREDIT',
    description: 'Titipan khusus kesehatan & kebutuhan mendesak santri',
  },
  {
    code: '3-1000',
    name: 'Ekuitas Awal Kas Pesantren',
    category: 'EKUITAS',
    normalBalance: 'KREDIT',
    description: 'Modal dana talangan dan operasional awal bendahara pesantren',
  },
  {
    code: '3-1010',
    name: 'Dana Infaq & Kebajikan Pengelolaan',
    category: 'EKUITAS',
    normalBalance: 'KREDIT',
    description: 'Akumulasi infaq sukarela dari wali santri saat setor titipan',
  },
  {
    code: '4-1000',
    name: 'Pendapatan Jasa Administrasi Titipan',
    category: 'PENDAPATAN',
    normalBalance: 'KREDIT',
    description: 'Pendapatan infaq sukarela pemeliharaan kartu santri',
  },
  {
    code: '5-1000',
    name: 'Beban Cetak Buku & Kartu Santri',
    category: 'BEBAN',
    normalBalance: 'DEBIT',
    description: 'Biaya operasional loket dan struk thermal',
  },
];

// Data awal bersih (kosong) tanpa santri sample
export const initialSantriList: Santri[] = [];

// Transaksi awal bersih (kosong) tanpa transaksi sample
export const initialTransactions: Transaction[] = [];
