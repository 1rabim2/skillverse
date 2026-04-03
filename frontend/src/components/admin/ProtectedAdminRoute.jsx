import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import adminApi from '../../lib/adminApi';

export default function ProtectedAdminRoute({ children }) {
  const location = useLocation();
  const [status, setStatus] = React.useState('checking'); // checking | ok | no

  React.useEffect(() => {
    let mounted = true;
    adminApi
      .get('/auth/me')
      .then(() => {
        if (mounted) setStatus('ok');
      })
      .catch(() => {
        if (mounted) setStatus('no');
      });
    return () => {
      mounted = false;
    };
  }, []);

  if (status === 'checking') return null;
  if (status === 'no') return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  return children;
}
