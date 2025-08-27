import Image from "next/image";
import styles from "../styles/Home.module.css";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import blog from "../pages/blog";
import { getDocs } from "firebase/firestore";
import { addDoc, collection } from "firebase/firestore";
import { getStorage, ref, getDownloadURL } from "firebase/storage";
import { auth, db } from "../firebase";

const Smallpostcard = (bloginfo) => {
  // Remove unnecessary state and Firebase calls since data is passed as props
  // const [postsLists, setPostList] = useState([]);
  // const postsCollectionRef = collection(db, "posts");
  const [url, setUrl] = useState();

  // Remove this useEffect entirely since we don't need to fetch posts here
  // The data is already passed as props from the parent component
  // useEffect(() => {
  //   const getPosts = async () => {
  //     const data = await getDocs(postsCollectionRef);
  //     setPostList(data.docs.map((doc) => ({ ...doc.data(), id: doc.id })));
  //   };

  //   getPosts();
  // });

  useEffect(() => {
    let isMounted = true; // Flag to track if component is mounted

    const func = async () => {
      try {
        const storage = getStorage();
        const imgListRef = ref(storage, "imgs/");
        // await getDownloadURL(reference).then((x) => {
        //   if (isMounted) {
        //     setUrl(x);
        //   }
        // })
      } catch (error) {
        console.error("Error fetching image:", error);
      }
    };

    func();

    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, []); // Added empty dependency array

  return (
    <div
      onClick={() => bloginfo?.click && bloginfo.click()}
      className="relative bg-gray-900 w-full h-64 overflow-hidden rounded-lg shadow-lg cursor-pointer"
    >
      <img
        src={
          bloginfo?.img ||
          `https://ui-avatars.com/api/?name=${encodeURI(bloginfo?.title)}`
        }
        alt={bloginfo?.title || "Post image"}
        className="w-full h-full object-cover"
      />

      <div className="absolute left-0 bottom-0 w-full bg-gradient-to-t from-black/70 to-transparent">
        <p className="mx-4 my-2 font-bold text-xl text-white truncate">
          {bloginfo.title}
        </p>
      </div>
    </div>
  );
}
export default Smallpostcard;
