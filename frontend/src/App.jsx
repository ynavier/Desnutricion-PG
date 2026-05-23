import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/common/ProtectedRoute'

// Páginas
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/auth/LoginPage'
import DashboardANL from './pages/anl/DashboardANL'
import DashboardCLI from './pages/cli/DashboardCLI'
import NotFound from './pages/NotFound'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />

          <Route
            path="/anl/*"
            element={
              <ProtectedRoute role="ANL">
                <DashboardANL />
              </ProtectedRoute>
            }
          />

          <Route
            path="/cli/*"
            element={
              <ProtectedRoute role="CLI">
                <DashboardCLI />
              </ProtectedRoute>
            }
          />

          <Route path="/home" element={<Navigate to="/" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
