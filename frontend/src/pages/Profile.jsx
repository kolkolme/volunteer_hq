import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import { Bell, Calendar, CheckCircle, XCircle, Clock } from 'lucide-react'

const Profile = () => {
  const { user } = useAuth()
  const [participations, setParticipations] = useState([])
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProfileData()
  }, [])

  const fetchProfileData = async () => {
    try {
      const participationsResponse = await api.get('/api/v1/my/participations/')
      setParticipations(participationsResponse.data.results || participationsResponse.data)
      setNotifications([]) // Пока уведомлений нет
    } catch (error) {
      console.error('Failed to fetch profile data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'accepted':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'declined':
        return <XCircle className="h-5 w-5 text-red-600" />
      case 'cancelled':
        return <XCircle className="h-5 w-5 text-gray-600" />
      default:
        return <Clock className="h-5 w-5 text-yellow-600" />
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case 'pending':
        return 'Ожидает ответа'
      case 'accepted':
        return 'Подтверждено'
      case 'declined':
        return 'Отказ'
      case 'cancelled':
        return 'Отменено'
      default:
        return status
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
      {/* Profile Info */}
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Личный кабинет</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Информация</h3>
            <div className="space-y-2">
              <p><span className="font-medium">Имя:</span> {user?.full_name || `${user?.first_name} ${user?.last_name}`}</p>
              <p><span className="font-medium">Email:</span> {user?.email}</p>
              <p><span className="font-medium">Контакт:</span> {user?.contact || 'Не указан'}</p>
              <p><span className="font-medium">Город:</span> {user?.city?.title || 'Не указан'}</p>
              <p><span className="font-medium">Роль:</span> {user?.role?.title || 'Волонтер'}</p>
              <p><span className="font-medium">Статус:</span> {user?.is_active ? 'Активен' : 'Неактивен'}</p>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Статистика</h3>
            <div className="space-y-2">
              <p><span className="font-medium">Всего участий:</span> {participations.length}</p>
              <p><span className="font-medium">Подтверждено:</span> {participations.filter(p => p.status === 'accepted').length}</p>
              <p><span className="font-medium">Завершено:</span> {participations.filter(p => p.status === 'completed').length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <Bell className="h-5 w-5 mr-2" />
            Уведомления
          </h3>
        </div>
        <div className="divide-y divide-gray-200">
          {notifications.length > 0 ? (
            notifications.map((notification) => (
              <div key={notification.id} className="px-6 py-4">
                <div className="flex items-start">
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">{notification.message}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(notification.created_at).toLocaleString('ru-RU')}
                    </p>
                  </div>
                  {!notification.is_read && (
                    <span className="inline-block w-2 h-2 bg-blue-600 rounded-full"></span>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="px-6 py-4 text-center text-gray-500">
              Нет новых уведомлений
            </div>
          )}
        </div>
      </div>

      {/* My Participations */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            Мои участия в мероприятиях
          </h3>
        </div>
        <div className="divide-y divide-gray-200">
          {participations.length > 0 ? (
            participations.map((participation) => (
              <div key={participation.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {getStatusIcon(participation.status)}
                    <div className="ml-3">
                      <h4 className="text-sm font-medium text-gray-900">
                        {participation.event.title}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {new Date(participation.event.start_date).toLocaleDateString('ru-RU')} в {participation.event.start_time}
                      </p>
                      <p className="text-sm text-gray-500">{participation.event.location}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      participation.status === 'accepted' ? 'bg-green-100 text-green-800' :
                      participation.status === 'declined' ? 'bg-red-100 text-red-800' :
                      participation.status === 'cancelled' ? 'bg-gray-100 text-gray-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {getStatusText(participation.status)}
                    </span>
                  </div>
                </div>
                {participation.comment && (
                  <div className="mt-2 text-sm text-gray-600">
                    <span className="font-medium">Комментарий:</span> {participation.comment}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="px-6 py-4 text-center text-gray-500">
              Вы еще не участвовали в мероприятиях
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Profile