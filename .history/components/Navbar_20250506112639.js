import React from 'react'
import img from 'next/image'
import Link from 'next/link'
const Navbar = () => {
  return (
    <div>
        <nav class="flex items-center justify-between flex-wrap bg-black p-6">
  <div class="flex items-center flex-shrink-0 text-white mr-6">
    <Link  href ="/AppHome">
  <img src = "/tlogo.png" width="184px" height="150px" />
  </Link>
  </div>
  
  <div class="w-full block flex-grow lg:flex lg:items-center lg:w-auto">
    <Link href="/" className="text-white hover:text-[#F2EA6D] transition-colors">
      Home
    </Link>
    <Link href="/photos" className="text-white hover:text-[#F2EA6D] transition-colors">
      Photos
    </Link>
    {isAdmin && (
      <Link href="/admindashboard" className="text-white hover:text-[#F2EA6D] transition-colors">
        Admin
      </Link>
    )}
  </div>
</nav>
    </div>
  )
}

export default Navbar