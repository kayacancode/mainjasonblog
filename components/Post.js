
import Image from 'next/image'
import styles from '../styles/Home.module.css'
import React, { useState, useEffect } from "react";
import Link from 'next/link';
import blog from '../pages/blog';
const Post = (bloginfo) => {

  return (
    <div>
                    <div class = "bg-black p-16 grid grid-cols-3 grid-rows-4 gap-1">


               <div class = "   rounded-lg col-span-2 	">

                    <div class = "relative">
                    <a class="absolute inset-0 z-10 bg-black text-center text-white flex flex-col items-center justify-center opacity-0 hover:opacity-100 bg-opacity-90 duration-300">
                            <h1  class='tracking-wider text-w' >{bloginfo.title}</h1>
                            <p  class="mx-auto">{bloginfo.date}</p>
      </a>
               <Image src="/testimagepost.png" class= ""  width = "988px " height = "465px " objectFit = "cover"/>

               </div>
              
               </div>
               <div class = "rounded-lg">

                    <div class = "relative">
                    <a class="absolute inset-0 z-10 bg-black text-center text-white flex flex-col items-center justify-center opacity-0 hover:opacity-100 bg-opacity-90 duration-300">
                            <h1  class='tracking-wider text-w' >{bloginfo.title}</h1>
                            <p  class="mx-auto">{bloginfo.date}</p>
                    </a>
                    <Image src="/testimagepost.png" class= ""  width = "483px " height = "465px " objectFit = "cover"/>

                    </div>

            </div>
               <div class = "bg-blue-500 text white text-center text-5xl  ">1</div>
               <div class = " bg-blue-500 text white text-center text-5xl ">1</div>
               <div class = " bg-blue-500 text white text-center text-5xl  ">1</div>
               <div class = " bg-blue-500 text white text-center text-5xl  ">1</div>
               <div class = " bg-blue-500 text white text-center text-5xl   ">1</div>

               </div>
               
    </div>
  )
}

export default Post