import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getToken, clearToken } from '../services/auth'
import { disconnectSocket } from '../socket.js'

const LEAGUE_COLORS = {
  Bronze: 'bg-amber-700',
  Silver: 'bg-gray-400',
  Gold: 'bg-yellow-400',
  Platinum: 'bg-blue-300',
  Diamond: 'bg-purple-400',
}

export default function NavBar({ currentUser }) {
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)

  if (!currentUser) {
    return null
  }

  const handleLogout = () => {
    disconnectSocket()
    clearToken()
    navigate('/login')
  }

  const getLeagueBadgeColor = (rating) => {
    if (rating >= 2000) return LEAGUE_COLORS.Diamond
    if (rating >= 1700) return LEAGUE_COLORS.Platinum
    if (rating >= 1400) return LEAGUE_COLORS.Gold
    if (rating >= 1200) return LEAGUE_COLORS.Silver
    return LEAGUE_COLORS.Bronze
  }

  const getLeagueName = (rating) => {
    if (rating >= 2000) return 'Diamond'
    if (rating >= 1700) return 'Platinum'
    if (rating >= 1400) return 'Gold'
    if (rating >= 1200) return 'Silver'
    return 'Bronze'
  }

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-300 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center cursor-pointer" onClick={() => navigate('/')}>
            <span className="text-2xl mr-2">⚔️</span>
            <span className="font-bold text-xl text-gray-900">Versus</span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <button
              onClick={() => navigate('/dashboard')}
              className="text-gray-700 hover:text-gray-900 font-medium"
            >
              Play
            </button>
            <button
              onClick={() => navigate('/leaderboard')}
              className="text-gray-700 hover:text-gray-900 font-medium"
            >
              Leaderboard
            </button>
            <button
              onClick={() => navigate(`/profile/${currentUser.id}`)}
              className="text-gray-700 hover:text-gray-900 font-medium"
            >
              Profile
            </button>
          </div>

          {/* User Info and Logout */}
          <div className="hidden md:flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-900">
                {currentUser.email?.split('@')[0]}
              </span>
              <span className="text-sm font-bold text-gray-700">{currentUser.rating}</span>
              <span
                className={`px-2 py-1 rounded text-xs font-bold text-white ${getLeagueBadgeColor(
                  currentUser.rating
                )}`}
              >
                {getLeagueName(currentUser.rating)}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded font-medium transition"
            >
              Logout
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:bg-gray-100"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden pb-4 space-y-2 border-t border-gray-300">
            <button
              onClick={() => {
                navigate('/dashboard')
                setIsOpen(false)
              }}
              className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100"
            >
              Play
            </button>
            <button
              onClick={() => {
                navigate('/leaderboard')
                setIsOpen(false)
              }}
              className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100"
            >
              Leaderboard
            </button>
            <button
              onClick={() => {
                navigate(`/profile/${currentUser.id}`)
                setIsOpen(false)
              }}
              className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100"
            >
              Profile
            </button>
            <div className="px-4 py-2 border-t border-gray-300 mt-2">
              <p className="text-sm font-medium text-gray-900">
                {currentUser.email?.split('@')[0]}
              </p>
              <div className="flex items-center space-x-2 mt-1">
                <span className="text-sm font-bold text-gray-700">{currentUser.rating}</span>
                <span
                  className={`px-2 py-1 rounded text-xs font-bold text-white ${getLeagueBadgeColor(
                    currentUser.rating
                  )}`}
                >
                  {getLeagueName(currentUser.rating)}
                </span>
              </div>
            </div>
            <button
              onClick={() => {
                handleLogout()
                setIsOpen(false)
              }}
              className="w-full m-4 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded font-medium transition"
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </nav>
  )
}
