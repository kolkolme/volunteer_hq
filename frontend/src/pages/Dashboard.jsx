import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import { getTags, createMaterial } from '../services/api'
import ChatWidget from '../components/ChatWidget'
import RatingLeaderboard from '../components/RatingLeaderboard'
import GlassCard from '../components/ui/GlassCard'
import GlassInput from '../components/ui/GlassInput'
import IosButton from '../components/ui/IosButton'
import {
  BookOpen, Calendar, CheckCircle, Clock, MessageSquare,
  Plus, Sparkles, Star, Tag, Trophy, Users, FileText, ClipboardList, Search,
} from 'lucide-react'

// ──────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────
const TAG_TYPE_LABELS = { subject: 'Предмет', experience: 'Стаж', duration: 'Длительность', time_slot: 'Время' }
const TAG_TYPE_ORDER = ['subject', 'experience', 'duration', 'time_slot']
const TABS = [
  { id: 'my_lectures', label: 'Мои лекции',    icon: BookOpen },
  { id: 'create',      label: 'Создать лекцию', icon: Plus },
  { id: 'accept',      label: 'Принять лекцию', icon: ClipboardList },
  { id: 'stats',       label: 'Статистика',     icon: Star },
  { id: 'rating',      label: 'Рейтинг',          icon: Trophy },
  { id: 'chats',       label: 'Чаты',           icon: MessageSquare },
]

