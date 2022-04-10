import React from 'react'
import styles from '../styles/Home.module.css'


var datetime = () => 
{
    var showDate = new Date();
    var displaytodaysdate = showDate.getDate() + (showDate.getMonth());
    var dt= showDate.toDateString();
    var displaytime = showDate.getHours() + showDate.getMinutes();
    var currentTime = new Date().toLocaleTimeString();
    return(
        <div>
            <center>
                <div className = {styles.lockscreentime}>
                   
                <h1 type="text" class = " center font-sans text-5xl	 " value={displaytodaysdate} readonly= "true"/>
                <h1 type="text" class = "center font-sans text-5xl	" value={currentTime} />
                
                {currentTime}
                < br />
                {dt}
        </div>
                 </center>
        </div>
        
    )
}
export default datetime;
