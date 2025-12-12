import { useState } from 'react'
import { api } from '@/api/client'
import { useNavigate } from 'react-router-dom'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await api.post('/auth/login', { email, password })
      const { access_token, user } = res.data
      
      // Save to localStorage
      localStorage.setItem('access_token', access_token)
      localStorage.setItem('user_id', user.id?.toString() || '')
      localStorage.setItem('user_name', user.full_name || email.split('@')[0])
      localStorage.setItem('user_email', user.email || '')
      
      // Redirect to dashboard
      navigate('/dashboard')
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Invalid credentials. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-[#0e1117] text-[#d1d4dc] font-sans selection:bg-[#2962ff] selection:text-white">
      
      {/* --- LEFT SIDE: PREMIUM IMAGE --- */}
      <div className="hidden lg:block w-1/2 relative overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center transition-transform duration-[40s] ease-in-out transform hover:scale-110"
          style={{ 
            backgroundImage: 'url("https://images.unsplash.com/photo-1642790106117-e829e14a795f?q=80&w=2070&auto=format&fit=crop")',
          }}
        ></div>
        <div className="absolute inset-0 bg-[#0e1117]/30 mix-blend-multiply"></div>
      </div>

      {/* --- RIGHT SIDE: LOGIN FORM --- */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative bg-[#0e1117]">
        
        <div className="w-full max-w-lg space-y-8">
          
          {/* Brand Header */}
          <div className="text-center">
            <div className="flex justify-center mb-4">
               <img 
                  src="https://staging.concientech.com/wp-content/uploads/2025/04/cropped-chatgpt-logo1.png" 
                  alt="ConcienTech Logo" 
                  className="w-22 h-20 object-contain" 
                />
            </div>
            <p className="text-[#787b86] mt-2 text-sm">Institutional Trading Platform</p>
          </div>

          <div className="bg-[#131722] p-8 rounded-2xl border border-[#2a2e39] shadow-2xl">
            <h3 className="text-xl font-semibold text-white mb-6 text-center">Welcome Back</h3>
            
            <form onSubmit={submit} className="space-y-5">
              
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#787b86] uppercase tracking-wide ml-1">Email Address</label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full bg-[#0e1117] border border-[#2a2e39] text-white text-sm rounded-lg focus:ring-1 focus:ring-[#2962ff] focus:border-[#2962ff] p-3 transition-all placeholder-[#2a2e39] focus:outline-none"
                    placeholder="Enter your email"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#787b86] uppercase tracking-wide ml-1">Password</label>
                <div className="relative">
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full bg-[#0e1117] border border-[#2a2e39] text-white text-sm rounded-lg focus:ring-1 focus:ring-[#2962ff] focus:border-[#2962ff] p-3 transition-all placeholder-[#2a2e39] focus:outline-none"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 rounded bg-[#f23645]/10 border border-[#f23645]/20 text-[#f23645] text-xs flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                  {error}
                </div>
              )}

              <button 
                disabled={loading}
                className="w-full text-white bg-[#2962ff] hover:bg-[#1e53e5] focus:ring-4 focus:outline-none focus:ring-blue-900 font-semibold rounded-lg text-sm px-5 py-3.5 text-center transition-all shadow-lg shadow-blue-900/20 hover:shadow-blue-900/40 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 mt-2"
              >
                {loading ? 'Authenticating...' : 'Access Terminal'}
              </button>
            </form>

            {/* --- SIGNUP LINK --- */}
            <div className="mt-6 text-center pt-4 border-t border-[#2a2e39]">
              <p className="text-sm text-[#787b86]">
                Don't have an account?{' '}
                <button 
                  onClick={() => navigate('/register')} 
                  className="text-[#2962ff] hover:text-[#1e53e5] font-medium hover:underline transition-colors"
                >
                  Create one for free
                </button>
              </p>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}