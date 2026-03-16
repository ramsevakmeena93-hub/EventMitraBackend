import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  Home, LayoutDashboard, CalendarPlus, Users, Code2,
  LogOut, LogIn, ChevronLeft, ChevronRight, Key, MessageSquare
} from 'lucide-react'

const Sidebar = () => {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const isActive = (path) => location.pathname === path

  const navItems = [
    { path: '/', label: 'Home', icon: Home, always: true },
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, show: !!user },
    { path: '/apply-event', label: 'Create Event', icon: CalendarPlus, show: user?.role === 'faculty' },
    { path: '/clubs', label: 'Clubs', icon: Users, show: user?.role === 'abc' || user?.role === 'superadmin' },
    { path: '/developer', label: 'Developer', icon: Code2, always: true },
  ]

  const visibleItems = navItems.filter(item => item.always || item.show)

  return (
    <aside
      className={`
        fixed left-0 top-0 h-full z-40 flex flex-col
        bg-gradient-to-b from-slate-900 via-purple-950 to-slate-900
        border-r border-purple-500/20 shadow-2xl
        transition-all duration-300
        ${collapsed ? 'w-16' : 'w-56'}
      `}
    >
      {/* Logo */}
      <div className={`flex items-center gap-3 px-3 py-5 border-b border-purple-500/20 ${collapsed ? 'justify-center' : ''}`}>
        <div className="relative flex-shrink-0">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full blur-md opacity-50"></div>
          <img
            src="https://iums.mitsgwalior.in/images/mits-logo.png"
            alt="MITS"
            className="relative w-9 h-9 object-contain drop-shadow-lg"
          />
        </div>
        {!collapsed && (
          <span className="text-lg font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent whitespace-nowrap">
            EventMitra
          </span>
        )}
      </div>

      {/* Nav Items */}
      <nav className="flex-1 py-4 space-y-1 px-2 overflow-y-auto">
        {visibleItems.map(({ path, label, icon: Icon }) => (
          <Link
            key={path}
            to={path}
            title={collapsed ? label : ''}
            className={`
              flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group
              ${isActive(path)
                ? 'bg-gradient-to-r from-purple-600/40 to-blue-600/40 text-white border border-purple-500/40 shadow-lg'
                : 'text-gray-400 hover:text-white hover:bg-white/10'
              }
              ${collapsed ? 'justify-center' : ''}
            `}
          >
            <Icon size={20} className={`flex-shrink-0 ${isActive(path) ? 'text-purple-300' : 'group-hover:text-purple-400'}`} />
            {!collapsed && <span className="text-sm font-medium">{label}</span>}
            {isActive(path) && !collapsed && (
              <div className="ml-auto w-1.5 h-1.5 rounded-full bg-purple-400"></div>
            )}
          </Link>
        ))}
      </nav>

      {/* User Info + Logout */}
      <div className="border-t border-purple-500/20 p-2 space-y-1">
        {user ? (
          <>
            {!collapsed && (
              <div className="px-3 py-2 rounded-xl bg-white/5 mb-1">
                <p className="text-white text-sm font-semibold truncate">{user.name}</p>
                <p className="text-purple-400 text-xs capitalize">{user.role}</p>
              </div>
            )}
            <button
              onClick={handleLogout}
              title={collapsed ? 'Logout' : ''}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-400 hover:text-white hover:bg-red-500/20 transition-all ${collapsed ? 'justify-center' : ''}`}
            >
              <LogOut size={20} className="flex-shrink-0" />
              {!collapsed && <span className="text-sm font-medium">Logout</span>}
            </button>
          </>
        ) : (
          <Link
            to="/login"
            title={collapsed ? 'Login' : ''}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-purple-400 hover:text-white hover:bg-purple-500/20 transition-all ${collapsed ? 'justify-center' : ''}`}
          >
            <LogIn size={20} className="flex-shrink-0" />
            {!collapsed && <span className="text-sm font-medium">Login</span>}
          </Link>
        )}
      </div>

      {/* Collapse Toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 w-6 h-6 bg-purple-600 hover:bg-purple-500 rounded-full flex items-center justify-center shadow-lg border border-purple-400/30 transition-colors"
      >
        {collapsed ? <ChevronRight size={12} className="text-white" /> : <ChevronLeft size={12} className="text-white" />}
      </button>
    </aside>
  )
}

export default Sidebar
