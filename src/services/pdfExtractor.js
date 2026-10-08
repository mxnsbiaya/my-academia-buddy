/**
 * PDF Text Extractor Service — My Academia Buddy Phase 2
 * Client-side PDF text extraction using pdfjs-dist.
 * Extracts text page-by-page, preserves line layouts, and detects scanned/image-only PDFs.
 */

let pdfjsLibCache = null;

/**
 * Dynamically loads pdfjs-dist and configures the worker safely for browser & test environments.
 */
export async function getPdfjsLib() {
  if (pdfjsLibCache) return pdfjsLibCache;

  try {
    const pdfjs = await import('pdfjs-dist');
    if (typeof window !== 'undefined' && !pdfjs.GlobalWorkerOptions.workerSrc) {
      try {
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          'pdfjs-dist/build/pdf.worker.mjs',
          import.meta.url
        ).href;
      } catch {
        pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version || '4.0.0'}/build/pdf.worker.min.mjs`;
      }
    }
    pdfjsLibCache = pdfjs;
    return pdfjs;
  } catch (err) {
    console.warn('[pdfExtractor] pdfjs-dist dynamic import failed, operating in fallback mode:', err);
    return null;
  }
}

/**
 * Extracts plain text page by page from an ArrayBuffer or File
 * 
 * @param {ArrayBuffer|Uint8Array} data
 * @param {object} options
 * @param {(progress: { percent: number, stage: string, page: number, totalPages: number }) => void} options.onProgress
 * @returns {Promise<{
 *   numPages: number,
 *   pages: Array<{ pageNumber: number, text: string, charCount: number, wordCount: number }>,
 *   fullText: string,
 *   isScanned: boolean,
 *   scannedWarning: string|null,
 * }>}
 */
export async function extractTextFromPdfData(data, { onProgress } = {}) {
  const pdfjs = await getPdfjsLib();

  if (!pdfjs) {
    throw new Error('PDF extraction engine is not available. Please paste text directly or use a supported browser.');
  }

  const loadingTask = pdfjs.getDocument({
    data,
    useSystemFonts: true,
    isEvalSupported: false,
  });

  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;
  const pages = [];
  let totalChars = 0;
  let totalWords = 0;

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    if (onProgress) {
      onProgress({
        percent: Math.round((pageNum / numPages) * 100),
        stage: `Reading page ${pageNum} of ${numPages}`,
        page: pageNum,
        totalPages: numPages,
      });
    }

    const page = await pdfDoc.getPage(pageNum);
    const textContent = await page.getTextContent();
    
    // Group text items by vertical position (Y coordinate) to reconstruct lines accurately
    const lineMap = new Map();

    textContent.items.forEach((item) => {
      if (!item.str) return;
      // Approximate line grouping by rounding translateY to integer
      const y = Math.round(item.transform?.[5] || 0);
      const existing = lineMap.get(y) || [];
      existing.push({
        x: item.transform?.[4] || 0,
        text: item.str,
      });
      lineMap.set(y, existing);
    });

    // Sort lines from top of page to bottom (descending Y in PDF coordinates)
    const sortedY = Array.from(lineMap.keys()).sort((a, b) => b - a);
    const pageLines = [];

    sortedY.forEach((y) => {
      const itemsInLine = lineMap.get(y) || [];
      // Sort items within line from left to right
      itemsInLine.sort((a, b) => a.x - b.x);
      const lineText = itemsInLine.map((i) => i.text).join(' ').trim();
      if (lineText) {
        pageLines.push(lineText);
      }
    });

    const pageText = pageLines.join('\n');
    const charCount = pageText.length;
    const wordCount = pageText.split(/\s+/).filter(Boolean).length;

    totalChars += charCount;
    totalWords += wordCount;

    pages.push({
      pageNumber: pageNum,
      text: pageText,
      charCount,
      wordCount,
    });
  }

  const fullText = pages.map((p) => p.text).join('\n\n--- Page Break ---\n\n');

  // Detect scanned or image-based PDFs
  // A standard text-based syllabus page has at least 50-100 words.
  // If the entire document has < 60 characters or average words per page < 12, it is almost certainly a scan/image.
  const avgWordsPerPage = numPages > 0 ? totalWords / numPages : 0;
  const isScanned = totalChars < 80 || avgWordsPerPage < 12;

  let scannedWarning = null;
  if (isScanned) {
    scannedWarning =
      'This PDF appears to be a scanned image or document with non-selectable text. Reliable text extraction is unavailable without OCR. You can use our "Paste Text" tab to paste the syllabus content directly.';
  }

  return {
    numPages,
    pages,
    fullText,
    isScanned,
    scannedWarning,
  };
}

/**
 * Extracts text from a browser File object
 * 
 * @param {File} file
 * @param {object} options
 * @returns {Promise<object>}
 */
export async function extractTextFromPdfFile(file, options = {}) {
  if (!file) throw new Error('No file provided for extraction');
  const arrayBuffer = await file.arrayBuffer();
  const result = await extractTextFromPdfData(arrayBuffer, options);
  return {
    ...result,
    fileName: file.name,
    fileSize: file.size,
  };
}

/**
 * Helper to determine if a parsed extraction result is a scanned/image-only PDF
 */
export function isScannedPdf(extractionResult) {
  if (!extractionResult) return false;
  if (extractionResult.isScanned !== undefined) return extractionResult.isScanned;
  const chars = extractionResult.totalCharacters || extractionResult.fullText?.length || 0;
  const pages = extractionResult.numPages || extractionResult.pageCount || 1;
  return chars < 80 || (chars / pages) < 50;
}

export const extractTextFromPdf = extractTextFromPdfFile;
