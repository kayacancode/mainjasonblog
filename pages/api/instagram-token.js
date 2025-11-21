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

        // Check token permissions to help diagnose issues
        const accessToken = longLivedData.access_token || tokenData.access_token;
        console.log('🔍 Checking token permissions...');
        let tokenScopes = [];
        let tokenUserId = null;
        try {
            const debugTokenResponse = await fetch(
                `https://graph.facebook.com/v18.0/debug_token?input_token=${accessToken}&access_token=${FACEBOOK_APP_ID}|${FACEBOOK_APP_SECRET}`
            );
            const debugTokenData = await debugTokenResponse.json();
            console.log('📊 Token debug info:', JSON.stringify(debugTokenData, null, 2));
            
            if (debugTokenData.data) {
                tokenScopes = debugTokenData.data.scopes || [];
                tokenUserId = debugTokenData.data.user_id;
                console.log('📋 Token scopes:', tokenScopes);
                console.log('👤 Token user ID:', tokenUserId);
                
                const hasPagePermissions = tokenScopes.some(scope => 
                    scope.includes('pages') || scope.includes('instagram')
                );
                if (!hasPagePermissions) {
                    console.warn('⚠️ Token may not have required page permissions');
                }
            }
        } catch (debugError) {
            console.warn('Could not debug token:', debugError.message);
        }

        // Now get the Page Access Token
        console.log('🔄 Getting Page Access Token...');
        
        // Try multiple endpoints to get pages
        let pageTokenData = null;
        let pageTokenResponse = null;
        
        // First try /me/accounts (standard endpoint)
        console.log('🔍 Trying /me/accounts endpoint...');
        pageTokenResponse = await fetch(
            `https://graph.facebook.com/v18.0/me/accounts?access_token=${longLivedData.access_token}&fields=id,name,access_token,instagram_business_account`
        );
        pageTokenData = await pageTokenResponse.json();
        console.log('📊 Page token response status:', pageTokenResponse.status);
        console.log('📊 Page token data:', JSON.stringify(pageTokenData, null, 2));
        
        // If empty, try /me/pages (alternative endpoint)
        if ((!pageTokenData.data || pageTokenData.data.length === 0) && !pageTokenData.error) {
            console.log('🔍 Trying /me/pages endpoint as alternative...');
            const pagesResponse = await fetch(
                `https://graph.facebook.com/v18.0/me/pages?access_token=${longLivedData.access_token}&fields=id,name,access_token,instagram_business_account`
            );
            const pagesData = await pagesResponse.json();
            console.log('📊 Pages response:', JSON.stringify(pagesData, null, 2));
            
            if (pagesData.data && pagesData.data.length > 0) {
                pageTokenData = pagesData;
                console.log('✅ Found pages via /me/pages endpoint');
            }
        }

        if (pageTokenData.error) {
            console.error('Page token error:', pageTokenData.error);
            return res.status(400).json({
                error: `Page token failed: ${pageTokenData.error.message}`,
                details: pageTokenData.error,
                hint: 'Make sure you granted page permissions during OAuth and have admin access to the Facebook Page.'
            });
        }

        // Check if data array exists and has items
        if (!pageTokenData.data || pageTokenData.data.length === 0) {
            console.error('No pages found in /me/accounts. This usually means:');
            console.error('1. User does not have admin access to any Facebook Pages');
            console.error('2. Page permissions were not granted during OAuth');
            console.error('3. The access token does not have pages_show_list permission');
            
            // Try to access the page directly by name as fallback
            console.log('🔍 Trying to access page directly by name...');
            const directPageResponse = await fetch(
                `https://graph.facebook.com/v18.0/InSuaveWeTrust?access_token=${longLivedData.access_token}&fields=id,name,access_token`
            );
            
            console.log('📊 Direct page response status:', directPageResponse.status);
            const directPageData = await directPageResponse.json();
            console.log('📊 Direct page data:', JSON.stringify(directPageData, null, 2));
            
            if (directPageData.error || !directPageData.id) {
                console.error('Direct page access error:', directPageData.error);
                
                // Check if we have a fallback page token in environment variables
                const fallbackPageToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
                if (fallbackPageToken) {
                    console.log('🔍 Found FACEBOOK_PAGE_ACCESS_TOKEN in environment, trying fallback...');
                    try {
                        // Verify the fallback token works with the page
                        const fallbackPageResponse = await fetch(
                            `https://graph.facebook.com/v18.0/InSuaveWeTrust?access_token=${fallbackPageToken}&fields=id,name`
                        );
                        const fallbackPageData = await fallbackPageResponse.json();
                        
                        if (!fallbackPageData.error && fallbackPageData.id) {
                            console.log('✅ Fallback token works! Using environment page token.');
                            return res.status(200).json({
                                access_token: fallbackPageToken,
                                page_id: fallbackPageData.id,
                                page_name: fallbackPageData.name,
                                expires_in: longLivedData.expires_in,
                                note: 'Using fallback page token from environment variables'
                            });
                        }
                    } catch (fallbackError) {
                        console.error('Fallback token failed:', fallbackError);
                    }
                }
                
                // Get user info to help diagnose
                let userInfo = null;
                try {
                    const userInfoResponse = await fetch(
                        `https://graph.facebook.com/v18.0/me?access_token=${accessToken}&fields=id,name`
                    );
                    const userInfoData = await userInfoResponse.json();
                    if (!userInfoData.error) {
                        userInfo = userInfoData;
                    }
                } catch (e) {
                    console.warn('Could not get user info:', e.message);
                }
                
                return res.status(400).json({
                    error: 'No Facebook Pages found. Please ensure:',
                    details: [
                        '1. You have admin access to the "In Suave We Trust" Facebook Page',
                        '2. You granted page permissions during the OAuth flow',
                        '3. The Facebook Page exists and is accessible',
                        '4. You are logged in with the correct Facebook account'
                    ],
                    diagnostic: {
                        tokenScopes: tokenScopes,
                        hasPagePermissions: tokenScopes.some(s => s.includes('pages')),
                        userId: tokenUserId || userInfo?.id,
                        userName: userInfo?.name,
                        apiError: directPageData.error || 'Page not found'
                    },
                    hint: 'Try re-authenticating and make sure to grant all requested permissions, especially page-related permissions. If you continue to have issues, you may need to set FACEBOOK_PAGE_ACCESS_TOKEN in your environment variables.',
                    troubleshooting: [
                        'Go to Facebook Page Settings → Page Roles and verify you are listed as an Admin',
                        'During OAuth, make sure to click "Continue" on all permission screens',
                        'Check that the Facebook App has the required permissions configured',
                        'Try logging out of Facebook and logging back in, then re-authenticate'
                    ]
                });
            }
            
            // If we can access the page directly, we still need a page access token
            // Try to get it by requesting the page's access_token field
            console.log('✅ Found page via direct access:', directPageData.name, 'ID:', directPageData.id);
            
            // If direct access doesn't provide access_token, we need to use /me/accounts
            // But since that's empty, we'll return an error with instructions
            if (!directPageData.access_token) {
                // Check for fallback token
                const fallbackPageToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
                if (fallbackPageToken) {
                    console.log('🔍 Using fallback page token from environment...');
                    return res.status(200).json({
                        access_token: fallbackPageToken,
                        page_id: directPageData.id,
                        page_name: directPageData.name,
                        expires_in: longLivedData.expires_in,
                        note: 'Using fallback page token from environment variables'
                    });
                }
                
                return res.status(400).json({
                    error: 'Page found but cannot get Page Access Token',
                    details: [
                        'The page exists but you need to grant page management permissions.',
                        'Please re-authenticate and ensure you grant all page-related permissions.',
                        'You must be an admin of the Facebook Page to get its access token.',
                        'Alternatively, set FACEBOOK_PAGE_ACCESS_TOKEN in your environment variables.'
                    ],
                    pageId: directPageData.id,
                    pageName: directPageData.name
                });
            }
            
            return res.status(200).json({
                access_token: directPageData.access_token,
                page_id: directPageData.id,
                page_name: directPageData.name,
                expires_in: longLivedData.expires_in
            });
        }

        // Find the "In Suave We Trust" page
        const targetPage = pageTokenData.data.find(page => 
            page.name && page.name.toLowerCase().includes('suave')
        );

        if (!targetPage) {
            console.error('Target page not found in /me/accounts. Available pages:', pageTokenData.data.map(p => p.name));
            
            // Try to access the page directly by name
            console.log('🔍 Trying to access page directly by name...');
            const directPageResponse = await fetch(
                `https://graph.facebook.com/v18.0/InSuaveWeTrust?access_token=${longLivedData.access_token}&fields=id,name,access_token`
            );
            
            console.log('📊 Direct page response status:', directPageResponse.status);
            const directPageData = await directPageResponse.json();
            console.log('📊 Direct page data:', JSON.stringify(directPageData, null, 2));
            
            if (directPageData.error || !directPageData.id) {
                console.error('Direct page access error:', directPageData.error);
                return res.status(400).json({
                    error: 'In Suave We Trust page not found',
                    details: [
                        'The page was not found in your list of managed pages.',
                        'Make sure you are an admin of the "In Suave We Trust" Facebook Page.',
                        'Try re-authenticating and granting all page permissions.'
                    ],
                    availablePages: pageTokenData.data.map(p => ({ name: p.name, id: p.id })),
                    apiError: directPageData.error
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
