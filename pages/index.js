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
        <title>In Suave We Trust</title>
        <meta name="description" content="put a description " />
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
