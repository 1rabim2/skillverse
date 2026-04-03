import { adminFetch, apiFetch } from './apiFetch';
import { SERVER_BASE } from './apiBase';

async function uploadViaFetch(fetchFn, path, file) {
  if (!file) throw new Error('No file selected');
  const res = await fetchFn(path, {
    method: 'POST',
    headers: {
      'Content-Type': file.type || 'application/octet-stream',
      'X-Filename': file.name || 'upload'
    },
    body: file
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || 'Upload failed');

  const url = String(data?.url || '');
  if (url.startsWith('/uploads/')) return { ...data, url: `${SERVER_BASE}${url}` };
  return data;
}

export function uploadAdminImage(file) {
  return uploadViaFetch(adminFetch, '/uploads/image', file);
}

export function uploadAdminVideo(file) {
  return uploadViaFetch(adminFetch, '/uploads/video', file);
}

export function uploadUserImage(file) {
  return uploadViaFetch(apiFetch, '/user/uploads/image', file);
}

export function uploadUserVideo(file) {
  return uploadViaFetch(apiFetch, '/user/uploads/video', file);
}

