import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './components/MainLayout';

import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ReceptionDashboard from './pages/ReceptionDashboard';
import DoctorDashboard from './pages/DoctorDashboard';
import PharmacyDashboard from './pages/PharmacyDashboard';
import BillingDashboard from './pages/BillingDashboard';
import AdminDashboard from './pages/AdminDashboard';
import BedDashboard from './pages/BedDashboard';

const App = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected Routes WRAPPED in MainLayout */}
          <Route element={<ProtectedRoute allowedRoles={['receptionist', 'doctor', 'pharmacist', 'admin']} />}>
            <Route element={<MainLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />

              <Route element={<ProtectedRoute allowedRoles={['receptionist', 'admin']} />}>
                <Route path="/reception" element={<ReceptionDashboard />} />
                <Route path="/beds" element={<BedDashboard />} />
              </Route>

              <Route element={<ProtectedRoute allowedRoles={['doctor', 'admin']} />}>
                <Route path="/doctor-dashboard" element={<DoctorDashboard />} />
              </Route>

              <Route element={<ProtectedRoute allowedRoles={['pharmacist', 'admin']} />}>
                <Route path="/pharmacy" element={<PharmacyDashboard />} />
                <Route path="/billing" element={<BillingDashboard />} />
              </Route>

              <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
                <Route path="/admin" element={<AdminDashboard />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;
