import { useAuth } from '../context/AuthContext'
import SuperuserDashboard from '../pages/SuperuserDashboard'
import AdminDashboard from '../pages/AdminDashboard'
import CoordinatorDashboard from '../pages/CoordinatorDashboard'
import Dashboard from '../pages/Dashboard'
import UserDashboard from '../pages/UserDashboard'

const RoleDashboard = () => {
  const { getRoleCode } = useAuth()
  const role = getRoleCode()

  switch (role) {
    case 'superuser':
      return <SuperuserDashboard />
    case 'admin':
      return <AdminDashboard />
    case 'coordinator':
      return <CoordinatorDashboard />
    case 'volunteer':
      return <Dashboard />
    case 'user':
      return <UserDashboard />
    default:
      return <Dashboard />
  }
}

export default RoleDashboard
