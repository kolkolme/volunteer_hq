import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      const refreshToken = localStorage.getItem('refreshToken')
      if (refreshToken) {
        try {
          const response = await axios.post('http://localhost:8000/api/v1/auth/token/refresh/', {
            refresh: refreshToken,
          })
          const { access } = response.data
          localStorage.setItem('token', access)
          api.defaults.headers.common['Authorization'] = `Bearer ${access}`
          originalRequest.headers.Authorization = `Bearer ${access}`
          return api(originalRequest)
        } catch (refreshError) {
          // Refresh failed, remove tokens and throw error
          localStorage.removeItem('token')
          localStorage.removeItem('refreshToken')
          delete api.defaults.headers.common['Authorization']
          // Instead of redirect, throw error to let component handle
          throw refreshError
        }
      }
    }

    return Promise.reject(error)
  }
)

export default api