import React, { useRef, useEffect } from "react";
import AppDock from "../components/Appdock";
import Apps from "../components/Apps";
// import audio from '/20min.mp3'
import styles from "../styles/Home.module.css";
import { Howl, Howler } from "howler";

const AppHome = () => {
  const audioRef = useRef(null);

  useEffect(() => {
    audioRef.current.play();
  }, []);
  return (
    <div>
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
