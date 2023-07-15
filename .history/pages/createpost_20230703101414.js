import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import Image from "next/image";
import { useRouter } from "next/router";
import { collection, doc, setDoc, addDoc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import firebase from "../firebase";
import { async } from "@firebase/util";
import { storage } from "../firebase";
import Link from 'next/link'
import { ref, uploadBytes, listAll, getDownloadURL } from "firebase/storage";
import { v4 } from "uuid";
import { GrGallery } from "react-icons/gr";
import { BiHappyAlt } from "react-icons/bi";
const Createpost = () => {
  const router = useRouter();
  const [imgUpload, setimgUpload] = useState(null);
  const [imgList, setimgList] = useState([]);

  const imgListRef = ref(storage, "imgs/");

  const [title, setTitle] = useState("");
  const [postText, setPostText] = useState("");

  const postCollectionRef = collection(db, "posts");
  const draftCollectionRef = collection(db, "drafts");

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
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
  const createPost = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      let url = "";
      url = await uploadimg();
      console.log("url===", url);
      await addDoc(postCollectionRef, {
        title,
        postText,
        author: {
          name: auth?.currentUser?.displayName || "",
          id: auth?.currentUser?.uid || "",
        },
        imgUrl: url || "",
      });
      setLoading(false);
      router.push("/blog");
    } catch (err) {
      console.log("err", err.message);
      setLoading(false);
    }
  };

  const createDraft = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      let url = "";
      url = await uploadimg();
      console.log("url===", url);
      await addDoc(draftCollectionRef, {
        title,
        postText,
        author: {
          name: auth?.currentUser?.displayName || "",
          id: auth?.currentUser?.uid || "",
        },
        imgUrl: url || "",
      });
      setLoading(false);
      router.push("/blog");
    } catch (err) {
      console.log("err", err.message);
      setLoading(false);
    }
  };

  const uploadimg = async () => {
    if (imgUpload == null) return;
    const imgRef = ref(storage, `imgs/${imgUpload.name + v4()}`);

    const snapshot = await uploadBytes(imgRef, imgUpload);
    const url = await getDownloadURL(snapshot.ref);
    return url;
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle form submission here
  };
  
  const handlePost = (e) => {
    e.preventDefault();
    createPost(); // Call the createPost function for posting
  };
  
  const handleSaveDraft = (e) => {
    e.preventDefault();
    saveDraft(); // Call the saveDraft function for saving the draft
  };

  useEffect(() => {
    listAll(imgListRef).then((response) => {
      response.items.forEach((item) => {
        getDownloadURL(item).then((url) => {
          setimgList((prev) => [...prev, url]);
        });
      });
      console.log(response);
    });
  }, []);

  return (
    <body className="bg-black">
<div className="min-h-screen  items-center justify-center bg-[#303030]">
      <div class="flex items-center flex-shrink-0 text-white mr-6">
        <Link href= "/AppHome">
        <img src="/tlogo.png" width="184px" height="150px" />
        </Link>
      </div>
      <div className="text-[#F2EA6D] mx-10">
        <div className="flex justify-center">
          <h1 className="	 mb-10 font-black	 text-4xl	border-b-2 border-[#F2EA6D] px-20 py-2 	">
            Create Post
          </h1>
        </div>
        <form onSubmit={handleSubmit}>
          <input
            placeholder="Enter blog name "
            onChange={(event) => {
              setTitle(event.target.value);
            }}
            className="text-2xl text-[#000] mb-4 border border-slate-300 rounded-md py-2  pl-2 pr-3 shadow-sm "
          />

          <div className="flex items-center my-2	">
            <label className="text-2xl mb-4">Post:</label>
          </div>
          <div className="rounded  w-9/12 border-2 border-[#f2ea6d]">
            <textarea
              onChange={(event) => {
                setPostText(event.target.value);
              }}
              class="resize-none  bg-transparent p-4 outline-none max-h-80	h-80 w-full border-b-2 border-[#f2ea6d] rounded"
              placeholder="enter description"
            ></textarea>
            <div className="flex p-2 items-center">
              <GrGallery className=" bg-[#f2ea6d] mx-2" />
              <label class="block">
                <span class="sr-only">Choose profile photo</span>
                <input
                  type="file"
                  onChange={(event) => {
                    setimgUpload(event.target.files[0]);
                  }}
                  class="block w-full text-sm text-slate-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-full file:border-0
                  file:text-sm file:font-semibold
                  file:bg-violet-50 file:text-violet-700
                  hover:file:bg-violet-100
                "
                className="text-[#f2ea6d]"
                />
              </label>

              {/* <button onClick={uploadimg} class="text-black">
                Upload img
              </button> */}
            </div>
          </div>
          <div className="space-x-4 m-10">
  <button
    type="submit"
    className="bg-[#F2EA6D] text-[#000] px-2.5 py-1.5 rounded"
    onClick={handlePost}

  >
    {loading ? "loading" : "Post"}
  </button>
  <button
    type="submit"
    onClick={handleSaveDraft}

    className="bg-[#F2EA6D] text-[#000] px-2.5 py-1.5 rounded"
  >
    {loading ? "loading" : "Save Draft"}
  </button>
</div>


        </form>
      </div>

      <div className="flex">
        {/* {imgList.map((url) => {
    return <img  key ={url.id} src = {url} width={300} height={300}/>;
  })} */}
      </div>
    </div>
    </body>
  );
};

export default Createpost;
