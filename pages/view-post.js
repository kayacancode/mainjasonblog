import Head from "next/head";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";

const ViewPost = () => {
  const { query } = useRouter();
  const [data, setData] = useState(null);

  useEffect(() => {
    if (query?.id) {
      getPostDetail(query.id);
    }
  }, [query?.id]);

  const getPostDetail = async (id) => {
    try {
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      setData(data);
    } catch (err) {
      console.error("Error fetching post:", err.message);
    }
  };

  return (
    <div className="bg-[#000000] min-h-screen">
      {/* Header */}
      <div className="text-center bg-[#000000] p-5 top-0 w-full flex items-center">
        <div className="flex justify-start">
          <Link href="/blog">
            <img
              src="/arrow.png"
              className="relative cursor-pointer w-8 h-8"
              alt="Back"
            />
          </Link>
        </div>
        <div className="flex-1">
          <h1 className="font-bold text-white text-3xl text-center pr-8">
            In Suave We Trust
          </h1>
        </div>
      </div>

      {/* Post Title */}
      <div className="text-center mt-6">
        <h1 className="text-white text-4xl border-b-4 border-[#FFD800] pb-2 italic inline-block">
          {data?.title}
        </h1>
        {data?.date && (
          <p className="text-gray-400 text-lg mt-2">{data.date}</p>
        )}
      </div>

      {data?.post_img && (
        <div className="relative w-full h-96 mt-10">
          <img
            src={data.post_img}
            className="w-full h-full object-cover opacity-70"
            alt={data?.title}
          />
        </div>
      )}

      <div className="px-6 md:px-20 lg:px-40 py-10">
        <article 
          className="prose prose-lg prose-invert max-w-none prose-headings:text-white prose-p:text-gray-200 prose-p:text-xl prose-p:leading-relaxed prose-strong:text-white prose-a:text-[#F2EA6D] prose-a:no-underline hover:prose-a:underline prose-blockquote:border-l-[#F2EA6D] prose-blockquote:text-gray-400 prose-code:text-[#F2EA6D] prose-pre:bg-[#1a1a1a] prose-img:rounded-lg prose-img:mx-auto"
          dangerouslySetInnerHTML={{ __html: data?.post_text || '' }}
        />
      </div>
    </div>
  );
};

export default ViewPost;
