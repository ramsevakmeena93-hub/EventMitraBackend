import { Link, useNavigate, useLocation } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { useTheme } from "../context/ThemeContext"
import { Sun, Moon, LogOut, LogIn, ChevronDown, User, Bell, Menu, X } from "lucide-react"
import { useState, useRef, useEffect } from "react"
import axios from "axios"

const Navbar = () => {
  const { user, logout } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const userMenuRef = useRef(null)
  const notifRef = useRef(null)

  const handleLogout = () => {
    logout()
    navigate("/")
    setShowUserMenu(false)
    setShowMobileMenu(false)
  }

  const isActive = (path) => location.pathname === path

  useEffect(() => {
    if (user) {
      fetchNotifications()
      const interval = setInterval(fetchNotifications, 30000)
      return () => clearInterval(interval)
    } else {
      setNotifications([])
      setUnreadCount(0)
    }
  }, [user])

  const fetchNotifications = async () => {
    try {
      const { data } = await axios.get("/api/events/my-events")
      const notifs = data
        .filter(e => e.status !== "pending_faculty")
        .slice(0, 10)
        .map(e => ({ id: e._id, message: e.reason || "Event updated", date: e.updatedAt, status: e.status }))
      setNotifications(notifs)
      setUnreadCount(notifs.length)
    } catch (_) {}
  }

  const markAllRead = () => setUnreadCount(0)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setShowUserMenu(false)
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifications(false)
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const navLinks = [
    { path: "/", label: "Home", always: true },
    { path: "/dashboard", label: "Dashboard", show: !!user },
    { path: "/apply-event", label: "Create Event", show: user?.role === "faculty" },
    { path: "/clubs", label: "Clubs", show: user?.role === "abc" || user?.role === "superadmin" },
    { path: "/developer", label: "Developer", always: true },
  ].filter(l => l.always || l.show)

  return (
    <header className="fixed top-0 left-0 right-0 h-16 z-30 bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 border-b border-purple-500/20 shadow-xl">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center gap-6">

        <Link to="/" className="flex items-center gap-2 flex-shrink-0">
          <img src="https://iums.mitsgwalior.in/images/mits-logo.png" alt="MITS" className="w-9 h-9 object-contain" />
          <span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent hidden sm:block">EventMitra</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1 flex-1">
          {navLinks.map(({ path, label }) => (
            <Link key={path} to={path}
              className={"px-4 py-2 rounded-lg text-base font-medium transition-all " + (isActive(path) ? "bg-purple-600/40 text-white border border-purple-500/40" : "text-gray-300 hover:text-white hover:bg-white/10")}>
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 ml-auto">
          <button onClick={toggleTheme} className="p-2 rounded-lg bg-white/10 text-gray-300 hover:bg-white/20 transition-all">
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          {user && (
            <div className="relative" ref={notifRef}>
              <button onClick={() => { setShowNotifications(!showNotifications); if (!showNotifications) markAllRead() }}
                className="relative p-2 rounded-lg bg-white/10 text-gray-300 hover:bg-white/20 transition-all">
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-slate-800 rounded-xl shadow-2xl border border-purple-500/30 overflow-hidden z-50">
                  <div className="p-3 border-b border-purple-500/30 flex items-center justify-between">
                    <span className="text-white font-semibold text-sm">Notifications</span>
                    <span className="text-xs text-gray-400">{notifications.length} recent</span>
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-gray-400 text-sm">No notifications yet</div>
                    ) : notifications.map(n => (
                      <div key={n.id} className="p-3 border-b border-white/5 hover:bg-white/5">
                        <p className="text-sm text-gray-200">{n.message}</p>
                        <p className="text-xs text-gray-500 mt-1">{new Date(n.date).toLocaleDateString()}</p>
                      </div>
                    ))}
                  </div>
                  <div className="p-2 border-t border-white/10 text-center">
                    <Link to="/dashboard" onClick={() => setShowNotifications(false)} className="text-xs text-purple-400 hover:text-purple-300">View Dashboard</Link>
                  </div>
                </div>
              )}
            </div>
          )}

          {user ? (
            <div className="relative hidden sm:block" ref={userMenuRef}>
              <button onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/20 rounded-lg border border-purple-500/30 hover:bg-purple-500/30 transition-all">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center">
                  <User size={15} className="text-white" />
                </div>
                <div className="text-left hidden md:block">
                  <p className="text-sm text-purple-300 font-semibold leading-tight">{user.name}</p>
                  <p className="text-xs text-gray-400 capitalize">{user.role}</p>
                </div>
                <ChevronDown size={14} className={"text-gray-400 transition-transform " + (showUserMenu ? "rotate-180" : "")} />
              </button>
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-slate-800 rounded-xl shadow-2xl border border-purple-500/30 overflow-hidden z-50">
                  <div className="p-4 border-b border-purple-500/30">
                    <p className="text-white font-semibold">{user.name}</p>
                    <p className="text-purple-300 text-sm capitalize">{user.role}</p>
                    {user.email && <p className="text-gray-400 text-xs mt-1">{user.email}</p>}
                  </div>
                  <div className="p-2">
                    <button onClick={handleLogout}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white font-semibold rounded-lg transition-all text-sm">
                      <LogOut size={16} /> Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login"
              className="hidden sm:flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-2 rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all text-base font-medium">
              <LogIn size={18} /> Login
            </Link>
          )}

          <button onClick={() => setShowMobileMenu(!showMobileMenu)} className="md:hidden p-2 rounded-lg bg-white/10 text-gray-300 hover:bg-white/20 transition-all">
            {showMobileMenu ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {showMobileMenu && (
        <div className="absolute top-16 left-0 right-0 bg-slate-900 border-b border-purple-500/20 shadow-xl md:hidden z-40 p-4 space-y-2">
          {navLinks.map(({ path, label }) => (
            <Link key={path} to={path} onClick={() => setShowMobileMenu(false)}
              className={"block px-4 py-3 rounded-lg text-base font-medium transition-all " + (isActive(path) ? "bg-purple-600/40 text-white" : "text-gray-300 hover:text-white hover:bg-white/10")}>
              {label}
            </Link>
          ))}
          {user ? (
            <button onClick={handleLogout} className="w-full flex items-center gap-2 px-4 py-3 rounded-lg text-red-400 hover:bg-red-500/20 text-base font-medium transition-all">
              <LogOut size={18} /> Logout
            </button>
          ) : (
            <Link to="/login" onClick={() => setShowMobileMenu(false)} className="block px-4 py-3 rounded-lg text-purple-400 hover:bg-purple-500/20 text-base font-medium">Login</Link>
          )}
        </div>
      )}
    </header>
  )
}

export default Navbar