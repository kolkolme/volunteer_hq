import { useState, useEffect } from 'react'
import api from '../services/api'
import { Calendar, Users, ChevronDown, ChevronUp, CheckCircle, AlertCircle, Search, UserPlus, Zap } from 'lucide-react'

const EventAssignment = () => {
  const [events, setEvents] = useState([])
  const [expandedEventId, setExpandedEventId] = useState(null)
  const [selectedEventId, setSelectedEventId] = useState(null)
  const [availableVolunteers, setAvailableVolunteers] = useState([])
  const [assignedUserIds, setAssignedUserIds] = useState(new Set())
  const [selectedVolunteers, setSelectedVolunteers] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [eventSearchQuery, setEventSearchQuery] = useState('')
  const [showEventList, setShowEventList] = useState(false)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [assigning, setAssigning] = useState(false)

  useEffect(() => {
    fetchEvents()
  }, [])

  useEffect(() => {
    if (selectedEventId) {
      fetchAllVolunteers()
      fetchAssignedVolunteers(selectedEventId)
      setSelectedVolunteers([])
      setSearchQuery('')
      setMessage('')
    }
  }, [selectedEventId])

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

  const fetchAssignedVolunteers = async (eventId) => {
    try {
      const response = await api.get(`/api/v1/events/${eventId}/participants/`)
      const participants = response.data.results || response.data
      setAssignedUserIds(new Set(participants.map((p) => p.user?.id || p.user_id)))
    } catch (error) {
      setAssignedUserIds(new Set())
    }
  }

  const fetchAllVolunteers = async () => {
    try {
      const response = await api.get('/api/v1/users/?is_active=true')
      const users = response.data.results || response.data
      setAvailableVolunteers(users.filter((u) => u.role?.code === 'volunteer'))
    } catch (error) {
      console.error('Failed to fetch volunteers:', error)
      setAvailableVolunteers([])
    }
  }

  const assignVolunteers = async () => {
    if (!selectedEventId || !selectedVolunteers.length) return

    setAssigning(true)
    try {
      const response = await api.post(`/api/v1/events/${selectedEventId}/assign_volunteers/`, {
        volunteer_ids: selectedVolunteers,
      })
      const { assigned, already_assigned, invalid } = response.data
      let msg = ''
      if (assigned.length) msg += `✅ Назначено: ${assigned.length}. `
      if (already_assigned.length) msg += `Уже назначено: ${already_assigned.length}. `
      if (invalid.length) msg += `Невозможно назначить: ${invalid.length}. `
      setMessage(msg)
      setSelectedVolunteers([])
      await fetchEvents()
      await fetchAssignedVolunteers(selectedEventId)
    } catch (error) {
      setMessage('❌ ' + (error.response?.data?.detail || 'Ошибка назначения.'))
    } finally {
      setAssigning(false)
    }
  }

  const selectedEvent = events.find((evt) => evt.id === Number(selectedEventId))

  const filteredEvents = events.filter((event) => {
    if (!eventSearchQuery) return true
    return event.title.toLowerCase().includes(eventSearchQuery.toLowerCase())
  })

  const filteredVolunteers = availableVolunteers.filter((vol) => {
    if (!searchQuery) return true
    const name = (vol.full_name || `${vol.first_name} ${vol.last_name}`).toLowerCase()
    return name.includes(searchQuery.toLowerCase()) || vol.username.toLowerCase().includes(searchQuery.toLowerCase())
  })

  const selectableVolunteers = filteredVolunteers.filter((v) => !assignedUserIds.has(v.id))

  const toggleAllFiltered = () => {
    const selectableIds = selectableVolunteers.map((v) => v.id)
    const allSelected = selectableIds.every((id) => selectedVolunteers.includes(id))
    if (allSelected) {
      setSelectedVolunteers((prev) => prev.filter((id) => !selectableIds.includes(id)))
    } else {
      setSelectedVolunteers((prev) => [...new Set([...prev, ...selectableIds])])
    }
  }

  const getStatusLabel = (status) => {
    switch (status) {
      case 'planned': return 'Планируется'
      case 'ongoing': return 'Идёт'
      case 'completed': return 'Завершено'
      case 'cancelled': return 'Отменено'
      default: return status
    }
  }

  const getStatusStyle = (status) => {
    switch (status) {
      case 'planned': return 'bg-amber-500 bg-opacity-20 text-amber-700'
      case 'ongoing': return 'bg-blue-500 bg-opacity-20 text-blue-700'
      case 'completed': return 'bg-green-500 bg-opacity-20 text-green-700'
      case 'cancelled': return 'bg-red-500 bg-opacity-20 text-red-700'
      default: return 'bg-gray-500 bg-opacity-20 text-gray-700'
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
      {/* Header */}
      <div className="glass-panel rounded-3xl p-8 border border-white border-opacity-30">
        <div className="flex items-center gap-3 mb-3">
          <UserPlus className="h-8 w-8 text-blue-500" />
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
            Назначение волонтёров
          </h1>
        </div>
        <p className="text-sm opacity-80 mt-2">Выберите мероприятие и назначьте на него волонтёров</p>
      </div>

      {/* Progress Steps */}
      <div className="flex gap-4">
        {[1, 2, 3].map((s) => {
          const active = s === 1 || (s === 2 && selectedEventId) || (s === 3 && selectedEventId)
          return (
            <div key={s} className="flex-1 flex items-center gap-3">
              <div className={`h-2 flex-1 rounded-full transition-all duration-300 ${
                active
                  ? 'bg-gradient-to-r from-blue-500 to-cyan-500 shadow-lg shadow-blue-500/30'
                  : 'bg-white bg-opacity-20'
              }`} />
            </div>
          )
        })}
      </div>

      {/* Step 1: Event Selection */}
      <div className="glass-panel rounded-3xl p-8 border border-white border-opacity-30">
        <h2 className="text-xl font-bold flex items-center gap-2 mb-6">
          <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-sm font-bold">1</span>
          Мероприятие
          {selectedEvent && (
            <span className="ml-auto text-sm font-medium opacity-70 truncate max-w-xs">
              {selectedEvent.title}
            </span>
          )}
        </h2>

        {/* Search + Toggle */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 opacity-40" />
            <input
              type="text"
              value={eventSearchQuery}
              onChange={(e) => {
                setEventSearchQuery(e.target.value)
                if (!showEventList) setShowEventList(true)
              }}
              placeholder="Поиск мероприятия по названию..."
              className="glass-input w-full rounded-2xl pl-11 pr-4 py-3 border border-white border-opacity-30 backdrop-blur-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-all"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowEventList(!showEventList)}
            className="btn-ios-secondary px-5 py-3 rounded-2xl text-sm font-medium transition-all whitespace-nowrap flex items-center gap-2"
          >
            {showEventList ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {showEventList ? 'Скрыть список' : `Показать (${events.length})`}
          </button>
        </div>

        {events.length === 0 ? (
          <p className="opacity-60 text-center py-8">Нет доступных мероприятий</p>
        ) : showEventList ? (
          <div className="space-y-3">
            {filteredEvents.length === 0 ? (
              <p className="opacity-60 text-center py-6">Ничего не найдено</p>
            ) : filteredEvents.map((event) => {
              const isSelected = selectedEventId === event.id
              const isExpanded = expandedEventId === event.id
              return (
                <div
                  key={event.id}
                  className={`rounded-2xl border-2 transition-all duration-300 overflow-hidden ${
                    isSelected
                      ? 'border-blue-500 border-opacity-60 shadow-lg shadow-blue-500/10'
                      : 'border-white border-opacity-20 hover:border-opacity-40'
                  }`}
                  style={{ background: 'var(--card-bg)' }}
                >
                  <div
                    className="p-4 cursor-pointer flex items-center gap-4"
                    onClick={() => setSelectedEventId(event.id)}
                  >
                    {/* Radio indicator */}
                    <div className={`flex-shrink-0 w-5 h-5 rounded-full border-2 transition-all duration-300 flex items-center justify-center ${
                      isSelected ? 'border-blue-500 bg-blue-500' : 'border-white border-opacity-40'
                    }`}>
                      {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>

                    {/* Event info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold truncate">{event.title}</h3>
                        <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full backdrop-blur-sm ${getStatusStyle(event.status)}`}>
                          {getStatusLabel(event.status)}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-3 text-sm opacity-70 mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {new Date(event.date_start).toLocaleDateString('ru-RU')}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />
                          {event.assigned_count ?? 0}/{event.volunteers_count_max}
                        </span>
                      </div>
                    </div>

                    {/* Expand toggle */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setExpandedEventId(isExpanded ? null : event.id)
                      }}
                      className="flex-shrink-0 p-2 rounded-xl hover:bg-white hover:bg-opacity-10 transition-all"
                    >
                      {isExpanded ? <ChevronUp className="h-4 w-4 opacity-60" /> : <ChevronDown className="h-4 w-4 opacity-60" />}
                    </button>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-0 border-t border-white border-opacity-10">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                        <div className="glass-card rounded-xl p-3">
                          <p className="text-xs opacity-60">Ссылка</p>
                          <a href={event.address} target="_blank" rel="noopener noreferrer" className="text-sm font-medium mt-1 text-blue-500 hover:underline block truncate">{event.address || '—'}</a>
                        </div>
                        <div className="glass-card rounded-xl p-3">
                          <p className="text-xs opacity-60">Тип</p>
                          <p className="text-sm font-medium mt-1">{event.event_type?.title || '—'}</p>
                        </div>
                        <div className="glass-card rounded-xl p-3">
                          <p className="text-xs opacity-60">Начало</p>
                          <p className="text-sm font-medium mt-1">{new Date(event.date_start).toLocaleString('ru-RU')}</p>
                        </div>
                        <div className="glass-card rounded-xl p-3">
                          <p className="text-xs opacity-60">Окончание</p>
                          <p className="text-sm font-medium mt-1">{new Date(event.date_end).toLocaleString('ru-RU')}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                        <div className="glass-card rounded-xl p-3 text-center">
                          <p className="text-xs opacity-60">Мин</p>
                          <p className="text-lg font-bold mt-1">{event.volunteers_count_min}</p>
                        </div>
                        <div className="glass-card rounded-xl p-3 text-center">
                          <p className="text-xs opacity-60">Макс</p>
                          <p className="text-lg font-bold mt-1">{event.volunteers_count_max}</p>
                        </div>
                        <div className="glass-card rounded-xl p-3 text-center">
                          <p className="text-xs opacity-60">Назначено</p>
                          <p className="text-lg font-bold mt-1">{event.assigned_count ?? 0}</p>
                        </div>
                        <div className="glass-card rounded-xl p-3 text-center">
                          <p className="text-xs opacity-60">Свободно</p>
                          <p className="text-lg font-bold mt-1 text-green-500">{event.free_slots ?? 0}</p>
                        </div>
                      </div>
                      {event.description && (
                        <p className="text-sm opacity-70 mt-3">{event.description}</p>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
            }
          </div>
        ) : null}
      </div>

      {/* Step 2: Selected Event Summary */}
      <div className={`glass-panel rounded-3xl p-8 border border-white border-opacity-30 transition-all duration-300 ${!selectedEvent ? 'opacity-50' : ''}`}>
        <h2 className="text-xl font-bold flex items-center gap-2 mb-6">
          <span className={`inline-flex items-center justify-center h-8 w-8 rounded-full text-white text-sm font-bold ${
            selectedEvent ? 'bg-gradient-to-r from-blue-500 to-cyan-500' : 'bg-gray-400'
          }`}>2</span>
          Выбранное мероприятие
        </h2>

        {selectedEvent ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="glass-card rounded-2xl p-5">
              <p className="text-xs font-semibold opacity-60 uppercase tracking-wide">Мероприятие</p>
              <p className="text-lg font-bold mt-2">{selectedEvent.title}</p>
              <p className="text-sm opacity-70 mt-1">{selectedEvent.event_type?.title || '—'}</p>
            </div>
            <div className="glass-card rounded-2xl p-5">
              <p className="text-xs font-semibold opacity-60 uppercase tracking-wide">Свободные слоты</p>
              <p className="text-3xl font-bold mt-2 text-green-500">{selectedEvent.free_slots ?? 0}</p>
              <p className="text-xs opacity-60 mt-1">из {selectedEvent.volunteers_count_max}</p>
            </div>
          </div>
        ) : (
          <p className="opacity-60 text-center py-4">Выберите мероприятие из списка выше</p>
        )}
      </div>

      {/* Step 3: Volunteers */}
      <div className={`glass-panel rounded-3xl p-8 border border-white border-opacity-30 transition-all duration-300 ${!selectedEvent ? 'opacity-50 pointer-events-none' : ''}`}>
        <h2 className="text-xl font-bold flex items-center gap-2 mb-6">
          <span className={`inline-flex items-center justify-center h-8 w-8 rounded-full text-white text-sm font-bold ${
            selectedEvent ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-gray-400'
          }`}>3</span>
          Выбрать волонтёров
          {selectedVolunteers.length > 0 && (
            <span className="ml-auto inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-blue-500 bg-opacity-20 text-blue-600">
              Выбрано: {selectedVolunteers.length}
            </span>
          )}
        </h2>

        {selectedEvent ? (
          <>
            {/* Search & Select All */}
            <div className="flex flex-col sm:flex-row gap-3 mb-5">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 opacity-40" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Поиск по имени или логину..."
                  className="glass-input w-full rounded-2xl pl-11 pr-4 py-3 border border-white border-opacity-30 backdrop-blur-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 transition-all"
                />
              </div>
              {selectableVolunteers.length > 0 && (
                <button
                  type="button"
                  onClick={toggleAllFiltered}
                  className="btn-ios-secondary px-5 py-3 rounded-2xl text-sm font-medium transition-all whitespace-nowrap"
                >
                  {selectableVolunteers.every((v) => selectedVolunteers.includes(v.id)) ? 'Снять все' : 'Выбрать все'}
                </button>
              )}
            </div>

            {/* Volunteer Cards */}
            {filteredVolunteers.length === 0 ? (
              <p className="opacity-60 text-center py-8">
                {availableVolunteers.length === 0 ? 'Нет доступных волонтёров' : 'Никого не найдено'}
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
                {filteredVolunteers.map((vol) => {
                  const isAssigned = assignedUserIds.has(vol.id)
                  const isChecked = selectedVolunteers.includes(vol.id)
                  return (
                    <div
                      key={vol.id}
                      onClick={() => {
                        if (isAssigned) return
                        setSelectedVolunteers((prev) =>
                          isChecked ? prev.filter((vid) => vid !== vol.id) : [...prev, vol.id]
                        )
                      }}
                      className={`rounded-2xl p-4 border-2 transition-all duration-200 flex items-center gap-3 ${
                        isAssigned
                          ? 'border-white border-opacity-10 opacity-60 cursor-default'
                          : isChecked
                            ? 'border-green-500 border-opacity-60 shadow-lg shadow-green-500/10 cursor-pointer'
                            : 'border-white border-opacity-20 hover:border-opacity-40 cursor-pointer'
                      }`}
                      style={{ background: 'var(--card-bg)' }}
                    >
                      {/* Avatar */}
                      <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold transition-all duration-200 ${
                        isAssigned
                          ? 'bg-gradient-to-br from-blue-400 to-blue-600'
                          : isChecked
                            ? 'bg-gradient-to-br from-green-500 to-emerald-500'
                            : 'bg-gradient-to-br from-gray-400 to-gray-500'
                      }`}>
                        {(vol.first_name?.[0] || vol.username[0]).toUpperCase()}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">
                          {vol.full_name || `${vol.first_name} ${vol.last_name}`}
                        </p>
                        <p className="text-xs opacity-60 truncate">@{vol.username}</p>
                      </div>

                      {/* Status / Checkbox */}
                      {isAssigned ? (
                        <span className="flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-500 bg-opacity-20 text-blue-600">
                          Участвует
                        </span>
                      ) : (
                        <div className={`flex-shrink-0 w-5 h-5 rounded-md border-2 transition-all duration-200 flex items-center justify-center ${
                          isChecked
                            ? 'bg-green-500 border-green-500'
                            : 'border-white border-opacity-40'
                        }`}>
                          {isChecked && <CheckCircle className="h-3.5 w-3.5 text-white" />}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Assign Button */}
            <button
              onClick={assignVolunteers}
              disabled={!selectedVolunteers.length || assigning}
              className="w-full btn-ios py-4 rounded-2xl font-semibold flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-base"
            >
              <UserPlus className="h-5 w-5" />
              {assigning ? 'Назначение...' : `Назначить ${selectedVolunteers.length > 0 ? selectedVolunteers.length + ' волонтёров' : ''}`}
            </button>
          </>
        ) : (
          <p className="opacity-60 text-center py-4">Выберите мероприятие для загрузки списка волонтёров</p>
        )}
      </div>

      {/* Message */}
      {message && (
        <div className={`glass-panel rounded-3xl p-6 border-2 transition-all duration-300 ${
          message.startsWith('✅')
            ? 'border-green-500 border-opacity-50'
            : 'border-red-500 border-opacity-50'
        }`}>
          <p className="font-medium text-center">{message}</p>
        </div>
      )}
    </div>
  )
}

export default EventAssignment
