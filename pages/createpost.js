import Link from "next/link";
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import InstagramAutomation from "../components/InstagramAutomation";
import { supabase } from "../lib/supabaseClient";

// Dynamically import the editor to avoid SSR issues
const RichTextEditor = dynamic(() => import("../components/RichTextEditor"), {
  ssr: false,
  loading: () => (
    <div className="bg-[#2a2a2a] rounded-xl border border-gray-700 p-8 text-center text-gray-400">
      Loading editor...
    </div>
  ),
});

const Createpost = () => {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [postText, setPostText] = useState("");
  const [imgFile, setImgFile] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [error, setError] = useState(null);
  
  // Instagram automation state
  const [instagramEnabled, setInstagramEnabled] = useState(false);
  const [instagramStatus, setInstagramStatus] = useState("none");
  const [instagramAiSummary, setInstagramAiSummary] = useState("");
  const [instagramCoverOverride, setInstagramCoverOverride] = useState("");
  const [instagramPostId, setInstagramPostId] = useState(null);
  const [instagramError, setInstagramError] = useState(null);
  const [instagramPublishedAt, setInstagramPublishedAt] = useState(null);
  const [instagramReady, setInstagramReady] = useState(false);
  const [postId, setPostId] = useState(null);
  const [currentStep, setCurrentStep] = useState("");

  useEffect(() => {
    if (router.query.postId) {
      setPostId(router.query.postId);
      fetchPostData();
    }
  }, [router.query.postId]);

  // Fetch existing post for edit
  const fetchPostData = async () => {
    try {
      const { data: post, error } = await supabase
        .from("posts")
        .select("*")
        .eq("id", router.query.postId)
        .single();
      if (error) throw error;

      setTitle(post.title);
      setSubtitle(post.subtitle || "");
      setPostText(post.post_text);
      setImageUrl(post.post_img);
      setPreviewImage(post.post_img);

      if (post.scheduled_for) {
        const dateObj = new Date(post.scheduled_for);
        setScheduledDate(dateObj.toISOString().split("T")[0]);
        setScheduledTime(dateObj.toTimeString().substring(0, 5));
        setIsScheduled(true);
      }
      
      // Load Instagram automation data
      setInstagramEnabled(post.instagram_enabled || false);
      setInstagramStatus(post.instagram_status || "none");
      setInstagramAiSummary(post.instagram_ai_summary || "");
      setInstagramCoverOverride(post.instagram_cover_override || "");
      setInstagramPostId(post.instagram_post_id || null);
      setInstagramError(post.instagram_error || null);
      setInstagramPublishedAt(post.instagram_published_at || null);
    } catch (err) {
      console.error(err);
      setError("Failed to load post data.");
    }
  };

  const selectImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImgFile(file);

    const reader = new FileReader();
    reader.onload = () => setPreviewImage(reader.result);
    reader.readAsDataURL(file);
    setImageUrl(null); // clear old URL if selecting new image
  };

