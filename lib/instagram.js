/**
 * Instagram Publishing Service
 * Handles all Instagram Graph API interactions for carousel publishing
 */

import { createClient } from '@supabase/supabase-js';

const INSTAGRAM_API_BASE = 'https://graph.facebook.com/v18.0';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

// Lazy-initialize Supabase client with service key
let supabaseClient = null;
function getSupabase() {
    if (!supabaseClient) {
        if (!supabaseUrl || !supabaseKey) {
            throw new Error('Missing Supabase environment variables');
        }
        supabaseClient = createClient(supabaseUrl, supabaseKey);
    }
    return supabaseClient;
}

/**
 * Get cached Instagram business account credentials
 * @returns {Promise<{instagramAccountId: string, pageAccessToken: string, pageId: string, pageName: string} | null>}
 */
export async function getCachedCredentials() {
    try {
        const supabase = getSupabase();
        const { data, error } = await supabase
            .from('instagram_tokens')
            .select('*')
            .eq('is_valid', true)
            .order('last_verified_at', { ascending: false })
            .limit(1)
            .single();
        
        if (error || !data) {
            return null;
        }
        
        // Check if token might be expired
        if (data.expires_at && new Date(data.expires_at) < new Date()) {
            console.log('⚠️ Cached token expired');
            await supabase
                .from('instagram_tokens')
                .update({ is_valid: false })
                .eq('id', data.id);
            return null;
        }
        
        return {
            instagramAccountId: data.instagram_account_id,
            pageAccessToken: data.access_token,
            pageId: data.page_id,
            pageName: data.page_name
        };
    } catch (error) {
        console.error('Error getting cached credentials:', error);
        return null;
    }
}

/**
 * Cache Instagram credentials for future use
 */
async function cacheCredentials(credentials) {
    try {
        const supabase = getSupabase();
        const { error } = await supabase
            .from('instagram_tokens')
            .upsert({
                page_id: credentials.pageId,
                page_name: credentials.pageName,
                instagram_account_id: credentials.instagramAccountId,
                access_token: credentials.pageAccessToken,
                is_valid: true,
                last_verified_at: new Date().toISOString(),
                last_used_at: new Date().toISOString()
            }, {
                onConflict: 'page_id'
            });
        
        if (error) {
            console.error('Error caching credentials:', error);
        }
    } catch (error) {
        console.error('Error caching credentials:', error);
    }
}

/**
 * Get Instagram Business Account from a page access token
 * @param {string} pageAccessToken - The page access token
 * @returns {Promise<{instagramAccountId: string, pageAccessToken: string, pageId: string, pageName: string}>}
 */
