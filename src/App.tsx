import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { ToastContainer, toast } from 'react-toastify';
import { Footer } from '@/components/Fotter'
import Home from '@/pages/Home'
import Login from '@/pages/Login'
import Register from '@/pages/Register'
import Navbar from '@/components/Navbar'


//Dashboard
import Dashboard from '@/pages/Dashboard'

//User
import { ProfileDetails } from './user/ProfileDetails'
import { DetailsWatchlist } from './user/DetailsWatchlist'
import { Setting } from './user/Setting'
import { PortfolioDetails } from './user/portfolio/PortfolioDetails'
import { ViewPortfolioDetails } from './user/portfolio/ViewPortfolioDetails'

//  pagess
import { TestPage } from '@/pages/TestPage'
//Components
// import { Profile } from './components/Profile'

function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">404</h1>
        <p className="text-lg text-gray-600 mb-4">This page is coming soon.</p>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Go Home
        </button>
      </div>
    </div>
  )
}

function RequireAuth({ children }: { children: JSX.Element }) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null
  if (!token) {
    return <Navigate to="/login" replace />
  }
  return children
}

export default function App() {

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
          <Route path="/user/profile-details" element={<RequireAuth><ProfileDetails /></RequireAuth>} />
          <Route path="/user/details-watchlist" element={<RequireAuth><DetailsWatchlist /></RequireAuth>} />
          <Route path="/user/setting" element={<RequireAuth><Setting /></RequireAuth>} />
          <Route path="/portfolio" element={<RequireAuth><PortfolioDetails /></RequireAuth>} />
          <Route path="/portfolio/:id" element={<RequireAuth><ViewPortfolioDetails /></RequireAuth>} />
          <Route path="/test" element={<TestPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </div>
  )
}
