import { useEffect, useState } from "react";
import { collection, getDocs, deleteDoc, doc, getDoc } from "firebase/firestore";
import { ref, deleteObject } from "firebase/storage";
import { onAuthStateChanged } from "firebase/auth";
import { db, storage, auth } from "../firebase";
import Navbar from "../components/Navbar";
import Image from "next/image";

export default function Photos() {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log("Auth state changed:", user);
      if (user) {
        setUser(user);
        console.log("User is signed in:", user.email);
        // Check if user is admin
        const userDoc = await getDoc(doc(db, "users", user.uid));
        console.log("User document exists:", userDoc.exists());
        if (userDoc.exists()) {
          const userData = userDoc.data();
          console.log("User data:", userData);
          console.log("Is admin?", userData.isAdmin);
          if (userData.isAdmin) {
            setIsAdmin(true);
            console.log("Admin status set to true");
          } else {
            setIsAdmin(false);
            console.log("User is not admin");
          }
        } else {
          console.log("No user document found");
          setIsAdmin(false);
        }
      } else {
        console.log("No user signed in");
        setUser(null);
        setIsAdmin(false);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchPhotos = async () => {
      try {
        const photosCollection = collection(db, "photos");
        const photosSnapshot = await getDocs(photosCollection);
        const photosList = photosSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setPhotos(photosList);
      } catch (error) {
        console.error("Error fetching photos:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPhotos();
  }, []);

  const handlePhotoDelete = async (photoId, storagePath) => {
    if (!confirm("Are you sure you want to delete this photo?")) return;

    try {
      // Delete from Storage if storagePath exists
      if (storagePath) {
        const storageRef = ref(storage, storagePath);
        await deleteObject(storageRef);
      }

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
      
      {/* Admin Indicator Widget */}
      {isAdmin && (
        <div className="bg-[#F2EA6D] text-black px-4 py-2 text-center font-medium">
          <div className="flex items-center justify-center space-x-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
            </svg>
            <span>Admin Mode - You can delete photos</span>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold text-[#F2EA6D] mb-8">Photo Gallery</h1>
        
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#F2EA6D]"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {photos.map((photo) => (
              <div 
                key={photo.id} 
                className="relative aspect-square rounded-lg overflow-hidden group hover:shadow-xl transition-all duration-300"
              >
                <div className="relative w-full h-full">
                  <Image
                    src={photo.url}
                    alt={photo.title || "Gallery image"}
                    layout="fill"
                    objectFit="cover"
                    className="group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                
                {/* Delete Button - Only visible to admin */}
                {isAdmin && (
                  <button
                    onClick={() => handlePhotoDelete(photo.id, photo.storagePath)}
                    className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10"
                    title="Delete photo"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}

                {photo.title && (
                  <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 p-4 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                    <h3 className="text-white font-medium">{photo.title}</h3>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 