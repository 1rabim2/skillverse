import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { apiFetch } from '../../lib/apiFetch';

function homeForRole(role) {
  const r = String(role || '').toLowerCase();
  if (r === 'admin') return '/admin/dashboard';
  if (r === 'instructor') return '/instructor/dashboard';
  return '/dashboard';
}

export default function ProtectedRoute({ allow = [], children }) {
  const location = useLocation();
  const [state, setState] = React.useState({ status: 'checking', user: null }); // checking | ok | no

  React.useEffect(() => {
    let mounted = true;
    apiFetch('/auth/me')
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!mounted) return;
        if (!res.ok || !data?.user) return setState({ status: 'no', user: null });
        return setState({ status: 'ok', user: data.user });
      })
      .catch(() => {
        if (mounted) setState({ status: 'no', user: null });
      });
    return () => {
      mounted = false;
    };
  }, []);

  if (state.status === 'checking') return null;
  if (state.status === 'no') return <Navigate to="/login" replace state={{ from: location.pathname }} />;

  const role = String(state.user?.role || '').toLowerCase();
  const allowed = Array.isArray(allow) ? allow : [allow];
  if (allowed.length > 0 && !allowed.map((x) => String(x).toLowerCase()).includes(role)) {
    return <Navigate to={homeForRole(role)} replace />;
  }

  return children;
}

