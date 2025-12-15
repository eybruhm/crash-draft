import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import MapPage from './pages/Map'
import Analytics from './pages/Analytics'
import ResolvedCases from './pages/ResolvedCases'
import GlobalReportNotifier from './components/GlobalReportNotifier'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="animated-background min-h-screen">
          {/* Plays new-report sound across ALL pages while logged in */}
          <GlobalReportNotifier />
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/map" element={<MapPage />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/resolved-cases" element={<ResolvedCases />} />
            <Route path="*" element={<h1>Not Found</h1>} />
          </Routes>
        </div>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
