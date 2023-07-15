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
    <div className="flex block w-full h-40 m-2 rounded-xl shadow-lg relative">
  {imgURL && (
    <div
      className="absolute inset-0 bg-black opacity-75 rounded-xl"
      style={{ zIndex: -1 }}
    ></div>
  )}
  <div
 
  >
    <div className="flex items-center  ">
   
      <div className="flex flex-col w-[200px] justify-between  bg-white  shadow-lg rounded p-2">
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
</div>


  
  

  
  );
};

export default AdminPosts;
