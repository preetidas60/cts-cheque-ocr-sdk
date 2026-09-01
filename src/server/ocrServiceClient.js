/**
 * ocrServiceClient.js
 * -------------------
 * Outbound REST client to Python OCR service (PaddleOCR, FastAPI).
 * Default endpoint: http://localhost:8000
 */

const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

let activeOcrUrl = 'http://localhost:8000';

function getOcrServiceUrl() {
  try {
    const envPath = path.resolve(__dirname, '..', '..', '.env');
    if (fs.existsSync(envPath)) {
      const parsed = dotenv.parse(fs.readFileSync(envPath));
      if (parsed.OCR_SERVICE_URL && parsed.OCR_SERVICE_URL.trim()) {
        return parsed.OCR_SERVICE_URL.trim().replace(/\/+$/, '');
      }
    }
  } catch (ex) {}
  return (process.env.OCR_SERVICE_URL || activeOcrUrl || 'http://localhost:8000').trim().replace(/\/+$/, '');
}

function setOcrServiceUrl(url) {
  if (url && typeof url === 'string' && url.trim().length > 0) {
    activeOcrUrl = url.trim().replace(/\/+$/, '');
  }
  return getOcrServiceUrl();
}

function resolveUrl(overrideUrl) {
  if (overrideUrl && typeof overrideUrl === 'string' && overrideUrl.trim().length > 0) {
    return overrideUrl.trim().replace(/\/+$/, '');
  }
  return getOcrServiceUrl();
}

function defaultHeaders(extraHeaders = {}) {
  return {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
    'User-Agent': 'CTS-Cheque-OCR-Client/1.0',
    ...extraHeaders,
  };
}

async function ensureEnginePool(size, customUrl) {
  const baseUrl = resolveUrl(customUrl);
  try {
    const res = await fetch(`${baseUrl}/pool/ensure`, {
      method: 'POST',
      headers: defaultHeaders(),
      body: JSON.stringify({ size: size }),
    });
    if (!res.ok) return 0;
    const body = await res.json();
    return typeof body.poolSize === 'number' ? body.poolSize : 0;
  } catch (ex) {
    console.warn(`[OCR] Could not pre-warm OCR pool at ${baseUrl} to ${size}: ${ex.message}`);
    return 0;
  }
}

async function getPageCount(filePath, fileName, customUrl) {
  const absPath = path.resolve(filePath);
  const baseUrl = resolveUrl(customUrl);
  const fileBase64 = fs.existsSync(absPath) ? fs.readFileSync(absPath).toString('base64') : '';

  const res = await fetch(`${baseUrl}/pdf/page-count`, {
    method: 'POST',
    headers: defaultHeaders(),
    body: JSON.stringify({
      pdfPath: absPath,
      fileName: fileName || path.basename(absPath),
      fileContentBase64: fileBase64,
    }),
  });
  if (!res.ok) {
    throw new Error(`Failed to read document — is OCR service running on ${baseUrl}? Status: ${res.status}`);
  }
  const body = await res.json();
  return body.pageCount || 1;
}

async function ocrPage(filePath, fileName, pageNumber = 1, customUrl) {
  const absPath = path.resolve(filePath);
  const baseUrl = resolveUrl(customUrl);
  const fileBase64 = fs.existsSync(absPath) ? fs.readFileSync(absPath).toString('base64') : '';

  const res = await fetch(`${baseUrl}/ocr/page`, {
    method: 'POST',
    headers: defaultHeaders(),
    body: JSON.stringify({
      pdfPath: absPath,
      fileName: fileName || path.basename(absPath),
      fileContentBase64: fileBase64,
      pageNumber: pageNumber,
    }),
  });

  if (!res.ok) {
    const textErr = await res.text().catch(() => '');
    throw new Error(`OCR call failed for page ${pageNumber} on ${baseUrl} (HTTP ${res.status}) ${textErr.substring(0, 100)}`);
  }
  return await res.json();
}

async function renderPage(filePath, fileName, pageNumber = 1, scale = 2.5, customUrl) {
  const absPath = path.resolve(filePath);
  const baseUrl = resolveUrl(customUrl);
  const fileBase64 = fs.existsSync(absPath) ? fs.readFileSync(absPath).toString('base64') : '';

  const res = await fetch(`${baseUrl}/render/page`, {
    method: 'POST',
    headers: defaultHeaders({ 'Accept': 'image/png' }),
    body: JSON.stringify({
      pdfPath: absPath,
      fileName: fileName || path.basename(absPath),
      fileContentBase64: fileBase64,
      pageNumber: pageNumber,
      scale: scale,
    }),
  });
  if (!res.ok) {
    throw new Error(`Could not render page ${pageNumber} on ${baseUrl} (HTTP ${res.status})`);
  }
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

module.exports = {
  getOcrServiceUrl,
  setOcrServiceUrl,
  ensureEnginePool,
  getPageCount,
  ocrPage,
  renderPage,
};
