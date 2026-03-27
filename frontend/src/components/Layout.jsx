import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { User, LogOut, Users, BarChart3, Shield, BookOpen } from 'lucide-react'

const Layout = ({ children }) => {
  const { user, logout, isAdmin, isSuperuser, getRoleCode } = useAuth()
  const navigate = useNavigate()
  const role = getRoleCode()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="app-shell theme-transition">
      {/* Header */}
      <header className="glass-panel">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-12 sm:h-16">
            <div className="flex items-center">
              <Link to="/" className="hover:opacity-80 transition-opacity">
                <h1 className="text-lg sm:text-xl font-bold glass-title">Volunteer HQ</h1>
              </Link>
            </div>

            <div className="flex items-center space-x-2 sm:space-x-4">
              {/* User Menu */}
              <div className="flex items-center space-x-1 sm:space-x-3">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium glass-title">{user?.full_name || user?.username}</p>
                  <p className="text-xs glass-subtitle">{user?.role?.title}</p>
                </div>
                <div className="flex space-x-1 sm:space-x-2">
                  <Link
                    to="/profile"
                    className="btn-ios p-2 sm:p-3"
                  >
                    <User className="h-4 w-4 sm:h-5 sm:w-5" />
                  </Link>
                  {isSuperuser() && (
                    <Link
                      to="/superuser"
                      className="btn-ios p-2 sm:p-3"
                    >
                      <Shield className="h-4 w-4 sm:h-5 sm:w-5" />
                    </Link>
                  )}
                  {isAdmin() && (
                    <>
                      <Link
                        to="/admin"
                        className="btn-ios p-2 sm:p-3"
                      >
                        <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5" />
                      </Link>
                      <Link
                        to="/admin/assign"
                        className="btn-ios p-2 sm:p-3"
                      >
                        <Users className="h-4 w-4 sm:h-5 sm:w-5" />
                      </Link>
                    </>
                  )}
                  <button
                    onClick={handleLogout}
                    className="btn-ios p-2 sm:p-3"
                  >
                    <LogOut className="h-4 w-4 sm:h-5 sm:w-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-4 sm:py-6 px-3 sm:px-6 lg:px-8 pb-20 lg:pb-6">
        {children}
      </main>
    </div>
  )
}

export default Layout