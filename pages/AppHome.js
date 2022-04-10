import React from 'react'
import AppDock from '../components/Appdock'
import styles from '../styles/Home.module.css'

const AppHome = () => {
  return (
    <div>
      <div  className = {styles.homelockscreen} >
        <AppDock />
        </div>
            
    </div>

  )
}

export default AppHome