// ──────────────────────────────────────────────
// TagSelector (with search + custom subject creation)
// ──────────────────────────────────────────────
const TagSelector = ({ selected, customTags, onChange, onCustomTagsChange }) => {
  const [allTags, setAllTags] = useState([])
  const [search, setSearch] = useState('')
  const [newSubjectInput, setNewSubjectInput] = useState('')

  useEffect(() => {
    getTags().then((res) => setAllTags(res.data.results || res.data)).catch(() => {})
  }, [])

  const q = search.toLowerCase()
  const grouped = TAG_TYPE_ORDER.reduce((acc, type) => {
    acc[type] = allTags.filter((t) => t.tag_type === type && (q === '' || t.title.toLowerCase().includes(q)))
    return acc
  }, {})

  const toggleExisting = (tagId) =>
    onChange(selected.includes(tagId) ? selected.filter((id) => id !== tagId) : [...selected, tagId])

  const toggleCustom = (title) =>
    onCustomTagsChange(customTags.includes(title) ? customTags.filter((t) => t !== title) : [...customTags, title])

  const addCustomSubject = () => {
    const v = newSubjectInput.trim()
    if (!v) return
    const existing = allTags.find((t) => t.title.toLowerCase() === v.toLowerCase())
    if (existing) {
      if (!selected.includes(existing.id)) onChange([...selected, existing.id])
    } else if (!customTags.includes(v)) {
      onCustomTagsChange([...customTags, v])
    }
    setNewSubjectInput('')
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      {allTags.length > 6 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск тегов..."
            className="glass-input w-full rounded-xl pl-9 pr-4 py-2.5 text-sm"
          />
        </div>
      )}

      {TAG_TYPE_ORDER.map((type) => {
        const groupTags = grouped[type] || []
        const isSubject = type === 'subject'
        if (groupTags.length === 0 && !isSubject) return null
        if (groupTags.length === 0 && isSubject && customTags.length === 0 && q !== '') return null
        return (
          <div key={type}>
            <p className="text-xs font-semibold glass-subtitle uppercase tracking-wide mb-2">
              {TAG_TYPE_LABELS[type]}{isSubject && <span className="ml-1 normal-case font-normal opacity-60">(можно добавить свой)</span>}
            </p>
            <div className="flex flex-wrap gap-2 items-center">
              {groupTags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleExisting(tag.id)}
                  className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${
                    selected.includes(tag.id) ? 'bg-amber-500 text-white shadow-md' : 'glass-card glass-subtitle hover:opacity-80'
                  }`}
                >
                  {tag.title}
                </button>
              ))}
              {/* Custom subject tags */}
              {isSubject && customTags.map((title) => (
                <button
                  key={`c_${title}`}
                  type="button"
                  onClick={() => toggleCustom(title)}
                  className="px-3 py-1.5 rounded-xl text-sm font-medium bg-amber-500 text-white shadow-md flex items-center gap-1.5"
                >
                  {title}
                  <span className="text-xs opacity-75">✕</span>
                </button>
              ))}
              {/* Add custom subject input */}
              {isSubject && q === '' && (
                <div className="flex items-center gap-1 mt-0.5">
                  <input
                    type="text"
                    value={newSubjectInput}
                    onChange={(e) => setNewSubjectInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomSubject() } }}
                    placeholder="Свой предмет..."
                    className="glass-input rounded-xl px-3 py-1.5 text-sm w-36"
                  />
                  <button
                    type="button"
                    onClick={addCustomSubject}
                    className="px-2.5 py-1.5 rounded-xl text-sm font-bold bg-amber-500/20 text-amber-600 hover:bg-amber-500 hover:text-white transition-all"
                  >
                    +
                  </button>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ──────────────────────────────────────────────
// My Lectures Tab
// ──────────────────────────────────────────────
const MyLecturesTab = () => {
  const [participations, setParticipations] = useState([])
  const [createdEvents, setCreatedEvents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/api/v1/my/events/')
      .then((res) => {
        // new response shape: { participations: [...], created: [...] }
        if (res.data.participations !== undefined) {
          setParticipations(res.data.participations)
          setCreatedEvents(res.data.created)
        } else {
          // fallback: old flat array format
          setParticipations(res.data.results || res.data)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="text-center py-8 glass-subtitle">Загрузка...</p>
  if (!participations.length && !createdEvents.length)
    return (
      <div className="text-center py-12">
        <BookOpen className="w-12 h-12 mx-auto opacity-30 mb-3" />
        <p className="glass-subtitle">Нет лекций</p>
      </div>
    )
  return (
    <div className="space-y-4">
      {/* Self-created lectures */}
      {createdEvents.length > 0 && (
        <div>
          <p className="text-xs font-semibold glass-subtitle uppercase tracking-wide mb-2">Созданные мной</p>
          <div className="space-y-3">
            {createdEvents.map((ev) => (
              <GlassCard key={`c_${ev.id}`} className="p-4">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold glass-title truncate">{ev.title}</p>
                    <p className="text-xs glass-subtitle mt-0.5">{ev.city?.title} · {ev.event_type?.title}</p>
                    <p className="text-xs glass-subtitle mt-0.5">
                      {ev.date_start
                        ? new Date(ev.date_start).toLocaleDateString('ru', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
                        : '—'}
                    </p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${
                    ev.status === 'planned'   ? 'bg-yellow-100 text-yellow-800' :
                    ev.status === 'ongoing'   ? 'bg-blue-100 text-blue-800' :
                    ev.status === 'completed' ? 'bg-green-100 text-green-800' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {ev.status === 'planned'   ? 'Запланировано' :
                     ev.status === 'ongoing'   ? 'Идёт' :
                     ev.status === 'completed' ? 'Завершено' :
                     ev.status === 'cancelled' ? 'Отменено' : ev.status}
                  </span>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      )}

      {/* Participation-based lectures */}
      {participations.length > 0 && (
        <div>
          {createdEvents.length > 0 && (
            <p className="text-xs font-semibold glass-subtitle uppercase tracking-wide mb-2">Назначенные координатором</p>
          )}
          <div className="space-y-3">
            {participations.map((p) => (
              <GlassCard key={p.id} className="p-4">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold glass-title truncate">{p.event?.title}</p>
                    <p className="text-xs glass-subtitle mt-0.5">{p.event?.city?.title} · {p.event?.event_type?.title}</p>
                    <p className="text-xs glass-subtitle mt-0.5">
                      {p.event?.date_start
                        ? new Date(p.event.date_start).toLocaleDateString('ru', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
                        : '—'}
                    </p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${
                    p.status === 'pending'  ? 'bg-yellow-100 text-yellow-800' :
                    p.status === 'accepted' ? 'bg-green-100 text-green-800' :
                    p.status === 'attended' ? 'bg-blue-100 text-blue-800' :
                    p.status === 'declined' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {p.status === 'pending'   ? 'Ожидает ответа' :
                     p.status === 'accepted'  ? 'Подтверждено' :
                     p.status === 'attended'  ? 'Присутствовал' :
                     p.status === 'declined'  ? 'Отказ' :
                     p.status === 'absent'    ? 'Не пришёл' :
                     p.status === 'cancelled' ? 'Отменено' : p.status}
                  </span>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ──────────────────────────────────────────────
// Create Lecture Tab
// ──────────────────────────────────────────────
const CreateLectureTab = () => {
  const { user } = useAuth()
  const [eventTypes, setEventTypes] = useState([])
  const [selectedTags, setSelectedTags] = useState([])
  const [customTagTitles, setCustomTagTitles] = useState([])
  const [materials, setMaterials] = useState([])
  const [createdEvent, setCreatedEvent] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [addingMat, setAddingMat] = useState(false)
  const [form, setForm] = useState({
    title: '', description: '', address: '',
    event_type: '',
    date_start: '', date_end: '',
    volunteers_count_min: 1, volunteers_count_max: 5,
  })
  const [matForm, setMatForm] = useState({ title: '', file_url: '', material_type: 'presentation' })

  useEffect(() => {
    api.get('/api/v1/event-types/').then((res) => setEventTypes(res.data.results || res.data))
  }, [])

  const handleAddMaterial = () => {
    if (!matForm.title.trim() || !matForm.file_url.trim()) return
    setMaterials((prev) => [...prev, { ...matForm }])
    setMatForm({ title: '', file_url: '', material_type: 'presentation' })
    setAddingMat(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!selectedTags.length && !customTagTitles.length) { setError('Выберите хотя бы один тег'); return }
    setSubmitting(true)
    try {
      // Create custom subject tags first
      const newTagIds = []
      for (const title of customTagTitles) {
        try {
          const code = title.toLowerCase().replace(/\s+/g, '_').replace(/[^a-zа-яё0-9_]/gi, '')
          const r = await api.post('/api/v1/tags/', { title, tag_type: 'subject', code: code || `tag_${Date.now()}` })
          newTagIds.push(r.data.id)
        } catch {}
      }
      const allTagIds = [...selectedTags, ...newTagIds]
      const res = await api.post('/api/v1/events/', { ...form, tag_ids: allTagIds, status: 'planned' })
      const event = res.data
      for (const mat of materials) {
        await api.post('/api/v1/materials/', { ...mat, event: event.id })
      }
      setCreatedEvent(event)
      setForm({ title: '', description: '', address: '', event_type: '', date_start: '', date_end: '', volunteers_count_min: 1, volunteers_count_max: 5 })
      setSelectedTags([])
      setCustomTagTitles([])
      setMaterials([])
    } catch (err) {
      const data = err.response?.data
      if (typeof data === 'object') {
        setError(Object.entries(data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join('\n'))
      } else { setError('Ошибка создания лекции') }
    } finally { setSubmitting(false) }
  }

  if (createdEvent)
    return (
      <div className="text-center py-12">
        <CheckCircle className="w-14 h-14 mx-auto text-green-500 mb-4" />
        <h3 className="text-xl font-bold glass-title mb-2">Лекция создана!</h3>
        <p className="glass-subtitle mb-1">{createdEvent.title}</p>
        <p className="glass-subtitle text-sm mb-6">Ожидайте назначения координатором</p>
        <IosButton onClick={() => setCreatedEvent(null)}>Создать ещё</IosButton>
      </div>
    )

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-sm font-medium glass-subtitle mb-1">Название лекции *</label>
        <GlassInput value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Например: Введение в Python" required className="w-full" />
      </div>
      <div>
        <label className="block text-sm font-medium glass-subtitle mb-1">Описание</label>
        <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Расскажите студентам, о чём будет лекция..." rows={3} className="glass-input w-full rounded-xl px-4 py-3 text-sm resize-none" />
      </div>
      <div>
        <label className="block text-sm font-medium glass-subtitle mb-1">Тип мероприятия *</label>
        <select value={form.event_type} onChange={(e) => setForm({ ...form, event_type: e.target.value })} required className="glass-input w-full rounded-xl px-4 py-3 text-sm">
          <option value="">Выберите тип</option>
          {eventTypes.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium glass-subtitle mb-1">Ссылка на конференцию *</label>
        <GlassInput type="url" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="https://zoom.us/j/..." required className="w-full" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium glass-subtitle mb-1">Начало *</label>
          <GlassInput type="datetime-local" value={form.date_start} onChange={(e) => setForm({ ...form, date_start: e.target.value })} required className="w-full" />
        </div>
        <div>
          <label className="block text-sm font-medium glass-subtitle mb-1">Конец *</label>
          <GlassInput type="datetime-local" value={form.date_end} onChange={(e) => setForm({ ...form, date_end: e.target.value })} required className="w-full" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium glass-subtitle mb-1">Макс. студентов</label>
        <GlassInput type="number" min={1} value={form.volunteers_count_max} onChange={(e) => setForm({ ...form, volunteers_count_max: +e.target.value })} className="w-full" />
      </div>

      {/* Tags */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Tag className="w-4 h-4 opacity-60" />
          <label className="text-sm font-medium glass-subtitle">Теги <span className="text-red-500">*</span></label>
        </div>
        <GlassCard className="p-4">
          <TagSelector
            selected={selectedTags}
            customTags={customTagTitles}
            onChange={setSelectedTags}
            onCustomTagsChange={setCustomTagTitles}
          />
        </GlassCard>
        {(selectedTags.length + customTagTitles.length) > 0 && (
          <p className="text-xs glass-subtitle mt-1">Выбрано: {selectedTags.length + customTagTitles.length}</p>
        )}
      </div>

      {/* Materials */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 opacity-60" />
            <span className="text-sm font-medium glass-subtitle">Материалы лекции</span>
          </div>
          <button type="button" onClick={() => setAddingMat(!addingMat)} className="text-xs px-3 py-1.5 rounded-xl glass-card glass-subtitle hover:opacity-80 transition-all">
            {addingMat ? 'Скрыть' : '+ Добавить'}
          </button>
        </div>
        {addingMat && (
          <GlassCard className="p-4 mb-3 space-y-3">
            <GlassInput value={matForm.title} onChange={(e) => setMatForm({ ...matForm, title: e.target.value })} placeholder="Название материала" className="w-full" />
            <GlassInput value={matForm.file_url} onChange={(e) => setMatForm({ ...matForm, file_url: e.target.value })} placeholder="Ссылка на файл (URL)" className="w-full" type="url" />
            <select value={matForm.material_type} onChange={(e) => setMatForm({ ...matForm, material_type: e.target.value })} className="glass-input w-full rounded-xl px-4 py-3 text-sm">
              <option value="presentation">Презентация</option>
              <option value="text">Текст</option>
              <option value="assignment">Задание</option>
              <option value="other">Другое</option>
            </select>
            <IosButton type="button" onClick={handleAddMaterial} className="w-full">Добавить материал</IosButton>
          </GlassCard>
        )}
        {materials.length > 0 && (
          <div className="space-y-2">
            {materials.map((m, i) => (
              <div key={i} className="flex items-center justify-between gap-3 glass-card rounded-xl px-4 py-3">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="w-4 h-4 opacity-50 shrink-0" />
                  <span className="text-sm glass-title truncate">{m.title}</span>
                  <span className="text-xs glass-subtitle shrink-0">({m.material_type})</span>
                </div>
                <button type="button" onClick={() => setMaterials((prev) => prev.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-600 text-xs shrink-0">✕</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3">
          <pre className="text-red-600 text-xs whitespace-pre-wrap">{error}</pre>
        </div>
      )}
      <IosButton type="submit" disabled={submitting} className="w-full">
        {submitting ? 'Создаём...' : 'Создать лекцию'}
      </IosButton>
    </form>
  )
}

// ──────────────────────────────────────────────
// Accept Lecture Tab
// ──────────────────────────────────────────────
const AcceptLectureTab = () => {
  const [participations, setParticipations] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    api.get('/api/v1/my/participations/')
      .then((res) => setParticipations((res.data.results || res.data).filter((p) => p.status === 'pending')))
      .finally(() => setLoading(false))
  }, [])
  const handleDecision = async (pk, action) => {
    try {
      await api.post(`/api/v1/my/participations/${pk}/${action}/`)
      setParticipations((prev) => prev.filter((p) => p.id !== pk))
    } catch (e) { alert(e.response?.data?.detail || 'Ошибка') }
  }
  if (loading) return <p className="text-center py-8 glass-subtitle">Загрузка...</p>
  if (!participations.length)
    return (
      <div className="text-center py-12">
        <ClipboardList className="w-12 h-12 mx-auto opacity-30 mb-3" />
        <p className="glass-subtitle">Нет новых приглашений на лекции</p>
      </div>
    )
  return (
    <div className="space-y-4">
      <p className="text-sm glass-subtitle">Координатор назначил вас на следующие мероприятия:</p>
      {participations.map((p) => (
        <GlassCard key={p.id} className="p-5">
          <div className="mb-3">
            <h4 className="font-semibold glass-title text-lg">{p.event?.title}</h4>
            <p className="text-sm glass-subtitle mt-1">{p.event?.event_type?.title} · {p.event?.city?.title}</p>
            <p className="text-sm glass-subtitle">
              {p.event?.date_start ? new Date(p.event.date_start).toLocaleString('ru', { dateStyle: 'long', timeStyle: 'short' }) : '—'}
            </p>
            {p.event?.address && <p className="text-sm glass-subtitle">📍 {p.event.address}</p>}
            {p.event?.description && <p className="text-sm glass-subtitle mt-2 line-clamp-3">{p.event.description}</p>}
          </div>
          <div className="flex gap-3">
            <button onClick={() => handleDecision(p.id, 'accept')} className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-green-500 text-white hover:bg-green-600 transition-colors">✓ Принять</button>
            <button onClick={() => handleDecision(p.id, 'decline')} className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-red-500 text-white hover:bg-red-600 transition-colors">✕ Отказаться</button>
          </div>
        </GlassCard>
      ))}
    </div>
  )
}

// ──────────────────────────────────────────────
// Stats Tab
// ──────────────────────────────────────────────
const StatsTab = () => {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    api.get('/api/v1/my/stats/').then((res) => setStats(res.data)).finally(() => setLoading(false))
  }, [])
  if (loading) return <p className="text-center py-8 glass-subtitle">Загрузка...</p>
  if (!stats) return null
  const items = [
    { label: 'Всего мероприятий', value: stats.events_total,    icon: Calendar,     color: 'text-blue-500' },
    { label: 'Подтверждено',      value: stats.accepted_events, icon: CheckCircle,  color: 'text-green-500' },
    { label: 'Посещено',          value: stats.attended_events, icon: Star,         color: 'text-amber-500' },
    { label: 'Отказов',           value: stats.declined_events, icon: Clock,        color: 'text-red-500' },
    { label: 'Не пришёл',         value: stats.absent_events,   icon: Users,        color: 'text-gray-500' },
    { label: 'Явка',              value: `${stats.attendance_rate}%`, icon: CheckCircle, color: 'text-purple-500' },
    { label: 'Активность',        value: stats.activity_score,  icon: Sparkles,     color: 'text-pink-500' },
  ]
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {items.map(({ label, value, icon: Icon, color }) => (
          <GlassCard key={label} className="p-4 text-center">
            <Icon className={`w-6 h-6 mx-auto mb-2 ${color}`} />
            <p className="text-2xl font-bold glass-title">{value}</p>
            <p className="text-xs glass-subtitle mt-1">{label}</p>
          </GlassCard>
        ))}
      </div>
      <GlassCard className="p-4">
        <p className="text-sm font-semibold glass-subtitle mb-3">Явка на мероприятия</p>
        <div className="flex items-center gap-3">
          <div className="flex-1 h-3 rounded-full bg-white/20 overflow-hidden">
            <div className="h-full rounded-full bg-amber-500 transition-all duration-700" style={{ width: `${Math.min(stats.attendance_rate, 100)}%` }} />
          </div>
          <span className="text-sm font-bold glass-title w-14 text-right">{Math.min(stats.attendance_rate, 100)}%</span>
        </div>
        <div className="flex justify-between mt-2 text-xs glass-subtitle">
          <span>{stats.attended_events} посещено</span>
          <span>из {stats.accepted_events} принято</span>
        </div>
      </GlassCard>
    </div>
  )
}

// ──────────────────────────────────────────────


// ──────────────────────────────────────────────
// Main Student Dashboard
// ──────────────────────────────────────────────

const Dashboard = () => {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('my_lectures')

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-4">
          {user?.photo_url && (
            <img src={user.photo_url} alt="" className="w-16 h-16 rounded-2xl object-cover" />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <span className="text-sm font-semibold text-amber-600">Студент</span>
            </div>
            <h1 className="text-2xl font-bold glass-title">{user?.full_name || user?.username}</h1>
            <div className="flex flex-wrap gap-3 mt-1 text-xs glass-subtitle">
              {user?.city?.title && <span>📍 {user.city.title}</span>}
              {user?.avg_rating !== undefined && <span>⭐ Рейтинг: {Number(user.avg_rating).toFixed(1)}</span>}
              {user?.has_permit && <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full font-medium">Разрешение координатора</span>}
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all ${
              activeTab === id ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30' : 'glass-card glass-subtitle hover:opacity-80'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <GlassCard className="p-4 sm:p-6">
        {activeTab === 'my_lectures' && <MyLecturesTab />}
        {activeTab === 'create'      && <CreateLectureTab />}
        {activeTab === 'accept'      && <AcceptLectureTab />}
        {activeTab === 'stats'       && <StatsTab />}
        {activeTab === 'rating'      && <RatingLeaderboard currentUser={user} />}
        {activeTab === 'chats'       && <ChatWidget user={user} color="amber" />}
      </GlassCard>
    </div>
  )
}

export default Dashboard