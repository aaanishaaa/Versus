import { useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import NavBar from './components/NavBar.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import BattlePage from './pages/BattlePage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import RegisterPage from './pages/RegisterPage.jsx'
import ResultPage from './pages/ResultPage.jsx'
import LeaderboardPage from './pages/LeaderboardPage.jsx'
import ProfilePage from './pages/ProfilePage.jsx'
import { me } from './services/api.js'
import { getToken } from './services/auth.js'

function App() {
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadUser = async () => {
      if (!getToken()) {
        setLoading(false)
        return
      }

      try {
        const result = await me()
        setCurrentUser(result.user)
      } catch (error) {
        console.error('Failed to fetch user:', error)
      } finally {
        setLoading(false)
      }
    }

    loadUser()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <Toaster position="top-right" />
      {currentUser && <NavBar currentUser={currentUser} />}
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute currentUser={currentUser}>
              <DashboardPage currentUser={currentUser} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/battle/:matchId"
          element={
            <ProtectedRoute currentUser={currentUser}>
              <BattlePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/result/:matchId"
          element={
            <ProtectedRoute currentUser={currentUser}>
              <ResultPage currentUserId={currentUser?.id} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/leaderboard"
          element={
            <ProtectedRoute currentUser={currentUser}>
              <LeaderboardPage currentUser={currentUser} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile/:userId"
          element={
            <ProtectedRoute currentUser={currentUser}>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </>
  )
}

export default App
