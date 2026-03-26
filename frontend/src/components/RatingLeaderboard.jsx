import { useEffect, useState } from 'react'
import { getLeaderboard } from '../services/api'
import { Trophy } from 'lucide-react'

const RatingLeaderboard = ({ currentUser }) => {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getLeaderboard()
      .then((res) => setRows(res.data.leaderboard || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

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
        <p className="text-sm opacity-60">Топ-10 волонтёров по среднему рейтингу.</p>
      </div>

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
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase opacity-60">Логин</th>
                <th className="text-right px-4 py-3 text-xs font-semibold uppercase opacity-60">Средний рейтинг</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {rows.map((row) => (
                <tr key={row.rank} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3 text-center">
                    <span className="font-bold opacity-70">{row.rank}</span>
                  </td>
                  <td className="px-4 py-3 font-semibold">{row.username}</td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-lg font-bold">{row.avg_rating.toFixed(2)}</span>
                    <span className="text-xs opacity-40 ml-0.5">/10</span>
                  </td>
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
