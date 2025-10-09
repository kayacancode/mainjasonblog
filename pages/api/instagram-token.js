/**
 * Instagram OAuth Token Exchange
 * Exchanges authorization code for access token
 */

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { code } = req.body;

    if (!code) {
        return res.status(400).json({ error: 'Authorization code is required' });
    }

    try {
        const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID;
        const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET;
        // Use the same redirect URI logic as the client-side
        const REDIRECT_URI = process.env.NODE_ENV === 'production' 
            ? 'https://www.insuavewetrust.com/instagram-callback'
            : 'http://localhost:3000/instagram-callback';

        console.log('🔍 Environment check:', {
            NODE_ENV: process.env.NODE_ENV,
            VERCEL_ENV: process.env.VERCEL_ENV,
            REDIRECT_URI: REDIRECT_URI
        });

        if (!FACEBOOK_APP_ID || !FACEBOOK_APP_SECRET) {
            return res.status(500).json({ 
                error: 'Facebook app credentials not configured' 
            });
        }

        // Exchange code for access token
        console.log('🔄 Exchanging code for access token...');
        console.log('App ID:', FACEBOOK_APP_ID);
        console.log('Redirect URI:', REDIRECT_URI);
        
        const tokenResponse = await fetch(
            `https://graph.facebook.com/v18.0/oauth/access_token?client_id=${FACEBOOK_APP_ID}&client_secret=${FACEBOOK_APP_SECRET}&redirect_uri=${REDIRECT_URI}&code=${code}`,
            {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            }
        );

        console.log('📊 Token response status:', tokenResponse.status);

        const tokenData = await tokenResponse.json();
        console.log('📊 Token response data:', tokenData);

        if (tokenData.error) {
            console.error('Facebook token exchange error:', tokenData.error);
            return res.status(400).json({
                error: `Token exchange failed: ${tokenData.error.message}`,
                details: tokenData.error
            });
        }

        // Get long-lived access token
        const longLivedResponse = await fetch(
            `https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${FACEBOOK_APP_ID}&client_secret=${FACEBOOK_APP_SECRET}&fb_exchange_token=${tokenData.access_token}`,
            {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            }
        );

        const longLivedData = await longLivedResponse.json();
        console.log('📊 Long-lived token data:', longLivedData);

        if (longLivedData.error) {
            console.error('Long-lived token error:', longLivedData.error);
            // Use short-lived token if long-lived fails
            return res.status(200).json({
                access_token: tokenData.access_token,
                expires_in: tokenData.expires_in
            });
        }

        // Now get the Page Access Token
        console.log('🔄 Getting Page Access Token...');
        const pageTokenResponse = await fetch(
            `https://graph.facebook.com/v18.0/me/accounts?access_token=${longLivedData.access_token}`
        );
        
        console.log('📊 Page token response status:', pageTokenResponse.status);
        const pageTokenData = await pageTokenResponse.json();
        console.log('📊 Page token data:', JSON.stringify(pageTokenData, null, 2));

        if (pageTokenData.error) {
            console.error('Page token error:', pageTokenData.error);
            return res.status(400).json({
                error: `Page token failed: ${pageTokenData.error.message}`,
                details: pageTokenData.error
            });
        }

        // Find the "In Suave We Trust" page
        const targetPage = pageTokenData.data.find(page => 
            page.name && page.name.toLowerCase().includes('suave')
        );

        if (!targetPage) {
            console.error('Target page not found in /me/accounts:', pageTokenData.data.map(p => p.name));
            
            // Try to access the page directly by name
            console.log('🔍 Trying to access page directly by name...');
            const directPageResponse = await fetch(
                `https://graph.facebook.com/v18.0/InSuaveWeTrust?access_token=${longLivedData.access_token}&fields=id,name,access_token`
            );
            
            console.log('📊 Direct page response status:', directPageResponse.status);
            const directPageData = await directPageResponse.json();
            console.log('📊 Direct page data:', JSON.stringify(directPageData, null, 2));
            
            if (directPageData.error) {
                console.error('Direct page access error:', directPageData.error);
                return res.status(400).json({
                    error: 'In Suave We Trust page not found and direct access failed',
                    details: directPageData.error,
                    availablePages: pageTokenData.data.map(p => p.name)
                });
            }
            
            console.log('✅ Found page via direct access:', directPageData.name, 'ID:', directPageData.id);
            
            return res.status(200).json({
                access_token: directPageData.access_token || longLivedData.access_token,
                page_id: directPageData.id,
                page_name: directPageData.name,
                expires_in: longLivedData.expires_in
            });
        }

        console.log('✅ Found target page:', targetPage.name, 'ID:', targetPage.id);

        return res.status(200).json({
            access_token: targetPage.access_token, // This is the Page Access Token
            page_id: targetPage.id,
            page_name: targetPage.name,
            expires_in: longLivedData.expires_in
        });

    } catch (error) {
        console.error('Instagram token exchange error:', error);
        return res.status(500).json({
            error: 'Internal server error during token exchange'
        });
    }
}
