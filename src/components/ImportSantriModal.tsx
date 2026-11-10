import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { 
  Upload, 
  Download, 
  FileSpreadsheet, 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  Check, 
  Trash2,
  Users,
  ShieldAlert
} from 'lucide-react';
import { Santri } from '../types/finance';
import { formatRupiah } from '../utils/accounting';

export interface ImportedSantriItem {
  nisn: string;
  name: string;
  gender: 'L' | 'P';
  guardianName: string;
  guardianPhone: string;
  guardianAddress: string;
  initialDeposit: number;
  dailyAllowanceLimit: number;
  isValid: boolean;
  validationError?: string;
  isDuplicateNisn?: boolean;
  selected: boolean;
}

export type ImportMode = 'REPLACE' | 'APPEND';

interface ImportSantriModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingSantriList: Santri[];
  onConfirmImport: (importedItems: ImportedSantriItem[], mode: ImportMode) => void;
}

export const ImportSantriModal: React.FC<ImportSantriModalProps> = ({
  isOpen,
  onClose,
  existingSantriList,
  onConfirmImport,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string>('');
  const [parsedRows, setParsedRows] = useState<ImportedSantriItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [importMode, setImportMode] = useState<ImportMode>('REPLACE');

  if (!isOpen) return null;

  // 1. Download Excel Template (.xlsx) - Tanpa Asrama & Tanpa Kelas/Jenjang
  const handleDownloadTemplate = () => {
    const headers = [
      'NISN',
      'Nama Santri',
      'Jenis Kelamin (L/P)',
      'Nama Wali',
      'No HP Wali',
      'Alamat Wali',
      'Setoran Awal (Rp)',
      'Limit Jajan Harian (Rp)',
    ];

    const sampleRows = [
      [
        '0081234501',
        'Muhammad Rizky Pratama',
        'L',
        'H. Ahmad Subarjo',
        '081234567891',
        'Jl. Melati No. 15, Surabaya',
        200000,
        10000,
      ],
      [
        '0081234502',
        'Aisyah Putri Azzahra',
        'P',
        'Hj. Siti Aminah',
        '081298765432',
        'Jl. Kenanga No. 8, Sidoarjo',
        150000,
        10000,
      ],
      [
        '0081234503',
        'Faris Al-Ghifari',
        'L',
        'Bpk. Hendra Gunawan',
        '085712349876',
        'Jl. Mawar No. 4, Malang',
        300000,
        10000,
      ],
      [
        '0081234504',
        'Fathimah Az-Zahra',
        'P',
        'Ibu Nurul Hidayati',
        '081377889900',
        'Jl. Diponegoro No. 22, Gresik',
        250000,
        10000,
      ],
    ];

    const data = [headers, ...sampleRows];
    const ws = XLSX.utils.aoa_to_sheet(data);

    // Set column widths
    ws['!cols'] = [
      { wch: 15 }, // NISN
      { wch: 28 }, // Nama
      { wch: 20 }, // JK
      { wch: 26 }, // Wali
      { wch: 18 }, // No HP
      { wch: 35 }, // Alamat
      { wch: 18 }, // Setoran Awal
      { wch: 22 }, // Limit Jajan
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data Santri');
    XLSX.writeFile(wb, 'Template_Import_Santri_SantriPay.xlsx');
  };

  // 2. Parse Uploaded Excel File
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });

        const firstSheetName = wb.SheetNames[0];
        const ws = wb.Sheets[firstSheetName];

        const rawRows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

        if (!rawRows || rawRows.length < 2) {
          setErrorMsg('File Excel kosong atau tidak memiliki baris data setelah baris judul kolom.');
          setIsProcessing(false);
          return;
        }

        const headerRow = rawRows[0].map((h: any) => String(h || '').trim().toLowerCase());
        
        const findColIndex = (keywords: string[]) => {
          return headerRow.findIndex((h) => keywords.some((kw) => h.includes(kw)));
        };

        const idxNisn = findColIndex(['nisn', 'nomor induk', 'nis']);
        const idxName = findColIndex(['nama santri', 'nama lengkap', 'nama']);
        const idxGender = findColIndex(['jenis kelamin', 'jk', 'gender', 'l/p']);
        const idxGuardian = findColIndex(['nama orang tua', 'nama wali', 'wali']);
        const idxPhone = findColIndex(['no hp', 'nomor hp', 'telepon', 'kontak', 'phone', 'wa']);
        const idxAddress = findColIndex(['alamat wali', 'alamat']);
        const idxDeposit = findColIndex(['setoran awal', 'saldo awal', 'deposit', 'setoran']);
        const idxLimit = findColIndex(['limit jajan', 'limit harian', 'limit']);

        const existingNisnSet = new Set(existingSantriList.map((s) => s.nisn.trim().toLowerCase()));
        const fileSeenNisn = new Set<string>();

        const parsed: ImportedSantriItem[] = [];

        for (let i = 1; i < rawRows.length; i++) {
          const row = rawRows[i];
          if (!row || row.length === 0 || row.every((cell) => cell === undefined || cell === null || String(cell).trim() === '')) {
            continue;
          }

          const rawNisn = idxNisn !== -1 && row[idxNisn] !== undefined ? String(row[idxNisn]).trim() : '';
          const rawName = idxName !== -1 && row[idxName] !== undefined ? String(row[idxName]).trim() : '';
          const rawGenderStr = idxGender !== -1 && row[idxGender] !== undefined ? String(row[idxGender]).trim().toUpperCase() : 'L';
          const rawGuardian = idxGuardian !== -1 && row[idxGuardian] !== undefined ? String(row[idxGuardian]).trim() : 'Wali Santri';
          const rawPhone = idxPhone !== -1 && row[idxPhone] !== undefined ? String(row[idxPhone]).trim() : '0812-0000-0000';
          const rawAddress = idxAddress !== -1 && row[idxAddress] !== undefined ? String(row[idxAddress]).trim() : 'Alamat Santri';
          
          let depositVal = 0;
          if (idxDeposit !== -1 && row[idxDeposit] !== undefined) {
            const num = Number(String(row[idxDeposit]).replace(/[^0-9.-]+/g, ''));
            if (!isNaN(num)) depositVal = num;
          }

          let limitVal = 10000;
          if (idxLimit !== -1 && row[idxLimit] !== undefined) {
            const num = Number(String(row[idxLimit]).replace(/[^0-9.-]+/g, ''));
            if (!isNaN(num) && num > 0) limitVal = num;
          }

          // Validation
          let isValid = true;
          let validationError: string | undefined = undefined;
          let isDuplicateNisn = false;

          const nisnKey = rawNisn.toLowerCase();

          if (!rawName) {
            isValid = false;
            validationError = 'Nama santri wajib diisi';
          } else if (!rawNisn) {
            isValid = false;
            validationError = 'NISN santri wajib diisi';
          } else if (fileSeenNisn.has(nisnKey)) {
            isDuplicateNisn = true;
            validationError = 'NISN ganda dalam file Excel yang sama';
          } else if (importMode === 'APPEND' && existingNisnSet.has(nisnKey)) {
            isDuplicateNisn = true;
            validationError = 'NISN sudah terdaftar di sistem';
          }

          if (rawNisn) {
            fileSeenNisn.add(nisnKey);
          }

          const gender: 'L' | 'P' = rawGenderStr.startsWith('P') ? 'P' : 'L';

          parsed.push({
            nisn: rawNisn,
            name: rawName,
            gender,
            guardianName: rawGuardian,
            guardianPhone: rawPhone,
            guardianAddress: rawAddress,
            initialDeposit: depositVal,
            dailyAllowanceLimit: limitVal,
            isValid,
            validationError,
            isDuplicateNisn,
            selected: isValid && !isDuplicateNisn,
          });
        }

        if (parsed.length === 0) {
          setErrorMsg('Tidak ditemukan baris data yang valid pada lembar kerja Excel.');
        } else {
          setParsedRows(parsed);
        }
      } catch (err: any) {
        console.error('Excel parse error:', err);
        setErrorMsg('Gagal membaca file Excel. Pastikan format file adalah .xlsx atau .csv yang valid.');
      } finally {
        setIsProcessing(false);
      }
    };

    reader.onerror = () => {
      setErrorMsg('Terjadi kesalahan saat membaca file.');
      setIsProcessing(false);
    };

    reader.readAsBinaryString(file);
  };

  const handleToggleRow = (index: number) => {
    setParsedRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, selected: !row.selected } : row))
    );
  };

  const handleToggleAll = (select: boolean) => {
    setParsedRows((prev) =>
      prev.map((row) => (row.isValid && !row.isDuplicateNisn ? { ...row, selected: select } : row))
    );
  };

  const handleReset = () => {
    setParsedRows([]);
    setFileName('');
    setErrorMsg(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const selectedCount = parsedRows.filter((r) => r.selected).length;
  const totalInitialDeposit = parsedRows
    .filter((r) => r.selected)
    .reduce((sum, r) => sum + (r.initialDeposit || 0), 0);

  const handleConfirm = () => {
    const toImport = parsedRows.filter((r) => r.selected);
    if (toImport.length === 0) return;
    onConfirmImport(toImport, importMode);
    handleReset();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs no-print">
      <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base">Impor Data Santri Massal (.xlsx / .csv)</h3>
              <p className="text-[11px] text-emerald-300/90">
                Pendaftaran santri baru langsung sekaligus aktivasi rekening wadiah
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              handleReset();
              onClose();
            }}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs flex-1">
          {/* Section 1: Template & Upload Options */}
          {parsedRows.length === 0 ? (
            <div className="space-y-5">
              {/* Step 1 & 2 Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Download Template Box */}
                <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/60 space-y-3 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-emerald-900 font-bold">
                      <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[11px] flex items-center justify-center font-bold">
                        1
                      </span>
                      <span>Unduh Template Format Excel</span>
                    </div>
                    <p className="text-[11px] text-emerald-800/80 mt-1.5 leading-relaxed">
                      Format template resmi telah disederhanakan (bebas asrama dan kelas/jenjang). Cukup isi NISN, Nama Santri, Jenis Kelamin (L/P), Nama Wali, No HP, Alamat, Setoran Awal, dan Limit Jajan.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                  >
                    <Download className="w-4 h-4" />
                    <span>Unduh Template Excel (.xlsx)</span>
                  </button>
                </div>

                {/* Upload Excel Box */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-slate-900 font-bold">
                      <span className="w-5 h-5 rounded-full bg-slate-700 text-white text-[11px] flex items-center justify-center font-bold">
                        2
                      </span>
                      <span>Unggah File Excel yang Telah Diisi</span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-1.5 leading-relaxed">
                      Pilih file Excel (.xlsx / .xls) atau .csv dari komputer Anda. Sistem memverifikasi kelayakan data sebelum disimpan.
                    </p>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="excel-file-input"
                  />
                  <label
                    htmlFor="excel-file-input"
                    className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer text-center active:scale-98"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Pilih &amp; Unggah File Excel</span>
                  </label>
                </div>
              </div>

              {/* Petunjuk Pengisian */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white text-slate-700 space-y-2">
                <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Petunjuk Kolom Template Excel (Format Baru Bebas Kelas):</span>
                </h4>
                <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-600 pl-1 leading-relaxed">
                  <li><strong>NISN:</strong> Nomor induk unik santri (wajib diisi, tidak boleh sama dengan santri yang sudah ada).</li>
                  <li><strong>Nama Santri:</strong> Nama lengkap santri sesuai akta/dokumen resmi (wajib diisi).</li>
                  <li><strong>Jenis Kelamin:</strong> Isi <code>L</code> untuk Laki-laki (Ikhwan) atau <code>P</code> untuk Perempuan (Akhwat).</li>
                  <li><strong>Nama Wali:</strong> Nama ayah, ibu, atau wali santri.</li>
                  <li><strong>No HP Wali:</strong> Nomor telepon/WhatsApp aktif orang tua untuk koordinasi titipan wadiah.</li>
                  <li><strong>Alamat Wali:</strong> Domisili orang tua / kota asal santri.</li>
                  <li><strong>Setoran Awal (Rp):</strong> Nominal saldo titipan awal buka rekening (opsional, ketik 0 jika belum setor). Jika &gt; 0, otomatis dibukukan ke jurnal &amp; neraca kas kasir.</li>
                  <li><strong>Limit Jajan Harian (Rp):</strong> Batas harian penarikan uang saku santri (default Rp 10.000).</li>
                </ul>
              </div>

              {errorMsg && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center gap-2 font-medium">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </div>
          ) : (
            /* Section 2: Preview & Validation Table */
            <div className="space-y-4">
              {/* Header stats bar */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-700" />
                  <div>
                    <span className="font-bold text-slate-900 block">{fileName}</span>
                    <span className="text-[11px] text-slate-500">
                      Terbaca {parsedRows.length} baris santri • {selectedCount} dipilih untuk diimpor
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleAll(true)}
                    className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200 cursor-pointer"
                  >
                    Pilih Semua Valid
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleAll(false)}
                    className="px-2.5 py-1 text-[10px] font-semibold rounded-lg bg-slate-200 text-slate-700 hover:bg-slate-300 cursor-pointer"
                  >
                    Batalkan Pilihan
                  </button>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="px-2.5 py-1 text-[10px] font-semibold rounded-lg bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Ganti File</span>
                  </button>
                </div>
              </div>

              {/* Mode Impor: Ganti Total (100%) vs Tambahkan Data */}
              <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/70 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-amber-600" />
                    <span>Mode Pemrosesan Impor Data:</span>
                  </span>
                  <span className="text-[10px] font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">
                    {importMode === 'REPLACE' ? 'Ganti Total 100%' : 'Gabungkan / Tambah'}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setImportMode('REPLACE')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      importMode === 'REPLACE'
                        ? 'border-emerald-600 bg-white ring-2 ring-emerald-500/30 shadow-xs'
                        : 'border-slate-200 bg-white/70 hover:bg-white text-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                        importMode === 'REPLACE' ? 'border-emerald-600 bg-emerald-600' : 'border-slate-400'
                      }`}>
                        {importMode === 'REPLACE' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </span>
                      <strong className="text-xs text-slate-900">Ganti 100% Seluruh Data (Disarankan)</strong>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 pl-5.5 leading-relaxed">
                      Menghapus data contoh/lama dan menggantinya 100% murni dengan data baru dari file Excel ini.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setImportMode('APPEND')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      importMode === 'APPEND'
                        ? 'border-emerald-600 bg-white ring-2 ring-emerald-500/30 shadow-xs'
                        : 'border-slate-200 bg-white/70 hover:bg-white text-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                        importMode === 'APPEND' ? 'border-emerald-600 bg-emerald-600' : 'border-slate-400'
                      }`}>
                        {importMode === 'APPEND' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </span>
                      <strong className="text-xs text-slate-900">Tambahkan ke Data yang Sudah Ada</strong>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 pl-5.5 leading-relaxed">
                      Mempertahankan data santri yang telah tersimpan di sistem dan menyisipkan data baru ini.
                    </p>
                  </button>
                </div>
              </div>

              {/* Data Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs max-h-72 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-700 sticky top-0 z-10 border-b border-slate-200 text-[11px] uppercase tracking-wider font-bold">
                    <tr>
                      <th className="py-2.5 px-3 w-10 text-center">Pilih</th>
                      <th className="py-2.5 px-3">Nama Santri &amp; NISN</th>
                      <th className="py-2.5 px-3">JK</th>
                      <th className="py-2.5 px-3">Wali Santri &amp; HP</th>
                      <th className="py-2.5 px-3">Alamat Asal Wali</th>
                      <th className="py-2.5 px-3 text-right">Setoran Awal</th>
                      <th className="py-2.5 px-3 text-center">Status Validasi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedRows.map((row, idx) => {
                      return (
                        <tr
                          key={idx}
                          className={`transition-colors ${
                            row.selected ? 'bg-emerald-50/50' : 'hover:bg-slate-50 text-slate-600'
                          }`}
                        >
                          {/* Checkbox */}
                          <td className="py-2 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={row.selected}
                              disabled={!row.isValid || row.isDuplicateNisn}
                              onChange={() => handleToggleRow(idx)}
                              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer disabled:opacity-30"
                            />
                          </td>

                          {/* Nama & NISN */}
                          <td className="py-2 px-3">
                            <span className="font-bold text-slate-900 block leading-tight">
                              {row.name || <span className="text-rose-500 italic">[Kosong]</span>}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              NISN: {row.nisn || <span className="text-rose-500 italic">[Kosong]</span>}
                            </span>
                          </td>

                          {/* JK */}
                          <td className="py-2 px-3">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              row.gender === 'L' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}>
                              {row.gender}
                            </span>
                          </td>

                          {/* Wali */}
                          <td className="py-2 px-3">
                            <span className="font-semibold text-slate-800 block">
                              {row.guardianName}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {row.guardianPhone}
                            </span>
                          </td>

                          {/* Alamat */}
                          <td className="py-2 px-3 text-slate-600 truncate max-w-[150px]">
                            {row.guardianAddress}
                          </td>

                          {/* Setoran Awal */}
                          <td className="py-2 px-3 text-right font-mono font-mono-numbers">
                            <span className={row.initialDeposit > 0 ? 'font-bold text-emerald-700' : 'text-slate-400'}>
                              {formatRupiah(row.initialDeposit)}
                            </span>
                          </td>

                          {/* Validasi */}
                          <td className="py-2 px-3 text-center">
                            {row.isDuplicateNisn ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                <AlertTriangle className="w-3 h-3 text-amber-600" />
                                <span>NISN Duplikat</span>
                              </span>
                            ) : !row.isValid ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300" title={row.validationError}>
                                <AlertCircle className="w-3 h-3 text-rose-600" />
                                <span>Tidak Valid</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                <Check className="w-3 h-3 text-emerald-600" />
                                <span>Siap Impor</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Import Summary Box */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      {importMode === 'REPLACE' ? 'Pembaruan Total Data Santri (100% Ganti Data):' : 'Penambahan Data Santri Baru:'}
                    </span>
                    <span className="text-[11px] text-slate-600">
                      {importMode === 'REPLACE' ? (
                        <>Seluruh <strong>{existingSantriList.length}</strong> data santri lama/sample akan digantikan 100% dengan <strong>{selectedCount}</strong> data baru dari Excel.</>
                      ) : (
                        <><strong>{selectedCount}</strong> data santri baru akan ditambahkan ke daftar yang sudah ada.</>
                      )}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">
                    Total Setoran Awal Masuk Kas:
                  </span>
                  <span className="text-base font-black text-emerald-800 font-mono-numbers">
                    {formatRupiah(totalInitialDeposit)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              handleReset();
              onClose();
            }}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            Batal
          </button>

          {parsedRows.length > 0 && (
            <button
              type="button"
              disabled={selectedCount === 0 || isProcessing}
              onClick={handleConfirm}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-98 ${
                importMode === 'REPLACE'
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-900/20'
                  : 'bg-slate-900 hover:bg-slate-800 text-white'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {importMode === 'REPLACE'
                  ? `Ganti 100% & Impor ${selectedCount} Santri Baru`
                  : `Tambahkan ${selectedCount} Santri Baru`}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
