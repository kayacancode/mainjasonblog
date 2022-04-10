import React from 'react'
import Image from 'next/image'
import Link from 'next/Link'

const AppHolder = () => {
  return (
    <div>
        <div class = "flex pr-4 pl-4 w-72">
          <div class = "p-4 w-20 ">
        <Link href ="">
        <Image class="absolute w-16 "  src="/mail.png" width={65} height={65} />
        
        </Link>
        <div class= "	 text-center font-normal text-white	text-xs pb-4"> Contact</div>
        </div>
        <div class = "p-4 w-20">
        <Link href ="">
        <Image src="/contacts.png" width={65} height={65}  />
        
        </Link>
        <div class= "text-center font-normal  text-white text-xs	"> Close Freinds</div>
        </div>
        
        <div class = "p-4 w-20">
        <Link href ="">
        <Image src="/photos.png" width={65} height={65} />
        
        </Link>
        <div class= " text-center font-normal  text-white	 text-xs"> Photos</div>
        </div>
        
        
        
        
       
        </div>

    </div>
  )
}

export default AppHolder