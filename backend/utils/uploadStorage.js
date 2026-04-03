const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function safeExtFromMime(mime) {
  const m = String(mime || '').toLowerCase();
  if (m === 'image/jpeg') return '.jpg';
  if (m === 'image/png') return '.png';
  if (m === 'image/webp') return '.webp';
  if (m === 'image/gif') return '.gif';
  if (m === 'video/mp4') return '.mp4';
  if (m === 'video/webm') return '.webm';
  if (m === 'video/quicktime') return '.mov';
  return '';
}

function sanitizeBaseName(name) {
  const raw = String(name || '').trim();
  if (!raw) return '';
  const base = raw.split(/[\\/]/).pop() || '';
  return base.replace(/[^a-z0-9._-]/gi, '_').slice(0, 80);
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeUpload({ buffer, mime, originalName, kind }) {
  const type = String(kind || '').toLowerCase();
  if (!['images', 'videos'].includes(type)) {
    const err = new Error('Invalid upload kind');
    err.status = 400;
    throw err;
  }

  const ext = safeExtFromMime(mime);
  if (!ext) {
    const err = new Error('Unsupported content type');
    err.status = 415;
    throw err;
  }

  const dataDir = path.join(__dirname, '..', '..', '.data', 'uploads', type);
  ensureDir(dataDir);

  const baseName = sanitizeBaseName(originalName);
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  const rand = crypto.randomBytes(8).toString('hex');
  const fileName = `${type.slice(0, -1)}_${stamp}_${rand}${baseName ? '_' + baseName.replace(/\.[^.]+$/, '') : ''}${ext}`;
  const filePath = path.join(dataDir, fileName);
  fs.writeFileSync(filePath, buffer);

  return {
    fileName,
    filePath,
    publicUrl: `/uploads/${type}/${fileName}`
  };
}

module.exports = { writeUpload };

