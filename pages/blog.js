import Head from "next/head";
import Link from "next/link";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";

import Smallpostcard from "../components/Smallpostcard";
import { supabase } from "../lib/supabaseClient";

const blog = () => {
  const router = useRouter();
  const [postsLists, setPostList] = useState([]);

  useEffect(() => {
    let isMounted = true;

    const getPosts = async () => {
      try {
        // Fetch only published posts
        const { data, error } = await supabase
          .from("posts")
          .select("*")
          .eq("is_published", true)
          .order("created_at", { ascending: false });

        if (error) throw error;

        if (isMounted && data) {
          setPostList(data);
        }
      } catch (error) {
        console.error("Error fetching posts:", error.message);
      }
    };

    getPosts();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#1a1a1a]">
      <Head>
      {/* Coded by: Kaya Jones
  website: https://kayacancode.com/ */}
        <title>In Suave We Trust</title>
        <meta charset="UTF-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        <meta http-equiv="X-UA-Compatible" content="ie=edge" />
        <meta name ="title" content = "In Suave We Trust" />
        <meta name="description" content="In Suave We Trust · Album Reviews · New Music Reviews · Trusty Fits. Menu . Welcome to In Suave We Trust! " />
        <meta property="og:title" content="In Suave We Trust"/>
        <meta name="og:description" content="In Suave We Trust · Album Reviews · New Music Reviews · Trusty Fits. Menu . Welcome to In Suave We Trust! " />
        <meta name="og:url" content="insuavewetrust.com/ " />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="In Suave We Trust"/>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="text-center text-white bg-[#1a1a1a] p-5 top-0 w-full flex items-center justify-between shadow-lg">
        <div className="flex items-center">
          <Link href="/AppHome" className="hover:opacity-80 transition-opacity">
            <img
              src="/arrow.png"
              className="w-8 h-8 cursor-pointer"
              alt="Back"
            />
          </Link>
        </div>
        
        <div className="flex-1">
          <h1 className="font-bold text-3xl">Posts</h1>
        </div>

        <div className="flex items-center">
          <Link href="/adminsignin" className="hover:opacity-80 transition-opacity">
            <img src="/adminprofile.png" width="40px" height="40px" alt="Admin" />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 p-8">
        {postsLists.map((post) => (
          <div key={post.id} className="transform hover:scale-105 transition-transform duration-200">
            <div className="w-full h-48 relative">
            <Smallpostcard
              img={post.post_img}
              title={post.title}
              className="w-full h-full object-cover"
              click={() => router.push("/view-post?id="+ post.id + "&title="+ post.title.toLowerCase().replace(/\s/g, ""))}
            />
          </div>
          </div>
        ))}
      </div>
    </div>
  );
};
export default blog;
