import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user, loading } = useAuth()

  console.log('ProtectedRoute render:', { loading, hasUser: !!user, adminOnly })

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    console.log('No user in ProtectedRoute, redirecting to login')
    return <Navigate to="/login" replace />
  }

  if (adminOnly) {
    const isAdmin = user?.role?.code === 'admin' || user?.role?.code === 'coordinator'
    console.log('AdminOnly check:', { userRole: user?.role?.code, isAdmin })
    if (!isAdmin) {
      return <Navigate to="/" replace />
    }
  }

  return children
}

export default ProtectedRoute