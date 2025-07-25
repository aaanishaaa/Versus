import { useState, useEffect } from 'react'
import { RegisterForm, LoginForm } from './AuthForms'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

function App() {
  const [count, setCount] = useState(0)
  const [apiStatus, setApiStatus] = useState<string>('Testing...')
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login')

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
  }, [])

  const handleAuthSuccess = (data: any) => {
    setCurrentUser(data.user || data)
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    setCurrentUser(null)
    alert('Logged out successfully!')
  }

  const testProfileAPI = async () => {
    const token = localStorage.getItem('token')
    if (!token) {
      alert('Please login first!')
      return
    }

    try {
      const response = await fetch('/api/auth/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
      
      const data = await response.json()
      
      if (response.ok) {
        alert(`Profile data: ${JSON.stringify(data, null, 2)}`)
      } else {
        alert(`Error: ${data.msg}`)
      }
    } catch (error) {
      alert('Network error while fetching profile')
    }
  }

  return (
    <>
      <div className="card">
        {currentUser && (
          <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#d4edda', border: '1px solid #c3e6cb', borderRadius: '5px' }}>
            <h3>Welcome, {currentUser.username}!</h3>
            <p>Email: {currentUser.email}</p>
            <p>Rating: {currentUser.rating}</p>
            <button 
              onClick={testProfileAPI}
              style={{ marginRight: '10px', padding: '5px 10px', backgroundColor: '#17a2b8', color: 'white', border: 'none', borderRadius: '3px' }}
            >
              Test Profile API
            </button>
            <button 
              onClick={handleLogout}
              style={{ padding: '5px 10px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '3px' }}
            >
              Logout
            </button>
          </div>
        )}

        {!currentUser && (
          <div style={{ marginTop: '20px' }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <button 
                onClick={() => setActiveTab('login')}
                style={{ 
                  marginRight: '10px', 
                  padding: '10px 20px', 
                  backgroundColor: activeTab === 'login' ? '#007bff' : '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px'
                }}
              >
                Login
              </button>
              <button 
                onClick={() => setActiveTab('register')}
                style={{ 
                  padding: '10px 20px', 
                  backgroundColor: activeTab === 'register' ? '#007bff' : '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px'
                }}
              >
                Register
              </button>
            </div>

            {activeTab === 'login' ? (
              <LoginForm onSuccess={handleAuthSuccess} />
            ) : (
              <RegisterForm onSuccess={handleAuthSuccess} />
            )}
          </div>
        )}
      </div>
      
      <p className="read-the-docs">
        Test your authentication APIs above
      </p>
    </>
  )
}

export default App
