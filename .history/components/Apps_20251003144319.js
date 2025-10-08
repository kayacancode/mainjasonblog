import React from 'react'
import Image from 'next/image'
import Link from 'next/link'

const Apps = () => {
  const apps = [
    { href: "https://open.spotify.com/user/suavemontana", img: "/spotify.png", label: "Spotify" },
    { href: "https://vm.tiktok.com/TTPdBsn3ML/", img: "/tiktok.png", label: "TikTok" },
    { href: "https://www.youtube.com/@Sochaspace", img: "/yt.png", label: "YouTube" },
    { href: "/blog", img: "/blog.png", label: "Blog" },
    { href: "https://www.instagram.com/insuavewetrust/", img: "/insta.png", label: "Instagram" },
    { href: "https://twitter.com/SuaveMontana", img: "/x.jpg", label: "X" },
    { href: "https://sochaspace.com/", img: "/sochalogo.png", label: "Socha" },
    { href: "/privacy-policy", img: "/privacy.svg", label: "Privacy" },
  ];

  return (
    <div className="mt-8 mx-5 grid grid-cols-4 gap-6">
      {apps.map((app, idx) => (
        <div key={idx} className="flex flex-col items-center">
          <Link href={app.href}>
            <Image
              src={app.img}
              alt={app.label}
              width={65}
              height={65}
              className="cursor-pointer rounded-xl"
            />
          </Link>
          <span className="mt-2 text-sm text-center invert">{app.label}</span>
        </div>
      ))}
    </div>
  );
};

export default Apps;
