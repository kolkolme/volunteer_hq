import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import api, { getTags, createChat } from '../services/api'
import ChatWidget from '../components/ChatWidget'
import {
  BookOpen,
  Calendar,
  Clock,
  Download,
  ImagePlus,
  MapPin,
  MessageSquare,
  Save,
  Search,
  Settings,
  Sparkles,
  Star,
  Tag,
  Trophy,
  User,
  UserCheck,
} from 'lucide-react'
import GlassInput from '../components/ui/GlassInput'
import IosButton from '../components/ui/IosButton'
import RatingLeaderboard from '../components/RatingLeaderboard'

const TAGS = [
  'Английский', 'Математика', 'Программирование', 'Финансы', 'Кибербезопасность',
  'Дизайн', 'Маркетинг', 'Психология', 'Право', 'Медицина',
]

const TAB_ITEMS = [
  { id: 'profile', label: 'Личный кабинет', icon: User },
  { id: 'lectures', label: 'Лекции', icon: Calendar },
  { id: 'history', label: 'Прош. лекции', icon: BookOpen },
  { id: 'rating', label: 'Рейтинг', icon: Trophy },
  { id: 'volunteer', label: 'Стать волонтёром', icon: UserCheck },
  { id: 'chats', label: 'Чаты', icon: MessageSquare },
  { id: 'appearance', label: 'Настройки', icon: Settings },
]

const APPEARANCE_OPTIONS = [
  { id: 'light', label: 'Светлая', palette: 'white', theme: 'light' },
  { id: 'dark', label: 'Тёмная', palette: 'black', theme: 'dark' },
  { id: 'beige', label: 'Бежевая', palette: 'beige', theme: 'light' },
]



