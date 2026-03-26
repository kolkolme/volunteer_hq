import { useEffect, useRef, useState, useCallback } from 'react'
import { MessageSquare, PenSquare, Search, Send, X } from 'lucide-react'
import { getChats, createChat, getMessages, sendMessage, markMessagesRead, searchChatUsers } from '../services/api'
import GlassInput from './ui/GlassInput'

/**
 * Reusable full-featured chat widget.
 * Props:
 *   user       — current auth user object
 *   color      — accent tailwind color name ('blue' | 'amber') default 'blue'
 *   height     — height class, default 'h-[480px]'
 */
const ChatWidget = ({ user, color = 'blue', height = 'h-[480px]' }) => {
  const [rooms, setRooms] = useState([])
  const [activeRoom, setActiveRoom] = useState(null)
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)

  // New-chat search state
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)

  const messagesEndRef = useRef(null)
  const searchDebounce = useRef(null)
  const pollRef = useRef(null)

  const accent = color === 'amber' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-blue-500 hover:bg-blue-600'
  const accentBg = color === 'amber' ? 'bg-amber-500' : 'bg-blue-500'
  const accentRing = color === 'amber' ? 'ring-amber-400' : 'ring-blue-400'

  // ── Load chat rooms ─────────────────────────────────────────────
  const loadRooms = useCallback(async () => {
    try {
      const res = await getChats()
      const fresh = res.data.results || res.data
      setRooms(fresh)
      // Update activeRoom participants/last_message if open
      setActiveRoom(prev => {
        if (!prev) return prev
        const updated = fresh.find(r => r.id === prev.id)
        return updated || prev
      })
    } catch {}
  }, [])

  useEffect(() => {
    loadRooms().finally(() => setLoading(false))
  }, [loadRooms])

  // ── Load messages when room changes ────────────────────────────
  useEffect(() => {
    if (!activeRoom) return
    markMessagesRead(activeRoom.id).catch(() => {})
    getMessages(activeRoom.id).then(res => {
      setMessages(res.data.results || res.data)
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 80)
    })
  }, [activeRoom?.id])

  // ── Poll active room messages every 4 s ────────────────────────
  useEffect(() => {
    if (!activeRoom) return
    const poll = async () => {
      try {
        const res = await getMessages(activeRoom.id)
        const fresh = res.data.results || res.data
        setMessages(prev => {
          if (JSON.stringify(prev.map(m => m.id)) === JSON.stringify(fresh.map(m => m.id))) return prev
          setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
          return fresh
        })
      } catch {}
    }
    pollRef.current = setInterval(poll, 4000)
    return () => clearInterval(pollRef.current)
  }, [activeRoom?.id])

  // ── Send message ────────────────────────────────────────────────
  const handleSend = async (e) => {
    e.preventDefault()
    if (!text.trim() || !activeRoom) return
    const content = text.trim()
    setText('')
    try {
      const res = await sendMessage(activeRoom.id, content)
      setMessages(prev => [...prev, res.data])
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
      loadRooms() // refresh last_message in sidebar
    } catch {}
  }

  // ── User search ─────────────────────────────────────────────────
  const handleSearchChange = (q) => {
    setSearchQuery(q)
    if (searchDebounce.current) clearTimeout(searchDebounce.current)
    if (q.length < 2) { setSearchResults([]); return }
    searchDebounce.current = setTimeout(async () => {
      setSearchLoading(true)
      try {
        const res = await searchChatUsers(q)
        setSearchResults(res.data)
      } catch {
        setSearchResults([])
      } finally {
        setSearchLoading(false)
      }
    }, 300)
  }

  const handleStartChat = async (targetUser) => {
    try {
      const res = await createChat(targetUser.id)
      const room = res.data
      setRooms(prev => prev.find(r => r.id === room.id) ? prev : [room, ...prev])
      setActiveRoom(room)
      setShowSearch(false)
      setSearchQuery('')
      setSearchResults([])
    } catch {}
  }

  if (loading) {
    return <div className="text-center py-8 opacity-60 text-sm">Загрузка чатов...</div>
  }

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      <div className="flex items-center gap-3 p-4 border-b border-white/10">
        <MessageSquare className="w-5 h-5 opacity-60" />
        <h3 className="text-xl font-bold flex-1">Чаты</h3>
        <button
          onClick={() => { setShowSearch(s => !s); setSearchQuery(''); setSearchResults([]) }}
          title="Новый чат"
          className={`p-2 rounded-xl transition-colors ${showSearch ? accentBg + ' text-white' : 'glass-card hover:opacity-80'}`}
        >
          {showSearch ? <X className="w-4 h-4" /> : <PenSquare className="w-4 h-4" />}
        </button>
      </div>

      <div className={`flex ${height}`}>
        {/* ── Sidebar ──────────────────────────────────────────────── */}
        <div className="w-64 shrink-0 border-r border-white/10 flex flex-col">
          {/* New-chat search panel */}
          {showSearch && (
            <div className="p-3 border-b border-white/10 space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40" />
                <input
                  autoFocus
                  type="text"
                  placeholder="Имя или логин..."
                  className="glass-input border rounded-full pl-9 pr-4 py-2 text-sm w-full"
                  value={searchQuery}
                  onChange={e => handleSearchChange(e.target.value)}
                />
              </div>
              <div className="space-y-1 max-h-52 overflow-y-auto">
                {searchLoading && <p className="text-xs opacity-50 text-center py-2">Поиск...</p>}
                {!searchLoading && searchQuery.length >= 2 && searchResults.length === 0 && (
                  <p className="text-xs opacity-50 text-center py-2">Никого не найдено</p>
                )}
                {searchResults.map(u => (
                  <button
                    key={u.id}
                    onClick={() => handleStartChat(u)}
                    className="w-full text-left px-3 py-2 rounded-xl glass-card hover:opacity-80 transition-all"
                  >
                    <p className="text-sm font-medium truncate">{u.full_name || u.username}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Room list */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {rooms.length === 0 && !showSearch && (
              <p className="text-sm text-center opacity-50 py-4">
                Нет чатов.<br />
                <span className="text-xs">Нажмите ✏️ чтобы начать</span>
              </p>
            )}
            {rooms.map(room => {
              const other = room.participants?.find(p => p.id !== user?.id)
              return (
                <button
                  key={room.id}
                  onClick={() => { setActiveRoom(room); setShowSearch(false) }}
                  className={`w-full text-left p-3 rounded-xl transition-all ${
                    activeRoom?.id === room.id
                      ? accentBg + ' text-white'
                      : 'glass-card hover:opacity-80'
                  }`}
                >
                  <p className="font-medium text-sm truncate">{other?.full_name || other?.username || 'Чат'}</p>
                  {room.last_message && (
                    <p className="text-xs opacity-70 truncate">{room.last_message.content}</p>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Chat area ────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0">
          {!activeRoom ? (
            <div className="flex-1 flex flex-col items-center justify-center opacity-50 text-sm gap-2">
              <MessageSquare className="w-10 h-10 opacity-30" />
              <p>Выберите чат или начните новый</p>
            </div>
          ) : (
            <>
              <div className="p-3 border-b border-white/10 flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full ${accentBg} text-white text-xs flex items-center justify-center font-bold shrink-0`}>
                  {(activeRoom.participants?.find(p => p.id !== user?.id)?.full_name || '?').slice(0, 1).toUpperCase()}
                </div>
                <p className="font-semibold text-sm truncate">
                  {activeRoom.participants?.find(p => p.id !== user?.id)?.full_name || 'Чат'}
                </p>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {messages.length === 0 && (
                  <p className="text-center text-sm opacity-40 mt-8">Начните переписку</p>
                )}
                {messages.map(msg => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender?.id === user?.id ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${
                      msg.sender?.id === user?.id
                        ? accentBg + ' text-white'
                        : 'glass-card'
                    }`}>
                      {msg.sender?.id !== user?.id && (
                        <p className="text-xs font-medium mb-0.5 opacity-70">{msg.sender?.full_name}</p>
                      )}
                      <p>{msg.content}</p>
                      <p className="text-[10px] mt-0.5 opacity-60 text-right">
                        {new Date(msg.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={handleSend} className="p-3 border-t border-white/10 flex gap-2">
                <GlassInput
                  value={text}
                  onChange={e => setText(e.target.value)}
                  placeholder="Сообщение..."
                  className="flex-1"
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend(e)}
                />
                <button
                  type="submit"
                  disabled={!text.trim()}
                  className={`p-2 rounded-xl text-white transition-colors disabled:opacity-40 ${accent}`}
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default ChatWidget
