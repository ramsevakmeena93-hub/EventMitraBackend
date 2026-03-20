import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const Login = () => {
  const { loginWithGoogle } = useAuth()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="w-full max-w-sm">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg px-8 py-10 space-y-6">
          {/* Logo */}
          <div className="flex flex-col items-center space-y-2">
            <div className="w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center">
              <img
                src="https://iums.mitsgwalior.in/images/mits-logo.png"
                alt="MITS Logo"
                className="w-10 h-10 object-contain"
                onError={(e) => { e.target.style.display = 'none' }}
              />
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">EventMitra</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">MITS Gwalior</p>
          </div>

          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Welcome Back</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Sign in to access your dashboard</p>
          </div>

          {/* Google Button Only */}
          <button
            onClick={loginWithGoogle}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          <p className="text-center text-xs text-gray-400 dark:text-gray-500">
            Use your institutional MITS email to sign in.<br/>
            Only authorized college emails are allowed.
          </p>
        </div>

        <div className="mt-6 text-center">
          <Link to="/" className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex items-center justify-center gap-1">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}

export default Login
