import React from "react";

const BlogContent = ({ postText }) => {
  if (!postText) {
    return null;
  }

  const renderContent = () => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = postText.split(urlRegex);

    return parts.map((part, index) => {
      if (part.match(urlRegex)) {
        return <img key={index} src={part} alt="Blog Image" className="max-w-full h-auto rounded-lg my-2" />;
      } else {
        return <span key={index}>{part}</span>;
      }
    });
  };

  return <div className="blog-content mt-4 p-4 bg-gray-800 rounded-lg">{renderContent()}</div>;
};

export default BlogContent;
