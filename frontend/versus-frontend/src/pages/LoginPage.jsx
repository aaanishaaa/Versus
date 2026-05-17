import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { login } from '../services/api.js'
import { setToken } from '../services/auth.js'

function LoginPage() {
  const [email, setEmail] = useState('player1@vs.com')
  const [password, setPassword] = useState('demo1234')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await login(email, password)
      setToken(response.token)
      navigate('/dashboard', { replace: true })
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <h1>Versus Login</h1>
        <p>Welcome back. Sign in to continue your climb.</p>

        <form onSubmit={handleSubmit} className="auth-form">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />

          {error ? <p className="auth-error">{error}</p> : null}

          <button type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Login'}
          </button>
        </form>

        <p>
          New to Versus? <Link to="/register">Create account</Link>
        </p>
      </section>
    </main>
  )
}

export default LoginPage
