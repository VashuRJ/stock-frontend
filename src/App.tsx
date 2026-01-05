import { Route, Routes, Navigate, useLocation } from 'react-router-dom'
import Navbar from '@/components/Navbar'
import { Footer } from '@/components/Fotter'
import Home from '@/pages/Home'
import Login from '@/pages/Login'
import Register from '@/pages/Register'
import Dashboard from '@/pages/Dashboard'

function RequireAuth({ children }: { children: JSX.Element }) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null
  if (!token) {
    return <Navigate to="/login" replace />
  }
  return children
}

export default function App() {
  const location = useLocation()
  const hideNavbarOn = ['/login', '/register']
  const showNavbar = !hideNavbarOn.some(p => location.pathname.startsWith(p))

  return (
    <div className="min-h-screen flex flex-col">
      {showNavbar && <Navbar />}
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
    </div>
  )
}
