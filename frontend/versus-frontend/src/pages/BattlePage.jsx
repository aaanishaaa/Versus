import Editor from '@monaco-editor/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { giveUpMatch, getMatch, submitCode, getExecutionHealth } from '../services/api.js'
import { getToken } from '../services/auth.js'
import { socket, initSocket } from '../main.jsx'

const MATCH_DURATION_SECONDS = 30 * 60

const LANGUAGE_OPTIONS = [
  { label: 'Python', key: 'python', monaco: 'python', defaultCode: 'print("Hello, Versus")\n' },
  {
    label: 'JavaScript',
    key: 'javascript',
    monaco: 'javascript',
    defaultCode: 'console.log("Hello, Versus");\n',
  },
  {
    label: 'C++',
    key: 'cpp',
    monaco: 'cpp',
    defaultCode:
      '#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n  cout << "Hello, Versus";\n  return 0;\n}\n',
  },
]

function BattlePage() {
  const navigate = useNavigate()
  const { matchId } = useParams()
  const [match, setMatch] = useState(null)
  const [loading, setLoading] = useState(true)
  const [language, setLanguage] = useState('python')
  const [code, setCode] = useState(LANGUAGE_OPTIONS[0].defaultCode)
  const [timerSeconds, setTimerSeconds] = useState(MATCH_DURATION_SECONDS)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [verdict, setVerdict] = useState(null)
  const [error, setError] = useState('')
  const [opponentStatus, setOpponentStatus] = useState('Opponent is coding...')
  const [matchEnded, setMatchEnded] = useState(false)
  const [showDisconnectModal, setShowDisconnectModal] = useState(false)
  const [showGiveUpModal, setShowGiveUpModal] = useState(false)
  const [executionHealth, setExecutionHealth] = useState(null)
  const [testProgress, setTestProgress] = useState(null)
  const [isReconnecting, setIsReconnecting] = useState(false)
  const reconnectTimerRef = useRef(null)
  const currentUserId = getTokenPayloadId()

  const languageMeta = useMemo(() => {
    return LANGUAGE_OPTIONS.find((item) => item.key === language) || LANGUAGE_OPTIONS[0]
  }, [language])

  useEffect(() => {
    const loadMatch = async () => {
      try {
        const response = await getMatch(matchId)
        setMatch(response.match)

        if (response.match.status === 'finished') {
          setMatchEnded(true)
          toast.error('Match already finished.')
        }

        if (response.match.started_at) {
          const startedAt = new Date(response.match.started_at).getTime()
          const elapsed = Math.max(0, Math.floor((Date.now() - startedAt) / 1000))
          setTimerSeconds(Math.max(MATCH_DURATION_SECONDS - elapsed, 0))
        }

        setLoading(false)
      } catch (requestError) {
        toast.error(requestError.message)
        setLoading(false)
      }
    }

    loadMatch()
  }, [matchId])

  useEffect(() => {
    if (!match || matchEnded) {
      return
    }

    if (timerSeconds <= 0) {
      setIsSubmitting(false)
      toast.error("Time's up!")
      setMatchEnded(true)
      return
    }

    const interval = setInterval(() => {
      setTimerSeconds((current) => {
        if (current <= 1) {
          clearInterval(interval)
          return 0
        }
        return current - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [match, matchEnded])

  useEffect(() => {
    const token = getToken()
    if (!token || !matchId) {
      return
    }

    const s = socket || initSocket(token)
    if (!s.connected) {
      s.connect()
    }

    const handleConnect = () => {
      setIsReconnecting(false)
      s.emit('join_match_room', { matchId })
      if (reconnectTimerRef.current) {
        clearInterval(reconnectTimerRef.current)
      }
    }

    const handleDisconnect = () => {
      setIsReconnecting(true)
      if (reconnectTimerRef.current) {
        clearInterval(reconnectTimerRef.current)
      }
      reconnectTimerRef.current = setInterval(() => {
        if (s && !s.connected) {
          s.connect()
        }
      }, 3000)
    }

    const handleOpponentSubmitted = () => {
      setOpponentStatus('Opponent submitted - testing...')
      toast.info('Opponent is testing their code')
    }

    const handleSubmissionResult = (payload) => {
      setVerdict(payload)
      setIsSubmitting(false)
      setOpponentStatus('Opponent is coding...')
      setTestProgress(null)
    }

    const handleSubmissionProgress = (payload) => {
      setTestProgress(payload)
    }

    const handleMatchResult = () => {
      setMatchEnded(true)
      setIsSubmitting(false)
      toast.success('Match finished!')
      navigate(`/result/${matchId}`, { replace: true })
    }

    const handleOpponentDisconnected = () => {
      setMatchEnded(true)
      setShowDisconnectModal(true)
      setIsSubmitting(false)
      toast.success('Opponent disconnected. You win!')
    }

    const handleConnectError = (connectError) => {
      toast.error(connectError.message || 'Socket connection failed')
    }

    if (s.connected) {
      s.emit('join_match_room', { matchId })
    }

    s.on('connect', handleConnect)
    s.on('disconnect', handleDisconnect)
    s.on('opponent_submitted', handleOpponentSubmitted)
    s.on('submission_result', handleSubmissionResult)
    s.on('submission_progress', handleSubmissionProgress)
    s.on('match_result', handleMatchResult)
    s.on('opponent_disconnected', handleOpponentDisconnected)
    s.on('connect_error', handleConnectError)

    return () => {
      s.off('connect', handleConnect)
      s.off('disconnect', handleDisconnect)
      s.off('opponent_submitted', handleOpponentSubmitted)
      s.off('submission_result', handleSubmissionResult)
      s.off('submission_progress', handleSubmissionProgress)
      s.off('match_result', handleMatchResult)
      s.off('opponent_disconnected', handleOpponentDisconnected)
      s.off('connect_error', handleConnectError)
      if (reconnectTimerRef.current) {
        clearInterval(reconnectTimerRef.current)
      }
    }
  }, [matchId, navigate])

  useEffect(() => {
    let mounted = true
    getExecutionHealth()
      .then((h) => {
        if (mounted) setExecutionHealth(h)
      })
      .catch(() => {})

    return () => {
      mounted = false
    }
  }, [])

  const handleLanguageChange = (event) => {
    const nextLanguage = event.target.value
    setLanguage(nextLanguage)

    const selected = LANGUAGE_OPTIONS.find((item) => item.key === nextLanguage)
    if (selected && !code.trim()) {
      setCode(selected.defaultCode)
    }
  }

  const handleSubmit = async () => {
    if (isSubmitting || matchEnded || timerSeconds <= 0) {
      return
    }

    setError('')
    setVerdict(null)
    setIsSubmitting(true)
    setOpponentStatus('Opponent is coding...')

    try {
      const response = await submitCode(matchId, code, language)

      if (response.verdict === 'AC') {
        setMatchEnded(true)
        toast.success('All tests passed!')
        navigate(`/result/${matchId}`, { replace: true })
        return
      }

      setVerdict(response)
      if (response.verdict === 'WA') {
        toast.error(`Wrong Answer on test case ${response.failedCase}`)
      } else if (response.verdict === 'TLE') {
        toast.error('Time Limit Exceeded')
      } else if (response.verdict === 'CE') {
        toast.error(response.message || 'Compilation failed')
      } else if (response.verdict === 'RE') {
        toast.error(response.message || 'Runtime error')
      }
    } catch (requestError) {
      if (requestError.status === 409) {
        setMatchEnded(true)
        toast.error('Opponent already won')
      } else {
        toast.error(requestError.message)
      }
      setError(requestError.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGiveUp = async () => {
    if (isSubmitting || matchEnded) {
      return
    }

    setShowGiveUpModal(false)
    setIsSubmitting(true)

    try {
      const response = await giveUpMatch(matchId)
      setMatchEnded(true)
      toast.error('You gave up the match')
      navigate(`/result/${matchId}`, { replace: true, state: response })
    } catch (requestError) {
      if (requestError.status === 409) {
        setMatchEnded(true)
        toast.error('Match already finished')
      } else {
        toast.error(requestError.message)
      }
      setError(requestError.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading match...</p>
        </div>
      </div>
    )
  }

  if (!match) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <p className="text-white text-lg">{error || 'Match not found'}</p>
        </div>
      </div>
    )
  }

  const selfPlayer = match.players.find((player) => player.id === getTokenPayloadId())
  const opponent = match.players.find((player) => player.id !== selfPlayer?.id) || match.players[0]
  const minutes = String(Math.floor(timerSeconds / 60)).padStart(2, '0')
  const seconds = String(timerSeconds % 60).padStart(2, '0')
  const timerColor = timerSeconds > 300 ? 'text-gray-300' : timerSeconds > 60 ? 'text-yellow-400' : 'text-red-400'

  const canGiveUp = !matchEnded && !!currentUserId && !isSubmitting

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(30,41,59,0.95),_rgba(2,6,23,1))] text-white">
      {isReconnecting && (
        <div className="fixed top-20 left-0 right-0 bg-amber-500 text-slate-950 py-3 px-4 text-center font-bold shadow-lg z-40">
          ⚠️ Reconnecting...
        </div>
      )}

      <div className="max-w-[1600px] mx-auto p-4 lg:p-6">
        <div className="mb-4 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl shadow-slate-950/30 p-4 lg:p-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-sky-300 mb-1">Live Battle</p>
            <h1 className="text-2xl lg:text-3xl font-black tracking-tight">{match.problem.title}</h1>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold tracking-wide ${
              match.problem.difficulty === 'easy'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : match.problem.difficulty === 'medium'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
            }`}>
              {match.problem.difficulty.toUpperCase()}
            </span>
            <span className="rounded-full border border-white/10 bg-slate-950/40 px-3 py-1 text-xs text-slate-200">
              {timerSeconds > 0 ? `${minutes}:${seconds}` : '00:00'} remaining
            </span>
            {executionHealth && (
              <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${executionHealth.judge0 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'}`}>
                {executionHealth.judge0 ? 'Remote executor' : 'Local runner'}
              </span>
            )}
            <button
              onClick={() => setShowGiveUpModal(true)}
              disabled={!canGiveUp}
              className="rounded-full border border-rose-400/30 bg-rose-500/15 px-4 py-2 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/25 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Give Up
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.1fr_1.25fr_0.9fr] lg:gap-5">
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-xl shadow-slate-950/25 p-5 overflow-y-auto">
            <h2 className="text-xl font-bold mb-2 text-white">Problem</h2>
            <p className="text-slate-300 mb-4 leading-7">{match.problem.description}</p>

            <h3 className="text-base font-semibold mb-3 text-slate-100">Sample Tests</h3>
            <div className="space-y-3">
              {match.problem.samples.slice(0, 3).map((sample, index) => (
                <div key={index} className="rounded-xl border border-white/10 bg-slate-950/50 p-3">
                  <p className="text-xs uppercase tracking-wide text-slate-400 mb-2">Sample {index + 1}</p>
                  <p className="text-xs font-semibold text-slate-400">Input</p>
                  <pre className="mt-1 text-xs bg-black/40 p-2 rounded overflow-x-auto text-slate-100">{sample.input}</pre>
                  <p className="mt-3 text-xs font-semibold text-slate-400">Expected</p>
                  <pre className="mt-1 text-xs bg-black/40 p-2 rounded overflow-x-auto text-slate-100">{sample.expected}</pre>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-xl shadow-slate-950/25 p-4 flex flex-col min-h-[60vh]">
            <div className="flex gap-2 mb-4 items-center flex-wrap">
              <select
                value={language}
                onChange={handleLanguageChange}
                className="rounded-full border border-white/10 bg-slate-950/50 px-4 py-2 text-sm font-medium text-white outline-none focus:border-sky-400"
              >
                {LANGUAGE_OPTIONS.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </select>

              <button
                onClick={handleSubmit}
                disabled={isSubmitting || timerSeconds <= 0 || matchEnded}
                className="ml-auto rounded-full bg-sky-500 px-5 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-300"
              >
                {isSubmitting ? 'Testing...' : 'Submit'}
              </button>
            </div>

            <div className="flex-1 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/60 shadow-inner shadow-black/30">
              <Editor
                height="100%"
                language={languageMeta.monaco}
                theme="vs-dark"
                value={code}
                options={{
                  fontSize: 14,
                  minimap: { enabled: false },
                  automaticLayout: true,
                  readOnly: isSubmitting || matchEnded,
                  scrollBeyondLastLine: false,
                }}
                onChange={(value) => setCode(value || '')}
              />
            </div>

            {verdict && (
              <div
                className={`mt-4 rounded-2xl border p-4 ${
                  verdict.verdict === 'AC'
                    ? 'border-emerald-500/30 bg-emerald-500/10'
                    : 'border-rose-500/30 bg-rose-500/10'
                }`}
              >
                <p className="font-bold mb-2">Verdict: {verdict.verdict}</p>
                {verdict.message && <p className="text-sm mb-2 text-slate-200">{verdict.message}</p>}
                {verdict.details && <pre className="text-sm whitespace-pre-wrap mb-2 text-slate-200">{verdict.details}</pre>}
                {verdict.verdict !== 'AC' && verdict.failedCase && (
                  <>
                    <p className="text-sm">Failed Case: {verdict.failedCase}</p>
                    <p className="text-sm">Your Output: {verdict.output || '(empty)'}</p>
                    <p className="text-sm">Expected: {verdict.expected || '(empty)'}</p>
                  </>
                )}
              </div>
            )}
            {testProgress && (
              <div className="mt-3">
                <p className="text-sm text-slate-300 mb-2">Testing: {testProgress.current} / {testProgress.total}</p>
                <div className="w-full bg-white/10 rounded-full h-2">
                  <div className="bg-sky-400 h-2 rounded-full" style={{ width: `${(testProgress.current / testProgress.total) * 100}%` }} />
                </div>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-xl shadow-slate-950/25 p-5">
            <h3 className="text-xl font-bold mb-5">Match Info</h3>

            <div className="space-y-4">
              <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-400 mb-1">Opponent</p>
                <p className="text-lg font-bold">{opponent?.name || opponent?.email}</p>
                <p className="text-sm text-sky-300">Rating: {opponent?.rating}</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-400 mb-1">Your Rating</p>
                <p className="text-lg font-bold text-sky-300">{selfPlayer?.rating || '-'}</p>
              </div>

              <div className={`rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-center ${timerColor}`}>
                <p className="text-xs uppercase tracking-wide text-slate-400 mb-2 text-white">Time Remaining</p>
                <p className="text-4xl font-black font-mono">
                  {minutes}:{seconds}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-400 mb-1">Status</p>
                <p className="text-sm text-slate-200">{opponentStatus}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showDisconnectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-lg p-8 text-center max-w-md">
            <h2 className="text-2xl font-bold mb-4">🎉 Opponent Disconnected</h2>
            <p className="text-gray-300 mb-6">You win!</p>
            <button
              onClick={() => navigate('/dashboard', { replace: true })}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded font-bold transition"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      )}

      {showGiveUpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900 shadow-2xl shadow-black/40 p-6">
            <p className="text-xs uppercase tracking-[0.35em] text-rose-300 mb-2">Confirm surrender</p>
            <h2 className="text-2xl font-black mb-3">Give up this match?</h2>
            <p className="text-slate-300 mb-6 leading-6">
              You will lose the match immediately and your opponent will be awarded the win.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowGiveUpModal(false)}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                onClick={handleGiveUp}
                className="rounded-full bg-rose-500 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-rose-400"
              >
                Yes, give up
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

function getTokenPayloadId() {
  const token = getToken()
  if (!token) {
    return null
  }

  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return payload.sub
  } catch (_error) {
    return null
  }
}

export default BattlePage
