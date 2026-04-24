import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { DispatchProvider } from './context/DispatchContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import PlatformLayout from './layouts/PlatformLayout';
import PlatformDashboard from './pages/platform/PlatformDashboard';
import PlatformPO from './pages/platform/PlatformPO';
import PlatformDispatches from './pages/platform/PlatformDispatches';
import PlatformDistributors from './pages/platform/PlatformDistributors';
import PlatformLandingRate from './pages/platform/PlatformLandingRate';
import PlatformMonthlyTargets from './pages/platform/PlatformMonthlyTargets';
import MonthlyTargetsDashboard from './pages/MonthlyTargetsDashboard';
import Distributors from './pages/Distributors';
import UploadPage from './pages/UploadPage';
import InventoryUploader from './pages/uploader/InventoryUploader';
import SecondaryUploader from './pages/uploader/SecondaryUploader';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
      <AuthProvider>
        <DispatchProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/distributors"
              element={
                <ProtectedRoute>
                  <Distributors />
                </ProtectedRoute>
              }
            />
            <Route
              path="/monthly-targets"
              element={
                <ProtectedRoute>
                  <MonthlyTargetsDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/platform/:slug"
              element={
                <ProtectedRoute>
                  <PlatformLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<PlatformDashboard />} />
              <Route path="po" element={<PlatformPO />} />
              <Route path="dispatches" element={<PlatformDispatches />} />
              <Route path="distributors" element={<PlatformDistributors />} />
              <Route path="landing-rate" element={<PlatformLandingRate />} />
              <Route path="monthly-targets" element={<PlatformMonthlyTargets />} />
            </Route>
            <Route
              path="/upload/inventory"
              element={
                <ProtectedRoute>
                  <UploadPage title="Inventory Upload">
                    <InventoryUploader />
                  </UploadPage>
                </ProtectedRoute>
              }
            />
            <Route
              path="/upload/secondary"
              element={
                <ProtectedRoute>
                  <UploadPage title="Secondary Upload">
                    <SecondaryUploader />
                  </UploadPage>
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </DispatchProvider>
      </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
