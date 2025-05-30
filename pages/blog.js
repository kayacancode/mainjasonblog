import Head from "next/head";
import Image from "next/image";
import styles from "../styles/Home.module.css";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import Post from "../components/Post";
import Smallpostcard from "../components/Smallpostcard";
import Bigpostcard from "../components/Bigpostcard";
import { useRouter } from "next/router";

import { getDocs, query, where } from "firebase/firestore";
import { addDoc, collection } from "firebase/firestore";
import { auth, db } from "../firebase";
const blog = (post) => {
  const router = useRouter();

  const [postsLists, setPostList] = useState([]);
  const postsCollectionRef = collection(db, "posts");
  const draftCollectionRef = collection(db, "drafts");

  useEffect(() => {
    let isMounted = true; // Flag to track if component is mounted

    const getPosts = async () => {
      try {
        // Query for published posts only
        const q = query(postsCollectionRef, where("isPublished", "==", true));
        const data = await getDocs(q);
        
        // Only update state if component is still mounted
        if (isMounted) {
          setPostList(data.docs.map((doc) => ({ ...doc.data(), id: doc.id })));
        }
      } catch (error) {
        console.error("Error fetching posts:", error);
      }
    };

    getPosts();

    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, []);
  // useEffect(() => {
  //   const fetchData = async () => {
  //     const postsSnapshot = await getDocs(postsCollectionRef);
  //     const draftsSnapshot = await getDocs(draftCollectionRef);
  
  //     const postsData = postsSnapshot.docs.map((doc) => ({
  //       ...doc.data(),
  //       id: doc.id,
  //     }));
  //     const draftsData = draftsSnapshot.docs.map((doc) => ({
  //       ...doc.data(),
  //       id: doc.id,
  //     }));
  
  //     setPostList([...postsData, ...draftsData]);
  //   };
  
  //   fetchData();
  // }, []);

  // console.log("postsLists", postsLists);

  return (
    <body className="min-h-screen bg-[#1a1a1a]">
    <div className="min-h-screen bg-[#1a1a1a]">
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
      <div className="text-center text-white bg-[#1a1a1a] p-5 top-0 w-full flex items-center justify-between shadow-lg">
        <div className="flex items-center">
          <Link href="/AppHome" className="hover:opacity-80 transition-opacity">
            <img
              src="/arrow.png"
              className="w-8 h-8 cursor-pointer"
              alt="Back"
            />
          </Link>
        </div>
        
        <div className="flex-1">
          <h1 className="font-bold text-3xl">Posts</h1>
        </div>

        <div className="flex items-center">
          <Link href="/adminsignin" className="hover:opacity-80 transition-opacity">
            <img src="/adminprofile.png" width="40px" height="40px" alt="Admin" />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 p-8">
        {postsLists.map((post) => (
          <div key={post.id} className="transform hover:scale-105 transition-transform duration-200">
            <Smallpostcard
              img={post?.imgUrl}
              title={post.title}
              click={() => router.push("/view-post?id="+ post.id + "&title="+ post.title.toLowerCase().replace(/\s/g, ""))}
            />
          </div>
        ))}
      </div>
    </div>
    </body>
  );
};
export default blog;
