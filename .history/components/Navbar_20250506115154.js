import React, { useState, useEffect } from 'react'
import img from 'next/image'
import Link from 'next/link'
import { auth, db } from '../firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'

const Navbar = () => {
  const [isAdmin, setIsAdmin] = useState(false)
  const [user, setUser] = useState(null)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user)
        // Check if user is admin
        const userDoc = await getDoc(doc(db, "users", user.uid))
        if (userDoc.exists() && userDoc.data().isAdmin) {
          setIsAdmin(true)
        }
      } else {
        setUser(null)
        setIsAdmin(false)
      }
    })

    return () => unsubscribe()
  }, [])

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