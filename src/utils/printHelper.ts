/**
 * SantriPay Syariah - Print & Paper Management Helper
 * Supports:
 * - A4: 210mm x 297mm (Standard International)
 * - F4 / Folio: 215mm x 330mm (Standard Indonesian HVS/Folio)
 * - Orientations: Portrait (Tegak) & Landscape (Mendatar)
 */

export type PaperSize = 'A4' | 'F4';
export type PaperOrientation = 'portrait' | 'landscape';

export interface PrintSettings {
  paperSize: PaperSize;
  orientation: PaperOrientation;
  showKop: boolean;
  showSignatures: boolean;
  fontSizeScale?: 'compact' | 'normal' | 'spacious';
}

const STORAGE_KEY_PRINT = 'santripay_print_settings_v1';

export const DEFAULT_PRINT_SETTINGS: PrintSettings = {
  paperSize: 'A4',
  orientation: 'landscape', // Landscape is preferred for multi-column accounting books
  showKop: true,
  showSignatures: true,
  fontSizeScale: 'normal',
};

/**
 * Paper dimensions metadata (in millimeters)
 */
export const PAPER_DIMENSIONS = {
  A4: {
    name: 'A4 (Standar Internasional)',
    short: 'A4',
    widthMm: 210,
    heightMm: 297,
    description: 'Ukuran 210 × 297 mm. Standar internasional untuk dokumen resmi & arsip.',
  },
  F4: {
    name: 'F4 / Folio (HVS Indonesia)',
    short: 'F4 / Folio',
    widthMm: 215,
    heightMm: 330,
    description: 'Ukuran 215 × 330 mm. Standar kertas panjang perkantoran & pesantren Indonesia.',
  },
};

/**
 * Load saved print settings from localStorage
 */
export const getSavedPrintSettings = (defaultOrientation: PaperOrientation = 'landscape'): PrintSettings => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_PRINT);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        ...DEFAULT_PRINT_SETTINGS,
        orientation: defaultOrientation,
        ...parsed,
      };
    }
  } catch (e) {
    console.warn('Could not read saved print settings', e);
  }
  return {
    ...DEFAULT_PRINT_SETTINGS,
    orientation: defaultOrientation,
  };
};

/**
 * Save print settings to localStorage
 */
export const savePrintSettings = (settings: PrintSettings): void => {
  try {
    localStorage.setItem(STORAGE_KEY_PRINT, JSON.stringify(settings));
  } catch (e) {
    console.warn('Could not save print settings', e);
  }
};

/**
 * Inject dynamic @page CSS rule into the DOM to enforce exact paper size & orientation
 */
export const applyPrintPageStyle = (
  paperSize: PaperSize,
  orientation: PaperOrientation,
  marginMm: number = 10
): void => {
  const STYLE_ID = 'santripay-dynamic-print-style';
  let styleEl = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = STYLE_ID;
    document.head.appendChild(styleEl);
  }

  // Calculate CSS size descriptor
  // For A4: 'A4 portrait' or 'A4 landscape'
  // For F4: '215mm 330mm' for portrait or '330mm 215mm' for landscape
  let sizeCss = '';
  if (paperSize === 'A4') {
    sizeCss = orientation === 'portrait' ? 'A4 portrait' : 'A4 landscape';
  } else {
    // F4 / Folio Indonesia
    sizeCss = orientation === 'portrait' ? '215mm 330mm' : '330mm 215mm';
  }

  // Margins tailored for orientation
  const topMargin = orientation === 'portrait' ? `${marginMm + 2}mm` : `${marginMm}mm`;
  const bottomMargin = orientation === 'portrait' ? `${marginMm + 2}mm` : `${marginMm}mm`;
  const sideMargin = `${marginMm}mm`;

  styleEl.textContent = `
    @page {
      size: ${sizeCss};
      margin: ${topMargin} ${sideMargin} ${bottomMargin} ${sideMargin};
    }
    @media print {
      body {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .santripay-print-area {
        width: 100% !important;
        max-width: 100% !important;
      }
    }
  `;

  // Update body data-attributes for additional CSS targets if needed
  document.body.setAttribute('data-paper-size', paperSize);
  document.body.setAttribute('data-paper-orientation', orientation);
};

/**
 * Executes browser print with specified paper and orientation
 */
export const executePrint = (
  paperSize: PaperSize,
  orientation: PaperOrientation,
  onAfterPrint?: () => void
): void => {
  applyPrintPageStyle(paperSize, orientation);

  // Small delay to allow CSS style element computation in browser layout engine
  setTimeout(() => {
    window.print();
    if (onAfterPrint) {
      onAfterPrint();
    }
  }, 50);
};
