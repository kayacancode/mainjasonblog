import Image from "next/image";
import { useState } from "react";

export default function Photos() {
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(true); // Simplified for now
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [photoTitle, setPhotoTitle] = useState("");
  const [photos, setPhotos] = useState([]);

  // Simplified photo management - Firebase functionality removed
  const handlePhotoDelete = async (photoId) => {
    if (!confirm("Are you sure you want to delete this photo?")) return;
    alert("Photo deletion functionality needs to be implemented with Supabase");
  };

  const handlePhotoUpload = async (e) => {
    e.preventDefault();
    alert("Photo upload functionality needs to be implemented with Supabase");
  };

  return (
    <div className="min-h-screen bg-white">
      {/* iOS-style Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Back Button */}
            <button 
              onClick={() => window.history.back()}
              className="flex items-center text-blue-500 hover:text-blue-600 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="text-lg">Back</span>
            </button>
            
            {/* Title */}
            <h1 className="text-xl font-semibold text-black">Photos</h1>
            
            {/* Admin Upload Button */}
            {isAdmin ? (
              <button
                onClick={() => setShowUploadForm(!showUploadForm)}
                className="text-blue-500 hover:text-blue-600 transition-colors text-lg font-medium"
              >
                {showUploadForm ? 'Cancel' : 'Add'}
              </button>
            ) : (
              <div className="w-12"></div> // Spacer for alignment
            )}
          </div>
        </div>
      </div>

      {/* Admin Indicator - iOS style notification */}
      {isAdmin && (
        <div className="bg-blue-50 border-b border-blue-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
            <div className="flex items-center justify-center space-x-2 text-blue-700">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium">Admin Mode</span>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Upload Form - iOS style modal-like appearance */}
        {isAdmin && showUploadForm && (
          <div className="mt-4 mb-6">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-black">Add Photo</h3>
              </div>
              <form onSubmit={handlePhotoUpload} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Title
                  </label>
                  <input
                    type="text"
                    value={photoTitle}
                    onChange={(e) => setPhotoTitle(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black bg-white"
                    placeholder="Enter photo title"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Choose Photo
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setSelectedFile(e.target.files[0])}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black bg-white"
                    required
                  />
                </div>
                <div className="flex space-x-3 pt-4">
                  <button
                    type="submit"
                    disabled={uploading}
                    className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-medium py-3 px-6 rounded-xl transition-colors duration-200"
                  >
                    {uploading ? 'Adding...' : 'Add Photo'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowUploadForm(false)}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-6 rounded-xl transition-colors duration-200"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Photos Grid - iOS Photos app style */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="py-6">
            {photos.length === 0 ? (
              <div className="text-center py-20">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-500 mb-2">No Photos</h3>
                <p className="text-gray-400">Photos you add will appear here</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-1 sm:gap-2">
                {photos.map((photo) => (
                  <div 
                    key={photo.id} 
                    className="relative aspect-square group"
                  >
                    <div className="relative w-full h-full rounded-lg overflow-hidden bg-gray-100">
                      <Image
                        src={photo.url}
                        alt={photo.title || "Photo"}
                        layout="fill"
                        objectFit="cover"
                        className="transition-transform duration-200 group-hover:scale-105"
                      />
                      
                      {/* iOS-style overlay on hover */}
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200"></div>
                      
                      {/* Delete Button - iOS style */}
                      {isAdmin && (
                        <button
                          onClick={() => handlePhotoDelete(photo.id, photo.storagePath)}
                          className="absolute top-2 right-2 w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center shadow-lg"
                          title="Delete photo"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                    
                    {/* Photo title - iOS style */}
                    {photo.title && (
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <p className="text-white text-sm font-medium truncate">{photo.title}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 