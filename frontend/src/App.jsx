import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import NewMeeting from './pages/NewMeeting'
import MeetingDetail from './pages/MeetingDetail'
import BriefPage from './pages/BriefPage'
import TranscriptPage from './pages/TranscriptPage'
import ReportPage from './pages/ReportPage'
import Layout from './components/Layout/Layout'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex h-screen items-center justify-center text-gray-400">Loading...</div>
  return user ? children : <Navigate to="/login" replace />
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  return user ? <Navigate to="/dashboard" replace /> : children
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<PublicRoute><Landing /></PublicRoute>} />
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

        <Route element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/meetings/new" element={<NewMeeting />} />
          <Route path="/meetings/:id" element={<MeetingDetail />} />
          <Route path="/meetings/:id/brief" element={<BriefPage />} />
          <Route path="/meetings/:id/transcript" element={<TranscriptPage />} />
          <Route path="/meetings/:id/report" element={<ReportPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}
