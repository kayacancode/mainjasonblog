import Link from 'next/link';
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const adminsignup = () => {
    const router = useRouter();
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState("");

  useEffect(() => {
    // Disable signup page in production (check both NODE_ENV and VERCEL_ENV)
    const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';
    if (isProduction) {
      router.push("/");
      return;
    }

    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        router.push("/admindashboard");
      }
    };
    checkUser();
  }, [router]);

  // Show disabled message in production
  const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';
  if (isProduction) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="max-w-md w-full space-y-8 p-8">
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Signup Disabled
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              New user registration is currently disabled in production.
            </p>
            <div className="mt-4">
              <Link href="/" className="text-blue-600 hover:text-blue-500">
                ← Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
                             type="password" 
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
                            type="password" 
                            placeholder="repeat your password" required />

                            </div>

                        
                            <div className="flex items-center justify-between mt-16">
                                <button
                                type="submit"
                                disabled={loading}
                                class="w-full border-4 border-black hover:bg-pastel_green-700 text-tiber font-bold py-2 px-4 focus:outline-none focus:shadow-outline disabled:opacity-50"
                                >
                                    {loading ? "Creating Account..." : "Create Account"}
                                </button>
                            </div>

                            {/* Back to Sign In Link */}
                            <div className="mt-4 text-center">
                                <Link href="/adminsignin">
                                    <button
                                        type="button"
                                        className="text-sm text-gray-600 hover:text-gray-800 underline"
                                    >
                                        Already have an account? Sign in
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

export default adminsignup