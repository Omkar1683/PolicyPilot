/**
 * pdfService.js
 *
 * Extracts text from a PDF buffer using pdf-parse.
 * Handles both v1 (function) and v2 (PDFParse class).
 */
// Lazy-load pdf-parse so it does not execute during cold starts for non-upload endpoints
let cachedPdfParse = null;
function getPdfParser() {
  if (!cachedPdfParse) {
    cachedPdfParse = require('pdf-parse');
  }
  return cachedPdfParse;
}

/**
 * Resolves the PDF parser implementation regardless of whether
 * it was loaded as CJS, ESM, wrapped in .default, or v1 / v2.
 */
function resolveParser(rawModule) {
  const mod =
    rawModule?.default && (rawModule.default.PDFParse || typeof rawModule.default === 'function')
      ? rawModule.default
      : rawModule;

  // 1. Check for v2 PDFParse class
  const PDFParseClass =
    mod?.PDFParse ||
    rawModule?.PDFParse ||
    (typeof mod === 'function' && mod.prototype?.getText ? mod : null);

  if (PDFParseClass) {
    return async (buffer) => {
      const parser = new PDFParseClass({ data: buffer });
      try {
        const result = await parser.getText();
        return {
          text: result?.text || '',
          totalPages: result?.total || result?.pages?.length || 1,
        };
      } finally {
        if (typeof parser.destroy === 'function') {
          try {
            parser.destroy();
          } catch {}
        }
      }
    };
  }

  // 2. Check for v1 function
  const v1Fn =
    typeof mod === 'function'
      ? mod
      : typeof rawModule?.default === 'function'
      ? rawModule.default
      : null;

  if (v1Fn) {
    return async (buffer) => {
      const data = await v1Fn(buffer);
      return {
        text: data?.text || '',
        totalPages: data?.numpages || 1,
      };
    };
  }

  return null;
}

/**
 * Extract text and metadata from a PDF buffer.
 * @param {Buffer} buffer - Raw PDF file buffer
 * @returns {{ text: string, totalPages: number }}
 */
async function extractTextFromPDF(buffer) {
  try {
    const rawModule = getPdfParser();
    const parseFn = resolveParser(rawModule);

    if (!parseFn) {
      console.error('❌ Unknown pdf-parse module structure:', typeof rawModule, Object.keys(rawModule || {}));
      throw new Error('Unsupported pdf-parse module format');
    }

    const { text, totalPages } = await parseFn(buffer);

    if (!text || text.trim().length === 0) {
      throw new Error('PDF appears to be empty or contains only images — no extractable text found.');
    }

    return {
      text: text.trim(),
      totalPages: totalPages || 1,
    };
  } catch (error) {
    if (error.message.includes('empty or contains')) {
      throw error;
    }
    throw new Error(`Failed to parse PDF: ${error.message}`);
  }
}

module.exports = { extractTextFromPDF };
