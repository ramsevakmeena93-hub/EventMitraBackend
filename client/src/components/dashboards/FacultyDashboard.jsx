import { useState, useEffect } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import EventCard from '../EventCard'
import BookingTracker from '../BookingTracker'
import HistorySection from '../HistorySection'
import { Clock, CheckCircle, FileText, Eye, History, Mail, Shield, Trash2 } from 'lucide-react'

const FacultyDashboard = () => {
  const [pendingEvents, setPendingEvents] = useState([])
  const [allEvents, setAllEvents] = useState([])
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [activeTab, setActiveTab] = useState('pending')

  // Email settings state
  const [hasEmailSetup, setHasEmailSetup] = useState(false)
  const [gmailPassword, setGmailPassword] = useState('')
  const [savingEmail, setSavingEmail] = useState(false)

  useEffect(() => {
    fetchData()
    fetchEmailStatus()
    window.addEventListener('eventUpdate', fetchData)
    return () => window.removeEventListener('eventUpdate', fetchData)
  }, [])

  const fetchEmailStatus = async () => {
    try {
      const { data } = await axios.get('/api/users/email-status')
      setHasEmailSetup(data.hasEmailSetup)
    } catch (e) {}
  }

  const handleSaveGmailPassword = async () => {
    if (!gmailPassword.trim()) return toast.error('Please enter your Gmail App Password')
    setSavingEmail(true)
    try {
      const { data } = await axios.post('/api/users/save-gmail-password', { gmailAppPassword: gmailPassword })
      toast.success(data.message)
      setHasEmailSetup(true)
      setGmailPassword('')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save. Check your App Password.')
    } finally {
      setSavingEmail(false)
    }
  }

  const handleRemoveGmailPassword = async () => {
    if (!confirm('Remove your Gmail App Password? Emails will stop sending from your account.')) return
    try {
      await axios.delete('/api/users/gmail-password')
      toast.success('Gmail App Password removed')
      setHasEmailSetup(false)
    } catch (e) {
      toast.error('Failed to remove')
    }
  }

  const fetchData = async () => {
    try {
      const [pendingRes, allRes, statsRes] = await Promise.allSettled([
        axios.get('/api/events/pending'),
        axios.get('/api/events/my-events'),
        axios.get('/api/dashboard/stats')
      ])
      if (pendingRes.status === 'fulfilled') setPendingEvents(pendingRes.value.data)
      else console.error('[Faculty] pending failed:', pendingRes.reason?.message)
      if (allRes.status === 'fulfilled') setAllEvents(allRes.value.data)
      else console.error('[Faculty] my-events failed:', allRes.reason?.message)
      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data)
      else console.error('[Faculty] stats failed:', statsRes.reason?.message)
    } catch (error) {
      toast.error('Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (event) => {
    setActionLoading(true)
    try {
      await axios.post(`/api/events/${event._id}/approve`)
      toast.success('Event approved successfully!')
      fetchData()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to approve event')
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async (event) => {
    const reason = prompt('Please provide a reason for rejection:')
    if (!reason) return

    setActionLoading(true)
    try {
      await axios.post(`/api/events/${event._id}/reject`, { reason })
      toast.success('Event rejected')
      fetchData()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reject event')
    } finally {
      setActionLoading(false)
    }
  }

  const actionButtons = [
    {
      label: 'Approve',
      action: 'approve',
      className: 'bg-green-600 text-white hover:bg-green-700'
    },
    {
      label: 'Reject',
      action: 'reject',
      className: 'bg-red-600 text-white hover:bg-red-700'
    },
    {
      label: 'Track Status',
      action: 'view',
      className: 'bg-blue-600 text-white hover:bg-blue-700'
    }
  ]

  const handleAction = (action, event) => {
    if (action === 'approve') {
      handleApprove(event)
    } else if (action === 'reject') {
      handleReject(event)
    } else if (action === 'view') {
      setSelectedEvent(event)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Faculty Dashboard
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Review and approve event requests
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Pending Approvals</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.pendingApprovals || 0}</p>
            </div>
            <Clock className="w-10 h-10 text-yellow-600" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Approved</p>
              <p className="text-2xl font-bold text-green-600">{stats.approved || 0}</p>
            </div>
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Events</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalEvents || 0}</p>
            </div>
            <FileText className="w-10 h-10 text-blue-600" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-700">
        {[
          { key: 'pending', label: `Pending (${pendingEvents.length})`, icon: Clock },
          { key: 'all', label: `All Events (${allEvents.length})`, icon: FileText },
          { key: 'history', label: 'My History', icon: History },
          { key: 'email', label: 'Email Setup', icon: Mail },
        ].map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px ${activeTab === key ? 'border-purple-600 text-purple-600 dark:text-purple-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}>
            <Icon size={15} /> {label}
            {key === 'email' && (
              <span className={`ml-1 w-2 h-2 rounded-full ${hasEmailSetup ? 'bg-green-500' : 'bg-red-400'}`} />
            )}
          </button>
        ))}
      </div>

      {activeTab === 'pending' && (
        <div className="grid md:grid-cols-2 gap-4">
          {pendingEvents.length === 0 ? (
            <p className="text-gray-600 dark:text-gray-400 col-span-2 py-8 text-center">No pending approvals</p>
          ) : (
            pendingEvents.map((event) => (
              <EventCard key={event._id} event={event} showActions={!actionLoading} actionButtons={actionButtons} onAction={handleAction} />
            ))
          )}
        </div>
      )}

      {activeTab === 'all' && (
        <div className="grid lg:grid-cols-2 gap-8">
          <div className="space-y-4">
            {allEvents.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 py-8 text-center">No events found</p>
            ) : allEvents.map((event) => (
              <EventCard key={event._id} event={event} showActions={true}
                actionButtons={[{ label: 'Track Status', action: 'view', className: 'bg-blue-600 text-white hover:bg-blue-700' }]}
                onAction={handleAction} />
            ))}
          </div>
          {selectedEvent && (
            <div className="sticky top-8">
              <div className="mb-4 flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Event Tracker</h2>
                <button onClick={() => setSelectedEvent(null)} className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-300 dark:hover:bg-gray-600">Close</button>
              </div>
              <BookingTracker event={selectedEvent} />
            </div>
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <HistorySection events={allEvents} role="faculty" />
      )}

      {activeTab === 'email' && (
        <div className="max-w-xl">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 space-y-5">
            <div className="flex items-center gap-3">
              <Mail className="w-6 h-6 text-purple-600" />
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Gmail Email Setup</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Emails will be sent from your Gmail when you submit events</p>
              </div>
            </div>

            {hasEmailSetup ? (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                    <Shield size={18} />
                    <span className="font-medium">Gmail App Password is set</span>
                  </div>
                  <button onClick={handleRemoveGmailPassword}
                    className="flex items-center gap-1 text-sm text-red-600 hover:text-red-700 dark:text-red-400">
                    <Trash2 size={14} /> Remove
                  </button>
                </div>
                <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                  When you submit an event, the approval email will be sent from your Gmail account.
                </p>
              </div>
            ) : (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
                <p className="text-sm text-yellow-800 dark:text-yellow-300">
                  No Gmail App Password set. Emails will not be sent until you set this up.
                </p>
              </div>
            )}

            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Gmail App Password (16 characters)
              </label>
              <input
                type="password"
                value={gmailPassword}
                onChange={e => setGmailPassword(e.target.value)}
                placeholder="xxxx xxxx xxxx xxxx"
                className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
              />
              <button
                onClick={handleSaveGmailPassword}
                disabled={savingEmail}
                className="w-full bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 disabled:opacity-50 font-medium transition-all"
              >
                {savingEmail ? 'Verifying & Saving...' : 'Save Gmail App Password'}
              </button>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4 text-sm text-blue-800 dark:text-blue-300 space-y-1">
              <p className="font-medium">How to get Gmail App Password:</p>
              <ol className="list-decimal list-inside space-y-1 text-xs">
                <li>Go to myaccount.google.com</li>
                <li>Security → 2-Step Verification → Turn ON</li>
                <li>Security → App passwords</li>
                <li>Select "Mail" → "Other" → type "EventMitra" → Generate</li>
                <li>Copy the 16-character password and paste above</li>
              </ol>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default FacultyDashboard
