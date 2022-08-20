import img from 'next/image'
import styles from '../styles/Home.module.css'
import React, { useState, useEffect } from "react";
import Link from 'next/link';
import blog from '../pages/blog';
import {getDocs} from 'firebase/firestore'
import {addDoc,collection} from "firebase/firestore";
import { auth, db } from "../firebase";

const Bigpostcard = (bloginfo) => {
    const [postsLists,setPostList] = useState([]);
    const postsCollectionRef = collection(db,"posts");
    useEffect(() => {
      const getPosts = async () => {
        const data = await getDocs(postsCollectionRef)
        setPostList(data.docs.map((doc) => ({...doc.data(), id:doc.id})))
      };
  
      getPosts();
    })

  return (
       <div className="w-full col-span-0 md:col-span-2	 rounded">
        <div class="relative bg-gray-900	w-full h-full overflow-hidden rounded-lg shadow-lg cursor-pointer">
          <img src="/frankoceanpost.png" className="h-full" alt="img" />

          <div class="absolute left-0 bottom-0 ">
            <p class="mx-4 my-2 leading-normal font-black	text-3xl	 text-gray-100">
              {bloginfo.title}
              <br />
              March 12,2022
            </p>
          </div>
        </div>
        
      </div>
      
  )
}

export default Bigpostcard