import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";
import Link from "next/link";
import BlogContent from "../components/BlogContent";

const Createpost = () => {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [postText, setPostText] = useState("");
  const [imgFile, setImgFile] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [error, setError] = useState(null);

  useEffect(() => {
    if (router.query.postId) fetchPostData();
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
      setPostText(post.post_text);
      setImageUrl(post.post_img);
      setPreviewImage(post.post_img);

      if (post.scheduled_for) {
        const dateObj = new Date(post.scheduled_for);
        setScheduledDate(dateObj.toISOString().split("T")[0]);
        setScheduledTime(dateObj.toTimeString().substring(0, 5));
        setIsScheduled(true);
      }
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

  try {
    // 🔹 Get current signed-in user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      setError("You must be signed in to create or edit a post.");
      setLoading(false);
      return;
    }

    // 🔹 Determine the image URL to use
    let imageUrl = null;

    if (imgFile) {
      // New file selected → upload it
      const fileName = `${user.id}/${Date.now()}-${imgFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from("post-images")
        .upload(fileName, imgFile, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("post-images")
        .getPublicUrl(fileName);

      imageUrl = data.publicUrl;
    } else if (image) {
      // Existing image (when editing) → keep URL
      imageUrl = image;
    } else {
      // No image uploaded → optional: leave null or a default placeholder
      imageUrl = null;
    }

    // 🔹 Prepare scheduled timestamp
    let scheduledTimestamp = null;
    if (isScheduled && scheduledDate && scheduledTime) {
      scheduledTimestamp = new Date(`${scheduledDate}T${scheduledTime}`);
    }

    // 🔹 Construct post object
    const postData = {
      title,
      post_text: postText,
      post_img: imageUrl,
      scheduled_for: scheduledTimestamp,
      is_published: !scheduledTimestamp,
      user_id: user.id, // required for RLS
    };

    if (router.query.postId) {
      // 🔹 UPDATE existing post
      const { error } = await supabase
        .from("posts")
        .update(postData)
        .eq("id", router.query.postId);

      if (error) throw error;
    } else {
      // 🔹 INSERT new post
      const { data: inserted, error } = await supabase
        .from("posts")
        .insert([postData])
        .select();

      if (error) throw error;
      console.log("New post created:", inserted[0]);
    }

    setLoading(false);
    router.push("/admindashboard");
  } catch (err) {
    console.error("Error saving post:", err);
    setError("Failed to save post. Make sure you are signed in and have permissions.");
    setLoading(false);
  }
};


  return (
    <div className="min-h-screen bg-[#1a1a1a] text-white">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="mb-8">
          <Link href="/admindashboard">
            <span className="inline-flex items-center text-[#F2EA6D] hover:text-[#FFD800]">
              ← Back to Dashboard
            </span>
          </Link>
        </div>

        <form className="space-y-6" onSubmit={handlePost}>
          <h1 className="text-4xl font-bold text-[#F2EA6D] border-b-4 border-[#FFD800] pb-2 inline-block">
            {router.query.postId ? "Edit Blog Post" : "Create a New Blog Post"}
          </h1>

          <div>
            <label className="block text-lg mb-2">Title *</label>
            <input
              value={title}
              required
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-[#2a2a2a] border border-gray-700 focus:border-[#F2EA6D] focus:ring-2 focus:ring-[#F2EA6D]"
            />
          </div>

          <div>
            <label className="block text-lg mb-2">Content *</label>
            <textarea
              value={postText}
              required
              onChange={(e) => setPostText(e.target.value)}
              className="w-full h-64 px-4 py-2 rounded-lg bg-[#2a2a2a] border border-gray-700 focus:border-[#F2EA6D] focus:ring-2 focus:ring-[#F2EA6D]"
            />
            <BlogContent postText={postText} />
          </div>

          <div>
            <label className="block text-lg mb-2">Upload Image</label>
            <input type="file" onChange={selectImage} />
            {previewImage && (
              <img src={previewImage} alt="Preview" className="mt-4 max-h-64" />
            )}
          </div>

          <div>
            <label>
              <input
                type="checkbox"
                checked={isScheduled}
                onChange={(e) => setIsScheduled(e.target.checked)}
              />{" "}
              Schedule for later
            </label>
            {isScheduled && (
              <div className="flex gap-4 mt-2">
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className="px-2 py-1 rounded bg-[#1a1a1a] border border-gray-700"
                />
                <input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="px-2 py-1 rounded bg-[#1a1a1a] border border-gray-700"
                />
              </div>
            )}
          </div>

          {error && <div className="text-red-500">{error}</div>}

          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-[#F2EA6D] text-[#1a1a1a] rounded-lg font-bold hover:bg-[#FFD800]"
          >
            {loading ? "Saving..." : router.query.postId ? "Update Post" : "Create Post"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Createpost;
