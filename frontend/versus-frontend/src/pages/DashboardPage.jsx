import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { me } from '../services/api.js'
import { clearToken, getToken } from '../services/auth.js'
import { initSocket, disconnectSocket, socket } from '../socket.js'

function DashboardPage({ currentUser }) {
  const [loading, setLoading] = useState(!currentUser)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [matchState, setMatchState] = useState('idle')
  const [opponent, setOpponent] = useState(null)
  const [countdown, setCountdown] = useState(3)
  const [queueSize, setQueueSize] = useState(0)
  const [isReconnecting, setIsReconnecting] = useState(false)
  const countdownTimerRef = useRef(null)
  const reconnectTimerRef = useRef(null)
  const matchStateRef = useRef(matchState)
  const navigate = useNavigate()

  useEffect(() => {
    matchStateRef.current = matchState
  }, [matchState])

  useEffect(() => {
    return () => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current)
      }
      if (reconnectTimerRef.current) {
        clearInterval(reconnectTimerRef.current)
      }
    }
  }, [])

  // Initialize socket on mount
  useEffect(() => {
    const token = getToken()
    if (!token) {
      navigate('/login', { replace: true })
      return
    }

    const s = initSocket(token)

    const handleConnect = () => {
      setIsReconnecting(false)
      if (reconnectTimerRef.current) {
        clearInterval(reconnectTimerRef.current)
      }
      toast.success('Connected!')
    }

    const handleDisconnect = () => {
      setMatchState('idle')
      setQueueSize(0)
      setOpponent(null)
      setIsReconnecting(true)
      toast.error('Disconnected. Attempting to reconnect...')

      if (reconnectTimerRef.current) {
        clearInterval(reconnectTimerRef.current)
      }

      reconnectTimerRef.current = setInterval(() => {
        if (s && !s.connected) {
          s.connect()
        }
      }, 3000)
    }

    const handleWaiting = (payload) => {
      setMatchState('searching')
      setQueueSize(payload.queueSize || 0)
      setNotice(payload.message || 'Searching for opponent...')
    }

    const handleQueueUpdated = (payload) => {
      setQueueSize(payload.queueSize || 0)
      if (payload.queueSize > 0 && matchStateRef.current === 'searching') {
        setNotice(`Players in queue: ${payload.queueSize}`)
      }
    }

    const handleMatchFound = (payload) => {
      setMatchState('countdown')
      setOpponent(payload.opponent)
      setCountdown(payload.countdown || 3)
      setNotice('Opponent found! Match starts soon...')

      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current)
      countdownTimerRef.current = setInterval(() => {
        setCountdown((current) => {
          if (current <= 1) {
            clearInterval(countdownTimerRef.current)
            return 1
          }
          return current - 1
        })
      }, 1000)
    }

    const handleMatchStart = (payload) => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current)
      setMatchState('idle')
      setNotice('Match started')
      navigate(`/battle/${payload.matchId}`, {
        state: {
          opponent: payload.opponent,
          problem: payload.problem,
        },
      })
    }

    const handleOpponentDisconnected = async (payload) => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current)
      setMatchState('idle')
      setOpponent(null)
      setQueueSize(0)
      toast.success(payload.message || 'Opponent disconnected. You win!')
      setTimeout(() => {
        navigate('/dashboard', { replace: true })
      }, 1000)
    }

    const handleMatchError = (payload) => {
      setMatchState('idle')
      toast.error(payload.message || 'Failed to match')
    }

    const handleConnectError = (connectError) => {
      setMatchState('idle')
      toast.error(connectError.message || 'Socket connection failed')
    }

    const handleQueueLeft = () => {
      setMatchState('idle')
      setNotice('Queue cancelled.')
      setQueueSize(0)
      setOpponent(null)
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current)
    }

    s.on('connect', handleConnect)
    s.on('disconnect', handleDisconnect)
    s.on('waiting', handleWaiting)
    s.on('queue_updated', handleQueueUpdated)
    s.on('match_found', handleMatchFound)
    s.on('match_start', handleMatchStart)
    s.on('opponent_disconnected', handleOpponentDisconnected)
    s.on('match_error', handleMatchError)
    s.on('connect_error', handleConnectError)
    s.on('queue_left', handleQueueLeft)

    return () => {
      s.off('connect', handleConnect)
      s.off('disconnect', handleDisconnect)
      s.off('waiting', handleWaiting)
      s.off('queue_updated', handleQueueUpdated)
      s.off('match_found', handleMatchFound)
      s.off('match_start', handleMatchStart)
      s.off('opponent_disconnected', handleOpponentDisconnected)
      s.off('match_error', handleMatchError)
      s.off('connect_error', handleConnectError)
      s.off('queue_left', handleQueueLeft)
    }
  }, [navigate])

  const handleFindMatch = () => {
    if (!socket?.connected) {
      toast.error('Not connected. Please wait...')
      return
    }

    setError('')
    setNotice('')
    setMatchState('searching')
    socket.emit('join_queue')
  }

  const handleCancelQueue = () => {
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current)
    if (socket) {
      socket.emit('leave_queue')
    }
    setMatchState('idle')
    setNotice('Queue cancelled.')
    setOpponent(null)
    setQueueSize(0)
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white py-8 px-4">
      {/* Reconnecting Banner */}
      {isReconnecting && (
        <div className="fixed top-20 left-0 right-0 bg-yellow-600 text-white py-3 px-4 text-center font-bold">
          ⚠️ Reconnecting...
        </div>
      )}

      <div className="max-w-2xl mx-auto">
        <section className="bg-slate-800 rounded-lg p-8">
          <header className="mb-8 pb-6 border-b border-slate-700">
            <h1 className="text-4xl font-bold">Versus Dashboard</h1>
            <p className="text-gray-400 mt-2">Find an opponent and test your coding skills</p>
          </header>

          {error && (
            <div className="mb-6 p-4 bg-red-900 border border-red-700 rounded text-white">
              {error}
            </div>
          )}

          {notice && (
            <div className="mb-6 p-4 bg-blue-900 border border-blue-700 rounded text-white">
              {notice}
            </div>
          )}

          {currentUser && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <article className="bg-slate-700 rounded p-4">
                  <h2 className="text-gray-400 text-sm font-bold mb-1">RATING</h2>
                  <p className="text-3xl font-bold text-blue-400">{currentUser.rating}</p>
                </article>
                <article className="bg-slate-700 rounded p-4">
                  <h2 className="text-gray-400 text-sm font-bold mb-1">WINS</h2>
                  <p className="text-3xl font-bold text-green-400">{currentUser.wins}</p>
                </article>
                <article className="bg-slate-700 rounded p-4">
                  <h2 className="text-gray-400 text-sm font-bold mb-1">LOSSES</h2>
                  <p className="text-3xl font-bold text-red-400">{currentUser.losses}</p>
                </article>
                <article className="bg-slate-700 rounded p-4">
                  <h2 className="text-gray-400 text-sm font-bold mb-1">WIN RATE</h2>
                  <p className="text-3xl font-bold">
                    {currentUser.wins + currentUser.losses === 0
                      ? '0'
                      : Math.round((currentUser.wins / (currentUser.wins + currentUser.losses)) * 100)}
                    %
                  </p>
                </article>
              </div>

              <div className="mb-6 rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Live queue</p>
                  <p className="text-lg font-semibold text-white">
                    {queueSize > 0 ? `${queueSize} player${queueSize === 1 ? '' : 's'} waiting` : 'No active queue'}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-bold ${queueSize > 0 ? 'bg-green-500 text-white' : 'bg-slate-700 text-gray-300'}`}>
                  {queueSize}
                </span>
              </div>

              {matchState === 'idle' && (
                <button
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded font-bold text-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleFindMatch}
                  disabled={!socket?.connected}
                >
                  {socket?.connected ? 'Find Match' : 'Connecting...'}
                </button>
              )}

              {matchState === 'searching' && (
                <section className="bg-slate-700 rounded p-6 text-center">
                  <div className="animate-pulse mb-4">
                    <h2 className="text-2xl font-bold">Searching for opponent...</h2>
                  </div>
                  <p className="text-gray-300 mb-6">Players in queue: {queueSize}</p>
                  <button
                    className="px-6 py-2 bg-red-600 hover:bg-red-700 rounded font-bold transition"
                    onClick={handleCancelQueue}
                  >
                    Cancel
                  </button>
                </section>
              )}

              {matchState === 'countdown' && (
                <section className="bg-gradient-to-r from-orange-600 to-red-600 rounded p-6 text-center">
                  <h2 className="text-2xl font-bold mb-3">Match Found!</h2>
                  <p className="mb-4">
                    Opponent: {opponent?.name || opponent?.email} •{' '}
                    <span className="font-bold">{opponent?.rating}</span>
                  </p>
                  <p className="text-6xl font-bold animate-pulse">{countdown}</p>
                </section>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  )
}

export default DashboardPage
