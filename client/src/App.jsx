import { Routes, Route, Navigate } from 'react-router-dom'
import { Navbar } from './components/Navbar'
import { ProtectedRoute, StaffRoute, AdminRoute } from './components/ProtectedRoute'
import { Landing } from './pages/Landing'
import { Login } from './pages/Login'
import { Signup } from './pages/Signup'
import { SubmitReport } from './pages/SubmitReport'
import { MyReports } from './pages/MyReports'
import { ReportDetail } from './pages/ReportDetail'
import { AdminDashboard } from './pages/AdminDashboard'
import { AdminSettings } from './pages/AdminSettings'

export default function App() {
  return (
    <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      <main style={{ flex: 1 }}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          <Route path="/submit" element={<ProtectedRoute><SubmitReport /></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute><MyReports /></ProtectedRoute>} />
          <Route path="/reports/:id" element={<ProtectedRoute><ReportDetail /></ProtectedRoute>} />

          <Route path="/admin" element={<StaffRoute><AdminDashboard /></StaffRoute>} />
          <Route path="/admin/settings" element={<AdminRoute><AdminSettings /></AdminRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <footer className="footer">
        <div className="shell-wide row-between wrap">
          <span>CampusFix — report it, track it, get it fixed.</span>
          <span className="mono tiny">React · Express · SQLite</span>
        </div>
      </footer>
    </div>
  )
}
