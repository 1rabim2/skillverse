import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import StudentLayout from './components/StudentLayout';
import ProtectedRoute from './components/auth/ProtectedRoute';
import InstructorLayout from './components/instructor/InstructorLayout';
import ProtectedAdminRoute from './components/admin/ProtectedAdminRoute';
import AdminLayout from './components/admin/AdminLayout';

const Login = React.lazy(() => import('./pages/Login'));
const ForgotPassword = React.lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = React.lazy(() => import('./pages/ResetPassword'));
const Verify = React.lazy(() => import('./pages/Verify'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Landing = React.lazy(() => import('./pages/Landing'));
const Courses = React.lazy(() => import('./pages/Courses'));
const SkillPaths = React.lazy(() => import('./pages/SkillPaths'));
const SkillPathDetail = React.lazy(() => import('./pages/SkillPathDetail'));
const Community = React.lazy(() => import('./pages/Community'));
const Portfolio = React.lazy(() => import('./pages/Portfolio'));
const Profile = React.lazy(() => import('./pages/Profile'));
const Leaderboard = React.lazy(() => import('./pages/Leaderboard'));
const QuizGame = React.lazy(() => import('./pages/QuizGame'));
const CourseDetail = React.lazy(() => import('./pages/CourseDetail'));
const CourseChat = React.lazy(() => import('./pages/CourseChat'));
const Certificates = React.lazy(() => import('./pages/Certificates'));
const MyProjects = React.lazy(() => import('./pages/MyProjects'));
const Subscribe = React.lazy(() => import('./pages/Subscribe'));
const SubscribeReturn = React.lazy(() => import('./pages/SubscribeReturn'));
const AdminLogin = React.lazy(() => import('./pages/admin/AdminLogin'));
const AdminDashboardHome = React.lazy(() => import('./pages/admin/AdminDashboardHome'));
const AdminCourses = React.lazy(() => import('./pages/admin/AdminCourses'));
const AdminUsers = React.lazy(() => import('./pages/admin/AdminUsers'));
const AdminSkillPaths = React.lazy(() => import('./pages/admin/AdminSkillPaths'));
const AdminCertificates = React.lazy(() => import('./pages/admin/AdminCertificates'));
const AdminCommunity = React.lazy(() => import('./pages/admin/AdminCommunity'));
const AdminSettings = React.lazy(() => import('./pages/admin/AdminSettings'));
const AdminProjects = React.lazy(() => import('./pages/admin/AdminProjects'));
const AdminSubscriptions = React.lazy(() => import('./pages/admin/AdminSubscriptions'));
const InstructorDashboard = React.lazy(() => import('./pages/instructor/InstructorDashboard'));
const InstructorCourses = React.lazy(() => import('./pages/instructor/InstructorCourses'));
const InstructorCreateCourse = React.lazy(() => import('./pages/instructor/InstructorCreateCourse'));
const InstructorEditCourse = React.lazy(() => import('./pages/instructor/InstructorEditCourse'));
const InstructorStudents = React.lazy(() => import('./pages/instructor/InstructorStudents'));
const InstructorLibrary = React.lazy(() => import('./pages/instructor/InstructorLibrary'));
const InstructorProjects = React.lazy(() => import('./pages/instructor/InstructorProjects'));
const InstructorMessages = React.lazy(() => import('./pages/instructor/InstructorMessages'));

function PageLoader() {
  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 px-4 text-sm font-semibold text-slate-600 dark:bg-slate-950 dark:text-slate-300">
      Loading...
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
      <React.Suspense fallback={<PageLoader />}>
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
          <Route
            path="/courses/:id/chat"
            element={
              <ProtectedRoute allow={['student']}>
                <CourseChat />
              </ProtectedRoute>
            }
          />
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
          <Route
            path="/game/quiz"
            element={
              <ProtectedRoute allow={['student']}>
                <QuizGame />
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
          <Route path="messages" element={<InstructorMessages />} />
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
      </React.Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
