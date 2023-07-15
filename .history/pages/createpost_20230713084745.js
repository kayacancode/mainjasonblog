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
    <div className=" font-Archivo bg-[#f6f9fc] text-[#0a2540] h-[100%] ">
      
      <div className="   text-[#0a2540] pt-10">
       
        <form
          className=" max-w-lg mx-auto p-4 bg-white rounded shadow-lg"
          onSubmit={(e) => handlePost(e)}
        >
          <div className="block md:flex">
            <div className=" text-center ">
              <h1 className="	 text-[#0a2540] font-Archio mb-10 	 text-5xl	 py-2 	">
                Create a New Blog Post
              </h1>
              <div className="mb-4">
                <label
                  className="block mb-2 text-lg font-medium"
                  htmlFor="title"
                >
                  Project Title<span className="text-[#d1202f]">*</span>
                </label>

                <input
                  placeholder="Enter project title"
                  value={title}
                  required
                  onChange={(event) => {
                    setTitle(event.target.value);
                  }}
                  className="text-xl sm:text-2xl text-[#040404] mb-4 bg-[#e7f0fe] shadow-lg w-full sm:w-96 rounded py-2 pl-2 pr-8 shadow-sm"
                />
              </div>
              <div className="mb-4">
                  <label className="block mb-2 text-lg font-medium">
                    Content<span className="text-[#d1202f]">*</span>:
                  </label>
                </div>
                <div className="rounded">
                  
                  <textarea
                    value={postText}
                    required
                    onChange={(event) => {
                      setPostText(event.target.value);
                    }}
                    className="resize-none bg-transparent bg-[#e7f0fe]  p-4 outline-none max-h-80 h-25 w-full sm:w-96 border-b-2 rounded"
                    placeholder="Enter blog content"
                    ></textarea>
              </div>
              <h2 className="text-xl text-[#0a2540] font-bold pt-8">
                Upload file
              </h2>
              <h2 className="text-base sm:text-lg text-[#0a2540] pt-2">
                Upload a image for your blog
              </h2>
              <div className="p-10 sm:p-20 bg-[#e7f0fe] block  rounded mt-2  ">
                <div className="text-center block">
                  <label className="text-xl">
                    Upload an image file - PNGs, JPEGS, HEICS
                  </label>
                  <input
                    type="file"
                    className="bg-[#A3CBD4] text-[#0a2540] p-4 w-full lg: w-[200px] sm:w-[263px] rounded my-2 text-center"
                    onClick={(e) => (e.target.value = null)}
                    onChange={(event) => selectImage(event)}
                    id="imageUploader"
                  />
                </div>
              </div>

      </div>
       
</div>
          <div className="mt-10">
            <h1>Preview your post:</h1>

            <div className="m-5 p-3 bg-[#f6f9fc] rounded shadow-lg ">
             
                {previewImage && (
                  <img
                    className="rounded-t-lg"
                    src={previewImage || ""}
                    alt="image"
                    height={100}
                    width="100%"
                  />
                )}
              

              <div className="p-5 text-center">
                <a href="#">
                  <h5 className="mb-2 text-lg  font-bold tracking-tight text-[#0a2540]">
                    Blog Title
                  </h5>
                
                </a>
                <p className="py-3 h-20 overflow-auto font-normal text-gray-700">
                  Blog Content
                </p>
                {router?.query?.postId && (
                  <button
                    onClick={() => {
                      router.push({
                        pathname: "/view-post",
                        query: { id: router.query.postId },
                      });
                    }}
                    className="inline-flex rounded-full justify-center w-full mt-2 items-center py-2 px-3 text-sm font-extrabold text-center text-[#f6f9fc] bg-[#020738] hover:bg-[#B0D4A5] focus:ring-4 focus:outline-none focus:ring-blue-300"
                  >
                    View Blog Post
                  </button>
                )}
              
                
              </div>
            </div>
            
          </div>
    
          {error && <p className="text-red-500 my-2">{error}</p>}
          <div className="flex justify-center mt-8">
          <button
            type="submit"
            className="bg-[#020738] hover:bg-[#B0D4A5] text-white rounded-full py-2 px-8 "
            >
            {loading
              ? "loading " + (progress > 0 ? Math.round(progress) + "%" : "")
              : router.query.postId
              ? "Edit Post"
              : "Post"}
          </button>
          </div>
        </form>
        
      </div>
    
    </div>
  );
};

export default Createpost;
