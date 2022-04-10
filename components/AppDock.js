import React from 'react'
import styles from '../styles/Home.module.css'
import AppHolder from './AppHolder'

const AppDock = () => {
  return (
    <div>
        
        <div  className={styles.dock}>
            <AppHolder />
            </div>
    </div>
  )
}

export default AppDock