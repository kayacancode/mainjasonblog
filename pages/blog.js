import Head from 'next/head'
import Image from 'next/image'
import styles from '../styles/Home.module.css'
import React, { useState, useEffect } from "react";
import Link from 'next/link';
import Post from '../components/Post';
import Smallpostcard from '../components/Smallpostcard'
import Bigpostcard from '../components/Bigpostcard'

import {getDocs} from 'firebase/firestore'
import {addDoc,collection} from "firebase/firestore";
import { auth, db } from "../firebase";
const blog = (post) => {
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
    <div className="bg-[#000000]">
    <div className="text-center bg-[#FFFFFF] p-5  top-0 w-full 2/4 flex items-center	 ">
      <div className="flex grid justify-items-start ">
        <div className="justify-items-start">
          <div className="grid grid-cols-3">
            <Link href="/AppHome">
              <Image
                src="/arrow.png"
                className="realitve float-left cursor-pointer "
                width="100%"
                height="100%"
                layout="responsive"
                objectFit="contain"
              />
            </Link>
            <Link href="/AppHome">
              <a href="" class="relative text-[#007aff] ">
                Back
              </a>
            </Link>
          </div>
        </div>
      </div>
      <div className="  w-full">
        <h1 className="font-bold text-5xl"> In Suave We Trust</h1>
      </div>
    </div>

    <div className="flex justify-between pt-4">
      <div></div>
      <div>
        <h1 className="text-white text-4xl border-b-4 border-[#FFD800] pb-2 ">
          Album Reviews
        </h1>
      </div>
      <div className="px-16">
        <Link href="/adminsignin">
          <Image src="/adminprofile.png" width="50px" height="50px" />
        </Link>
      </div>
    </div>
    <div className="grid-cols-3 p-16 space-y-2 md:space-y-0 sm:grid sm:gap-3 sm:grid-rows-3">
    
    {postsLists.map((post) => {
  return (
  <div>
  {/* <Post key ={post.id} title = {post.title}/>  */}
  <Smallpostcard key ={post.id} title = {post.title} />
  </div>
  )
})}
  </div>
  </div>
);
};
export default blog


