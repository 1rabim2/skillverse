import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

export default function ProtectedAdminRoute({ children }) {
  const location = useLocation();
  const token = localStorage.getItem('adminToken');
  if (!token) return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  return children;
}
