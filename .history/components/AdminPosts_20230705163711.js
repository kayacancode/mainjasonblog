import React, { useState ,useEffect, useRef} from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";



const AdminPosts = ({
  title,
  id,
  postText,
  postImg,
  Dashboard,
  imgURL,
  onDelete,
  onEdit,
  isMine,
  statusOfProject
}) => {
  const router = useRouter();
  
   
  
  return (
    

  <div
 
  >
    <div className="flex items-center ">
      {postImg && (
        <div className="rounded-l-md">
          <img
            src={postImg}
            alt="image"
            className="object-cover w-32 p-2 h-32 rounded-xl"
          />
        </div>
      )}
      <div className="flex flex-col justify-between  bg-white  shadow-lg rounded p-2">
        <a href="#">
          <h5 className="text-lg font-bold text-[#0a2540]">{title}</h5>
        </a>
        <div className="flex space-x-2">
            <button             onClick={() => (onEdit ? onEdit() : null)}
             className="rounded-full bg-[#354765] text-white text-xs py-1 px-3 hover:bg-[#7B9CB7]">
              Edit Post
            </button>
          
         
            <button             onClick={() => (onDelete ? onDelete() : null)}
             className="rounded-full bg-[#354765] text-white text-xs py-1 px-3 hover:bg-[#7B9CB7]">
              Delete Post
            </button>
          
        </div>
      </div>
    </div>
  </div>



  
  

  
  );
};

export default AdminPosts;
