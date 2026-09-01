/**
 * ocrServiceClient.js
 * -------------------
 * Outbound REST client to Python OCR service (PaddleOCR, FastAPI).
 * Default endpoint: http://localhost:8000
 */

const path = require('path');
const fs = require('fs');

let activeOcrUrl = process.env.OCR_SERVICE_URL || 'http://localhost:8000';

function getOcrServiceUrl() {
  return activeOcrUrl;
}

function setOcrServiceUrl(url) {
  if (url && typeof url === 'string' && url.trim().length > 0) {
    activeOcrUrl = url.trim().replace(/\/+$/, '');
  }
  return activeOcrUrl;
}

function resolveUrl(overrideUrl) {
  if (overrideUrl && typeof overrideUrl === 'string' && overrideUrl.trim().length > 0) {
    return overrideUrl.trim().replace(/\/+$/, '');
  }
  return activeOcrUrl;
}

async function ensureEnginePool(size, customUrl) {
  const baseUrl = resolveUrl(customUrl);
  try {
    const res = await fetch(`${baseUrl}/pool/ensure`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ size: size }),
    });
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
  const res = await fetch(`${baseUrl}/pdf/page-count`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pdfPath: absPath }),
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
  const res = await fetch(`${baseUrl}/ocr/page`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      pdfPath: absPath,
      pageNumber: pageNumber,
    }),
  });
  if (!res.ok) {
    throw new Error(`OCR call failed for page ${pageNumber} on ${baseUrl} (HTTP ${res.status})`);
  }
  return await res.json();
}

async function renderPage(filePath, fileName, pageNumber = 1, scale = 2.5, customUrl) {
  const absPath = path.resolve(filePath);
  const baseUrl = resolveUrl(customUrl);
  const res = await fetch(`${baseUrl}/render/page`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'image/png',
    },
    body: JSON.stringify({
      pdfPath: absPath,
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
