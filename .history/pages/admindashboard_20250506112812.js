import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { collection, getDocs,getDoc, addDoc, deleteDoc, doc, updateDoc, query, where, orderBy } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { format } from "date-fns";

import { auth, db, storage } from "../firebase";
import Image from "next/image";
import Navbar from "../components/Navbar";
import Post from '../components/Post'
import Smallpostcard from '../components/Smallpostcard'
import AdminPosts from '../components/AdminPosts'

export default function admindashboard() {
  const [postsLists,setPostList] = useState([]);
  const [scheduledPosts, setScheduledPosts] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState(null);
  const [photoTitle, setPhotoTitle] = useState("");
  const [uploading, setUploading] = useState(false);
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

  const handlePhotoUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) return;

    setUploading(true);
    try {
      // Upload image to Firebase Storage
      const storageRef = ref(storage, `photos/${Date.now()}_${selectedFile.name}`);
      await uploadBytes(storageRef, selectedFile);
      const downloadURL = await getDownloadURL(storageRef);

      // Save photo metadata to Firestore
      const photoData = {
        url: downloadURL,
        title: photoTitle,
        uploadedAt: new Date().toISOString(),
        storagePath: storageRef.fullPath
      };

      const docRef = await addDoc(collection(db, "photos"), photoData);
      setPhotos([...photos, { id: docRef.id, ...photoData }]);
      
      // Reset form
      setSelectedFile(null);
      setPhotoTitle("");
    } catch (error) {
      console.error("Error uploading photo:", error);
      alert("Error uploading photo. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handlePhotoDelete = async (photoId, storagePath) => {
    if (!confirm("Are you sure you want to delete this photo?")) return;

    try {
      // Delete from Storage
      const storageRef = ref(storage, storagePath);
      await deleteObject(storageRef);

      // Delete from Firestore
      await deleteDoc(doc(db, "photos", photoId));
      setPhotos(photos.filter(photo => photo.id !== photoId));
    } catch (error) {
      console.error("Error deleting photo:", error);
      alert("Error deleting photo. Please try again.");
    }
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
            <h2 className="text-2xl font-bold text-white mb-8">Scheduled Blogs</h2>
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
                      Publish Date: {formatScheduledDate(post.scheduledFor)}
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

        {/* Photo Management Section */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold text-white mb-8">Photo Management</h2>
          
          {/* Upload Form */}
          <div className="bg-[#2a2a2a] rounded-lg p-6 mb-8">
            <h3 className="text-xl font-semibold text-[#F2EA6D] mb-4">Upload New Photo</h3>
            <form onSubmit={handlePhotoUpload} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Photo Title
                </label>
                <input
                  type="text"
                  value={photoTitle}
                  onChange={(e) => setPhotoTitle(e.target.value)}
                  className="w-full px-4 py-2 rounded bg-[#1a1a1a] border border-gray-700 text-white focus:outline-none focus:border-[#F2EA6D]"
                  placeholder="Enter photo title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Select Photo
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setSelectedFile(e.target.files[0])}
                  className="w-full px-4 py-2 rounded bg-[#1a1a1a] border border-gray-700 text-white focus:outline-none focus:border-[#F2EA6D]"
                />
              </div>
              <button
                type="submit"
                disabled={!selectedFile || uploading}
                className="px-6 py-2 bg-[#F2EA6D] text-black font-medium rounded hover:bg-[#e6d95c] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? "Uploading..." : "Upload Photo"}
              </button>
            </form>
          </div>

          {/* Photo Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {photos.map((photo) => (
              <div key={photo.id} className="bg-[#2a2a2a] rounded-lg overflow-hidden">
                <div className="relative aspect-video">
                  <img
                    src={photo.url}
                    alt={photo.title || "Gallery image"}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-4">
                  <h3 className="text-lg font-medium text-white mb-2">
                    {photo.title || "Untitled"}
                  </h3>
                  <p className="text-sm text-gray-400 mb-4">
                    Uploaded: {format(new Date(photo.uploadedAt), "MMM d, yyyy")}
                  </p>
                  <div className="flex justify-end">
                    <button
                      onClick={() => handlePhotoDelete(photo.id, photo.storagePath)}
                      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
