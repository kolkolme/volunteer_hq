import { createContext, useContext, useState, useEffect } from 'react'
import api from '../services/api'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    console.log('AuthProvider init, token exists:', !!token)
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
      console.log('Token found, fetching user...')
      fetchUser()
    } else {
      console.log('No token, setting loading to false')
      setLoading(false)
    }
  }, [])

  const fetchUser = async () => {
    try {
      console.log('Fetching user...')
      const response = await api.get('/api/v1/auth/me/')
      console.log('User fetched:', response.data)
      setUser(response.data)
    } catch (error) {
      console.error('Failed to fetch user:', error)
      localStorage.removeItem('token')
      delete api.defaults.headers.common['Authorization']
    } finally {
      setLoading(false)
    }
  }

  const login = async (username, password) => {
    try {
      console.log('Logging in...')
      const response = await api.post('/api/v1/auth/token/', {
        username,
        password,
      })
      const { access, refresh } = response.data
      console.log('Login successful, tokens:', { access: access.substring(0,10) + '...', refresh: refresh.substring(0,10) + '...' })
      localStorage.setItem('token', access)
      localStorage.setItem('refreshToken', refresh)
      api.defaults.headers.common['Authorization'] = `Bearer ${access}`
      await fetchUser()
      return { success: true }
    } catch (error) {
      console.error('Login failed:', error)
      return { success: false, error: error.response?.data?.detail || 'Login failed' }
    }
  }

  const register = async (userData) => {
    try {
      const response = await api.post('/api/v1/auth/register/', userData)
      const { tokens } = response.data
      localStorage.setItem('token', tokens.access)
      localStorage.setItem('refreshToken', tokens.refresh)
      api.defaults.headers.common['Authorization'] = `Bearer ${tokens.access}`
      await fetchUser()
      return { success: true }
    } catch (error) {
      return { success: false, error: error.response?.data || 'Registration failed' }
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('refreshToken')
    delete api.defaults.headers.common['Authorization']
    setUser(null)
  }

  const isAdmin = () => {
    return user?.role?.code === 'admin' || user?.role?.code === 'coordinator'
  }

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    isAdmin,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}