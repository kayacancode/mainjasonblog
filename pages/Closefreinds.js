import Head from 'next/head'
import Image from 'next/image'
import styles from '../styles/Home.module.css'
import React from "react";
import Link from 'next/link';
const Closefreinds = () => {
  return (
    <div class = " bg-white ">
            <div class = "text-center bg-[#F5F5F5]  top-0 w-full 2/4  border-b-4 ">
                <div class = "flex grid justify-items-start ">
                    <div class ="grid grid-cols-2 pt-5">
                        <Link href ="/AppHome">
                    <Image src= "/arrow.png" class = "realitve float-left cursor-pointer "width="100%" height="100%" layout="responsive" objectFit="contain" />
                    
                    </Link>
                    <Link href= "/AppHome">
                    <a href = "" class= "relative text-[#007aff] ">Back</a>
                    </Link>
               </div>
               </div>
               <div class = "justify-items-center pb-5">
                <h1 class ="font-bold">  Close Freinds</h1>
                
                </div>
                
                </div>

                <div class = "grid grid-rows-11 gap-4 pt-2/4 pl-1.5">
                    <div class = "">
                        <h1 class ="font-bold bg-[#F2F2F2]">K</h1>
                        <Link href= "/kayajones">
                        <h1 class = "cursor-pointer">Kaya Jones</h1>
                        </Link>
                        <Link href= "/">
                        <h1 class = "cursor-pointer">Kenny Mays</h1>
                        </Link>
                       
                    </div>
                    <div class = "">
                        
                        <h1 class ="font-bold bg-[#F2F2F2]">M</h1>
                        <Link href= "/">
                        <h1 class = "cursor-pointer">Mardyny</h1>
                        </Link>
                       
                    </div>
                    <div class = "">
                        <h1 class ="font-bold bg-[#F2F2F2]">Q</h1>
                        <Link href= "/">
                        <h1 class = "cursor-pointer">Q Deezy @ Ratings Game</h1>
                        </Link>
                       
                    </div>
                    <div class = "">
                        <h1 class ="font-bold bg-[#F2F2F2]">R</h1>
                        <Link href= "/">
                        <h1 class = "cursor-pointer">Reuben</h1>
                        </Link>
                       
                    </div>
                    <div class = "">
                        <h1 class ="font-bold bg-[#F2F2F2]">T</h1>
                        <Link href= "/">
                        <h1 class = "cursor-pointer">Trusty Fits ( TyBo and Keanu)</h1>
                        </Link>
                        
                    </div>
                    

                </div>
    </div>
  )
}

export default Closefreinds