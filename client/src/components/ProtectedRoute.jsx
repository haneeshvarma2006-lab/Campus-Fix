import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

function Loading() {
  return (
    <div className="shell page">
      <div className="stack stack-3">
        <div className="skeleton" style={{ height: 26, width: 200 }} />
        <div className="skeleton" style={{ height: 14, width: 320 }} />
      </div>
    </div>
  )
}

export function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <Loading />
  // Remember where they were headed so login can send them back there.
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return children
}

export function AdminRoute({ children }) {
  const { user, isAdmin, loading } = useAuth()
  const location = useLocation()

  if (loading) return <Loading />
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (!isAdmin) return <Navigate to="/dashboard" replace />
  return children
}
