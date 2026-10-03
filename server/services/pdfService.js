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
 * Extract text and metadata from a PDF buffer.
 * @param {Buffer} buffer - Raw PDF file buffer
 * @returns {{ text: string, totalPages: number }}
 */
async function extractTextFromPDF(buffer) {
  try {
    const pdfParseModule = getPdfParser();
    let text = '';
    let totalPages = 1;

    if (typeof pdfParseModule === 'function') {
      const data = await pdfParseModule(buffer);
      text = data.text;
      totalPages = data.numpages || 1;
    } else if (pdfParseModule.PDFParse) {
      const parser = new pdfParseModule.PDFParse({ data: buffer });
      const result = await parser.getText();
      text = result.text || '';
      totalPages = result.total || result.pages?.length || 1;
      if (typeof parser.destroy === 'function') {
        parser.destroy();
      }
    } else {
      throw new Error('Unsupported pdf-parse module format');
    }

    if (!text || text.trim().length === 0) {
      throw new Error('PDF appears to be empty or contains only images — no extractable text found.');
    }

    return {
      text: text.trim(),
      totalPages,
    };
  } catch (error) {
    if (error.message.includes('empty or contains')) {
      throw error;
    }
    throw new Error(`Failed to parse PDF: ${error.message}`);
  }
}

module.exports = { extractTextFromPDF };
