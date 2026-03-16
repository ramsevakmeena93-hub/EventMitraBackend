import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Calendar, CheckCircle, Clock, Building2, MapPin, User, Sparkles, ArrowRight, Zap, Shield, Bell, TrendingUp } from 'lucide-react'
import axios from 'axios'

const Home = () => {
  const { user } = useAuth()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState({ total: 0, approved: 0, pending: 0 })

  useEffect(() => {
    console.log('[Home] Component mounted, user:', user ? 'logged in' : 'not logged in')
    
    // Only fetch events if user is logged in
    if (user) {
      fetchApprovedEvents()
      
      // Auto-refresh every 30 seconds
      const interval = setInterval(() => {
        console.log('[Home] Auto-refreshing events...')
        fetchApprovedEvents()
      }, 30000)
      
      return () => clearInterval(interval)
    } else {
      // Clear events when logged out
      setBookings([])
      setStats({ total: 0, approved: 0, pending: 0 })
    }
  }, [user])

  const fetchApprovedEvents = async () => {
    // Only fetch if user is logged in
    if (!user) {
      console.log('[Home] User not logged in, skipping event fetch')
      setBookings([])
      return
    }
    
    setLoading(true)
    try {
      console.log('[Home] Fetching approved events from /api/events/public/approved')
      // Fetch only approved events that are upcoming or ongoing
      // This endpoint requires authentication (college login)
      const response = await axios.get('/api/events/public/approved')
      console.log('[Home] Response received:', response.status, response.data)
      console.log('[Home] Number of events:', response.data.length)
      setBookings(response.data)
      setStats({
        total: response.data.length,
        approved: response.data.filter(b => b.eventStatus === 'upcoming' || b.eventStatus === 'ongoing').length,
        pending: 0
      })
    } catch (error) {
      console.error('[Home] Error fetching events:', error)
      console.error('[Home] Error details:', error.response?.data || error.message)
      setBookings([])
    } finally {
      setLoading(false)
    }
  }

  const getEventStatusBadge = (eventStatus) => {
    switch (eventStatus) {
      case 'upcoming':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/50'
      case 'ongoing':
        return 'bg-green-500/20 text-green-400 border-green-500/50 animate-pulse'
      case 'completed':
        return 'bg-gray-500/20 text-gray-400 border-gray-500/50'
      default:
        return 'bg-blue-500/20 text-blue-400 border-blue-500/50'
    }
  }

  const getEventStatusText = (eventStatus) => {
    return eventStatus.toUpperCase()
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50'
      case 'pending_faculty':
      case 'pending_hod':
      case 'pending_abc':
      case 'pending_superadmin':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/50'
      case 'rejected':
        return 'bg-rose-500/20 text-rose-400 border-rose-500/50'
      default:
        return 'bg-blue-500/20 text-blue-400 border-blue-500/50'
    }
  }

  const getStatusText = (status) => {
    return status.replace('pending_', '').replace('_', ' ').toUpperCase()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 relative overflow-hidden">
      {/* Enhanced Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute w-[500px] h-[500px] bg-purple-600/30 rounded-full blur-[120px] animate-pulse top-0 -left-40"></div>
        <div className="absolute w-[500px] h-[500px] bg-blue-600/30 rounded-full blur-[120px] animate-pulse bottom-0 -right-40 animation-delay-2000"></div>
        <div className="absolute w-[400px] h-[400px] bg-pink-600/20 rounded-full blur-[100px] animate-pulse top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animation-delay-4000"></div>
        <div className="absolute w-[300px] h-[300px] bg-cyan-600/20 rounded-full blur-[80px] animate-pulse top-1/4 right-1/4 animation-delay-3000"></div>
      </div>

      {/* Animated Grid Pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-40"></div>

      {/* Floating Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-indigo-700 dark:bg-white rounded-full animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${5 + Math.random() * 10}s`,
              opacity: Math.random() * 0.5 + 0.2
            }}
          />
        ))}
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Hero Section with Enhanced Logo */}
        <div className="text-center mb-20 space-y-8">
          {/* Logo with Advanced Effects */}
          <div className="flex justify-center mb-12">
            <div className="relative group">
              {/* Multiple Glow Layers */}
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 rounded-full blur-3xl opacity-50 group-hover:opacity-75 transition-opacity duration-500 animate-pulse"></div>
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-cyan-600 to-purple-600 rounded-full blur-2xl opacity-30 group-hover:opacity-50 transition-opacity duration-500 animate-pulse animation-delay-1000"></div>
              
              {/* Logo Container with Ring */}
              <div className="relative">
                <div className="absolute inset-0 rounded-full border-4 border-purple-500/30 animate-spin-slow"></div>
                <div className="absolute inset-0 rounded-full border-4 border-blue-500/30 animate-spin-reverse"></div>
                <img 
                  src="https://iums.mitsgwalior.in/images/mits-logo.png" 
                  alt="Madhav Institute Logo" 
                  className="relative w-40 h-40 md:w-48 md:h-48 object-contain drop-shadow-2xl transform group-hover:scale-110 transition-transform duration-500 animate-float"
                />
              </div>
            </div>
          </div>

          {/* Enhanced Title */}
          <div className="space-y-6">
            <div className="inline-block">
              <h1 className="text-6xl md:text-8xl font-black bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent animate-gradient mb-4">
                MITS
              </h1>
              <div className="h-1 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 rounded-full animate-pulse"></div>
            </div>
            
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <Sparkles className="w-8 h-8 text-yellow-400 animate-pulse" />
              <h2 className="text-3xl md:text-5xl font-bold text-white drop-shadow-lg">
                EventMitra
              </h2>
              <Sparkles className="w-8 h-8 text-yellow-400 animate-pulse" />
            </div>
            
            <p className="text-xl md:text-2xl text-gray-300 max-w-4xl mx-auto leading-relaxed">
              Your trusted partner for <span className="text-purple-400 font-semibold">event management</span> with our 
              <span className="text-blue-400 font-semibold"> intelligent booking system</span>
            </p>

            {/* Stats Bar for Logged-in Users */}
            {user && (
              <div className="flex justify-center gap-4 mt-8">
                <div className="px-6 py-3 bg-gradient-to-r from-purple-600/20 to-blue-600/20 backdrop-blur-md rounded-xl border border-purple-500/30">
                  <div className="text-3xl font-bold text-white">{stats.total}</div>
                  <div className="text-sm text-gray-400">Total Bookings</div>
                </div>
                <div className="px-6 py-3 bg-gradient-to-r from-emerald-600/20 to-green-600/20 backdrop-blur-md rounded-xl border border-emerald-500/30">
                  <div className="text-3xl font-bold text-emerald-400">{stats.approved}</div>
                  <div className="text-sm text-gray-400">Approved</div>
                </div>
                <div className="px-6 py-3 bg-gradient-to-r from-amber-600/20 to-orange-600/20 backdrop-blur-md rounded-xl border border-amber-500/30">
                  <div className="text-3xl font-bold text-amber-400">{stats.pending}</div>
                  <div className="text-sm text-gray-400">Pending</div>
                </div>
              </div>
            )}
          </div>

          {!user && (
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mt-12">
              <Link
                to="/login"
                className="group relative px-10 py-5 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 text-white rounded-2xl font-bold text-lg overflow-hidden transform hover:scale-105 transition-all duration-300 shadow-2xl hover:shadow-purple-500/50"
              >
                <span className="relative z-10 flex items-center gap-3">
                  Get Started
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
              </Link>
              <Link
                to="/register"
                className="group px-10 py-5 bg-white/10 backdrop-blur-md text-white rounded-2xl font-bold text-lg border-2 border-white/30 hover:bg-white/20 hover:border-white/50 transform hover:scale-105 transition-all duration-300 flex items-center gap-3"
              >
                Register Now
                <Zap className="w-5 h-5 group-hover:rotate-12 transition-transform" />
              </Link>
            </div>
          )}
        </div>

        {/* All Approved Events Section (Visible only to logged-in users) */}
        {user && (
          <div className="mb-20">
            <div className="flex items-center justify-between mb-10">
              <h2 className="text-4xl font-bold text-white flex items-center gap-4">
                <div className="p-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl">
                  <Calendar className="w-8 h-8 text-white" />
                </div>
                Upcoming College Events
              </h2>
              <div className="flex items-center gap-4">
                <button
                  onClick={fetchApprovedEvents}
                  disabled={loading}
                  className="px-6 py-3 bg-gradient-to-r from-green-600/20 to-emerald-600/20 backdrop-blur-md rounded-xl border border-green-500/30 hover:border-green-500/50 transition-all flex items-center gap-2 text-green-300 font-semibold disabled:opacity-50"
                >
                  <svg className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {loading ? 'Refreshing...' : 'Refresh'}
                </button>
                <div className="px-6 py-3 bg-gradient-to-r from-purple-600/20 to-blue-600/20 backdrop-blur-md rounded-xl border border-purple-500/30">
                  <span className="text-purple-300 font-bold text-lg">{bookings.length} Events</span>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center items-center py-32">
                <div className="relative">
                  <div className="w-20 h-20 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
                  <div className="absolute inset-0 w-20 h-20 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin animation-delay-150"></div>
                  <div className="absolute inset-0 w-20 h-20 border-4 border-pink-500/30 border-t-pink-500 rounded-full animate-spin animation-delay-300"></div>
                </div>
              </div>
            ) : bookings.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {bookings.map((booking, index) => (
                  <div
                    key={booking._id}
                    className="group relative bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/10 hover:border-purple-500/50 transform hover:scale-105 hover:-translate-y-2 transition-all duration-500 hover:shadow-2xl hover:shadow-purple-500/20"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-600/0 via-purple-600/10 to-blue-600/0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-purple-600/20 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    
                    <div className="relative z-10 space-y-4">
                      {/* Event Status Badge */}
                      <div className="flex items-center justify-between">
                        <span className={`px-4 py-2 rounded-full text-xs font-bold border flex items-center gap-2 ${getEventStatusBadge(booking.eventStatus)}`}>
                          {booking.eventStatus === 'ongoing' && <Clock className="w-4 h-4 animate-pulse" />}
                          {booking.eventStatus === 'upcoming' && <Calendar className="w-4 h-4" />}
                          {getEventStatusText(booking.eventStatus)}
                        </span>
                        <div className="p-2 bg-purple-500/20 rounded-lg">
                          <Calendar className="w-5 h-5 text-purple-400" />
                        </div>
                      </div>

                      {/* Event Title */}
                      <div className="space-y-2">
                        <h3 className="font-bold text-xl text-white line-clamp-2">{booking.reason}</h3>
                      </div>

                      {/* Venue Info */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-500/20 rounded-lg">
                            <Building2 className="w-5 h-5 text-blue-400" />
                          </div>
                          <span className="font-semibold text-lg text-white">{booking.venueId?.name || 'Venue'}</span>
                        </div>
                      </div>

                      {/* Date & Time */}
                      <div className="flex items-center gap-4 text-sm bg-white/5 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-gray-300">
                          <Calendar className="w-4 h-4 text-emerald-400" />
                          <span className="font-semibold">{new Date(booking.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                        <div className="w-px h-4 bg-white/20"></div>
                        <div className="flex items-center gap-2 text-gray-300">
                          <Clock className="w-4 h-4 text-amber-400" />
                          <span className="font-semibold">{booking.time}</span>
                        </div>
                      </div>

                      {/* Organizer Info */}
                      <div className="flex items-center gap-2 text-gray-400 text-sm pt-2 border-t border-white/10">
                        <div className="p-1.5 bg-purple-500/20 rounded-full">
                          <User className="w-3.5 h-3.5 text-purple-400" />
                        </div>
                        <span className="font-medium">Organized by {booking.facultyId?.name || booking.studentName}</span>
                      </div>

                      {/* Club Badge */}
                      {booking.clubName && (
                        <div className="bg-gradient-to-r from-pink-500/20 to-purple-500/20 rounded-lg p-2 border border-pink-500/30">
                          <p className="text-pink-300 text-xs font-semibold text-center">
                            {booking.clubName}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-32 bg-white/5 backdrop-blur-md rounded-3xl border border-white/10">
                <div className="inline-block p-6 bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-full mb-6">
                  <Calendar className="w-16 h-16 text-gray-400" />
                </div>
                <p className="text-gray-400 text-xl font-semibold">No upcoming events at the moment</p>
                <p className="text-gray-500 text-sm mt-2">Check back later for updates</p>
              </div>
            )}
          </div>
        )}

        {/* Enhanced Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
          {[
            { icon: Zap, title: 'Lightning Fast', desc: 'Book venues instantly with real-time availability', color: 'from-yellow-500 to-orange-500', delay: '0ms' },
            { icon: Shield, title: 'Secure & Reliable', desc: 'Multi-level approval ensures accountability', color: 'from-green-500 to-emerald-500', delay: '100ms' },
            { icon: Bell, title: 'Smart Notifications', desc: 'Get instant updates on approval status', color: 'from-purple-500 to-pink-500', delay: '200ms' },
            { icon: TrendingUp, title: 'Analytics Dashboard', desc: 'Track bookings and approvals in real-time', color: 'from-blue-500 to-cyan-500', delay: '300ms' }
          ].map((feature, index) => (
            <div
              key={index}
              className="group relative bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/10 hover:border-white/30 transform hover:scale-105 hover:-translate-y-2 transition-all duration-500 hover:shadow-2xl"
              style={{ animationDelay: feature.delay }}
            >
              <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-10 rounded-2xl transition-opacity" style={{ backgroundImage: `linear-gradient(to bottom right, var(--tw-gradient-stops))` }}></div>
              <div className={`w-16 h-16 bg-gradient-to-br ${feature.color} rounded-2xl flex items-center justify-center mb-6 transform group-hover:rotate-12 group-hover:scale-110 transition-all duration-500 shadow-lg`}>
                <feature.icon className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">{feature.title}</h3>
              <p className="text-gray-400 leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>

        {/* Enhanced How It Works */}
        <div className="bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-xl rounded-3xl p-12 md:p-16 border border-white/10 shadow-2xl">
          <h2 className="text-5xl font-bold text-white mb-12 text-center">
            How It Works
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { step: '1', title: 'Submit Request', desc: 'Choose venue, date & time', icon: Calendar, color: 'from-purple-600 to-blue-600' },
              { step: '2', title: 'Faculty Review', desc: 'Quick approval process', icon: CheckCircle, color: 'from-blue-600 to-cyan-600' },
              { step: '3', title: 'HOD & ABC', desc: 'Multi-level verification', icon: Shield, color: 'from-cyan-600 to-green-600' },
              { step: '4', title: 'Confirmed', desc: 'Booking finalized', icon: Sparkles, color: 'from-green-600 to-emerald-600' }
            ].map((item, index) => (
              <div key={index} className="relative group">
                <div className="flex flex-col items-center text-center space-y-6">
                  <div className="relative">
                    <div className={`w-20 h-20 bg-gradient-to-br ${item.color} rounded-2xl flex items-center justify-center text-3xl font-black text-white shadow-2xl transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-500`}>
                      {item.step}
                    </div>
                    <div className="absolute -inset-2 bg-gradient-to-br opacity-50 blur-xl rounded-2xl" style={{ background: `linear-gradient(to bottom right, var(--tw-gradient-stops))` }}></div>
                    {index < 3 && (
                      <div className="hidden lg:block absolute top-1/2 left-full w-full h-1 bg-gradient-to-r from-current to-transparent opacity-30"></div>
                    )}
                  </div>
                  <div className="p-4 bg-white/5 rounded-xl backdrop-blur-sm">
                    <item.icon className="w-8 h-8 text-white mx-auto mb-3" />
                    <h4 className="font-bold text-white text-xl mb-2">{item.title}</h4>
                    <p className="text-gray-400 text-sm">{item.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 3s ease infinite;
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          25% { transform: translateY(-20px) translateX(10px); }
          50% { transform: translateY(-10px) translateX(-10px); }
          75% { transform: translateY(-15px) translateX(5px); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 20s linear infinite;
        }
        @keyframes spin-reverse {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        .animate-spin-reverse {
          animation: spin-reverse 15s linear infinite;
        }
        .animation-delay-150 {
          animation-delay: 150ms;
        }
        .animation-delay-300 {
          animation-delay: 300ms;
        }
        .animation-delay-1000 {
          animation-delay: 1s;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-3000 {
          animation-delay: 3s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  )
}

export default Home
