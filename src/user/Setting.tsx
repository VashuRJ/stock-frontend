import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom';
import { Settings, Bell, Shield, Eye, Moon, Globe, Trash2, Save, ChevronRight } from 'lucide-react';
import { toast } from 'react-toastify';

export const Setting = () => {
  const navigate = useNavigate();
  
  // Settings State
  const [notifications, setNotifications] = useState({
    emailAlerts: true,
    priceAlerts: true,
    newsUpdates: false,
    weeklyReport: true,
  });

  const [privacy, setPrivacy] = useState({
    profileVisibility: 'public',
    showActivity: true,
    twoFactorAuth: false,
  });

  const [preferences, setPreferences] = useState({
    darkMode: true,
  });

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      navigate('/login');
    }
  }, []);

  const handleSaveSettings = () => {
    // Save settings to backend
    toast.success('Settings saved successfully!');
  };

  const handleDeleteAccount = () => {
    if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      toast.error('Account deletion requested');
    }
  };

  return (
    <div className="min-h-screen bg-[#131722] p-4 md:p-8">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="bg-[#3d4963] rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Settings className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Settings</h1>
              <p className="text-gray-100">Manage your account preferences</p>
            </div>
          </div>
        </div>

        {/* Notifications Settings */}
        <div className="bg-[#3d4963] rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <Bell className="w-6 h-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-100">Notifications</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div>
                <p className="font-medium text-gray-100">Email Alerts</p>
                <p className="text-sm text-gray-300">Receive important updates via email</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifications.emailAlerts}
                  onChange={(e) => setNotifications({ ...notifications, emailAlerts: e.target.checked })}
                  className="sr-only peer"
                  placeholder='receive update'
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div>
                <p className="font-medium text-gray-100">Price Alerts</p>
                <p className="text-sm text-gray-300">Get notified when stocks hit your target price</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifications.priceAlerts}
                  onChange={(e) => setNotifications({ ...notifications, priceAlerts: e.target.checked })}
                  className="sr-only peer"
                  placeholder='get notified from the website'
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div>
                <p className="font-medium text-gray-100">News Updates</p>
                <p className="text-sm text-gray-300">Receive market news and analysis</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifications.newsUpdates}
                  onChange={(e) => setNotifications({ ...notifications, newsUpdates: e.target.checked })}
                  className="sr-only peer"
                  placeholder='new Updates'
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium text-gray-100">Weekly Report</p>
                <p className="text-sm text-gray-300">Get weekly portfolio summary</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifications.weeklyReport}
                  onChange={(e) => setNotifications({ ...notifications, weeklyReport: e.target.checked })}
                  className="sr-only peer"
                  placeholder='Weekly reports'
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Privacy & Security */}
        <div className="bg-[#3d4963] rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="w-6 h-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-100">Privacy & Security</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium text-gray-100">Two-Factor Authentication</p>
                <p className="text-sm text-gray-300">Add extra security to your account</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={privacy.twoFactorAuth}
                  onChange={(e) => setPrivacy({ ...privacy, twoFactorAuth: e.target.checked })}
                  className="sr-only peer"
                  title='two factor authentication'
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>

        </div>

        {/* Danger Zone */}
        <div className="bg-[#3d4963] rounded-2xl shadow-lg p-6 mb-6 border-2 border-red-200">
          <div className="flex items-center gap-3 mb-6">
            <Trash2 className="w-6 h-6 text-red-600" />
            <h2 className="text-2xl font-bold text-red-600">Danger Zone</h2>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-white">Delete Account</p>
              <p className="text-sm text-gray-200">Permanently delete your account and all data</p>
            </div>
            <button
              onClick={handleDeleteAccount}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Delete Account
            </button>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSaveSettings}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition flex items-center gap-2 font-medium shadow-lg"
          >
            <Save className="w-5 h-5" />
            Save All Settings
          </button>
        </div>

      </div>
    </div>
  )
}
