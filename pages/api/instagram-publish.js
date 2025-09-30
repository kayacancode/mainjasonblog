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
        const response = await fetch(
            `${INSTAGRAM_API_BASE}/me/accounts?access_token=${pageAccessToken}`
        );
        const data = await response.json();
        
        if (data.error) {
            throw new Error(`Facebook API Error: ${data.error.message}`);
        }
        
        // Find the Instagram account
        const instagramAccount = data.data.find(account => account.instagram_business_account);
        
        if (!instagramAccount) {
            throw new Error('No Instagram Business account found');
        }
        
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
        // Step 1: Create media container
        const containerResponse = await fetch(
            `${INSTAGRAM_API_BASE}/${instagramAccountId}/media`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    image_url: mediaUrl,
                    access_token: accessToken
                })
            }
        );
        
        const containerData = await containerResponse.json();
        
        if (containerData.error) {
            throw new Error(`Instagram API Error: ${containerData.error.message}`);
        }
        
        return containerData.id; // Media container ID
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
        // Step 2: Create post container
        const postData = {
            media_type: mediaIds.length > 1 ? 'CAROUSEL' : 'IMAGE',
            children: mediaIds.join(','),
            caption: caption,
            access_token: accessToken
        };
        
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
        
        if (postContainerData.error) {
            throw new Error(`Instagram API Error: ${postContainerData.error.message}`);
        }
        
        // Step 3: Publish the post
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
        const { instagramAccountId, accessToken } = await getInstagramAccessToken(pageAccessToken);
        
        // Upload media to Instagram
        const mediaIds = [];
        
        // Upload cover image
        const coverMediaId = await uploadMediaToInstagram(coverImageUrl, accessToken, instagramAccountId);
        mediaIds.push(coverMediaId);
        
        // Upload tracklist image if provided
        if (tracklistImageUrl) {
            const tracklistMediaId = await uploadMediaToInstagram(tracklistImageUrl, accessToken, instagramAccountId);
            mediaIds.push(tracklistMediaId);
        }
        
        // Create caption with hashtags
        const fullCaption = `${caption}\n\n${hashtags.join(' ')}`;
        
        // Create and publish Instagram post
        const { postId, containerId } = await createInstagramPost(
            mediaIds, 
            fullCaption, 
            accessToken, 
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