const UserDashboard = () => {
  const { user, refreshUser } = useAuth()
  const [events, setEvents] = useState([])
  const [pastEvents, setPastEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTags, setSelectedTags] = useState([])
  const [activeTab, setActiveTab] = useState('profile')
  const [profileForm, setProfileForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    contact: '',
  })
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileMessage, setProfileMessage] = useState('')

  // Ratings from API: { [eventId]: { id, rating, comment } }
  const [ratings, setRatings] = useState({})
  const ratingDebounceRef = useRef({})

  // Volunteer application
  const [volunteerApplication, setVolunteerApplication] = useState(null)
  const [volunteerForm, setVolunteerForm] = useState({
    photo_url: '',
    specialization: '',
    experience: '',
    about: '',
  })
  const [volunteerSubmitting, setVolunteerSubmitting] = useState(false)
  const [volunteerMessage, setVolunteerMessage] = useState('')

  const [appearanceId, setAppearanceId] = useState('light')
  const [availableTags, setAvailableTags] = useState([])
  const [appliedEventIds, setAppliedEventIds] = useState(new Set())
  const [applyingId, setApplyingId] = useState(null)

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    if (!user) return
    setProfileForm({
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      email: user.email || '',
      contact: user.contact || '',
    })
  }, [user])

  useEffect(() => {
    const palette = localStorage.getItem('palette') || 'white'
    const theme = document.documentElement.getAttribute('data-theme') || 'light'
    const matched = APPEARANCE_OPTIONS.find((item) => item.palette === palette && item.theme === theme)
    setAppearanceId(matched?.id || 'light')
  }, [])

  const fetchData = async () => {
    try {
      const [eventsRes, participationsRes, ratingsRes, appRes, tagsRes] = await Promise.all([
        api.get('/api/v1/events/'),
        api.get('/api/v1/my/participations/'),
        api.get('/api/v1/my/ratings/'),
        api.get('/api/v1/volunteer-applications/'),
        api.get('/api/v1/tags/'),
      ])

      const allEvents = eventsRes.data.results || eventsRes.data
      const participations = participationsRes.data.results || participationsRes.data
      const ratingsData = ratingsRes.data.results || ratingsRes.data
      const applicationsData = appRes.data.results || appRes.data
      const tagsData = tagsRes.data.results || tagsRes.data

      const now = new Date()
      const upcoming = allEvents
        .filter(e => new Date(e.date_start) > now && e.status === 'planned')
        .sort((a, b) => new Date(a.date_start) - new Date(b.date_start))

      const past = participations
        .filter(p => p.status === 'attended' || p.status === 'absent')
        .map(p => ({ ...p.event, participationStatus: p.status }))

      // Build ratings map: { [eventId]: { id, rating, comment } }
      const ratingsMap = {}
      for (const r of ratingsData) {
        const eventId = r.event?.id ?? r.event
        ratingsMap[eventId] = { id: r.id, rating: r.rating, comment: r.comment }
      }

      setEvents(upcoming)
      setPastEvents(past)
      setRatings(ratingsMap)
      setAvailableTags(Array.isArray(tagsData) ? tagsData : [])
      setAppliedEventIds(new Set(participations.map(p => p.event?.id ?? p.event)))

      if (applicationsData.length > 0) {
        const latest = applicationsData[0]
        setVolunteerApplication(latest)
        setVolunteerForm({
          photo_url: latest.photo_url || '',
          specialization: latest.specialization || '',
          experience: latest.experience || '',
          about: latest.about || '',
        })
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleTag = (tag) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    )
  }

  const handleApply = async (eventId) => {
    setApplyingId(eventId)
    try {
      await api.post('/api/v1/participations/', { event_id: eventId, user_id: user.id })
      setAppliedEventIds(prev => new Set([...prev, eventId]))
    } catch (e) {
      alert(e.response?.data?.detail || JSON.stringify(e.response?.data) || 'Ошибка при подаче заявки')
    } finally {
      setApplyingId(null)
    }
  }

  const handleChatWithVolunteer = useCallback(async (volunteerId) => {
    if (!volunteerId) return
    try {
      await createChat(volunteerId)
      setActiveTab('chats')
    } catch {}
  }, [])

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const matchesSearch = !searchQuery ||
        event.title.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesTags = selectedTags.length === 0 ||
        selectedTags.some(tagId => event.tags?.some(t => t.id === tagId))
      return matchesSearch && matchesTags
    })
  }, [events, searchQuery, selectedTags])

  const attendedLecturesCount = pastEvents.filter((event) => event.participationStatus === 'attended').length
  const missedLecturesCount = pastEvents.filter((event) => event.participationStatus === 'absent').length

  const handleProfileChange = (e) => {
    setProfileForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  const handleProfileSubmit = async (e) => {
    e.preventDefault()
    setProfileSaving(true)
    setProfileMessage('')

    try {
      const payload = {
        first_name: profileForm.first_name,
        last_name: profileForm.last_name,
        email: profileForm.email,
        contact: profileForm.contact,
      }
      await api.patch('/api/v1/auth/me/', payload)
      await refreshUser()
      setProfileMessage('Личные данные сохранены.')
    } catch (error) {
      setProfileMessage('Не удалось сохранить данные.')
    } finally {
      setProfileSaving(false)
    }
  }

  const handleRatingChange = useCallback(async (eventId, rating) => {
    const existing = ratings[eventId]
    const optimistic = { ...(existing || {}), rating }
    setRatings(prev => ({ ...prev, [eventId]: optimistic }))

    try {
      if (existing?.id) {
        const res = await api.patch(`/api/v1/my/ratings/${existing.id}/`, { rating })
        setRatings(prev => ({ ...prev, [eventId]: { id: res.data.id, rating: res.data.rating, comment: res.data.comment } }))
      } else {
        const res = await api.post('/api/v1/my/ratings/', { event: eventId, rating, comment: '' })
        setRatings(prev => ({ ...prev, [eventId]: { id: res.data.id, rating: res.data.rating, comment: res.data.comment } }))
      }
    } catch {
      // revert optimistic update on failure
      setRatings(prev => ({ ...prev, [eventId]: existing || null }))
    }
  }, [ratings])

  const handleCommentChange = useCallback((eventId, comment) => {
    setRatings(prev => ({
      ...prev,
      [eventId]: { ...(prev[eventId] || {}), comment },
    }))

    // Debounce API save
    if (ratingDebounceRef.current[eventId]) {
      clearTimeout(ratingDebounceRef.current[eventId])
    }
    ratingDebounceRef.current[eventId] = setTimeout(async () => {
      const existing = ratings[eventId]
      if (!existing?.id) return
      try {
        await api.patch(`/api/v1/my/ratings/${existing.id}/`, { comment })
      } catch {
        // silent fail — comment will be retried on next keystroke
      }
    }, 1000)
  }, [ratings])

  const handleVolunteerChange = (e) => {
    setVolunteerForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  const handleVolunteerSubmit = async (e) => {
    e.preventDefault()
    setVolunteerSubmitting(true)
    setVolunteerMessage('')
    try {
      const res = await api.post('/api/v1/volunteer-applications/', volunteerForm)
      setVolunteerApplication(res.data)
      setVolunteerMessage('Заявка отправлена! Ожидайте рассмотрения администратором.')
    } catch (err) {
      const detail = err.response?.data?.detail || 'Не удалось отправить заявку.'
      setVolunteerMessage(detail)
    } finally {
      setVolunteerSubmitting(false)
    }
  }

  const applyAppearance = (option) => {
    document.documentElement.setAttribute('data-palette', option.palette)
    document.documentElement.setAttribute('data-theme', option.theme)
    localStorage.setItem('palette', option.palette)
    setAppearanceId(option.id)
    window.dispatchEvent(new CustomEvent('paletteChanged', { detail: { palette: option.palette } }))
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
      {/* Welcome */}
      <div className="glass-card rounded-3xl p-8 md:p-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 opacity-10 pointer-events-none">
          <BookOpen className="w-full h-full" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <Sparkles className="w-6 h-6 text-blue-500" />
            <p className="text-sm font-semibold text-blue-600">Добро пожаловать!</p>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Привет, {user?.full_name || user?.username}! 👋
          </h1>
          <p className="text-lg opacity-80 mb-6 max-w-2xl">
            Вы вошли как <span className="font-semibold text-blue-600">Посетитель</span>.
            Управляйте профилем, прошлыми лекциями, заявкой в волонтёры и внешним видом кабинета.
          </p>
          <div className="flex flex-wrap gap-3 text-sm opacity-75">
            <span className="glass-card px-4 py-2 rounded-2xl">4 вкладки для visitor-flow</span>
            <span className="glass-card px-4 py-2 rounded-2xl">История лекций и обратная связь</span>
            <span className="glass-card px-4 py-2 rounded-2xl">Заявка в волонтёры</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card rounded-2xl p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium opacity-70 mb-2">Доступных лекций</p>
              <p className="text-3xl font-bold">{events.length}</p>
            </div>
            <Calendar className="w-12 h-12 opacity-30" />
          </div>
        </div>
        <div className="glass-card rounded-2xl p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium opacity-70 mb-2">Посещено</p>
              <p className="text-3xl font-bold">{attendedLecturesCount}</p>
            </div>
            <Star className="w-12 h-12 opacity-30" />
          </div>
        </div>
        <div className="glass-card rounded-2xl p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium opacity-70 mb-2">Пропущено</p>
              <p className="text-3xl font-bold">{missedLecturesCount}</p>
            </div>
            <Clock className="w-12 h-12 opacity-30" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-6">
        <div className="glass-card rounded-3xl p-4 h-fit">
          <div className="space-y-2">
            {TAB_ITEMS.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 rounded-2xl px-4 py-3 text-left transition-all duration-200 ${
                    isActive ? 'bg-blue-500 text-white shadow-md' : 'glass-card hover:shadow-md'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="font-semibold">{tab.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="space-y-6">
          {activeTab === 'profile' && (
            <>
              <div className="glass-card rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <User className="w-5 h-5 opacity-60" />
                  <h3 className="text-xl font-bold">Личный кабинет</h3>
                </div>
                <form className="space-y-4" onSubmit={handleProfileSubmit}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium glass-subtitle mb-2">Имя</label>
                      <GlassInput name="first_name" value={profileForm.first_name} onChange={handleProfileChange} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium glass-subtitle mb-2">Фамилия</label>
                      <GlassInput name="last_name" value={profileForm.last_name} onChange={handleProfileChange} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium glass-subtitle mb-2">Email</label>
                      <GlassInput name="email" type="email" value={profileForm.email} onChange={handleProfileChange} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium glass-subtitle mb-2">Телефон</label>
                      <GlassInput name="contact" value={profileForm.contact} onChange={handleProfileChange} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="glass-card rounded-2xl p-4">
                      <p className="text-sm opacity-60 mb-1">Логин</p>
                      <p className="font-semibold">{user?.username}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3 items-center">
                    <IosButton type="submit" disabled={profileSaving} className="inline-flex gap-2">
                      <Save className="w-4 h-4" /> {profileSaving ? 'Сохранение...' : 'Сохранить'}
                    </IosButton>
                    {profileMessage && <p className="text-sm opacity-70">{profileMessage}</p>}
                  </div>
                </form>
              </div>

              <div className="glass-card rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Tag className="w-5 h-5 opacity-60" />
                  <h3 className="text-lg font-bold">Интересы и теги</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {availableTags.filter(t => t.tag_type === 'subject').map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() => toggleTag(tag.id)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                        selectedTags.includes(tag.id)
                          ? 'bg-blue-500 text-white shadow-md'
                          : 'glass-card hover:shadow-md'
                      }`}
                    >
                      {tag.title}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {activeTab === 'history' && (
            <>
              <div className="glass-card rounded-2xl overflow-hidden">
                <div className="px-6 py-5 border-b border-opacity-20 border-gray-300">
                  <div className="flex items-center gap-3">
                    <Star className="w-5 h-5 opacity-60" />
                    <h3 className="text-xl font-bold">Прошлые лекции</h3>
                  </div>
                </div>
                <div className="divide-y divide-opacity-10 divide-gray-300">
                  {pastEvents.length > 0 ? (
                    pastEvents.map((event, idx) => {
                      const feedback = ratings[event.id] || {}
                      return (
                        <div key={`${event.id}-${idx}`} className="px-6 py-5 space-y-4">
                          <div className="flex items-center justify-between gap-4 flex-wrap">
                            <div>
                              <h4 className="font-semibold">{event.title}</h4>
                              <p className="text-sm opacity-60">
                                {event.date_start && new Date(event.date_start).toLocaleDateString('ru-RU')}
                              </p>
                            </div>
                            <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                              event.participationStatus === 'attended'
                                ? 'bg-green-500 bg-opacity-20 text-green-700'
                                : 'bg-red-500 bg-opacity-20 text-red-700'
                            }`}>
                              {event.participationStatus === 'attended' ? '✅ Посетил' : '❌ Пропустил'}
                            </span>
                          </div>

                          <div className="space-y-1">
                            {(() => {
                              const now = new Date()
                              const unlockAt = event.date_end ? new Date(new Date(event.date_end).getTime() + 60 * 60 * 1000) : null
                              const locked = unlockAt && now < unlockAt
                              return (
                                <>
                                  <div className="flex flex-wrap items-center gap-1">
                                    <span className="text-sm opacity-60 mr-1">Оценка:</span>
                                    {[1,2,3,4,5,6,7,8,9,10].map((n) => (
                                      <button
                                        key={n}
                                        disabled={locked}
                                        onClick={() => !locked && handleRatingChange(event.id, n)}
                                        title={locked ? `Доступно после ${unlockAt.toLocaleString('ru-RU')}` : `${n} из 10`}
                                        className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                                          locked
                                            ? 'opacity-30 cursor-not-allowed glass-card'
                                            : feedback.rating >= n
                                              ? 'bg-amber-400 text-white shadow-sm'
                                              : 'glass-card hover:bg-amber-100'
                                        }`}
                                      >
                                        {n}
                                      </button>
                                    ))}
                                    {feedback.rating > 0 && (
                                      <span className="ml-2 text-sm font-semibold text-amber-500">{feedback.rating}/10</span>
                                    )}
                                  </div>
                                  {locked && (
                                    <p className="text-xs opacity-50">
                                      ⏳ Оценку можно поставить через 1 ч после окончания — после {unlockAt.toLocaleString('ru-RU', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                                    </p>
                                  )}
                                </>
                              )
                            })()}
                          </div>

                          <textarea
                            value={feedback.comment || ''}
                            onChange={(e) => handleCommentChange(event.id, e.target.value)}
                            placeholder="Комментарий по лекции или сообщение волонтёру"
                            className="glass-input border rounded-2xl p-3 min-h-28"
                          />

                          <div className="flex flex-wrap gap-3">
                            <button
                              className="btn-ios px-5 py-3 inline-flex items-center gap-2"
                              onClick={() => handleChatWithVolunteer(event.created_by?.id)}
                              disabled={!event.created_by?.id}
                            >
                              <MessageSquare className="w-4 h-4" /> Личный чат с волонтёром
                            </button>
                            <button className="btn-ios px-5 py-3 inline-flex items-center gap-2">
                              <Download className="w-4 h-4" /> Скачать материалы
                            </button>
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <div className="px-6 py-8 text-center">
                      <p className="opacity-60">Пока нет завершённых лекций для оценки.</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {activeTab === 'lectures' && (
            <div className="space-y-4">
              {/* Search + Tag filters */}
              <div className="glass-card rounded-2xl p-4 space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40" />
                  <input
                    type="text"
                    placeholder="Поиск лекций..."
                    className="glass-input border rounded-full pl-9 pr-4 py-2 text-sm w-full"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                {availableTags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {availableTags.map((tag) => (
                      <button
                        key={tag.id}
                        onClick={() => toggleTag(tag.id)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                          selectedTags.includes(tag.id)
                            ? 'bg-blue-500 text-white shadow-md'
                            : 'glass-card hover:shadow-md'
                        }`}
                      >
                        {tag.title}
                      </button>
                    ))}
                    {selectedTags.length > 0 && (
                      <button
                        onClick={() => setSelectedTags([])}
                        className="px-3 py-1.5 rounded-full text-sm font-medium glass-card hover:shadow-md opacity-60"
                      >
                        Сбросить
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Events list */}
              <div className="glass-card rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-white/10 flex items-center gap-3">
                  <Calendar className="w-5 h-5 opacity-60" />
                  <h3 className="text-xl font-bold">Предстоящие лекции</h3>
                  <span className="ml-auto text-sm opacity-60">{filteredEvents.length} лекций</span>
                </div>
                <div className="divide-y divide-white/10">
                  {filteredEvents.length > 0 ? (
                    filteredEvents.map((event) => {
                      const isApplied = appliedEventIds.has(event.id)
                      const isApplying = applyingId === event.id
                      return (
                        <div key={event.id} className="px-6 py-5">
                          <div className="flex items-start justify-between gap-4 flex-wrap">
                            <div className="flex-1 min-w-0">
                              <h4 className="text-base font-semibold mb-1">{event.title}</h4>
                              {event.description && (
                                <p className="text-sm opacity-60 mb-2 line-clamp-2">{event.description}</p>
                              )}
                              <div className="flex flex-wrap gap-3 text-sm opacity-70 mb-3">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3.5 h-3.5" />
                                  {new Date(event.date_start).toLocaleDateString('ru-RU')} в{' '}
                                  {new Date(event.date_start).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                {event.address && (
                                  <a
                                    href={event.address}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 text-blue-500 hover:underline"
                                  >
                                    <MapPin className="w-3.5 h-3.5" />
                                    Ссылка на конференцию
                                  </a>
                                )}
                                {event.created_by && (
                                  <span className="flex items-center gap-1">
                                    <User className="w-3.5 h-3.5" />
                                    {event.created_by.full_name}
                                  </span>
                                )}
                                {event.volunteers_count_max != null && (
                                  <span className="flex items-center gap-1">
                                    <UserCheck className="w-3.5 h-3.5" />
                                    Мест: {event.free_slots ?? event.volunteers_count_max}
                                  </span>
                                )}
                              </div>
                              {event.tags?.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                  {event.tags.map((tag) => (
                                    <span
                                      key={tag.id}
                                      className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500 bg-opacity-15 text-blue-600"
                                    >
                                      {tag.title}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="shrink-0 pt-1">
                              {isApplied ? (
                                <span className="inline-flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-medium bg-green-500 bg-opacity-20 text-green-700">
                                  ✓ Заявка подана
                                </span>
                              ) : (
                                <IosButton
                                  onClick={() => handleApply(event.id)}
                                  disabled={isApplying}
                                  className="text-sm"
                                >
                                  {isApplying ? 'Отправка...' : 'Подать заявку'}
                                </IosButton>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <div className="px-6 py-10 text-center">
                      <div className="text-3xl mb-3">📭</div>
                      <p className="opacity-60">Нет подходящих лекций</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'volunteer' && (
            <div className="glass-card rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <UserCheck className="w-5 h-5 opacity-60" />
                <h3 className="text-xl font-bold">Стать волонтёром</h3>
              </div>
              <p className="text-sm opacity-70 mb-6 max-w-2xl">
                Добавьте минимум фото, специализацию и краткую информацию о себе. После этого заявка будет готова к перерегистрации аккаунта в роль волонтёра.
              </p>

              <form className="space-y-4" onSubmit={handleVolunteerSubmit}>
                <div>
                  <label className="block text-sm font-medium glass-subtitle mb-2">Фото или ссылка на фото</label>
                  <div className="relative">
                    <ImagePlus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40" />
                    <GlassInput
                      name="photo_url"
                      value={volunteerForm.photo_url}
                      onChange={handleVolunteerChange}
                      className="pl-10"
                      placeholder="https://..."
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium glass-subtitle mb-2">Специализация</label>
                    <GlassInput
                      name="specialization"
                      value={volunteerForm.specialization}
                      onChange={handleVolunteerChange}
                      placeholder="Например, английский / IT / финансы"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium glass-subtitle mb-2">Опыт</label>
                    <GlassInput
                      name="experience"
                      value={volunteerForm.experience}
                      onChange={handleVolunteerChange}
                      placeholder="Стаж, кейсы, лекции"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium glass-subtitle mb-2">О себе</label>
                  <textarea
                    name="about"
                    value={volunteerForm.about}
                    onChange={handleVolunteerChange}
                    className="glass-input border rounded-2xl p-3 min-h-32"
                    placeholder="Коротко расскажите, какие лекции вы хотите проводить"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <IosButton type="submit" disabled={volunteerSubmitting || volunteerApplication?.status === 'pending'} className="inline-flex gap-2">
                    <UserCheck className="w-4 h-4" />
                    {volunteerSubmitting ? 'Отправка...' : volunteerApplication ? 'Заявка подана' : 'Подать заявку'}
                  </IosButton>
                  {volunteerApplication && (
                    <span className={`text-sm font-medium px-3 py-1 rounded-full ${
                      volunteerApplication.status === 'approved' ? 'bg-green-100 text-green-700' :
                      volunteerApplication.status === 'rejected' ? 'bg-red-100 text-red-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {volunteerApplication.status === 'approved' && '✅ Одобрено'}
                      {volunteerApplication.status === 'rejected' && '❌ Отклонено'}
                      {volunteerApplication.status === 'pending' && '⏳ На рассмотрении'}
                    </span>
                  )}
                  {volunteerMessage && <p className="text-sm opacity-70">{volunteerMessage}</p>}
                </div>
              </form>
            </div>
          )}

          {activeTab === 'rating' && (
            <RatingLeaderboard currentUser={user} />
          )}

          {activeTab === 'chats' && (
            <ChatWidget user={user} color="blue" />
          )}

          {activeTab === 'appearance' && (
            <div className="glass-card rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <Settings className="w-5 h-5 opacity-60" />
                <h3 className="text-xl font-bold">Настройки внешнего вида</h3>
              </div>
              <p className="text-sm opacity-70 mb-6">Выберите одну из трёх схем: тёмная, светлая или бежевая.</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {APPEARANCE_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => applyAppearance(option)}
                    className={`glass-card rounded-2xl p-5 text-left transition-all duration-200 ${appearanceId === option.id ? 'ring-2 ring-blue-400 shadow-lg' : 'hover:shadow-md'}`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-semibold">{option.label}</span>
                      {appearanceId === option.id && <span className="text-xs opacity-70">Активно</span>}
                    </div>
                    <div className="flex gap-2 mb-3">
                      <span className={`w-6 h-6 rounded-full border ${option.id === 'light' ? 'bg-white' : option.id === 'dark' ? 'bg-black border-white/20' : 'bg-[#e8dccf]'}`}></span>
                      <span className={`w-6 h-6 rounded-full border opacity-70 ${option.id === 'light' ? 'bg-slate-100' : option.id === 'dark' ? 'bg-zinc-700 border-white/20' : 'bg-[#d2bda9]'}`}></span>
                    </div>
                    <p className="text-sm opacity-60">
                      {option.id === 'light' && 'Светлый режим для повседневной работы.'}
                      {option.id === 'dark' && 'Тёмный режим с чёрной палитрой.'}
                      {option.id === 'beige' && 'Мягкая бежевая палитра для спокойного чтения.'}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default UserDashboard
