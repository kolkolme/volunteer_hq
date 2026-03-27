import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { User, LogOut, Users, BarChart3, Shield } from 'lucide-react'

const Layout = ({ children }) => {
  const { user, logout, isAdmin, isSuperuser } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="app-shell">
      {/* Header */}
      <header className="glass-panel" style={{ height: '56px', display: 'flex', alignItems: 'center', padding: '0 12px', justifyContent: 'space-between', overflow: 'hidden' }}>
        <Link to="/" style={{ textDecoration: 'none' }}>
          <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Volunteer <span style={{ color: 'var(--accent)' }}>HQ</span>
          </span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ textAlign: 'right', marginRight: '8px', lineHeight: 1.3 }} className="hidden sm:block">
            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>{user?.full_name || user?.username}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{user?.role?.title}</div>
          </div>
          <Link to="/profile" className="btn-ios" style={{ padding: '7px' }} title="Профиль">
            <User size={16} />
          </Link>
          {isSuperuser() && (
            <Link to="/superuser" className="btn-ios" style={{ padding: '7px' }} title="Суперпользователь">
              <Shield size={16} />
            </Link>
          )}
          {isAdmin() && (
            <>
              <Link to="/admin" className="btn-ios" style={{ padding: '7px' }} title="Аналитика">
                <BarChart3 size={16} />
              </Link>
              <Link to="/admin/assign" className="btn-ios" style={{ padding: '7px' }} title="Назначения">
                <Users size={16} />
              </Link>
            </>
          )}
          <button onClick={handleLogout} className="btn-ios" style={{ padding: '7px' }} title="Выйти">
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full overflow-x-hidden" style={{ maxWidth: '1280px', margin: '0 auto', padding: '16px 12px 48px' }}>
        {children}
      </main>
    </div>
  )
}

export default Layout