import React from 'react'
import AppDock from '../components/Appdock'
import Apps from '../components/Apps'
import styles from '../styles/Home.module.css'

const AppHome = () => {
  return (
    <div>
      <div  className = {styles.homelockscreen} >
       
       <Apps />
       {/* App DOCK */}
        {/* <AppDock  /> */}
        <AppDock />

      <div className = {styles.pagecontainer} >
      
        <div className = {styles.page1} >
       
        </div>
        <div className = {styles.page2} >
          
          </div>
      </div>
        </div>
            
    </div>

  )
}

export default AppHome