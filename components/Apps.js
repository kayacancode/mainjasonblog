import React from 'react'
import Image from 'next/image'
import Link from 'next/Link'
import styles from '../styles/Home.module.css'

const Apps = () => {
  return (
    <div>
    {/* <div class = "flex "> */}
    <div class = "  mt-8 grid grid-cols-4 gap-4  content-center  ">

      <div class = " content-center text-center">
    <Link href ="">
    <Image src= "/applemusic.png" width={65} height={65} />
    
    </Link>
    <div className = {styles.text}> Apple Music</div>
    </div>


    <div class = "  content-center text-center">
    <Link href ="">
    <Image src= "/spotify.png" width={65} height={65} />
    
    </Link>
    <div className = {styles.text}> Spotify</div>
    </div>
    
    <div class = " content-center text-center">
    <Link href ="">
    <Image src= "/tiktok.png" width={65} height={65} />
    
    </Link>
    <div className = {styles.text}> Tiktok</div>
    </div>
    
    <div class = " content-center text-center">
    <Link href ="">
    <Image src= "/facebook.png" width={65} height={65} />
    
    </Link>
    <div className = {styles.text}> Facebook</div>
    </div>
    
    <div class = " content-center text-center">
    <Link href ="">
    <Image src= "/calendar.png" width={65} height={65} />
    
    </Link>
    <div className = {styles.text}> Calendar</div>
    </div>
    
    <div class = " content-center text-center">
    <Link href ="">
    <Image src= "/anchor.png" width={65} height={65} />
    
    </Link>
    <div className = {styles.text}> Anchor</div>
    </div>
    <div class = " content-center text-center">
    <Link href ="">
    <Image src= "/beamsfm.png" width={65} height={65} />
    
    </Link>
    <div className = {styles.text}> Beams</div>
    </div>
    <div class = " content-center text-center">
    <Link href ="">
    <Image src= "/yt.png" width={65} height={65} />
    
    </Link>
    <div className = {styles.text}> Youtube</div>
    </div>

    <div class = " content-center text-center">
    <Link href ="">
    <Image src= "/trustyfits.png" width={65} height={65} />
    
    </Link>
    <div className = {styles.text}> Trusty Fits</div>
    </div>


    <div class = " content-center text-center">
    <Link href ="/blog">
    <Image src= "/blog.png" width={65} height={65} />
    
    </Link>
    <div className = {styles.text}> Blog </div>
    </div>


    <div class = " content-center text-center">
    <Link href ="">
    <Image src= "/insta.png" width={65} height={65} />
    
    </Link>
    <div className = {styles.text}> Instagram </div>
    </div>
    
   
    <div class = " content-center text-center">
    <Link href ="">
    <Image src= "/twitter.png" width={65} height={65} />
    
    </Link>
    <div className = {styles.text}> Twitter</div>
    </div>


    <div class = " content-center text-center">
    <Link href ="">
    <Image src= "/jammy.png" width={65} height={65} />
    
    </Link>
    <div className = {styles.text}>Jammy</div>
    </div>



    </div>

    

</div>
  )
}

export default Apps