import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function ResetPassword() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [accessToken, setAccessToken] = useState(null)

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
      setMessage('No valid token found.')
      return
    }

    const { error } = await supabase.auth.updateUser(
      { password },
      { accessToken }
    )

    if (error) {
      setMessage(`Error: ${error.message}`)
    } else {
      setMessage('Password updated successfully! Redirecting to login...')
      setTimeout(() => router.push('/adminsignin'), 3000)
    }
  }

  return (
    <div style={{ maxWidth: '400px', margin: 'auto', textAlign: 'center' }}>
      <h1>Reset Password</h1>
      {accessToken ? (
        <form onSubmit={handleReset}>
          <input
            type="password"
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', margin: '10px 0' }}
          />
          <button type="submit" style={{ padding: '8px 16px' }}>Reset Password</button>
        </form>
      ) : (
        <p>{message || 'Waiting for reset token...'}</p>
      )}
      {message && <p>{message}</p>}
    </div>
  )
}
