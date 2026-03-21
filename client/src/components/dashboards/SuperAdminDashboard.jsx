import { useState, useEffect } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import EventCard from '../EventCard'
import BookingTracker from '../BookingTracker'
import HistorySection from '../HistorySection'
import { Clock, CheckCircle, FileText, XCircle, History } from 'lucide-react'
import { useEmailSetup } from '../../context/EmailSetupContext'

const SuperAdminDashboard = () => {
  const [pendingEvents, setPendingEvents] = useState([])
  const [allEvents, setAllEvents] = useState([])
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [activeTab, setActiveTab] = useState('pending')
  const { requireEmailSetup } = useEmailSetup()

  useEffect(() => {
    fetchData()
    window.addEventListener('eventUpdate', fetchData)
    return () => window.removeEventListener('eventUpdate', fetchData)
  }, [])

  const fetchData = async () => {
    try {
      const [pendingRes, allRes, statsRes] = await Promise.allSettled([
        axios.get('/api/events/pending'),
        axios.get('/api/events/my-events'),
        axios.get('/api/dashboard/stats')
      ])
      if (pendingRes.status === 'fulfilled') setPendingEvents(pendingRes.value.data)
      else console.error('[SuperAdmin] pending failed:', pendingRes.reason?.message)
      if (allRes.status === 'fulfilled') setAllEvents(allRes.value.data)
      else console.error('[SuperAdmin] my-events failed:', allRes.reason?.message)
      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data)
      else console.error('[SuperAdmin] stats failed:', statsRes.reason?.message)
    } catch (error) {
      toast.error('Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (event) => {
    requireEmailSetup(async () => {
      setActionLoading(true)
      try {
        await axios.post(`/api/events/${event._id}/approve`)
        toast.success('Event finally approved! Student can now collect key.')
        fetchData()
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to approve event')
        console.error('Approve error:', error)
      } finally {
        setActionLoading(false)
      }
    })
  }

  const handleReject = async (event) => {
    const reason = prompt('Please provide a reason for rejection:')
    if (!reason) return
    requireEmailSetup(async () => {
      setActionLoading(true)
      try {
        await axios.post(`/api/events/${event._id}/reject`, { reason })
        toast.success('Event rejected')
        fetchData()
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to reject event')
        console.error('Reject error:', error)
      } finally {
        setActionLoading(false)
      }
    })
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
          Super Admin Dashboard - Final Approval
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Final authority for event approvals
        </p>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-6 mb-8">
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
              <p className="text-sm text-gray-600 dark:text-gray-400">Rejected</p>
              <p className="text-2xl font-bold text-red-600">{stats.rejected || 0}</p>
            </div>
            <XCircle className="w-10 h-10 text-red-600" />
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
        ].map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px ${activeTab === key ? 'border-purple-600 text-purple-600 dark:text-purple-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {activeTab === 'pending' && (
        <div className="grid md:grid-cols-2 gap-4">
          {pendingEvents.length === 0 ? (
            <div className="col-span-2 bg-white dark:bg-gray-800 p-8 rounded-lg shadow text-center">
              <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400 text-lg">No pending approvals</p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">Events forwarded by ABC will appear here</p>
            </div>
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
              <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow text-center">
                <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400 text-lg">No events yet</p>
              </div>
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
        <HistorySection events={allEvents} role="superadmin" />
      )}
    </div>
  )
}

export default SuperAdminDashboard
