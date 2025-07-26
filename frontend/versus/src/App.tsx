import { useState, useEffect } from 'react'
import { Navbar } from './Navbar'
import { HomePage } from './HomePage'
import { AuthPage } from './AuthPage'
import { Dashboard } from './Dashboard'
import './App.css'

function App() {
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [currentPage, setCurrentPage] = useState<string>('home')
  const [apiStatus, setApiStatus] = useState<string>('Testing...')

  // Test API connection
  useEffect(() => {
    const testAPI = async () => {
      try {
        const response = await fetch('/api/auth/ping')
        const data = await response.text()
        setApiStatus(`✅ API Connected: ${data}`)
      } catch (error) {
        setApiStatus(`❌ API Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }
    
    testAPI()

    // Check if user is already logged in
    const token = localStorage.getItem('token')
    if (token) {
      // You could verify the token here with the backend
      // For now, we'll assume it's valid
    }
  }, [])

  const handleAuthSuccess = (data: any) => {
    setCurrentUser(data.user || data)
    setCurrentPage('dashboard')
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    setCurrentUser(null)
    setCurrentPage('home')
    alert('Logged out successfully!')
  }

  const handleNavigate = (page: string) => {
    setCurrentPage(page)
  }

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'home':
        return <HomePage currentUser={currentUser} onNavigate={handleNavigate} />
      case 'auth':
        return <AuthPage onAuthSuccess={handleAuthSuccess} />
      case 'dashboard':
        return currentUser ? <Dashboard currentUser={currentUser} onNavigate={handleNavigate} /> : <AuthPage onAuthSuccess={handleAuthSuccess} />
      case 'profile':
        return currentUser ? (
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px', textAlign: 'center' }}>
            <h1>Profile Page</h1>
            <p>Coming soon! Your profile and detailed stats will be here.</p>
            <div style={{ 
              padding: '20px', 
              backgroundColor: '#f8f9fa', 
              borderRadius: '10px',
              marginTop: '20px'
            }}>
              <h3>Current User Info:</h3>
              <p><strong>Username:</strong> {currentUser.username}</p>
              <p><strong>Email:</strong> {currentUser.email}</p>
              <p><strong>Rating:</strong> {currentUser.rating}</p>
              <p><strong>Matches:</strong> {currentUser.matchHistory?.length || 0}</p>
            </div>
          </div>
        ) : <AuthPage onAuthSuccess={handleAuthSuccess} />
      case 'matches':
        return currentUser ? (
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px', textAlign: 'center' }}>
            <h1>Match History</h1>
            <p>Coming soon! Your match history and detailed game statistics will be here.</p>
            <div style={{ 
              padding: '20px', 
              backgroundColor: '#f8f9fa', 
              borderRadius: '10px',
              marginTop: '20px'
            }}>
              <h3>Recent Matches:</h3>
              {currentUser.matchHistory && currentUser.matchHistory.length > 0 ? (
                <ul>
                  {currentUser.matchHistory.map((match: any, index: number) => (
                    <li key={index}>
                      vs {match.opponent} - {match.result} ({match.mode})
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No matches played yet. Start your first game!</p>
              )}
            </div>
          </div>
        ) : <AuthPage onAuthSuccess={handleAuthSuccess} />
      default:
        return <HomePage currentUser={currentUser} onNavigate={handleNavigate} />
    }
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
      <Navbar 
        currentUser={currentUser} 
        currentPage={currentPage}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
      />
      
      {/* API Status Indicator */}
      <div style={{ 
        position: 'fixed', 
        bottom: '20px', 
        right: '20px', 
        padding: '10px 15px',
        backgroundColor: apiStatus.includes('✅') ? '#d4edda' : '#f8d7da',
        border: `1px solid ${apiStatus.includes('✅') ? '#c3e6cb' : '#f5c6cb'}`,
        borderRadius: '5px',
        fontSize: '0.9em',
        zIndex: 1000
      }}>
        {apiStatus}
      </div>

      {renderCurrentPage()}
    </div>
  )
}

export default App
