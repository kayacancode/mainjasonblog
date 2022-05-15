import Head from 'next/head'
import Image from 'next/image'
import styles from '../styles/Home.module.css'
import Datetime from '../components/Datetime'
import React from "react";
import Link from 'next/link';

export default function Home() {
 
  return (
  
    <Link href="/AppHome">
    <div  className = {styles.lockscreen}>
    


      <Head>
      {/* Coded by: Kaya Jones
  website: https://kayacancode.com/ */}
        <title>In Suave We Trust</title>
        <meta charset="UTF-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        <meta http-equiv="X-UA-Compatible" content="ie=edge" />
        <meta name ="title" content = "In Suave We Trust" />
        <meta name="description" content="In Suave We Trust · Album Reviews · New Music Reviews · Trusty Fits. Menu . Welcome to In Suave We Trust! " />
        <meta property="og:title" content="In Suave We Trust"/>
        <meta name="og:description" content="In Suave We Trust · Album Reviews · New Music Reviews · Trusty Fits. Menu . Welcome to In Suave We Trust! " />
        <meta name="og:url" content="insuavewetrust.com/ " />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="In Suave We Trust"/>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div>
        <div className = {styles.lockscreencontents}  />
<div class = "py-10 block h-screen">
<div class = "z-30">
    <Datetime />
    </div>
  
< br/>    
<div class = {styles.lockscreenslide}>
    <h1 class ="text-center	text-2xl ">touch to unlock </h1>
    </div>
    </div>
          </div>
          </div>
          </Link>
      
  )
}
