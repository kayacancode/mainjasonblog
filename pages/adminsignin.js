import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from 'next/link';
import { supabase } from "../lib/supabaseClient";

const adminsignin = () => {
    const router = useRouter();
    const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({ email: "", password: "", auth: "" });

  useEffect(() => {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((event, session) => {
    if (session?.user) {
      router.push("/admindashboard");
    }
  });

  return () => {
    subscription.unsubscribe();
  };
}, [router]);


  const handleChange = (e) => {
    setErrors({ ...errors, [e.target.name]: "" });
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email) {
      setErrors((prev) => ({ ...prev, email: "Please enter an email." }));
      return;
    }
    if (!form.password) {
      setErrors((prev) => ({ ...prev, password: "Please enter a password." }));
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    });

    if (error) {
      setErrors((prev) => ({ ...prev, auth: error.message }));
      return;
    }

    router.push("/admindashboard");
  };

  return (
    <div class= " h-screen bg-black">
    <div>
      <Link href= "/AppHome">
        <img src = "/tlogo.png" width="303px" height="297px" />
        </Link>
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
                        {errors.email && (
          <p className="text-red-500 text-xs italic m-1">
            {errors.email}
          </p>
        )}

                        <div class = "mb-4 ">
                        <input 
                            value={form.password}
                            id="password"
                            onChange={handleChange}
                        class=" bg-[#F2EA6D] border-4 border-black w-full py-2 px-3 text-black leading-tight placeholder-black focus:outline-none focus:shadow-outline" 
                        name = "password"
                         type="password" 
                         placeholder="password" 
                         required />

                        </div>
                                    {errors.password && (
                    <p className="text-red-500 text-xs italic">
                        {errors.password}
                    </p>
                    )}
                       
                       {errors.auth && <p className="text-red-500 text-xs italic">{errors.auth}</p>}

                    
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