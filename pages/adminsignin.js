import React, { useState, useEffect } from "react";
import { signInWithEmailAndPassword, onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/router";
import Image from 'next/image'

import { auth } from "../firebase";

const adminsignin = () => {
    const router = useRouter();

    const [form, setForm] = useState({ email: "", password: "" });
    const [userError, setUserError] = useState(false);
    const [passError, setPassError] = useState(false);
    const [authError, setAuthError] = useState(false);
  
    // UNCOMMENT THIS WHEN DONE WITH THE SIGIN PAGE
    useEffect(() => {
      onAuthStateChanged(auth, async (user) => {
        if (user) {
          router.push("/admindashboard");
        }
      });
    }, []);
    const handleChange = (e) => {
        setAuthError(false);
        if (e.target.name === "email") {
          setUserError(false);
        }
        if (e.target.name === "password") {
          setPassError(false);
        }
        setForm({
          ...form,
          [e.target.name]: e.target.value,
        });
      };
      const handleSubmit = (e) => {
        e.preventDefault();
        if (!form.email) {
          setUserError(true);
          return;
        }
        if (!form.password) {
          setPassError(true);
          return;
        }
        handleLogin(form.email, form.password);
      };
    
      const handleLogin = (email, password) => {
        signInWithEmailAndPassword(auth, email, password)
          .then((userCredential) => {
            // signed in
            const user = userCredential.user;
            router.push("/email-verification", undefined, { shallow: true });
          })
          .catch((error) => {
            console.log(error.message);
            const errorCode = error.code;
            const errorMessage = error.message;
            console.log(errorCode);
            if (errorCode === "auth/user-not-found")
              setAuthError("This email is not registered.");
            if (errorCode === "auth/wrong-password") setAuthError("Wrong password");
          });
      };
 
  return (
    <div class= " h-screen bg-black">
    <div>
        <Image src = "/tlogo.png" width="303px" height="297px" />
        </div>

        <div class = "gird grid-cols-3 gap-4">
            <h1 class = "text-center text-[#F2EA6D] font-bold text-3xl">Admin Dashboard</h1>
            <div class = " h-4/6 p-4 flex items-center justify-center text-center  px-8 py-4  ">
                <div class = "w-full max-w-lg">
                    <form 
                    class = "bg-[#F2EA6D] px-5 pt-5 pb-8 mb-4 w-auto "
                    onSubmit={handleSubmit}
                    >
                      

                        <div class = "mb-4 ">
                        <input 
                         value={form.email}
                         onChange={handleChange}
                        class=" bg-[#F2EA6D] border-4 border-black w-full py-2 px-3 text-black leading-tight placeholder-black focus:outline-none focus:shadow-outline" 
                        name = "email" 
                        id="email" 
                        type="text" 
                        placeholder="email address" 
                        required 
                        /> 

                        </div>
                        {userError && (
          <p className="text-red-500 text-xs italic m-1">
            Please Enter a email.
          </p>
        )}

                        <div class = "mb-4 ">
                        <input 
                            value={form.password}
                            id="password"
                            onChange={handleChange}
                        class=" bg-[#F2EA6D] border-4 border-black w-full py-2 px-3 text-black leading-tight placeholder-black focus:outline-none focus:shadow-outline" 
                        name = "password"
                         type="text" 
                         placeholder="password" 
                         required />

                        </div>
                                    {passError && (
                    <p className="text-red-500 text-xs italic">
                        Please Enter a password.
                    </p>
                    )}
                       
                       {authError && <p className="text-red-500 text-xs italic">{authError}</p>}

                    
                        <div className="flex items-center justify-between mt-16">
                            <button
                            type="submit"
                            class="w-full border-4 border-black hover:bg-pastel_green-700 text-tiber font-bold py-2 px-4  focus:outline-none focus:shadow-outline"
                            >
                                Sign in 
                            </button>
                        </div>
                    </form>
                    </div>
            </div>
        </div>
</div>
  )
}

export default adminsignin