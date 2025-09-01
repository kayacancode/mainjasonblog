
import React from "react";

const Post = (bloginfo) => {


  return (
    <div>
          <div className="grid-cols-3 p-16 space-y-2 md:space-y-0 sm:grid sm:gap-3 sm:grid-rows-3">
           
     {/* <div className="rounded-md w-72  transition-all text-white text-center cursor-pointer ">
               <img src= "../frankoceanpost.png" alt= "Cover img" />
               <div className = "mt-2 p-2">
                 <h2 className = "font-semibold text-xl">
                   {bloginfo.title}
                 </h2>
               </div>

    </div> */}

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
      <div className="w-full rounded">
        <div class="relative bg-gray-900	w-full h-full overflow-hidden rounded-lg shadow-lg cursor-pointer">
          <img src="/positionspost.png" alt="img" />
          {/* <div className="bg-gray-900	 h-full w-full"></div> */}
          <div class="absolute left-0 bottom-0 ">
            <p class="mx-4 my-2 leading-normal font-black	text-3xl	 text-gray-100">
              {bloginfo.title}
              <br />
              March 12,2022
            </p>
          </div>
        </div>
      </div>
      <div className="w-full rounded">
        <div class="relative bg-gray-900	w-full h-full overflow-hidden rounded-lg shadow-lg cursor-pointer">
          <img src="/macpost.png" alt="img" />

          {/* <div className="bg-gray-900	 h-full w-full"></div> */}
          <div class="absolute left-0 bottom-0 ">
            <p class="mx-4 my-2 leading-normal font-black	text-3xl	 text-gray-100">
              {bloginfo.title}
              <br />
              March 12,2022
            </p>
          </div>
        </div>
      </div>

      <div className="w-full rounded">
        <div class="relative bg-gray-900	w-full h-full overflow-hidden rounded-lg shadow-lg cursor-pointer">
          <img src="/kanyepost.png" alt="img" />
          {/* <div className="bg-gray-900	 h-full w-full"></div> */}
          <div class="absolute left-0 bottom-0 ">
            <p class="mx-4 my-2 leading-normal font-black	text-3xl	 text-gray-100">
              {bloginfo.title}
              <br />
              March 12,2022
            </p>
          </div>
        </div>
      </div>
      <div className="w-full rounded">
        <div class="relative bg-gray-900	w-full h-full overflow-hidden rounded-lg shadow-lg cursor-pointer">
          <img src="/agpost.png" alt="img" />
          {/* <div className="bg-gray-900	 h-full w-full"></div> */}
          <div class="absolute left-0 bottom-0 ">
            <p class="mx-4 my-2 leading-normal font-black	text-3xl	 text-gray-100">
              {bloginfo.title}
              <br />
              March 12,2022
            </p>
          </div>
        </div>
      </div>
</div>               
    </div>
  )
}

export default Post