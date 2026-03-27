import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import { Shield, Users, Calendar, Settings, Database, Activity, UserPlus, BarChart3, Sparkles } from 'lucide-react'

const SuperuserDashboard = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [summaryRes, usersRes] = await Promise.all([
        api.get('/api/v1/dashboard/summary/'),
        api.get('/api/v1/users/'),
      ])
      setStats(summaryRes.data)
      const userData = usersRes.data.results || usersRes.data
      setUsers(Array.isArray(userData) ? userData : [])
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  const roleCount = (code) => users.filter(u => u.role?.code === code).length

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
      <div className="glass-card rounded-3xl p-8 md:p-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 opacity-10 pointer-events-none">
          <Shield className="w-full h-full" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <Sparkles className="w-6 h-6 text-red-500" />
            <p className="text-sm font-semibold text-red-600">Суперпользователь</p>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Панель управления системой
          </h1>
          <p className="text-lg opacity-80 mb-6 max-w-2xl">
            Полный доступ ко всей системе Volunteer HQ. Управление пользователями, ролями и конфигурацией.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => navigate('/admin')}
              className="btn-ios px-6 py-3 inline-flex items-center gap-2"
            >
              <BarChart3 className="w-4 h-4" /> Админ-панель
            </button>
            <button
              onClick={() => navigate('/admin/assign')}
              className="btn-ios px-6 py-3 inline-flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" /> Назначить волонтёров
            </button>
          </div>
        </div>
      </div>

      {/* System stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card rounded-2xl p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium opacity-70 mb-2">Всего пользователей</p>
              <p className="text-3xl font-bold">{users.length}</p>
            </div>
            <Users className="w-12 h-12 opacity-30" />
          </div>
        </div>
        <div className="glass-card rounded-2xl p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium opacity-70 mb-2">Волонтёров</p>
              <p className="text-3xl font-bold">{stats?.volunteers?.total || 0}</p>
            </div>
            <Activity className="w-12 h-12 opacity-30" />
          </div>
        </div>
        <div className="glass-card rounded-2xl p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium opacity-70 mb-2">Мероприятий запланировано</p>
              <p className="text-3xl font-bold">{stats?.events?.planned || 0}</p>
            </div>
            <Calendar className="w-12 h-12 opacity-30" />
          </div>
        </div>
        <div className="glass-card rounded-2xl p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium opacity-70 mb-2">Посещаемость</p>
              <p className="text-3xl font-bold">{stats?.attendance?.avg_rate || 0}%</p>
            </div>
            <Database className="w-12 h-12 opacity-30" />
          </div>
        </div>
      </div>

      {/* Role breakdown */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="w-5 h-5 opacity-60" />
          <h3 className="text-xl font-bold">Пользователи по ролям</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { code: 'superuser', label: 'Суперпользователи', color: 'text-red-600 bg-red-500' },
            { code: 'admin', label: 'Администраторы', color: 'text-purple-600 bg-purple-500' },
            { code: 'volunteer', label: 'Волонтёры (лекторы)', color: 'text-amber-600 bg-amber-500' },
            { code: 'user', label: 'Пользователи', color: 'text-blue-600 bg-blue-500' },
          ].map(item => (
            <div key={item.code} className="glass-card rounded-xl p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-3 h-3 rounded-full ${item.color} bg-opacity-60`}></div>
                <span className={`text-sm font-semibold ${item.color.split(' ')[0]}`}>{item.label}</span>
              </div>
              <p className="text-2xl font-bold">{roleCount(item.code)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Recent users table */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-opacity-20 border-gray-300">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 opacity-60" />
            <h3 className="text-xl font-bold">Последние пользователи</h3>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-opacity-10 border-gray-300">
                <th className="px-6 py-3 text-left text-xs font-semibold opacity-60 uppercase">Пользователь</th>
                <th className="px-6 py-3 text-left text-xs font-semibold opacity-60 uppercase">Роль</th>
                <th className="px-6 py-3 text-left text-xs font-semibold opacity-60 uppercase">Статус</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-opacity-10 divide-gray-300">
              {users.slice(0, 15).map(u => (
                <tr key={u.id} className="hover:bg-opacity-50 transition-colors duration-200">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-semibold">{u.full_name || u.username}</p>
                      <p className="text-xs opacity-50">{u.email}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      u.role?.code === 'superuser' ? 'bg-red-500 bg-opacity-20 text-red-700' :
                      u.role?.code === 'admin' ? 'bg-purple-500 bg-opacity-20 text-purple-700' :
                      u.role?.code === 'volunteer' ? 'bg-amber-500 bg-opacity-20 text-amber-700' :
                      'bg-blue-500 bg-opacity-20 text-blue-700'
                    }`}>
                      {u.role?.title || 'Без роли'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      u.is_active ? 'bg-green-500 bg-opacity-20 text-green-700' : 'bg-gray-500 bg-opacity-20 text-gray-700'
                    }`}>
                      {u.is_active ? 'Активен' : 'Неактивен'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick actions */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <Settings className="w-5 h-5 opacity-60" />
          <h3 className="text-xl font-bold">Быстрые действия</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <button
            onClick={() => navigate('/admin')}
            className="glass-card rounded-xl p-4 text-left hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
          >
            <BarChart3 className="w-8 h-8 mb-2 text-purple-500" />
            <h4 className="font-bold mb-1">Админ-панель</h4>
            <p className="text-sm opacity-60">KPI, графики, создание мероприятий</p>
          </button>
          <button
            onClick={() => navigate('/admin/assign')}
            className="glass-card rounded-xl p-4 text-left hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
          >
            <UserPlus className="w-8 h-8 mb-2 text-amber-500" />
            <h4 className="font-bold mb-1">Назначение волонтёров</h4>
            <p className="text-sm opacity-60">Назначить лекторов на мероприятия</p>
          </button>
          <button
            onClick={() => navigate('/profile')}
            className="glass-card rounded-xl p-4 text-left hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
          >
            <Settings className="w-8 h-8 mb-2 text-blue-500" />
            <h4 className="font-bold mb-1">Мой профиль</h4>
            <p className="text-sm opacity-60">Настройки аккаунта</p>
          </button>
        </div>
      </div>
    </div>
  )
}

export default SuperuserDashboard
