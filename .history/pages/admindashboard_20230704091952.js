import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { onAuthStateChanged, signOut } from "firebase/auth";

import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import {addDoc,collection} from "firebase/firestore";
import {getDocs,deleteDoc} from "firebase/firestore"

import Image from "next/image";
import Navbar from "../components/Navbar";
import Post from '../components/Post'
import Smallpostcard from '../components/Smallpostcard'
import AdminPosts from '../components/AdminPosts'
export default function admindashboard() {
  const [postsLists,setPostList] = useState([]);
  const postsCollectionRef = collection(db,"posts");
  const draftCollectionRef = collection(db, "drafts");

  useEffect(() => {
    const fetchData = async () => {
      const postsSnapshot = await getDocs(postsCollectionRef);
      const draftsSnapshot = await getDocs(draftCollectionRef);
  
      const postsData = postsSnapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      }));
      const draftsData = draftsSnapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      }));
  
      setPostList([...postsData, ...draftsData]);
    };
  
    fetchData();
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

  const deletePost = async(post) => {
    const postDoc = doc(db,"posts",post.id)
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
      <div className="grid md:grid-cols-3 sm:grid-cols-2 grid-cols-1 gap-2">
    
    {postsLists.map((post) => (
       <AdminPosts
       onDelete={() => deletePost(post)}
       onEdit={() =>
         router.push({
           pathname: "/createpost",
           query: { postId: post?.id },
         })
       }
       Dashboard
       key={post.id}
       {...post}
       isMine={post?.userId === user?.uid}
     />
    ))}
  </div>
    </div>
  );
}