export async function getBusinessAccount(pageAccessToken) {
    // First try cached credentials
    const cached = await getCachedCredentials();
    if (cached) {
        console.log('✅ Using cached Instagram credentials');
        return cached;
    }
    
    // Use provided token or fallback to environment
    const token = pageAccessToken || process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
    
    if (!token) {
        throw new Error('No page access token provided and FACEBOOK_PAGE_ACCESS_TOKEN not configured');
    }
    
    console.log('🔍 Getting Instagram business account...');
    
    // Try to get accounts via /me/accounts
    const accountsResponse = await fetch(
        `${INSTAGRAM_API_BASE}/me/accounts?access_token=${token}&fields=id,name,access_token,instagram_business_account`
    );
    const accountsData = await accountsResponse.json();
    
    if (accountsData.error) {
        throw new Error(`Facebook API Error: ${accountsData.error.message}`);
    }
    
    // Find page with Instagram business account
    let targetPage = null;
    if (accountsData.data && accountsData.data.length > 0) {
        // Look for "In Suave We Trust" page first
        targetPage = accountsData.data.find(page => 
            page.name && page.name.toLowerCase().includes('suave')
        );
        
        // Fall back to first page with Instagram
        if (!targetPage) {
            targetPage = accountsData.data.find(page => page.instagram_business_account);
        }
    }
    
    // If no page found via accounts, try direct page access
    if (!targetPage) {
        console.log('🔍 Trying direct page access...');
        const pageResponse = await fetch(
            `${INSTAGRAM_API_BASE}/InSuaveWeTrust?access_token=${token}&fields=id,name,access_token,instagram_business_account`
        );
        const pageData = await pageResponse.json();
        
        if (!pageData.error && pageData.id) {
            targetPage = pageData;
        }
    }
    
    if (!targetPage) {
        throw new Error('No Facebook Page with Instagram Business account found');
    }
    
    // Get Instagram account ID if not included
    let instagramAccountId = targetPage.instagram_business_account?.id;
    
    if (!instagramAccountId) {
        const igResponse = await fetch(
            `${INSTAGRAM_API_BASE}/${targetPage.id}?access_token=${targetPage.access_token || token}&fields=instagram_business_account`
        );
        const igData = await igResponse.json();
        
        if (igData.instagram_business_account) {
            instagramAccountId = igData.instagram_business_account.id;
        }
    }
    
    if (!instagramAccountId) {
        throw new Error('No Instagram Business account connected to Facebook Page');
    }
    
    const credentials = {
        instagramAccountId,
        pageAccessToken: targetPage.access_token || token,
        pageId: targetPage.id,
        pageName: targetPage.name
    };
    
    // Cache for future use
    await cacheCredentials(credentials);
    
    console.log('✅ Got Instagram Business account:', instagramAccountId);
    return credentials;
}

/**
 * Create a single media container for Instagram
 * @param {string} imageUrl - Public URL of the image
 * @param {string} accessToken - Page access token
 * @param {string} instagramAccountId - Instagram account ID
 * @param {boolean} isCarouselItem - Whether this is a carousel child
 * @returns {Promise<string>} Container ID
 */
export async function createMediaContainer(imageUrl, accessToken, instagramAccountId, isCarouselItem = false) {
    console.log('📤 Creating media container for:', imageUrl.substring(0, 80));
    
    // Validate URL
    if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
        throw new Error(`Invalid image URL: ${imageUrl}`);
    }
    
    const body = {
        image_url: imageUrl,
        access_token: accessToken,
        ...(isCarouselItem && { is_carousel_item: true })
    };
    
    const response = await fetch(
        `${INSTAGRAM_API_BASE}/${instagramAccountId}/media`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        }
    );
    
    const data = await response.json();
    
    if (data.error) {
        throw new Error(`Instagram API Error: ${data.error.message}`);
    }
    
    // Wait for processing
    const containerId = data.id;
    await waitForMediaReady(containerId, accessToken);
    
    return containerId;
}

/**
 * Wait for media container to finish processing
 */
async function waitForMediaReady(containerId, accessToken, maxAttempts = 30) {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const response = await fetch(
            `${INSTAGRAM_API_BASE}/${containerId}?fields=status_code&access_token=${accessToken}`
        );
        const data = await response.json();
        
        if (data.status_code === 'FINISHED') {
            console.log('✅ Media container ready');
            return;
        }
        
        if (data.status_code === 'ERROR') {
            throw new Error(`Media processing failed: ${data.error_message || 'Unknown error'}`);
        }
        
        console.log(`⏳ Processing... (${attempt + 1}/${maxAttempts})`);
    }
    
    throw new Error('Media processing timed out');
}

/**
 * Create an Instagram carousel post
 * @param {string[]} imageUrls - Array of public image URLs
 * @param {string} caption - Post caption
 * @param {object} options - Additional options
 * @returns {Promise<{containerId: string, childIds: string[]}>}
 */
