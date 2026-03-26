import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import { Calendar, Users, Zap, CheckCircle, AlertCircle } from 'lucide-react'

const EventCreationForm = ({ onEventCreated }) => {
  const navigate = useNavigate()
  const [eventTypes, setEventTypes] = useState([])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [createdEventId, setCreatedEventId] = useState(null)
  const [step, setStep] = useState(1)

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_type: '',
    date_start: '',
    date_end: '',
    status: 'planned',
    volunteers_count_min: 2,
    volunteers_count_max: 10,
  })

  useEffect(() => {
    fetchEventTypes()
  }, [])

  const fetchEventTypes = async () => {
    try {
      const response = await api.get('/api/v1/event-types/')
      const data = response.data.results || response.data
      setEventTypes(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to fetch event types:', error)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    setCreatedEventId(null)

    try {
      const response = await api.post('/api/v1/events/', formData)
      setCreatedEventId(response.data.id)
      setMessage('✅ Мероприятие успешно создано!')
      setFormData({
        title: '',
        description: '',
        event_type: '',
        date_start: '',
        date_end: '',
        status: 'planned',
        volunteers_count_min: 2,
        volunteers_count_max: 10,
      })
      setStep(1)
      if (onEventCreated) onEventCreated(response.data)
    } catch (error) {
      setMessage('❌ Ошибка: ' + (error.response?.data?.detail || error.message))
    } finally {
      setLoading(false)
    }
  }

  const isStep1Valid = formData.title && formData.event_type
  const isStep2Valid = formData.date_start && formData.date_end && formData.volunteers_count_min && formData.volunteers_count_max

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Header */}
      <div className="glass-panel rounded-3xl p-8 mb-6 border border-white border-opacity-30">
        <div className="flex items-center gap-3 mb-3">
          <Zap className="h-8 w-8 text-amber-400" />
          <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Создать мероприятие
          </h2>
        </div>
        <p className="text-sm opacity-80 mt-2">Заполните информацию о новом волонтёрском мероприятии за несколько шагов</p>
      </div>

      {/* Progress Steps */}
      <div className="flex gap-4 mb-8">
        {[1, 2].map((s) => (
          <div
            key={s}
            className={`flex-1 h-2 rounded-full transition-all duration-300 ${
              s <= step
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 shadow-lg shadow-purple-500/50'
                : 'bg-white bg-opacity-20'
            }`}
          />
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Basic Info */}
        {step === 1 && (
          <div className="glass-panel rounded-3xl p-8 border border-white border-opacity-30 space-y-6 animate-fadeIn">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-bold">
                1
              </span>
              Основная информация
            </h3>

            {/* Title */}
            <div>
              <label className="text-sm font-semibold mb-2 block">Название мероприятия *</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="Например: Уборка парка, Помощь пожилым людям..."
                className="glass-input w-full rounded-2xl px-4 py-3 border border-white border-opacity-30 backdrop-blur-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50 transition-all"
                required
              />
            </div>

            {/* Event Type */}
            <div>
              <label className="text-sm font-semibold mb-2 block">Тип мероприятия *</label>
              <select
                name="event_type"
                value={formData.event_type}
                onChange={handleChange}
                className="glass-input w-full rounded-2xl px-4 py-3 border border-white border-opacity-30 backdrop-blur-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50 transition-all"
                required
              >
                <option value="">Выберите тип</option>
                {eventTypes.map((et) => (
                  <option key={et.id} value={et.id}>
                    {et.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="text-sm font-semibold mb-2 block">Описание (опционально)</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Подробное описание мероприятия..."
                rows="4"
                className="glass-input w-full rounded-2xl px-4 py-3 border border-white border-opacity-30 backdrop-blur-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50 transition-all resize-none"
              />
            </div>

            {/* Step 1 Button */}
            <button
              type="button"
              disabled={!isStep1Valid}
              onClick={() => setStep(2)}
              className="w-full btn-ios py-3 rounded-2xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <span>Далее</span>
              <span>→</span>
            </button>
          </div>
        )}

        {/* Step 2: Dates & Volunteers */}
        {step === 2 && (
          <div className="glass-panel rounded-3xl p-8 border border-white border-opacity-30 space-y-6 animate-fadeIn">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-sm font-bold">
                2
              </span>
              Даты и волонтёры
            </h3>

            {/* Date Start & End */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold mb-2 block flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Дата начала *
                </label>
                <input
                  type="datetime-local"
                  name="date_start"
                  value={formData.date_start}
                  onChange={handleChange}
                  className="glass-input w-full rounded-2xl px-4 py-3 border border-white border-opacity-30 backdrop-blur-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-all"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-semibold mb-2 block flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Дата окончания *
                </label>
                <input
                  type="datetime-local"
                  name="date_end"
                  value={formData.date_end}
                  onChange={handleChange}
                  className="glass-input w-full rounded-2xl px-4 py-3 border border-white border-opacity-30 backdrop-blur-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-all"
                  required
                />
              </div>
            </div>

            {/* Min & Max Volunteers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold mb-2 block flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Минимум волонтёров *
                </label>
                <input
                  type="number"
                  name="volunteers_count_min"
                  value={formData.volunteers_count_min}
                  onChange={handleChange}
                  min="1"
                  className="glass-input w-full rounded-2xl px-4 py-3 border border-white border-opacity-30 backdrop-blur-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-all"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-semibold mb-2 block flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Максимум волонтёров *
                </label>
                <input
                  type="number"
                  name="volunteers_count_max"
                  value={formData.volunteers_count_max}
                  onChange={handleChange}
                  min="1"
                  className="glass-input w-full rounded-2xl px-4 py-3 border border-white border-opacity-30 backdrop-blur-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-all"
                  required
                />
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="text-sm font-semibold mb-2 block">Статус мероприятия</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {['planned', 'ongoing', 'completed', 'cancelled'].map((st) => (
                  <label
                    key={st}
                    className={`px-3 py-2 rounded-xl text-sm font-medium cursor-pointer transition-all border-2 ${
                      formData.status === st
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 border-white text-white'
                        : 'bg-white bg-opacity-10 border-white border-opacity-30 hover:bg-opacity-20'
                    }`}
                  >
                    <input
                      type="radio"
                      name="status"
                      value={st}
                      checked={formData.status === st}
                      onChange={handleChange}
                      className="hidden"
                    />
                    {st === 'planned' && 'Планируется'}
                    {st === 'ongoing' && 'Идёт'}
                    {st === 'completed' && 'Завершено'}
                    {st === 'cancelled' && 'Отменено'}
                  </label>
                ))}
              </div>
            </div>

            {/* Step 2 Buttons */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 btn-ios-secondary py-3 rounded-2xl font-semibold transition-all"
              >
                ← Назад
              </button>
              <button
                type="submit"
                disabled={!isStep2Valid || loading}
                className="flex-1 btn-ios py-3 rounded-2xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <CheckCircle className="h-5 w-5" />
                {loading ? 'Создание...' : 'Создать мероприятие'}
              </button>
            </div>
          </div>
        )}
      </form>

      {/* Success Message */}
      {message && (
        <div className={`mt-6 glass-panel rounded-3xl p-6 border-2 ${
          message.startsWith('✅')
            ? 'border-green-500 border-opacity-50 bg-green-500 bg-opacity-10'
            : 'border-red-500 border-opacity-50 bg-red-500 bg-opacity-10'
        }`}>
          <p className="font-medium text-center">{message}</p>
          {createdEventId && (
            <button
              onClick={() => navigate('/admin/assign')}
              className="w-full mt-3 btn-ios py-2 rounded-xl text-sm font-medium transition-all"
            >
              Перейти к назначению волонтёров
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default EventCreationForm
