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
    <div className="flex items-center p-10 ">
     
    <div
    className={` items-center w-20px ${
      postImg ? 'bg-cover bg-center' : 'bg-white'
    } rounded-xl`}
    style={postImg ? { backgroundImage: `url(${postImg})` } : {}}
  >        <a href="#">
          <h5 className="text-lg font-bold text-white]">{title}</h5>
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
