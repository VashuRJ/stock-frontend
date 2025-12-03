import React from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'

export default function Navbar() {
  const navigate = useNavigate()

  return (
    <>
      {/* HEADER SECTION
        fixed: Scroll karne par upar chipka rahega
        z-50: Sabse upar dikhega
        bg-[#131722]: TradingView ka dark background color
      */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#131722] text-[#d1d4dc] border-b border-[#2a2e39] font-sans">
        <div className="mx-auto w-full px-4 sm:px-6 lg:px-8">
          
          {/* Grid Layout: [Logo] --- [Search] --- [Buttons] */}
          <div className="h-[60px] grid grid-cols-[auto_1fr_auto] items-center gap-8">
            
            {/* 1. LEFT SIDE: Logo */}
            <div className="flex items-center gap-6">
              <Link to="/" className="flex items-center gap-2 group text-decoration-none">
                {/* Logo Image */}
                <img 
                  src="https://staging.concientech.com/wp-content/uploads/2025/04/cropped-chatgpt-logo1.png" 
                  alt="ConcienTech Logo" 
                  className="w-15 h-12 object-contain" 
                />
                {/* Brand Name */}
            
             </Link>
            </div>

            {/* 2. CENTER: Search Bar (Desktop Only) */}
            <div className="hidden md:flex justify-start max-w-md w-full">
              <div className="relative w-full">
                {/* Search Icon */}
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#adb4cc]">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                    <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
                  </svg>
                </span>
                {/* Input Field */}
                <input
                  type="text"
                  placeholder="Search (e.g. NIFTY)"
                  className="w-full pl-10 pr-4 py-1.5 rounded bg-[#1e222d] border border-[#2a2e39] text-sm text-[#d1d4dc] placeholder-[#50535e] focus:outline-none focus:border-[#2962ff] focus:ring-1 focus:ring-[#2962ff] transition-all"
                />
              </div>
            </div>

            {/* 3. RIGHT SIDE: Navigation & Auth Buttons */}
            <div className="flex items-center gap-6">
              
              {/* Navigation Links (Desktop) */}
              <nav className="hidden lg:flex items-center gap-6 text-sm font-medium">
                <NavLink to="/products" className={({isActive}) => isActive ? 'text-white' : 'hover:text-white transition-colors'}>Products</NavLink>
                <NavLink to="/community" className={({isActive}) => isActive ? 'text-white' : 'hover:text-white transition-colors'}>Community</NavLink>
                <NavLink to="/markets" className={({isActive}) => isActive ? 'text-white' : 'hover:text-white transition-colors'}>Markets</NavLink>
              </nav>

              {/* User Menu Section */}
              <div className="flex items-center gap-3 border-l border-[#2a2e39] pl-6">
                
                {/* Country/Region Indicator */}
                <span className="hidden sm:flex items-center gap-1 text-xs font-medium text-[#787b86] cursor-pointer hover:text-[#d1d4dc]">
                  <span>🌐</span> IN
                </span>

                {/* Sign In Button (Icon for Mobile) */}
                <button 
                  onClick={() => navigate('/login')}
                  className="sm:hidden p-2 text-[#d1d4dc] hover:bg-[#2a2e39] rounded-full"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-3.31 0-6 2.69-6 6h12c0-3.31-2.69-6-6-6z"/></svg>
                </button>

                {/* Sign In Button (Full for Desktop) */}
                <button
                  onClick={() => navigate('/login')}
                  className="hidden sm:flex items-center justify-center h-8 px-4 rounded bg-[#2962ff] hover:bg-[#1e53e5] text-white text-sm font-semibold transition-colors"
                >
                  Sign In
                </button>
              </div>

            </div>
          </div>
        </div>
      </header>

      {/* Spacer div: Taaki content header ke peeche na chhupe */}
      <div className="h-[60px]" />
    </>
  )
}