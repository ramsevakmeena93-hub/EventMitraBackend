import { createContext, useContext, useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import { useAuth } from './AuthContext'
import toast from 'react-hot-toast'

const SocketContext = createContext()

export const useSocket = () => {
  const context = useContext(SocketContext)
  if (!context) throw new Error('useSocket must be used within SocketProvider')
  return context
}

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null)
  const { user } = useAuth()

  useEffect(() => {
    if (user) {
      const newSocket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000')
      
      newSocket.on('connect', () => {
        console.log('Socket connected')
        newSocket.emit('join', user.id)
      })

      newSocket.on('notification', (data) => {
        toast(data.message, {
          icon: data.type === 'event_rejected' ? '❌' : '🔔',
          duration: 5000
        })
      })

      newSocket.on('eventUpdate', (data) => {
        // Trigger re-fetch in components
        window.dispatchEvent(new CustomEvent('eventUpdate', { detail: data }))
      })

      setSocket(newSocket)

      return () => {
        newSocket.close()
      }
    }
  }, [user])

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  )
}
