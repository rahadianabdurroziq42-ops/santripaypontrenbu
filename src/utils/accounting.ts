import { Santri, Transaction, NeracaData, JournalEntry } from '../types/finance';

/**
 * Format number to Indonesian Rupiah representation
 */
export function formatRupiah(value: number): string {
  if (isNaN(value)) return 'Rp 0';
  return 'Rp ' + Math.round(value).toLocaleString('id-ID');
}

/**
 * Format YYYY-MM-DD to Indonesian Date format
 */
export function formatDateIndo(dateStr: string): string {
  if (!dateStr) return '-';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const monthIndex = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const months = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
      ];
      return `${day} ${months[monthIndex]} ${year}`;
    }
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

/**
 * Get current date string formatted as YYYY-MM-DD
 */
export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getCurrentTimeString(): string {
  const now = new Date();
  return now.toTimeString().split(' ')[0];
}

export interface EligibilityResult {
  canWithdraw: boolean;
  status: 'ELIGIBLE' | 'ALREADY_TAKEN' | 'INSUFFICIENT_BALANCE' | 'INACTIVE';
  reason: string;
  maxAllowed: number;
  remainingQuotaToday: number;
  todayWithdrawal?: Transaction;
}

/**
 * Validates if santri is eligible to withdraw pocket money today
 * RULE:
 * 1. Maksimal pengambilan ke bendahara pesantren adalah Rp 10.000 (tidak bisa lebih).
 * 2. Santri HANYA bisa mengambil 1 KALI setiap hari.
 * 3. Jika setelah 10 ribu tersebut sudah diambil hari itu, maka santri tidak bisa mengambil lagi.
 * 4. Saldo titipan harus mencukupi (>= nominal yang akan ditarik).
 */
export function checkDailyAllowanceEligibility(
  santri: Santri,
  transactions: Transaction[],
  targetDate: string = getTodayDateString()
): EligibilityResult {
  if (santri.status !== 'AKTIF') {
    return {
      canWithdraw: false,
      status: 'INACTIVE',
      reason: `Status santri saat ini [${santri.status}]. Hanya santri aktif yang berhak mengambil uang titipan.`,
      maxAllowed: 0,
      remainingQuotaToday: 0,
    };
  }

  // Check if santri already has a WITHDRAWAL_JAJAN on targetDate
  const todayWithdrawal = transactions.find(
    (t) =>
      t.santriId === santri.id &&
      t.date === targetDate &&
      t.type === 'WITHDRAWAL_JAJAN'
  );

  const dailyLimit = santri.dailyAllowanceLimit || 10000;

  if (todayWithdrawal) {
    return {
      canWithdraw: false,
      status: 'ALREADY_TAKEN',
      reason: `Santri telah mengambil uang jajan hari ini (${formatRupiah(todayWithdrawal.amount)}) pada pukul ${todayWithdrawal.time} WIB. Sesuai ketentuan pesantren, pengambilan maksimal 1 kali per hari (Maks. Rp ${dailyLimit.toLocaleString('id-ID')}).`,
      maxAllowed: 0,
      remainingQuotaToday: 0,
      todayWithdrawal,
    };
  }

  // Check balance
  if (santri.balance <= 0) {
    return {
      canWithdraw: false,
      status: 'INSUFFICIENT_BALANCE',
      reason: `Saldo titipan wadiah santri Rp 0 (Habis). Harap hubungi wali santri (${santri.guardianName}) untuk melakukan setoran titipan.`,
      maxAllowed: 0,
      remainingQuotaToday: 0,
    };
  }

  const maxAllowed = Math.min(dailyLimit, santri.balance);

  return {
    canWithdraw: true,
    status: 'ELIGIBLE',
    reason: `Santri berhak mengambil uang jajan harian. Kuota hari ini tersedia: ${formatRupiah(maxAllowed)} (1x per hari).`,
    maxAllowed,
    remainingQuotaToday: maxAllowed,
  };
}

/**
 * Generate standard double-entry journal for a transaction
 */
