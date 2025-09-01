import React from "react";

const Bigpostcard = (bloginfo) => {

  return (
       <div className="w-full col-span-0 md:col-span-2	 rounded">
        <div class="relative bg-gray-900	w-full h-full overflow-hidden rounded-lg shadow-lg cursor-pointer">
          <img src="/frankoceanpost.png" className="h-full" alt="img" />

          <div class="absolute left-0 bottom-0 ">
            <p class="mx-4 my-2 leading-normal font-black	text-3xl	 text-gray-100">
              {bloginfo.title}
              <br />
              March 12,2022
            </p>
          </div>
        </div>
        
      </div>
      
  )
}

export default Bigpostcard