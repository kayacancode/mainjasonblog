import React from "react";
import Image from "next/image";
import Link from "next/link";
import styles from "../styles/Home.module.css";

const AppDock = () => {
  return (
    <div>
      <div className={styles.dock}>
        <div className=" flex w-full justify-around	">
          <div className="">
            <Link href="mailto:jason.sekyere@insuavetrust.com">
             
              <Image
                className="cursor-pointer"
                src="/mail.png"
                width={65}
                height={65}
              />
            </Link>
            <div className={styles.text}>Contact</div>
          </div>

          <div className=" content-center text-center">
            <Link href="/Closefreinds">
              <Image
                className="cursor-pointer"
                src="/contacts.png"
                width={65}
                height={65}
              />
            </Link>
            <div className={styles.text}> Close Friends</div>
          </div>

          <div className=" content-center text-center">
            <Link href="">
              <Image
                className="cursor-pointer"
                src="/photos.png"
                width={65}
                height={65}
              />
            </Link>
            <div className={styles.text}> Photos</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppDock;
