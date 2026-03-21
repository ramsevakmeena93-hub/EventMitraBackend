import { createContext, useContext, useState, useEffect, useRef } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { Mail, X, Shield, AlertCircle } from 'lucide-react'
import { useAuth } from './AuthContext'

const EmailSetupContext = createContext()

export const useEmailSetup = () => useContext(EmailSetupContext)

const EmailSetupModal = ({ onClose, onSaved }) => {
  const { user } = useAuth()
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!password.trim()) return toast.error('Please enter your Gmail App Password')
    setSaving(true)
    try {
      await axios.post('/api/users/save-gmail-password', { gmailAppPassword: password })
      toast.success('Gmail connected! Proceeding...')
      onSaved()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Invalid App Password. Please check and try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
              <Mail className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Connect Your Gmail</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Required to send approval emails</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1">
            <X size={20} />
          </button>
        </div>

        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800 dark:text-amber-300">
            <p className="font-semibold mb-1">Why is this needed?</p>
            <p>All approval emails are sent from your own Gmail. This ensures emails come from a real person.</p>
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg px-4 py-3">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Your Gmail account</p>
          <p className="font-medium text-gray-900 dark:text-white">{user?.email}</p>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Gmail App Password <span className="text-red-500">*</span>
          </label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            placeholder="xxxx xxxx xxxx xxxx"
            autoFocus
            className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
          />
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-4 text-xs text-blue-800 dark:text-blue-300">
          <p className="font-semibold text-sm mb-2">How to get Gmail App Password:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Go to myaccount.google.com</li>
            <li>Security → 2-Step Verification → Turn ON</li>
            <li>Security → App passwords</li>
            <li>Select "Mail" → "Other" → type "EventMitra" → Generate</li>
            <li>Copy the 16-character password and paste above</li>
          </ol>
        </div>

        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-all text-sm">
            Skip for now
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 font-medium transition-all flex items-center justify-center gap-2 text-sm">
            <Shield size={15} />
            {saving ? 'Verifying...' : 'Save & Continue'}
          </button>
        </div>
      </div>
    </div>
  )
}

export const EmailSetupProvider = ({ children }) => {
  const { user } = useAuth()
  const [hasEmailSetup, setHasEmailSetup] = useState(false)
  const [showModal, setShowModal] = useState(false)
  // Use a ref so the pending action always has the latest value
  const pendingActionRef = useRef(null)

  useEffect(() => {
    if (user) {
      checkEmailStatus()
    } else {
      setHasEmailSetup(false)
      setShowModal(false)
    }
  }, [user])

  const checkEmailStatus = async () => {
    try {
      const { data } = await axios.get('/api/users/email-status')
      setHasEmailSetup(!!data.hasEmailSetup)
      // Show modal 1.5s after login if not set up
      if (!data.hasEmailSetup) {
        setTimeout(() => setShowModal(true), 1500)
      }
    } catch (e) {
      console.warn('[EmailSetup] Could not check email status:', e.message)
      // Default to false — will show popup on action
      setHasEmailSetup(false)
    }
  }

  // requireEmailSetup: call this before any action
  // If email is set up → run action immediately
  // If not → show modal, run action after setup
  const requireEmailSetup = (action) => {
    if (hasEmailSetup) {
      action()
      return
    }
    // Store action in ref so it survives re-renders
    pendingActionRef.current = action
    setShowModal(true)
  }

  const handleSaved = () => {
    setHasEmailSetup(true)
    setShowModal(false)
    // Run the pending action after a short delay
    if (pendingActionRef.current) {
      const action = pendingActionRef.current
      pendingActionRef.current = null
      setTimeout(() => action(), 300)
    }
  }

  const handleClose = () => {
    setShowModal(false)
    pendingActionRef.current = null
  }

  return (
    <EmailSetupContext.Provider value={{ hasEmailSetup, requireEmailSetup, showEmailSetup: () => setShowModal(true) }}>
      {children}
      {showModal && user && (
        <EmailSetupModal onClose={handleClose} onSaved={handleSaved} />
      )}
    </EmailSetupContext.Provider>
  )
}