import { useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'

const GoogleCallback = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { fetchUser } = useAuth()
  const handled = useRef(false)

  useEffect(() => {
    if (handled.current) return
    handled.current = true

    const handleCallback = async () => {
      const token = searchParams.get('token')

      if (token) {
        try {
          localStorage.setItem('token', token)
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
          // fetchUser updates AuthContext.user — triggers EmailSetupContext check
          await fetchUser()
          toast.success('Signed in with Google successfully!')
          navigate('/dashboard')
        } catch (error) {
          console.error('Google auth error:', error)
          toast.error('Failed to sign in with Google')
          navigate('/login')
        }
      } else {
        toast.error('Authentication failed')
        navigate('/login')
      }
    }

    handleCallback()
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600 dark:text-gray-400">Signing you in with Google...</p>
      </div>
    </div>
  )
}

export default GoogleCallback
