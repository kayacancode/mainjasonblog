/**
 * Instagram API Integration for Publishing Posts
 * Handles OAuth, media upload, and post creation
 */

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Instagram API configuration
const INSTAGRAM_API_BASE = 'https://graph.facebook.com/v18.0';
const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID;
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET;

/**
 * Get Instagram access token from Facebook Page
 */
async function getInstagramAccessToken(pageAccessToken) {
    try {
        console.log('🔍 Getting Instagram access token...');
        console.log('Page Access Token received:', pageAccessToken ? pageAccessToken.substring(0, 20) + '...' : 'undefined');
        
        // Use the provided page access token from OAuth flow, or fallback to environment variable
        const directPageToken = pageAccessToken || process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
        
        if (!directPageToken) {
            throw new Error('Page Access Token not provided and FACEBOOK_PAGE_ACCESS_TOKEN not configured in environment variables');
        }
        
        console.log('🔍 Using page access token:', directPageToken.substring(0, 20) + '...');
        
        console.log('🔍 Trying direct page access with provided token...');
        const response = await fetch(
            `${INSTAGRAM_API_BASE}/me/accounts?access_token=${directPageToken}`
        );
        
        // Always try /me/pages as well
        console.log('🔍 Trying /me/pages endpoint...');
        const pagesResponse = await fetch(
            `${INSTAGRAM_API_BASE}/me/pages?access_token=${directPageToken}`
        );
        console.log('📊 Pages response status:', pagesResponse.status);
        const pagesData = await pagesResponse.json();
        console.log('📊 Pages response data:', JSON.stringify(pagesData, null, 2));
        
        // Also try /me to see what user info we have
        console.log('🔍 Trying /me endpoint...');
        const meResponse = await fetch(
            `${INSTAGRAM_API_BASE}/me?access_token=${directPageToken}`
        );
        console.log('📊 Me response status:', meResponse.status);
        const meData = await meResponse.json();
        console.log('📊 Me response data:', JSON.stringify(meData, null, 2));
        
        // Try to get pages with different permissions
        console.log('🔍 Trying /me/accounts with different fields...');
        const accountsResponse = await fetch(
            `${INSTAGRAM_API_BASE}/me/accounts?access_token=${directPageToken}&fields=id,name,access_token,instagram_business_account`
        );
        console.log('📊 Accounts response status:', accountsResponse.status);
        const accountsData = await accountsResponse.json();
        console.log('📊 Accounts response data:', JSON.stringify(accountsData, null, 2));
        
        // Try to search for the page directly
        console.log('🔍 Searching for InSuaveWeTrust page...');
        const searchResponse = await fetch(
            `${INSTAGRAM_API_BASE}/search?q=InSuaveWeTrust&type=page&access_token=${pageAccessToken}`
        );
        console.log('📊 Search response status:', searchResponse.status);
        const searchData = await searchResponse.json();
        console.log('📊 Search response data:', JSON.stringify(searchData, null, 2));
        
        // Try to get page access token directly
        console.log('🔍 Trying to get page access token directly...');
        const pageTokenResponse2 = await fetch(
            `${INSTAGRAM_API_BASE}/me/accounts?access_token=${pageAccessToken}&fields=access_token`
        );
        console.log('📊 Page token response status:', pageTokenResponse2.status);
        let pageTokenData2;
        try {
            pageTokenData2 = await pageTokenResponse2.json();
            console.log('📊 Page token response data:', JSON.stringify(pageTokenData2, null, 2));
        } catch (error) {
            console.log('📊 Page token response text:', await pageTokenResponse2.text());
            pageTokenData2 = {};
        }
        
        // Try to access the page directly by ID (if we can find it)
        console.log('🔍 Trying to access page directly by ID...');
        const pageIdResponse = await fetch(
            `${INSTAGRAM_API_BASE}/573102763032589?access_token=${directPageToken}&fields=id,name,instagram_business_account`
        );
        console.log('📊 Page ID response status:', pageIdResponse.status);
        const pageIdData = await pageIdResponse.json();
        console.log('📊 Page ID response data:', JSON.stringify(pageIdData, null, 2));
        
        // If direct page access fails, try by name
        if (pageIdData.error || !pageIdData.id) {
            console.log('🔍 Direct page ID access failed, trying by name...');
            const pageNameResponse = await fetch(
                `${INSTAGRAM_API_BASE}/InSuaveWeTrust?access_token=${directPageToken}&fields=id,name,instagram_business_account`
            );
            const pageNameData = await pageNameResponse.json();
            console.log('📊 Page name response:', JSON.stringify(pageNameData, null, 2));
            if (!pageNameData.error && pageNameData.id) {
                Object.assign(pageIdData, pageNameData);
            }
        }
        
        // Now try to get Instagram Business account info
        if (pageIdData.id && !pageIdData.error) {
            // Try to get the actual Page Access Token from the page
            console.log('🔍 Trying to get Page Access Token from page...');
            const pageTokenResponse = await fetch(
                `${INSTAGRAM_API_BASE}/${pageIdData.id}?access_token=${directPageToken}&fields=access_token`
            );
            console.log('📊 Page token response status:', pageTokenResponse.status);
            
            let pageTokenData;
            try {
                pageTokenData = await pageTokenResponse.json();
                console.log('📊 Page token response data:', JSON.stringify(pageTokenData, null, 2));
            } catch (error) {
                console.log('📊 Page token response text:', await pageTokenResponse.text());
                pageTokenData = {};
            }
            
            // Use the page's access token if available
            const actualPageToken = pageTokenData.access_token || directPageToken;
            console.log('🔍 Using actual page token:', actualPageToken.substring(0, 20) + '...');
            
            console.log('🔍 Getting Instagram Business account info...');
            console.log('🔍 Using page ID:', pageIdData.id);
            console.log('🔍 Using token:', actualPageToken.substring(0, 20) + '...');
            
            // Try to get Instagram account with nested fields
            const instagramResponse = await fetch(
                `${INSTAGRAM_API_BASE}/${pageIdData.id}?access_token=${actualPageToken}&fields=instagram_business_account{id,username,name}`
            );
            console.log('📊 Instagram response status:', instagramResponse.status);
            let instagramData = await instagramResponse.json();
            console.log('📊 Instagram response data:', JSON.stringify(instagramData, null, 2));
            
            // If nested query fails, try simple field
            if (instagramData.error || !instagramData.instagram_business_account) {
                console.log('🔍 Nested query failed, trying simple field...');
                const simpleResponse = await fetch(
                    `${INSTAGRAM_API_BASE}/${pageIdData.id}?access_token=${actualPageToken}&fields=instagram_business_account`
                );
                const simpleData = await simpleResponse.json();
                console.log('📊 Simple Instagram response:', JSON.stringify(simpleData, null, 2));
                if (!simpleData.error && simpleData.instagram_business_account) {
                    instagramData = simpleData;
                }
            }
            
            // Also try to get all fields to see what's available
            console.log('🔍 Getting all page fields...');
            const allFieldsResponse = await fetch(
                `${INSTAGRAM_API_BASE}/${pageIdData.id}?access_token=${actualPageToken}&fields=id,name,instagram_business_account,connected_instagram_account`
            );
            console.log('📊 All fields response status:', allFieldsResponse.status);
            const allFieldsData = await allFieldsResponse.json();
            console.log('📊 All fields response data:', JSON.stringify(allFieldsData, null, 2));
            
            // Try different Instagram field names
            console.log('🔍 Trying different Instagram field names...');
            const instagramFieldsResponse = await fetch(
                `${INSTAGRAM_API_BASE}/${pageIdData.id}?access_token=${actualPageToken}&fields=instagram_business_account,instagram_accounts`
            );
            console.log('📊 Instagram fields response status:', instagramFieldsResponse.status);
            const instagramFieldsData = await instagramFieldsResponse.json();
            console.log('📊 Instagram fields response data:', JSON.stringify(instagramFieldsData, null, 2));
            
            // Check token permissions
            console.log('🔍 Checking token permissions...');
            const tokenInfoResponse = await fetch(
                `${INSTAGRAM_API_BASE}/me?access_token=${directPageToken}&fields=id,name`
            );
            console.log('📊 Token info response status:', tokenInfoResponse.status);
            const tokenInfoData = await tokenInfoResponse.json();
            console.log('📊 Token info response data:', JSON.stringify(tokenInfoData, null, 2));
            
            // If we found Instagram account, use it
            if (instagramData.instagram_business_account) {
                console.log('✅ Found Instagram Business account!');
                console.log('📱 Instagram Account ID:', instagramData.instagram_business_account.id);
                
                // Try to get Instagram account details
                console.log('🔍 Getting Instagram account details...');
                const instagramDetailsResponse = await fetch(
                    `${INSTAGRAM_API_BASE}/${instagramData.instagram_business_account.id}?access_token=${actualPageToken}&fields=id,username,name,account_type`
                );
                console.log('📊 Instagram details response status:', instagramDetailsResponse.status);
                const instagramDetailsData = await instagramDetailsResponse.json();
                console.log('📊 Instagram account details:', JSON.stringify(instagramDetailsData, null, 2));
                
                        return {
                            instagramAccountId: instagramData.instagram_business_account.id,
                            pageAccessToken: actualPageToken,
                            pageId: pageIdData.id,
                            pageName: pageIdData.name
                        };
            } else {
                console.log('❌ No Instagram Business account found in API response.');
                console.log('🔍 Let me try a different approach - checking if Instagram is connected...');
                
                // Try to get Instagram account directly by searching for it
                console.log('🔍 Trying to find Instagram account via page insights...');
                const insightsResponse = await fetch(
                    `${INSTAGRAM_API_BASE}/${pageIdData.id}/insights?access_token=${actualPageToken}&metric=impressions`
                );
                console.log('📊 Insights response status:', insightsResponse.status);
                const insightsData = await insightsResponse.json();
                console.log('📊 Insights response data:', JSON.stringify(insightsData, null, 2));
                
                // If insights work, it means Instagram is connected
                if (insightsResponse.status === 200) {
                    console.log('✅ Instagram is connected! Insights API works.');
                    console.log('💡 The instagram_business_account field might not be available, but Instagram is connected.');
                    
                    // Try to get Instagram account ID from a different endpoint
                    console.log('🔍 Trying to get Instagram account from connected_instagram_account field...');
                    const connectedResponse = await fetch(
                        `${INSTAGRAM_API_BASE}/${pageIdData.id}?access_token=${actualPageToken}&fields=connected_instagram_account`
                    );
                    console.log('📊 Connected Instagram response status:', connectedResponse.status);
                    const connectedData = await connectedResponse.json();
                    console.log('📊 Connected Instagram data:', JSON.stringify(connectedData, null, 2));
                    
                    if (connectedData.connected_instagram_account) {
                        console.log('✅ Found connected Instagram account!');
                        return {
                            instagramAccountId: connectedData.connected_instagram_account.id,
                            pageAccessToken: actualPageToken,
                            pageId: pageIdData.id,
                            pageName: pageIdData.name
                        };
                    }
                }
                
                console.log('❌ No Instagram Business account found. Page exists but Instagram not connected.');
                console.log('💡 You need to connect an Instagram Business account to this Facebook page.');
                console.log('💡 Go to Facebook Page Settings → Instagram → Connect Account');
                throw new Error('No Instagram Business account connected to this Facebook page. Please connect an Instagram Business account first.');
            }
        }
        
        // Check if user can create pages
        console.log('🔍 Checking if user can create pages...');
        const createPageResponse = await fetch(
            `${INSTAGRAM_API_BASE}/me/accounts?access_token=${pageAccessToken}&name=Test Page&fields=id,name,access_token`,
            { method: 'POST' }
        );
        console.log('📊 Create page response status:', createPageResponse.status);
        const createPageData = await createPageResponse.json();
        console.log('📊 Create page response data:', JSON.stringify(createPageData, null, 2));
        const data = await response.json();
        
        console.log('📊 Facebook API response:', JSON.stringify(data, null, 2));
        console.log('📊 Response status:', response.status);
        console.log('📊 Response headers:', Object.fromEntries(response.headers.entries()));
        
        if (data.error) {
            console.error('Facebook API Error:', data.error);
            throw new Error(`Facebook API Error: ${data.error.message}`);
        }
        
        if (!data.data || data.data.length === 0) {
            console.log('❌ No Facebook Pages found. This could mean:');
            console.log('1. User has no Facebook Pages');
            console.log('2. Page Access Token lacks permissions');
            console.log('3. Facebook App needs additional setup');
            console.log('4. User needs to grant page permissions');
            throw new Error('No Facebook Pages found for this user');
        }
        
        console.log('📄 Available pages:', data.data.map(page => ({
            id: page.id,
            name: page.name,
            hasInstagram: !!page.instagram_business_account
        })));
        
        // Find the Instagram account
        const instagramAccount = data.data.find(account => account.instagram_business_account);
        
        if (!instagramAccount) {
            console.error('❌ No Instagram Business account found in any of the pages');
            throw new Error('No Instagram Business account found. Please ensure your Facebook Page is connected to an Instagram Business account.');
        }
        
        console.log('✅ Found Instagram Business account:', instagramAccount.instagram_business_account.id);
        
        return {
            instagramAccountId: instagramAccount.instagram_business_account.id,
            accessToken: pageAccessToken
        };
    } catch (error) {
        console.error('Error getting Instagram access token:', error);
        throw error;
    }
}

