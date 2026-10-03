/**
 * Browser API polyfills for Node.js / Serverless environments.
 * Modern pdfjs-dist / pdf-parse v2 requires DOMMatrix, Path2D, and ImageData.
 */
if (typeof globalThis.DOMMatrix === 'undefined') {
  globalThis.DOMMatrix = class DOMMatrix {
    constructor(init) {
      this.a = 1; this.b = 0; this.c = 0; this.d = 1; this.e = 0; this.f = 0;
      this.m11 = 1; this.m12 = 0; this.m13 = 0; this.m14 = 0;
      this.m21 = 0; this.m22 = 1; this.m23 = 0; this.m24 = 0;
      this.m31 = 0; this.m32 = 0; this.m33 = 1; this.m34 = 0;
      this.m41 = 0; this.m42 = 0; this.m43 = 0; this.m44 = 1;
      this.is2D = true;
      this.isIdentity = true;
      if (Array.isArray(init) && init.length >= 6) {
        this.a = this.m11 = init[0];
        this.b = this.m12 = init[1];
        this.c = this.m21 = init[2];
        this.d = this.m22 = init[3];
        this.e = this.m41 = init[4];
        this.f = this.m42 = init[5];
      }
    }
    multiply() { return new DOMMatrix(); }
    inverse() { return new DOMMatrix(); }
    translate() { return new DOMMatrix(); }
    scale() { return new DOMMatrix(); }
    transformPoint(p = {}) { return { x: p.x || 0, y: p.y || 0, z: p.z || 0, w: p.w || 1 }; }
  };
}

if (typeof globalThis.Path2D === 'undefined') {
  globalThis.Path2D = class Path2D {
    constructor() {}
    addPath() {}
  };
}

if (typeof globalThis.ImageData === 'undefined') {
  globalThis.ImageData = class ImageData {
    constructor(w = 0, h = 0) {
      this.width = w;
      this.height = h;
      this.data = new Uint8ClampedArray((w || 1) * (h || 1) * 4);
    }
  };
}

// Lazy-load pdf-parse so it does not execute during cold starts for non-upload endpoints
let cachedPdfParse = null;
function getPdfParser() {
  if (!cachedPdfParse) {
    cachedPdfParse = require('pdf-parse');
  }
  return cachedPdfParse;
}

/**
 * Fallback text extractor from raw PDF stream if the primary parser fails.
 */
function fallbackExtractText(buffer) {
  try {
    const raw = buffer.toString('latin1');
    const textChunks = [];
    const btEtRegex = /BT[\s\S]*?ET/g;
    let match;
    while ((match = btEtRegex.exec(raw)) !== null) {
      const block = match[0];
      const tjRegex = /\(([^)]*)\)\s*Tj/g;
      let tjMatch;
      while ((tjMatch = tjRegex.exec(block)) !== null) {
        textChunks.push(tjMatch[1]);
      }
      const tjArrayRegex = /\[([^\]]*)\]\s*TJ/g;
      let arrayMatch;
      while ((arrayMatch = tjArrayRegex.exec(block)) !== null) {
        const inner = arrayMatch[1];
        const innerTjRegex = /\(([^)]*)\)/g;
        let innerMatch;
        while ((innerMatch = innerTjRegex.exec(inner)) !== null) {
          textChunks.push(innerMatch[1]);
        }
      }
    }
    const combined = textChunks.join(' ').replace(/\s+/g, ' ').trim();
    if (combined.length > 20) {
      const pageCount = (raw.match(/\/Type\s*\/Page\b/g) || []).length || 1;
      return { text: combined, totalPages: pageCount };
    }
  } catch {}
  return null;
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

    if (parseFn) {
      try {
        const { text, totalPages } = await parseFn(buffer);
        if (text && text.trim().length > 0) {
          return {
            text: text.trim(),
            totalPages: totalPages || 1,
          };
        }
      } catch (parserErr) {
        console.warn('⚠️ Primary PDF parser failed, trying fallback stream extraction:', parserErr.message);
      }
    }

    // Try fallback text extraction
    const fallback = fallbackExtractText(buffer);
    if (fallback && fallback.text.length > 0) {
      return fallback;
    }

    throw new Error('PDF appears to be empty or contains only images — no extractable text found.');
  } catch (error) {
    if (error.message.includes('empty or contains')) {
      throw error;
    }
    throw new Error(`Failed to parse PDF: ${error.message}`);
  }
}

module.exports = { extractTextFromPDF };
