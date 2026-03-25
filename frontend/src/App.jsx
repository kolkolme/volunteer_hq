import { useEffect, useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Profile from './pages/Profile'
import AdminDashboard from './pages/AdminDashboard'
import EventAssignment from './pages/EventAssignment'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import LoadingOverlay from './components/ui/LoadingOverlay'
import './App.css'

function App() {
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Set default light theme
    document.documentElement.setAttribute('data-theme', 'light')

    // Initialize palette from localStorage or default to white
    const savedPalette = localStorage.getItem('palette') || 'white'
    document.documentElement.setAttribute('data-palette', savedPalette)
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
                <Dashboard />
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
            <ProtectedRoute adminOnly>
              <Layout>
                <AdminDashboard />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/admin/assign" element={
            <ProtectedRoute adminOnly>
              <Layout>
                <EventAssignment />
              </Layout>
            </ProtectedRoute>
          } />
        </Routes>
      </div>
    </AuthProvider>
  )
}

export default App