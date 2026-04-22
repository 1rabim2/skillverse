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
import ProtectedRoute from './components/auth/ProtectedRoute';
import InstructorLayout from './components/instructor/InstructorLayout';
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
import InstructorDashboard from './pages/instructor/InstructorDashboard';
import InstructorCourses from './pages/instructor/InstructorCourses';
import InstructorCreateCourse from './pages/instructor/InstructorCreateCourse';
import InstructorEditCourse from './pages/instructor/InstructorEditCourse';
import InstructorStudents from './pages/instructor/InstructorStudents';
import InstructorLibrary from './pages/instructor/InstructorLibrary';
import InstructorProjects from './pages/instructor/InstructorProjects';

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
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allow={['student']}>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route path="/skill-paths" element={<SkillPaths />} />
          <Route path="/skill-paths/:id" element={<SkillPathDetail />} />
          <Route path="/courses" element={<Courses />} />
          <Route path="/courses/:id" element={<CourseDetail />} />
          <Route path="/community" element={<Community />} />
          <Route
            path="/portfolio"
            element={
              <ProtectedRoute allow={['student']}>
                <Portfolio />
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects"
            element={
              <ProtectedRoute allow={['student']}>
                <MyProjects />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute allow={['student']}>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/certificates"
            element={
              <ProtectedRoute allow={['student']}>
                <Certificates />
              </ProtectedRoute>
            }
          />
          <Route
            path="/subscribe"
            element={
              <ProtectedRoute allow={['student']}>
                <Subscribe />
              </ProtectedRoute>
            }
          />
          <Route
            path="/subscribe/return"
            element={
              <ProtectedRoute allow={['student']}>
                <SubscribeReturn />
              </ProtectedRoute>
            }
          />
          <Route path="/leaderboard" element={<Leaderboard />} />
        </Route>

        <Route
          path="/instructor"
          element={
            <ProtectedRoute allow={['instructor']}>
              <InstructorLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/instructor/dashboard" replace />} />
          <Route path="dashboard" element={<InstructorDashboard />} />
          <Route path="courses" element={<InstructorCourses />} />
          <Route path="courses/new" element={<InstructorCreateCourse />} />
          <Route path="courses/:id" element={<InstructorEditCourse />} />
          <Route path="library" element={<InstructorLibrary />} />
          <Route path="students" element={<InstructorStudents />} />
          <Route path="projects" element={<InstructorProjects />} />
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
