import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import { grantPermit, revokePermit, getComplaints, acceptComplaint, rejectComplaint } from '../services/api'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  Users, Calendar, TrendingUp, Award, AlertTriangle, ShieldCheck, Trophy,
  LayoutDashboard, ClipboardList, Star, Check, X, Plus, RefreshCw,
  UserCheck, UserX, Search, ChevronRight, Activity, Zap, Clock,
  CheckCircle2, XCircle, Hourglass, Sparkles,
} from 'lucide-react'
import RatingLeaderboard from '../components/RatingLeaderboard'
import GlassCard from '../components/ui/GlassCard'
import IosButton from '../components/ui/IosButton'
import GlassInput from '../components/ui/GlassInput'
import MobileBottomNav from '../components/ui/MobileBottomNav'

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_LABELS = {
  planned:   { label: 'Запланировано', cls: 'bg-blue-100 text-blue-800' },
  ongoing:   { label: 'Идёт',          cls: 'bg-purple-100 text-purple-800' },
  completed: { label: 'Завершено',     cls: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Отменено',      cls: 'bg-red-100 text-red-800' },
}

const StatusBadge = ({ status }) => {
  const s = STATUS_LABELS[status] || { label: status, cls: 'bg-gray-100 text-gray-700' }
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${s.cls}`}>{s.label}</span>
}

const Spinner = () => (
  <div className="flex items-center justify-center py-16">
    <div className="w-10 h-10 rounded-full border-4 border-indigo-500/30 border-t-indigo-500 animate-spin" />
  </div>
)

const Empty = ({ text = 'Нет данных' }) => (
  <p className="text-center py-12 glass-subtitle opacity-60">{text}</p>
)

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="glass-card rounded-xl px-4 py-2 shadow-lg text-sm">
      <p className="font-semibold glass-title mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// OverviewTab
// ─────────────────────────────────────────────────────────────────────────────
const OverviewTab = ({ onNavigate }) => {
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState({})
  const [activity, setActivity] = useState([])
  const [podium, setPodium] = useState({})
  const [calendar, setCalendar] = useState({})
  const [problems, setProblems] = useState({})
  const navigate = useNavigate()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [s, a, p, c, pr] = await Promise.all([
        api.get('/api/v1/dashboard/summary/'),
        api.get('/api/v1/dashboard/activity/'),
        api.get('/api/v1/dashboard/podium/'),
        api.get('/api/v1/dashboard/calendar/'),
        api.get('/api/v1/dashboard/problems/'),
      ])
      setSummary(s.data)
      setActivity(a.data.leaders || [])
      setPodium(p.data)
      setCalendar(c.data)
      setProblems(pr.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) return <Spinner />

  const problemCount =
    (problems.understaffed_events?.length || 0) +
    (problems.no_response_participants > 0 ? 1 : 0) +
    (problems.low_attendance_events > 0 ? 1 : 0)

  const kpiCards = [
    {
      label: 'Волонтёров (активных)',
      value: summary?.volunteers?.active ?? 0,
      sub: `Всего: ${summary?.volunteers?.total ?? 0}`,
      icon: Users,
      from: 'from-indigo-500', to: 'to-purple-500',
      glow: 'hover:shadow-indigo-500/20',
    },
    {
      label: 'Мероприятий (месяц)',
      value: summary?.events?.completed_this_month ?? 0,
      sub: `Запланировано: ${summary?.events?.planned ?? 0}`,
      icon: Calendar,
      from: 'from-blue-500', to: 'to-cyan-500',
      glow: 'hover:shadow-blue-500/20',
    },
    {
      label: 'Средняя явка',
      value: summary?.attendance?.avg_rate ? `${summary.attendance.avg_rate}%` : '—',
      sub: `Посетило всего: ${summary?.attendance?.attended_total ?? 0}`,
      icon: TrendingUp,
      from: 'from-emerald-500', to: 'to-teal-500',
      glow: 'hover:shadow-emerald-500/20',
    },
    {
      label: 'Завершено всего',
      value: summary?.events?.completed ?? 0,
      sub: `Отменено: ${summary?.events?.cancelled ?? 0}`,
      icon: CheckCircle2,
      from: 'from-green-500', to: 'to-lime-500',
      glow: 'hover:shadow-green-500/20',
    },
    {
      label: 'Проблем',
      value: problemCount,
      sub: `Без ответа: ${problems?.no_response_participants ?? 0}`,
      icon: AlertTriangle,
      from: 'from-amber-500', to: 'to-orange-500',
      glow: 'hover:shadow-amber-500/20',
    },
    {
      label: 'Мало кадров',
      value: problems?.understaffed_events?.length ?? 0,
      sub: 'Мероприятий с нехваткой волонтёров',
      icon: UserX,
      from: 'from-red-500', to: 'to-rose-500',
      glow: 'hover:shadow-red-500/20',
    },
  ]

  const podiumSlots = [
    { key: 'first',  emoji: '🥇', border: 'border-yellow-400/40', order: 'order-1 md:order-2', scale: 'md:scale-105' },
    { key: 'second', emoji: '🥈', border: 'border-gray-400/40',   order: 'order-2 md:order-1', scale: '' },
    { key: 'third',  emoji: '🥉', border: 'border-amber-600/40',  order: 'order-3',             scale: '' },
  ]

  const calTotal = (calendar.planned || 0) + (calendar.completed || 0) + (calendar.cancelled || 0)
  const calBar = (val) => calTotal ? Math.round((val / calTotal) * 100) : 0

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          onClick={load}
          className="flex items-center gap-2 px-3 py-1.5 glass-card rounded-xl text-sm glass-subtitle hover:opacity-80 transition-opacity"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Обновить
        </button>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpiCards.map(({ label, value, sub, icon: Icon, from, to, glow }) => (
          <div
            key={label}
            className={`glass-card rounded-2xl p-5 border border-white/10 hover:shadow-lg ${glow} transition-all duration-300`}
          >
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${from} ${to} flex items-center justify-center mb-3 shadow-lg`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            <p className="text-2xl font-bold glass-title">{value}</p>
            <p className="text-xs font-semibold glass-title opacity-70 mt-0.5 leading-tight">{label}</p>
            <p className="text-xs glass-subtitle opacity-50 mt-1">{sub}</p>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-card rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold glass-title">Активность по типам</h3>
              <p className="text-xs glass-subtitle opacity-60">Число мероприятий на каждый тип</p>
            </div>
          </div>
          {activity.length === 0 ? (
            <Empty text="Нет данных для графика" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={activity} barSize={28} margin={{ left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(150,150,150,0.15)" />
                <XAxis dataKey="event_type" tick={{ fontSize: 11, fill: 'var(--text-secondary, #888)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-secondary, #888)' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <defs>
                  <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#a78bfa" stopOpacity={0.8} />
                  </linearGradient>
                </defs>
                <Bar dataKey="count" name="Мероприятий" fill="url(#barGrad)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="glass-card rounded-2xl p-6 flex flex-col">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold glass-title">Мероприятия</h3>
              <p className="text-xs glass-subtitle opacity-60">Общая статистика</p>
            </div>
          </div>
          <div className="flex-1 space-y-4">
            {[
              { label: 'Запланировано',   val: calendar.planned   || 0, color: 'bg-blue-500' },
              { label: 'Завершено',       val: calendar.completed || 0, color: 'bg-emerald-500' },
              { label: 'Отменено',        val: calendar.cancelled || 0, color: 'bg-red-400' },
              { label: 'Сегодня',         val: calendar.today     || 0, color: 'bg-indigo-400' },
              { label: 'На этой неделе',  val: calendar.this_week || 0, color: 'bg-purple-400' },
            ].map(({ label, val, color }) => (
              <div key={label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="glass-subtitle opacity-70">{label}</span>
                  <span className="font-bold glass-title">{val}</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${color} transition-all duration-700`}
                    style={{ width: `${Math.min(calBar(val), 100) || (val > 0 ? 8 : 0)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-white/10">
            <p className="text-xs glass-subtitle opacity-50 text-center">
              Всего мероприятий: <strong className="glass-title">{calTotal}</strong>
            </p>
          </div>
        </div>
      </div>

      {/* Podium */}
      {(podium.first || podium.second || podium.third) && (
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold glass-title">Пьедестал почёта</h3>
              <p className="text-xs glass-subtitle opacity-60">Топ-3 волонтёра по активности</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 max-w-xl mx-auto">
            {podiumSlots.map(({ key, emoji, border, order, scale }) =>
              podium[key] ? (
                <div
                  key={key}
                  className={`${order} ${scale} glass-card rounded-2xl p-4 text-center border ${border} transition-transform`}
                >
                  <div className="text-4xl mb-2">{emoji}</div>
                  <p className="font-semibold glass-title text-sm leading-tight">{podium[key].full_name}</p>
                  <p className="text-xs glass-subtitle opacity-60 mt-1">{podium[key].score} очков</p>
                </div>
              ) : null
            )}
          </div>
        </div>
      )}

      {/* Problems */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-500 to-rose-500 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold glass-title">Проблемы и уведомления</h3>
              <p className="text-xs glass-subtitle opacity-60">Требуют вашего внимания</p>
            </div>
          </div>
          {problemCount > 0 && (
            <span className="px-2.5 py-0.5 bg-red-500 text-white rounded-full text-xs font-bold">{problemCount}</span>
          )}
        </div>
        {problemCount === 0 ? (
          <div className="flex items-center gap-3 py-6 justify-center">
            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            <p className="glass-subtitle">Всё в порядке, проблем нет</p>
          </div>
        ) : (
          <div className="space-y-3">
            {problems?.understaffed_events?.map((ev, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-red-500/8 border border-red-500/20">
                <UserX className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium glass-title">Нехватка волонтёров</p>
                  <p className="text-xs glass-subtitle opacity-70 truncate">
                    {ev.title} — нужно ещё {ev.volunteers_needed}
                  </p>
                  <p className="text-xs glass-subtitle opacity-50">
                    {new Date(ev.date_start).toLocaleDateString('ru-RU')}
                  </p>
                </div>
                <button
                  onClick={() => navigate('/admin/assign')}
                  className="ml-auto shrink-0 flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  Назначить <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            ))}
            {problems?.no_response_participants > 0 && (
              <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-500/8 border border-amber-500/20">
                <Clock className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium glass-title">Ожидают ответа</p>
                  <p className="text-xs glass-subtitle opacity-70">
                    {problems.no_response_participants} участников без подтверждения
                  </p>
                </div>
              </div>
            )}
            {problems?.low_attendance_events > 0 && (
              <div className="flex items-start gap-3 p-3 rounded-xl bg-orange-500/8 border border-orange-500/20">
                <TrendingUp className="w-4 h-4 text-orange-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium glass-title">Низкая явка</p>
                  <p className="text-xs glass-subtitle opacity-70">
                    {problems.low_attendance_events} мероприятий с явкой ниже нормы
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="glass-card rounded-2xl p-6">
        <h3 className="font-bold glass-title mb-4">Быстрые действия</h3>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => onNavigate('events')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-sm font-medium hover:opacity-90 transition-opacity shadow-lg shadow-indigo-500/25"
          >
            <Plus className="w-4 h-4" /> Создать мероприятие
          </button>
          <button
            onClick={() => navigate('/admin/assign')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl glass-card border border-white/20 text-sm font-medium glass-title hover:opacity-80 transition-opacity"
          >
            <UserCheck className="w-4 h-4" /> Назначить волонтёров
          </button>
          <button
            onClick={() => onNavigate('permits')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl glass-card border border-white/20 text-sm font-medium glass-title hover:opacity-80 transition-opacity"
          >
            <ShieldCheck className="w-4 h-4" /> Разрешения
          </button>
          <button
            onClick={() => onNavigate('complaints')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl glass-card border border-white/20 text-sm font-medium glass-title hover:opacity-80 transition-opacity"
          >
            <AlertTriangle className="w-4 h-4" /> Жалобы
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// EventsTab
// ─────────────────────────────────────────────────────────────────────────────
const EventsTab = () => {
  const navigate = useNavigate()
  const [events, setEvents] = useState([])
  const [eventTypes, setEventTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({
    title: '', description: '', date_start: '', date_end: '',
    volunteers_count_min: 1, volunteers_count_max: 10, event_type: '',
  })
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (statusFilter) params.status = statusFilter
      const [evRes, typeRes] = await Promise.all([
        api.get('/api/v1/events/', { params: { ...params, page_size: 50 } }),
        api.get('/api/v1/event-types/'),
      ])
      setEvents(evRes.data.results || evRes.data)
      setEventTypes(typeRes.data.results || typeRes.data)
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => { load() }, [load])

  const handleCreate = async (e) => {
    e.preventDefault()
    setSubmitError('')
    setSubmitting(true)
    try {
      const res = await api.post('/api/v1/events/', { ...form, status: 'planned' })
      setEvents((prev) => [res.data, ...prev])
      setCreating(false)
      setForm({ title: '', description: '', date_start: '', date_end: '', volunteers_count_min: 1, volunteers_count_max: 10, event_type: '' })
    } catch (err) {
      setSubmitError(JSON.stringify(err.response?.data || 'Ошибка'))
    } finally {
      setSubmitting(false)
    }
  }

  const filtered = events.filter(
    (ev) => !search || ev.title.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 glass-subtitle opacity-50" />
          <input
            type="text"
            placeholder="Поиск по названию..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="glass-input w-full rounded-xl pl-9 pr-4 py-2 text-sm border border-white/20"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {[['', 'Все'], ['planned', 'Запланированные'], ['completed', 'Завершённые'], ['cancelled', 'Отменённые']].map(([val, lbl]) => (
            <button
              key={val}
              onClick={() => setStatusFilter(val)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                statusFilter === val
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'glass-card glass-subtitle hover:opacity-80'
              }`}
            >
              {lbl}
            </button>
          ))}
        </div>
        <IosButton onClick={() => setCreating(!creating)} className="flex items-center gap-2 text-sm px-4 py-2">
          {creating ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {creating ? 'Отмена' : 'Создать'}
        </IosButton>
        <button
          onClick={() => navigate('/admin/assign')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl glass-card border border-white/20 text-sm font-medium glass-title hover:opacity-80 transition-opacity"
        >
          <UserCheck className="w-4 h-4" /> Назначить волонтёров
        </button>
      </div>

      {creating && (
        <GlassCard className="p-5">
          <h4 className="font-bold glass-title mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4 text-indigo-400" /> Новое мероприятие
          </h4>
          <form onSubmit={handleCreate} className="space-y-3">
            <GlassInput
              placeholder="Название *"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
              className="w-full"
            />
            <GlassInput
              placeholder="Описание"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs glass-subtitle mb-1 block">Начало *</label>
                <GlassInput
                  type="datetime-local"
                  value={form.date_start}
                  onChange={(e) => setForm({ ...form, date_start: e.target.value })}
                  required
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-xs glass-subtitle mb-1 block">Конец *</label>
                <GlassInput
                  type="datetime-local"
                  value={form.date_end}
                  onChange={(e) => setForm({ ...form, date_end: e.target.value })}
                  required
                  className="w-full"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs glass-subtitle mb-1 block">Тип мероприятия *</label>
                <select
                  className="glass-input w-full rounded-xl px-3 py-2 text-sm border border-white/20"
                  value={form.event_type}
                  onChange={(e) => setForm({ ...form, event_type: e.target.value })}
                  required
                >
                  <option value="">Выберите тип</option>
                  {eventTypes.map((t) => (
                    <option key={t.id} value={t.id}>{t.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs glass-subtitle mb-1 block">Мин / Макс волонтёров</label>
                <div className="flex items-center gap-2">
                  <GlassInput
                    type="number"
                    min={1}
                    value={form.volunteers_count_min}
                    onChange={(e) => setForm({ ...form, volunteers_count_min: +e.target.value })}
                    className="w-full"
                  />
                  <span className="glass-subtitle opacity-50 shrink-0">—</span>
                  <GlassInput
                    type="number"
                    min={1}
                    value={form.volunteers_count_max}
                    onChange={(e) => setForm({ ...form, volunteers_count_max: +e.target.value })}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
            {submitError && <p className="text-red-400 text-xs">{submitError}</p>}
            <IosButton type="submit" disabled={submitting} className="w-full">
              {submitting ? 'Создание...' : 'Создать мероприятие'}
            </IosButton>
          </form>
        </GlassCard>
      )}

      {loading ? (
        <Spinner />
      ) : filtered.length === 0 ? (
        <Empty text="Мероприятий не найдено" />
      ) : (
        <div className="space-y-3">
          {filtered.map((ev) => (
            <GlassCard key={ev.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="font-semibold glass-title truncate">{ev.title}</p>
                    <StatusBadge status={ev.status} />
                  </div>
                  <p className="text-xs glass-subtitle opacity-60">
                    {ev.event_type?.title} ·{' '}
                    {new Date(ev.date_start).toLocaleString('ru-RU', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </p>
                  {ev.description && (
                    <p className="text-xs glass-subtitle opacity-50 mt-1 line-clamp-1">{ev.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs glass-subtitle opacity-50">
                    {ev.accepted_count ?? 0}/{ev.volunteers_count_max} вол.
                  </span>
                  {ev.status === 'planned' && (
                    <button
                      onClick={() => navigate('/admin/assign')}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-500/15 text-indigo-400 hover:bg-indigo-500/25 text-xs font-medium transition-colors"
                    >
                      <UserCheck className="w-3.5 h-3.5" /> Назначить
                    </button>
                  )}
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// VolunteersTab
// ─────────────────────────────────────────────────────────────────────────────
const VolunteersTab = () => {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [permitFilter, setPermitFilter] = useState('')
  const [actionLoading, setActionLoading] = useState({})

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page_size: 100 }
      if (roleFilter) params.role = roleFilter
      const res = await api.get('/api/v1/users/', { params })
      setUsers(res.data.results || res.data)
    } finally {
      setLoading(false)
    }
  }, [roleFilter])

  useEffect(() => { load() }, [load])

  const handlePermit = async (userId, action) => {
    setActionLoading((prev) => ({ ...prev, [userId]: true }))
    try {
      if (action === 'grant') await grantPermit(userId)
      else await revokePermit(userId)
      load()
    } catch (e) {
      alert(e.response?.data?.detail || 'Ошибка')
    } finally {
      setActionLoading((prev) => ({ ...prev, [userId]: false }))
    }
  }

  const filtered = users.filter((u) => {
    const matchSearch =
      !search ||
      (u.full_name || u.username || '').toLowerCase().includes(search.toLowerCase()) ||
      u.username.toLowerCase().includes(search.toLowerCase())
    const matchPermit =
      permitFilter === '' ? true : permitFilter === 'yes' ? u.has_permit : !u.has_permit
    return matchSearch && matchPermit
  })

  const roleBadge = (code) => {
    const styles = {
      superuser:   'bg-purple-100 text-purple-800',
      admin:       'bg-indigo-100 text-indigo-800',
      coordinator: 'bg-blue-100 text-blue-800',
      volunteer:   'bg-emerald-100 text-emerald-800',
      user:        'bg-gray-100 text-gray-700',
    }
    const labels = {
      superuser: 'Суперадмин', admin: 'Администратор', coordinator: 'Координатор',
      volunteer: 'Волонтёр',   user: 'Пользователь',
    }
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${styles[code] || 'bg-gray-100 text-gray-700'}`}>
        {labels[code] || code}
      </span>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 glass-subtitle opacity-50" />
          <input
            type="text"
            placeholder="Поиск по имени или логину..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="glass-input w-full rounded-xl pl-9 pr-4 py-2 text-sm border border-white/20"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="glass-input rounded-xl px-3 py-2 text-sm border border-white/20"
        >
          <option value="">Все роли</option>
          <option value="volunteer">Волонтёры</option>
          <option value="coordinator">Координаторы</option>
          <option value="user">Пользователи</option>
          <option value="admin">Администраторы</option>
        </select>
        <select
          value={permitFilter}
          onChange={(e) => setPermitFilter(e.target.value)}
          className="glass-input rounded-xl px-3 py-2 text-sm border border-white/20"
        >
          <option value="">Все (разрешения)</option>
          <option value="yes">С разрешением</option>
          <option value="no">Без разрешения</option>
        </select>
      </div>

      <div className="flex gap-4 text-sm glass-subtitle opacity-60">
        <span>Найдено: <strong className="glass-title">{filtered.length}</strong></span>
        <span>·</span>
        <span>С разрешением: <strong className="glass-title text-emerald-400">{filtered.filter((u) => u.has_permit).length}</strong></span>
        <span>·</span>
        <span>Волонтёров: <strong className="glass-title">{filtered.filter((u) => u.role?.code === 'volunteer').length}</strong></span>
      </div>

      {loading ? (
        <Spinner />
      ) : filtered.length === 0 ? (
        <Empty text="Пользователей не найдено" />
      ) : (
        <div className="space-y-2">
          {filtered.map((u) => (
            <GlassCard key={u.id} className="p-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                  {(u.first_name || u.username || '?').slice(0, 1).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold glass-title text-sm">{u.full_name || u.username}</span>
                    {roleBadge(u.role?.code)}
                    {u.has_permit && (
                      <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">
                        <ShieldCheck className="w-3 h-3" /> Разрешение
                      </span>
                    )}
                  </div>
                  <p className="text-xs glass-subtitle opacity-50 mt-0.5">
                    @{u.username} · Рейтинг: {u.avg_rating?.toFixed(1) ?? '0.0'}
                  </p>
                </div>
                {u.role?.code === 'volunteer' && (
                  <div className="shrink-0">
                    {!u.has_permit ? (
                      <button
                        disabled={actionLoading[u.id] || (u.avg_rating || 0) < 7.0}
                        onClick={() => handlePermit(u.id, 'grant')}
                        title={(u.avg_rating || 0) < 7.0 ? 'Рейтинг ниже 7.0' : 'Выдать разрешение'}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        {actionLoading[u.id] ? '...' : <><UserCheck className="w-3.5 h-3.5" /> Выдать</>}
                      </button>
                    ) : (
                      <button
                        disabled={actionLoading[u.id]}
                        onClick={() => handlePermit(u.id, 'revoke')}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-red-500/15 text-red-400 hover:bg-red-500/25 disabled:opacity-40 transition-colors"
                      >
                        {actionLoading[u.id] ? '...' : <><UserX className="w-3.5 h-3.5" /> Отозвать</>}
                      </button>
                    )}
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

// ─────────────────────────────────────────────────────────────────────────────
// PermitsTab
// ─────────────────────────────────────────────────────────────────────────────
const PermitsTab = () => {
  const [volunteers, setVolunteers] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState({})
  const [filter, setFilter] = useState('eligible')

  const load = async () => {
    setLoading(true)
    try {
      const res = await api.get('/api/v1/users/', { params: { role: 'volunteer', page_size: 200 } })
      setVolunteers(res.data.results || res.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handlePermit = async (userId, action) => {
    setActionLoading((prev) => ({ ...prev, [userId]: true }))
    try {
      if (action === 'grant') await grantPermit(userId)
      else await revokePermit(userId)
      load()
    } catch (e) {
      alert(e.response?.data?.detail || 'Ошибка')
    } finally {
      setActionLoading((prev) => ({ ...prev, [userId]: false }))
    }
  }

  const eligible  = volunteers.filter((v) => !v.has_permit && (v.avg_rating || 0) >= 7.0)
  const granted   = volunteers.filter((v) => v.has_permit)

  const filtered = volunteers.filter((v) => {
    if (filter === 'eligible')    return !v.has_permit && (v.avg_rating || 0) >= 7.0
    if (filter === 'granted')     return v.has_permit
    if (filter === 'noteligible') return !v.has_permit && (v.avg_rating || 0) < 7.0
    return true
  })

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Могут получить',    val: eligible.length,    key: 'eligible' },
          { label: 'Разрешение выдано', val: granted.length,     key: 'granted'  },
          { label: 'Все волонтёры',     val: volunteers.length,  key: 'all'      },
        ].map(({ label, val, key }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`glass-card rounded-2xl p-4 text-center transition-all ${
              filter === key ? 'ring-2 ring-indigo-500/60' : 'hover:opacity-80'
            }`}
          >
            <p className="text-3xl font-bold glass-title">{val}</p>
            <p className="text-xs glass-subtitle opacity-60 mt-1">{label}</p>
          </button>
        ))}
      </div>

      <p className="text-xs glass-subtitle opacity-50 px-1">
        Для выдачи разрешения волонтёр должен иметь средний рейтинг ≥ 7.0 / 10
      </p>

      <div className="flex gap-2 flex-wrap">
        {[
          ['eligible',    'Могут получить'],
          ['granted',     'С разрешением'],
          ['noteligible', 'Рейтинг низкий'],
          ['all',         'Все'],
        ].map(([key, lbl]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              filter === key
                ? 'bg-indigo-600 text-white shadow-lg'
                : 'glass-card glass-subtitle hover:opacity-80'
            }`}
          >
            {lbl}
          </button>
        ))}
      </div>

      {loading ? (
        <Spinner />
      ) : filtered.length === 0 ? (
        <Empty text="Волонтёров по этому фильтру не найдено" />
      ) : (
        <div className="space-y-3">
          {filtered.map((v) => {
            const rating    = v.avg_rating || 0
            const isEligible = rating >= 7.0
            return (
              <GlassCard key={v.id} className="p-4">
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold shrink-0">
                    {(v.first_name || v.username || '?').slice(0, 1).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold glass-title">{v.full_name || v.username}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                      <span className={`text-sm font-bold ${isEligible ? 'text-emerald-400' : 'text-red-400'}`}>
                        {rating.toFixed(1)}
                      </span>
                      <span className="text-xs glass-subtitle opacity-40">/ 10</span>
                      <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden max-w-[100px] ml-1">
                        <div
                          className={`h-full rounded-full transition-all ${isEligible ? 'bg-emerald-400' : 'bg-red-400'}`}
                          style={{ width: `${(rating / 10) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {v.has_permit && (
                      <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-semibold">
                        <ShieldCheck className="w-3 h-3" /> Выдано
                      </span>
                    )}
                    {!v.has_permit ? (
                      <button
                        disabled={actionLoading[v.id] || !isEligible}
                        onClick={() => handlePermit(v.id, 'grant')}
                        title={!isEligible ? 'Рейтинг недостаточен (< 7.0)' : undefined}
                        className="px-3 py-1.5 rounded-xl text-sm font-medium bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        {actionLoading[v.id] ? '...' : 'Выдать'}
                      </button>
                    ) : (
                      <button
                        disabled={actionLoading[v.id]}
                        onClick={() => handlePermit(v.id, 'revoke')}
                        className="px-3 py-1.5 rounded-xl text-sm font-medium bg-red-500 text-white hover:bg-red-600 disabled:opacity-40 transition-colors"
                      >
                        {actionLoading[v.id] ? '...' : 'Отозвать'}
                      </button>
                    )}
                  </div>
                </div>
              </GlassCard>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ComplaintsTab
// ─────────────────────────────────────────────────────────────────────────────
const ComplaintsTab = () => {
  const [complaints, setComplaints] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')
  const [actionLoading, setActionLoading] = useState({})

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = filter ? { status: filter } : {}
      const res = await getComplaints(params)
      setComplaints(res.data.results || res.data)
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => { load() }, [load])

  const handleAction = async (id, action) => {
    setActionLoading((prev) => ({ ...prev, [id]: true }))
    try {
      if (action === 'accept') await acceptComplaint(id)
      else await rejectComplaint(id)
      load()
    } catch (e) {
      alert(e.response?.data?.detail || 'Ошибка')
    } finally {
      setActionLoading((prev) => ({ ...prev, [id]: false }))
    }
  }

  const statusInfo = (s) =>
    ({
      pending:  { cls: 'bg-amber-100 text-amber-800',   label: 'Ожидает',   icon: Hourglass    },
      accepted: { cls: 'bg-emerald-100 text-emerald-800', label: 'Принята', icon: CheckCircle2 },
      rejected: { cls: 'bg-red-100 text-red-800',        label: 'Отклонена', icon: XCircle     },
    }[s] || { cls: 'bg-gray-100 text-gray-700', label: s, icon: AlertTriangle })

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {[['', 'Все'], ['pending', 'Ожидают'], ['accepted', 'Приняты'], ['rejected', 'Отклонены']].map(
          ([val, lbl]) => (
            <button
              key={val}
              onClick={() => setFilter(val)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                filter === val
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'glass-card glass-subtitle hover:opacity-80'
              }`}
            >
              {lbl}
            </button>
          )
        )}
      </div>

      {loading ? (
        <Spinner />
      ) : complaints.length === 0 ? (
        <Empty text="Жалобы не найдены" />
      ) : (
        <div className="space-y-3">
          {complaints.map((c) => {
            const si = statusInfo(c.status)
            const Icon = si.icon
            return (
              <GlassCard key={c.id} className="p-4">
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${si.cls}`}>
                        <Icon className="w-3 h-3" /> {si.label}
                      </span>
                      <span className="text-xs glass-subtitle opacity-50">
                        {new Date(c.created_at).toLocaleDateString('ru-RU')}
                      </span>
                    </div>
                    <p className="text-sm font-semibold glass-title mb-1">
                      На:{' '}
                      {c.volunteer_detail?.full_name || c.volunteer || '—'}
                      {c.event_title && (
                        <span className="font-normal opacity-60"> ({c.event_title})</span>
                      )}
                    </p>
                    <p className="text-sm glass-subtitle">{c.text}</p>
                    <p className="text-xs glass-subtitle opacity-50 mt-1.5">
                      От: {c.reporter?.full_name || '—'}
                    </p>
                  </div>
                  {c.status === 'pending' && (
                    <div className="flex gap-2 shrink-0 mt-1">
                      <button
                        disabled={actionLoading[c.id]}
                        onClick={() => handleAction(c.id, 'accept')}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 text-xs font-medium transition-colors disabled:opacity-40"
                      >
                        <Check className="w-3.5 h-3.5" /> Принять
                      </button>
                      <button
                        disabled={actionLoading[c.id]}
                        onClick={() => handleAction(c.id, 'reject')}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-red-500/15 text-red-400 hover:bg-red-500/25 text-xs font-medium transition-colors disabled:opacity-40"
                      >
                        <X className="w-3.5 h-3.5" /> Отклонить
                      </button>
                    </div>
                  )}
                </div>
              </GlassCard>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main AdminDashboard
// ─────────────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'overview',    label: 'Обзор',       short: 'Обзор',  icon: LayoutDashboard },
  { id: 'events',      label: 'Мероприятия', short: 'Лекции', icon: ClipboardList   },
  { id: 'volunteers',  label: 'Волонтёры',   short: 'Люди',   icon: Users           },
  { id: 'permits',     label: 'Разрешения',  short: 'Доступ', icon: ShieldCheck     },
  { id: 'complaints',  label: 'Жалобы',      short: 'Жалобы', icon: AlertTriangle   },
  { id: 'rating',      label: 'Рейтинг',     short: 'Рейтинг',icon: Trophy          },
]

const AdminDashboard = () => {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('overview')

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 pb-20 lg:pb-6">
      {/* Header — matches user Dashboard style */}
      <GlassCard className="p-4 sm:p-6">
        <div className="flex items-center gap-4">
          {user?.photo_url && (
            <img src={user.photo_url} alt="" className="w-16 h-16 rounded-2xl object-cover" />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-5 h-5 text-indigo-500" />
              <span className="text-sm font-semibold text-indigo-600">Администратор</span>
            </div>
            <h1 className="text-2xl font-bold glass-title">{user?.full_name || user?.username}</h1>
            <div className="flex flex-wrap gap-3 mt-1 text-xs glass-subtitle">
              {user?.avg_rating !== undefined && (
                <span>⭐ Рейтинг: {Number(user.avg_rating).toFixed(1)}</span>
              )}
              {user?.has_permit && (
                <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-full font-medium">
                  Разрешение
                </span>
              )}
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Tabs — desktop only */}
      <div className="hidden lg:flex gap-2 pb-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all shrink-0 ${
              activeTab === id
                ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30'
                : 'glass-card glass-subtitle hover:opacity-80'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      <GlassCard className="p-4 sm:p-6">
        {activeTab === 'overview'   && <OverviewTab onNavigate={setActiveTab} />}
        {activeTab === 'events'     && <EventsTab />}
        {activeTab === 'volunteers' && <VolunteersTab />}
        {activeTab === 'permits'    && <PermitsTab />}
        {activeTab === 'complaints' && <ComplaintsTab />}
        {activeTab === 'rating'     && <RatingLeaderboard currentUser={null} />}
      </GlassCard>

      <MobileBottomNav tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  )
}

export default AdminDashboard
