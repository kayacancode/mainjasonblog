import React from "react";
import Image from "next/image";
import Link from "next/link";
import styles from "../styles/Home.module.css";

const AppDock = () => {
  const dockItems = [
    { href: "mailto:jason.sekyere@insuavetrust.com", img: "/mail.png", label: "Contact" },
    { href: "/Closefreinds", img: "/contacts.png", label: "Close Friends" },
    { href: "/photos", img: "/photos.png", label: "Photos" },
  ];

  return (
    <div className={styles.dock}>
      <div className="flex w-full justify-around">
        {dockItems.map((item, idx) => (
          <div key={idx} className="flex flex-col items-center">
            <Link href={item.href}>
              <Image
                src={item.img}
                alt={item.label}
                width={65}
                height={65}
                className="cursor-pointer"
              />
            </Link>
            <span className="mt-1 text-sm text-center invert">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AppDock;