/**
 * Upload media to Instagram
 */
async function uploadMediaToInstagram(mediaUrl, accessToken, instagramAccountId) {
    try {
        console.log('🔍 Uploading media to Instagram...');
        console.log('📱 Instagram Account ID:', instagramAccountId);
        console.log('🖼️ Media URL:', mediaUrl);
        console.log('🔑 Access Token:', accessToken ? accessToken.substring(0, 20) + '...' : 'undefined');
        
        // Step 1: Create media container
        // Instagram API requires the image_url to be publicly accessible
        const requestBody = {
            image_url: mediaUrl,
            access_token: accessToken
        };
        
        console.log('📤 Sending media container request:', JSON.stringify({
            endpoint: `${INSTAGRAM_API_BASE}/${instagramAccountId}/media`,
            image_url: mediaUrl,
            image_url_length: mediaUrl.length,
            access_token_length: accessToken ? accessToken.length : 0,
            has_access_token: !!accessToken,
            instagram_account_id: instagramAccountId
        }, null, 2));
        
        // Verify the Instagram account ID format (should be numeric)
        if (!/^\d+$/.test(instagramAccountId)) {
            throw new Error(`Invalid Instagram Account ID format: ${instagramAccountId}. Expected numeric ID.`);
        }
        
        // Verify image URL is HTTPS and publicly accessible
        if (!mediaUrl.startsWith('http://') && !mediaUrl.startsWith('https://')) {
            throw new Error(`Invalid image URL format: ${mediaUrl}. Must be HTTP/HTTPS URL.`);
        }
        
        const containerResponse = await fetch(
            `${INSTAGRAM_API_BASE}/${instagramAccountId}/media`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            }
        );
        
        console.log('📊 Container response status:', containerResponse.status);
        const containerData = await containerResponse.json();
        console.log('📊 Container response data:', JSON.stringify(containerData, null, 2));
        
        if (containerData.error) {
            console.error('❌ Instagram API Error:', containerData.error);
            throw new Error(`Instagram API Error: ${containerData.error.message} (Code: ${containerData.error.code}, Type: ${containerData.error.type})`);
        }
        
        const containerId = containerData.id;
        
        // Wait for media to be processed
        console.log('⏳ Waiting for media to be processed...');
        let status = 'IN_PROGRESS';
        let attempts = 0;
        const maxAttempts = 30; // 5 minutes max wait
        
        while (status === 'IN_PROGRESS' && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
            
            const statusResponse = await fetch(
                `${INSTAGRAM_API_BASE}/${containerId}?fields=status_code&access_token=${accessToken}`
            );
            const statusData = await statusResponse.json();
            
            console.log(`📊 Status check ${attempts + 1}:`, statusData);
            
            if (statusData.status_code === 'FINISHED') {
                status = 'FINISHED';
                console.log('✅ Media processing completed!');
            } else if (statusData.status_code === 'ERROR') {
                throw new Error(`Media processing failed: ${statusData.error_message || 'Unknown error'}`);
            } else {
                attempts++;
                console.log(`⏳ Still processing... (${attempts}/${maxAttempts})`);
            }
        }
        
        if (status !== 'FINISHED') {
            throw new Error('Media processing timed out');
        }
        
        return containerId; // Media container ID
    } catch (error) {
        console.error('Error uploading media to Instagram:', error);
        throw error;
    }
}

