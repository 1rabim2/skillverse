import React from 'react';

function isMediaUrl(url) {
  return /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i.test(String(url || '').trim());
}

function youtubeId(url) {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '');
    if (host === 'youtu.be') return u.pathname.split('/').filter(Boolean)[0] || '';
    if (!host.endsWith('youtube.com')) return '';
    if (u.pathname === '/watch') return u.searchParams.get('v') || '';
    const parts = u.pathname.split('/').filter(Boolean);
    const idx = parts.findIndex((p) => p === 'embed' || p === 'shorts');
    if (idx >= 0 && parts[idx + 1]) return parts[idx + 1];
    return '';
  } catch {
    return '';
  }
}

function vimeoId(url) {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '');
    if (!host.endsWith('vimeo.com')) return '';
    const parts = u.pathname.split('/').filter(Boolean);
    const id = parts.find((p) => /^\d+$/.test(p));
    return id || '';
  } catch {
    return '';
  }
}

function googleDrivePreview(url) {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '');
    if (!host.endsWith('drive.google.com')) return '';
    const parts = u.pathname.split('/').filter(Boolean);
    const dIndex = parts.findIndex((p) => p === 'd');
    const fileId = dIndex >= 0 ? parts[dIndex + 1] : '';
    if (fileId) return `https://drive.google.com/file/d/${fileId}/preview`;
    return '';
  } catch {
    return '';
  }
}

function embedInfo(url) {
  const raw = String(url || '').trim();
  if (!raw) return { kind: 'none' };
  if (isMediaUrl(raw)) return { kind: 'video', src: raw };

  const yid = youtubeId(raw);
  if (yid) return { kind: 'iframe', src: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(yid)}?rel=0` };

  const vid = vimeoId(raw);
  if (vid) return { kind: 'iframe', src: `https://player.vimeo.com/video/${encodeURIComponent(vid)}` };

  const drive = googleDrivePreview(raw);
  if (drive) return { kind: 'iframe', src: drive };

  // If it's already an embed/preview URL, try it directly.
  if (/\/embed\/|\/preview\b/i.test(raw)) return { kind: 'iframe', src: raw };

  return { kind: 'link', src: raw };
}

export default function VideoEmbed({ url, title = 'Video' }) {
  const info = embedInfo(url);
  if (info.kind === 'none') return null;

  if (info.kind === 'video') {
    return (
      <div style={{ marginTop: 12 }}>
        <video
          src={info.src}
          controls
          playsInline
          style={{
            width: '100%',
            borderRadius: 14,
            border: '1px solid rgba(15,23,42,0.10)',
            background: '#000'
          }}
        />
      </div>
    );
  }

  if (info.kind === 'iframe') {
    return (
      <div style={{ marginTop: 12 }}>
        <div
          style={{
            position: 'relative',
            width: '100%',
            paddingTop: '56.25%',
            borderRadius: 14,
            overflow: 'hidden',
            border: '1px solid rgba(15,23,42,0.10)',
            background: '#0b1220'
          }}
        >
          <iframe
            src={info.src}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
          />
        </div>
      </div>
    );
  }

  // Fallback: provider doesn't allow embedding or unrecognized link.
  return null;
}
