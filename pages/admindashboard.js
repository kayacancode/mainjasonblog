import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { onAuthStateChanged, signOut } from "firebase/auth";

import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import Image from 'next/image'
import Navbar from "../components/Navbar";
import Post from '../components/Post'

export default function admindashboard() {
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

  return (
    <div class = "h-screen bg-black">
        <Navbar />
         <div>
        </div>
      
        <h1 class = "text-center text-[#F2EA6D] font-bold text-3xl border-b-4 border-[#FFD800]">Admin Dashboard</h1>

      <button style={{ background: "red" }} onClick={signOutUser}>
        SignOut
      </button>
      <Post title = "Edit"/>
    </div>
  );
}
