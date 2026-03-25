import { useState, useEffect } from 'react'
import api from '../services/api'

const EventAssignment = () => {
  const [events, setEvents] = useState([])
  const [expandedEventId, setExpandedEventId] = useState(null)
  const [selectedEventId, setSelectedEventId] = useState(null)
  const [availableVolunteers, setAvailableVolunteers] = useState([])
  const [selectedVolunteers, setSelectedVolunteers] = useState([])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchEvents()
  }, [])

  useEffect(() => {
    if (selectedEventId) {
      const selectedEvent = events.find((evt) => evt.id === Number(selectedEventId))
      if (selectedEvent?.city?.id) {
        fetchVolunteersByCity(selectedEvent.city.id)
      } else {
        setAvailableVolunteers([])
      }
      setSelectedVolunteers([])
      setMessage('')
    }
  }, [selectedEventId, events])

  const fetchEvents = async () => {
    setLoading(true)
    try {
      const response = await api.get('/api/v1/events/?ordering=-created_at')
      const data = response.data.results || response.data
      setEvents(data)
    } catch (error) {
      console.error('Failed to fetch events:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchVolunteersByCity = async (cityId) => {
    if (!cityId) {
      setAvailableVolunteers([])
      return
    }
    try {
      const response = await api.get(`/api/v1/users/?city=${cityId}&is_active=true`)
      const users = response.data.results || response.data
      setAvailableVolunteers(users.filter((u) => u.role?.code === 'volunteer'))
    } catch (error) {
      console.error('Failed to fetch volunteers:', error)
      setAvailableVolunteers([])
    }
  }

  const assignVolunteers = async () => {
    if (!selectedEventId) {
      setMessage('Выберите мероприятие для назначения.')
      return
    }
    if (!selectedVolunteers.length) {
      setMessage('Выберите хотя бы одного волонтёра.')
      return
    }

    try {
      const response = await api.post(`/api/v1/events/${selectedEventId}/assign_volunteers/`, {
        volunteer_ids: selectedVolunteers,
      })
      const { assigned, already_assigned, invalid } = response.data
      let msg = `Назначено: ${assigned.length}. `
      if (already_assigned.length) msg += `Уже назначено: ${already_assigned.length}. `
      if (invalid.length) msg += `Невозможно назначить из другого города: ${invalid.length}. `
      setMessage(msg)
      await fetchEvents()
    } catch (error) {
      console.error(error)
      setMessage('Ошибка назначения: ' + (error.response?.data?.detail || 'Проверьте права.'))
    }
  }

  const selectedEvent = events.find((evt) => evt.id === Number(selectedEventId))

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-3xl font-bold text-gray-900">Назначение волонтёров</h1>
        <p className="mt-2 text-gray-600">Выберите существующее мероприятие, посмотрите его данные и назначьте волонтеров.</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-3">1. Список мероприятий</h2>
        <p className="text-sm text-gray-600 mb-4">Нажмите на мероприятие, чтобы увидеть подробности и выбрать для назначения.</p>
        <div className="space-y-3">
          {events.length === 0 && <p className="text-gray-500">Нет доступных мероприятий.</p>}
          {events.map((event) => (
            <div key={event.id} className="border rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{event.title} (ID {event.id})</h3>
                  <p className="text-sm text-gray-500">{event.event_type?.title || 'Без типа'} • {event.city?.title || 'Без города'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-1 rounded-lg bg-gray-100 text-gray-700">{event.status}</span>
                  <button
                    className="text-xs text-blue-600 hover:underline"
                    onClick={() => setSelectedEventId(event.id)}
                  >
                    Выбрать
                  </button>
                  <button
                    className="text-xs text-indigo-600 hover:underline"
                    onClick={() => setExpandedEventId(expandedEventId === event.id ? null : event.id)}
                  >
                    {expandedEventId === event.id ? 'Свернуть' : 'Развернуть'}
                  </button>
                </div>
              </div>

              {expandedEventId === event.id && (
                <div className="mt-3 bg-gray-50 p-3 rounded-lg">
                  <p><strong>Адрес:</strong> {event.address}</p>
                  <p><strong>Описание:</strong> {event.description || '—'}</p>
                  <p><strong>Дата начала:</strong> {new Date(event.date_start).toLocaleString('ru-RU')}</p>
                  <p><strong>Дата окончания:</strong> {new Date(event.date_end).toLocaleString('ru-RU')}</p>
                  <p><strong>Мин волонтёров:</strong> {event.volunteers_count_min}</p>
                  <p><strong>Макс волонтёров:</strong> {event.volunteers_count_max}</p>
                  <p><strong>Назначено:</strong> {event.assigned_count ?? 0}</p>
                  <p><strong>Свободных слотов:</strong> {event.free_slots ?? 0}</p>
                  <p><strong>Принято:</strong> {event.accepted_count ?? 0}</p>
                  <p><strong>Проведено:</strong> {event.attended_count ?? 0}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-3">2. Выбранное мероприятие</h2>
        {selectedEvent ? (
          <div className="mb-4">
            <p><strong>Текущее событие:</strong> {selectedEvent.title} (ID {selectedEvent.id})</p>
            <p className="text-sm text-gray-500">Город: {selectedEvent.city?.title || '—'}. Тип: {selectedEvent.event_type?.title || '—'}.</p>
          </div>
        ) : (
          <p className="text-gray-500">Сначала выберите мероприятие из списка.</p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-sm font-medium">Город мероприятия</span>
            <input value={selectedEvent?.city?.title || ''} type="text" readOnly className="mt-1 block w-full border rounded p-2 bg-gray-100" />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Свободных слотов</span>
            <input value={selectedEvent?.free_slots ?? 0} type="text" readOnly className="mt-1 block w-full border rounded p-2 bg-gray-100" />
          </label>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-3">3. Выбрать волонтеров</h2>
        {selectedEvent ? (
          <div>
            <div className="space-y-2">
              {availableVolunteers.length === 0 ? (
                <p className="text-gray-500">Нет доступных волонтеров в городе этого мероприятия.</p>
              ) : (
                availableVolunteers.map((vol) => (
                  <label key={vol.id} className="flex items-center border rounded p-2">
                    <input
                      type="checkbox"
                      className="mr-2"
                      value={vol.id}
                      checked={selectedVolunteers.includes(vol.id)}
                      onChange={(e) => {
                        const id = Number(e.target.value)
                        setSelectedVolunteers((prev) =>
                          e.target.checked ? [...prev, id] : prev.filter((vid) => vid !== id)
                        )
                      }}
                    />
                    {vol.full_name || `${vol.first_name} ${vol.last_name}`} ({vol.username})
                  </label>
                ))
              )}
            </div>

            <button
              onClick={assignVolunteers}
              disabled={!selectedVolunteers.length}
              className="mt-4 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
            >
              Назначить выбранных волонтёров
            </button>
            {message && <p className="mt-3 text-sm text-blue-700">{message}</p>}
          </div>
        ) : (
          <p className="text-gray-500">Выберите мероприятие для загрузки списка волонтёров.</p>
        )}
      </div>
    </div>
  )
}

export default EventAssignment
