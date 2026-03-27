import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import GlassCard from '../components/ui/GlassCard'
import IosButton from '../components/ui/IosButton'
import GlassInput from '../components/ui/GlassInput'
import api from '../services/api'
import {
  getComplaints,
  acceptComplaint,
  rejectComplaint,
} from '../services/api'
import ChatWidget from '../components/ChatWidget'
import RatingLeaderboard from '../components/RatingLeaderboard'
import MobileBottomNav from '../components/ui/MobileBottomNav'
import { MessageSquare, AlertTriangle, ClipboardList, Check, X, Trophy } from 'lucide-react'

const TABS = [
  { id: 'complaints', label: 'Жалобы',   short: 'Жалобы', icon: AlertTriangle },
  { id: 'events',     label: 'Лекции',   short: 'Лекции', icon: ClipboardList },
  { id: 'rating',     label: 'Рейтинг',   short: 'Рейтинг', icon: Trophy },
  { id: 'chats',      label: 'Чаты',     short: 'Чаты', icon: MessageSquare },
]

// ────────────────────────────────────────────────────────────────
// Complaints Tab
// ────────────────────────────────────────────────────────────────
const ComplaintsTab = () => {
  const [complaints, setComplaints] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')

  const load = async () => {
    setLoading(true)
    try {
      const res = await getComplaints(filter ? { status: filter } : {})
      setComplaints(res.data.results || res.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [filter])

  const handleAction = async (id, action) => {
    try {
      if (action === 'accept') await acceptComplaint(id)
      else await rejectComplaint(id)
      load()
    } catch (e) {
      alert(e.response?.data?.detail || 'Ошибка')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {['', 'pending', 'accepted', 'rejected'].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${
              filter === s ? 'bg-amber-500 text-white' : 'glass-card glass-subtitle hover:opacity-80'
            }`}
          >
            {s === '' ? 'Все' : s === 'pending' ? 'Ожидают' : s === 'accepted' ? 'Приняты' : 'Отклонены'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="glass-subtitle text-center py-8">Загрузка...</div>
      ) : complaints.length === 0 ? (
        <div className="glass-subtitle text-center py-8">Жалобы не найдены</div>
      ) : (
        <div className="space-y-3">
          {complaints.map((c) => (
            <GlassCard key={c.id} className="p-4">
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      c.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      c.status === 'accepted' ? 'bg-green-100 text-green-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {c.status === 'pending' ? 'Ожидает' : c.status === 'accepted' ? 'Принята' : 'Отклонена'}
                    </span>
                    <span className="text-xs glass-subtitle">{new Date(c.created_at).toLocaleDateString('ru')}</span>
                  </div>
                  <p className="text-sm glass-title font-medium mb-1">
                    На: {c.volunteer_detail?.full_name || '—'}
                    {c.event_title ? ` (${c.event_title})` : ''}
                  </p>
                  <p className="text-sm glass-subtitle">{c.text}</p>
                  <p className="text-xs glass-subtitle mt-1">От: {c.reporter?.full_name || '—'}</p>
                </div>
                {c.status === 'pending' && (
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleAction(c.id, 'accept')}
                      className="p-2 rounded-xl bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
                      title="Принять"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleAction(c.id, 'reject')}
                      className="p-2 rounded-xl bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                      title="Отклонить"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────
// Events Tab — coordinator can create/view events
// ────────────────────────────────────────────────────────────────
const EventsTab = () => {
  const { user } = useAuth()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [lectureTypeId, setLectureTypeId] = useState('')
  const [form, setForm] = useState({
    title: '', description: '', date_start: '', date_end: '',
    volunteers_count_min: 1, volunteers_count_max: 5,
    event_type: '',
  })
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const typeRes = await api.get('/api/v1/event-types/')
        const types = typeRes.data.results || typeRes.data
        const lectureType = types.find((t) => t.code === 'lecture')
        const lectureId = lectureType?.id || ''
        setLectureTypeId(lectureId)
        setForm((prev) => ({ ...prev, event_type: lectureId }))
        const params = lectureId ? { event_type: lectureId } : {}
        const evRes = await api.get('/api/v1/events/', { params })
        setEvents(evRes.data.results || evRes.data)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    setSubmitError('')
    try {
      const res = await api.post('/api/v1/events/', { ...form, status: 'planned' })
      setEvents((prev) => [res.data, ...prev])
      setCreating(false)
      setForm({ title: '', description: '', date_start: '', date_end: '', volunteers_count_min: 1, volunteers_count_max: 5, event_type: lectureTypeId })
    } catch (e) {
      setSubmitError(JSON.stringify(e.response?.data || 'Ошибка создания'))
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold glass-title">Лекции</h3>
        <IosButton size="sm" onClick={() => setCreating(!creating)}>
          {creating ? 'Отмена' : '+ Создать'}
        </IosButton>
      </div>

      {creating && (
        <GlassCard className="p-4">
          <form className="space-y-3" onSubmit={handleCreate}>
            <GlassInput placeholder="Название" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required className="w-full" />
            <GlassInput placeholder="Описание" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs glass-subtitle mb-1 block">Начало</label>
                <GlassInput type="datetime-local" value={form.date_start} onChange={(e) => setForm({ ...form, date_start: e.target.value })} required className="w-full" />
              </div>
              <div>
                <label className="text-xs glass-subtitle mb-1 block">Конец</label>
                <GlassInput type="datetime-local" value={form.date_end} onChange={(e) => setForm({ ...form, date_end: e.target.value })} required className="w-full" />
              </div>
            </div>
            <div>
              <label className="text-xs glass-subtitle mb-1 block">Мин/Макс волонтёров</label>
              <div className="flex gap-2">
                <GlassInput type="number" min={1} value={form.volunteers_count_min} onChange={(e) => setForm({ ...form, volunteers_count_min: +e.target.value })} className="w-full" />
                <GlassInput type="number" min={1} value={form.volunteers_count_max} onChange={(e) => setForm({ ...form, volunteers_count_max: +e.target.value })} className="w-full" />
              </div>
            </div>
            {submitError && <p className="text-red-500 text-xs">{submitError}</p>}
            <IosButton type="submit" className="w-full">Создать лекцию</IosButton>
          </form>
        </GlassCard>
      )}

      {loading ? (
        <div className="glass-subtitle text-center py-8">Загрузка...</div>
      ) : events.length === 0 ? (
        <div className="glass-subtitle text-center py-8">Лекций нет</div>
      ) : (
        <div className="space-y-3">
          {events.slice(0, 20).map((ev) => (
            <GlassCard key={ev.id} className="p-4">
              <div className="flex justify-between items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium glass-title truncate">{ev.title}</p>
                  <p className="text-xs glass-subtitle">{ev.event_type?.title}</p>
                  <p className="text-xs glass-subtitle">{new Date(ev.date_start).toLocaleDateString('ru')}</p>
                </div>
                <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${
                  ev.status === 'planned' ? 'bg-blue-100 text-blue-800' :
                  ev.status === 'completed' ? 'bg-green-100 text-green-800' :
                  ev.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                  'bg-yellow-100 text-yellow-800'
                }">
                  {ev.status === 'planned' ? 'Запланировано' :
                   ev.status === 'completed' ? 'Завершено' :
                   ev.status === 'cancelled' ? 'Отменено' : ev.status}
                </span>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────
// Chats Tab


// ────────────────────────────────────────────────────────────────
// Main CoordinatorDashboard
// ────────────────────────────────────────────────────────────────
const CoordinatorDashboard = () => {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('complaints')

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6 pb-20 lg:pb-6">
      {/* Header */}
      <GlassCard className="p-4 sm:p-6">
        <div className="flex items-center gap-4">
          {user?.photo_url && (
            <img src={user.photo_url} alt="" className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold glass-title truncate">Привет, {user?.first_name || user?.username}!</h1>
            <p className="glass-subtitle text-sm mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
              <span>Координатор · Рейтинг: {user?.avg_rating?.toFixed(1) ?? '—'}</span>
              {user?.has_permit && (
                <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full text-xs font-medium">
                  Разрешение выдано
                </span>
              )}
            </p>
          </div>
        </div>
      </GlassCard>

      {/* Tabs — desktop only (mobile uses bottom nav below) */}
      <div className="hidden lg:flex gap-2 flex-wrap">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all ${
              activeTab === id
                ? 'bg-amber-500 text-white shadow-lg'
                : 'glass-card glass-subtitle hover:opacity-80'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <GlassCard className="p-4 sm:p-6">
        {activeTab === 'complaints' && <ComplaintsTab />}
        {activeTab === 'events' && <EventsTab />}
        {activeTab === 'rating' && <RatingLeaderboard currentUser={user} />}
        {activeTab === 'chats' && <ChatWidget user={user} color="amber" height="h-[500px]" />}
      </GlassCard>

      {/* Mobile bottom navigation bar */}
      <MobileBottomNav tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} color="amber" />
    </div>
  )
}

export default CoordinatorDashboard