export async function createCarousel(imageUrls, caption, options = {}) {
    const { pageAccessToken } = options;
    
    // Get credentials
    const credentials = await getBusinessAccount(pageAccessToken);
    const { instagramAccountId, pageAccessToken: token } = credentials;
    
    console.log('🎨 Creating carousel with', imageUrls.length, 'slides');
    
    // Create child containers for each image
    const childIds = [];
    for (const url of imageUrls) {
        const childId = await createMediaContainer(url, token, instagramAccountId, true);
        childIds.push(childId);
    }
    
    console.log('📦 Created', childIds.length, 'child containers');
    
    // Create carousel container
    const carouselBody = {
        media_type: 'CAROUSEL',
        children: childIds.join(','),
        caption: caption,
        access_token: token
    };
    
    const carouselResponse = await fetch(
        `${INSTAGRAM_API_BASE}/${instagramAccountId}/media`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(carouselBody)
        }
    );
    
    const carouselData = await carouselResponse.json();
    
    if (carouselData.error) {
        throw new Error(`Carousel creation error: ${carouselData.error.message}`);
    }
    
    // Wait for carousel to be ready
    await waitForMediaReady(carouselData.id, token);
    
    return {
        containerId: carouselData.id,
        childIds,
        credentials
    };
}

/**
 * Publish a prepared carousel to Instagram
 * @param {string} creationId - The carousel container ID
 * @param {object} options - Additional options including credentials
 * @returns {Promise<{postId: string}>}
 */
export async function publishCarousel(creationId, options = {}) {
    const { pageAccessToken, instagramAccountId: providedAccountId } = options;
    
    // Get credentials if not provided
    let accountId = providedAccountId;
    let token = pageAccessToken;
    
    if (!accountId || !token) {
        const credentials = await getBusinessAccount(pageAccessToken);
        accountId = credentials.instagramAccountId;
        token = credentials.pageAccessToken;
    }
    
    console.log('🚀 Publishing carousel...');
    
    const publishResponse = await fetch(
        `${INSTAGRAM_API_BASE}/${accountId}/media_publish`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                creation_id: creationId,
                access_token: token
            })
        }
    );
    
    const publishData = await publishResponse.json();
    
    if (publishData.error) {
        throw new Error(`Publish error: ${publishData.error.message}`);
    }
    
    console.log('✅ Published! Post ID:', publishData.id);
    
    // Update last_used_at for the token
    try {
        const supabase = getSupabase();
        await supabase
            .from('instagram_tokens')
            .update({ last_used_at: new Date().toISOString() })
            .eq('is_valid', true);
    } catch (e) {
        // Non-critical
    }
    
    return { postId: publishData.id };
}

/**
 * Record the status of an Instagram publishing attempt
 * @param {string} postId - Blog post ID
 * @param {string} status - Status: pending, generating, publishing, published, failed
 * @param {object} meta - Additional metadata
 */
export async function recordStatus(postId, status, meta = {}) {
    const supabase = getSupabase();
    
    const updateData = {
        instagram_status: status,
        ...(meta.error && { instagram_error: meta.error }),
        ...(meta.instagramPostId && { instagram_post_id: meta.instagramPostId }),
        ...(meta.assets && { instagram_assets: meta.assets }),
        ...(meta.caption && { instagram_caption: meta.caption }),
        ...(meta.aiSummary && { instagram_ai_summary: meta.aiSummary }),
        ...(status === 'published' && { instagram_published_at: new Date().toISOString() }),
        ...(status === 'failed' && { instagram_retry_count: meta.retryCount || 0 })
    };
    
    const { error } = await supabase
        .from('posts')
        .update(updateData)
        .eq('id', postId);
    
    if (error) {
        console.error('Error recording status:', error);
    }
    
    return { success: !error };
}

/**
 * Create a run record for tracking
 * @param {string} postId - Blog post ID
 * @param {string} mode - preview, publish, or retry
 * @returns {Promise<string>} Run ID
 */
