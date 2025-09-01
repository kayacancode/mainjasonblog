import React from "react";

const Smallpostcard = (bloginfo) => {

  return (
    <div
      onClick={() => bloginfo?.click && bloginfo.click()}
      className="relative bg-gray-900 w-full h-64 overflow-hidden rounded-lg shadow-lg cursor-pointer"
    >
      <img
        src={
          bloginfo?.img ||
          `https://ui-avatars.com/api/?name=${encodeURI(bloginfo?.title)}`
        }
        alt={bloginfo?.title || "Post image"}
        className="w-full h-full object-cover"
      />

      <div className="absolute left-0 bottom-0 w-full bg-gradient-to-t from-black/70 to-transparent">
        <p className="mx-4 my-2 font-bold text-xl text-white truncate">
          {bloginfo.title}
        </p>
      </div>
    </div>
  );
}
export default Smallpostcard;
