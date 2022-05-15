import React, { useRef, useEffect } from "react";
import AppDock from "../components/Appdock";
import Apps from "../components/Apps";
// import audio from '/20min.mp3'
import styles from "../styles/Home.module.css";
import { Howl, Howler } from "howler";
import Head from 'next/head'

const AppHome = () => {
  const audioRef = useRef(null);

  useEffect(() => {
    audioRef.current.play();
  }, []);
  return (
    <div>
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
      <div className={styles.homelockscreen}>
        <audio id="myAudio" ref={audioRef}>
          <source src="/20min.mp3" type="audio/mpeg" />
        </audio>
        <Apps />
        <AppDock />

        <div className={styles.pagecontainer}>
          <div className={styles.page1}></div>
          <div className={styles.page2}></div>
        </div>
      </div>
    </div>
  );
};

export default AppHome;
