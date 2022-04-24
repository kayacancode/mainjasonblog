import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
const Navbar = () => {
  return (
    <div>
        <nav class="flex items-center justify-between flex-wrap bg-black p-6">
  <div class="flex items-center flex-shrink-0 text-white mr-6">
  <Image src = "/tlogo.png" width="184px" height="150px" />
  </div>
  
  <div class="w-full block flex-grow lg:flex lg:items-center lg:w-auto">
  
    <div>
      <Link href= "/createpost">
      <a href="" class="inline-block text-lg px-4 py-2 mx-2 leading-none  text-[#F2EA6D]  hover:text-white mt-4 lg:mt-0">Create</a>
      </Link>
      <a href="#" class="inline-block text-lg px-4 py-2 mx-2 leading-none  text-[#F2EA6D]   hover:text-white mt-4 lg:mt-0">Sign out</a>

    </div>
  </div>
</nav>
    </div>
  )
}

export default Navbar