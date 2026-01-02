/**
 * AI Style Caption Generator
 * Generates Instagram summaries in Jason's authentic voice
 */

import { createClient } from '@supabase/supabase-js';
import { buildSystemPrompt, buildSummaryPrompt, hashPrompt } from '../../../lib/ai/prompts';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

// Lazy Supabase client
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
        maxLength = 400,
        styleParams = null  // NEW: Accept style parameters
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

        // Detect topic for topic-aware generation
        let detectedTopic = null;
        if (postId) {
            // Try to get topic from existing analysis
            const { data: analysis } = await supabase
                .from('blog_content_analysis')
                .select('primary_topic')
                .eq('post_id', postId)
                .single();

            detectedTopic = analysis?.primary_topic || null;

            if (detectedTopic) {
                console.log(`[Topic Detection] Using analyzed topic: ${detectedTopic}`);
            }
        }

        // If no topic found from analysis, try quick classification
        if (!detectedTopic && content) {
            const { classifyTopic } = await import('../../../lib/ai/content-analyzer');
            const topics = classifyTopic(content, title);
            detectedTopic = topics.length > 0 ? topics[0].name : null;

            if (detectedTopic) {
                console.log(`[Topic Detection] Classified as: ${detectedTopic}`);
            }
        }

        // Fetch training corpus with topic-specific prioritization
        let exampleCaptions = [];

        if (detectedTopic) {
            // Get topic-specific examples (limit 3)
            const { data: topicCorpus } = await supabase
                .from('ai_caption_corpus')
                .select('caption_text')
                .eq('use_for_training', true)
                .eq('is_approved', true)
                .eq('topic', detectedTopic)
                .order('created_at', { ascending: false })
                .limit(3);

            exampleCaptions = topicCorpus?.map(c => c.caption_text) || [];

            console.log(`[Corpus] Found ${exampleCaptions.length} topic-specific examples for ${detectedTopic}`);

            // Supplement with general examples if needed
            if (exampleCaptions.length < 3) {
                const { data: generalCorpus } = await supabase
                    .from('ai_caption_corpus')
                    .select('caption_text')
                    .eq('use_for_training', true)
                    .eq('is_approved', true)
                    .or(`topic.is.null,topic.neq.${detectedTopic}`)
                    .order('created_at', { ascending: false })
                    .limit(5 - exampleCaptions.length);

                const generalCaptions = generalCorpus?.map(c => c.caption_text) || [];
                exampleCaptions.push(...generalCaptions);

                console.log(`[Corpus] Added ${generalCaptions.length} general examples`);
            }
        } else {
            // No topic - use general corpus
            const { data: corpus } = await supabase
                .from('ai_caption_corpus')
                .select('caption_text')
                .eq('use_for_training', true)
                .eq('is_approved', true)
                .order('created_at', { ascending: false })
                .limit(5);

            exampleCaptions = corpus?.map(c => c.caption_text) || [];

            console.log(`[Corpus] Using ${exampleCaptions.length} general examples (no topic)`);
        }

        // Build prompts with style parameters and topic
        const systemPrompt = await buildSystemPrompt({}, styleParams, detectedTopic);
        const userPrompt = buildSummaryPrompt({
            title,
            content,
            maxLength,
            exampleCaptions,
            topic: detectedTopic
        });
        
        const promptHash = hashPrompt(userPrompt);
        
        // Call AI provider
        const provider = process.env.AI_PROVIDER || 'openai';
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

            // Auto-populate corpus with this summary (topic-aware)
            try {
                // Fetch blog content analysis for topic information
                const { data: analysis } = await supabase
                    .from('blog_content_analysis')
                    .select('primary_topic, detected_topics')
                    .eq('post_id', postId)
                    .single();

                // Analyze style markers of the generated summary
                const styleMarkers = analyzeStyleMarkersForCorpus(summary);

                // Insert into corpus (pending approval via feedback)
                await supabase
                    .from('ai_caption_corpus')
                    .insert({
                        caption_text: summary,
                        source_type: 'ai_generated',
                        source_id: postId,
                        post_title: title,
                        topic: analysis?.primary_topic || null,
                        topics: analysis?.detected_topics || [],
                        style_markers: styleMarkers,
                        is_approved: false,      // Pending user feedback
                        use_for_training: false  // Will be enabled after positive feedback
                    })
                    .select()
                    .single();

                console.log('[Auto-Corpus] Added summary to corpus (pending approval)');
            } catch (corpusError) {
                // Don't fail the request if corpus population fails
                // Check if it's a duplicate error (constraint violation)
                if (corpusError.code !== '23505') {
                    console.error('[Auto-Corpus] Failed to add to corpus:', corpusError);
                }
            }
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
            appliedParams: styleParams || null,
            detectedTopic: detectedTopic || null,
            exampleCount: exampleCaptions.length,
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
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error('Missing OPENAI_API_KEY environment variable');
    }
    const model = process.env.AI_MODEL || 'gpt-4o-mini';
    
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
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
        throw new Error('Missing ANTHROPIC_API_KEY environment variable');
    }
    const model = process.env.AI_MODEL || 'claude-3-sonnet-20240229';
    
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

/**
 * Analyze style markers for corpus entry
 * Simplified version for caption analysis
 * @param {string} text - Caption text to analyze
 * @returns {object} Style markers
 */
function analyzeStyleMarkersForCorpus(text) {
    if (!text || typeof text !== 'string') {
        return {};
    }

    // Split into sentences and words
    const sentences = text.split(/[.!?]+\s+/).filter(s => s.trim().length > 0);
    const words = text.toLowerCase().match(/\b\w+\b/g) || [];

    // Count emojis
    const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;
    const emojis = text.match(emojiRegex) || [];
    const emojiCount = emojis.length;

    // Calculate metrics
    const avgWordsPerSentence = sentences.length > 0
        ? (words.length / sentences.length).toFixed(1)
        : 0;

    // Check for questions and ellipsis
    const hasQuestion = /\?/.test(text);
    const hasEllipsis = /\.{3,}/.test(text);

    // Check if starts/ends with emoji
    const startsWithEmoji = emojiRegex.test(text.charAt(0));
    const endsWithEmoji = emojiRegex.test(text.charAt(text.length - 1));

    return {
        wordCount: words.length,
        sentenceCount: sentences.length,
        avgWordsPerSentence: parseFloat(avgWordsPerSentence),
        emojiCount,
        emojisUsed: [...new Set(emojis)],
        hasQuestion,
        hasEllipsis,
        startsWithEmoji,
        endsWithEmoji,
        characterCount: text.length
    };
}

