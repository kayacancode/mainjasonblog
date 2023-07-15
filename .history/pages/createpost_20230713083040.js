import React, { useEffect, useState, useContext } from "react";
import Header from "../components/Header";
import Image from "next/image";
import { useRouter } from "next/router";
import {
  collection,
  doc,
  setDoc,
  addDoc,
  getDoc,
  updateDoc,
  query,
  limit,
  getDocs,
} from "firebase/firestore";
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from "firebase/storage";
import { Footer } from "../components";
import { auth, db } from "../firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import firebase from "../firebase";
import { async } from "@firebase/util";
import { storage } from "../firebase";
import Link from "next/link";
// import { v4 } from "uuid";
import { GrGallery } from "react-icons/gr";
import { BiHappyAlt } from "react-icons/bi";
import Select from "react-select";
import UserHeader from "../components/UserHeader.js";
import MultiTagInput from "../components/MultiSelectInput";
import { Plus } from "react-feather";
import { AuthContext } from "../Context/Auth";
const Createpost = () => {
  const router = useRouter();
  const { user } = useContext(AuthContext);
  const [showInput, setShowInput] = useState(false);
  const [showInput2, setShowInput2] = useState(false);

  const handleAddClick = () => {
    setShowInput(true);
  };

  const handleCancelClick = () => {
    setShowInput(false);
  };
  const handleAddClick2 = () => {
    setShowInput2(true);
  };

  const handleCancelClick2 = () => {
    setShowInput2(false);
  };
  const storage = getStorage();
  const [loading, setLoading] = useState(false);
  const [postText, setPostText] = useState("");
  const [title, setTitle] = useState("");
  const [url1, setUrl1] = useState("");
  const [url2, setUrl2] = useState("");
  const [rolename1, setrolename1] = useState("");
  const [taskdesc1, settaskdesc1] = useState("");
  const [imgFile, setImageFile] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [image, setImage] = useState(null);
  const [statusProject, setStatusProject] = useState(null);
  const [currentProject, setCurrentProject] = useState(null);

  const [userList, setUserList] = useState([]);

  useEffect(() => {
    (async () => {
      if (router.query.projectId) {
        await fetchProjectData();
      }
    })();
  }, [router.query.projectId]);

  const fetchProjectData = async () => {
    const docRef = doc(db, "posts", router.query.projectId);
    const docSnap = await getDoc(docRef);

    const q = query(collection(db, "users"));

    const querySnapshot = await getDocs(q);
    setUserList(
      querySnapshot.docs.map((doc) => {
        return {
          ...doc.data(),
          userID: doc.id,
        };
      })
    );

    if (docSnap.exists()) {
      console.log("Document data:", docSnap.data());
      let data = docSnap.data();
      data.id = docSnap.id;
      setTitle(data?.title);
      setPostText(data?.postText);
      setUrl1(data?.url1);
      setUrl2(data?.url2);
      setrolename1(data?.rolename1);
      settaskdesc1(data?.taskdesc1);
      setSelectedOption(
        data?.typeOfPeople.map((item) => ({ label: item, value: item }))
      );
      setStatusProject(
        data?.statusOfProject.map((item) => ({ label: item, value: item }))
      );

      setPreviewImage(data?.postImg);
      setImage(data?.postImg);
      setCurrentProject(data);
    }
  };

  const options = [
    { value: "web developer", label: "Web developer" },
    { value: "mobile developer", label: "Mobile Developer" },
    { value: "UI Designer", label: "UI Designer" },
    { value: "Animator", label: "Animator" },
    { value: "Graphic Designer", label: "Graphic Designer" },
    { value: "SEO Expert", label: "SEO Expert" },
    { value: "Voice Artist", label: "Voice Artist" },
    { value: "Game Developer", label: "Game Developer" },
    { value: "Visual Designer", label: "Visual Designer" },
    { value: "3D Modeler", label: "3D Modeler" },
  ];
  const status = [
    { value: "Idea", label: "Idea" },
    { value: "Team Building", label: "Team Building" },
    { value: "MVP", label: "MVP" },
    { value: "Designing", label: "Designing" },
    { value: "Developer", label: "Developer" },
  ];

  function signOutUser() {
    signOut(auth)
      .then(() => {
        console.log("signOut success");
      })
      .catch((error) => {
        // An error happened.
        alert(error.message);
      });
  }
  const [isOpen, setIsOpen] = useState(true);

  function toggleSidebar() {
    setIsOpen(!isOpen);
  }
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };
  const handleViewProfile = () => {
    router.push({
      pathname: "/UserProfile",
      query: { id: user?.id },
    });
  };
  const handleEditProfile = () => {
    // Implement your logic for editing the user profile
    // e.g. redirect to an edit profile page
    router.push({
      pathname: "/profile",
    });
  };
  function signOutUser() {
    signOut(auth)
      .then(() => {
        console.log("signOut success");
        router.push("/");
      })
      .catch((error) => {
        // An error happened.
        alert(error.message);
      });
  }
  const handlePost = async (e) => {
    e.preventDefault();

    if (router.query.projectId === undefined) {
      if (!title || !postText || !selectedOption || !imgFile) {
        setError("Please fill all the fields");
        return;
      }
    }

    setError(null);

    if (loading) {
      return;
    }
    setLoading(true);

    let data = {
      title: title || "",
      postText: postText || "",
      userId: user.id || "",
      typeOfPeople: selectedOption?.map((item) => item?.label) || [],
      statusOfProject: statusProject?.map((item) => item?.label) || [],
      url1: url1 || "",
      url2: url2 || "",
      rolename1: rolename1 || "",
      taskdesc1: taskdesc1 || "",
      postImg: image || "",
    };
    console.log(data);
    try {
      if (router.query.projectId) {
        const postRef = doc(db, "posts", router.query.projectId);
        await updateDoc(postRef, data);

        if (image) {
          setLoading(false);
          router.push("/Dashboard");
          return;
        }
        await imageUpload(router.query.projectId);

        return;
      }
      const docRef = collection(db, "posts");
      const { id } = await addDoc(docRef, { ...data, createdAt: Date.now() });

      console.log("Document written with ID: ", id);
      await imageUpload(id);
    } catch (err) {
      console.log("er", err);
    }
  };

  const imageUpload = async (postId) => {
    const storageRef = ref(storage, "builder/" + user.id + "/" + postId);
    const uploadTask = uploadBytesResumable(storageRef, imgFile);
    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const progress =
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        console.log("Upload is " + progress + "% done");
        setProgress(progress);
        switch (snapshot.state) {
          case "paused":
            console.log("Upload is paused");
            break;
          case "running":
            console.log("Upload is running");
            break;
        }
      },
      (error) => {
        console.log(error);
        switch (error.code) {
          case "storage/unauthorized":
            break;
          case "storage/canceled":
            break;
          case "storage/unknown":
            break;
        }
      },
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        // update postRef with downloadURL
        const postRef = doc(db, "posts", postId);

        await setDoc(postRef, { postImg: downloadURL }, { merge: true });
        setLoading(false);
        setProgress(null);

        router.push("/Dashboard");

        // router.back();
      }
    );
  };

  function getBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  }

  const selectImage = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const base64 = await getBase64(file);
      setPreviewImage(base64);
      setImage(null);
      setImageFile(file);
    }
  };

  return (
    <div className=" font-Archivo bg-[#f6f9fc] text-[#0a2540] h-[100%] ">
      <aside
        className={`bg-[#020738] items-center fixed  ${
          !isOpen ? "translate-x-0 ease-out" : "-translate-x-full ease-in"
        } z-10 top-0 pb-3   flex flex-col justify-between h-screen border-r border-[#7F8596] transition duration-300 w-24 lg:translate-x-0 `}
      >
        <div className="relative">
          <div
            onClick={toggleSidebar}
            className="absolute  cursor-pointer -right-2 top-3 lg:hidden"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-8 h-8 text-[#0a2540]"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          {/* <div className="-mx-6 px-6 py-4">
            <Link href="#" title="home">
              <img
                src="/betawhitelogo.png"
                alt="logo"
                width={200}
                height={200}
              />
            </Link>
          </div> */}

          <ul className="space-y-2 tracking-wide mt-8">
            <li>
              <Link
                href="/Dashboard"
                aria-label="Dashboard"
                className="relative px-4 py-3 flex items-center space-x-4  text-[#0a2540] rounded-xl "
              >
                <svg
                  width="30"
                  height="31"
                  viewBox="0 0 30 31"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M0 5.5C0 4.17392 0.526784 2.90215 1.46447 1.96447C2.40215 1.02678 3.67392 0.5 5 0.5H7.5C8.82608 0.5 10.0979 1.02678 11.0355 1.96447C11.9732 2.90215 12.5 4.17392 12.5 5.5V8C12.5 9.32608 11.9732 10.5979 11.0355 11.5355C10.0979 12.4732 8.82608 13 7.5 13H5C3.67392 13 2.40215 12.4732 1.46447 11.5355C0.526784 10.5979 0 9.32608 0 8V5.5ZM0 23C0 21.6739 0.526784 20.4021 1.46447 19.4645C2.40215 18.5268 3.67392 18 5 18H7.5C8.82608 18 10.0979 18.5268 11.0355 19.4645C11.9732 20.4021 12.5 21.6739 12.5 23V25.5C12.5 26.8261 11.9732 28.0979 11.0355 29.0355C10.0979 29.9732 8.82608 30.5 7.5 30.5H5C3.67392 30.5 2.40215 29.9732 1.46447 29.0355C0.526784 28.0979 0 26.8261 0 25.5V23Z"
                    fill="white"
                  />
                  <path
                    d="M17.5 5.5C17.5 4.17392 18.0268 2.90215 18.9645 1.96447C19.9021 1.02678 21.1739 0.5 22.5 0.5H25C26.3261 0.5 27.5979 1.02678 28.5355 1.96447C29.4732 2.90215 30 4.17392 30 5.5V8C30 9.32608 29.4732 10.5979 28.5355 11.5355C27.5979 12.4732 26.3261 13 25 13H22.5C21.1739 13 19.9021 12.4732 18.9645 11.5355C18.0268 10.5979 17.5 9.32608 17.5 8V5.5Z"
                    fill="white"
                  />
                  <path
                    d="M17.5 23C17.5 21.6739 18.0268 20.4021 18.9645 19.4645C19.9021 18.5268 21.1739 18 22.5 18H25C26.3261 18 27.5979 18.5268 28.5355 19.4645C29.4732 20.4021 30 21.6739 30 23V25.5C30 26.8261 29.4732 28.0979 28.5355 29.0355C27.5979 29.9732 26.3261 30.5 25 30.5H22.5C21.1739 30.5 19.9021 29.9732 18.9645 29.0355C18.0268 28.0979 17.5 26.8261 17.5 25.5V23Z"
                    fill="white"
                  />
                  <title>Mission Control</title>
                </svg>

                {/* <span className="-mr-1 font-medium">Mission Control</span> */}
              </Link>
            </li>

            <li>
              <Link
                href="/projxuniverse"
                className="px-4 py-3 flex items-center space-x-4 rounded-md text-[#0a2540] group"
              >
                <svg
                  width="30"
                  height="31"
                  viewBox="0 0 30 31"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M18.9922 1.04927C18.1993 0.816603 17.3849 0.664881 16.5614 0.596426C14.7394 0.382185 12.893 0.525755 11.1261 1.01908L11.0204 1.04927C7.85249 1.91894 5.05809 3.80501 3.06697 6.41739C1.07585 9.02977 -0.00171344 12.2238 2.04511e-06 15.5082C0.00171753 18.7926 1.08262 21.9855 3.07647 24.5958C5.07031 27.2061 7.86668 29.0892 11.0355 29.9556C12.1955 30.2823 13.3935 30.4549 14.5986 30.4688C14.7331 30.4933 14.8697 30.5034 15.0063 30.499C16.3486 30.5016 17.6849 30.3187 18.9771 29.9556C22.1432 29.0862 24.9363 27.2019 26.9276 24.5919C28.9189 21.982 29.9983 18.7907 30 15.5082C30.0017 12.2256 28.9257 9.03322 26.9371 6.4212C24.9485 3.80918 22.1574 1.92194 18.9922 1.04927ZM18.5845 2.49835C20.5394 3.03936 22.3471 4.01373 23.8736 5.34909C25.4001 6.68445 26.606 8.34648 27.4019 10.2117H20.9701C20.2024 7.24827 18.7898 4.49077 16.8332 2.13608C17.4249 2.21475 18.0102 2.33582 18.5845 2.49835ZM15.0063 2.3625C17.069 4.59625 18.5744 7.28576 19.3998 10.2117H10.5825C11.4045 7.27869 12.922 4.58715 15.0063 2.36552V2.3625ZM19.7773 11.7212C20.2604 14.2189 20.2604 16.786 19.7773 19.2836H10.2353C9.97973 18.0421 9.85324 16.7775 9.85782 15.51C9.854 14.2375 9.98048 12.9679 10.2353 11.7212H19.7773ZM11.3223 2.52854L11.428 2.49835C12.0037 2.345 12.5887 2.22903 13.1794 2.15118C11.2122 4.49647 9.79368 7.25137 9.02742 10.2148H2.61826C3.4109 8.3702 4.6026 6.72421 6.10763 5.39518C7.61265 4.06615 9.39359 3.08713 11.3223 2.52854ZM1.50855 15.51C1.50879 14.2266 1.697 12.9501 2.06718 11.7212H8.69526C8.46539 12.9711 8.34917 14.2392 8.34801 15.51C8.34847 16.7758 8.46471 18.039 8.69526 19.2836H2.06718C1.69591 18.0602 1.50767 16.7885 1.50855 15.51ZM11.428 28.5065C9.47118 27.9698 7.66131 26.997 6.13423 25.6611C4.60715 24.3253 3.40251 22.661 2.61071 20.7931H9.01232C9.78653 23.7631 11.2155 26.5224 13.1945 28.8688C12.5976 28.7916 12.0071 28.6705 11.428 28.5065ZM10.5825 20.7931H19.3998C18.5843 23.7276 17.0777 26.4242 15.0063 28.6574C12.9349 26.4193 11.4195 23.7253 10.5825 20.7931ZM18.5845 28.5065C18.0024 28.6576 17.4127 28.7785 16.8181 28.8688C18.7792 26.5149 20.1969 23.7575 20.9701 20.7931H27.4019C26.6078 22.6595 25.4024 24.3225 23.8757 25.6581C22.349 26.9937 20.5403 27.9674 18.5845 28.5065ZM21.3022 19.2836C21.7703 16.7845 21.7703 14.2203 21.3022 11.7212H27.9303C28.3078 12.9485 28.4962 14.226 28.4889 15.51C28.4926 16.7876 28.3095 18.0589 27.9454 19.2836H21.3022Z"
                    fill="white"
                  />
                  <title>ProjX Universe</title>
                </svg>

                {/* <span className="group-hover:text-[#7F8596]">
                  ProjX Universe
                </span> */}
              </Link>
            </li>
            <li>
              <Link
                href="/createproject"
                className="px-4 py-3 flex items-center space-x-4 rounded-md text-[#0a2540] group"
              >
                <svg
                  width="30"
                  height="31"
                  viewBox="0 0 30 31"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M15 0.5C23.2843 0.5 30 7.21573 30 15.5C30 23.7843 23.2843 30.5 15 30.5C6.71573 30.5 0 23.7843 0 15.5C0 7.21573 6.71573 0.5 15 0.5ZM15 2.375C7.75126 2.375 1.875 8.25126 1.875 15.5C1.875 22.7487 7.75126 28.625 15 28.625C22.2487 28.625 28.125 22.7487 28.125 15.5C28.125 8.25126 22.2487 2.375 15 2.375ZM15.9375 9.875V14.5625H20.625V16.4375H15.9375V21.125H14.0625V16.4375H9.375V14.5625H14.0625V9.875H15.9375Z"
                    fill="white"
                  />
                  <title>Create a project</title>
                </svg>
                {/* 
                <span className="group-hover:text-[#7F8596]">
                  Create a project
                </span> */}
              </Link>
            </li>

            <li>
              <Link
                href="https://tally.so/r/wgaxb4"
                className="px-4 py-3 flex items-center space-x-4 rounded-md text-[#0a2540] group"
              >
                <svg
                  width="30"
                  height="23"
                  viewBox="0 0 30 23"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fill-rule="evenodd"
                    clip-rule="evenodd"
                    d="M0 4C0 3.00544 0.395088 2.05161 1.09835 1.34835C1.80161 0.645088 2.75544 0.25 3.75 0.25H11.25L15 4H22.5C23.4946 4 24.4484 4.39509 25.1516 5.09835C25.8549 5.80161 26.25 6.75544 26.25 7.75V9.625H11.25C9.75816 9.625 8.32742 10.2176 7.27252 11.2725C6.21763 12.3274 5.625 13.7582 5.625 15.25V18.0625C5.625 18.8084 5.32868 19.5238 4.80124 20.0512C4.27379 20.5787 3.55842 20.875 2.8125 20.875C2.06658 20.875 1.35121 20.5787 0.823762 20.0512C0.296316 19.5238 1.11151e-08 18.8084 0 18.0625V4Z"
                    fill="white"
                  />
                  <path
                    d="M7.5 15.25C7.5 14.2554 7.89509 13.3016 8.59835 12.5984C9.30161 11.8951 10.2554 11.5 11.25 11.5H26.25C27.2446 11.5 28.1984 11.8951 28.9016 12.5984C29.6049 13.3016 30 14.2554 30 15.25V19C30 19.9946 29.6049 20.9484 28.9016 21.6516C28.1984 22.3549 27.2446 22.75 26.25 22.75H0H3.75C4.74456 22.75 5.69839 22.3549 6.40165 21.6516C7.10491 20.9484 7.5 19.9946 7.5 19V15.25Z"
                    fill="white"
                  />
                  <title>Beta feedback forum</title>
                </svg>

                {/* <span className="group-hover:text-[#7F8596]">
                  Beta feedback form
                </span> */}
              </Link>
            </li>

            <div className="relative">
              <span
                onClick={toggleDropdown}
                className="px-4 py-3 flex  cursor-pointer items-center space-x-4 rounded-md text-[#0a2540] group"
              >
                <Image
                  src={user?.picture || "/user.png"}
                  alt={"profile"}
                  width={30}
                  height={30}
                  className="rounded-full"
                />
                {/* <span className="group-hover:text-[#7F8596] ">{user?.name || user?.handle}</span> */}
              </span>
              {isDropdownOpen && (
                <div className="absolute  mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5">
                  <div
                    className="py-1"
                    role="menu"
                    aria-orientation="vertical"
                    aria-labelledby="options-menu"
                  >
                    <div
                      onClick={handleViewProfile}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 cursor-pointer"
                      role="menuitem"
                    >
                      View My Profile
                    </div>
                    <div
                      onClick={handleEditProfile}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 cursor-pointer"
                      role="menuitem"
                    >
                      Edit My Profile
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ul>
        </div>

        <div className="px-6 -mx-6 pt-4 flex justify-between items-center ">
          <button
            onClick={signOutUser}
            className="px-4 py-3 flex items-center space-x-4 rounded-md text-[#0a2540] group"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
              <title>Signout</title>
            </svg>
            {/* <span className="group-hover:text-[#7F8596]">Log out</span> */}
          </button>
        </div>
        <div></div>
      </aside>
      <div className="   text-[#0a2540] pt-10">
        <button
          onClick={toggleSidebar}
          className="w-12 h-16 ml-10 -mr-2 text-[#0a2540] lg:hidden"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6 my-auto"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
        <form
          className=" max-w-lg mx-auto p-4 bg-white rounded shadow-lg"
          onSubmit={(e) => handlePost(e)}
        >
          <div className="block md:flex">
            <div className=" text-center ">
              <h1 className="	 text-[#0a2540] font-Archio mb-10 	 text-5xl	 py-2 	">
                Create a New Blog Post
              </h1>
              <div className="mb-4">
                <label
                  className="block mb-2 text-lg font-medium"
                  htmlFor="title"
                >
                  Project Title<span className="text-[#d1202f]">*</span>
                </label>

                <input
                  placeholder="Enter project title"
                  value={title}
                  required
                  onChange={(event) => {
                    setTitle(event.target.value);
                  }}
                  className="text-xl sm:text-2xl text-[#040404] mb-4 bg-[#e7f0fe] shadow-lg w-full sm:w-96 rounded py-2 pl-2 pr-8 shadow-sm"
                />
              </div>
              <div className="mb-4">
                  <label className="block mb-2 text-lg font-medium">
                    Description<span className="text-[#d1202f]">*</span>:
                  </label>
                </div>
                <div className="rounded">
                  <h3 className="text-base   sm:text-lg">
                    Write a detailed description of your project, including the
                    type of team members you are looking for and the current
                    stage of your project. You can also add links to your GitHub
                    and other platforms where you showcase your work!
                  </h3>
                  <textarea
                    value={postText}
                    required
                    onChange={(event) => {
                      setPostText(event.target.value);
                    }}
                    className="resize-none bg-transparent bg-[#e7f0fe]  p-4 outline-none max-h-80 h-25 w-full sm:w-96 border-b-2 rounded"
                    placeholder="Enter project description"
                    ></textarea>
              </div>
              <h2 className="text-xl text-[#0a2540] font-bold pt-8">
                Upload file
              </h2>
              <h2 className="text-base sm:text-lg text-[#0a2540] pt-2">
                Upload a cover photo for your shiny new project
              </h2>
              <div className="p-10 sm:p-20 bg-[#e7f0fe] block  rounded mt-2  ">
                <div className="text-center block">
                  <label className="text-xl">
                    Upload an image file - PNGs, JPEGS, HEICS
                  </label>
                  <input
                    type="file"
                    className="bg-[#A3CBD4] text-[#0a2540] p-4 w-full lg: w-[200px] sm:w-[263px] rounded my-2 text-center"
                    onClick={(e) => (e.target.value = null)}
                    onChange={(event) => selectImage(event)}
                    id="imageUploader"
                  />
                </div>
              </div>

      </div>
       
</div>
          <div className="mt-10">
            <h1>Preview your post:</h1>

            <div className="m-5 p-3 bg-[#f6f9fc] rounded shadow-lg ">
              <Link href="#">
                {previewImage && (
                  <img
                    className="rounded-t-lg"
                    src={previewImage || ""}
                    alt="image"
                    height={100}
                    width="100%"
                  />
                )}
              </Link>

              <div className="p-5 text-center">
                <a href="#">
                  <h5 className="mb-2 text-lg  font-bold tracking-tight text-[#0a2540]">
                    Project Title
                  </h5>
                
                </a>
                <p className="py-3 h-20 overflow-auto font-normal text-gray-700">
                  Project description
                </p>
                {router?.query?.projectId && (
                  <button
                    onClick={() => {
                      router.push({
                        pathname: "/view-post",
                        query: { id: router.query.projectId },
                      });
                    }}
                    className="inline-flex rounded-full justify-center w-full mt-2 items-center py-2 px-3 text-sm font-extrabold text-center text-[#f6f9fc] bg-[#020738] hover:bg-[#B0D4A5] focus:ring-4 focus:outline-none focus:ring-blue-300"
                  >
                    View Blog Post
                  </button>
                )}
              
                
              </div>
            </div>
            
          </div>
    
          {error && <p className="text-red-500 my-2">{error}</p>}
          <div className="flex justify-center mt-8">
          <button
            type="submit"
            className="bg-[#020738] hover:bg-[#B0D4A5] text-white rounded-full py-2 px-8 "
            >
            {loading
              ? "loading " + (progress > 0 ? Math.round(progress) + "%" : "")
              : router.query.projectId
              ? "Edit Post"
              : "Post"}
          </button>
          </div>
        </form>
        
      </div>
      <Footer/>
    </div>
  );
};

export default Createpost;
