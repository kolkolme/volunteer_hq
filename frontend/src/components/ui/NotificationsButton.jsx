import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, X, Trash2 } from 'lucide-react'

export default function NotificationsButton() {
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      title: 'Новое мероприятие',
      message: 'Создано событие "Уборка парка"',
      time: '5 мин назад',
      read: false,
      actionUrl: '/dashboard'
    },
    {
      id: 2,
      title: 'Приглашение',
      message: 'Вас пригласили на волонтёрское мероприятие',
      time: '1 час назад',
      read: false,
      actionUrl: '/dashboard'
    },
    {
      id: 3,
      title: 'Подтверждение',
      message: 'Ваше участие подтверждено',
      time: '2 часа назад',
      read: true,
      actionUrl: '/profile'
    },
  ])

  const unreadCount = notifications.filter(n => !n.read).length

  const handleNotificationClick = (notification) => {
    setNotifications(prev => prev.map(n =>
      n.id === notification.id ? { ...n, read: true } : n
    ))
    setIsOpen(false)
    if (notification.actionUrl) {
      navigate(notification.actionUrl)
    }
  }

  const handleClearAll = () => {
    setNotifications([])
    setIsOpen(false)
  }

  return (
    <>
      {/* Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="btn-ios p-3 relative transition-all duration-200"
        title="Уведомления"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-4 w-4 bg-opacity-80 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-9998 pointer-events-auto"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Dropdown */}
      {isOpen && (
        <div className="fixed top-20 right-4 w-80 max-h-96 rounded-2xl overflow-hidden flex flex-col z-9999 pointer-events-auto border divide-y" style={{ background: 'var(--card-bg)', borderColor: 'var(--border-primary)' }}>
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3">
            <h3 className="text-sm font-semibold">Уведомления</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:opacity-70 transition-opacity"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto max-h-72">
            {notifications.length > 0 ? (
              notifications.map((notif) => (
                <button
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className="w-full px-5 py-3 text-left hover:opacity-70 transition-opacity text-sm"
                  style={{ opacity: notif.read ? 0.6 : 1 }}
                >
                  <div className="flex items-start gap-2">
                    {!notif.read && (
                      <div className="h-2 w-2 rounded-full flex-shrink-0 mt-1.5" style={{ background: 'var(--glow-primary)' }} />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{notif.title}</p>
                      <p className="opacity-60 mt-0.5 line-clamp-2">{notif.message}</p>
                      <p className="opacity-40 text-xs mt-1">{notif.time}</p>
                    </div>
                  </div>
                </button>
              ))
            ) : (
              <div className="px-5 py-8 text-center">
                <Bell className="h-6 w-6 mx-auto mb-2 opacity-50" />
                <p className="text-sm opacity-70">Нет уведомлений</p>
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <button
              onClick={handleClearAll}
              className="px-5 py-3 text-sm font-medium hover:opacity-70 transition-opacity flex items-center justify-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Очистить
            </button>
          )}
        </div>
      )}
    </>
  )
}
