import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar'
import Image from 'next/image'
import { useRouter } from "next/router";
import { collection, doc, setDoc,addDoc,getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import firebase from "../firebase";
import { async } from "@firebase/util";
import { storage } from "../firebase";

import {ref, uploadBytes,listAll, getDownloadURL} from 'firebase/storage'
import {v4} from 'uuid'
import { GrGallery } from "react-icons/gr";
import { BiHappyAlt } from "react-icons/bi";
const createpost = () => {
  const router = useRouter();
  const [imageUpload, setImageUpload] = useState(null)
  const [imageList, setImageList] = useState([]);
  
  const imageListRef = ref(storage, "images/")

  const [title,setTitle] = useState("")
  const [postText,setPostText] = useState("")
  
  const postCollectionRef = collection(db,"posts");
  const [user, setUser] = useState(null);

  
  const createPost = async () => {
    await addDoc(postCollectionRef,{title,postText, author: {name:auth.currentUser.displayName, id:auth.currentUser.uid},
    });
    router.push("/blog")
  };
 
  const uploadImage = () => {
    if (imageUpload ==null) return;
    const imageRef = ref(storage, `images/${imageUpload.name + v4()}`);
    uploadBytes(imageRef,imageUpload).then((snapshot) => {
      getDownloadURL(snapshot.ref).then((url) => {
        setImageList((prev) => [...prev, url])

      })

    });
  };

  useEffect(() => {
    listAll(imageListRef).then((response) => {
      response.items.forEach((item) => {
        getDownloadURL(item).then((url) => {
          setImageList((prev) => [...prev, url]);
        })
      })
      console.log(response);
    })
  },[]);

  return (
    <div class ="h-screen bg-black">
        <div class="flex items-center flex-shrink-0 text-white mr-6">
  <Image src = "/tlogo.png" width="184px" height="150px" />
  </div>
  <div className="text-[#F2EA6D] mx-10">
        <div className="flex justify-center">
          <h1 className="	 font-black	 text-4xl	border-b-2 border-[#F2EA6D] px-20 py-2 	">
            Create Post
          </h1>
        </div>
        <form>

        <input 
        placeholder = "Enter blog name " 
        onChange = {(event) => {
          setTitle(event.target.value);
        }} 
        className="text-2xl text-[#000] mb-4 border border-slate-300 rounded-md py-2  pl-2 pr-3 shadow-sm "
        />
       

          <div className="flex items-center my-2	">
          <label className="text-2xl mb-4">Post:</label>

          
          </div>
          <div className="rounded bg-[#fff] w-9/12">
            <textarea
              
              onChange={(event) => {
                setPostText(event.target.value);
              }} 
              class="resize-none text-[#000] p-4 outline-none max-h-80	h-80 w-full border-b-2 rounded"
              placeholder="enter description"
            ></textarea>
            <div className="flex p-2 items-center">
              <GrGallery className="text-[#000] mx-2" />
              <label class="block">
                <span class="sr-only">Choose profile photo</span>
                <input type="file" 
              onChange = {(event) => {setImageUpload(event.target.files[0])}}

                class="block w-full text-sm text-slate-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-full file:border-0
                  file:text-sm file:font-semibold
                  file:bg-violet-50 file:text-violet-700
                  hover:file:bg-violet-100
                "/>
              </label>
             
<button onClick = {uploadImage} class = "text-black">Upload Image</button>
            </div>
          </div>
          <button onClick = {createPost} className="bg-[#F2EA6D] text-[#000] px-2.5 py-1.5  pr-14 rounded my-2">
            Post
          </button>
        </form>
      </div>

  <div className = "flex">
  {/* {imageList.map((url) => {
    return <img  key ={url.id} src = {url} width={300} height={300}/>;
  })} */}
  </div>
    </div>
  )
}

export default createpost