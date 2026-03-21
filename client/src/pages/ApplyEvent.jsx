import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import axios from "axios"
import toast from "react-hot-toast"
import { Calendar, Clock, MapPin, FileText, User, Users, Upload, Building2 } from "lucide-react"
import { useAuth } from "../context/AuthContext"
import { useEmailSetup } from "../context/EmailSetupContext"

const ApplyEvent = () => {
  const { user } = useAuth()
  const { requireEmailSetup } = useEmailSetup()
  const navigate = useNavigate()
  const [formData, setFormData] = useState({ clubId: "", venueId: "", date: "", startTime: "", endTime: "", reason: "", eventDetails: "" })
  const [document, setDocument] = useState(null)
  const [venues, setVenues] = useState([])
  const [selectedHOD, setSelectedHOD] = useState(null)
  const [userClub, setUserClub] = useState(null)
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(false)
  const [venuesLoading, setVenuesLoading] = useState(true)

  useEffect(() => { if (user && user.role !== "faculty") { toast.error("Only faculty can create events"); navigate("/dashboard") } }, [user, navigate])
  useEffect(() => { fetchVenues(); fetchUserClub() }, [])

  const generateTimeSlots = () => { const slots = []; for (let h = 8; h <= 18; h++) { const p = h >= 12 ? "PM" : "AM"; const dh = h > 12 ? h - 12 : h; slots.push({ value: `${h.toString().padStart(2,"0")}:00`, label: `${dh}:00 ${p}` }); if (h < 18) slots.push({ value: `${h.toString().padStart(2,"0")}:30`, label: `${dh}:30 ${p}` }) } return slots }
  const timeSlots = generateTimeSlots()

  const fetchUserClub = async () => { try { const { data } = await axios.get("/api/users/my-club"); if (data.club) { setUserClub(data.club); setFormData(prev => ({ ...prev, clubId: data.club._id })) } } catch (e) {} }
  const fetchVenues = async () => { try { setVenuesLoading(true); const { data } = await axios.get("/api/venues"); setVenues(Array.isArray(data) ? data : []) } catch (e) { toast.error("Failed to load venues"); setVenues([]) } finally { setVenuesLoading(false) } }

  const handleVenueChange = async (e) => { const venueId = e.target.value; setFormData({ ...formData, venueId }); if (venueId) { try { const venue = venues.find(v => v._id === venueId); if (venue?.name?.includes("Seminar Hall") && venue.hodDepartment) { const { data } = await axios.get(`/api/users/hod/${venue.hodDepartment}`); setSelectedHOD(data) } else { setSelectedHOD(null) } } catch (e) { setSelectedHOD(null) } } else { setSelectedHOD(null) } }
  const handleFileChange = (e) => { const file = e.target.files[0]; if (!file) return; if (file.size > 5*1024*1024) { toast.error("File size must be less than 5MB"); e.target.value = ""; return }; const allowed = ["application/pdf","application/msword","application/vnd.openxmlformats-officedocument.wordprocessingml.document","image/jpeg","image/jpg","image/png"]; if (!allowed.includes(file.type)) { toast.error("Only PDF, DOC, DOCX, JPG, PNG allowed"); e.target.value = ""; return }; setDocument(file) }
  const validateTimeRange = () => { if (!formData.startTime || !formData.endTime) return true; const [sh,sm] = formData.startTime.split(":").map(Number); const [eh,em] = formData.endTime.split(":").map(Number); if (eh*60+em <= sh*60+sm) { toast.error("End time must be after start time"); return false }; if (eh > 18 || (eh === 18 && em > 0)) { toast.error("Bookings cannot extend beyond 6:00 PM"); return false }; return true }
  const checkAvailability = async () => { if (!formData.venueId || !formData.date || !formData.startTime || !formData.endTime) { toast.error("Please select venue, date, and times first"); return }; if (!validateTimeRange()) return; setChecking(true); try { const { data } = await axios.post("/api/events/check-availability", { venueId: formData.venueId, date: formData.date, startTime: formData.startTime, endTime: formData.endTime }); data.available ? toast.success("Venue is available!") : toast.error(data.message) } catch (e) { toast.error("Failed to check availability") } finally { setChecking(false) } }

  const doSubmit = async () => { setLoading(true); try { const avail = await axios.post("/api/events/check-availability", { venueId: formData.venueId, date: formData.date, startTime: formData.startTime, endTime: formData.endTime }); if (!avail.data.available) { toast.error(avail.data.message); setLoading(false); return }; const fd = new FormData(); fd.append("clubId", formData.clubId); fd.append("venueId", formData.venueId); fd.append("date", formData.date); fd.append("startTime", formData.startTime); fd.append("endTime", formData.endTime); fd.append("reason", formData.reason); fd.append("eventDetails", formData.eventDetails); fd.append("document", document); await axios.post("/api/events/create", fd, { headers: { "Content-Type": "multipart/form-data" } }); toast.success("Event application submitted successfully!"); navigate("/dashboard") } catch (error) { toast.error(error.response?.data?.message || "Failed to submit application") } finally { setLoading(false) } }
  const handleSubmit = (e) => { e.preventDefault(); if (!document) { toast.error("Please upload a document (required)"); return }; if (!validateTimeRange()) return; requireEmailSetup(doSubmit) }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 px-8 py-6">
            <h1 className="text-3xl font-bold text-white">Apply for Event</h1>
            <p className="text-blue-100 mt-2">Faculty Event Booking System</p>
          </div>
          <form onSubmit={handleSubmit} className="p-8 space-y-8">
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-700 dark:to-gray-600 p-6 rounded-xl border-2 border-blue-200 dark:border-blue-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><User className="w-6 h-6 text-blue-600" /> Faculty Information</h2>
              <div className="space-y-4">
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Faculty Name</label><input type="text" value={user?.name || ""} disabled className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-lg text-gray-700 dark:text-gray-200 cursor-not-allowed" /></div>
                {userClub ? (<div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"><Users className="inline w-5 h-5 mr-2 text-pink-600" />Club (Auto-assigned)</label><input type="text" value={userClub.name} disabled className="w-full px-4 py-3 bg-pink-50 dark:bg-pink-900/20 border-2 border-pink-300 dark:border-pink-700 rounded-lg text-gray-700 dark:text-gray-200 cursor-not-allowed font-medium" /><p className="mt-2 text-sm text-gray-600 dark:text-gray-400">You are a coordinator of this club.</p></div>) : (<div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border-2 border-yellow-300 dark:border-yellow-700"><p className="text-sm text-yellow-800 dark:text-yellow-300">You are not assigned to any club.</p></div>)}
              </div>
            </div>
            <div className="space-y-4">
              <div><label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"><MapPin size={18} className="text-green-600" />Select Venue <span className="text-red-500">*</span></label>
                {venuesLoading ? (<div className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-500">Loading venues...</div>) : venues.length === 0 ? (<div className="w-full px-4 py-3 border-2 border-red-300 rounded-lg bg-red-50 text-red-600">No venues available.</div>) : (<select required value={formData.venueId} onChange={handleVenueChange} className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white transition-all"><option value="">Choose a venue ({venues.length} available)</option>{venues.map(v => <option key={v._id} value={v._id}>{v.name || `Venue ${v._id}`}</option>)}</select>)}
              </div>
              {selectedHOD && (<div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border-2 border-green-200 dark:border-green-700"><label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"><Building2 size={18} className="text-green-600" />HOD (Auto-assigned)</label><input type="text" value={`${selectedHOD.name} - ${selectedHOD.department}`} disabled className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-green-300 rounded-lg text-gray-700 dark:text-gray-200 cursor-not-allowed" /></div>)}
            </div>
            <div className="space-y-4">
              <div><label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"><Calendar size={18} className="text-blue-600" />Event Date <span className="text-red-500">*</span></label><input type="date" required value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} min={new Date().toISOString().split("T")[0]} className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white transition-all" /></div>
              <div className="grid md:grid-cols-2 gap-4">
                <div><label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"><Clock size={18} className="text-purple-600" />Start Time <span className="text-red-500">*</span></label><select required value={formData.startTime} onChange={e => setFormData({ ...formData, startTime: e.target.value })} className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white transition-all"><option value="">Select start time</option>{timeSlots.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}</select></div>
                <div><label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"><Clock size={18} className="text-pink-600" />End Time <span className="text-red-500">*</span></label><select required value={formData.endTime} onChange={e => setFormData({ ...formData, endTime: e.target.value })} className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 dark:bg-gray-700 dark:text-white transition-all"><option value="">Select end time</option>{timeSlots.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}</select></div>
              </div>
              <p className="text-sm text-amber-600 dark:text-amber-400">Bookings are only allowed from 8:00 AM to 6:00 PM</p>
            </div>
            <button type="button" onClick={checkAvailability} disabled={checking} className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 px-6 rounded-lg hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 font-medium shadow-lg transition-all">{checking ? "Checking..." : "Check Venue Availability"}</button>
            <div><label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"><FileText size={18} className="text-indigo-600" />Event Title/Reason <span className="text-red-500">*</span></label><input type="text" required value={formData.reason} onChange={e => setFormData({ ...formData, reason: e.target.value })} placeholder="e.g., Technical Workshop on AI/ML" className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white transition-all" /></div>
            <div><label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"><FileText size={18} className="text-blue-600" />Event Details <span className="text-red-500">*</span></label><textarea required value={formData.eventDetails} onChange={e => setFormData({ ...formData, eventDetails: e.target.value })} rows="5" placeholder="Describe the event purpose, agenda, expected participants..." className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white transition-all" /></div>
            <div className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 p-6 rounded-xl border-2 border-orange-200 dark:border-orange-700">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"><Upload size={18} className="text-orange-600" />Upload Document <span className="text-red-500">*</span></label>
              <input type="file" required onChange={handleFileChange} accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" className="w-full px-4 py-3 border-2 border-orange-300 dark:border-orange-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-orange-100 file:text-orange-700 hover:file:bg-orange-200 transition-all" />
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Upload event proposal or permission letter (PDF, DOC, DOCX, JPG, PNG - Max 5MB)</p>
              {document && <p className="mt-2 text-sm text-green-600 font-medium">Selected: {document.name}</p>}
            </div>
            <button type="submit" disabled={loading || venuesLoading || venues.length === 0} className="w-full bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white py-4 px-6 rounded-lg hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 disabled:opacity-50 font-bold text-lg shadow-xl transition-all">{loading ? "Submitting Application..." : "Submit Application"}</button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default ApplyEvent