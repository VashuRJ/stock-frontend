import React from 'react'
import { LogOut, User, Settings, CirclePlus } from 'lucide-react';
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/api/client';

interface UserExtraDetails {
  id: number;
  user_id: number;
  profile_pic_url?: string;
  // add other fields as needed
}

const ProfileMenu = ({ userEmail }: { userEmail: string }) => {

  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [profilePicUrl, setProfilePicUrl] = useState<string | null>(null);
  const [loadingPic, setLoadingPic] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const EmailName = userEmail || localStorage.getItem('user_email') || ' ';
  const userId = localStorage.getItem('user_id');

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      navigate('/login');
    }
  }, []);

  // Fetch user profile picture
  useEffect(() => {
    const fetchProfilePic = async () => {
      if (!userId) return;

      setLoadingPic(true);
      try {
        const res = await api.get<UserExtraDetails>(`/user-extra-details/${userId}`);
        if (res.data?.profile_pic_url) {
          setProfilePicUrl(res.data.profile_pic_url);
        }
      } catch (err) {
        // Silently fail - will show initial instead
        console.log('Could not fetch profile picture');
      } finally {
        setLoadingPic(false);
      }
    };

    fetchProfilePic();
  }, [userId]);

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('user_email')
    localStorage.removeItem('user_id')
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
                <LogOut size={18} className='' />
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
        <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-[#2962ff] to-purple-600 border-2 border-[#131722] flex items-center justify-center text-white font-bold text-sm overflow-hidden">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="w-full h-full rounded-full flex items-center justify-center"
          >
            {profilePicUrl ? (
              <img
                src={profilePicUrl}
                alt="Profile"
                className="w-full h-full object-cover rounded-full"
                onError={() => setProfilePicUrl(null)}
              />
            ) : (
              EmailName.charAt(0).toUpperCase()
            )}
          </button>
        </div>
        {showDropdown && <ProfileDropdownMenu />}
      </div>

    </div>
  )
}

export default ProfileMenu;
