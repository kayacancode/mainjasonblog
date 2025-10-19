import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";

import Smallpostcard from "../components/Smallpostcard";
import { supabase } from "../lib/supabaseClient";

const blog = () => {
  const router = useRouter();
  const [postsLists, setPostList] = useState([]);
  const [postFilter, setPostFilter] = useState('published'); // 'all', 'published', 'unpublished'

  useEffect(() => {
    let isMounted = true;

    const getPosts = async () => {
      try {
        // Debug: Check all posts first
        const { data: allPosts, error: allError } = await supabase
          .from("posts")
          .select("*")
          .order("created_at", { ascending: false });

        if (allError) throw allError;

        // console.log("All posts in database:", allPosts?.length, "posts");
        // console.log("All posts data:", allPosts);
        // console.log("Published posts:", allPosts?.filter(p => p.is_published).length);

        // Apply filter
        let filteredPosts = allPosts;
        if (postFilter === 'published') {
          filteredPosts = allPosts.filter(p => p.is_published);
        } else if (postFilter === 'unpublished') {
          filteredPosts = allPosts.filter(p => !p.is_published);
        }
        // 'all' shows all posts

        // console.log("Filtered posts:", filteredPosts?.length, "posts");
        // console.log("Filtered posts data:", filteredPosts);

        if (isMounted && filteredPosts) {
          setPostList(filteredPosts);
        }
      } catch (error) {
        console.error("Error fetching posts:", error.message);
      }
    };

    getPosts();

    return () => {
      isMounted = false;
    };
  }, [postFilter]);

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
        
        <div className="flex-1 flex items-center justify-center space-x-4">
          <h1 className="font-bold text-3xl">Posts</h1>
          <select
            value={postFilter}
            onChange={(e) => setPostFilter(e.target.value)}
            className="bg-gray-800 text-white border border-gray-600 rounded-lg px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="published">Published</option>
            <option value="unpublished">Unpublished</option>
            <option value="all">All Posts</option>
          </select>
        </div>

        <div className="flex items-center">
          <Link href="/adminsignin" className="hover:opacity-80 transition-opacity">
            <img src="/adminprofile.png" width="40px" height="40px" alt="Admin" />
          </Link>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {postsLists.map((post) => (
            <div key={post.id} className="group">
              <Smallpostcard
                img={post.post_img}
                title={post.title}
                click={() => router.push("/view-post?id="+ post.id + "&title="+ post.title.toLowerCase().replace(/\s/g, ""))}
              />
            </div>
          ))}
        </div>
        
        {postsLists.length === 0 && (
          <div className="text-center py-16">
            <div className="text-gray-400 text-lg">
              {postFilter === 'published' && 'No published posts yet.'}
              {postFilter === 'unpublished' && 'No unpublished posts.'}
              {postFilter === 'all' && 'No posts found.'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
export default blog;
