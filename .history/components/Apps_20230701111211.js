import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import styles from '../styles/Home.module.css'

const Apps = () => {
  return (
    <div>
    {/* <div className = "flex "> */}
    <div className = "  mt-8 mx-5 grid grid-cols-4 gap-4  content-center  ">

      {/* <div className = " content-center text-center">
    <Link href ="https://music.apple.com/profile/insuavewetrust">
    <Image src= "/applemusic.png" className="cursor-pointer" width={65} height={65} />
    
    </Link>
    <div className = {styles.text}> Apple Music</div>
    </div> */}


    <div className = "  content-center text-center">
    <Link href ="https://open.spotify.com/user/suavemontana">
    <Image src= "/spotify.png" className="cursor-pointer" width={65} height={65} />
    
    </Link>
    <div className = {styles.text}> Spotify</div>
    </div>
    
    <div className = " content-center text-center">
    <Link href ="https://vm.tiktok.com/TTPdBsn3ML/">
    <Image src= "/tiktok.png" className="cursor-pointer" width={65} height={65} />
    
    </Link>
    <div className = {styles.text}> Tiktok</div>
    </div>
{/*     
    <div className = " content-center text-center">
    <Link href ="https://www.facebook.com/InSuaveWeTrust/">
    <Image src= "/facebook.png"  className="cursor-pointer"width={65} height={65} />
    
    </Link>
    <div className = {styles.text}> Facebook</div>
    </div> */}
    
    <div className = " content-center text-center">
    <Link href ="https://calendar.google.com/calendar/u/1?cid=amFzb24uc2VreWVyZUBpbnN1YXZld2V0cnVzdC5jb20">
    <Image src= "/calendar.png"  className="cursor-pointer" width={65} height={65} />
    
    </Link>
    <div className = {styles.text}> Calendar</div>
    </div>
    
    <div className = " content-center text-center">
    <Link href ="https://anchor.fm/insuavewetrust">
    <Image src= "/anchor.png" className="cursor-pointer" width={65} height={65} />
    
    </Link>
    <div className = {styles.text}> Anchor</div>
    </div>
    {/* <div className = " content-center text-center">
    <Link href ="https://beams.fm/insuavewetrust">
    <Image src= "/beamsfm.png" className="cursor-pointer" width={65} height={65} />
    
    </Link>
    <div className = {styles.text}> Beams</div>
    </div> */}
    <div className = " content-center text-center">
    <Link href ="https://www.youtube.com/channel/UC_9_5ERNVJIBBKjd0izfG8g">
    <Image src= "/yt.png" className="cursor-pointer" width={65} height={65} />
    
    </Link>
    <div className = {styles.text}> Youtube</div>
    </div>

    <div className = " content-center text-center">
    <Link href ="https://instagram.com/trustyfits?igshid=YmMyMTA2M2Y=">
    <Image src= "/trustyfits.png" className="cursor-pointer" width={65} height={65} />
    
    </Link>
    <div className = {styles.text}> Trusty Fits</div>
    </div>


    <div className = " content-center text-center">
    <Link href ="/blog">
    <Image src= "/blog.png" className="cursor-pointer" width={65} height={65} />
    
    </Link>
    <div className = {styles.text}> Blog </div>
    </div>


    <div className = " content-center text-center">
    <Link href ="https://www.instagram.com/insuavewetrust/">
    <Image src= "/insta.png" className="cursor-pointer" width={65} height={65} />
    
    </Link>
    <div className = {styles.text}> Instagram </div>
    </div>
    
   
    <div className = " content-center text-center">
    <Link href ="https://twitter.com/INSUAVEWETRUSTx">
    <Image src= "/twitter.png" className="cursor-pointer" width={65} height={65} />
    
    </Link>
    <div className = {styles.text}> Twitter</div>
    </div>


    <div className = " content-center text-center">
    <Link href ="https://thejammybrand.com/">
    <Image src= "/jammy.png"  className="cursor-pointer" width={65} height={65} />
    
    </Link>
    <div className = {styles.text}>Jammy</div>
    </div>



    </div>

    

</div>
  )
}

export default Apps