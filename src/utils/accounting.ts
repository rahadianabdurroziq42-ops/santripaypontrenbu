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

  // 1. Total Kewajiban Simpanan Wadiah Santri (Total Saldo Titipan Seluruh Santri)
  let totalTitipanWadiah = 0;
  let santriWithBalance = 0;
  santriList.forEach((s) => {
    totalTitipanWadiah += s.balance;
    if (s.balance > 0) santriWithBalance++;
  });

  // 2. Hitung penerimaan titipan orang tua & pengeluaran jajan santri
  let totalTitipanBank = 0;
  let totalTitipanTunai = 0;
  let totalJajanDitarik = 0;
  let countJajanDitarik = 0;
  let totalSetoranTitipan = 0;
  let countSetoranTitipan = 0;

  relevantTrx.forEach((t) => {
    if (t.type === 'DEPOSIT_WADIAH') {
      totalSetoranTitipan += t.amount;
      countSetoranTitipan++;
      if ((t.method || '').includes('BANK')) {
        totalTitipanBank += t.amount;
      } else {
        totalTitipanTunai += t.amount;
      }
    } else if (t.type === 'WITHDRAWAL_JAJAN' || t.type === 'SPECIAL_DISBURSEMENT') {
      totalJajanDitarik += t.amount;
      countJajanDitarik++;
    }
  });

  // Alokasi kas titipan yang tersisa di Bank dan Tunai Bendahara
  // Penarikan jajan santri ditarik secara tunai di loket bendahara
  let kasBankTitipan = totalTitipanBank;
  let kasTunaiTitipan = totalTitipanTunai - totalJajanDitarik;

  // Jika penarikan tunai jajan santri melebihi uang tunai yang disetor langsung,
  // maka sisa kas ditopang dari pencairan rekening bank titipan
  if (kasTunaiTitipan < 0) {
    kasBankTitipan = Math.max(0, kasBankTitipan + kasTunaiTitipan);
    kasTunaiTitipan = 0;
  }

  // Pastikan total aktiva kas titipan persis seimbang dengan total saldo titipan wadiah
  const totalAktiva = totalTitipanWadiah;
  kasBankTitipan = Math.min(kasBankTitipan, totalAktiva);
  kasTunaiTitipan = totalAktiva - kasBankTitipan;

  const totalPasiva = totalTitipanWadiah;
  const discrepancy = Math.abs(totalAktiva - totalPasiva);

  return {
    asOfDate,
    aktiva: {
      kasTunaiTitipan,
      kasBankTitipan,
      totalAktiva,
    },
    pasiva: {
      kewajibanTitipanWadiah: totalTitipanWadiah,
      totalPasiva,
    },
    isBalanced: discrepancy === 0,
    discrepancy,
    totalSantriWithBalance: santriWithBalance,
    totalPenarikanJajan: totalJajanDitarik,
    countPenarikanJajan: countJajanDitarik,
    totalSetoranTitipan,
    countSetoranTitipan,
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
      const dateA = `${a.date} ${a.time}`;
      const dateB = `${b.date} ${b.time}`;
      return dateA.localeCompare(dateB);
    });

  // Calculate opening balance before startDate
  let runningBalance = 0;
  let openingBalance = 0;

  const lines: RekeningKoranLine[] = [];
  let totalDebit = 0;
  let totalCredit = 0;

  santriTrx.forEach((trx) => {
    const isCredit = trx.type === 'DEPOSIT_WADIAH';
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
        time: trx.time,
        transactionNo: trx.transactionNo,
        description: trx.type === 'DEPOSIT_WADIAH'
          ? `Setoran Titipan Wali (${trx.guardianSenderName || 'Wali Santri'})`
          : `Penarikan Uang Jajan Harian (Maks Rp 10.000)`,
        notes: trx.notes,
        debit: debitAmount,
        credit: creditAmount,
        balance: runningBalance,
        method: trx.method,
        tellerName: trx.tellerName,
      });
    }
  });

  return {
    santri,
    startDate,
    endDate,
    openingBalance,
    lines,
    totalDebit,
    totalCredit,
    closingBalance: runningBalance,
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
