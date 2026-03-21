import { useState, useEffect } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import EventCard from '../EventCard'
import BookingTracker from '../BookingTracker'
import HistorySection from '../HistorySection'
import { Clock, CheckCircle, FileText, Edit, Plus, MessageSquare, Calendar, MapPin, History } from 'lucide-react'
import { useEmailSetup } from '../../context/EmailSetupContext'

const ABCDashboard = () => {
  const [pendingEvents, setPendingEvents] = useState([])
  const [allEvents, setAllEvents] = useState([])
  const [stats, setStats] = useState({})
  const [superAdmins, setSuperAdmins] = useState([])
  const [venues, setVenues] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [forwardingEvent, setForwardingEvent] = useState(null)
  const [editingEvent, setEditingEvent] = useState(null)
  const [selectedSuperAdmins, setSelectedSuperAdmins] = useState([])
  const [showSADropdown, setShowSADropdown] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [activeTab, setActiveTab] = useState('pending')
  const [createVenueId, setCreateVenueId] = useState('')
  const [hods, setHods] = useState([])
  const { requireEmailSetup } = useEmailSetup()

  useEffect(() => {
    fetchData()
    fetchSuperAdmins()
    fetchVenues()
    fetchHods()
    window.addEventListener('eventUpdate', fetchData)
    return () => window.removeEventListener('eventUpdate', fetchData)
  }, [])

  const fetchData = async () => {
    try {
      const [pendingRes, allRes, statsRes] = await Promise.allSettled([
        axios.get('/api/events/pending'),
        axios.get('/api/events/all'),
        axios.get('/api/dashboard/stats')
      ])
      if (pendingRes.status === 'fulfilled') setPendingEvents(pendingRes.value.data)
      else console.error('[ABC] pending fetch failed:', pendingRes.reason?.response?.data || pendingRes.reason?.message)
      if (allRes.status === 'fulfilled') setAllEvents(allRes.value.data)
      else console.error('[ABC] all events fetch failed:', allRes.reason?.response?.data || allRes.reason?.message)
      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data)
      else console.error('[ABC] stats fetch failed:', statsRes.reason?.response?.data || statsRes.reason?.message)
    } catch (error) {
      console.error('[ABC] fetchData error:', error)
      toast.error('Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }

  const fetchSuperAdmins = async () => {
    try {
      const { data } = await axios.get('/api/users/superadmins')
      setSuperAdmins(data)
    } catch (error) {
      console.error('Failed to fetch super admins')
    }
  }

  const fetchVenues = async () => {
    try {
      const { data } = await axios.get('/api/venues')
      setVenues(data)
      console.log('[ABCDashboard] Venues loaded:', data.length)
    } catch (error) {
      console.error('Failed to fetch venues:', error.response?.data || error.message)
      toast.error('Failed to load venues')
    }
  }

  const fetchHods = async () => {
    try {
      const { data } = await axios.get('/api/users/hods')
      setHods(data)
    } catch (error) {
      // non-critical, silently fail
      console.error('Failed to fetch HODs:', error.message)
    }
  }

  const handleEdit = (event) => {
    setEditingEvent({
      ...event,
      newDate: new Date(event.date).toISOString().split('T')[0],
      newStartTime: event.startTime || '',
      newEndTime: event.endTime || '',
      newVenueId: event.venueId?._id || ''
    })
  }

  const submitEdit = async (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    const updates = {
      date: formData.get('date'),
      startTime: formData.get('startTime'),
      endTime: formData.get('endTime'),
      venueId: formData.get('venueId'),
      comment: formData.get('comment')
    }
    requireEmailSetup(async () => {
      setActionLoading(true)
      try {
        await axios.post(`/api/events/${editingEvent._id}/abc-modify`, updates)
        toast.success('Event time/venue updated!')
        setEditingEvent(null)
        fetchData()
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to update event')
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
      } finally {
        setActionLoading(false)
      }
    })
  }

  const handleForward = (event) => {
    setForwardingEvent({ ...event })
    setSelectedSuperAdmins([])
    setShowSADropdown(false)
  }

  const toggleSuperAdmin = (id) => {
    setSelectedSuperAdmins(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const submitForward = async (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    const comment = formData.get('comment')
    const giveFinalApproval = formData.get('giveFinalApproval') === 'on'

    if (!giveFinalApproval && selectedSuperAdmins.length === 0) {
      toast.error('Please either check "Give Final Approval" or select at least one Super Admin')
      return
    }

    requireEmailSetup(async () => {
      setActionLoading(true)
      try {
        await axios.post(`/api/events/${forwardingEvent._id}/approve`, {
          superAdminIds: selectedSuperAdmins.length > 0 ? selectedSuperAdmins : undefined,
          comment: comment || undefined,
          abcFinalApproval: giveFinalApproval
        })
        if (giveFinalApproval) {
          toast.success('Event finally approved by ABC! Ready for key collection.')
        } else {
          toast.success(`Event forwarded to ${selectedSuperAdmins.length} Super Admin(s)!`)
        }
        setForwardingEvent(null)
        setSelectedSuperAdmins([])
        fetchData()
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to process event')
      } finally {
        setActionLoading(false)
      }
    })
  }

  const handleCreateEvent = async (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    
    const eventData = {
      venueId: createVenueId || formData.get('venueId'),
      date: formData.get('date'),
      startTime: formData.get('startTime'),
      endTime: formData.get('endTime'),
      reason: formData.get('reason'),
      clubName: formData.get('clubName') || undefined
    }

    // Frontend validation before sending
    if (!eventData.venueId) return toast.error('Please select a venue')
    if (!eventData.date) return toast.error('Please select a date')
    if (!eventData.startTime) return toast.error('Please select start time')
    if (!eventData.endTime) return toast.error('Please select end time')
    if (!eventData.reason?.trim()) return toast.error('Please enter a reason')
    if (eventData.startTime >= eventData.endTime) return toast.error('End time must be after start time')

    setActionLoading(true)
    console.log('[ABC Create] Sending:', eventData)
    try {
      const res = await axios.post('/api/events/abc-create', eventData)
      toast.success(`Event created! ${res.data.workflow || ''}`)
      setShowCreateForm(false)
      setCreateVenueId('')
      fetchData()
    } catch (error) {
      const msg = error.response?.data?.message || error.message || 'Failed to create event'
      console.error('[ABC Create] Error:', error.response?.data || error.message)
      toast.error(msg)
    } finally {
      setActionLoading(false)
    }
  }

  const actionButtons = [
    {
      label: 'Edit Time/Venue',
      action: 'edit',
      className: 'bg-blue-600 text-white hover:bg-blue-700'
    },
    {
      label: 'Forward',
      action: 'forward',
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
      className: 'bg-indigo-600 text-white hover:bg-indigo-700'
    }
  ]

  const handleAction = (action, event) => {
    if (action === 'edit') {
      handleEdit(event)
    } else if (action === 'forward') {
      handleForward(event)
    } else if (action === 'reject') {
      handleReject(event)
    } else if (action === 'view') {
      setSelectedEvent(event)
    }
  }

  // Generate time slots
  const generateTimeSlots = () => {
    const slots = []
    for (let hour = 8; hour <= 18; hour++) {
      const period = hour >= 12 ? 'PM' : 'AM'
      const displayHour = hour > 12 ? hour - 12 : hour
      slots.push({
        value: `${hour.toString().padStart(2, '0')}:00`,
        label: `${displayHour}:00 ${period}`
      })
      if (hour < 18) {
        slots.push({
          value: `${hour.toString().padStart(2, '0')}:30`,
          label: `${displayHour}:30 ${period}`
        })
      }
    }
    return slots
  }

  const timeSlots = generateTimeSlots()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Student Dean Welfare Dashboard
        </h1>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg"
        >
          <Plus className="w-5 h-5" />
          Create Event
        </button>
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
              <p className="text-sm text-gray-600 dark:text-gray-400">Modifications</p>
              <p className="text-2xl font-bold text-purple-600">{stats.pendingModifications || 0}</p>
            </div>
            <Edit className="w-10 h-10 text-purple-600" />
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

      {/* Create Event Form */}
      {showCreateForm && (
        <div className="mb-8 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-800 dark:to-gray-700 p-6 rounded-xl shadow-lg border-2 border-purple-200 dark:border-purple-800">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Plus className="w-6 h-6 text-purple-600" />
            Create New Event (ABC Admin)
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            HOD will be auto-assigned based on the selected venue. No student or faculty selection needed.
          </p>
          <form onSubmit={handleCreateEvent} className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                <MapPin className="w-4 h-4 inline mr-1" />
                Select Venue
              </label>
              <select
                name="venueId"
                required
                value={createVenueId}
                onChange={e => setCreateVenueId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              >
                <option value="">Choose venue</option>
                {venues.map(venue => (
                  <option key={venue._id} value={venue._id}>
                    {venue.name || `${venue.building || ""} ${venue.room || ""}`.trim() || "Unnamed Venue"}
                  </option>
                ))}
              </select>

              {/* HOD auto-assign preview */}
              {createVenueId && (() => {
                const v = venues.find(x => x._id === createVenueId)
                if (!v) return null
                const isSeminar = v.name && /seminar hall/i.test(v.name)
                const matchedHod = hods.find(h =>
                  h.department && v.hodDepartment &&
                  h.department.toLowerCase().trim() === v.hodDepartment.toLowerCase().trim()
                ) || (isSeminar ? hods[0] : null)

                return (
                  <div className={`mt-2 p-3 rounded-lg text-sm flex items-start gap-2 ${matchedHod ? 'bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-700' : 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700'}`}>
                    <span className="text-lg">{matchedHod ? '✅' : '⚠️'}</span>
                    <div>
                      {matchedHod ? (
                        <>
                          <p className="font-semibold text-green-700 dark:text-green-400">HOD Auto-Assigned</p>
                          <p className="text-green-600 dark:text-green-300">{matchedHod.name} <span className="text-xs opacity-75">({matchedHod.department})</span></p>
                          <p className="text-xs text-green-500 dark:text-green-400 mt-0.5">Event will go to HOD first, then back to ABC</p>
                        </>
                      ) : (
                        <>
                          <p className="font-semibold text-yellow-700 dark:text-yellow-400">No HOD Found</p>
                          <p className="text-xs text-yellow-600 dark:text-yellow-300">Event will go directly to ABC for approval</p>
                        </>
                      )}
                    </div>
                  </div>
                )
              })()}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Club / Organization Name (Optional)
              </label>
              <input
                type="text"
                name="clubName"
                placeholder="e.g. Tech Club, Cultural Committee"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                <Calendar className="w-4 h-4 inline mr-1" />
                Date
              </label>
              <input
                type="date"
                name="date"
                required
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Start Time
              </label>
              <select
                name="startTime"
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              >
                <option value="">Select start time</option>
                {timeSlots.map(slot => (
                  <option key={slot.value} value={slot.value}>{slot.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                End Time
              </label>
              <select
                name="endTime"
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              >
                <option value="">Select end time</option>
                {timeSlots.map(slot => (
                  <option key={slot.value} value={slot.value}>{slot.label}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Event Purpose / Reason
              </label>
              <textarea
                name="reason"
                required
                rows="3"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                placeholder="Enter purpose or reason for this event..."
              />
            </div>

            <div className="md:col-span-2 flex gap-2">
              <button
                type="submit"
                disabled={actionLoading}
                className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-2 rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50"
              >
                Create Event
              </button>
              <button
                type="button"
                onClick={() => { setShowCreateForm(false); setCreateVenueId('') }}
                className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Time/Venue Form */}
      {editingEvent && (
        <div className="mb-8 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-gray-800 dark:to-gray-700 p-6 rounded-xl shadow-lg border-2 border-blue-200 dark:border-blue-800">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Edit className="w-6 h-6 text-blue-600" />
            Edit Time &amp; Venue
          </h2>
          <form onSubmit={submitEdit} className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Venue</label>
              <select
                name="venueId"
                defaultValue={editingEvent.newVenueId}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              >
                {venues.map(venue => (
                  <option key={venue._id} value={venue._id}>
                    {venue.name || `${venue.building || ''} ${venue.room || ''}`.trim() || 'Unnamed Venue'}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
              <input type="date" name="date" defaultValue={editingEvent.newDate}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Time</label>
              <select name="startTime" defaultValue={editingEvent.newStartTime}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white">
                {timeSlots.map(slot => <option key={slot.value} value={slot.value}>{slot.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Time</label>
              <select name="endTime" defaultValue={editingEvent.newEndTime}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white">
                {timeSlots.map(slot => <option key={slot.value} value={slot.value}>{slot.label}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" /> Reason for Change (Comment)
              </label>
              <textarea name="comment" rows="3" required
                placeholder="Explain why you are changing the time/venue..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white" />
            </div>
            <div className="md:col-span-2 flex gap-2">
              <button type="submit" disabled={actionLoading}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                Save Changes
              </button>
              <button type="button" onClick={() => setEditingEvent(null)}
                className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Forward to Super Admin Form */}
      {forwardingEvent && (
        <div className="mb-8 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-gray-800 dark:to-gray-700 p-6 rounded-xl shadow-lg border-2 border-green-200 dark:border-green-800">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <CheckCircle className="w-6 h-6 text-green-600" />
            ABC Approval - Ultimate Authority
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            As ABC, you have ultimate authority. You can give final approval directly OR forward to Super Admin.
          </p>
          <form onSubmit={submitForward} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                ABC Comment (Optional)
              </label>
              <textarea
                name="comment"
                rows="3"
                placeholder="Add your comments or notes about this booking..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-300 dark:border-yellow-700 rounded-lg p-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="giveFinalApproval"
                  className="w-5 h-5 text-green-600 rounded focus:ring-2 focus:ring-green-500"
                />
                <div>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    ✓ Give Final Approval (ABC Authority)
                  </span>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Check this to approve directly. Event will be ready for key collection. No Super Admin needed.
                  </p>
                </div>
              </label>
            </div>

            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                OR Select Super Admins to Forward
              </label>
              <button
                type="button"
                onClick={() => setShowSADropdown(v => !v)}
                className="w-full px-3 py-2 border-2 border-green-300 dark:border-green-600 rounded-lg dark:bg-gray-700 dark:text-white text-left flex justify-between items-center"
              >
                <span className="text-sm">
                  {selectedSuperAdmins.length === 0
                    ? 'Click to select Super Admin(s)...'
                    : `${selectedSuperAdmins.length} selected: ${superAdmins.filter(a => selectedSuperAdmins.includes(a._id)).map(a => a.name).join(', ')}`}
                </span>
                <span className="text-gray-400">{showSADropdown ? '▲' : '▼'}</span>
              </button>
              {showSADropdown && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border-2 border-green-300 dark:border-green-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {superAdmins.length === 0 ? (
                    <p className="px-3 py-2 text-sm text-gray-500">No Super Admins found</p>
                  ) : superAdmins.map(admin => (
                    <label key={admin._id} className="flex items-center gap-3 px-3 py-2 hover:bg-green-50 dark:hover:bg-green-900/20 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedSuperAdmins.includes(admin._id)}
                        onChange={() => toggleSuperAdmin(admin._id)}
                        className="w-4 h-4 text-green-600 rounded"
                      />
                      <span className="text-sm text-gray-800 dark:text-gray-200">
                        {admin.name} <span className="text-xs text-gray-500">({admin.email})</span>
                      </span>
                    </label>
                  ))}
                </div>
              )}
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Leave empty if giving final approval yourself.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={actionLoading}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
              >
                <CheckCircle className="w-5 h-5" />
                Approve & Process
              </button>
              <button
                type="button"
                onClick={() => setForwardingEvent(null)}
                className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

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
            <p className="text-gray-600 dark:text-gray-400 col-span-2 py-8 text-center">No pending approvals</p>
          ) : (
            pendingEvents.map((event) => (
              <EventCard
                key={event._id}
                event={event}
                showActions={!actionLoading}
                actionButtons={actionButtons}
                onAction={handleAction}
              />
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
              <EventCard
                key={event._id}
                event={event}
                showActions={true}
                actionButtons={[{ label: 'Track Status', action: 'view', className: 'bg-blue-600 text-white hover:bg-blue-700' }]}
                onAction={handleAction}
              />
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
        <HistorySection events={allEvents} role="abc" />
      )}
    </div>
  )
}

export default ABCDashboard