export function generateJournalForTransaction(trx: Transaction): JournalEntry {
  const entryNo = `JRN-${trx.transactionNo.replace('TRX-', '')}`;

  if (trx.type === 'DEPOSIT_WADIAH') {
    const isBank = (trx.method || '').includes('BANK');
    const cashAccountCode = isBank ? '1-1010' : '1-1000';
    const cashAccountName = isBank ? 'Kas Transfer Via Bank (Titipan Wadiah)' : 'Kas Tunai Bendahara Pesantren';

    return {
      id: `jrn-${trx.id}`,
      entryNo,
      date: trx.date,
      referenceNo: trx.transactionNo,
      description: `Penerimaan titipan wadiah santri: ${trx.santriName} [${trx.accountNumber}]`,
      lines: [
        {
          accountCode: cashAccountCode,
          accountName: cashAccountName,
          debit: trx.amount,
          credit: 0,
        },
        {
          accountCode: '2-1000',
          accountName: 'Simpanan Wadiah Titipan Santri',
          debit: 0,
          credit: trx.amount,
        },
      ],
    };
  }

  if (trx.type === 'WITHDRAWAL_JAJAN' || trx.type === 'SPECIAL_DISBURSEMENT') {
    return {
      id: `jrn-${trx.id}`,
      entryNo,
      date: trx.date,
      referenceNo: trx.transactionNo,
      description: `Penyaluran jajan harian santri (Wadiah): ${trx.santriName} [${trx.accountNumber}]`,
      lines: [
        {
          accountCode: '2-1000',
          accountName: 'Simpanan Wadiah Titipan Santri',
          debit: trx.amount,
          credit: 0,
        },
        {
          accountCode: '1-1000',
          accountName: 'Kas Tunai Bendahara Pesantren',
          debit: 0,
          credit: trx.amount,
        },
      ],
    };
  }

  // Generic fallback
  return {
    id: `jrn-${trx.id}`,
    entryNo,
    date: trx.date,
    referenceNo: trx.transactionNo,
    description: trx.notes || `Transaksi ${trx.type}`,
    lines: [
      {
        accountCode: '1-1000',
        accountName: 'Kas Tunai Bendahara',
        debit: trx.amount,
        credit: 0,
      },
      {
        accountCode: '3-1000',
        accountName: 'Ekuitas Awal Kas Pesantren',
        debit: 0,
        credit: trx.amount,
      },
    ],
  };
}

/**
 * Calculate Balance Sheet (Neraca) per As-Of Date
 * Returns Aktiva, Pasiva, and balance status
 */
