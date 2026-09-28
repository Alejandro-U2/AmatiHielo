import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import Login from './components/Login'
import Dashboard from './components/Dashboard'
import RecuperarContrasena from './components/RecuperarContrasena'
import { isAuthenticated } from './services/authService'

function ProtectedRoute({ children }) {
  if (!isAuthenticated()) {
    return <Navigate to="/" replace />
  }

  return children
}

function App() {
  return (
    <Router>
      <Toaster position="top-center" richColors closeButton />
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/recuperar" element={<RecuperarContrasena />} />
        <Route
          path="/dashboard"
          element={(
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          )}
        />
      </Routes>
    </Router>
  )
}

export default App