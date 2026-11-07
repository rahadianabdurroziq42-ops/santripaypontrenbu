import React, { useState, useEffect } from 'react';
import { 
  Printer, 
  X, 
  FileText, 
  RotateCw, 
  Check, 
  Sparkles, 
  Info, 
  SlidersHorizontal,
  Layers
} from 'lucide-react';
import { 
  PaperSize, 
  PaperOrientation, 
  PAPER_DIMENSIONS, 
  getSavedPrintSettings, 
  savePrintSettings, 
  executePrint 
} from '../utils/printHelper';

interface PrintFormatModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentTitle: string;
  defaultOrientation?: PaperOrientation;
  recommendedOrientation?: PaperOrientation;
  recommendedPaperSize?: PaperSize;
  notes?: string;
}

export const PrintFormatModal: React.FC<PrintFormatModalProps> = ({
  isOpen,
  onClose,
  documentTitle,
  defaultOrientation = 'landscape',
  recommendedOrientation = 'landscape',
  recommendedPaperSize = 'F4',
  notes,
}) => {
  const [paperSize, setPaperSize] = useState<PaperSize>('A4');
  const [orientation, setOrientation] = useState<PaperOrientation>(defaultOrientation);
  const [saveAsDefault, setSaveAsDefault] = useState<boolean>(true);

  useEffect(() => {
    if (isOpen) {
      const saved = getSavedPrintSettings(defaultOrientation);
      setPaperSize(saved.paperSize || recommendedPaperSize || 'A4');
      setOrientation(saved.orientation || recommendedOrientation || defaultOrientation);
    }
  }, [isOpen, defaultOrientation, recommendedOrientation, recommendedPaperSize]);

  if (!isOpen) return null;

  const currentDimensions = PAPER_DIMENSIONS[paperSize];

  // Visual aspect ratio calculations for preview box
  // A4: 210 x 297 (~ 1 : 1.414)
  // F4: 215 x 330 (~ 1 : 1.535)
  const isLandscape = orientation === 'landscape';
  const widthMm = isLandscape ? currentDimensions.heightMm : currentDimensions.widthMm;
  const heightMm = isLandscape ? currentDimensions.widthMm : currentDimensions.heightMm;

  const handlePrint = () => {
    if (saveAsDefault) {
      savePrintSettings({
        paperSize,
        orientation,
        showKop: true,
        showSignatures: true,
      });
    }

    onClose();
    executePrint(paperSize, orientation);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs no-print animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-700/60 border border-emerald-500/40 flex items-center justify-center text-white">
              <Printer className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <span>Pengaturan Cetak Dokumen</span>
                <span className="text-[10px] bg-emerald-500/30 text-emerald-200 border border-emerald-400/30 px-2 py-0.5 rounded-full font-mono">
                  A4 & F4 / Folio
                </span>
              </h3>
              <p className="text-xs text-slate-300 truncate max-w-sm">
                {documentTitle}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Recommendation Banner */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 flex items-start space-x-3">
            <Sparkles className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-bold text-emerald-950">
                Format Rekomendasi:{' '}
                <span className="text-emerald-700">
                  {recommendedPaperSize} • {recommendedOrientation === 'landscape' ? 'Landscape (Mendatar)' : 'Portrait (Tegak)'}
                </span>
              </p>
              <p className="text-emerald-800 mt-0.5">
                {notes || (recommendedOrientation === 'landscape' 
                  ? 'Format Mendatar (Landscape) memberikan ruang kolom paling leluasa untuk pembukuan akuntansi syariah multi-kolom.'
                  : 'Format Tegak (Portrait) sangat ideal untuk kuitansi, neraca ringkas, dan rekening koran individual santri.')}
              </p>
            </div>
          </div>

          {/* Section 1: Pilihan Ukuran Kertas */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-2 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-emerald-700" />
              <span>1. Ukuran Kertas Fisik (Paper Size)</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              {/* Option A4 */}
              <button
                type="button"
                onClick={() => setPaperSize('A4')}
                className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                  paperSize === 'A4'
                    ? 'border-emerald-600 bg-emerald-50/60 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-900">Kertas A4</span>
                  {paperSize === 'A4' && (
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                      <Check className="w-3.5 h-3.5" />
                    </span>
                  )}
                </div>
                <div className="mt-1">
                  <span className="font-mono text-xs font-semibold text-emerald-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                    210 × 297 mm
                  </span>
                  <p className="text-[11px] text-slate-500 mt-1.5 line-clamp-2">
                    Standar internasional arsip kantor dan binder map standar.
                  </p>
                </div>
              </button>

              {/* Option F4 / Folio */}
              <button
                type="button"
                onClick={() => setPaperSize('F4')}
                className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                  paperSize === 'F4'
                    ? 'border-emerald-600 bg-emerald-50/60 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-900">Kertas F4 / Folio</span>
                  {paperSize === 'F4' && (
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                      <Check className="w-3.5 h-3.5" />
                    </span>
                  )}
                </div>
                <div className="mt-1">
                  <span className="font-mono text-xs font-semibold text-emerald-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                    215 × 330 mm
                  </span>
                  <p className="text-[11px] text-slate-500 mt-1.5 line-clamp-2">
                    Standar kertas HVS panjang pesantren & administrasi Indonesia (+33mm lebih panjang).
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Section 2: Orientasi Cetak */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-2 uppercase tracking-wider flex items-center gap-1.5">
              <RotateCw className="w-4 h-4 text-emerald-700" />
              <span>2. Orientasi Halaman (Page Orientation)</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              {/* Option Landscape (Mendatar) */}
              <button
                type="button"
                onClick={() => setOrientation('landscape')}
                className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                  orientation === 'landscape'
                    ? 'border-emerald-600 bg-emerald-50/60 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  {/* Miniature paper preview: Landscape */}
                  <div className="w-10 h-7 border-2 border-slate-700 rounded bg-white shadow-2xs flex flex-col justify-center items-center gap-0.5 p-0.5">
                    <div className="w-7 h-1 bg-slate-300 rounded-xs" />
                    <div className="w-7 h-1 bg-slate-300 rounded-xs" />
                  </div>
                  {orientation === 'landscape' && (
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                      <Check className="w-3.5 h-3.5" />
                    </span>
                  )}
                </div>
                <p className="font-bold text-sm text-slate-900">Landscape (Mendatar)</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Lebar: {isLandscape ? heightMm : widthMm} mm • Cocok untuk tabel banyak kolom
                </p>
              </button>

              {/* Option Portrait (Tegak) */}
              <button
                type="button"
                onClick={() => setOrientation('portrait')}
                className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                  orientation === 'portrait'
                    ? 'border-emerald-600 bg-emerald-50/60 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  {/* Miniature paper preview: Portrait */}
                  <div className="w-7 h-10 border-2 border-slate-700 rounded bg-white shadow-2xs flex flex-col justify-center items-center gap-0.5 p-0.5">
                    <div className="w-4 h-1 bg-slate-300 rounded-xs" />
                    <div className="w-4 h-1 bg-slate-300 rounded-xs" />
                    <div className="w-4 h-1 bg-slate-300 rounded-xs" />
                  </div>
                  {orientation === 'portrait' && (
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                      <Check className="w-3.5 h-3.5" />
                    </span>
                  )}
                </div>
                <p className="font-bold text-sm text-slate-900">Portrait (Tegak)</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Tinggi: {!isLandscape ? heightMm : widthMm} mm • Cocok untuk dokumen vertikal
                </p>
              </button>
            </div>
          </div>

          {/* Section 3: Ringkasan Format Aktif & Tips */}
          <div className="bg-slate-100 rounded-2xl p-4 border border-slate-200 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-600 font-semibold">Format Output Cetak:</span>
              <span className="font-bold font-mono text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-300">
                {paperSize} • {orientation.toUpperCase()} ({widthMm} × {heightMm} mm)
              </span>
            </div>

            <div className="mt-2.5 pt-2.5 border-t border-slate-200 text-[11px] text-slate-500 flex items-start space-x-2">
              <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <span>
                <strong>Tips Cetak Bersih:</strong> Pada jendela cetak browser Chrome/Edge, pastikan opsi <em>"Grafik latar belakang (Background graphics)"</em> dicentang agar kop surat pesantren & warna tabel tercetak sempurna.
              </span>
            </div>
          </div>

          {/* Checkbox Save preference */}
          <div className="flex items-center space-x-2 pt-1">
            <input
              type="checkbox"
              id="save-default-print"
              checked={saveAsDefault}
              onChange={(e) => setSaveAsDefault(e.target.checked)}
              className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4 border-slate-300 cursor-pointer"
            />
            <label htmlFor="save-default-print" className="text-xs text-slate-700 cursor-pointer font-medium">
              Ingat pilihan ukuran kertas dan orientasi ini untuk cetak selanjutnya
            </label>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-200 transition-colors cursor-pointer"
          >
            Batal
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center space-x-2 px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-900/20 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak {paperSize} {orientation === 'landscape' ? 'Landscape' : 'Portrait'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
