import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";

const adminsignup = () => {
    const router = useRouter();
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState("");

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        router.push("/admindashboard");
      }
    };
    checkUser();
  }, [router]);

  const register = async (e) => {
    e.preventDefault();

    if (password.length < 6) {
      alert("Password must be at least 6 characters long");
      return;
    }

    if (password !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    // Supabase automatically sends verification emails if enabled
    router.push("/email-verification", undefined, { shallow: true });
    setLoading(false);
  };

  return (
    <div class= "h-screen  bg-black">
        <div>
            <img src = "/tlogo.png" width="303px" height="297px" />
            </div>

            <div class = "gird grid-cols-3 gap-4">
                <h1 class = "text-center text-[#F2EA6D] font-bold text-3xl">Admin Dashboard</h1>
                <div class = " h-4/6 p-4 flex items-center justify-center text-center  px-8 py-4  ">
                <div class = "w-full max-w-lg">

                        <form 
                        class = "bg-[#F2EA6D] px-8 pt-6 pb-8 mb-4 "
                        onSubmit={register}
                        >
                            <div className="mb-4">
                              <input
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="bg-[#F2EA6D] border-4 border-black w-full py-2 px-3 text-black leading-tight placeholder-black focus:outline-none focus:shadow-outline"
                            name="email"
                            id="email"
                            type="email"
                            placeholder="email address"
                            required
                          />
                        </div>
                            <div class = "mb-4 ">
                            <input 
                                value={password}
                                id="password"
                                onChange={(e) => {
                                  setPassword(e.target.value);
                                }}
                            class=" bg-[#F2EA6D] border-4 border-black w-full py-2 px-3 text-black leading-tight placeholder-black focus:outline-none focus:shadow-outline" 
                            name = "password"
                             type="text" 
                             placeholder="enter your password" 
                             required />

                            </div>

                            <div class = "mb-4 ">
                            <input 
                              value={confirmPassword}
                              onChange={(e) => {
                                setConfirmPassword(e.target.value);
                              }}
                            class=" bg-[#F2EA6D] border-4 border-black w-full py-2 px-3 text-black leading-tight placeholder-black focus:outline-none focus:shadow-outline" 
                            id="ConfirmPassword"
                            type="text" 
                            placeholder="repeat your password" required />

                            </div>

                        
                            <div className="flex items-center justify-between mt-16">
                                <button
                                type="submit"
                                class="w-full border-4 border-black hover:bg-pastel_green-700 text-tiber font-bold py-2 px-4  focus:outline-none focus:shadow-outline"
                                >
                                  <a className=" ">
                    {loading ? "Loading..." : "Submit"}
                                        </a>
                                </button>
                            </div>
                        </form>
                        </div>
                </div>
            </div>
    </div>
  )
}

export default adminsignup