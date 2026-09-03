import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Navbar } from './components/Navbar'
import { ProtectedRoute, AdminRoute } from './components/ProtectedRoute'
import { RouteFallback } from './components/ui'
import { useAuth } from './contexts/AuthContext'

// The landing page and auth screens are what a first-time visitor hits, so they
// stay in the main bundle. Everything behind a login is split out and fetched
// only when that route is opened — a student on mobile data never downloads the
// admin dashboard.
import { Landing } from './pages/Landing'
import { Login } from './pages/Login'
import { Signup } from './pages/Signup'

const AuthCallback    = lazy(() => import('./pages/AuthCallback').then(m => ({ default: m.AuthCallback })))
const StudentDashboard= lazy(() => import('./pages/StudentDashboard').then(m => ({ default: m.StudentDashboard })))
const SubmitReport    = lazy(() => import('./pages/SubmitReport').then(m => ({ default: m.SubmitReport })))
const MyReports       = lazy(() => import('./pages/MyReports').then(m => ({ default: m.MyReports })))
const ReportDetail    = lazy(() => import('./pages/ReportDetail').then(m => ({ default: m.ReportDetail })))
const Campus          = lazy(() => import('./pages/Campus').then(m => ({ default: m.Campus })))
const AdminDashboard  = lazy(() => import('./pages/AdminDashboard').then(m => ({ default: m.AdminDashboard })))
const AdminSettings   = lazy(() => import('./pages/AdminSettings').then(m => ({ default: m.AdminSettings })))

/** Admins land on the queue, students on their own dashboard. */
function Home() {
  const { user, isAdmin, loading } = useAuth()
  if (loading) return <RouteFallback />
  if (!user) return <Landing />
  return <Navigate to={isAdmin ? '/admin' : '/dashboard'} replace />
}

export default function App() {
  const { user } = useAuth()
  const location = useLocation()
  const onLanding = location.pathname === '/' && !user

  return (
    <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      <main style={{ flex: 1 }}>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/auth/callback" element={<AuthCallback />} />

            <Route path="/dashboard" element={<ProtectedRoute><StudentDashboard /></ProtectedRoute>} />
            <Route path="/submit" element={<ProtectedRoute><SubmitReport /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute><MyReports /></ProtectedRoute>} />
            <Route path="/reports/:id" element={<ProtectedRoute><ReportDetail /></ProtectedRoute>} />
            <Route path="/campus" element={<ProtectedRoute><Campus /></ProtectedRoute>} />

            <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
            <Route path="/admin/settings" element={<AdminRoute><AdminSettings /></AdminRoute>} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>

      {onLanding && (
        <footer className="foot">
          <div className="wrap between wrap-x">
            <span>CampusFix — report it, track it, get it fixed.</span>
            <span className="code">Built for students</span>
          </div>
        </footer>
      )}
    </div>
  )
}
