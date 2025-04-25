import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { onAuthStateChanged, signOut } from "firebase/auth";

import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import {addDoc,collection} from "firebase/firestore";
import {getDocs,deleteDoc, query, where, orderBy} from "firebase/firestore"

import Image from "next/image";
import Navbar from "../components/Navbar";
import Post from '../components/Post'
import Smallpostcard from '../components/Smallpostcard'
import AdminPosts from '../components/AdminPosts'

export default function admindashboard() {
  const [postsLists,setPostList] = useState([]);
  const [scheduledPosts, setScheduledPosts] = useState([]);
  const postsCollectionRef = collection(db,"posts");
  const draftCollectionRef = collection(db, "drafts");

  useEffect(() => {
    const fetchData = async () => {
      // Fetch published posts
      const publishedQuery = query(postsCollectionRef, where("isPublished", "==", true));
      const publishedSnapshot = await getDocs(publishedQuery);
      const publishedData = publishedSnapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      }));
      
      // Fetch scheduled posts
      const scheduledQuery = query(
        postsCollectionRef, 
        where("isPublished", "==", false),
        where("scheduledFor", "!=", null),
        orderBy("scheduledFor", "asc")
      );
      const scheduledSnapshot = await getDocs(scheduledQuery);
      const scheduledData = scheduledSnapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      }));
      
      // Fetch drafts
      const draftsSnapshot = await getDocs(draftCollectionRef);
      const draftsData = draftsSnapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      }));
  
      setPostList(publishedData);
      setScheduledPosts(scheduledData);
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

  const deletePost = async (post) => {
    try {
      // Delete post document from "posts" collection
      const postDoc = doc(db, "posts", post.id);
      await deleteDoc(postDoc);
  
      // Delete draft document from "drafts" collection
      const draftDoc = doc(db, "drafts", post.id);
      await deleteDoc(draftDoc);
    } catch (error) {
      console.log("Error deleting post:", error.message);
    }
  };

  const formatScheduledDate = (timestamp) => {
    if (!timestamp) return "Not scheduled";
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleString();
  };

  return (
    <div className="min-h-screen bg-[#1a1a1a] text-white">
        <Navbar />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-[#F2EA6D] border-b-4 border-[#FFD800] pb-2">
              Admin Dashboard
            </h1>
            <button 
              onClick={signOutUser}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors duration-200"
            >
              Sign Out
            </button>
          </div>

          {/* Published Posts Section */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-6">Published Posts</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {postsLists.map((post) => (
                <AdminPosts
                  key={post.id}
                  onDelete={async () => {
                    await deletePost(post);
                    setPostList((prevPosts) => prevPosts.filter((p) => p.id !== post.id));
                  }}
                  onEdit={() =>
                    router.push({
                      pathname: "/createpost",
                      query: { postId: post?.id },
                    })
                  }
                  {...post}
                  className="transform hover:scale-105 transition-transform duration-200"
                />
              ))}
            </div>
          </div>

          {/* Scheduled Posts Section */}
          {scheduledPosts.length > 0 && (
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-white mb-6">Scheduled Posts</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {scheduledPosts.map((post) => (
                  <div key={post.id} className="bg-[#2a2a2a] rounded-lg overflow-hidden shadow-lg transform hover:scale-105 transition-transform duration-200">
                    <div className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-xl font-bold text-[#F2EA6D]">{post.title}</h3>
                        <span className="text-sm bg-[#F2EA6D] text-[#1a1a1a] px-2 py-1 rounded-full">
                          Scheduled
                        </span>
                      </div>
                      <p className="text-gray-400 mb-4">
                        Scheduled for: {formatScheduledDate(post.scheduledFor)}
                      </p>
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() =>
                            router.push({
                              pathname: "/createpost",
                              query: { postId: post.id },
                            })
                          }
                          className="px-3 py-1 bg-[#F2EA6D] text-[#1a1a1a] rounded hover:bg-[#FFD800] transition-colors duration-200"
                        >
                          Edit
                        </button>
                        <button
                          onClick={async () => {
                            await deletePost(post);
                            setScheduledPosts((prevPosts) => prevPosts.filter((p) => p.id !== post.id));
                          }}
                          className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors duration-200"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Create New Post Button */}
          <div className="flex justify-center mt-8">
            <button
              onClick={() => router.push("/createpost")}
              className="px-6 py-3 bg-[#F2EA6D] text-[#1a1a1a] font-bold rounded-lg hover:bg-[#FFD800] transform hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#F2EA6D]"
            >
              Create New Post
            </button>
          </div>
        </div>
    </div>
  );
}
