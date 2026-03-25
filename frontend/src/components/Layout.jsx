import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { User, LogOut, Settings, Users, BarChart3 } from 'lucide-react'
import PaletteSelector from './ui/PaletteSelector'
import NotificationsButton from './ui/NotificationsButton'

const Layout = ({ children }) => {
  const { user, logout, isAdmin } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="app-shell theme-transition">
      {/* Header */}
      <header className="glass-panel">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link to="/" className="hover:opacity-80 transition-opacity">
                <h1 className="text-xl font-bold glass-title">Volunteer HQ</h1>
              </Link>
            </div>

            <div className="flex items-center space-x-4">
              {/* Palette Selector */}
              <PaletteSelector />

              {/* Notifications */}
              <NotificationsButton />

              {/* User Menu */}
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <p className="text-sm font-medium glass-title">{user?.full_name || user?.username}</p>
                  <p className="text-xs glass-subtitle">{user?.role?.title}</p>
                </div>
                <div className="flex space-x-2">
                  <Link
                    to="/profile"
                    className="btn-ios p-3"
                  >
                    <User className="h-5 w-5" />
                  </Link>
                  {isAdmin() && (
                    <>
                      <Link
                        to="/admin"
                        className="btn-ios p-3"
                      >
                        <BarChart3 className="h-5 w-5" />
                      </Link>
                      <Link
                        to="/admin/assign"
                        className="btn-ios p-3"
                      >
                        <Users className="h-5 w-5" />
                      </Link>
                    </>
                  )}
                  <button
                    onClick={handleLogout}
                    className="btn-ios p-3"
                  >
                    <LogOut className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  )
}

export default Layout