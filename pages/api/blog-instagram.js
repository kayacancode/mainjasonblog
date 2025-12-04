/**
 * Blog→Instagram Orchestration API
 * Coordinates the complete workflow: fetch post, generate graphics, AI caption, publish
 */

import { createClient } from '@supabase/supabase-js';
import { getSupabaseUrl, getSupabaseServiceKey } from '../../lib/env';
import { generateCarouselSlides, generateCarouselPreview } from '../../lib/graphics/instagramCarousel';
import { publishBlogCarousel, recordStatus, createRun, updateRun } from '../../lib/instagram';

// Lazy Supabase client with service key
let supabaseClient = null;
function getSupabase() {
    if (!supabaseClient) {
        supabaseClient = createClient(getSupabaseUrl(), getSupabaseServiceKey());
    }
    return supabaseClient;
}

// Configure API route
export const config = {
    api: {
        bodyParser: {
            sizeLimit: '10mb',
        },
        responseLimit: false,
    },
};

/**
 * Main handler
 */
export default async function handler(req, res) {
    if (req.method !== 'POST' && req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    // GET request for preview fetching
    if (req.method === 'GET') {
        const { postId, mode } = req.query;
        if (mode === 'preview') {
            return handlePreviewGet(req, res, postId);
        }
        return res.status(400).json({ error: 'Invalid GET request' });
    }
    
    const { 
        postId, 
        mode = 'publish',  // preview, publish, retry
        pageAccessToken,
        customCaption,
        customCoverUrl,
        aiSummaryOverride
    } = req.body;
    
    if (!postId) {
        return res.status(400).json({ error: 'postId is required' });
    }
    
    const supabase = getSupabase();
    
    try {
        // Fetch the blog post
        const { data: post, error: postError } = await supabase
            .from('posts')
            .select('*')
            .eq('id', postId)
            .single();
        
        if (postError || !post) {
            return res.status(404).json({ error: 'Post not found' });
        }
        
        // Check idempotency - don't re-publish already published posts unless retry
        if (post.instagram_status === 'published' && mode !== 'retry') {
            return res.status(400).json({ 
                error: 'Post already published to Instagram',
                instagramPostId: post.instagram_post_id
            });
        }
        
        // Check if another run is in progress
        if (['generating', 'publishing'].includes(post.instagram_status) && mode !== 'retry') {
            return res.status(409).json({ 
                error: 'Another Instagram run is in progress for this post',
                status: post.instagram_status
            });
        }
        
        // Create run record
        let runId;
        try {
            runId = await createRun(postId, mode);
        } catch (e) {
            console.warn('Could not create run record:', e);
        }
        
        // Update status to generating
        await recordStatus(postId, 'generating', {});
        if (runId) await updateRun(runId, { status: 'generating' });
        
        // Generate or use AI summary
        let aiSummary = aiSummaryOverride || post.instagram_ai_summary;
        
        if (!aiSummary) {
            // Call AI endpoint to generate summary
            try {
                const aiResponse = await fetch(`${getBaseUrl(req)}/api/ai/generate-style-caption`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        postId,
                        title: post.title,
                        content: post.post_text,
                        regenerate: false
                    })
                });
                
                if (aiResponse.ok) {
                    const aiData = await aiResponse.json();
                    aiSummary = aiData.summary;
                    
                    // Store the AI summary
                    await supabase
                        .from('posts')
                        .update({ instagram_ai_summary: aiSummary })
                        .eq('id', postId);
                    
                    if (runId) {
                        await updateRun(runId, {
                            ai_summary_generated: aiSummary,
                            ai_model_used: aiData.model,
                            ai_tokens_used: aiData.tokensUsed
                        });
                    }
                }
            } catch (aiError) {
                console.warn('AI generation failed, using fallback:', aiError.message);
            }
        }
        
        // Fallback summary if AI fails
        if (!aiSummary) {
            aiSummary = truncateText(post.post_text, 300) + '\n\nRead more at insuavewetrust.com';
        }
        
        // Determine cover image
        const coverImageUrl = customCoverUrl || post.instagram_cover_override || post.post_img;
        
        // Generate slides
        console.log('🎨 Generating carousel slides...');
        const { slide1Url, slide2Url } = await generateCarouselSlides({
            postId,
            title: post.title,
            coverImageUrl,
            aiSummary
        });
        
        const imageUrls = [slide1Url, slide2Url];
        
        if (runId) {
            await updateRun(runId, {
                slide1_url: slide1Url,
                slide2_url: slide2Url,
                ai_summary_generated: aiSummary
            });
        }
        
        // Build caption
        const caption = customCaption || buildCaption(post.title, aiSummary);
        
        if (runId) {
            await updateRun(runId, { caption_used: caption });
        }
        
        // Preview mode - return assets without publishing
        if (mode === 'preview') {
            await recordStatus(postId, 'pending', {
                assets: { slide1Url, slide2Url },
                aiSummary,
                caption
            });
            
            if (runId) {
                await updateRun(runId, { 
                    status: 'completed',
                    completed_at: new Date().toISOString()
                });
            }
            
            return res.status(200).json({
                success: true,
                mode: 'preview',
                slides: {
                    slide1: slide1Url,
                    slide2: slide2Url
                },
                caption,
                aiSummary
            });
        }
        
        // Publish mode
        const publishResult = await publishBlogCarousel({
            postId,
            imageUrls,
            caption,
            mode,
            pageAccessToken
        });
        
        if (!publishResult.success) {
            return res.status(500).json({
                success: false,
                error: publishResult.error,
                slides: {
                    slide1: slide1Url,
                    slide2: slide2Url
                }
            });
        }
        
        return res.status(200).json({
            success: true,
            mode: 'published',
            instagramPostId: publishResult.postId,
            slides: {
                slide1: slide1Url,
                slide2: slide2Url
            },
            caption,
            aiSummary
        });
        
    } catch (error) {
        console.error('Blog Instagram API error:', error);
        
        // Record failure
        await recordStatus(postId, 'failed', {
            error: error.message
        });
        
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
}

