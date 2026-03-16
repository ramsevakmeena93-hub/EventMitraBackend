import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useAuth } from './context/AuthContext'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import ApplyEvent from './pages/ApplyEvent'
import Dashboard from './pages/Dashboard'
import Clubs from './pages/Clubs'
import Developer from './pages/Developer'
import GoogleCallback from './pages/GoogleCallback'
import FeedbackForm from './pages/FeedbackForm'
import PrivateRoute from './components/PrivateRoute'

function App() {
  const { user } = useAuth()

  return (
    <Router>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors flex flex-col">
        <Navbar />
        <Toaster position="top-right" />
        <main className="flex-grow pt-16">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login />} />
            <Route path="/register" element={user ? <Navigate to="/dashboard" /> : <Register />} />
            <Route path="/auth/google/callback" element={<GoogleCallback />} />
            <Route path="/clubs" element={<Clubs />} />
            <Route path="/developer" element={<Developer />} />
            <Route
              path="/apply-event"
              element={
                <PrivateRoute>
                  <ApplyEvent />
                </PrivateRoute>
              }
            />
            <Route
              path="/feedback/:eventId?"
              element={
                <PrivateRoute>
                  <FeedbackForm />
                </PrivateRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  )
}

export default App