export function calculateNeraca(
  santriList: Santri[],
  transactions: Transaction[],
  asOfDate: string = getTodayDateString()
): NeracaData {
  // Filter transactions up to asOfDate
  const relevantTrx = transactions.filter((t) => t.date <= asOfDate);

  // 1. KELOLAAN USER BENDAHARA (Titipan Uang Saku Santri - Akad Wadiah Murni)
  let totalTitipanWadiah = 0;
  let santriWithBalance = 0;
  santriList.forEach((s) => {
    totalTitipanWadiah += s.balance;
    if (s.balance > 0) santriWithBalance++;
  });

  let totalTitipanBank = 0;
  let totalTitipanTunai = 0;
  let totalJajanDitarik = 0;
  let countJajanDitarik = 0;
  let totalSetoranTitipan = 0;
  let countSetoranTitipan = 0;

  // 2. KELOLAAN USER PENGURUS (Dana SPP Syahriah Pesantren)
  let totalSPPBank = 0;
  let totalSPPTunai = 0;
  let totalPenarikanSPP = 0;
  let countPenarikanSPP = 0;
  let totalSetoranSPP = 0;
  let countSetoranSPP = 0;

  relevantTrx.forEach((t) => {
    const isSPP = t.type === 'DEPOSIT_SPP' || t.type === 'WITHDRAWAL_SPP' || (t.category && t.category.includes('SPP'));
    const isBank = (t.method || '').includes('BANK');

    if (isSPP) {
      if (t.type === 'DEPOSIT_SPP') {
        totalSetoranSPP += t.amount;
        countSetoranSPP++;
        if (isBank) {
          totalSPPBank += t.amount;
        } else {
          totalSPPTunai += t.amount;
        }
      } else {
        totalPenarikanSPP += t.amount;
        countPenarikanSPP++;
      }
    } else {
      if (isCreditTransaction(t.type)) {
        totalSetoranTitipan += t.amount;
        countSetoranTitipan++;
        if (isBank) {
          totalTitipanBank += t.amount;
        } else {
          totalTitipanTunai += t.amount;
        }
      } else if (isDebitTransaction(t.type)) {
        totalJajanDitarik += t.amount;
        countJajanDitarik++;
      }
    }
  });

  // Alokasi kas titipan yang tersisa di Bank dan Tunai Bendahara
  let kasBankTitipan = totalTitipanBank;
  let kasTunaiTitipan = totalTitipanTunai - totalJajanDitarik;

  if (kasTunaiTitipan < 0) {
    kasBankTitipan = Math.max(0, kasBankTitipan + kasTunaiTitipan);
    kasTunaiTitipan = 0;
  }

  const totalAktivaBendahara = totalTitipanWadiah;
  kasBankTitipan = Math.min(kasBankTitipan, totalAktivaBendahara);
  kasTunaiTitipan = totalAktivaBendahara - kasBankTitipan;
  const totalPasivaBendahara = totalTitipanWadiah;

  // Alokasi kas SPP Pengurus (1-1100 Kas Tunai SPP, 1-1110 Kas Bank SPP, 2-2000 Dana SPP)
  const danaPenerimaanSPP = Math.max(0, totalSetoranSPP - totalPenarikanSPP);
  let kasBankSPP = totalSPPBank;
  let kasTunaiSPP = totalSPPTunai - totalPenarikanSPP;

  if (kasTunaiSPP < 0) {
    kasBankSPP = Math.max(0, kasBankSPP + kasTunaiSPP);
    kasTunaiSPP = 0;
  }

  const totalAktivaPengurus = danaPenerimaanSPP;
  kasBankSPP = Math.min(kasBankSPP, totalAktivaPengurus);
  kasTunaiSPP = totalAktivaPengurus - kasBankSPP;
  const totalPasivaPengurus = danaPenerimaanSPP;

  // Total Terpadu Konsolidasi Pesantren
  const totalAktiva = totalAktivaBendahara + totalAktivaPengurus;
  const totalPasiva = totalPasivaBendahara + totalPasivaPengurus;
  const discrepancy = Math.abs(totalAktiva - totalPasiva);

  return {
    asOfDate,
    aktiva: {
      kasTunaiTitipan,
      kasBankTitipan,
      totalAktivaBendahara,
      kasTunaiSPP,
      kasBankSPP,
      totalAktivaPengurus,
      totalAktiva,
    },
    pasiva: {
      kewajibanTitipanWadiah: totalPasivaBendahara,
      totalPasivaBendahara,
      danaPenerimaanSPP,
      totalPasivaPengurus,
      totalPasiva,
    },
    isBalanced: discrepancy === 0,
    discrepancy,
    totalSantriWithBalance: santriWithBalance,
    totalPenarikanJajan: totalJajanDitarik,
    countPenarikanJajan: countJajanDitarik,
    totalSetoranTitipan,
    countSetoranTitipan,
    totalSetoranSPP,
    countSetoranSPP,
    totalPenarikanSPP,
    countPenarikanSPP,
  };
}


/**
 * Rekening Koran Data Generator for a specific Santri
 */
export interface RekeningKoranLine {
  id: string;
  date: string;
  time: string;
  transactionNo: string;
  description: string;
  notes: string;
  debit: number;   // Pengeluaran (Penarikan Jajan)
  credit: number;  // Pemasukan (Setoran Wali)
  balance: number; // Saldo Berjalan
  method: string;
  tellerName: string;
}

export interface RekeningKoranData {
  santri: Santri;
  startDate: string;
  endDate: string;
  openingBalance: number;
  lines: RekeningKoranLine[];
  totalDebit: number;   // Total Jajan Ditarik
  totalCredit: number;  // Total Titipan Masuk
  closingBalance: number;
}

export function isCreditTransaction(type: string): boolean {
  return type === 'DEPOSIT_WADIAH' || type === 'DEPOSIT_SPP';
}

export function isDebitTransaction(type: string): boolean {
  return (
    type === 'WITHDRAWAL_JAJAN' ||
    type === 'WITHDRAWAL_OTHER' ||
    type === 'WITHDRAWAL_SPP' ||
    type === 'SPECIAL_DISBURSEMENT'
  );
}

