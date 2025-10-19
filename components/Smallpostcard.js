import React from "react";

const Smallpostcard = (bloginfo) => {

  return (
    <div
      onClick={() => bloginfo?.click && bloginfo.click()}
      className="relative bg-gray-900 w-full h-64 overflow-hidden rounded-lg shadow-lg cursor-pointer group hover:shadow-xl hover:scale-105 transition-all duration-300"
    >
      <img
        src={
          bloginfo?.img ||
          `https://ui-avatars.com/api/?name=${encodeURI(bloginfo?.title)}`
        }
        alt={bloginfo?.title || "Post image"}
        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
      />

      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent">
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <p className="font-bold text-lg text-white line-clamp-2 leading-tight">
            {bloginfo.title}
          </p>
        </div>
      </div>
    </div>
  );
}
export default Smallpostcard;
