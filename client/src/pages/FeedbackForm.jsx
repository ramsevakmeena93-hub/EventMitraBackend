import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import { FileText, Star, Users, AlertCircle, CheckCircle, Calendar, MapPin, Clock, Upload, Image, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const FeedbackForm = () => {
  const { eventId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [step, setStep] = useState('feedback') // 'feedback' | 'images'
  const [submittedEventId, setSubmittedEventId] = useState(null)
  
  // Image upload state
  const [selectedImages, setSelectedImages] = useState([])
  const [imagePreviews, setImagePreviews] = useState([])
  const [uploadingImages, setUploadingImages] = useState(false)
  
  const [formData, setFormData] = useState({
    eventSummary: '',
    successRating: 0,
    attendanceCount: '',
    challenges: '',
    suggestions: '',
    finalReport: ''
  })

  useEffect(() => {
    if (user && user.role !== 'faculty') {
      toast.error('Only faculty can submit feedback')
      navigate('/dashboard')
      return
    }
    if (eventId) fetchEvent()
    else fetchPendingEvents()
  }, [eventId, user, navigate])

  const fetchEvent = async () => {
    try {
      const { data } = await axios.get(`/api/events/${eventId}`)
      if (data.feedbackSubmitted) {
        toast.error('Feedback already submitted for this event')
        navigate('/dashboard')
        return
      }
      if (data.eventStatus !== 'completed') {
        toast.error('Feedback can only be submitted for completed events')
        navigate('/dashboard')
        return
      }
      setEvent(data)
    } catch {
      toast.error('Failed to load event details')
      navigate('/dashboard')
    } finally {
      setLoading(false)
    }
  }

  const fetchPendingEvents = async () => {
    try {
      const { data } = await axios.get('/api/feedback/pending-events')
      if (data.length === 0) {
        toast.error('No pending feedback found')
        navigate('/dashboard')
        return
      }
      setEvent(data[0])
    } catch {
      toast.error('Failed to load pending events')
      navigate('/dashboard')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (formData.successRating === 0) return toast.error('Please provide a success rating')
    if (!formData.eventSummary || !formData.finalReport) return toast.error('Event summary and final report are required')

    setSubmitting(true)
    try {
      await axios.post(`/api/feedback/${event._id}/submit`, formData)
      toast.success('Feedback submitted! Now upload event photos.')
      setSubmittedEventId(event._id)
      setStep('images')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit feedback')
    } finally {
      setSubmitting(false)
    }
  }

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files)
    const valid = files.filter(f => /\.(jpg|jpeg|png)$/i.test(f.name))
    if (valid.length !== files.length) toast.error('Only jpg, jpeg, png files allowed')
    
    const total = selectedImages.length + valid.length
    if (total > 20) return toast.error('Maximum 20 images allowed')
    
    setSelectedImages(prev => [...prev, ...valid])
    valid.forEach(file => {
      const reader = new FileReader()
      reader.onload = (ev) => setImagePreviews(prev => [...prev, ev.target.result])
      reader.readAsDataURL(file)
    })
  }

  const removeImage = (index) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index))
    setImagePreviews(prev => prev.filter((_, i) => i !== index))
  }

  const handleImageUpload = async () => {
    if (selectedImages.length < 5) return toast.error('Please select at least 5 images')
    
    setUploadingImages(true)
    try {
      const formDataImg = new FormData()
      selectedImages.forEach(img => formDataImg.append('images', img))
      await axios.post(`/api/feedback/${submittedEventId}/upload-images`, formDataImg, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      toast.success('Images uploaded successfully!')
      navigate('/dashboard')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to upload images')
    } finally {
      setUploadingImages(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading event details...</p>
        </div>
      </div>
    )
  }

  if (!event) return null

  // Image upload step
  if (step === 'images') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-green-500 via-teal-500 to-blue-500 px-8 py-6">
              <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                <Image className="w-7 h-7" />
                Upload Event Photos
              </h1>
              <p className="text-green-100 mt-1">Upload 5–20 photos from your event (jpg/jpeg/png)</p>
            </div>

            <div className="p-8 space-y-6">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-purple-300 dark:border-purple-600 rounded-xl p-10 text-center cursor-pointer hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all"
              >
                <Upload className="w-12 h-12 text-purple-400 mx-auto mb-3" />
                <p className="text-gray-600 dark:text-gray-400 font-medium">Click to select images</p>
                <p className="text-sm text-gray-400 mt-1">JPG, JPEG, PNG • Max 5MB each • 5–20 images</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".jpg,.jpeg,.png"
                  onChange={handleImageSelect}
                  className="hidden"
                />
              </div>

              {imagePreviews.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Selected: {selectedImages.length} image{selectedImages.length !== 1 ? 's' : ''}
                    {selectedImages.length < 5 && <span className="text-red-500 ml-2">(need at least 5)</span>}
                  </p>
                  <div className="grid grid-cols-4 gap-3">
                    {imagePreviews.map((src, i) => (
                      <div key={i} className="relative group">
                        <img src={src} alt="" className="w-full h-24 object-cover rounded-lg" />
                        <button
                          onClick={() => removeImage(i)}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-4">
                <button
                  onClick={handleImageUpload}
                  disabled={uploadingImages || selectedImages.length < 5}
                  className="flex-1 bg-gradient-to-r from-green-500 to-teal-500 text-white py-4 rounded-lg font-bold text-lg disabled:opacity-50 flex items-center justify-center gap-2 hover:from-green-600 hover:to-teal-600 transition-all"
                >
                  {uploadingImages ? (
                    <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Uploading...</>
                  ) : (
                    <><Upload className="w-5 h-5" /> Upload {selectedImages.length} Photo{selectedImages.length !== 1 ? 's' : ''}</>
                  )}
                </button>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="px-6 py-4 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"
                >
                  Skip
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-500 rounded-xl p-6 mb-8 flex items-start gap-4">
          <AlertCircle className="w-6 h-6 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-1" />
          <div>
            <h3 className="text-lg font-bold text-amber-900 dark:text-amber-300 mb-2">Feedback Required</h3>
            <p className="text-amber-800 dark:text-amber-400">You must submit feedback for this completed event before you can book new events.</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 px-8 py-6">
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <FileText className="w-8 h-8" />
              Event Feedback Form
            </h1>
            <p className="text-blue-100 mt-2">Please provide feedback for your completed event</p>
          </div>

          <div className="p-8 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-gray-700 dark:to-gray-600 border-b-2 border-purple-200 dark:border-purple-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Event Details</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/20 rounded-lg"><FileText className="w-5 h-5 text-purple-600 dark:text-purple-400" /></div>
                <div><p className="text-sm text-gray-600 dark:text-gray-400">Event Title</p><p className="font-semibold text-gray-900 dark:text-white">{event.reason}</p></div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg"><MapPin className="w-5 h-5 text-blue-600 dark:text-blue-400" /></div>
                <div><p className="text-sm text-gray-600 dark:text-gray-400">Venue</p><p className="font-semibold text-gray-900 dark:text-white">{event.venueId?.name}</p></div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/20 rounded-lg"><Calendar className="w-5 h-5 text-green-600 dark:text-green-400" /></div>
                <div><p className="text-sm text-gray-600 dark:text-gray-400">Date</p><p className="font-semibold text-gray-900 dark:text-white">{new Date(event.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p></div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/20 rounded-lg"><Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" /></div>
                <div><p className="text-sm text-gray-600 dark:text-gray-400">Time</p><p className="font-semibold text-gray-900 dark:text-white">{event.time}</p></div>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                <Star className="w-5 h-5 text-yellow-500" />
                Event Success Rating <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                {[1,2,3,4,5].map(rating => (
                  <button key={rating} type="button" onClick={() => setFormData({...formData, successRating: rating})}
                    className={`p-4 rounded-xl border-2 transition-all ${formData.successRating >= rating ? 'bg-yellow-500 border-yellow-500 text-white scale-110' : 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-400 hover:border-yellow-500'}`}>
                    <Star className={`w-8 h-8 ${formData.successRating >= rating ? 'fill-current' : ''}`} />
                  </button>
                ))}
              </div>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                {['','Poor - Event did not meet expectations','Fair - Event had significant issues','Good - Event was satisfactory','Very Good - Event exceeded expectations','Excellent - Event was outstanding'][formData.successRating] || 'Please rate the event success'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Event Summary <span className="text-red-500">*</span></label>
              <textarea required value={formData.eventSummary} onChange={e => setFormData({...formData, eventSummary: e.target.value})} rows="4"
                placeholder="Provide a brief summary of what happened during the event..."
                className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white" />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Users className="w-5 h-5 text-blue-500" /> Approximate Attendance Count
              </label>
              <input type="number" min="0" value={formData.attendanceCount} onChange={e => setFormData({...formData, attendanceCount: e.target.value})}
                placeholder="e.g., 150"
                className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Challenges Faced (if any)</label>
              <textarea value={formData.challenges} onChange={e => setFormData({...formData, challenges: e.target.value})} rows="3"
                placeholder="Describe any challenges or issues encountered..."
                className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Suggestions for Future Events</label>
              <textarea value={formData.suggestions} onChange={e => setFormData({...formData, suggestions: e.target.value})} rows="3"
                placeholder="Share your suggestions for improving future events..."
                className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Final Report <span className="text-red-500">*</span></label>
              <textarea required value={formData.finalReport} onChange={e => setFormData({...formData, finalReport: e.target.value})} rows="6"
                placeholder="Provide a comprehensive final report including outcomes, achievements, learnings..."
                className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white" />
            </div>

            <div className="flex gap-4">
              <button type="submit" disabled={submitting}
                className="flex-1 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white py-4 px-6 rounded-lg hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 disabled:opacity-50 font-bold text-lg shadow-xl transition-all transform hover:scale-105 flex items-center justify-center gap-2">
                {submitting ? <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Submitting...</> : <><CheckCircle className="w-6 h-6" /> Submit Feedback</>}
              </button>
              <button type="button" onClick={() => navigate('/dashboard')}
                className="px-8 py-4 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 font-semibold transition-all">
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default FeedbackForm
