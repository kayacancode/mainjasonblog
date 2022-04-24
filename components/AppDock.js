import React from 'react'
import Image from 'next/image'
import Link from 'next/Link'
import styles from '../styles/Home.module.css'


const AppDock = () => {
  return (
    <div>
      <div className = {styles.dock}>
<div class = " flex justify-center justify-between">
           

<div class = "">
    <Link href ="">
    <Image  class = "cursor-pointer" src= "/mail.png" width={65} height={65} />
    
    </Link>
    <div className = {styles.text}> Contact </div>
    </div>

    <div class = " content-center text-center">
    <Link href ="/Closefreinds">
    <Image class = "cursor-pointer" src= "/contacts.png" width={65} height={65} />
    
    </Link>
    <div className = {styles.text}> Close Freinds</div>
    </div>

    <div class = " content-center text-center">
    <Link href ="">
    <Image class = "cursor-pointer" src= "/photos.png" width={65} height={65} />
    
    </Link>
    <div className = {styles.text}> Photos</div>
    </div>

    </div>





         

            </div>
</div>
  )
}

export default AppDock