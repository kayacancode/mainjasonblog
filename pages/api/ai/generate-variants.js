/**
 * AI Variant Generation API
 * Generates multiple AI caption variants with different style parameters
 */

import { createClient } from '@supabase/supabase-js';
import { buildSystemPrompt, buildSummaryPrompt, hashPrompt } from '../../../lib/ai/prompts';
import { randomUUID } from 'crypto';

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
        userParams = { tone: 6, emojiIntensity: 3, length: 7, energy: 4 },
        variantCount = 3
    } = req.body;

    if (!title || !content) {
        return res.status(400).json({ error: 'title and content are required' });
    }

    const supabase = getSupabase();

    try {
        // Generate session ID for grouping variants
        const sessionId = randomUUID();

        // Get current user for preference lookup
        const { data: { user } } = await supabase.auth.getUser();
        const userId = user?.id;

        // Fetch learned preferences
        let recommendedParams = null;
        if (userId) {
            const { data: preferences } = await supabase
                .from('ai_style_preferences')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (preferences && preferences.tone_confidence > 0.3) {
                // Use learned preferences
                recommendedParams = {
                    tone: Math.round((preferences.preferred_tone_min + preferences.preferred_tone_max) / 2),
                    emojiIntensity: Math.round((preferences.preferred_emoji_min + preferences.preferred_emoji_max) / 2),
                    length: Math.round((preferences.preferred_length_min + preferences.preferred_length_max) / 2),
                    energy: Math.round((preferences.preferred_energy_min + preferences.preferred_energy_max) / 2)
                };
            }
        }

        // If no learned preferences, use sensible defaults
        if (!recommendedParams) {
            recommendedParams = { tone: 6, emojiIntensity: 3, length: 7, energy: 4 };
        }

        // Generate experimental params (random variation)
        const experimentalParams = {
            tone: Math.max(1, Math.min(10, userParams.tone + (Math.random() > 0.5 ? 2 : -2))),
            emojiIntensity: Math.max(1, Math.min(10, userParams.emojiIntensity + (Math.random() > 0.5 ? 2 : -2))),
            length: Math.max(1, Math.min(10, userParams.length + (Math.random() > 0.5 ? 2 : -2))),
            energy: Math.max(1, Math.min(10, userParams.energy + (Math.random() > 0.5 ? 2 : -2)))
        };

        // Fetch training corpus for style reference
        const { data: corpus } = await supabase
            .from('ai_caption_corpus')
            .select('caption_text')
            .eq('use_for_training', true)
            .eq('is_approved', true)
            .order('created_at', { ascending: false })
            .limit(5);

        const exampleCaptions = corpus?.map(c => c.caption_text) || [];

        // Generate all 3 variants in parallel
        const variantPromises = [
            generateVariant('user-custom', userParams, title, content, exampleCaptions),
            generateVariant('ai-recommended', recommendedParams, title, content, exampleCaptions),
            generateVariant('experimental', experimentalParams, title, content, exampleCaptions)
        ];

        const variantResults = await Promise.all(variantPromises);

        // Store all variants in database
        const variantsToInsert = variantResults.map(result => ({
            post_id: postId || null,
            generation_session_id: sessionId,
            variant_text: result.summary,
            variant_type: result.type,
            style_params: result.params,
            ai_model_used: result.model,
            ai_prompt_hash: result.promptHash,
            tokens_used: result.tokensUsed
        }));

        const { data: insertedVariants, error: insertError } = await supabase
            .from('ai_generation_variants')
            .insert(variantsToInsert)
            .select();

        if (insertError) {
            console.error('Error inserting variants:', insertError);
            // Continue anyway, just log the error
        }

        // Format response
        const variants = variantResults.map((result, index) => ({
            id: insertedVariants?.[index]?.id || `temp-${index}`,
            text: result.summary,
            params: result.params,
            type: result.type,
            model: result.model,
            tokensUsed: result.tokensUsed
        }));

        return res.status(200).json({
            success: true,
            sessionId,
            variants,
            recommendedParams,
            message: 'Variants generated successfully'
        });

    } catch (error) {
        console.error('Variant generation error:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
}

/**
 * Generate a single variant with given parameters
 */
async function generateVariant(type, params, title, content, exampleCaptions) {
    const maxLength = 400;

    // Build prompts with style parameters
    const systemPrompt = buildSystemPrompt({}, params);
    const userPrompt = buildSummaryPrompt({
        title,
        content,
        maxLength,
        exampleCaptions
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

    return {
        summary,
        type,
        params,
        model,
        tokensUsed,
        promptHash
    };
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
