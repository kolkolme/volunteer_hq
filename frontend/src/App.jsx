import { useEffect, useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import UserDashboard from './pages/UserDashboard'
import SuperuserDashboard from './pages/SuperuserDashboard'
import Profile from './pages/Profile'
import AdminDashboard from './pages/AdminDashboard'
import EventAssignment from './pages/EventAssignment'
import ProtectedRoute from './components/ProtectedRoute'
import RoleDashboard from './components/RoleDashboard'
import Layout from './components/Layout'
import LoadingOverlay from './components/ui/LoadingOverlay'
import './App.css'

function App() {
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Restore palette and theme from localStorage
    const savedPalette = localStorage.getItem('palette') || 'beeline'
    const savedTheme = localStorage.getItem('theme') || 'dark'
    document.documentElement.setAttribute('data-palette', savedPalette)
    document.documentElement.setAttribute('data-theme', savedTheme)
  }, [])

  return (
    <AuthProvider>
      <div className="theme-transition">
        <LoadingOverlay visible={loading} />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={
            <ProtectedRoute>
              <Layout>
                <RoleDashboard />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute>
              <Layout>
                <Profile />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/admin" element={
            <ProtectedRoute allowedRoles={['superuser', 'admin']}>
              <Layout>
                <AdminDashboard />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/admin/assign" element={
            <ProtectedRoute allowedRoles={['superuser', 'admin']}>
              <Layout>
                <EventAssignment />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/superuser" element={
            <ProtectedRoute allowedRoles={['superuser']}>
              <Layout>
                <SuperuserDashboard />
              </Layout>
            </ProtectedRoute>
          } />
        </Routes>
      </div>
    </AuthProvider>
  )
}

export default App