const handlePost = async (e) => {
  e.preventDefault();

  if (!title || !postText) {
    setError("Please fill all the fields");
    return;
  }

  setLoading(true);
  setError(null);
  setCurrentStep("Authenticating...");

  try {
    // Get current signed-in user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      setError("You must be signed in to create or edit a post.");
      setLoading(false);
      setCurrentStep("");
      return;
    }

    // Determine the image URL to use
    let finalImageUrl = null;

    if (imgFile) {
      setCurrentStep("Uploading image...");
      // New file selected - upload it
      // Sanitize filename: replace spaces and special chars with underscores
      const sanitizedName = imgFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const fileName = `${user.id}/${Date.now()}-${sanitizedName}`;
      const { error: uploadError } = await supabase.storage
        .from("post-images")
        .upload(fileName, imgFile, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("post-images")
        .getPublicUrl(fileName);

      finalImageUrl = data.publicUrl;
    } else if (imageUrl) {
      // Existing image (when editing) - keep URL
      finalImageUrl = imageUrl;
    } else {
      // No image uploaded - leave null
      finalImageUrl = null;
    }

    // Prepare scheduled timestamp
    let scheduledTimestamp = null;
    if (isScheduled && scheduledDate && scheduledTime) {
      scheduledTimestamp = new Date(`${scheduledDate}T${scheduledTime}`);
    }

    setCurrentStep(router.query.postId ? "Updating post..." : "Creating post...");

    // Construct post object with Instagram fields
    const postData = {
      title,
      subtitle: subtitle || null,
      post_text: postText,
      post_img: finalImageUrl,
      scheduled_for: scheduledTimestamp,
      is_published: !scheduledTimestamp,
      user_id: user.id,
      // Instagram automation fields
      instagram_enabled: instagramEnabled,
      instagram_ai_summary: instagramAiSummary || null,
      instagram_cover_override: instagramCoverOverride || null,
    };

    let savedPostId = router.query.postId;

    if (router.query.postId) {
      // UPDATE existing post
      const { error } = await supabase
        .from("posts")
        .update(postData)
        .eq("id", router.query.postId);

      if (error) throw error;
    } else {
      // INSERT new post
      const { data: inserted, error } = await supabase
        .from("posts")
        .insert([postData])
        .select();

      if (error) throw error;
      console.log("New post created:", inserted[0]);
      savedPostId = inserted[0].id;
    }

    // If Instagram automation is enabled and post is published, trigger carousel generation
    if (instagramEnabled && !scheduledTimestamp && savedPostId) {
      setCurrentStep("Preparing Instagram carousel...");
      try {
        const igResponse = await fetch('/api/blog-instagram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            postId: savedPostId,
            mode: 'publish',
            customCoverUrl: instagramCoverOverride || finalImageUrl,
            aiSummaryOverride: instagramAiSummary || undefined
          })
        });
        
        const igData = await igResponse.json();
        if (!igData.success) {
          console.error('Instagram publish failed:', igData.error);
          // Don't fail the whole save, just log the error
        }
      } catch (igError) {
        console.error('Instagram automation error:', igError);
        // Don't fail the whole save
      }
    }

    setCurrentStep("Done! Redirecting...");
    // Small delay so user can see the "Done!" message
    await new Promise(resolve => setTimeout(resolve, 800));
    setLoading(false);
    router.push("/admindashboard");
  } catch (err) {
    console.error("Error saving post:", err);
    setError(
      "Failed to save post. Make sure you are signed in and have permissions."
    );
    setLoading(false);
  }
};

  return (
    <div className="min-h-screen bg-[#1a1a1a] text-white">
      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-[#2a2a2a] rounded-2xl p-8 max-w-md w-full mx-4 border border-gray-700 shadow-2xl">
            <div className="flex flex-col items-center text-center">
              {/* Spinning loader */}
              <div className="relative mb-6">
                <div className="w-16 h-16 border-4 border-gray-600 border-t-[#F2EA6D] rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg className="w-6 h-6 text-[#F2EA6D]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073z"/>
                  </svg>
                </div>
              </div>
              
              {/* Status text */}
              <h3 className="text-xl font-bold text-white mb-2">Creating Your Post</h3>
              <p className="text-[#F2EA6D] font-medium text-lg animate-pulse">
                {currentStep || "Processing..."}
              </p>
              
              {/* Progress hint */}
              <p className="text-gray-400 text-sm mt-4">
                Please wait while we set everything up...
              </p>
            </div>
          </div>
        </div>
      )}
      
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="mb-8">
          <Link href="/admindashboard">
            <span className="inline-flex items-center text-[#F2EA6D] hover:text-[#FFD800]">
              ← Back to Dashboard
            </span>
          </Link>
        </div>

        <form className="space-y-6" onSubmit={handlePost}>
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-[#F2EA6D]">
              {router.query.postId ? "Edit Blog Post" : "Create a New Blog Post"}
            </h1>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => router.push("/admindashboard")}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || (instagramEnabled && !instagramReady) || !title || !postText}
                className="px-6 py-2 bg-[#F2EA6D] text-[#1a1a1a] rounded-lg font-bold hover:bg-[#FFD800] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? "Saving..." : router.query.postId ? "Update Post" : "Publish"}
              </button>
            </div>
          </div>

          {/* Rich Text Editor */}
          <RichTextEditor
            content={postText}
            onChange={setPostText}
            title={title}
            onTitleChange={setTitle}
            subtitle={subtitle}
            onSubtitleChange={setSubtitle}
            placeholder="Start writing your story..."
          />

          {/* Cover Image Upload */}
          <div className="bg-[#2a2a2a] rounded-xl border border-gray-700 p-6">
            <label className="block text-lg font-semibold mb-4 text-white">Cover Image</label>
            <div className="flex items-center gap-4">
              <label className="flex-1 cursor-pointer">
                <div className="flex items-center justify-center px-6 py-4 border-2 border-dashed border-gray-600 rounded-lg hover:border-[#F2EA6D] transition-colors">
                  <div className="text-center">
                    <svg className="w-8 h-8 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-gray-400 text-sm">Click to upload or drag and drop</p>
                    <p className="text-gray-500 text-xs mt-1">PNG, JPG, GIF up to 10MB</p>
                  </div>
                </div>
                <input 
                  type="file" 
                  onChange={selectImage}
                  accept="image/*"
                  className="hidden"
                />
              </label>
              {previewImage && (
                <div className="relative">
                  <img src={previewImage} alt="Preview" className="h-32 w-32 object-cover rounded-lg border border-gray-700" />
                  <button
                    type="button"
                    onClick={() => { setPreviewImage(null); setImgFile(null); setImageUrl(null); }}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Scheduling Options */}
          <div className="bg-[#2a2a2a] rounded-xl border border-gray-700 p-6">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isScheduled}
                onChange={(e) => setIsScheduled(e.target.checked)}
                className="w-5 h-5 rounded border-gray-600 bg-[#1a1a1a] text-[#F2EA6D] focus:ring-[#F2EA6D]"
              />
              <div>
                <span className="text-white font-medium">Schedule for later</span>
                <p className="text-gray-400 text-sm">Set a specific date and time to publish</p>
              </div>
            </label>
            {isScheduled && (
              <div className="flex gap-4 mt-4 ml-8">
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                  min={new Date().toISOString().split("T")[0]}
                  className="px-4 py-2 rounded-lg bg-[#1a1a1a] border border-gray-700 text-white focus:border-[#F2EA6D] focus:ring-1 focus:ring-[#F2EA6D]"
                />
                <input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                  className="px-4 py-2 rounded-lg bg-[#1a1a1a] border border-gray-700 text-white focus:border-[#F2EA6D] focus:ring-1 focus:ring-[#F2EA6D]"
                />
              </div>
            )}
          </div>

          {/* Instagram Automation Section */}
          <div className="pt-4">
            <InstagramAutomation
              postId={postId}
              title={title}
              content={postText}
              coverImage={previewImage}
              initialEnabled={instagramEnabled}
              initialStatus={instagramStatus}
              initialAiSummary={instagramAiSummary}
              initialCoverUrl={instagramCoverOverride}
              instagramPostId={instagramPostId}
              instagramError={instagramError}
              publishedAt={instagramPublishedAt}
              onEnabledChange={setInstagramEnabled}
              onCoverChange={setInstagramCoverOverride}
              onSummaryChange={setInstagramAiSummary}
              onReadyStateChange={setInstagramReady}
            />
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400">
              {error}
            </div>
          )}

          {/* Bottom Action Bar */}
          <div className="flex items-center justify-between py-4 border-t border-gray-700">
            <div className="text-sm text-gray-400">
              {instagramEnabled && !instagramReady && (
                <span className="text-amber-400">
                  Generate slides and AI summary to publish with Instagram
                </span>
              )}
            </div>
            <button
              type="submit"
              disabled={loading || (instagramEnabled && !instagramReady) || !title || !postText}
              className="px-8 py-3 bg-gradient-to-r from-[#F2EA6D] to-[#FFD800] text-[#1a1a1a] rounded-lg font-bold hover:from-[#FFD800] hover:to-[#F2EA6D] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-yellow-900/20"
            >
              {loading ? "Publishing..." : router.query.postId ? "Update Post" : "Publish"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Createpost;
