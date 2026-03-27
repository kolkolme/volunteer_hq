import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { User, LogOut, Users, BarChart3, Shield, BookOpen, Palette } from 'lucide-react'
import { PALETTES, applyPalette } from './ui/PaletteSelector'
import { useState, useEffect, useRef } from 'react'

const Layout = ({ children }) => {
  const { user, logout, isAdmin, isSuperuser, getRoleCode, isUser } = useAuth()
  const navigate = useNavigate()
  const role = getRoleCode()
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [currentPalette, setCurrentPalette] = useState(() => localStorage.getItem('palette') || 'white')
  const dropdownRef = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setPaletteOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handlePalette = (id) => {
    applyPalette(id)
    setCurrentPalette(id)
    setPaletteOpen(false)
  }

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
              {/* Palette Selector — hidden for regular users */}
              {!isUser() && (
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setPaletteOpen(o => !o)}
                    className="btn-ios flex items-center gap-1.5 px-3 py-2 rounded-2xl"
                    title="Цветовая тема"
                  >
                    <Palette className="h-4 w-4" />
                    <span className="text-sm font-medium hidden sm:inline">Тема</span>
                  </button>
                  {paletteOpen && (
                    <div className="absolute right-0 top-full mt-2 glass-panel rounded-2xl shadow-2xl p-2 z-[9999] min-w-[180px]">
                      {PALETTES.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => handlePalette(p.id)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm ${
                            currentPalette === p.id ? 'glass-card font-semibold' : 'hover:glass-card'
                          }`}
                        >
                          <span>{p.icon}</span>
                          <span className="glass-title">{p.name}</span>
                          {currentPalette === p.id && <span className="ml-auto text-xs opacity-60">✓</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

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