import Head from "next/head";
import Image from "next/image";
import styles from "../styles/Home.module.css";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import SpotifyPlayer from 'react-spotify-web-playback';

const ViewPost = (bloginfo) => {
 
  
  const { query } = useRouter();
  
  const [data, setData] = useState(null);

  useEffect(() => {
    getPostDetail();
  }, [query?.id]);

  const getPostDetail = async () => {
    if (query?.id) {
      const docRef = doc(db, "posts", query?.id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        let data = docSnap.data();
        data.id = docSnap.id;
        setData(data);
        console.log("Document data:", docSnap.data());
        return;
      }
      console.log(" Document Not found");
    }
  };

  console.log("query", data);

  return (
    <div className="bg-[#000000]">
      <div className="text-center bg-[#000000] p-5  top-0 w-full 2/4 flex items-center">
        <div className="flex grid justify-items-start ">
          <div className="justify-items-start">
            <div className="grid grid-cols-3">
              <Link href="/blog">
                <img
                  src="/arrow.png"
                  className="realitve float-left cursor-pointer "
                  width="100%"
                  height="100%"
                  layout="responsive"
                  objectFit="contain"
                />
              </Link>
              {/* <Link href="/blog">
                <a href="" class="relative text-[#007aff] ">
                  Back
                </a>
              </Link> */}
            </div>
          </div>
        </div>
        <div className="  w-full">
          <h1 className="font-bold text-white text-3xl text-center pr-8 "> In Suave We Trust </h1>
        </div>
      </div>
      <div className="text-center">
        <div> </div>
        <div>
          <h1 className="text-white text-4xl border-b-4 border-[#FFD800] pb-2 italic">
          {data?.title}
          {data?.date}
          </h1>
        </div>
      </div>
      <div class="relative w-full h-full overflow-hidden pt-20">
        {/* // img from uploadimg function goes here however it isn't working at the moment */}
        <img
          src={
            data?.imgUrl ||
            `https://ui-avatars.com/api/?name=${encodeURI(data?.title)}`
          }
          class="opacity-25 	w-full h-full overflow-hidden "
          alt="img"
        />
        <div class="absolute text-center bottom-0 ">
        
        </div>
        {/* i want post description to go here */}
        {/* i can do styling on my own just need functionality down  */}
     
        <p class ="text-white text-center pt-40 text-2xl p-10"> {data?.postText} </p>
      </div>
    </div>
  );
};

export default ViewPost;
