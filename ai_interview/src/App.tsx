import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import DeviceValidation from './pages/DeviceValidation';
import { ValidationComplete } from './pages/ValidationComplete';
import Interview from './pages/Interview';
import InternResults from './pages/InternResults';
import HRDashboard from './pages/HRDashboard';
import { AuthService } from './services/authService';

// ─── Route Protection ───────────────────────────────────────────────────────────

const RequireAuth = ({ role, children }: { role: 'intern' | 'hr'; children: JSX.Element }) => {
  const session = AuthService.getSession();
  if (!session) return <Navigate to="/login" replace />;
  if (session.role !== role) return <Navigate to={session.role === 'hr' ? '/hr' : '/intern'} replace />;
  return children;
};

// ─── Intern Flow Wrappers ───────────────────────────────────────────────────────

const DeviceValidationWrapper = () => {
  const navigate = useNavigate();
  return (
    <DeviceValidation
      onComplete={() => navigate('/intern/validation-complete')}
      onBack={() => navigate('/intern')}
    />
  );
};

const ValidationCompleteWrapper = () => {
  const navigate = useNavigate();
  return <ValidationComplete onProceedToInterview={() => navigate('/intern/interview')} />;
};

// ─── Root Redirect ──────────────────────────────────────────────────────────────

const RootRedirect = () => {
  const session = AuthService.getSession();
  if (!session) return <Navigate to="/login" replace />;
  return <Navigate to={session.role === 'hr' ? '/hr' : '/intern'} replace />;
};

// ─── App ────────────────────────────────────────────────────────────────────────

function App() {
  return (
    <Router>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />

        {/* Root redirect */}
        <Route path="/" element={<RootRedirect />} />

        {/* Intern routes */}
        <Route path="/intern" element={
          <RequireAuth role="intern"><Dashboard /></RequireAuth>
        } />
        <Route path="/intern/validation" element={
          <RequireAuth role="intern"><DeviceValidationWrapper /></RequireAuth>
        } />
        <Route path="/intern/validation-complete" element={
          <RequireAuth role="intern"><ValidationCompleteWrapper /></RequireAuth>
        } />
        <Route path="/intern/interview" element={
          <RequireAuth role="intern"><Interview /></RequireAuth>
        } />
        <Route path="/intern/results" element={
          <RequireAuth role="intern"><InternResults /></RequireAuth>
        } />

        {/* HR routes */}
        <Route path="/hr" element={
          <RequireAuth role="hr"><HRDashboard /></RequireAuth>
        } />

        {/* Legacy redirects (keep backward compat) */}
        <Route path="/validation"          element={<Navigate to="/intern/validation" replace />} />
        <Route path="/validation-complete" element={<Navigate to="/intern/validation-complete" replace />} />
        <Route path="/interview"           element={<Navigate to="/intern/interview" replace />} />
        <Route path="/results"             element={<Navigate to="/intern/results" replace />} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;