const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function sanitizeBaseName(name) {
  const raw = String(name || '').trim();
  if (!raw) return '';
  const base = raw.split(/[\\/]/).pop() || '';
  return base.replace(/[^a-z0-9._-]/gi, '_').slice(0, 100);
}

function extFromMime(mime) {
  const m = String(mime || '').toLowerCase();
  if (m === 'image/jpeg') return '.jpg';
  if (m === 'image/png') return '.png';
  if (m === 'image/webp') return '.webp';
  if (m === 'application/pdf') return '.pdf';
  if (m === 'application/zip') return '.zip';
  if (m === 'application/x-zip-compressed') return '.zip';
  if (m === 'text/plain') return '.txt';
  return '';
}

function isAllowedAttachmentMime(mime) {
  return !!extFromMime(mime);
}

function writeProjectAttachment({ buffer, mime, originalName, submissionId }) {
  const ext = extFromMime(mime);
  if (!ext) {
    const err = new Error('Unsupported attachment type');
    err.status = 415;
    throw err;
  }

  const safeName = sanitizeBaseName(originalName);
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  const rand = crypto.randomBytes(10).toString('hex');
  const fileName = `att_${stamp}_${rand}${safeName ? '_' + safeName.replace(/\.[^.]+$/, '') : ''}${ext}`;

  const baseDir = path.join(__dirname, '..', '..', '.data', 'project_uploads', String(submissionId));
  ensureDir(baseDir);
  const filePath = path.join(baseDir, fileName);
  fs.writeFileSync(filePath, buffer);
  return { fileName, filePath, baseDir };
}

function attachmentPath({ submissionId, fileName }) {
  const safe = String(fileName || '').trim();
  if (!safe || safe.includes('..') || safe.includes('/') || safe.includes('\\')) return null;
  const baseDir = path.join(__dirname, '..', '..', '.data', 'project_uploads', String(submissionId));
  return path.join(baseDir, safe);
}

module.exports = {
  isAllowedAttachmentMime,
  writeProjectAttachment,
  attachmentPath
};

