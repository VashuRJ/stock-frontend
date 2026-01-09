import React from 'react'
import { LogOut, User, Settings,CirclePlus } from 'lucide-react';
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

const Profile = () => {

  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const EmailName = localStorage.getItem('user_email') || ' ';

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      navigate('/login');
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('user_email')
    setIsLoggedIn(false)
    // Force full reload to home to avoid any stale auth state
    window.location.href = '/'
  }

  const ProfileDropdownMenu = () => {
    return (
      <div className="absolute top-[42px] right-10 px-[10px] py-[10px] mt-2 w-48 bg-[#3d4963] text-white rounded-md shadow-lg z-50 ">
        <ul className="flex flex-col gap-1">
          <li>
            <div className="px-4 py-2 border-b">
              <h2></h2>
              <p className="text-sm font-medium text-[#d1d4dc] hover:text-white">{EmailName}</p>
            </div>
          </li>
          <li>
            <button
              onClick={() => {
                navigate('/user/profile-details');
                setShowDropdown(false);
              }}
              className="block w-full text-left  px-4 py-2 text-md  hover:bg-[#1c212b] rounded-lg border-b border-[#2a2e39]"
            >
              <div className="flex items-center gap-2 ">
                <User size={16} />
                Profile
              </div>
            </button>
          </li>
          <li>
            <button
              onClick={() => {
                navigate('/user/setting');
                setShowDropdown(false);
              }}
              className="block w-full text-left px-4 py-2 text-md  hover:bg-[#1c212b] rounded-lg border-b border-[#2a2e39]"
            >
              <div className="flex items-center gap-2">
                <Settings size={16} />
                Setting
              </div>
            </button>
          </li>
          <li>
            <button
              onClick={() => {
                navigate('/user/details-watchlist');
                setShowDropdown(false);
              }}
              className="block w-full text-left px-4 py-2 text-md  hover:bg-[#1c212b] rounded-lg border-b border-[#2a2e39]"
            >
              <div className="flex items-center gap-2">
                <CirclePlus size={16} />
                Watchlist
              </div>
            </button>
          </li>
          <li>
            <button
              onClick={handleLogout}
              className="block w-full text-left px-4 py-2 text-md text-red-400 hover:text-red-600 hover:bg-red-100 rounded-lg"
              title="Logout"
            >
              <div className='flex items-center gap-2'>
                <LogOut size={18} className=''/>
                Logout
              </div>
              
            </button>
          </li>
        </ul>


      </div>

    )
  }

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [])

  return (
    <div ref={containerRef} className=' border rounded-full hover:cursor-pointer hover:border-blue-300'
    >
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-[#2962ff] to-purple-600 border-2 border-[#131722] flex items-center justify-center text-white font-bold text-sm">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="w-full h-full rounded-full flex items-center justify-center"
          >{EmailName.charAt(0).toUpperCase()}
          </button>
        </div>
        {showDropdown && <ProfileDropdownMenu />}
      </div>

    </div>
  )
}

export default Profile