/**
 * Create Instagram post with media and caption
 */
async function createInstagramPost(mediaIds, caption, accessToken, instagramAccountId) {
    try {
        console.log('🔍 Creating Instagram post with media IDs:', mediaIds);
        
        // Step 2: Create post container
        const postData = {
            media_type: mediaIds.length > 1 ? 'CAROUSEL' : 'IMAGE',
            children: mediaIds.join(','),
            caption: caption,
            access_token: accessToken
        };
        
        console.log('🔍 Post data:', JSON.stringify(postData, null, 2));
        
        const postResponse = await fetch(
            `${INSTAGRAM_API_BASE}/${instagramAccountId}/media`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(postData)
            }
        );
        
        const postContainerData = await postResponse.json();
        console.log('📊 Post container response:', JSON.stringify(postContainerData, null, 2));
        
        if (postContainerData.error) {
            throw new Error(`Instagram API Error: ${postContainerData.error.message}`);
        }
        
        // Wait for post container to be ready
        console.log('⏳ Waiting for post container to be ready...');
        let postStatus = 'IN_PROGRESS';
        let postAttempts = 0;
        const maxPostAttempts = 30; // 5 minutes max wait
        
        while (postStatus === 'IN_PROGRESS' && postAttempts < maxPostAttempts) {
            await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
            
            const postStatusResponse = await fetch(
                `${INSTAGRAM_API_BASE}/${postContainerData.id}?fields=status_code&access_token=${accessToken}`
            );
            const postStatusData = await postStatusResponse.json();
            
            console.log(`📊 Post status check ${postAttempts + 1}:`, postStatusData);
            
            if (postStatusData.status_code === 'FINISHED') {
                postStatus = 'FINISHED';
                console.log('✅ Post container ready!');
            } else if (postStatusData.status_code === 'ERROR') {
                throw new Error(`Post container creation failed: ${postStatusData.error_message || 'Unknown error'}`);
            } else {
                postAttempts++;
                console.log(`⏳ Post container still processing... (${postAttempts}/${maxPostAttempts})`);
            }
        }
        
        if (postStatus !== 'FINISHED') {
            throw new Error('Post container creation timed out');
        }
        
        // Step 3: Publish the post
        console.log('🚀 Publishing post...');
        const publishResponse = await fetch(
            `${INSTAGRAM_API_BASE}/${instagramAccountId}/media_publish`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    creation_id: postContainerData.id,
                    access_token: accessToken
                })
            }
        );
        
        const publishData = await publishResponse.json();
        console.log('📊 Publish response:', JSON.stringify(publishData, null, 2));
        
        if (publishData.error) {
            throw new Error(`Instagram API Error: ${publishData.error.message}`);
        }
        
        return {
            postId: publishData.id,
            containerId: postContainerData.id
        };
    } catch (error) {
        console.error('Error creating Instagram post:', error);
        throw error;
    }
}

