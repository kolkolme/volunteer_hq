import { useState, useEffect } from 'react'
import api from '../services/api'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts'
import { Users, Calendar, TrendingUp, Award, MapPin, AlertTriangle } from 'lucide-react'
import EventCreationForm from '../components/EventCreationForm'

const AdminDashboard = () => {
  const [summary, setSummary] = useState({})
  const [activity, setActivity] = useState([])
  const [podium, setPodium] = useState([])
  const [calendar, setCalendar] = useState({})
  const [cities, setCities] = useState([])
  const [eventTypes, setEventTypes] = useState([])
  const [problems, setProblems] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
    fetchEventTypes()
  }, [])

  const fetchEventTypes = async () => {
    try {
      const response = await api.get('/api/v1/event-types/')
      const data = response.data
      setEventTypes(Array.isArray(data) ? data : data.results || [])
    } catch (error) {
      console.error('Failed to fetch event types:', error)
      setEventTypes([])
    }
  }

  const fetchDashboardData = async () => {
    try {
      const [
        summaryRes,
        activityRes,
        podiumRes,
        calendarRes,
        citiesRes,
        problemsRes
      ] = await Promise.all([
        api.get('/api/v1/dashboard/summary/'),
        api.get('/api/v1/dashboard/activity/'),
        api.get('/api/v1/dashboard/podium/'),
        api.get('/api/v1/dashboard/calendar/'),
        api.get('/api/v1/dashboard/cities/'),
        api.get('/api/v1/dashboard/problems/'),
      ])

      setSummary(summaryRes.data)
      setActivity(activityRes.data.leaders || [])
      setPodium(podiumRes.data)
      setCalendar(calendarRes.data)
      setCities(citiesRes.data)
      setProblems(problemsRes.data)
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']

  const handleEventCreated = (event) => {
    fetchDashboardData()
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
      {/* Header */}
      <div className="glass-panel rounded-3xl p-8 border border-white border-opacity-30">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Панель управления</h1>
        <p className="text-sm opacity-80 mt-2">Обзор волонтерской активности по всем мероприятиям</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel rounded-2xl p-6 border border-white border-opacity-30 bg-gradient-to-br from-blue-500 from-opacity-10 to-cyan-500 to-opacity-10 hover:shadow-lg hover:shadow-blue-500/20 hover:border-opacity-50 transition-all duration-300">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg">
              <Users className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold opacity-70 uppercase tracking-wide">Активных волонтеров</p>
              <p className="text-3xl font-bold mt-1">{summary?.volunteers?.active || 0}</p>
            </div>
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-6 border border-white border-opacity-30 bg-gradient-to-br from-green-500 from-opacity-10 to-emerald-500 to-opacity-10 hover:shadow-lg hover:shadow-green-500/20 hover:border-opacity-50 transition-all duration-300">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 shadow-lg">
              <Calendar className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold opacity-70 uppercase tracking-wide">Мероприятий (месяц)</p>
              <p className="text-3xl font-bold mt-1">{summary?.events?.completed_this_month || 0}</p>
            </div>
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-6 border border-white border-opacity-30 bg-gradient-to-br from-purple-500 from-opacity-10 to-pink-500 to-opacity-10 hover:shadow-lg hover:shadow-purple-500/20 hover:border-opacity-50 transition-all duration-300">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold opacity-70 uppercase tracking-wide">Средняя явка</p>
              <p className="text-3xl font-bold mt-1">{summary?.attendance?.avg_rate ? `${summary.attendance.avg_rate}%` : '0%'}</p>
            </div>
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-6 border border-white border-opacity-30 bg-gradient-to-br from-amber-500 from-opacity-10 to-yellow-500 to-opacity-10 hover:shadow-lg hover:shadow-amber-500/20 hover:border-opacity-50 transition-all duration-300">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-500 shadow-lg">
              <Award className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold opacity-70 uppercase tracking-wide">Завершено</p>
              <p className="text-3xl font-bold mt-1">{summary?.attendance?.attended_total || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Create event */}
      <EventCreationForm onEventCreated={handleEventCreated} />

      {/* Assign volunteers link */}
      <div className="glass-panel rounded-3xl p-8 border border-white border-opacity-30 text-center">
        <p className="text-sm opacity-80 mb-4">Готовы назначить волонтеров на мероприятие?</p>
        <button 
          onClick={() => window.location.href = '/admin/assign'} 
          className="btn-ios px-8 py-3 rounded-2xl font-semibold transition-all"
        >
          Перейти к назначению волонтеров
        </button>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Активность по типам мероприятий</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={activity}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="event_type" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Cities Distribution */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Распределение по городам</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={cities}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
              >
                {cities.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Podium */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <Award className="h-5 w-5 mr-2" />
          Пьедестал почёта
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {podium && podium.first && (
            <div className="text-center p-4 rounded-lg bg-yellow-50 border-2 border-yellow-200">
              <div className="text-4xl mb-2">🥇</div>
              <h4 className="font-medium text-gray-900">{podium.first.full_name}</h4>
              <p className="text-lg font-bold text-gray-900 mt-2">{podium.first.score} очков</p>
            </div>
          )}
          {podium && podium.second && (
            <div className="text-center p-4 rounded-lg bg-gray-50 border-2 border-gray-200">
              <div className="text-4xl mb-2">🥈</div>
              <h4 className="font-medium text-gray-900">{podium.second.full_name}</h4>
              <p className="text-lg font-bold text-gray-900 mt-2">{podium.second.score} очков</p>
            </div>
          )}
          {podium && podium.third && (
            <div className="text-center p-4 rounded-lg bg-orange-50 border-2 border-orange-200">
              <div className="text-4xl mb-2">🥉</div>
              <h4 className="font-medium text-gray-900">{podium.third.full_name}</h4>
              <p className="text-lg font-bold text-gray-900 mt-2">{podium.third.score} очков</p>
            </div>
          )}
        </div>
      </div>

      {/* Calendar & Problems */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Calendar Summary */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            Календарь мероприятий
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Запланировано</span>
              <span className="font-bold text-blue-600">{calendar.planned || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Проведено</span>
              <span className="font-bold text-green-600">{calendar.completed || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Явка</span>
              <span className="font-bold text-purple-600">
                {calendar.planned && calendar.completed ?
                  `${Math.round((calendar.completed / calendar.planned) * 100)}%` : '0%'}
              </span>
            </div>
          </div>
        </div>

        {/* Problems */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2" />
            Проблемы и замечания
          </h3>
          <div className="space-y-3">
            {problems && problems.understaffed_events && problems.understaffed_events.length > 0 ? (
              problems.understaffed_events.map((event, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-900">
                      Недостаток волонтеров: {event.title} ({event.city}) - нужно {event.volunteers_needed}
                    </p>
                    <p className="text-xs text-gray-500">{new Date(event.date_start).toLocaleDateString('ru-RU')}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">Проблем нет</p>
            )}
            {problems && problems.no_response_participants > 0 && (
              <div className="flex items-start space-x-3">
                <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-900">
                    {problems.no_response_participants} участников ожидают ответа
                  </p>
                </div>
              </div>
            )}
            {problems && problems.low_attendance_events > 0 && (
              <div className="flex items-start space-x-3">
                <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-900">
                    {problems.low_attendance_events} мероприятий с низкой явкой
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard