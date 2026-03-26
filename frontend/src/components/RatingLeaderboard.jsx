import { useEffect, useState } from 'react'
import { getLeaderboard } from '../services/api'
import { Trophy, Star, Medal } from 'lucide-react'

const MEDAL_COLORS = ['text-yellow-400', 'text-gray-400', 'text-amber-600']
const MEDAL_ICONS = ['🥇', '🥈', '🥉']

const RatingLeaderboard = ({ currentUser }) => {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getLeaderboard()
      .then((res) => setRows(res.data.leaderboard || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const isVolunteer = currentUser?.role?.code === 'volunteer'

  if (loading) {
    return <p className="text-center py-12 opacity-50">Загрузка...</p>
  }

  return (
    <div className="space-y-4">
      {/* Header card */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-1">
          <Trophy className="w-6 h-6 text-amber-400" />
          <h2 className="text-2xl font-bold">Рейтинг волонтёров</h2>
        </div>
        <p className="text-sm opacity-60">
          Топ-10 волонтёров по рейтингу. По каждой лекции считается средняя оценка (сумма звёзд ÷ число оценивших), затем берётся среднее по всем лекциям.
        </p>
      </div>

      {/* Own rating banner for volunteers */}
      {isVolunteer && (
        <div className="glass-card rounded-2xl p-4 border border-amber-400/30 bg-amber-400/5">
          <div className="flex items-center gap-3">
            <Star className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <p className="font-semibold">Ваш рейтинг</p>
              <p className="text-2xl font-bold text-amber-400">
                {currentUser.avg_rating > 0
                  ? currentUser.avg_rating.toFixed(2)
                  : '—'}
                <span className="text-sm font-normal opacity-60 ml-1">/ 10</span>
              </p>
              {currentUser.avg_rating === 0 && (
                <p className="text-xs opacity-50 mt-0.5">Рейтинг появится после первой оценки вашей лекции</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard table */}
      {rows.length === 0 ? (
        <div className="glass-card rounded-2xl p-10 text-center opacity-50">
          <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Пока нет данных для рейтинга.</p>
          <p className="text-sm mt-1">Рейтинг появится после того как слушатели оценят лекции.</p>
        </div>
      ) : (
        <div className="glass-card rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase opacity-60 w-12">#</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase opacity-60">Волонтёр</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase opacity-60 hidden sm:table-cell">Город</th>
                <th className="text-right px-4 py-3 text-xs font-semibold uppercase opacity-60">Рейтинг</th>
                <th className="text-right px-4 py-3 text-xs font-semibold uppercase opacity-60 hidden md:table-cell">Лекций</th>
                <th className="text-right px-4 py-3 text-xs font-semibold uppercase opacity-60 hidden md:table-cell">Сумма ⭐</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {rows.map((row) => (
                <tr
                  key={row.rank}
                  className={`transition-colors ${row.rank <= 3 ? 'bg-amber-400/5' : 'hover:bg-white/5'}`}
                >
                  <td className="px-4 py-3 font-bold text-lg text-center">
                    {row.rank <= 3
                      ? <span className="text-xl">{MEDAL_ICONS[row.rank - 1]}</span>
                      : <span className="opacity-50 text-sm">{row.rank}</span>
                    }
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold">{row.full_name}</p>
                  </td>
                  <td className="px-4 py-3 text-sm opacity-60 hidden sm:table-cell">{row.city || '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`text-lg font-bold ${row.rank === 1 ? 'text-amber-400' : row.rank === 2 ? 'text-gray-400' : row.rank === 3 ? 'text-amber-600' : ''}`}>
                      {row.avg_rating.toFixed(2)}
                    </span>
                    <span className="text-xs opacity-40 ml-0.5">/10</span>
                  </td>
                  <td className="px-4 py-3 text-right text-sm opacity-60 hidden md:table-cell">{row.lecture_count}</td>
                  <td className="px-4 py-3 text-right text-sm opacity-60 hidden md:table-cell">{row.total_stars}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default RatingLeaderboard
