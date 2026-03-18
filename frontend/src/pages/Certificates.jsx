import React from 'react';
import { API_BASE } from '../lib/apiBase';

export default function Certificates() {
  const token = localStorage.getItem('token');
  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    let mounted = true;
    async function load() {
      try {
        setLoading(true);
        setError('');
        const res = await fetch(`${API_BASE}/user/me/certificates`, { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        if (!res.ok) {
          const msg = data?.error || 'Failed to load certificates';
          if (res.status === 404 && msg.toLowerCase().includes('user not found')) {
            localStorage.removeItem('token');
            throw new Error('Session expired (user no longer exists). Please login again.');
          }
          if (res.status === 401 || res.status === 403) localStorage.removeItem('token');
          throw new Error(msg);
        }
        if (mounted) setItems(Array.isArray(data.items) ? data.items : []);
      } catch (err) {
        if (mounted) setError(err.message);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [token]);

  if (!token) {
    return (
      <div style={{ minHeight: '70vh', display: 'grid', placeItems: 'center', padding: 24 }}>
        <div style={{ maxWidth: 520, background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 8px 24px rgba(15,23,42,0.08)' }}>
          <h2 style={{ marginTop: 0 }}>My Certificates</h2>
          <p>You are not logged in as a student. Please login first.</p>
          <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
            <button className="sv-cta" onClick={() => { window.location.href = '/login'; }}>
              Go to Student Login
            </button>
            <button
              style={{ border: '1px solid #d1d5db', background: '#fff', borderRadius: 8, padding: '8px 12px', cursor: 'pointer' }}
              onClick={() => { window.location.href = '/dashboard'; }}
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) return <div style={{ padding: 24 }}>Loading certificates...</div>;
  if (error) return <div style={{ padding: 24 }}>Could not load certificates: {error}</div>;

  return (
    <div style={{ minHeight: '100vh', background: '#0b1220', color: '#e5e7eb', padding: 24 }}>
      <div style={{ maxWidth: 980, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ margin: 0 }}>My Certificates</h1>
            <p style={{ marginTop: 8, color: '#94a3b8' }}>Certificates issued after completing courses.</p>
          </div>
          <button
            onClick={() => (window.location.href = '/dashboard')}
            style={{ border: '1px solid #334155', background: 'transparent', color: '#e5e7eb', borderRadius: 10, padding: '10px 12px', cursor: 'pointer' }}
          >
            Back to Dashboard
          </button>
        </div>

        <div style={{ marginTop: 16, background: '#0f172a', border: '1px solid #1f2a44', borderRadius: 16, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#0b1220' }}>
                <th style={{ textAlign: 'left', padding: 12, borderBottom: '1px solid #1f2a44' }}>Certificate ID</th>
                <th style={{ textAlign: 'left', padding: 12, borderBottom: '1px solid #1f2a44' }}>Course</th>
                <th style={{ textAlign: 'left', padding: 12, borderBottom: '1px solid #1f2a44' }}>Issued</th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c._id || c.certificateId} style={{ borderBottom: '1px solid rgba(31,42,68,0.7)' }}>
                  <td style={{ padding: 12, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' }}>
                    {c.certificateId}
                  </td>
                  <td style={{ padding: 12 }}>{c.course?.title || 'Course'}</td>
                  <td style={{ padding: 12 }}>{c.issuedAt ? new Date(c.issuedAt).toLocaleString() : '-'}</td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={3} style={{ padding: 12, color: '#94a3b8' }}>
                    No certificates yet. Complete a course to generate one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
