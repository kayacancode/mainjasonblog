import { useRouter } from 'next/router';
import { useEffect } from 'react';

export default function InstagramCallback() {
    const router = useRouter();

    useEffect(() => {
        const handleCallback = () => {
            const urlParams = new URLSearchParams(window.location.search);
            const code = urlParams.get('code');
            const error = urlParams.get('error');
            const errorDescription = urlParams.get('error_description');

            if (error) {
                // Handle OAuth error
                console.error('Instagram OAuth error:', error, errorDescription);
                window.opener?.postMessage({
                    type: 'INSTAGRAM_AUTH_ERROR',
                    error: errorDescription || error
                }, window.location.origin);
                window.close();
                return;
            }

            if (code) {
                // Exchange code for access token
                exchangeCodeForToken(code);
            } else {
                // No code provided
                window.opener?.postMessage({
                    type: 'INSTAGRAM_AUTH_ERROR',
                    error: 'No authorization code received'
                }, window.location.origin);
                window.close();
            }
        };

        const exchangeCodeForToken = async (code) => {
            try {
                // Get the redirect URI that was used (same as current origin)
                const redirectUri = `${window.location.origin}/instagram-callback`;
                
                const response = await fetch('/api/instagram-token', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ code, redirectUri })
                });

                const data = await response.json();

                if (response.ok && data.access_token) {
                    // Success - send token to parent window
                    window.opener?.postMessage({
                        type: 'INSTAGRAM_AUTH_SUCCESS',
                        accessToken: data.access_token
                    }, window.location.origin);
                    window.close();
                } else {
                    // Error exchanging code for token
                    window.opener?.postMessage({
                        type: 'INSTAGRAM_AUTH_ERROR',
                        error: data.error || 'Failed to exchange code for token'
                    }, window.location.origin);
                    window.close();
                }
            } catch (error) {
                console.error('Error exchanging code for token:', error);
                window.opener?.postMessage({
                    type: 'INSTAGRAM_AUTH_ERROR',
                    error: 'Network error during authentication'
                }, window.location.origin);
                window.close();
            }
        };

        handleCallback();
    }, []);

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Completing Instagram authentication...</p>
            </div>
        </div>
    );
}