// Configure API route to accept larger request bodies (up to 10MB)
export const config = {
    api: {
        bodyParser: {
            sizeLimit: '10mb',
        },
    },
};

/**
 * Main function to publish Instagram post
 */
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        const { 
            weekStart, 
            pageAccessToken, 
            coverImageUrl, 
            tracklistImageUrl, 
            caption, 
            hashtags 
        } = req.body;
        
        // Validate required fields
        if (!weekStart || !pageAccessToken || !coverImageUrl || !caption) {
            return res.status(400).json({ 
                error: 'Missing required fields: weekStart, pageAccessToken, coverImageUrl, caption' 
            });
        }
        
        // Get Instagram access token
        const instagramData = await getInstagramAccessToken(pageAccessToken);
        console.log('📊 Instagram data returned:', JSON.stringify({
            instagramAccountId: instagramData.instagramAccountId,
            hasPageAccessToken: !!instagramData.pageAccessToken,
            pageId: instagramData.pageId,
            pageName: instagramData.pageName
        }, null, 2));
        
        const instagramAccountId = instagramData.instagramAccountId;
        const instagramAccessToken = instagramData.pageAccessToken;
        
        if (!instagramAccountId) {
            throw new Error('Instagram Account ID not found. Please ensure your Facebook Page is connected to an Instagram Business account.');
        }
        
        if (!instagramAccessToken) {
            throw new Error('Instagram Access Token not found. Please check your page access token.');
        }
        
        // Upload media to Instagram
        const mediaIds = [];
        
        // Check if URLs are data URIs (Instagram API doesn't support data URIs)
        if (coverImageUrl && coverImageUrl.startsWith('data:')) {
            throw new Error('Cover image URL is a data URI. Instagram API requires publicly accessible HTTP/HTTPS URLs. Please ensure images are uploaded to Supabase storage or another hosting service.');
        }
        
        if (tracklistImageUrl && tracklistImageUrl.startsWith('data:')) {
            throw new Error('Tracklist image URL is a data URI. Instagram API requires publicly accessible HTTP/HTTPS URLs. Please ensure images are uploaded to Supabase storage or another hosting service.');
        }
        
        // Clean image URLs (remove query parameters and trailing characters)
        const cleanCoverUrl = coverImageUrl.split('?')[0];
        const cleanTracklistUrl = tracklistImageUrl ? tracklistImageUrl.split('?')[0] : null;
        
        console.log('🔍 Original cover URL:', coverImageUrl.substring(0, 100) + (coverImageUrl.length > 100 ? '...' : ''));
        console.log('🔍 Cleaned cover URL:', cleanCoverUrl.substring(0, 100) + (cleanCoverUrl.length > 100 ? '...' : ''));
        if (tracklistImageUrl) {
            console.log('🔍 Original tracklist URL:', tracklistImageUrl.substring(0, 100) + (tracklistImageUrl.length > 100 ? '...' : ''));
            console.log('🔍 Cleaned tracklist URL:', cleanTracklistUrl ? cleanTracklistUrl.substring(0, 100) + (cleanTracklistUrl.length > 100 ? '...' : '') : 'null');
        }
        
        // Verify image URLs are accessible
        console.log('🔍 Verifying image URLs are publicly accessible...');
        try {
            const coverUrlCheck = await fetch(cleanCoverUrl, { 
                method: 'HEAD',
                redirect: 'follow'
            });
            console.log('📊 Cover image URL status:', coverUrlCheck.status);
            console.log('📊 Cover image URL headers:', Object.fromEntries(coverUrlCheck.headers.entries()));
            
            if (!coverUrlCheck.ok) {
                // Try GET to see the actual error
                const getCheck = await fetch(cleanCoverUrl, { method: 'GET' });
                console.log('📊 Cover image GET check status:', getCheck.status);
                throw new Error(`Cover image URL is not accessible: ${coverUrlCheck.status} ${coverUrlCheck.statusText}`);
            }
            
            // Check content type
            const contentType = coverUrlCheck.headers.get('content-type');
            console.log('📊 Cover image content type:', contentType);
            if (contentType && !contentType.startsWith('image/')) {
                console.warn('⚠️ Cover image might not be a valid image type:', contentType);
            }
        } catch (urlError) {
            console.error('❌ Cover image URL check failed:', urlError.message);
            console.error('❌ Full error:', urlError);
            // Don't throw here - let Instagram API handle it and give us better error
            console.warn('⚠️ Continuing despite URL check failure - Instagram API will validate');
        }
        
        // Upload cover image
        const coverMediaId = await uploadMediaToInstagram(cleanCoverUrl, instagramAccessToken, instagramAccountId);
        mediaIds.push(coverMediaId);
        
        // Upload tracklist image if provided
        if (cleanTracklistUrl) {
            const tracklistMediaId = await uploadMediaToInstagram(cleanTracklistUrl, instagramAccessToken, instagramAccountId);
            mediaIds.push(tracklistMediaId);
        }
        
        // Create caption with hashtags
        const fullCaption = `${caption}\n\n${hashtags.join(' ')}`;
        
        // Create and publish Instagram post
        const { postId, containerId } = await createInstagramPost(
            mediaIds, 
            fullCaption, 
            instagramAccessToken, 
            instagramAccountId
        );
        
        // Update database with Instagram post info
        const { error: updateError } = await supabase
            .from('instagram_posts')
            .insert({
                week_start: weekStart,
                instagram_post_id: postId,
                instagram_media_id: containerId,
                instagram_status: 'published',
                instagram_published_at: new Date().toISOString(),
                cover_image_url: coverImageUrl,
                tracklist_image_url: tracklistImageUrl,
                caption: caption,
                hashtags: hashtags
            });
        
        if (updateError) {
            console.error('Database update error:', updateError);
            // Don't fail the request if DB update fails
        }
        
        return res.status(200).json({
            success: true,
            postId: postId,
            message: 'Instagram post published successfully!'
        });
        
    } catch (error) {
        console.error('Instagram publishing error:', error);
        
        // Update database with error status
        try {
            await supabase
                .from('instagram_posts')
                .insert({
                    week_start: req.body.weekStart,
                    instagram_status: 'failed',
                    instagram_error_message: error.message,
                    cover_image_url: req.body.coverImageUrl,
                    tracklist_image_url: req.body.tracklistImageUrl,
                    caption: req.body.caption,
                    hashtags: req.body.hashtags
                });
        } catch (dbError) {
            console.error('Database error update failed:', dbError);
        }
        
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
}
