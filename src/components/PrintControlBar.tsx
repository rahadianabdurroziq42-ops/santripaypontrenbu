import React, { useState, useEffect } from 'react';
import { 
  Printer, 
  RotateCw, 
  Layers, 
  SlidersHorizontal,
  ChevronDown
} from 'lucide-react';
import { 
  PaperSize, 
  PaperOrientation, 
  getSavedPrintSettings, 
  savePrintSettings, 
  executePrint 
} from '../utils/printHelper';
import { PrintFormatModal } from './PrintFormatModal';

interface PrintControlBarProps {
  documentTitle: string;
  defaultOrientation?: PaperOrientation;
  defaultPaperSize?: PaperSize;
  buttonLabel?: string;
  className?: string;
}

export const PrintControlBar: React.FC<PrintControlBarProps> = ({
  documentTitle,
  defaultOrientation = 'landscape',
  defaultPaperSize = 'A4',
  buttonLabel = 'Cetak',
  className = '',
}) => {
  const [paperSize, setPaperSize] = useState<PaperSize>(defaultPaperSize);
  const [orientation, setOrientation] = useState<PaperOrientation>(defaultOrientation);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  useEffect(() => {
    const saved = getSavedPrintSettings(defaultOrientation);
    if (saved.paperSize) setPaperSize(saved.paperSize);
    if (saved.orientation) setOrientation(saved.orientation);
  }, [defaultOrientation]);

  const handleTogglePaper = (newSize: PaperSize) => {
    setPaperSize(newSize);
    savePrintSettings({
      paperSize: newSize,
      orientation,
      showKop: true,
      showSignatures: true,
    });
  };

  const handleToggleOrientation = (newOrientation: PaperOrientation) => {
    setOrientation(newOrientation);
    savePrintSettings({
      paperSize,
      orientation: newOrientation,
      showKop: true,
      showSignatures: true,
    });
  };

  const handleQuickPrint = () => {
    executePrint(paperSize, orientation);
  };

  return (
    <div className={`flex flex-wrap items-center gap-2 no-print ${className}`}>
      {/* Quick Paper & Orientation Selector Pill Group */}
      <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
        {/* Paper Size selector */}
        <div className="flex items-center space-x-0.5 pr-1 border-r border-slate-300">
          <button
            type="button"
            onClick={() => handleTogglePaper('A4')}
            title="Kertas A4 (210 × 297 mm)"
            className={`px-2 py-1 rounded-lg transition-all cursor-pointer font-bold ${
              paperSize === 'A4'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            A4
          </button>
          <button
            type="button"
            onClick={() => handleTogglePaper('F4')}
            title="Kertas F4 / Folio (215 × 330 mm)"
            className={`px-2 py-1 rounded-lg transition-all cursor-pointer font-bold ${
              paperSize === 'F4'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            F4
          </button>
        </div>

        {/* Orientation selector */}
        <div className="flex items-center space-x-0.5 pl-1">
          <button
            type="button"
            onClick={() => handleToggleOrientation('landscape')}
            title="Orientasi Mendatar / Landscape (Melebar)"
            className={`flex items-center space-x-1 px-2 py-1 rounded-lg transition-all cursor-pointer font-medium ${
              orientation === 'landscape'
                ? 'bg-slate-800 text-white shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {/* Landscape icon miniature */}
            <span className="w-3.5 h-2.5 border border-current rounded-xs inline-block" />
            <span>Landscape</span>
          </button>

          <button
            type="button"
            onClick={() => handleToggleOrientation('portrait')}
            title="Orientasi Tegak / Portrait"
            className={`flex items-center space-x-1 px-2 py-1 rounded-lg transition-all cursor-pointer font-medium ${
              orientation === 'portrait'
                ? 'bg-slate-800 text-white shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {/* Portrait icon miniature */}
            <span className="w-2.5 h-3.5 border border-current rounded-xs inline-block" />
            <span>Portrait</span>
          </button>
        </div>
      </div>

      {/* Main Print Button */}
      <div className="flex items-center shadow-xs rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={handleQuickPrint}
          className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white text-xs font-bold transition-all cursor-pointer"
        >
          <Printer className="w-3.5 h-3.5 text-emerald-400" />
          <span>{buttonLabel}</span>
          <span className="text-[10px] font-mono bg-slate-800 text-emerald-300 px-1.5 py-0.2 rounded border border-slate-700">
            {paperSize} {orientation === 'landscape' ? 'L' : 'P'}
          </span>
        </button>

        {/* Settings gear to open modal */}
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          title="Pengaturan Format & Ukuran Kertas Lengkap"
          className="px-2 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border-l border-slate-700 cursor-pointer"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Detail Modal */}
      <PrintFormatModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        documentTitle={documentTitle}
        defaultOrientation={orientation}
        recommendedOrientation={defaultOrientation}
        recommendedPaperSize={paperSize}
      />
    </div>
  );
};
