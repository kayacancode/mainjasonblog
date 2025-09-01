import { format } from "date-fns";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [postList, setPostList] = useState([]);
  const [scheduledPosts, setScheduledPosts] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [tracks, setTracks] = useState([]);

  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const [bulkFile, setBulkFile] = useState(null);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [photoTitle, setPhotoTitle] = useState("");

  // Format date helper
  const safeFormatDate = (timestamp, fallback = "No date") => {
    try {
      if (!timestamp) return fallback;
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return fallback;
      return format(date, "MMM d, yyyy");
    } catch {
      return fallback;
    }
  };

  // Fetch posts and photos
  useEffect(() => {
    const init = async () => {
      // Check auth
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) return router.replace("/adminsignin");
      setUser(user);

      // Fetch posts
      const { data: postsData, error: postsError } = await supabase
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false });

      if (postsError) console.error(postsError);
      else {
        const published = postsData.filter(p => p.is_published);
        const scheduled = postsData
          .filter(p => !p.is_published && p.scheduled_for && new Date(p.scheduled_for) > new Date())
          .sort((a, b) => new Date(a.scheduled_for) - new Date(b.scheduled_for));
        setPostList(published);
        setScheduledPosts(scheduled);
      }

      // Fetch photos
      const { data: photoData, error: photoError } = await supabase
        .from("photos")
        .select("*")
        .order("uploaded_at", { ascending: false });

      if (photoError) console.error(photoError);
      else setPhotos(photoData);

      // Fetch tracks
      const { data: tracksData, error: tracksError } = await supabase
        .from("tracks")
        .select("*")
        .order("created_at", { ascending: false });

      if (tracksError) console.error(tracksError);
      else setTracks(tracksData || []);

      setLoading(false);
    };

    init();

    // Auth listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) router.replace("/adminsignin");
      else setUser(session.user);
    });

    return () => subscription.unsubscribe();
  }, [router]);

  // Sign out
  const signOutUser = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) alert(error.message);
    else router.replace("/adminsignin");
  };

  // Delete post
  const deletePost = async (postId) => {
    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId);

      if (error) {
        console.error('Error deleting post:', error.message);
        alert('Failed to delete post: ' + error.message);
        return false;
      }

      return true;
    } catch (err) {
      console.error('Unexpected error deleting post:', err);
      alert('Unexpected error deleting post.');
      return false;
    }
  };
  
  // Upload photo
  const handlePhotoUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) return;
    setUploading(true);

    try {
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("photos")
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from("photos").getPublicUrl(filePath);

      const { data, error } = await supabase
        .from("photos")
        .insert([{ title: photoTitle, url: publicUrl, uploaded_at: new Date(), storage_path: filePath }])
        .select();

      if (error) throw error;

      setPhotos([data[0], ...photos]);
      setSelectedFile(null);
      setPhotoTitle("");
    } catch (err) {
      console.error(err);
      alert("Error uploading photo: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  // Delete photo
  const handlePhotoDelete = async (photoId, storagePath) => {
    if (!confirm("Are you sure you want to delete this photo?")) return;
    try {
      const { error: storageError } = await supabase.storage.from("photos").remove([storagePath]);
      if (storageError) throw storageError;

      const { error: dbError } = await supabase.from("photos").delete().eq("id", photoId);
      if (dbError) throw dbError;

      setPhotos(photos.filter(p => p.id !== photoId));
    } catch (err) {
      console.error(err);
      alert("Error deleting photo: " + err.message);
    }
  };

  // Bulk upload posts (JSON or CSV)
  const handleBulkUpload = async (e) => {
    e.preventDefault();
    if (!bulkFile) return;
    setBulkUploading(true);

    try {
      const text = await bulkFile.text();
      let posts = [];

      try {
        posts = JSON.parse(text);
      } catch {
        const lines = text.split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        posts = lines.slice(1).filter(l => l.trim()).map(line => {
          const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
          const obj = {};
          headers.forEach((h, i) => obj[h] = values[i] || '');
          return obj;
        });
      }

      for (const post of posts) {
        await supabase.from("posts").insert([{
          title: post.title || "Untitled",
          post_text: post.content || post.postText || "",
          author: post.author || "Admin",
          post_img: post.imgUrl || post.postImg || "",
          is_published: post.isPublished !== undefined ? post.isPublished : true,
          scheduled_for: post.scheduledFor || null,
          created_at: new Date()
        }]);
      }

      alert("Bulk upload completed!");
      setBulkFile(null);

      // Refresh posts
      const { data: postsData } = await supabase.from("posts").select("*");
      const published = postsData.filter(p => p.is_published);
      const scheduled = postsData.filter(p => !p.is_published && p.scheduled_for && new Date(p.scheduled_for) > new Date());
      setPostList(published);
      setScheduledPosts(scheduled);

    } catch (err) {
      console.error(err);
      alert("Error during bulk upload: " + err.message);
    } finally {
      setBulkUploading(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation Bar */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h1 className="text-xl font-semibold text-gray-900">Admin Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => router.push('/blog')}
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                View Blog
              </button>
              <button 
                onClick={signOutUser}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Published Posts</p>
                <p className="text-2xl font-bold text-gray-900">{postList.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Scheduled Posts</p>
                <p className="text-2xl font-bold text-gray-900">{scheduledPosts.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Photos</p>
                <p className="text-2xl font-bold text-gray-900">{photos.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Tracks</p>
                <p className="text-2xl font-bold text-gray-900">{tracks.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              onClick={() => router.push("/createpost")}
              className="flex items-center justify-center p-4 bg-blue-50 hover:bg-blue-100 rounded-lg border-2 border-dashed border-blue-300 hover:border-blue-400 transition-colors group"
            >
              <div className="text-center">
                <svg className="w-8 h-8 text-blue-600 mx-auto mb-2 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="text-sm font-medium text-blue-600">Create Post</span>
              </div>
            </button>

            <button
              onClick={() => router.push('/photos')}
              className="flex items-center justify-center p-4 bg-purple-50 hover:bg-purple-100 rounded-lg border-2 border-dashed border-purple-300 hover:border-purple-400 transition-colors group"
            >
              <div className="text-center">
                <svg className="w-8 h-8 text-purple-600 mx-auto mb-2 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-sm font-medium text-purple-600">View Gallery</span>
              </div>
            </button>

            <button
              onClick={() => router.push('/blog')}
              className="flex items-center justify-center p-4 bg-green-50 hover:bg-green-100 rounded-lg border-2 border-dashed border-green-300 hover:border-green-400 transition-colors group"
            >
              <div className="text-center">
                <svg className="w-8 h-8 text-green-600 mx-auto mb-2 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <span className="text-sm font-medium text-green-600">Preview Blog</span>
              </div>
            </button>

            <button
              onClick={() => router.push('/tracks-management')}
              className="flex items-center justify-center p-4 bg-orange-50 hover:bg-orange-100 rounded-lg border-2 border-dashed border-orange-300 hover:border-orange-400 transition-colors group"
            >
              <div className="text-center">
                <svg className="w-8 h-8 text-orange-600 mx-auto mb-2 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
                <span className="text-sm font-medium text-orange-600">Manage Tracks</span>
              </div>
            </button>

            <div className="flex items-center justify-center p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <div className="text-center">
                <svg className="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="text-sm font-medium text-gray-400">More Soon</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bulk Upload Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center space-x-4 mb-6">
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 12l2 2 4-4" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Bulk Upload Posts</h2>
              <p className="text-gray-600">Upload multiple blog posts at once using JSON or CSV format</p>
            </div>
          </div>

          <div className="bg-indigo-50 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-indigo-900 mb-2">📋 File Format Requirements:</h3>
            <div className="text-sm text-indigo-800 space-y-1">
              <p><strong>JSON Format:</strong> Array of objects with fields: title, content, author, imgUrl, etc.</p>
              <p><strong>CSV Format:</strong> Headers in first row: title,content,author,imgUrl,isPublished</p>
              <p><strong>Required Fields:</strong> title, content (maps to postText internally)</p>
              <p><strong>Note:</strong> content → postText, imgUrl → postImg (auto-mapped)</p>
            </div>
          </div>

          <form onSubmit={handleBulkUpload} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select File (JSON or CSV)
              </label>
              <input
                type="file"
                accept=".json,.csv"
                onChange={(e) => setBulkFile(e.target.files[0])}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            
            {bulkFile && (
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm text-gray-600">
                  📁 Selected: <span className="font-medium">{bulkFile.name}</span>
                  <span className="ml-2 text-gray-500">({(bulkFile.size / 1024).toFixed(1)} KB)</span>
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={!bulkFile || bulkUploading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 px-6 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {bulkUploading ? (
                <span className="flex items-center justify-center space-x-2">
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Uploading Posts...</span>
                </span>
              ) : (
                <span className="flex items-center justify-center space-x-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <span>Upload All Posts</span>
                </span>
              )}
            </button>
          </form>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Published Posts */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">Recent Posts</h2>
                  <span className="text-sm text-gray-500">{postList.length} total</span>
                </div>
              </div>
              <div className="p-6">
                {postList.length > 0 ? (
                  <div className="space-y-4">
                    {postList.slice(0, 5).map((post) => (
                      <div key={post.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900 truncate">{post.title}</h3>
                          <p className="text-sm text-gray-500 mt-1">
                            {safeFormatDate(post.createdAt)}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2 ml-4">
                          <button
                            onClick={() =>
                              router.push({
                                pathname: "/createpost",
                                query: { postId: post.id },
                              })
                            }
                            className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={async () => {
                              const confirmed = confirm("Are you sure you want to delete this post?");
                              if (!confirmed) return;

                              const success = await deletePost(post.id);
                              if (success) {
                                setPostList(prevPosts => prevPosts.filter(p => p.id !== post.id));
                              }
                            }}
                            className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>

                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-gray-500">No posts yet. Create your first post!</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Scheduled Posts */}
            {scheduledPosts.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Scheduled</h2>
                </div>
                <div className="p-6">
                  <div className="space-y-3">
                    {scheduledPosts.slice(0, 3).map((post) => (
                      <div key={post.id} className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                        <h3 className="font-medium text-gray-900 text-sm truncate">{post.title}</h3>
                        <p className="text-xs text-orange-600 mt-1">
                          {formatScheduledDate(post.scheduledFor)}
                        </p>
                        <div className="flex space-x-2 mt-2">
                          <button
                            onClick={() =>
                              router.push({
                                pathname: "/createpost",
                                query: { postId: post.id },
                              })
                            }
                            className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={async () => {
                              await deletePost(post);
                              setScheduledPosts((prevPosts) => prevPosts.filter((p) => p.id !== post.id));
                            }}
                            className="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700 transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Photo Upload */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Quick Upload</h2>
              </div>
              <div className="p-6">
                <form onSubmit={handlePhotoUpload} className="space-y-4">
                  <div>
                    <input
                      type="text"
                      value={photoTitle}
                      onChange={(e) => setPhotoTitle(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      placeholder="Photo title"
                    />
                  </div>
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setSelectedFile(e.target.files[0])}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!selectedFile || uploading}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploading ? "Uploading..." : "Upload Photo"}
                  </button>
                </form>
              </div>
            </div>

            {/* Recent Photos */}
            {photos.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Recent Photos</h2>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-2 gap-3">
                    {photos.slice(0, 4).map((photo) => (
                      <div key={photo.id} className="relative group">
                        <img
                          src={photo.url}
                          alt={photo.title || "Gallery image"}
                          className="w-full h-20 object-cover rounded-lg"
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 rounded-lg transition-all duration-200 flex items-center justify-center">
                          <button
                            onClick={() => handlePhotoDelete(photo.id, photo.storagePath)}
                            className="opacity-0 group-hover:opacity-100 text-white p-1 bg-red-600 rounded-full hover:bg-red-700 transition-all"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
