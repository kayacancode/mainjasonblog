import Link from 'next/link';
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const adminsignin = () => {
    const router = useRouter();
    const [form, setForm] = useState({ email: "", password: "" });
    const [errors, setErrors] = useState({ email: "", password: "", auth: "" });
    const [loading, setLoading] = useState(false);
    const [resetLoading, setResetLoading] = useState(false);
    const [resetMessage, setResetMessage] = useState("");

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

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    });

    if (error) {
      setErrors((prev) => ({ ...prev, auth: error.message }));
      setLoading(false);
      return;
    }

    router.push("/admindashboard");
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    if (!form.email) {
      setErrors((prev) => ({ ...prev, email: "Please enter your email address first." }));
      return;
    }

    setResetLoading(true);
    setResetMessage("");
    
    const { error } = await supabase.auth.resetPasswordForEmail(form.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      setErrors((prev) => ({ ...prev, auth: error.message }));
    } else {
      setResetMessage("Password reset email sent! Check your inbox.");
    }
    
    setResetLoading(false);
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
                       {resetMessage && <p className="text-green-600 text-xs italic">{resetMessage}</p>}

                    
                        <div className="flex items-center justify-between mt-16">
                            <button
                            type="submit"
                            disabled={loading}
                            class="w-full border-4 border-black hover:bg-pastel_green-700 text-tiber font-bold py-2 px-4 focus:outline-none focus:shadow-outline disabled:opacity-50"
                            >
                                {loading ? "Signing in..." : "Sign in"}
                            </button>
                        </div>

                        {/* Forgot Password Link */}
                        <div className="mt-4 text-center">
                            <button
                                type="button"
                                onClick={handlePasswordReset}
                                disabled={resetLoading}
                                className="text-sm text-blue-600 hover:text-blue-800 underline disabled:opacity-50"
                            >
                                {resetLoading ? "Sending..." : "Forgot Password?"}
                            </button>
                        </div>

                        {/* Sign Up Link */}
                        <div className="mt-4 text-center">
                            <Link href="/adminsignup">
                                <button
                                    type="button"
                                    className="text-sm text-gray-600 hover:text-gray-800 underline"
                                >
                                    Don't have an account? Sign up
                                </button>
                            </Link>
                        </div>
                    </form>
                    </div>
            </div>
        </div>
</div>
  )
}

export default adminsignin