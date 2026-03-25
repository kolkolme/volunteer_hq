import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import { Calendar, Users, CheckCircle, Clock, Plus, Sparkles } from 'lucide-react'

const Dashboard = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState({
    totalEvents: 0,
    upcomingEvents: 0,
    completedEvents: 0,
    pendingParticipations: 0,
  })
  const [recentEvents, setRecentEvents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const [eventsResponse, participationsResponse] = await Promise.all([
        api.get('/api/v1/events/'),
        api.get('/api/v1/my/participations/'),
      ])

      const events = eventsResponse.data.results || eventsResponse.data
      const participations = participationsResponse.data.results || participationsResponse.data

      // Calculate stats
      const now = new Date()
      const upcoming = events.filter(event => new Date(event.start_date) > now).length
      const completed = participations.filter(p => p.status === 'completed').length
      const pending = participations.filter(p => p.status === 'pending').length

      setStats({
        totalEvents: events.length,
        upcomingEvents: upcoming,
        completedEvents: completed,
        pendingParticipations: pending,
      })

      // Get recent events (next 5)
      const recent = events
        .filter(event => new Date(event.start_date) > now)
        .sort((a, b) => new Date(a.start_date) - new Date(b.start_date))
        .slice(0, 5)
      setRecentEvents(recent)

    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="glass-card rounded-3xl p-8 md:p-12 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 opacity-10 pointer-events-none">
          <Sparkles className="w-full h-full" />
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <Sparkles className="w-6 h-6 text-amber-500" />
            <p className="text-sm font-semibold text-amber-600">Добро пожаловать!</p>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Привет, {user?.full_name || user?.username}! 👋
          </h1>
          
          <p className="text-lg opacity-80 mb-6 max-w-2xl">
            Вы вошли как <span className="font-semibold text-amber-600">{user?.role?.title || 'Волонтер'}</span>. 
            Используйте этот портал для управления волонтёрскими мероприятиями и участием в них.
          </p>
          
          {/* Quick action for new users */}
          <div className="flex flex-wrap gap-3">
            <button 
              onClick={() => navigate('/profile')}
              className="btn-ios px-6 py-3 inline-flex items-center gap-2"
            >
              <span>📝</span> Обновить профиль
            </button>
            {user?.role?.title === 'Координатор' && (
              <button 
                onClick={() => navigate('/admin/assign')}
                className="btn-ios px-6 py-3 inline-flex items-center gap-2 border-2"
              >
                <Plus className="w-4 h-4" /> Создать мероприятие
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card rounded-2xl p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium opacity-70 mb-2">Всего мероприятий</p>
              <p className="text-3xl font-bold">{stats.totalEvents}</p>
            </div>
            <Calendar className="w-12 h-12 opacity-30" />
          </div>
        </div>

        <div className="glass-card rounded-2xl p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium opacity-70 mb-2">Предстоящих</p>
              <p className="text-3xl font-bold">{stats.upcomingEvents}</p>
            </div>
            <Clock className="w-12 h-12 opacity-30" />
          </div>
        </div>

        <div className="glass-card rounded-2xl p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium opacity-70 mb-2">Завершено</p>
              <p className="text-3xl font-bold">{stats.completedEvents}</p>
            </div>
            <CheckCircle className="w-12 h-12 opacity-30" />
          </div>
        </div>

        <div className="glass-card rounded-2xl p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium opacity-70 mb-2">Ожидает ответа</p>
              <p className="text-3xl font-bold">{stats.pendingParticipations}</p>
            </div>
            <Users className="w-12 h-12 opacity-30" />
          </div>
        </div>
      </div>

      {/* Events Section */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-opacity-20 border-gray-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 opacity-60" />
              <h3 className="text-xl font-bold">Ближайшие мероприятия</h3>
            </div>
            {user?.role?.title === 'Координатор' && (
              <button 
                onClick={() => navigate('/admin/assign')}
                className="btn-ios px-4 py-2 inline-flex items-center gap-2 text-sm"
              >
                <Plus className="w-4 h-4" /> Создать
              </button>
            )}
          </div>
        </div>
        
        <div className="divide-y divide-opacity-10 divide-gray-300">
          {recentEvents.length > 0 ? (
            recentEvents.map((event) => (
              <div key={event.id} className="px-6 py-5 hover:bg-opacity-50 transition-colors duration-200">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-base font-semibold mb-2">{event.title}</h4>
                    <div className="flex flex-wrap gap-4 text-sm opacity-70">
                      <span className="flex items-center gap-1">
                        📅 {new Date(event.start_date).toLocaleDateString('ru-RU')} в {event.start_time}
                      </span>
                      <span className="flex items-center gap-1">
                        📍 {event.location}
                      </span>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full backdrop-blur-sm ${
                      event.status === 'planned' ? 'bg-yellow-500 bg-opacity-20 text-yellow-700' :
                      event.status === 'ongoing' ? 'bg-blue-500 bg-opacity-20 text-blue-700' :
                      'bg-green-500 bg-opacity-20 text-green-700'
                    }`}>
                      {event.status === 'planned' ? '📋 Запланировано' :
                       event.status === 'ongoing' ? '🔴 Идёт' : '✅ Завершено'}
                    </span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="px-6 py-8 text-center">
              <div className="opacity-50 mb-3">📭</div>
              <p className="opacity-60">Нет предстоящих мероприятий</p>
              {user?.role?.title === 'Координатор' && (
                <p className="text-sm opacity-40 mt-2">
                  Создайте первое мероприятие, нажав кнопку выше
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Dashboard