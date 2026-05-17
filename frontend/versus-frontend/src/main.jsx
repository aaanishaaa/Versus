import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { io } from 'socket.io-client'
import './index.css'
import App from './App.jsx'

// Create global socket instance for use across app
export let socket = null

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000'

export const initSocket = (token) => {
  if (socket?.connected) {
    return socket
  }
  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
  })
  return socket
}

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
)
