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
          const response = await axios.post(`${api.defaults.baseURL}/api/v1/auth/token/refresh/`, {
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

// ---- Tags ----
export const getTags = (params) => api.get('/api/v1/tags/', { params })
export const createTag = (data) => api.post('/api/v1/tags/', data)
export const updateTag = (id, data) => api.patch(`/api/v1/tags/${id}/`, data)
export const deleteTag = (id) => api.delete(`/api/v1/tags/${id}/`)

// ---- Materials ----
export const getMaterials = (params) => api.get('/api/v1/materials/', { params })
export const createMaterial = (data) => api.post('/api/v1/materials/', data)
export const deleteMaterial = (id) => api.delete(`/api/v1/materials/${id}/`)

// ---- Chats ----
export const getChats = () => api.get('/api/v1/chats/')
export const createChat = (participant_id) => api.post('/api/v1/chats/', { participant_id })
export const getMessages = (room) => api.get('/api/v1/messages/', { params: { room } })
export const sendMessage = (room, content) => api.post('/api/v1/messages/', { room, content })
export const markMessagesRead = (room) => api.post('/api/v1/messages/mark_read/', { room })

// ---- Complaints ----
export const getComplaints = (params) => api.get('/api/v1/complaints/', { params })
export const createComplaint = (data) => api.post('/api/v1/complaints/', data)
export const acceptComplaint = (id) => api.post(`/api/v1/complaints/${id}/accept/`)
export const rejectComplaint = (id) => api.post(`/api/v1/complaints/${id}/reject/`)

// ---- Users ----
export const grantPermit = (userId) => api.post(`/api/v1/users/${userId}/grant_permit/`)
export const revokePermit = (userId) => api.post(`/api/v1/users/${userId}/revoke_permit/`)
export const grantAdminka = (userId) => api.post(`/api/v1/users/${userId}/grant_adminka/`)