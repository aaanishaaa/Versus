import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { getProfile } from '../services/api'

const LEAGUE_COLORS = {
  Bronze: 'bg-amber-700',
  Silver: 'bg-gray-400',
  Gold: 'bg-yellow-400',
  Platinum: 'bg-blue-300',
  Diamond: 'bg-purple-400',
}

export default function ProfilePage() {
  const { userId } = useParams()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [matchHistory, setMatchHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const result = await getProfile(userId)
        setProfile(result.profile)
        setMatchHistory(result.matchHistory || [])
        setLoading(false)
      } catch (error) {
        toast.error('Failed to load profile')
        console.error(error)
        setLoading(false)
      }
    }

    fetchProfile()
  }, [userId])

  const getLeagueBadgeColor = (league) => LEAGUE_COLORS[league] || 'bg-gray-500'

  const getInitials = (name) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
  }

  const timeAgo = (date) => {
    const now = new Date()
    const then = new Date(date)
    const seconds = Math.floor((now - then) / 1000)

    const intervals = {
      year: 31536000,
      month: 2592000,
      week: 604800,
      day: 86400,
      hour: 3600,
      minute: 60,
    }

    for (const [name, value] of Object.entries(intervals)) {
      const interval = Math.floor(seconds / value)
      if (interval >= 1) {
        return `${interval} ${name}${interval > 1 ? 's' : ''} ago`
      }
    }

    return 'just now'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-white text-lg">Loading profile...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <p className="text-white text-lg text-center">Profile not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Profile Header */}
        <div className="bg-slate-800 rounded-lg p-8 mb-8">
          <div className="flex items-center space-x-6 mb-6">
            <div
              className={`w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold text-white ${getLeagueBadgeColor(
                profile.league
              )}`}
            >
              {getInitials(profile.name)}
            </div>
            <div className="flex-1">
              <h1 className="text-4xl font-bold">{profile.name}</h1>
              <p className="text-gray-400 mb-2">{profile.email}</p>
              <div className="flex items-center space-x-4">
                <span className="text-3xl font-bold text-blue-400">{profile.rating}</span>
                <span
                  className={`px-3 py-1 rounded text-lg font-bold text-white ${getLeagueBadgeColor(
                    profile.league
                  )}`}
                >
                  {profile.league}
                </span>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 pt-6 border-t border-slate-700">
            <div>
              <p className="text-gray-400 text-sm mb-1">Total Matches</p>
              <p className="text-2xl font-bold">{profile.totalMatches}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-1">Wins</p>
              <p className="text-2xl font-bold text-green-400">{profile.wins}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-1">Losses</p>
              <p className="text-2xl font-bold text-red-400">{profile.losses}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-1">Win Rate</p>
              <p className="text-2xl font-bold">{profile.winRate}%</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-1">Joined</p>
              <p className="text-sm font-bold">{new Date(profile.joinedAt).toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        {/* Match History */}
        {matchHistory.length > 0 && (
          <div className="bg-slate-800 rounded-lg overflow-hidden">
            <div className="p-6 border-b border-slate-700">
              <h2 className="text-2xl font-bold">Match History</h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-700 border-b border-slate-600">
                    <th className="px-6 py-3 text-left font-bold">Result</th>
                    <th className="px-6 py-3 text-left font-bold">Opponent</th>
                    <th className="px-6 py-3 text-left font-bold">Problem</th>
                    <th className="px-6 py-3 text-right font-bold">Rating Change</th>
                    <th className="px-6 py-3 text-right font-bold">When</th>
                  </tr>
                </thead>
                <tbody>
                  {matchHistory.map((match) => (
                    <tr
                      key={match.id}
                      className="border-b border-slate-600 hover:bg-slate-700 transition cursor-pointer"
                      onClick={() => navigate(`/result/${match.id}`)}
                    >
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded text-xs font-bold text-white ${
                            match.result === 'WIN' ? 'bg-green-600' : 'bg-red-600'
                          }`}
                        >
                          {match.result}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-bold">{match.opponentName}</p>
                          <p className="text-sm text-gray-400">{match.opponentRating}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-300">{match.problemId}</td>
                      <td className="px-6 py-4 text-right font-bold">
                        <span className={match.ratingDelta >= 0 ? 'text-green-400' : 'text-red-400'}>
                          {match.ratingDelta >= 0 ? '+' : ''}{match.ratingDelta}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-gray-400 text-sm">
                        {timeAgo(match.finishedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {matchHistory.length === 0 && (
          <div className="bg-slate-800 rounded-lg p-8 text-center">
            <p className="text-gray-400">No matches played yet</p>
          </div>
        )}

        <div className="mt-8 flex justify-center gap-4">
          <button
            onClick={() => navigate('/leaderboard')}
            className="px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded font-bold transition"
          >
            View Leaderboard
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-6 py-3 bg-blue-500 hover:bg-blue-600 rounded font-bold transition"
          >
            Play
          </button>
        </div>
      </div>
    </div>
  )
}
