import React, { useEffect, useState } from 'react';
import styles from '../styles/Home.module.css';

const Datetime = () => {
  const [currentTime, setCurrentTime] = useState(null);
  const [currentDate, setCurrentDate] = useState(null);

  useEffect(() => {
    const updateTime = () => {
      const showDate = new Date();
      setCurrentDate(showDate.toDateString());
      setCurrentTime(
        `${showDate.getHours()}:${showDate.getMinutes()}:${showDate.getSeconds()}`
      );
    };

    updateTime(); // run once immediately
    const interval = setInterval(updateTime, 1000); // update every second
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <center>
        <div className={styles.lockscreentime}>
          <h1 className="center font-sans text-5xl">{currentTime ?? "--:--:--"}</h1>
          <br />
          <h2>{currentDate ?? ""}</h2>
        </div>
      </center>
    </div>
  );
};

export default Datetime;
