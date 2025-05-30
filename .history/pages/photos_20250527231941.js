import { useEffect, useState } from "react";
import { collection, getDocs, deleteDoc, doc, addDoc } from "firebase/firestore";
import { ref, deleteObject, uploadBytes, getDownloadURL } from "firebase/storage";
import { onAuthStateChanged } from "firebase/auth";
import { db, storage, auth } from "../firebase";
import Navbar from "../components/Navbar";
import Image from "next/image";

export default function Photos() {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState(null);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [photoTitle, setPhotoTitle] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log("Auth state changed:", user);
      if (user) {
        setUser(user);
        console.log("User is signed in:", user.email);
        // If user is signed in, they are admin
        setIsAdmin(true);
        console.log("Admin status set to true - user is authenticated");
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

  const handlePhotoUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      alert("Please select a file to upload.");
      return;
    }

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
      setShowUploadForm(false);
      alert("Photo uploaded successfully!");
    } catch (error) {
      console.error("Error uploading photo:", error);
      alert("Error uploading photo. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1a1a1a] text-white">
      {console.log("Rendering photos page - isAdmin:", isAdmin, "user:", user)}
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
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-[#F2EA6D]">Photo Gallery</h1>
          
          {/* Upload Button - Only visible to admin */}
          {isAdmin && (
            <button
              onClick={() => setShowUploadForm(!showUploadForm)}
              className="bg-[#F2EA6D] hover:bg-[#e6d95c] text-black font-medium px-6 py-2 rounded-lg transition-colors duration-200 flex items-center space-x-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>{showUploadForm ? 'Cancel Upload' : 'Upload Photo'}</span>
            </button>
          )}
        </div>

        {/* Upload Form - Only visible when showUploadForm is true */}
        {isAdmin && showUploadForm && (
          <div className="bg-[#2a2a2a] rounded-lg p-6 mb-8">
            <h3 className="text-xl font-semibold text-[#F2EA6D] mb-4">Upload New Photo</h3>
            <form onSubmit={handlePhotoUpload} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Photo Title (Optional)
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
                  required
                />
              </div>
              <div className="flex space-x-4">
                <button
                  type="submit"
                  disabled={uploading}
                  className="bg-[#F2EA6D] hover:bg-[#e6d95c] disabled:bg-gray-600 text-black font-medium px-6 py-2 rounded transition-colors duration-200"
                >
                  {uploading ? 'Uploading...' : 'Upload Photo'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowUploadForm(false)}
                  className="bg-gray-600 hover:bg-gray-700 text-white font-medium px-6 py-2 rounded transition-colors duration-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

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