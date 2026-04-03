import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Verify from './pages/Verify';
import Dashboard from './pages/Dashboard';
import Landing from './pages/Landing';
import Courses from './pages/Courses';
import SkillPaths from './pages/SkillPaths';
import SkillPathDetail from './pages/SkillPathDetail';
import Community from './pages/Community';
import Portfolio from './pages/Portfolio';
import Profile from './pages/Profile';
import Leaderboard from './pages/Leaderboard';
import CourseDetail from './pages/CourseDetail';
import Certificates from './pages/Certificates';
import MyProjects from './pages/MyProjects';
import Subscribe from './pages/Subscribe';
import SubscribeReturn from './pages/SubscribeReturn';
import StudentLayout from './components/StudentLayout';
import ProtectedAdminRoute from './components/admin/ProtectedAdminRoute';
import AdminLayout from './components/admin/AdminLayout';
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboardHome from './pages/admin/AdminDashboardHome';
import AdminCourses from './pages/admin/AdminCourses';
import AdminUsers from './pages/admin/AdminUsers';
import AdminSkillPaths from './pages/admin/AdminSkillPaths';
import AdminCertificates from './pages/admin/AdminCertificates';
import AdminCommunity from './pages/admin/AdminCommunity';
import AdminSettings from './pages/admin/AdminSettings';
import AdminProjects from './pages/admin/AdminProjects';
import AdminSubscriptions from './pages/admin/AdminSubscriptions';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/verify" element={<Verify />} />

        <Route element={<StudentLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/skill-paths" element={<SkillPaths />} />
          <Route path="/skill-paths/:id" element={<SkillPathDetail />} />
          <Route path="/courses" element={<Courses />} />
          <Route path="/courses/:id" element={<CourseDetail />} />
          <Route path="/community" element={<Community />} />
          <Route path="/portfolio" element={<Portfolio />} />
          <Route path="/projects" element={<MyProjects />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/certificates" element={<Certificates />} />
          <Route path="/subscribe" element={<Subscribe />} />
          <Route path="/subscribe/return" element={<SubscribeReturn />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
        </Route>

        <Route path="/admin/login" element={<AdminLogin />} />
        <Route
          path="/admin"
          element={
            <ProtectedAdminRoute>
              <AdminLayout />
            </ProtectedAdminRoute>
          }
        >
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboardHome />} />
          <Route path="courses" element={<AdminCourses />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="skill-paths" element={<AdminSkillPaths />} />
          <Route path="certificates" element={<AdminCertificates />} />
          <Route path="community" element={<AdminCommunity />} />
          <Route path="projects" element={<AdminProjects />} />
          <Route path="subscriptions" element={<AdminSubscriptions />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
