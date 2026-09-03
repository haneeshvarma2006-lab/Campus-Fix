import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Navbar } from './components/Navbar'
import { ProtectedRoute, AdminRoute } from './components/ProtectedRoute'
import { useAuth } from './contexts/AuthContext'
import { Landing } from './pages/Landing'
import { Product } from './pages/Product'
import { Login } from './pages/Login'
import { Signup } from './pages/Signup'
import { AuthCallback } from './pages/AuthCallback'
import { StudentDashboard } from './pages/StudentDashboard'
import { SubmitReport } from './pages/SubmitReport'
import { MyReports } from './pages/MyReports'
import { ReportDetail } from './pages/ReportDetail'
import { AdminDashboard } from './pages/AdminDashboard'
import { AdminSettings } from './pages/AdminSettings'

/** Admins land on the queue; students land on their own dashboard. */
function Home() {
  const { user, isAdmin, loading } = useAuth()
  if (loading) return null
  if (!user) return <Landing />
  return <Navigate to={isAdmin ? '/admin' : '/dashboard'} replace />
}

export default function App() {
  const location = useLocation()
  const { user } = useAuth()

  // The landing stage is a full-bleed dark scene that brings its own footer,
  // so the app chrome steps out of its way.
  const onStage = location.pathname === '/' && !user

  return (
    <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      <main style={{ flex: 1 }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/product" element={<Product />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/auth/callback" element={<AuthCallback />} />

          <Route path="/dashboard" element={<ProtectedRoute><StudentDashboard /></ProtectedRoute>} />
          <Route path="/submit" element={<ProtectedRoute><SubmitReport /></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute><MyReports /></ProtectedRoute>} />
          <Route path="/reports/:id" element={<ProtectedRoute><ReportDetail /></ProtectedRoute>} />

          <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="/admin/settings" element={<AdminRoute><AdminSettings /></AdminRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {!onStage && (
        <footer className="footer">
          <div className="shell-wide between wrap">
            <span>CampusFix — report it, track it, get it fixed.</span>
            <span className="mono tiny">React · Express · Postgres</span>
          </div>
        </footer>
      )}
    </div>
  )
}
