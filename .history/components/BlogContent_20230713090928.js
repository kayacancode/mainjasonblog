import React from "react";

const BlogContent = ({ postText }) => {
  const renderContent = () => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = postText.split(urlRegex);

    return parts.map((part, index) => {
      if (part.match(urlRegex)) {
        return <img key={index} src={part} alt="Blog Image" />;
      } else {
        return <span key={index}>{part}</span>;
      }
    });
  };

  return <div className="blog-content" dangerouslySetInnerHTML={{ __html: renderContent() }} />;
};

export default BlogContent;
