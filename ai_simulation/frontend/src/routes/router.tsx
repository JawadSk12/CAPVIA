import React, { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

// Layouts
import { HRLayout } from '@/components/layout/HRLayout';
import { CandidateLayout } from '@/components/layout/CandidateLayout';

// Auth pages
const Login = lazy(() => import('@/pages/auth/Login').then(m => ({ default: m.Login })));
const SignupRole = lazy(() => import('@/pages/auth/SignupRole').then(m => ({ default: m.SignupRole })));
const HRSignup = lazy(() => import('@/pages/auth/HRSignup').then(m => ({ default: m.HRSignup })));
const CandidateSignup = lazy(() => import('@/pages/auth/CandidateSignup').then(m => ({ default: m.CandidateSignup })));
const ForgotPassword = lazy(() => import('@/pages/auth/ForgotPassword').then(m => ({ default: m.ForgotPassword })));

// HR pages
const HRDashboard = lazy(() => import('@/pages/hr/HRDashboard').then(m => ({ default: m.HRDashboard })));
const HRInternships = lazy(() => import('@/pages/hr/HRInternships').then(m => ({ default: m.HRInternships })));
const CreateInternship = lazy(() => import('@/pages/hr/CreateInternship').then(m => ({ default: m.CreateInternship })));
const InternshipDetail = lazy(() => import('@/pages/hr/InternshipDetail').then(m => ({ default: m.InternshipDetail })));
const InternshipRankings = lazy(() => import('@/pages/hr/InternshipRankings').then(m => ({ default: m.InternshipRankings })));
const CandidateReport = lazy(() => import('@/pages/hr/CandidateReport').then(m => ({ default: m.CandidateReport })));

// Candidate pages
const CandidateDashboard = lazy(() => import('@/pages/candidate/CandidateDashboard').then(m => ({ default: m.CandidateDashboard })));
const BrowseInternships = lazy(() => import('@/pages/candidate/BrowseInternships').then(m => ({ default: m.BrowseInternships })));
const InternshipApply = lazy(() => import('@/pages/candidate/InternshipApply').then(m => ({ default: m.InternshipApply })));
const SimulationInterface = lazy(() => import('@/pages/candidate/SimulationInterface').then(m => ({ default: m.SimulationInterface })));
const SimulationComplete = lazy(() => import('@/pages/candidate/SimulationComplete').then(m => ({ default: m.SimulationComplete })));
const CandidateProfile = lazy(() => import('@/pages/candidate/CandidateProfile').then(m => ({ default: m.CandidateProfile })));

// Landing
import { Landing } from '@/pages/Landing';

const Loader = () => (
  <div className="min-h-screen bg-gray-950 flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

const ProtectedRoute: React.FC<{ children: React.ReactNode; role?: 'hr' | 'candidate' }> = ({ children, role }) => {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/auth/login" replace />;
  if (role && user?.role !== role && user?.role !== 'super_admin') {
    return <Navigate to={user?.role === 'hr' ? '/hr/dashboard' : '/candidate/dashboard'} replace />;
  }
  return <Suspense fallback={<Loader />}>{children}</Suspense>;
};

const AuthRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user } = useAuthStore();
  if (isAuthenticated) {
    return <Navigate to={user?.role === 'hr' ? '/hr/dashboard' : '/candidate/dashboard'} replace />;
  }
  return <Suspense fallback={<Loader />}>{children}</Suspense>;
};

export const router = createBrowserRouter([
  // Landing
  { path: '/', element: <Landing /> },

  // Auth
  { path: '/auth/login', element: <AuthRoute><Login /></AuthRoute> },
  { path: '/auth/signup', element: <AuthRoute><SignupRole /></AuthRoute> },
  { path: '/auth/signup/hr', element: <AuthRoute><HRSignup /></AuthRoute> },
  { path: '/auth/signup/candidate', element: <AuthRoute><CandidateSignup /></AuthRoute> },
  { path: '/auth/forgot-password', element: <AuthRoute><ForgotPassword /></AuthRoute> },

  // Legacy redirects
  { path: '/login', element: <Navigate to="/auth/login" replace /> },

  // HR Portal
  {
    path: '/hr',
    element: <ProtectedRoute role="hr"><HRLayout /></ProtectedRoute>,
    children: [
      { index: true, element: <Navigate to="/hr/dashboard" replace /> },
      { path: 'dashboard', element: <ProtectedRoute role="hr"><HRDashboard /></ProtectedRoute> },
      { path: 'internships', element: <ProtectedRoute role="hr"><HRInternships /></ProtectedRoute> },
      { path: 'internships/create', element: <ProtectedRoute role="hr"><CreateInternship /></ProtectedRoute> },
      { path: 'internships/:id', element: <ProtectedRoute role="hr"><InternshipDetail /></ProtectedRoute> },
      { path: 'internships/:id/rankings', element: <ProtectedRoute role="hr"><InternshipRankings /></ProtectedRoute> },
      { path: 'internships/:id/reports/:candidateId', element: <ProtectedRoute role="hr"><CandidateReport /></ProtectedRoute> },
    ],
  },

  // Candidate Portal
  {
    path: '/candidate',
    element: <ProtectedRoute role="candidate"><CandidateLayout /></ProtectedRoute>,
    children: [
      { index: true, element: <Navigate to="/candidate/dashboard" replace /> },
      { path: 'dashboard', element: <ProtectedRoute role="candidate"><CandidateDashboard /></ProtectedRoute> },
      { path: 'internships', element: <ProtectedRoute role="candidate"><BrowseInternships /></ProtectedRoute> },
      { path: 'internships/:id', element: <ProtectedRoute role="candidate"><InternshipApply /></ProtectedRoute> },
      { path: 'profile', element: <ProtectedRoute role="candidate"><CandidateProfile /></ProtectedRoute> },
    ],
  },

  // Simulation (full-screen, no layout)
  {
    path: '/simulation/:attemptId',
    element: <ProtectedRoute role="candidate"><Suspense fallback={<Loader />}><SimulationInterface /></Suspense></ProtectedRoute>,
  },
  {
    path: '/simulation/:attemptId/complete',
    element: <ProtectedRoute role="candidate"><Suspense fallback={<Loader />}><SimulationComplete /></Suspense></ProtectedRoute>,
  },

  { path: '*', element: <Navigate to="/" replace /> },
]);