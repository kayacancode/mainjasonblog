import Head from "next/head";
import Image from "next/image";
import styles from "../styles/Home.module.css";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import Post from "../components/Post";
import Smallpostcard from "../components/Smallpostcard";
import Bigpostcard from "../components/Bigpostcard";
import { useRouter } from "next/router";

import { getDocs } from "firebase/firestore";
import { addDoc, collection } from "firebase/firestore";
import { auth, db } from "../firebase";
const blog = (post) => {
  const router = useRouter();

  const [postsLists, setPostList] = useState([]);
  const postsCollectionRef = collection(db, "posts");
  useEffect(() => {
    const getPosts = async () => {
      const data = await getDocs(postsCollectionRef);
      setPostList(data.docs.map((doc) => ({ ...doc.data(), id: doc.id })));
    };

    getPosts();
  }, []);

  console.log("postsLists", postsLists);

  return (
    <div className=" bg-[#FFFFFF] md:h-screen bg-black lg:h-screen bg-black ">
      
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
      <div className=" text-center text-white bg-[#000000] p-5  top-0 w-full 2/4 flex items-center	 ">
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
          <h1 className="font-bold text-5xl"> CATEGORY: ALBUM REVIEWS
 </h1>
        </div>
      </div>
      <div className="flex justify-between pt-4">
        <div> </div>
        <div>
          
        </div>
        <div className="px-16">
          <Link href="/adminsignin">
            <Image src="/adminprofile.png" width="50px" height="50px" />
          </Link>
        </div>
      </div>
      <div className="grid-cols-3 p-16 space-y-2 md:space-y-0 grid-cols-3 sm:grid sm:gap-3 sm:grid-cols-3 ">
        {postsLists.map((post) => {
          return (
            <div>
              {/* <Post key ={post.id} title = {post.title}/>  */}
              <Smallpostcard
                image={post?.imageUrl}
                key={post.id}
                title={post.title}
                click={() => router.push("/view-post?id=" + post.id)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
export default blog;
