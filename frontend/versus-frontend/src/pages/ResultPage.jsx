import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Editor from '@monaco-editor/react'
import confetti from 'canvas-confetti'
import toast from 'react-hot-toast'
import { getMatchResult } from '../services/api'
import { socket } from '../main'

const LEAGUE_COLORS = {
  Bronze: 'bg-amber-700',
  Silver: 'bg-gray-400',
  Gold: 'bg-yellow-400',
  Platinum: 'bg-blue-300',
  Diamond: 'bg-purple-400',
}

export default function ResultPage({ currentUserId }) {
  const { matchId } = useParams()
  const navigate = useNavigate()
  const [match, setMatch] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isWinner, setIsWinner] = useState(false)
  const [ratingFrom, setRatingFrom] = useState(0)
  const [ratingTo, setRatingTo] = useState(0)
  const [animatingRating, setAnimatingRating] = useState(0)

  useEffect(() => {
    const fetchResult = async () => {
      try {
        const result = await getMatchResult(matchId)
        setMatch(result.match)

        const userIsWinner = result.match.winnerId === currentUserId
        setIsWinner(userIsWinner)

        if (userIsWinner) {
          setRatingFrom(result.match.winner.rating - result.match.winner.ratingDelta)
          setRatingTo(result.match.winner.rating)

          // Trigger confetti for winner
          setTimeout(() => {
            confetti({
              particleCount: 100,
              spread: 70,
              origin: { y: 0.6 },
            })
          }, 200)
        } else {
          setRatingFrom(result.match.loser.rating - result.match.loser.ratingDelta)
          setRatingTo(result.match.loser.rating)
        }

        setLoading(false)
      } catch (error) {
        toast.error('Failed to load match result')
        console.error(error)
        setLoading(false)
      }
    }

    fetchResult()
  }, [matchId, currentUserId])

  // Animate rating counter
  useEffect(() => {
    if (!match) return

    let current = ratingFrom
    const target = ratingTo
    const delta = target - current
    const steps = 30
    let step = 0

    const interval = setInterval(() => {
      step++
      const progress = step / steps
      current = ratingFrom + delta * progress
      setAnimatingRating(Math.round(current))

      if (step >= steps) {
        clearInterval(interval)
        setAnimatingRating(target)
      }
    }, 30)

    return () => clearInterval(interval)
  }, [match, ratingFrom, ratingTo])

  const handlePlayAgain = () => {
    if (!socket?.connected) {
      toast.error('Not connected. Reconnecting...')
      return
    }
    socket.emit('join_queue')
    navigate('/dashboard')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading match result...</p>
        </div>
      </div>
    )
  }

  if (!match) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <p className="text-white text-lg">Match not found</p>
      </div>
    )
  }

  const userData = isWinner ? match.winner : match.loser
  const opponentData = isWinner ? match.loser : match.winner

  const getLeagueName = (rating) => {
    if (rating >= 2000) return 'Diamond'
    if (rating >= 1700) return 'Platinum'
    if (rating >= 1400) return 'Gold'
    if (rating >= 1200) return 'Silver'
    return 'Bronze'
  }

  const getLeagueBadgeColor = (rating) => {
    if (rating >= 2000) return LEAGUE_COLORS.Diamond
    if (rating >= 1700) return LEAGUE_COLORS.Platinum
    if (rating >= 1400) return LEAGUE_COLORS.Gold
    if (rating >= 1200) return LEAGUE_COLORS.Silver
    return LEAGUE_COLORS.Bronze
  }

  const ratingDelta = isWinner ? match.winner.ratingDelta : match.loser.ratingDelta

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Result Banner */}
        <div
          className={`rounded-lg mb-8 p-8 text-center ${
            isWinner
              ? 'bg-gradient-to-r from-green-500 to-emerald-600'
              : 'bg-gradient-to-r from-red-500 to-pink-600'
          }`}
        >
          <h1 className="text-5xl font-bold mb-4">{isWinner ? '🎉 YOU WON! 🎉' : '😢 You Lost'}</h1>
          <p className="text-xl opacity-90">
            vs {opponentData.name} ({opponentData.rating})
          </p>
        </div>

        {/* Rating Change */}
        <div className="bg-slate-800 rounded-lg p-8 mb-8 text-center">
          <p className="text-sm text-gray-400 mb-4">RATING UPDATE</p>
          <div className="flex items-center justify-center space-x-4 text-4xl font-bold">
            <span>{ratingFrom}</span>
            <span className="text-gray-400">→</span>
            <span>{animatingRating}</span>
            <span className={ratingDelta >= 0 ? 'text-green-400' : 'text-red-400'}>
              {ratingDelta >= 0 ? '+' : ''}{ratingDelta}
            </span>
          </div>
          <div className="mt-4">
            <span
              className={`px-3 py-1 rounded text-sm font-bold text-white ${getLeagueBadgeColor(
                ratingTo
              )}`}
            >
              {getLeagueName(ratingTo)}
            </span>
          </div>
        </div>

        {/* Match Summary */}
        <div className="bg-slate-800 rounded-lg p-8 mb-8">
          <h2 className="text-2xl font-bold mb-6">Match Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-gray-400 text-sm mb-2">PROBLEM</p>
              <p className="text-xl font-bold">{match.problem.title}</p>
              <p className="text-sm text-gray-400">{match.problem.difficulty}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-2">TIME TAKEN</p>
              <p className="text-xl font-bold">{match.timeTaken}s</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-2">RESULT</p>
              <p className={`text-xl font-bold ${isWinner ? 'text-green-400' : 'text-red-400'}`}>
                {isWinner ? 'WIN' : 'LOSS'}
              </p>
            </div>
          </div>
        </div>

        {/* Code Comparison */}
        <div className="bg-slate-800 rounded-lg p-8 mb-8">
          <h2 className="text-2xl font-bold mb-6">Code Submission</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="font-bold mb-2">Your Code</p>
              <div className="bg-slate-900 rounded border border-slate-700 overflow-hidden">
                <Editor
                  height="400px"
                  language={userData.language}
                  value={userData.code}
                  options={{
                    readOnly: true,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                  }}
                  theme="vs-dark"
                />
              </div>
            </div>
            <div>
              <p className="font-bold mb-2">
                Opponent Code ({opponentData.name})
              </p>
              <div className="bg-slate-900 rounded border border-slate-700 overflow-hidden">
                <Editor
                  height="400px"
                  language={opponentData.language}
                  value={opponentData.code}
                  options={{
                    readOnly: true,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                  }}
                  theme="vs-dark"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center gap-4 flex-wrap">
          <button
            onClick={handlePlayAgain}
            className="px-6 py-3 bg-blue-500 hover:bg-blue-600 rounded font-bold transition"
          >
            Play Again
          </button>
          <button
            onClick={() => navigate('/leaderboard')}
            className="px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded font-bold transition"
          >
            View Leaderboard
          </button>
        </div>
      </div>
    </div>
  )
}
