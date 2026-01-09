import React from 'react'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom';
import { User, Mail, Phone, Camera, Save, Edit2, X } from 'lucide-react';

import { api } from '@/api/client';
import { toast } from 'react-toastify';

interface UserProfile {
  full_name: string;
  email: string;
  mobile_number?: string;
  active?: boolean;
  created_at?: Date;
}

export const ProfileDetails = () => {

  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const StoredEmail = localStorage.getItem('user_email') || ' ';
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const UserPersonaldetails = async (email: string) => {
    //fetch user details from backend using StoredEmail
    setLoading(true);
    try {
      const res = await api.get(`/user/by-email/${email}`);
      setProfile(res.data as UserProfile);
    } catch (err) {
      toast.error("Failed to fetch user details. Please try again.");
    } finally {
      setLoading(false)
    }
    console.log("Fetching details for:", email);
  }

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      navigate('/login');
    }

    UserPersonaldetails(StoredEmail);


  }, []);

  // const handleInputChange = (e:data) => {
  //   const { name, value } = e.target;
  //   setProfile((prev) => (prev ? { ...prev, [name]: value } as UserProfile : prev));
  // };

  const handleSave = async () => {
    if (!profile) return;
    try {
      // Adjust endpoint/body as per your backend API
      // await api.put(`/user/by-email/${profile.email}`, profile);
      toast.success('Profile updated');
      setIsEditing(false);
    } catch (err) {
      toast.error('Failed to update profile');
    }
  };




  return (
    <div className="min-h-screen bg-[#131722] p-4 md:p-8">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="bg-[#3d4963] rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            {/* Profile Picture */}
            <div className="relative">
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-4xl font-bold shadow-lg">
                {(profile?.full_name?.charAt(0) || StoredEmail.trim().charAt(0) || 'U').toUpperCase()}
              </div>
              <button
                className="absolute bottom-0 right-0 bg-white p-2 rounded-full shadow-lg hover:bg-gray-50 transition"
                aria-label="Upload profile picture"
                title="Upload profile picture"
              >
                <Camera className="w-5 h-5 text-gray-700" />
              </button>
            </div>

            {/* Profile Info */}
            <div className="flex-1 text-center md:text-left">
              <div className="flex items-center justify-between md:justify-between mb-4">
                <h1 className="text-3xl font-bold text-white">{profile?.full_name || 'User'}</h1>
                <div
                  className=" flex items-center gap-2"
                >
                  {isEditing ? (
                    <div className='flex flex-row gap-4 text-white'>
                      <button 
                        onClick={() => setIsEditing(false)}
                        className='bg-blue-600 hover:bg-blue-700 rounded-lg px-4 py-2 flex items-center gap-2 transition'>
                        <X className="text-red-500 w-4 h-4" />
                        <span>Close</span>
                      </button>
                      <button 
                        onClick={handleSave}
                        className='bg-blue-600 hover:bg-blue-700 rounded-lg px-4 py-2 flex items-center gap-2 transition'>
                        <Save className="w-4 h-4" />
                        <span>Save</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsEditing(true)}
                      className='bg-blue-600 text-white rounded-lg hover:bg-blue-700 px-4 py-2 flex items-center gap-2 transition cursor-pointer'>
                      <Edit2 className="w-4 h-4" />
                      <span>Edit Profile</span>
                      
                    </button>
                  )}
                </div>
              </div>
              <div className="space-y-2 text-gray-100">
                <div className="flex items-center gap-2 justify-center md:justify-start">
                  <Mail className="w-4 h-4" />
                  <span>{profile?.email || '—'}</span>
                </div>
                <div className="flex items-center gap-2 justify-center md:justify-start">
                  <Phone className="w-4 h-4" />
                  <span>{profile?.mobile_number || '—'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Details */}
        <div className="bg-[#3d4963] rounded-2xl shadow-lg p-6 md:mb-8">
          <h2 className="text-2xl font-bold text-white mb-6">Profile Details</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-100 mb-2">Full Name</label>
              {isEditing ? (
                <input
                  type="text"
                  name="name"
                  id="name"
                  value={profile?.full_name || ''}
                  // onChange={handleInputChange}
                  placeholder="Enter full name"
                  className="w-full px-4 py-2 border border-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-black text-gray-100"
                />
              ) : (
                <p className="px-4 py-2 bg-gray-800 rounded-lg text-gray-100">{profile?.full_name || '—'}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-100 mb-2">Email</label>

              {/* <input
                  type="email"
                  name="email"
                  id="email"
                  value={profile?.email || ''}
                  onChange={handleInputChange}
                  placeholder="Enter email address"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                /> */}
              <p className="px-4 py-2 bg-gray-800 rounded-lg text-gray-100">{profile?.email || '—'}</p>
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-100 mb-2">Phone Number</label>
              {isEditing ? (
                <input
                  type="tel"
                  name="mobile_number"
                  id="mobile_number"
                  value={profile?.mobile_number || ''}
                  // onChange={handleInputChange}
                  placeholder="Enter phone number"
                  className="w-full px-4 py-2 border border-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-black text-gray-100"
                />
              ) : (
                <p className="px-4 py-2 bg-gray-800 rounded-lg text-gray-100">{profile?.mobile_number || '—'}</p>
              )}
            </div>

            {/* Account Created Date */}
            <div className="md:col-span-2">
              <title className="block text-sm font-medium text-gray-50 mb-2 ">Your Account Since: {profile?.created_at ? new Date(profile.created_at).toLocaleDateString("en-GB") : ''} </title>
            </div>
          </div>
        </div>

        <div className='bg-[#3d4963] rounded-2xl shadow-lg p-6 mt-6 min-h-[200px]'>
          <h2 className="text-2xl font-bold text-white">Additional Information</h2>
          <p className="text-gray-100">Your recent Searches.</p>

        </div>

      </div>
    </div>
  )
}