export function getTransactionDescription(trx: Transaction): string {
  switch (trx.type) {
    case 'DEPOSIT_WADIAH':
      return `Setoran Titipan Wadiah (${trx.guardianSenderName || 'Wali Santri'})`;
    case 'DEPOSIT_SPP':
      return `Setoran SPP Syahriah (${trx.notes || 'Iuran Bulanan'})`;
    case 'WITHDRAWAL_JAJAN':
      return 'Penarikan Uang Jajan Harian (Maks Rp 10.000)';
    case 'WITHDRAWAL_OTHER':
      return trx.category ? `Penarikan: ${trx.category}` : 'Penarikan Kebutuhan Santri';
    case 'WITHDRAWAL_SPP':
      return `Potong Saldo Wadiah untuk SPP (${trx.notes || 'SPP'})`;
    case 'SPECIAL_DISBURSEMENT':
      return `Pencairan Kebutuhan Santri (${trx.category || 'Khusus'})`;
    default:
      return trx.category || 'Transaksi Rekening Wadiah';
  }
}

export function getRekeningKoran(
  santriId: string,
  startDate: string,
  endDate: string,
  santriList: Santri[],
  transactions: Transaction[]
): RekeningKoranData | null {
  const santri = santriList.find((s) => s.id === santriId);
  if (!santri) return null;

  // Filter transactions for this santri, sorted chronologically
  const santriTrx = transactions
    .filter((t) => t.santriId === santriId)
    .sort((a, b) => {
      const dateA = `${a.date} ${a.time || '00:00:00'}`;
      const dateB = `${b.date} ${b.time || '00:00:00'}`;
      const comp = dateA.localeCompare(dateB);
      if (comp !== 0) return comp;
      return (a.id || '').localeCompare(b.id || '');
    });

  // Calculate total net change across all recorded transactions for this santri
  let totalAllCredits = 0;
  let totalAllDebits = 0;
  santriTrx.forEach((t) => {
    if (isCreditTransaction(t.type)) {
      totalAllCredits += t.amount;
    } else {
      totalAllDebits += t.amount;
    }
  });

  // The baseline balance before the first recorded transaction
  // ensures that baseline + (all credits) - (all debits) = santri.balance
  const baselineBalance = santri.balance - (totalAllCredits - totalAllDebits);

  let runningBalance = baselineBalance;
  let openingBalance = baselineBalance;

  const lines: RekeningKoranLine[] = [];
  let totalDebit = 0;
  let totalCredit = 0;

  santriTrx.forEach((trx) => {
    const isCredit = isCreditTransaction(trx.type);
    const debitAmount = isCredit ? 0 : trx.amount;
    const creditAmount = isCredit ? trx.amount : 0;

    if (trx.date < startDate) {
      if (isCredit) {
        runningBalance += trx.amount;
      } else {
        runningBalance -= trx.amount;
      }
      openingBalance = runningBalance;
    } else if (trx.date >= startDate && trx.date <= endDate) {
      if (isCredit) {
        runningBalance += trx.amount;
        totalCredit += trx.amount;
      } else {
        runningBalance -= trx.amount;
        totalDebit += trx.amount;
      }

      lines.push({
        id: trx.id,
        date: trx.date,
        time: trx.time || '08:00:00',
        transactionNo: trx.transactionNo,
        description: getTransactionDescription(trx),
        notes: trx.notes,
        debit: debitAmount,
        credit: creditAmount,
        balance: runningBalance,
        method: trx.method,
        tellerName: trx.tellerName,
      });
    }
  });

  // Closing balance for the selected period
  const closingBalance = openingBalance + totalCredit - totalDebit;

  return {
    santri,
    startDate,
    endDate,
    openingBalance,
    lines,
    totalDebit,
    totalCredit,
    closingBalance,
  };
}

/**
 * Format PaymentMethod to user friendly Indonesian label
 */
export function formatPaymentMethodLabel(method: string): string {
  if (!method) return '-';
  if (method === 'BANK_TRANSFER_BSI' || method === 'BANK_TRANSFER' || method.includes('BANK')) {
    return 'Transfer Via Bank';
  }
  if (method === 'CASH') {
    return 'Tunai Loket';
  }
  if (method === 'QRIS_PESANTREN') {
    return 'QRIS Pesantren';
  }
  return method.replace(/_/g, ' ');
}
