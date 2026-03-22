import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import StudentDashboard from '../components/dashboards/StudentDashboard'
import FacultyDashboard from '../components/dashboards/FacultyDashboard'
import HODDashboard from '../components/dashboards/HODDashboard'
import ABCDashboard from '../components/dashboards/ABCDashboard'
import SuperAdminDashboard from '../components/dashboards/SuperAdminDashboard'
import RegistrarDashboard from '../components/dashboards/RegistrarDashboard'

const Dashboard = () => {
  const { user, loading, pendingFeedbackEvent } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && user?.role === 'faculty' && pendingFeedbackEvent) {
      navigate(`/feedback/${pendingFeedbackEvent._id}`)
    }
  }, [loading, user, pendingFeedbackEvent, navigate])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500 dark:text-gray-400 text-base">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  const renderDashboard = () => {
    switch (user?.role) {
      case 'student': return <StudentDashboard />
      case 'faculty': return <FacultyDashboard />
      case 'hod': return <HODDashboard />
      case 'abc': return <ABCDashboard />
      case 'superadmin': return <SuperAdminDashboard />
      case 'registrar': return <RegistrarDashboard />
      default: return <div>Invalid role</div>
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {renderDashboard()}
    </div>
  )
}

export default Dashboard
