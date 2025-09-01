import Link from 'next/link'
import React from 'react'

const Navbar = () => {

  return (
    <div>
      <nav className="flex items-center justify-between flex-wrap bg-black p-6">
        <div className="flex items-center flex-shrink-0 text-white mr-6">
          <Link href="/AppHome">
            <img src="/tlogo.png" width="184px" height="150px" />
          </Link>
        </div>
        
        <div className="w-full block flex-grow lg:flex lg:items-center lg:w-auto space-x-6">
          <Link href="/" className="text-white hover:text-[#F2EA6D] transition-colors">
            Home
          </Link>
          <Link href="/photos" className="text-white hover:text-[#F2EA6D] transition-colors">
            Photos
          </Link>
          <Link href="/admindashboard" className="text-white hover:text-[#F2EA6D] transition-colors">
            Admin
          </Link>
        </div>
      </nav>
    </div>
  )
}

export default Navbar