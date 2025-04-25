import React, { useEffect, useState, useContext } from "react";
import Image from "next/image";
import { useRouter } from "next/router";
import {
  collection,
  doc,
  setDoc,
  addDoc,
  getDoc,
  updateDoc,
  query,
  limit,
  getDocs,
} from "firebase/firestore";
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from "firebase/storage";
import { auth, db } from "../firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import firebase from "../firebase";
import { async } from "@firebase/util";
import { storage } from "../firebase";
import Link from "next/link";
import BlogContent from "../components/BlogContent";

const Createpost = () => {
  const router = useRouter();


  const storage = getStorage();
  const [loading, setLoading] = useState(false);
  const [postText, setPostText] = useState("");
  const [title, setTitle] = useState("");

  const [imgFile, setImageFile] = useState(null);

  const [progress, setProgress] = useState(null);
  const [error, setError] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [image, setImage] = useState(null);
  const [statusProject, setStatusProject] = useState(null);
  const [currentProject, setCurrentProject] = useState(null);

  const [userList, setUserList] = useState([]);

  useEffect(() => {
    (async () => {
      if (router.query.postId) {
        await fetchProjectData();
      }
    })();
  }, [router.query.postId]);

  const fetchProjectData = async () => {
    const docRef = doc(db, "posts", router.query.postId);
    const docSnap = await getDoc(docRef);

    const q = query(collection(db, "users"));

    const querySnapshot = await getDocs(q);
    setUserList(
      querySnapshot.docs.map((doc) => {
        return {
          ...doc.data(),
        };
      })
    );

    if (docSnap.exists()) {
      console.log("Document data:", docSnap.data());
      let data = docSnap.data();
      data.id = docSnap.id;
      setTitle(data?.title);
      setPostText(data?.postText);
   

      setPreviewImage(data?.postImg);
      setImage(data?.postImg);
  
    }
  };

 
  
  const handlePost = async (e) => {
    e.preventDefault();

    if (router.query.postId === undefined) {
      if (!title || !postText  || !imgFile) {
        setError("Please fill all the fields");
        return;
      }
    }

    setError(null);

    if (loading) {
      return;
    }
    setLoading(true);

    let data = {
      title: title || "",
      postText: postText || "",
  
      postImg: image || "",
    };
    console.log(data);
    try {
      if (router.query.postId) {
        const postRef = doc(db, "posts", router.query.postId);
        await updateDoc(postRef, data);

        if (image) {
          setLoading(false);
          router.push("/admindashboard");
          return;
        }
        await imageUpload(router.query.postId);

        return;
      }
      const docRef = collection(db, "posts");
      const { id } = await addDoc(docRef, { ...data, createdAt: Date.now() });

      console.log("Document written with ID: ", id);
      await imageUpload(id);
    } catch (err) {
      console.log("er", err);
    }
  };

  const imageUpload = async (postId) => {
    const storageRef = ref(storage, "blogposts/"  + "/" + postId);
    const uploadTask = uploadBytesResumable(storageRef, imgFile);
    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const progress =
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        console.log("Upload is " + progress + "% done");
        setProgress(progress);
        switch (snapshot.state) {
          case "paused":
            console.log("Upload is paused");
            break;
          case "running":
            console.log("Upload is running");
            break;
        }
      },
      (error) => {
        console.log(error);
        switch (error.code) {
          case "storage/unauthorized":
            break;
          case "storage/canceled":
            break;
          case "storage/unknown":
            break;
        }
      },
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        // update postRef with downloadURL
        const postRef = doc(db, "posts", postId);

        await setDoc(postRef, { postImg: downloadURL }, { merge: true });
        setLoading(false);
        setProgress(null);

        router.push("/admindashboard");

        // router.back();
      }
    );
  };

  function getBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  }

  const selectImage = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const base64 = await getBase64(file);
      setPreviewImage(base64);
      setImage(null);
      setImageFile(file);
    }
  };

  return (
    <div className="min-h-screen bg-[#1a1a1a] text-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <Link href="/admindashboard">
            <span className="inline-flex items-center text-[#F2EA6D] hover:text-[#FFD800] transition-colors duration-200">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
              Back to Dashboard
            </span>
          </Link>
        </div>
        
        <form
          className="space-y-8"
          onSubmit={(e) => handlePost(e)}
        >
          <div className="space-y-6">
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold text-[#F2EA6D] border-b-4 border-[#FFD800] pb-2 inline-block">
                {router.query.postId ? "Edit Blog Post" : "Create a New Blog Post"}
              </h1>
            </div>

            <div className="space-y-4">
              <div>
                <label
                  className="block text-lg font-medium mb-2"
                  htmlFor="title"
                >
                  Post Title<span className="text-red-500">*</span>
                </label>
                <input
                  placeholder="Enter post title"
                  value={title}
                  required
                  onChange={(event) => {
                    setTitle(event.target.value);
                  }}
                  className="w-full px-4 py-3 rounded-lg bg-[#2a2a2a] border border-gray-700 focus:border-[#F2EA6D] focus:ring-2 focus:ring-[#F2EA6D] focus:outline-none transition-colors duration-200"
                />
              </div>

              <div>
                <label className="block text-lg font-medium mb-2">
                  Content<span className="text-red-500">*</span>
                </label>
                <div className="rounded-lg border border-gray-700 bg-[#2a2a2a] focus-within:border-[#F2EA6D] focus-within:ring-2 focus-within:ring-[#F2EA6D] transition-colors duration-200">
                  <textarea
                    value={postText}
                    required
                    onChange={(event) => {
                      setPostText(event.target.value);
                    }}
                    className="w-full h-64 p-4 bg-transparent resize-none focus:outline-none"
                    placeholder="Enter blog content"
                  />
                </div>
                <BlogContent postText={postText} />
              </div>

              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-bold text-[#F2EA6D]">Upload Image</h2>
                  <p className="text-gray-400 mt-1">Upload an image for your blog post</p>
                </div>

                <div className="border-2 border-dashed border-gray-700 rounded-lg p-8 hover:border-[#F2EA6D] transition-colors duration-200">
                  <div className="space-y-4">
                    <label className="block text-center">
                      <span className="text-lg">Upload an image file - PNGs, JPEGS, HEICS</span>
                      <input
                        type="file"
                        className="hidden"
                        onClick={(e) => (e.target.value = null)}
                        onChange={(event) => selectImage(event)}
                        id="imageUploader"
                      />
                      <div className="mt-4">
                        <span className="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md text-white bg-[#2a2a2a] hover:bg-[#3a3a3a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#F2EA6D] transition-colors duration-200 cursor-pointer">
                          Choose File
                        </span>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="flex justify-center pt-6">
            <button
              type="submit"
              className="px-8 py-3 bg-[#F2EA6D] text-[#1a1a1a] font-bold rounded-lg hover:bg-[#FFD800] transform hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#F2EA6D]"
            >
              {loading
                ? `Loading ${progress > 0 ? Math.round(progress) + "%" : ""}`
                : router.query.postId
                ? "Update Post"
                : "Create Post"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Createpost;
