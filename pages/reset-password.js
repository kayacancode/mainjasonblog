import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function ResetPassword() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [accessToken, setAccessToken] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Capture the token from URL manually before Supabase client consumes it
    const hash = window.location.hash
    if (hash.includes('access_token=')) {
      const tokenMatch = hash.match(/access_token=([^&]*)/)
      if (tokenMatch) setAccessToken(tokenMatch[1])
    }
  }, [])

  const handleReset = async (e) => {
    e.preventDefault()
    
    if (!accessToken) {
      setError('No valid token found.')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    setError('')
    setMessage('')

    const { error: updateError } = await supabase.auth.updateUser(
      { password },
      { accessToken }
    )

    if (updateError) {
      setError(`Error: ${updateError.message}`)
    } else {
      setMessage('Password updated successfully! Redirecting to login...')
      setTimeout(() => router.push('/adminsignin'), 3000)
    }
    
    setLoading(false)
  }

  return (
    <div class="h-screen bg-black">
      <div>
        <Link href="/AppHome">
          <img src="/tlogo.png" width="303px" height="297px" />
        </Link>
      </div>

      <div class="gird grid-cols-3 gap-4">
        <h1 class="text-center text-[#F2EA6D] font-bold text-3xl">Reset Password</h1>
        <div class="h-4/6 p-4 flex items-center justify-center text-center px-8 py-4">
          <div class="w-full max-w-lg">
            <form 
              class="bg-[#F2EA6D] px-5 pt-5 pb-8 mb-4 w-auto"
              onSubmit={handleReset}
            >
              {accessToken ? (
                <>
                  <div class="mb-4">
                    <input 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      class="bg-[#F2EA6D] border-4 border-black w-full py-2 px-3 text-black leading-tight placeholder-black focus:outline-none focus:shadow-outline" 
                      name="password" 
                      id="password" 
                      type="password" 
                      placeholder="New password" 
                      required 
                    />
                  </div>

                  <div class="mb-4">
                    <input 
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      class="bg-[#F2EA6D] border-4 border-black w-full py-2 px-3 text-black leading-tight placeholder-black focus:outline-none focus:shadow-outline" 
                      name="confirmPassword" 
                      id="confirmPassword" 
                      type="password" 
                      placeholder="Confirm new password" 
                      required 
                    />
                  </div>

                  {error && <p className="text-red-500 text-xs italic mb-4">{error}</p>}
                  {message && <p className="text-green-600 text-xs italic mb-4">{message}</p>}

                  <div className="flex items-center justify-between mt-16">
                    <button
                      type="submit"
                      disabled={loading}
                      class="w-full border-4 border-black hover:bg-pastel_green-700 text-tiber font-bold py-2 px-4 focus:outline-none focus:shadow-outline disabled:opacity-50"
                    >
                      {loading ? "Updating..." : "Reset Password"}
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <p className="text-black mb-4">{message || 'Waiting for reset token...'}</p>
                  <Link href="/adminsignin">
                    <button
                      type="button"
                      className="text-sm text-blue-600 hover:text-blue-800 underline"
                    >
                      Back to Sign In
                    </button>
                  </Link>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
