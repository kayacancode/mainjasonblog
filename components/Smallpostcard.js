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
  const [postsLists, setPostList] = useState([]);
  const postsCollectionRef = collection(db, "posts");
  const [url, setUrl] = useState();
  useEffect(() => {
    const getPosts = async () => {
      const data = await getDocs(postsCollectionRef);
      setPostList(data.docs.map((doc) => ({ ...doc.data(), id: doc.id })));
    };

    getPosts();
  });

  useEffect(() => {
    const func = async () => {
      const storage = getStorage();
      const imageListRef = ref(storage, "images/");
      // await getDownloadURL(reference).then((x) => {
      //   setUrl(x);
      // })
    };
    func();
  }, []);

  return (
    <div>
      <div className="w-full rounded">
        <div
          onClick={() => bloginfo?.click()}
          class="relative bg-gray-900	w-full h-full overflow-hidden rounded-lg shadow-lg cursor-pointer"
        >
          <img
            src={
              bloginfo?.image ||
              `https://ui-avatars.com/api/?name=${encodeURI(bloginfo?.title)}`
            }
            class="opacity-25 w-full h-full overflow-hidden "
            alt="img"
          />
          {/* <div className="bg-gray-900	 h-full w-full"></div> */}
          <div class="absolute left-0 bottom-0 ">
            <p class="mx-4 my-2 leading-normal font-black	text-3xl text-gray-100">
              {bloginfo.title} <br />
              March 12, 2022
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Smallpostcard;