export async function createRun(postId, mode = 'publish') {
    const supabase = getSupabase();
    
    const { data, error } = await supabase
        .from('instagram_carousel_runs')
        .insert({
            post_id: postId,
            run_mode: mode,
            status: 'started'
        })
        .select('id')
        .single();
    
    if (error) {
        console.error('Error creating run:', error);
        throw error;
    }
    
    return data.id;
}

/**
 * Update a run record
 * @param {string} runId - Run ID
 * @param {object} updates - Fields to update
 */
export async function updateRun(runId, updates) {
    const supabase = getSupabase();
    
    const { error } = await supabase
        .from('instagram_carousel_runs')
        .update({
            ...updates,
            updated_at: new Date().toISOString()
        })
        .eq('id', runId);
    
    if (error) {
        console.error('Error updating run:', error);
    }
}

/**
 * Full carousel creation and publishing flow
 * @param {object} params
 * @param {string} params.postId - Blog post ID
 * @param {string[]} params.imageUrls - Slide image URLs
 * @param {string} params.caption - Full caption with hashtags
 * @param {string} params.mode - preview, publish, or retry
 * @param {string} params.pageAccessToken - Optional token override
 * @returns {Promise<{success: boolean, postId?: string, containerId?: string, error?: string}>}
 */
export async function publishBlogCarousel(params) {
    const { postId, imageUrls, caption, mode = 'publish', pageAccessToken } = params;
    
    // Create tracking run
    let runId;
    try {
        runId = await createRun(postId, mode);
    } catch (e) {
        console.error('Could not create run record:', e);
    }
    
    try {
        // Update post status
        await recordStatus(postId, 'generating', {});
        if (runId) await updateRun(runId, { status: 'generating' });
        
        // Create carousel
        const { containerId, childIds, credentials } = await createCarousel(
            imageUrls,
            caption,
            { pageAccessToken }
        );
        
        // Store asset info
        const assets = {
            containerId,
            childIds,
            slides: imageUrls.map((url, i) => ({ index: i + 1, url }))
        };
        
        if (runId) {
            await updateRun(runId, {
                status: 'uploading',
                slide1_url: imageUrls[0],
                slide2_url: imageUrls[1] || null,
                additional_slides: imageUrls.slice(2).map(url => ({ url })),
                caption_used: caption
            });
        }
        
        // If preview mode, stop here
        if (mode === 'preview') {
            await recordStatus(postId, 'pending', { assets, caption });
            if (runId) await updateRun(runId, { status: 'completed' });
            return { success: true, containerId, assets, preview: true };
        }
        
        // Publish
        await recordStatus(postId, 'publishing', { assets });
        if (runId) await updateRun(runId, { status: 'publishing' });
        
        const { postId: igPostId } = await publishCarousel(containerId, {
            pageAccessToken: credentials.pageAccessToken,
            instagramAccountId: credentials.instagramAccountId
        });
        
        // Record success
        await recordStatus(postId, 'published', {
            instagramPostId: igPostId,
            assets,
            caption
        });
        
        if (runId) {
            await updateRun(runId, {
                status: 'completed',
                completed_at: new Date().toISOString(),
                instagram_post_id: igPostId
            });
        }
        
        return { success: true, postId: igPostId, containerId, assets };
        
    } catch (error) {
        console.error('❌ Publishing failed:', error);
        
        // Get current retry count
        const supabase = getSupabase();
        const { data: post } = await supabase
            .from('posts')
            .select('instagram_retry_count')
            .eq('id', postId)
            .single();
        
        const retryCount = (post?.instagram_retry_count || 0) + (mode === 'retry' ? 1 : 0);
        
        await recordStatus(postId, 'failed', {
            error: error.message,
            retryCount
        });
        
        if (runId) {
            await updateRun(runId, {
                status: 'failed',
                completed_at: new Date().toISOString(),
                error_message: error.message,
                error_step: error.step || 'unknown'
            });
        }
        
        return { success: false, error: error.message };
    }
}

