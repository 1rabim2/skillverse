import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

vi.mock('../../lib/adminApi', () => ({
  default: {
    get: vi.fn()
  }
}));

function AppRoutes({ ProtectedAdminRoute }) {
  return (
    <Routes>
      <Route
        path="/admin"
        element={
          <ProtectedAdminRoute>
            <div>ADMIN</div>
          </ProtectedAdminRoute>
        }
      />
      <Route path="/admin/login" element={<div>LOGIN</div>} />
    </Routes>
  );
}

describe('ProtectedAdminRoute', () => {
  it('renders children when /auth/me succeeds', async () => {
    const adminApi = (await import('../../lib/adminApi')).default;
    const ProtectedAdminRoute = (await import('./ProtectedAdminRoute')).default;
    adminApi.get.mockReset();
    adminApi.get.mockResolvedValueOnce({ data: { ok: true } });

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <AppRoutes ProtectedAdminRoute={ProtectedAdminRoute} />
      </MemoryRouter>
    );

    expect(screen.queryByText('ADMIN')).toBeNull();

    await waitFor(() => expect(screen.getByText('ADMIN')).toBeInTheDocument());
    expect(adminApi.get).toHaveBeenCalledWith('/auth/me');
  });

  it('redirects to /admin/login when /auth/me fails', async () => {
    const adminApi = (await import('../../lib/adminApi')).default;
    const ProtectedAdminRoute = (await import('./ProtectedAdminRoute')).default;
    adminApi.get.mockReset();
    adminApi.get.mockRejectedValueOnce(new Error('nope'));

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <AppRoutes ProtectedAdminRoute={ProtectedAdminRoute} />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText('LOGIN')).toBeInTheDocument());
    expect(adminApi.get).toHaveBeenCalledWith('/auth/me');
  });
});
