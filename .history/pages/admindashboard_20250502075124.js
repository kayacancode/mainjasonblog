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
      // Fetch all posts
      const postsSnapshot = await getDocs(postsCollectionRef);
      const postsData = postsSnapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      }));
      
      // Separate published and scheduled posts
      const publishedPosts = postsData.filter(post => post.isPublished === true);
      const scheduledPosts = postsData.filter(post => 
        post.isPublished === false && 
        post.scheduledFor && 
        new Date(post.scheduledFor.seconds * 1000) > new Date()
      );
      
      // Sort scheduled posts by date
      scheduledPosts.sort((a, b) => {
        const dateA = new Date(a.scheduledFor.seconds * 1000);
        const dateB = new Date(b.scheduledFor.seconds * 1000);
        return dateA - dateB;
      });
      
      // Fetch drafts
      const draftsSnapshot = await getDocs(draftCollectionRef);
      const draftsData = draftsSnapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      }));
  
      setPostList(publishedPosts);
      setScheduledPosts(scheduledPosts);
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
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 space-y-4 md:space-y-0">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold text-[#F2EA6D] tracking-tight">
              Admin Dashboard
            </h1>
            <p className="text-gray-400 text-lg">Manage your creative content</p>
          </div>
          <div className="flex space-x-4">
            <button 
              onClick={() => router.push('/blog')}
              className="bg-[#F2EA6D] hover:bg-[#FFD800] text-[#1a1a1a] font-bold px-6 py-2 rounded-full transition-all duration-200 transform hover:scale-105"
            >
              View Blog
            </button>
            <button 
              onClick={signOutUser}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-full transition-all duration-200 transform hover:scale-105"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Published Posts Section */}
        <div className="mb-16">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-white">Published Works</h2>
            <button
              onClick={() => router.push("/createpost")}
              className="bg-[#F2EA6D] text-[#1a1a1a] font-bold px-6 py-2 rounded-full hover:bg-[#FFD800] transform hover:scale-105 transition-all duration-200"
            >
              Create New Post
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {postsLists.map((post) => (
              <div key={post.id} className="bg-[#2a2a2a] rounded-xl overflow-hidden shadow-lg transform hover:scale-105 transition-all duration-300">
                <AdminPosts
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
                />
              </div>
            ))}
          </div>
        </div>

        {/* Scheduled Posts Section */}
        {scheduledPosts.length > 0 && (
          <div className="mb-16">
            <h2 className="text-2xl font-bold text-white mb-8">Upcoming Exhibitions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {scheduledPosts.map((post) => (
                <div key={post.id} className="bg-[#2a2a2a] rounded-xl overflow-hidden shadow-lg transform hover:scale-105 transition-all duration-300">
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-xl font-bold text-[#F2EA6D]">{post.title}</h3>
                      <span className="text-sm bg-[#F2EA6D] text-[#1a1a1a] px-3 py-1 rounded-full font-medium">
                        Scheduled
                      </span>
                    </div>
                    <p className="text-gray-400 mb-6">
                      Exhibition Date: {formatScheduledDate(post.scheduledFor)}
                    </p>
                    <div className="flex justify-end space-x-3">
                      <button
                        onClick={() =>
                          router.push({
                            pathname: "/createpost",
                            query: { postId: post.id },
                          })
                        }
                        className="px-4 py-2 bg-[#F2EA6D] text-[#1a1a1a] rounded-full hover:bg-[#FFD800] transform hover:scale-105 transition-all duration-200"
                      >
                        Edit
                      </button>
                      <button
                        onClick={async () => {
                          await deletePost(post);
                          setScheduledPosts((prevPosts) => prevPosts.filter((p) => p.id !== post.id));
                        }}
                        className="px-4 py-2 bg-red-600 text-white rounded-full hover:bg-red-700 transform hover:scale-105 transition-all duration-200"
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
      </div>
    </div>
  );
}
