import { useState, useEffect } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { Key, CheckCircle, Clock, Package, User, Calendar, MapPin, FileText, TrendingUp, X } from 'lucide-react'
import BookingTracker from '../BookingTracker'
import { useEmailSetup } from '../../context/EmailSetupContext'

const RegistrarDashboard = () => {
  const [pendingKeys, setPendingKeys] = useState([])
  const [collectedKeys, setCollectedKeys] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [showTracker, setShowTracker] = useState(false)
  const { requireEmailSetup } = useEmailSetup()

  useEffect(() => {
    fetchData()
    window.addEventListener('eventUpdate', fetchData)
    return () => window.removeEventListener('eventUpdate', fetchData)
  }, [])

  const fetchData = async () => {
    try {
      const [pendingRes, collectedRes] = await Promise.all([
        axios.get('/api/events/keys/pending'),
        axios.get('/api/events/keys/collected')
      ])
      setPendingKeys(pendingRes.data)
      setCollectedKeys(collectedRes.data)
    } catch (error) {
      toast.error('Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyCollected = async (event) => {
    if (!confirm('Mark this key as collected?')) return
    requireEmailSetup(async () => {
      setActionLoading(true)
      try {
        await axios.post(`/api/events/${event._id}/key-collected`, {})
        toast.success('Key marked as collected!')
        fetchData()
      } catch (error) {
        console.error('[key-collected] Error:', error)
        toast.error(error.response?.data?.message || 'Failed to mark key as collected')
      } finally {
        setActionLoading(false)
      }
    })
  }

  const handleKeyReturned = async (event) => {
    if (!confirm('Mark this key as returned?')) return
    requireEmailSetup(async () => {
      setActionLoading(true)
      try {
        await axios.post(`/api/events/${event._id}/key-returned`, {})
        toast.success('Key marked as returned!')
        fetchData()
      } catch (error) {
        console.error('[key-returned] Error:', error)
        toast.error(error.response?.data?.message || 'Failed to mark key as returned')
      } finally {
        setActionLoading(false)
      }
    })
  }

  const handleMarkCompleted = async (event) => {
    if (!confirm(`Mark event as completed? This will notify ${event.studentId?.name} to submit feedback.`)) return
    requireEmailSetup(async () => {
      setActionLoading(true)
      try {
        await axios.post(`/api/events/${event._id}/mark-completed`)
        toast.success('Event marked as completed! Faculty will be notified to submit feedback.')
        fetchData()
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to mark event as completed')
      } finally {
        setActionLoading(false)
      }
    })
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
      {/* Booking Tracker Modal */}
      {showTracker && selectedEvent && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto relative">
            <button
              onClick={() => {
                setShowTracker(false)
                setSelectedEvent(null)
              }}
              className="sticky top-4 right-4 float-right bg-red-500 hover:bg-red-600 text-white rounded-full p-2 shadow-lg transition-colors z-10"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="p-6">
              <BookingTracker event={selectedEvent} />
            </div>
          </div>
        </div>
      )}

      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 flex items-center gap-3">
        <Key className="w-10 h-10 text-yellow-600" />
        Registrar Dashboard - Key Management
      </h1>

      {/* Stats */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Pending Collection</p>
              <p className="text-2xl font-bold text-yellow-600">{pendingKeys.length}</p>
            </div>
            <Clock className="w-10 h-10 text-yellow-600" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Keys Out</p>
              <p className="text-2xl font-bold text-blue-600">{collectedKeys.length}</p>
            </div>
            <Package className="w-10 h-10 text-blue-600" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Today</p>
              <p className="text-2xl font-bold text-green-600">{pendingKeys.length + collectedKeys.length}</p>
            </div>
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
        </div>
      </div>

      {/* Pending Key Collection */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Clock className="w-6 h-6 text-yellow-600" />
          Pending Key Collection
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          {pendingKeys.length === 0 ? (
            <p className="text-gray-600 dark:text-gray-400">No keys pending collection</p>
          ) : (
            pendingKeys.map((event) => (
              <div
                key={event._id}
                className="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-gray-800 dark:to-gray-700 rounded-lg p-6 shadow-md border-2 border-yellow-200 dark:border-yellow-800"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-2">
                    <Key className="w-6 h-6 text-yellow-600" />
                    <span className="px-3 py-1 bg-yellow-500 text-white rounded-full text-xs font-bold">
                      PENDING COLLECTION
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                    <User className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="font-bold">{event.studentId?.name}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {event.studentId?.enrollmentNo} - {event.studentId?.branch}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                    <MapPin className="w-5 h-5 text-purple-600" />
                    <span className="font-semibold">
                      {event.venueId?.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                    <Calendar className="w-5 h-5 text-green-600" />
                    <span>{new Date(event.date).toLocaleDateString()} • {event.time}</span>
                  </div>

                  {event.reason && (
                    <div className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                      <FileText className="w-5 h-5 text-gray-600 mt-0.5" />
                      <p className="text-sm italic">{event.reason}</p>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => handleKeyCollected(event)}
                  disabled={actionLoading}
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 px-4 rounded-lg hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 font-semibold flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-5 h-5" />
                  Mark as Collected
                </button>
                
                <button
                  onClick={() => {
                    setSelectedEvent(event)
                    setShowTracker(true)
                  }}
                  className="w-full mt-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white py-2 px-4 rounded-lg hover:from-purple-700 hover:to-pink-700 font-semibold flex items-center justify-center gap-2"
                >
                  <TrendingUp className="w-5 h-5" />
                  Track Status
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Collected Keys (Pending Return) */}
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Package className="w-6 h-6 text-blue-600" />
          Keys Out (Pending Return)
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          {collectedKeys.length === 0 ? (
            <p className="text-gray-600 dark:text-gray-400">No keys currently out</p>
          ) : (
            collectedKeys.map((event) => (
              <div
                key={event._id}
                className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-gray-800 dark:to-gray-700 rounded-lg p-6 shadow-md border-2 border-blue-200 dark:border-blue-800"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-2">
                    <Package className="w-6 h-6 text-blue-600" />
                    <span className="px-3 py-1 bg-blue-500 text-white rounded-full text-xs font-bold">
                      KEY OUT
                    </span>
                  </div>
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    Collected: {new Date(event.keyCollectedAt).toLocaleString()}
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                    <User className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="font-bold">{event.studentId?.name}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {event.studentId?.enrollmentNo} - {event.studentId?.branch}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                    <MapPin className="w-5 h-5 text-purple-600" />
                    <span className="font-semibold">
                      {event.venueId?.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                    <Calendar className="w-5 h-5 text-green-600" />
                    <span>{new Date(event.date).toLocaleDateString()} • {event.time}</span>
                  </div>

                  {event.keyNotes && (
                    <div className="bg-white/50 dark:bg-gray-900/50 rounded p-2">
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        <strong>Notes:</strong> {event.keyNotes}
                      </p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 mt-4">
                  <button
                    onClick={() => handleKeyReturned(event)}
                    disabled={actionLoading}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 px-4 rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 font-semibold flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-5 h-5" />
                    Key Returned
                  </button>
                  <button
                    onClick={() => handleMarkCompleted(event)}
                    disabled={actionLoading}
                    className="bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 px-4 rounded-lg hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 font-semibold flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-5 h-5" />
                    Mark Completed
                  </button>
                </div>
                
                <button
                  onClick={() => {
                    setSelectedEvent(event)
                    setShowTracker(true)
                  }}
                  className="w-full mt-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-2 px-4 rounded-lg hover:from-blue-700 hover:to-cyan-700 font-semibold flex items-center justify-center gap-2"
                >
                  <TrendingUp className="w-5 h-5" />
                  Track Status
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default RegistrarDashboard
