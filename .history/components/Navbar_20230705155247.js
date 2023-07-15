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
  
    <div>
      <Link href= "/createpost">
      <a href="" class="inline-block text-2xl px-4 py-2 mx-2 leading-none  text-[#F2EA6D]  font-bold hover:text-white mt-4 lg:mt-0">Create a post</a>
      </Link>

    </div>
  </div>
</nav>
    </div>
  )
}

export default Navbar