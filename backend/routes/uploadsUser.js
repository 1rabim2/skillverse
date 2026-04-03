const express = require('express');
const { writeUpload } = require('../utils/uploadStorage');

const router = express.Router();

function rawParser(limit) {
  return express.raw({
    type: [
      'image/*',
      'video/*',
      'application/octet-stream'
    ],
    limit
  });
}

function getOriginalName(req) {
  const header = req.headers['x-filename'] || req.headers['x-file-name'];
  return String(header || '').trim();
}

router.post('/image', rawParser('6mb'), async (req, res) => {
  try {
    const mime = String(req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
    if (!mime.startsWith('image/')) return res.status(415).json({ error: 'Expected an image upload' });
    const size = Buffer.byteLength(req.body || Buffer.alloc(0));
    if (!size) return res.status(400).json({ error: 'Empty upload' });
    if (size > 6 * 1024 * 1024) return res.status(413).json({ error: 'Image too large (max 6MB)' });

    const stored = writeUpload({
      buffer: Buffer.from(req.body),
      mime,
      originalName: getOriginalName(req),
      kind: 'images'
    });

    res.json({ url: stored.publicUrl, fileName: stored.fileName, mime, size });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'Upload failed' });
  }
});

router.post('/video', rawParser('250mb'), async (req, res) => {
  try {
    const mime = String(req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
    if (!mime.startsWith('video/')) return res.status(415).json({ error: 'Expected a video upload' });
    const size = Buffer.byteLength(req.body || Buffer.alloc(0));
    if (!size) return res.status(400).json({ error: 'Empty upload' });
    if (size > 250 * 1024 * 1024) return res.status(413).json({ error: 'Video too large (max 250MB)' });

    const stored = writeUpload({
      buffer: Buffer.from(req.body),
      mime,
      originalName: getOriginalName(req),
      kind: 'videos'
    });

    res.json({ url: stored.publicUrl, fileName: stored.fileName, mime, size });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'Upload failed' });
  }
});

module.exports = router;

