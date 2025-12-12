import { useState } from 'react'
import { api } from '@/api/client'
import { useNavigate } from 'react-router-dom'

export default function Register() {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    mobile_number: '',
    password: '',
    confirmPassword: '',
    country: 'IN'
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const navigate = useNavigate()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long')
      return
    }

    if (formData.mobile_number.length < 10) {
      setError('Please enter a valid mobile number')
      return
    }

    setLoading(true)
    try {
      // Prepare data according to backend schema
      const registerData = {
        full_name: formData.full_name,
        email: formData.email,
        mobile_number: parseInt(formData.mobile_number),
        password: formData.password,
        country: formData.country
      }

      // Call backend registration endpoint
      await api.post('/create', registerData)
      setSuccess(true)
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate('/login')
      }, 2000)
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Registration failed. Please try again.')
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

      {/* --- RIGHT SIDE: REGISTRATION FORM --- */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative bg-[#0e1117]">
        
        <div className="w-full max-w-lg space-y-6">
          
          {/* Brand Header */}
          <div className="text-center">
            <div className="flex justify-center mb-4">
               <img 
                  src="https://staging.concientech.com/wp-content/uploads/2025/04/cropped-chatgpt-logo1.png" 
                  alt="ConcienTech Logo" 
                  className="w-21 h-20 object-contain" 
                />
            </div>
          </div>

          <div className="bg-[#131722] p-8 rounded-2xl border border-[#2a2e39] shadow-2xl">
            <h3 className="text-xl font-semibold text-white mb-6 text-center">Sign Up</h3>
            
            {success && (
              <div className="mb-4 p-3 rounded bg-green-500/10 border border-green-500/20 text-green-500 text-xs flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                Account created successfully! Redirecting to login...
              </div>
            )}

            <form onSubmit={submit} className="space-y-4">
              
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#787b86] uppercase tracking-wide ml-1">Full Name</label>
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  className="w-full bg-[#0e1117] border border-[#2a2e39] text-white text-sm rounded-lg focus:ring-1 focus:ring-[#2962ff] focus:border-[#2962ff] p-3 transition-all placeholder-[#2a2e39] focus:outline-none"
                  placeholder="Enter your full name"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#787b86] uppercase tracking-wide ml-1">Email Address</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full bg-[#0e1117] border border-[#2a2e39] text-white text-sm rounded-lg focus:ring-1 focus:ring-[#2962ff] focus:border-[#2962ff] p-3 transition-all placeholder-[#2a2e39] focus:outline-none"
                  placeholder="Enter your email"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#787b86] uppercase tracking-wide ml-1">Mobile Number</label>
                <input
                  type="tel"
                  name="mobile_number"
                  value={formData.mobile_number}
                  onChange={handleChange}
                  className="w-full bg-[#0e1117] border border-[#2a2e39] text-white text-sm rounded-lg focus:ring-1 focus:ring-[#2962ff] focus:border-[#2962ff] p-3 transition-all placeholder-[#2a2e39] focus:outline-none"
                  placeholder="Enter mobile number"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#787b86] uppercase tracking-wide ml-1">Country</label>
                <select
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                  className="w-full bg-[#0e1117] border border-[#2a2e39] text-white text-sm rounded-lg focus:ring-1 focus:ring-[#2962ff] focus:border-[#2962ff] p-3 transition-all focus:outline-none"
                >
                  <option value="IN">India</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#787b86] uppercase tracking-wide ml-1">Password</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full bg-[#0e1117] border border-[#2a2e39] text-white text-sm rounded-lg focus:ring-1 focus:ring-[#2962ff] focus:border-[#2962ff] p-3 transition-all placeholder-[#2a2e39] focus:outline-none"
                  placeholder="••••••••"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#787b86] uppercase tracking-wide ml-1">Confirm Password</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="w-full bg-[#0e1117] border border-[#2a2e39] text-white text-sm rounded-lg focus:ring-1 focus:ring-[#2962ff] focus:border-[#2962ff] p-3 transition-all placeholder-[#2a2e39] focus:outline-none"
                  placeholder="••••••••"
                  required
                />
              </div>

              {error && (
                <div className="p-3 rounded bg-[#f23645]/10 border border-[#f23645]/20 text-[#f23645] text-xs flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                  {error}
                </div>
              )}

              <button 
                disabled={loading || success}
                className="w-full text-white bg-[#2962ff] hover:bg-[#1e53e5] focus:ring-4 focus:outline-none focus:ring-blue-900 font-semibold rounded-lg text-sm px-5 py-3.5 text-center transition-all shadow-lg shadow-blue-900/20 hover:shadow-blue-900/40 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 mt-2"
              >
                {loading ? 'Creating Account...' : success ? 'Account Created!' : 'Create Account'}
              </button>
            </form>

            {/* --- LOGIN LINK --- */}
            <div className="mt-6 text-center pt-4 border-t border-[#2a2e39]">
              <p className="text-sm text-[#787b86]">
                Already have an account?{' '}
                <button 
                  onClick={() => navigate('/login')} 
                  className="text-[#2962ff] hover:text-[#1e53e5] font-medium hover:underline transition-colors"
                >
                  Sign in
                </button>
              </p>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
