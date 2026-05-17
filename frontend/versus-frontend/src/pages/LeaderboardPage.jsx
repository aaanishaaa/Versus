import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { getLeaderboard } from '../services/api'

const LEAGUE_COLORS = {
  Bronze: 'bg-amber-700',
  Silver: 'bg-gray-400',
  Gold: 'bg-yellow-400',
  Platinum: 'bg-blue-300',
  Diamond: 'bg-purple-400',
}

export default function LeaderboardPage({ currentUser }) {
  const navigate = useNavigate()
  const [leaderboard, setLeaderboard] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filteredLeaderboard, setFilteredLeaderboard] = useState([])

  const fetchLeaderboard = async () => {
    try {
      const result = await getLeaderboard()
      setLeaderboard(result.leaderboard || [])
      setLoading(false)
    } catch (error) {
      toast.error('Failed to load leaderboard')
      console.error(error)
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLeaderboard()
    const interval = setInterval(fetchLeaderboard, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const filtered = leaderboard.filter((user) =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    setFilteredLeaderboard(filtered)
  }, [searchTerm, leaderboard])

  const getLeagueBadgeColor = (league) => LEAGUE_COLORS[league] || 'bg-gray-500'

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-white text-lg">Loading leaderboard...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">🏆 Leaderboard</h1>
          <input
            type="text"
            placeholder="Search player..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 rounded bg-slate-700 placeholder-gray-400 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="bg-slate-800 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-700 border-b border-slate-600">
                  <th className="px-6 py-3 text-left font-bold">Rank</th>
                  <th className="px-6 py-3 text-left font-bold">Player</th>
                  <th className="px-6 py-3 text-left font-bold">League</th>
                  <th className="px-6 py-3 text-right font-bold">Rating</th>
                  <th className="px-6 py-3 text-right font-bold">W/L</th>
                  <th className="px-6 py-3 text-right font-bold">Win Rate</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeaderboard.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-gray-400">
                      No players found
                    </td>
                  </tr>
                ) : (
                  filteredLeaderboard.map((user, index) => {
                    const isCurrentUser = currentUser?.id === user.id
                    const isTopThree = index < 3

                    let bgColor = ''
                    if (isCurrentUser) {
                      bgColor = 'bg-blue-900'
                    } else if (isTopThree) {
                      if (index === 0) bgColor = 'bg-yellow-900'
                      else if (index === 1) bgColor = 'bg-gray-700'
                      else bgColor = 'bg-amber-900'
                    } else {
                      bgColor = 'bg-slate-800 hover:bg-slate-700'
                    }

                    return (
                      <tr
                        key={user.id}
                        className={`border-b border-slate-600 transition cursor-pointer ${bgColor}`}
                        onClick={() => navigate(`/profile/${user.id}`)}
                      >
                        <td className="px-6 py-4 font-bold">
                          {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${user.rank}`}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <span>{user.name}</span>
                            {isCurrentUser && <span className="text-xs bg-blue-500 px-2 py-1 rounded">You</span>}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-3 py-1 rounded text-xs font-bold text-white ${getLeagueBadgeColor(
                              user.league
                            )}`}
                          >
                            {user.league}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-bold">{user.rating}</td>
                        <td className="px-6 py-4 text-right">
                          {user.wins}/{user.losses}
                        </td>
                        <td className="px-6 py-4 text-right">{user.winRate}%</td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-8 text-center">
          <button
            onClick={() => navigate('/dashboard')}
            className="px-6 py-3 bg-blue-500 hover:bg-blue-600 rounded font-bold transition"
          >
            Back to Play
          </button>
        </div>
      </div>
    </div>
  )
}
