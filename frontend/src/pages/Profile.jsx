import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import { Calendar, CheckCircle, XCircle, Clock } from 'lucide-react'

const Profile = () => {
  const { user } = useAuth()
  const [participations, setParticipations] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProfileData()
  }, [])

  const fetchProfileData = async () => {
    try {
      const participationsResponse = await api.get('/api/v1/my/participations/')
      setParticipations(participationsResponse.data.results || participationsResponse.data)
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
      case 'attended':
        return <CheckCircle className="h-5 w-5 text-blue-600" />
      case 'absent':
        return <XCircle className="h-5 w-5 text-orange-600" />
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
      case 'attended':
        return 'Присутствовал'
      case 'absent':
        return 'Не пришёл'
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
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6">
      {/* Profile Info */}
      <div className="glass-card rounded-2xl p-5 sm:p-6">
        <h1 className="text-xl sm:text-2xl font-bold glass-title mb-4">Личный кабинет</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <h3 className="text-base font-semibold glass-title mb-2">Информация</h3>
            <div className="space-y-1.5 text-sm">
              <p><span className="font-medium glass-subtitle">Имя:</span> <span className="glass-title">{user?.full_name || `${user?.first_name} ${user?.last_name}`}</span></p>
              <p><span className="font-medium glass-subtitle">Email:</span> <span className="glass-title break-all">{user?.email}</span></p>
              <p><span className="font-medium glass-subtitle">Контакт:</span> <span className="glass-title">{user?.contact || 'Не указан'}</span></p>
              <p><span className="font-medium glass-subtitle">Роль:</span> <span className="glass-title">{user?.role?.title || 'Волонтёр'}</span></p>
              <p><span className="font-medium glass-subtitle">Статус:</span> <span className={`font-medium ${user?.is_active ? 'text-green-600' : 'text-red-500'}`}>{user?.is_active ? 'Активен' : 'Неактивен'}</span></p>
            </div>
          </div>
          <div>
            <h3 className="text-base font-semibold glass-title mb-2">Статистика</h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="glass-card rounded-xl p-3 text-center">
                <p className="text-2xl font-bold glass-title">{participations.length}</p>
                <p className="text-xs glass-subtitle mt-0.5">Всего</p>
              </div>
              <div className="glass-card rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-green-600">{participations.filter(p => p.status === 'accepted').length}</p>
                <p className="text-xs glass-subtitle mt-0.5">Принято</p>
              </div>
              <div className="glass-card rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-blue-600">{participations.filter(p => p.status === 'attended').length}</p>
                <p className="text-xs glass-subtitle mt-0.5">Завершено</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* My Participations */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/10">
          <h3 className="text-base font-semibold glass-title flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Мои участия в мероприятиях
          </h3>
        </div>
        <div className="divide-y divide-white/10">
          {participations.length > 0 ? (
            participations.map((participation) => (
              <div key={participation.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="mt-0.5 shrink-0">{getStatusIcon(participation.status)}</div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium glass-title truncate">{participation.event.title}</p>
                      <p className="text-xs glass-subtitle mt-0.5">
                        {new Date(participation.event.date_start).toLocaleDateString('ru-RU')}{' '}
                        {new Date(participation.event.date_start).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      {participation.event.address && (
                        <p className="text-xs glass-subtitle truncate">{participation.event.address}</p>
                      )}
                      {participation.comment && (
                        <p className="text-xs glass-subtitle mt-1"><span className="font-medium">Комм.:</span> {participation.comment}</p>
                      )}
                    </div>
                  </div>
                  <span className={`shrink-0 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    participation.status === 'accepted' ? 'bg-green-100 text-green-800' :
                    participation.status === 'declined' ? 'bg-red-100 text-red-800' :
                    participation.status === 'cancelled' ? 'bg-gray-100 text-gray-800' :
                    participation.status === 'attended' ? 'bg-blue-100 text-blue-800' :
                    participation.status === 'absent' ? 'bg-orange-100 text-orange-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {getStatusText(participation.status)}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="px-5 py-8 text-center glass-subtitle">
              Вы ещё не участвовали в мероприятиях
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Profile