/**
 * Handle GET request for preview (returns existing preview data)
 */
async function handlePreviewGet(req, res, postId) {
    if (!postId) {
        return res.status(400).json({ error: 'postId is required' });
    }
    
    const supabase = getSupabase();
    
    const { data: post, error } = await supabase
        .from('posts')
        .select('id, title, instagram_status, instagram_assets, instagram_caption, instagram_ai_summary')
        .eq('id', postId)
        .single();
    
    if (error || !post) {
        return res.status(404).json({ error: 'Post not found' });
    }
    
    const assets = post.instagram_assets || {};
    
    return res.status(200).json({
        success: true,
        status: post.instagram_status,
        slides: {
            slide1: assets.slide1Url || assets.slides?.[0]?.url,
            slide2: assets.slide2Url || assets.slides?.[1]?.url
        },
        caption: post.instagram_caption,
        aiSummary: post.instagram_ai_summary
    });
}

/**
 * Get base URL from request
 */
function getBaseUrl(req) {
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    return `${protocol}://${host}`;
}

/**
 * Build Instagram caption from post data
 */
function buildCaption(title, aiSummary) {
    const hashtags = [
        '#InSuaveWeTrust',
        '#NewPost',
        '#BlogPost',
        '#ISWT',
        '#MustRead'
    ];
    
    let caption = `📝 ${title}\n\n`;
    
    if (aiSummary) {
        // Use first 200 chars of summary for caption
        const shortSummary = aiSummary.length > 200 
            ? aiSummary.substring(0, 197) + '...'
            : aiSummary;
        caption += `${shortSummary}\n\n`;
    }
    
    caption += '🔗 Link in bio to read full post\n\n';
    caption += hashtags.join(' ');
    
    return caption;
}

/**
 * Truncate text to max length at word boundary
 */
function truncateText(text, maxLength) {
    if (!text || text.length <= maxLength) return text;
    
    const truncated = text.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    
    return lastSpace > maxLength * 0.8 
        ? truncated.substring(0, lastSpace) + '...'
        : truncated + '...';
}

