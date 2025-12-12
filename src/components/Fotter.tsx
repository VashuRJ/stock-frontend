import React from 'react';
import {FaLinkedinIn, FaPhoneAlt, FaMapMarkerAlt } from 'react-icons/fa';
import {RiTwitterXLine } from 'react-icons/ri';
import {SiInstagram,SiGmail} from 'react-icons/si';

// import { useUser } from '../context/UserContext';

export const Footer = () => {
  const currentYear = new Date().getFullYear();
  // const { user, role } = useUser();

  return (
    <footer className="bg-white text-black py-10 px-6 md:px-20 border-t border-gray-300">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        
        {/* Logo & Tagline */}
        <div>
          <div className="flex items-center space-x-2 mb-4">
            <img src="https://staging.concientech.com/wp-content/uploads/2025/04/robin-logo-3.png" alt="Concientech Logo" className="w-10 h-10" />
            <h2 className="grid-col-2 text-xl font-semibold">CONCIENTECH
              <span> IT SOLUTION</span>
            </h2>
          </div>
          <p className="text-sm leading-snug">
            Empowering businesses through innovative technology. We turn ideas into scalable, secure, and smart solutions.
          </p>
          <p className='gap-2 text-sm font-medium pt-3'>SOCIAL</p>
          <p className='text-lg'>Follow us for the latest updates</p>
          <div className="flex space-x-3 mt-4 text-xl">
              <a className='text-[#000000] border rounded-2xl p-2' 
              href="https://x.com/concientech"><RiTwitterXLine /></a>

              <a className='bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 border rounded-2xl p-2' 
                href="https://www.instagram.com/conc.ientechitsolution?igsh=MXJzem01ZGpucWk4Mw=="><SiInstagram /></a>

              <a className='bg-[#0077B5] text-white border rounded-2xl p-2' 
                href="https://www.linkedin.com/company/concientech-solutions/"><FaLinkedinIn /></a>

              <a className='text-[#ed0404e9] border rounded-2xl p-2' 
                  href="mailto:hr@concientech.com"><SiGmail /></a>
          </div>
        </div>

        {/* Navigation Links */}
        <div className='flex flex-row space-x-6'>
          <ul className="space-y-2 text-sm">
            <li><a href="/" className="hover:underline">Home</a></li>
            <li><a href="/about" className="hover:underline">About</a></li>
            <li><a href="/blog" className="hover:underline">Blog</a></li>
            <li><a href="/contact" className="hover:underline">Contact Us</a></li>
            <li><a href="/owner" className="hover:underline">Owner Profile</a></li>
            <li><a href="/services" className="hover:underline">Services</a></li>
            <li><a href="/privacy" className="hover:underline">Privacy Policy</a></li>
            <li><a href="/terms" className="hover:underline">Terms of Service</a></li>
          </ul>
          {/* <p>Other Links</p>
          <ul>
            <li><a href="/admin" className="hover:underline">Admin</a></li>
            
          </ul> */}
        </div>

        {/* Contact Information */}
        <div>
          <h4 className="font-semibold mb-4">Contact Us</h4>
          <ul className="space-y-3 text-sm">
            <li className="flex items-center space-x-2">
              <SiGmail className='text-[#ed0404e9]' /> <span>help@concientech.com</span>
            </li>
            <li className="flex items-center space-x-2">
              <FaPhoneAlt className='text-[#1c92e7e9]' /> <span>(+91) 1234567890</span>
            </li>
            <li className="flex items-center space-x-2">
              <FaMapMarkerAlt className='text-[#1330e9e9]' /> <span>Laksar Road, Kankhal, Haridwar <br />
                Uttarakhand, India, 249408</span>
            </li>
          </ul>
        </div>

        {/* Newsletter Signup (active, sends to hr@concientech.com) */}
        <div>
          <h4 className="font-semibold mb-4">Sign up for Update</h4>
          <form
            className="flex flex-row md:flex-row space-y-0 md:space-y-0 md:space-x-0"
            action="mailto:hr@concientech.com"
            method="POST"
            encType="text/plain"
            onSubmit={() => setTimeout(() => window.location.reload(), 100)}
          >
            <input
              type="email"
              name="email"
              required
              placeholder="E-Mail*"
              className="px-4 py-2 bg-gray-100 rounded-l-md w-full focus:outline-none"
            />
            <button type="submit" className="bg-blue-500 py-2 text-white px-4 rounded-r-md hover:bg-blue-800">
              Subscribe*
            </button>
          </form>
        </div>
      </div>

      {/* Bottom Text */}
      <div className="mt-10 text-center text-sm text-gray-500">
        &copy; {currentYear} Concientech It Solution. All rights reserved.
      </div>
    </footer>
  );
};