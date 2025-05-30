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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-lg border border-gray-200/50 p-8 mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-6 md:space-y-0">
            <div className="space-y-3">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent tracking-tight">
                Dashboard
              </h1>
              <p className="text-gray-600 text-lg font-medium">Manage your creative content</p>
            </div>
            <div className="flex space-x-3">
              <button 
                onClick={() => router.push('/blog')}
                className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-6 py-3 rounded-2xl transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
              >
                View Blog
              </button>
              <button 
                onClick={signOutUser}
                className="bg-red-500 hover:bg-red-600 text-white font-semibold px-6 py-3 rounded-2xl transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>

        {/* Published Posts Section */}
        <div className="mb-12">
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-lg border border-gray-200/50 p-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-r from-green-400 to-blue-500 rounded-2xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Published Works</h2>
                  <p className="text-gray-600">{postsLists.length} posts published</p>
                </div>
              </div>
              <button
                onClick={() => router.push("/createpost")}
                className="bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold px-6 py-3 rounded-2xl hover:from-blue-600 hover:to-purple-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <span className="flex items-center space-x-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Create New Post</span>
                </span>
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {postsLists.map((post) => (
                <div key={post.id} className="bg-white rounded-2xl shadow-md hover:shadow-xl border border-gray-200/50 overflow-hidden transform hover:scale-105 transition-all duration-300">
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
        </div>

        {/* Scheduled Posts Section */}
        {scheduledPosts.length > 0 && (
          <div className="mb-12">
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-lg border border-gray-200/50 p-8">
              <div className="flex items-center space-x-4 mb-8">
                <div className="w-12 h-12 bg-gradient-to-r from-orange-400 to-pink-500 rounded-2xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Scheduled Posts</h2>
                  <p className="text-gray-600">{scheduledPosts.length} posts scheduled</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {scheduledPosts.map((post) => (
                  <div key={post.id} className="bg-white rounded-2xl shadow-md hover:shadow-xl border border-gray-200/50 overflow-hidden transform hover:scale-105 transition-all duration-300">
                    <div className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="text-xl font-bold text-gray-900 line-clamp-2">{post.title}</h3>
                        <span className="text-xs bg-gradient-to-r from-orange-400 to-pink-500 text-white px-3 py-1 rounded-full font-semibold whitespace-nowrap ml-2">
                          Scheduled
                        </span>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-4 mb-6">
                        <p className="text-sm text-gray-600 font-medium">
                          📅 {formatScheduledDate(post.scheduledFor)}
                        </p>
                      </div>
                      <div className="flex justify-end space-x-3">
                        <button
                          onClick={() =>
                            router.push({
                              pathname: "/createpost",
                              query: { postId: post.id },
                            })
                          }
                          className="px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transform hover:scale-105 transition-all duration-200 font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={async () => {
                            await deletePost(post);
                            setScheduledPosts((prevPosts) => prevPosts.filter((p) => p.id !== post.id));
                          }}
                          className="px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transform hover:scale-105 transition-all duration-200 font-medium"
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
        )}

        {/* Photo Management Section */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-lg border border-gray-200/50 p-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-400 to-pink-500 rounded-2xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Photo Gallery</h2>
                <p className="text-gray-600">Manage your photo collection</p>
              </div>
            </div>
            <button
              onClick={() => router.push('/photos')}
              className="bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold px-6 py-3 rounded-2xl hover:from-purple-600 hover:to-pink-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              View Gallery
            </button>
          </div>
          
          {/* Upload Form */}
          <div className="bg-gray-50/80 rounded-2xl p-6 mb-8 border border-gray-200/50">
            <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center space-x-2">
              <svg className="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span>Upload New Photo</span>
            </h3>
            <form onSubmit={handlePhotoUpload} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Photo Title
                </label>
                <input
                  type="text"
                  value={photoTitle}
                  onChange={(e) => setPhotoTitle(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                  placeholder="Enter a descriptive title"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Select Photo
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setSelectedFile(e.target.files[0])}
                  className="w-full px-4 py-3 rounded-xl bg-white border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                />
              </div>
              <button
                type="submit"
                disabled={!selectedFile || uploading}
                className="bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold px-8 py-3 rounded-xl hover:from-purple-600 hover:to-pink-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {uploading ? (
                  <span className="flex items-center space-x-2">
                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Uploading...</span>
                  </span>
                ) : (
                  <span className="flex items-center space-x-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <span>Upload Photo</span>
                  </span>
                )}
              </button>
            </form>
          </div>

          {/* Photo Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {photos.map((photo) => (
              <div key={photo.id} className="bg-white rounded-2xl shadow-md hover:shadow-xl border border-gray-200/50 overflow-hidden transform hover:scale-105 transition-all duration-300">
                <div className="relative aspect-video">
                  <img
                    src={photo.url}
                    alt={photo.title || "Gallery image"}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                    {photo.title || "Untitled"}
                  </h3>
                  <div className="bg-gray-50 rounded-xl p-3 mb-4">
                    <p className="text-sm text-gray-600 font-medium">
                      📅 {format(new Date(photo.uploadedAt), "MMM d, yyyy")}
                    </p>
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={() => handlePhotoDelete(photo.id, photo.storagePath)}
                      className="px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transform hover:scale-105 transition-all duration-200 font-medium"
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
