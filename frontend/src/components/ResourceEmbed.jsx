import React from 'react';

function isPdf(url) {
  return /\.pdf(\?|#|$)/i.test(String(url || '').trim());
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

function googleDocsEmbed(url) {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '');
    if (!host.endsWith('docs.google.com')) return '';
    // For many Google Docs/Sheets/Slides URLs, `embedded=true` triggers an embeddable view.
    if (!u.searchParams.has('embedded')) u.searchParams.set('embedded', 'true');
    return u.toString();
  } catch {
    return '';
  }
}

function embedInfo(url) {
  const raw = String(url || '').trim();
  if (!raw) return { kind: 'none' };
  if (isPdf(raw)) return { kind: 'iframe', src: raw, mode: 'pdf' };

  const drive = googleDrivePreview(raw);
  if (drive) return { kind: 'iframe', src: drive, mode: 'ratio' };

  const docs = googleDocsEmbed(raw);
  if (docs) return { kind: 'iframe', src: docs, mode: 'ratio' };

  // Try to embed generic links; some sites block iframing via X-Frame-Options/CSP.
  return { kind: 'iframe', src: raw, mode: 'ratio' };
}

export default function ResourceEmbed({ url, title = 'Resource', defaultOpen = true }) {
  const info = embedInfo(url);
  const [open, setOpen] = React.useState(defaultOpen);

  if (info.kind === 'none') return null;

  return (
    <div style={{ marginTop: 10 }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          border: '1px solid rgba(15,23,42,0.12)',
          background: '#fff',
          borderRadius: 12,
          padding: '10px 12px',
          cursor: 'pointer',
          fontWeight: 800
        }}
      >
        {open ? 'Hide resource' : 'Preview resource'}
      </button>

      {open ? (
        <div style={{ marginTop: 10 }}>
          {info.mode === 'pdf' ? (
            <iframe
              src={info.src}
              title={title}
              style={{
                width: '100%',
                height: 560,
                borderRadius: 14,
                overflow: 'hidden',
                border: '1px solid rgba(15,23,42,0.10)',
                background: '#fff'
              }}
            />
          ) : (
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
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
              />
            </div>
          )}

          <div style={{ marginTop: 8, fontSize: 12, color: '#64748b' }}>
            If the preview is blank, that site blocks embedding. Use “Open resource link” below.
          </div>
        </div>
      ) : null}
    </div>
  );
}
