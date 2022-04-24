import Head from 'next/head'
import Image from 'next/image'
import styles from '../styles/Home.module.css'
import React from "react";
import Link from 'next/link';
import Post from '../components/Post'
const blog = (bloginfo) => {
  return (
    <div class = "bg-[#000000]">
           <div class = "text-center bg-[#FFFFFF]  top-0 w-full 2/4 ">
                <div class = "flex grid justify-items-start ">
                    <div class = "justify-items-start">
                    <div class ="grid grid-cols-3 pt-5">
                        <Link href ="/AppHome">
                    <Image src= "/arrow.png" class = "realitve float-left cursor-pointer "width="100%" height="100%" layout="responsive" objectFit="contain" />
                    
                    </Link>
                    <Link href= "/AppHome">
                    <a href = "" class= "relative text-[#007aff] ">Back</a>
                    </Link>

               </div>
               </div>

               </div>
               <div class = " pb-5 w-full">
                <h1 class ="font-bold text-5xl">  In Suave We Trust</h1> 
                </div>
                </div>
               <h1 class = "  text-center text-white  text-4xl align-middle border-b-4 border-[#FFD800] 	">
                   Album Reviews
                   </h1>
                   

               <Post />
               
   
    </div>
  )
}

export default blog