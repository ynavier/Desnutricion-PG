import { Navigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

function redirectFor(role) {
  if (role === 'ADM') return '/adm'
  if (role === 'ANL') return '/anl'
  return '/cli'
}

export default function ProtectedRoute({ children, role }) {
  const { user, loading, isAuthenticated } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-bg">
        <div className="w-8 h-8 border-4 border-clinical-blue-md border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (role && user?.role !== role) {
    return <Navigate to={redirectFor(user?.role)} replace />
  }

  return children
}
