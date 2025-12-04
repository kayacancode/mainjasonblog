/**
 * AI Style Caption Generator
 * Generates Instagram summaries in Jason's authentic voice
 */

import { createClient } from '@supabase/supabase-js';
import { getSupabaseUrl, getSupabaseServiceKey, getAIApiKey, getAIProvider, getAIModel } from '../../../lib/env';
import { buildSystemPrompt, buildSummaryPrompt, hashPrompt } from '../../../lib/ai/prompts';

// Lazy Supabase client
let supabaseClient = null;
function getSupabase() {
    if (!supabaseClient) {
        supabaseClient = createClient(getSupabaseUrl(), getSupabaseServiceKey());
    }
    return supabaseClient;
}

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '4mb',
        },
    },
};

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    const {
        postId,
        title,
        content,
        regenerate = false,
        maxLength = 400
    } = req.body;
    
    if (!title || !content) {
        return res.status(400).json({ error: 'title and content are required' });
    }
    
    const supabase = getSupabase();
    
    try {
        // Check for existing summary if not regenerating
        if (postId && !regenerate) {
            const { data: post } = await supabase
                .from('posts')
                .select('instagram_ai_summary')
                .eq('id', postId)
                .single();
            
            if (post?.instagram_ai_summary) {
                return res.status(200).json({
                    success: true,
                    summary: post.instagram_ai_summary,
                    cached: true,
                    message: 'Using existing AI summary'
                });
            }
        }
        
        // Fetch training corpus for style reference
        const { data: corpus } = await supabase
            .from('ai_caption_corpus')
            .select('caption_text')
            .eq('use_for_training', true)
            .eq('is_approved', true)
            .order('created_at', { ascending: false })
            .limit(5);
        
        const exampleCaptions = corpus?.map(c => c.caption_text) || [];
        
        // Build prompts
        const systemPrompt = buildSystemPrompt();
        const userPrompt = buildSummaryPrompt({
            title,
            content,
            maxLength,
            exampleCaptions
        });
        
        const promptHash = hashPrompt(userPrompt);
        
        // Call AI provider
        const provider = getAIProvider();
        let summary, model, tokensUsed;
        
        if (provider === 'anthropic') {
            const result = await callAnthropic(systemPrompt, userPrompt);
            summary = result.summary;
            model = result.model;
            tokensUsed = result.tokensUsed;
        } else {
            const result = await callOpenAI(systemPrompt, userPrompt);
            summary = result.summary;
            model = result.model;
            tokensUsed = result.tokensUsed;
        }
        
        // Clean up the summary
        summary = cleanSummary(summary, maxLength);
        
        // Save summary to post if postId provided
        if (postId) {
            await supabase
                .from('posts')
                .update({ instagram_ai_summary: summary })
                .eq('id', postId);
        }
        
        // Store in feedback table for tracking
        if (postId) {
            await supabase
                .from('ai_caption_feedback')
                .insert({
                    post_id: postId,
                    ai_generated_text: summary,
                    ai_model_used: model,
                    ai_prompt_hash: promptHash,
                    generated_at: new Date().toISOString()
                });
        }
        
        return res.status(200).json({
            success: true,
            summary,
            model,
            tokensUsed,
            promptHash,
            message: regenerate ? 'Summary regenerated' : 'Summary generated'
        });
        
    } catch (error) {
        console.error('AI generation error:', error);
        
        // Return fallback summary
        const fallbackSummary = generateFallbackSummary(title, content, maxLength);
        
        return res.status(200).json({
            success: true,
            summary: fallbackSummary,
            fallback: true,
            error: error.message,
            message: 'Using fallback summary due to AI error'
        });
    }
}

/**
 * Call OpenAI API
 */
async function callOpenAI(systemPrompt, userPrompt) {
    const apiKey = getAIApiKey('openai');
    const model = getAIModel();
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            max_tokens: 500,
            temperature: 0.7
        })
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
    }
    
    const data = await response.json();
    
    return {
        summary: data.choices[0].message.content.trim(),
        model: data.model,
        tokensUsed: data.usage?.total_tokens || 0
    };
}

/**
 * Call Anthropic API
 */
async function callAnthropic(systemPrompt, userPrompt) {
    const apiKey = getAIApiKey('anthropic');
    const model = getAIModel();
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
            model,
            max_tokens: 500,
            system: systemPrompt,
            messages: [
                { role: 'user', content: userPrompt }
            ]
        })
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(`Anthropic API error: ${error.error?.message || response.statusText}`);
    }
    
    const data = await response.json();
    
    return {
        summary: data.content[0].text.trim(),
        model: data.model,
        tokensUsed: data.usage?.input_tokens + data.usage?.output_tokens || 0
    };
}

/**
 * Clean and validate the generated summary
 */
function cleanSummary(summary, maxLength) {
    // Remove any markdown formatting
    let cleaned = summary
        .replace(/^["']|["']$/g, '') // Remove surrounding quotes
        .replace(/\*\*/g, '')         // Remove bold markdown
        .replace(/\n{3,}/g, '\n\n')   // Limit consecutive newlines
        .trim();
    
    // Truncate if too long
    if (cleaned.length > maxLength) {
        const truncated = cleaned.substring(0, maxLength - 3);
        const lastSentence = truncated.lastIndexOf('.');
        const lastSpace = truncated.lastIndexOf(' ');
        
        if (lastSentence > maxLength * 0.7) {
            cleaned = truncated.substring(0, lastSentence + 1);
        } else if (lastSpace > maxLength * 0.8) {
            cleaned = truncated.substring(0, lastSpace) + '...';
        } else {
            cleaned = truncated + '...';
        }
    }
    
    return cleaned;
}

/**
 * Generate a fallback summary when AI fails
 */
function generateFallbackSummary(title, content, maxLength) {
    // Extract first meaningful paragraph
    const paragraphs = content.split(/\n\n+/).filter(p => p.trim().length > 50);
    const firstPara = paragraphs[0] || content;
    
    // Clean and truncate
    let summary = firstPara
        .replace(/<[^>]*>/g, '') // Remove HTML
        .replace(/\s+/g, ' ')    // Normalize whitespace
        .trim();
    
    // Add intro and truncate
    const intro = `New post: "${title}" - `;
    const available = maxLength - intro.length - 30;
    
    if (summary.length > available) {
        const truncated = summary.substring(0, available);
        const lastPeriod = truncated.lastIndexOf('.');
        if (lastPeriod > available * 0.6) {
            summary = truncated.substring(0, lastPeriod + 1);
        } else {
            summary = truncated.trim() + '...';
        }
    }
    
    return `${intro}${summary}\n\nRead more at insuavewetrust.com`;
}

