import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { onAuthStateChanged, signOut } from "firebase/auth";

import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import {addDoc,collection} from "firebase/firestore";
import {getDocs,deleteDoc} from "firebase/firestore"

import Image from 'next/image'
import Navbar from "../components/Navbar";
import Post from '../components/Post'
import Smallpostcard from '../components/Smallpostcard'

export default function admindashboard() {
  const [postsLists,setPostList] = useState([]);
  const postsCollectionRef = collection(db,"posts");
  useEffect(() => {
    const getPosts = async () => {
      const data = await getDocs(postsCollectionRef);
      setPostList(data.docs.map((doc) => ({ ...doc.data(), id: doc.id })));
    };

    getPosts();
  }, []);

  const router = useRouter();

  const [user, setUser] = useState(null);
  useEffect(() => {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        if (!user.emailVerified) {
          // user is signIn, but email is not verified
          router.push("/email-verification");
          return;
        }
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setUser(docSnap.data());
        } else {
          console.log("No such document!");
        }
      } else {
        // you can also redirect to the signIn page. if user is not signIn.
        router.push("/adminsignin");
      }
    });
  }, []);

  function signOutUser() {
    signOut(auth)
      .then(() => {
        console.log("signOut success");
      })
      .catch((error) => {
        // An error happened.
        alert(error.message);
      });
  }

  const deletePost = async(id) => {
    const postDoc = doc(db,"posts",id)
    await deleteDoc(postDoc)
  }

  return (
    <div class = "bg-[#000000]">
        <Navbar />
         <div>
        </div>
      
        <h1 class = "text-center text-[#F2EA6D] font-bold text-3xl border-b-4 border-[#FFD800]">Admin Dashboard</h1>

      <button style={{ background: "red" }} onClick={signOutUser}>
        SignOut
      </button>
      <div className="grid-cols-3 p-16 space-y-2 md:space-y-0 sm:grid sm:gap-3 sm:grid-rows-3">
    
    {postsLists.map((post) => {
  return (
  <div>
  
  <Smallpostcard 
  key ={post.id} 
  title = {post.title} 
  image={post?.imageUrl}
  />
  <div className="deletePost"> 
    <button onClick = {() => {
      deletePost(post.id);
      
    }}>
      {" "}
      &#128465;</button>
  </div>
  </div>
  )
})}
  </div>
    </div>
  );
}
