import Head from 'next/head'
import Image from 'next/image'
import styles from '../styles/Home.module.css'
import React from "react";
import Link from 'next/link';

const ContactCard = (info) => {
  return (
    <div class = "bg-[#F5F5F5] ">
        <div class = "text-center justify-items-center  bg-white ">
        <div class = "flex grid justify-items-start ">
                    <div class ="grid grid-cols-2 pt-5 ">
                        <Link href ="/Closefreinds">
                    <Image src= "/arrow.png" class = "realitve float-left cursor-pointer "width="100%" height="100%" layout="responsive" objectFit="contain" />
                    
                    </Link>
                    <Link href= "/Closefreinds">
                    <a href = "" class= "relative text-[#007aff] ">Back</a>
                    </Link>
               </div>
               </div>
               <div class = "pt-5 pb-24">
                <Image src= "/contactpic.png" width="85px" height="85px"  />
                <h1 class = "font-bold  text-2xl">{info.name}</h1>
                </div>
    </div>

    <div class = "pt-5">
    <div class = "grid grid-rows-2 gap-4 pt-2/4 pl-1.5">

    <div class = "">
                        <div class = "pb-4 ">
                            <h1>Website: <a href={info.websitelink}>{info.websitename}</a>
</h1>

                        </div>
                        
                        <div class = "pb-4">

                        <h1 class = "py-2">Notes:</h1>
                        <h1 class = "py-2">Email:<a href={info.emailLink}>{info.email}</a></h1>
                        <h1 class = "py-2">Instagram: <a href={info.instaLink}>{info.insta}</a></h1>
                        <h1 class = "py-2">Twitter:<a href={info.twitterLink}>{info.twitter}</a></h1>
                        <h1 class = "py-2">Tiktok:<a href={info.tiktokLink}>{info.tiktok}</a></h1>
                        <h1 class = "py-2">Youtube:<a href={info.ytlink}>{info.yt}</a></h1>

                        </div>
                       
                       
                    </div>
    </div>
    </div>
    </div>
  )
}

export default ContactCard