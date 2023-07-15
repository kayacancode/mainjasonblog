import React, { useState ,useEffect, useRef} from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";

const MAX_POST_TEXT_LENGTH = 5;

const TruncatedPostText = ({ text }) => {
  const [expanded, setExpanded] = useState(false);

  if (text.split(" ").length > MAX_POST_TEXT_LENGTH && !expanded) {
    const truncatedText = text
      .split(" ")
      .slice(0, MAX_POST_TEXT_LENGTH)
      .join(" ");

    return (
      <>
        {truncatedText}...{" "}
        <button
          className="text-blue-500 hover:underline"
          onClick={() => setExpanded(true)}
        >
          See more
        </button>
      </>
    );
  }

  return <>{text}</>;
};

const OngoingProject = ({
  title,
  id,
  postText,
  postImg,
  Dashboard,
  onDelete,
  onEdit,
  isMine,
  statusOfProject
}) => {
  const router = useRouter();
  
   
  
  return (
    <div className="flex block w-full h-40 m-2 rounded-xl shadow-lg relative">
  {postImg && (
    <div
      className="absolute inset-0 bg-black opacity-75 rounded-xl"
      style={{ zIndex: -1 }}
    ></div>
  )}
  <div
    className={`flex items-center ${
      postImg ? 'bg-cover bg-center' : 'bg-white'
    } rounded-xl`}
    style={postImg ? { backgroundImage: `url(${postImg})` } : {}}
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
        <p className="text-[#0a2540]">Status: {statusOfProject}</p>
        <div className="flex space-x-2">
          {isMine && (
            <button             onClick={() => (onEdit ? onEdit() : null)}
             className="rounded-full bg-[#354765] text-white text-xs py-1 px-3 hover:bg-[#7B9CB7]">
              Edit Post
            </button>
          )}
          <button    onClick={() =>
            router.push({
              pathname: "/workspace",
              query: { id },
            })
          }className="rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs py-1 px-3 hover:bg-[#7B9CB7]">
            Workspace
          </button>
          {isMine && (
            <button             onClick={() => (onDelete ? onDelete() : null)}
             className="rounded-full bg-[#354765] text-white text-xs py-1 px-3 hover:bg-[#7B9CB7]">
              Delete Post
            </button>
          )}
        </div>
      </div>
    </div>
  </div>
</div>


  
  

  
  );
};

export default OngoingProject;
