/**
 * AI Prompt Templates for Instagram Caption Generation
 * These prompts help generate content in Jason's authentic voice
 */

import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
// Lazy Supabase client
let supabaseClient = null;
function getSupabase() {
    if (!supabaseClient) {
        supabaseClient = createClient(getSupabaseUrl(), getSupabaseServiceKey());
    }
    return supabaseClient;
}

// In-memory cache for dynamic style markers (1-hour TTL)
let markerCache = {
    global: null,
    topics: {},
    lastUpdated: null,
    ttl: 3600000  // 1 hour in milliseconds
};

/**
 * Base style markers for Jason's writing voice
 * These are extracted from analysis of past posts
 */
export const JASON_STYLE_MARKERS = {
    tone: 'conversational, authentic, passionate about music and culture',
    vocabulary: 'urban, contemporary, music-focused',
    sentenceStyle: 'mix of short punchy statements and longer flowing thoughts',
    punctuation: 'occasional ellipses for dramatic pause, minimal exclamation marks',
    emojiUsage: 'selective and purposeful, not excessive',
    personalityTraits: [
        'knowledgeable about music',
        'culturally aware',
        'genuine and relatable',
        'sometimes reflective',
        'appreciates authenticity'
    ]
};

/**
 * Check if cache is valid and return cached markers if available
 * @param {string} topic - Topic name or null for global
 * @returns {object|null}
 */
function getCachedMarkers(topic = null) {
    const now = Date.now();

    // Check if cache is expired
    if (markerCache.lastUpdated && (now - markerCache.lastUpdated) > markerCache.ttl) {
        // Cache expired - clear it
        markerCache = {
            global: null,
            topics: {},
            lastUpdated: null,
            ttl: 3600000
        };
        return null;
    }

    // Return cached marker
    return topic ? markerCache.topics[topic] : markerCache.global;
}

/**
 * Store markers in cache
 * @param {object} markers - Markers to cache
 * @param {string} topic - Topic name or null for global
 */
function setCachedMarkers(markers, topic = null) {
    const now = Date.now();

    if (topic) {
        markerCache.topics[topic] = markers;
    } else {
        markerCache.global = markers;
    }

    if (!markerCache.lastUpdated) {
        markerCache.lastUpdated = now;
    }
}

/**
 * Fetch dynamic style markers from database
 * @param {string} topic - Topic name or null for global
 * @returns {Promise<object|null>}
 */
async function fetchDynamicMarkers(topic = null) {
    try {
        const supabase = getSupabase();

        let query = supabase
            .from('dynamic_style_markers')
            .select('*');

        if (topic) {
            query = query
                .eq('scope_type', 'topic-specific')
                .eq('topic_name', topic);
        } else {
            query = query
                .eq('scope_type', 'global')
                .is('topic_name', null);
        }

        const { data, error } = await query.single();

        if (error || !data) {
            console.log(`[Dynamic Markers] No markers found for ${topic || 'global'}`);
            return null;
        }

        return data;
    } catch (error) {
        console.error('[Dynamic Markers] Error fetching:', error);
        return null;
    }
}

/**
 * Map dynamic markers from database format to prompt format
 * @param {object} dynamicMarkers - Markers from database
 * @returns {object}
 */
function mapDynamicMarkers(dynamicMarkers) {
    if (!dynamicMarkers) return JASON_STYLE_MARKERS;

    // Parse JSONB fields
    const commonPhrases = Array.isArray(dynamicMarkers.common_phrases)
        ? dynamicMarkers.common_phrases
        : JSON.parse(dynamicMarkers.common_phrases || '[]');

    const characteristicWords = Array.isArray(dynamicMarkers.characteristic_words)
        ? dynamicMarkers.characteristic_words
        : JSON.parse(dynamicMarkers.characteristic_words || '[]');

    const personalityTraits = Array.isArray(dynamicMarkers.personality_traits)
        ? dynamicMarkers.personality_traits
        : JSON.parse(dynamicMarkers.personality_traits || '[]');

    const vocabCharacteristics = typeof dynamicMarkers.vocabulary_characteristics === 'string'
        ? JSON.parse(dynamicMarkers.vocabulary_characteristics || '{}')
        : dynamicMarkers.vocabulary_characteristics || {};

    return {
        tone: dynamicMarkers.tone_description || JASON_STYLE_MARKERS.tone,
        vocabulary: vocabCharacteristics.description || JASON_STYLE_MARKERS.vocabulary,
        sentenceStyle: dynamicMarkers.sentence_style_description || JASON_STYLE_MARKERS.sentenceStyle,
        punctuation: dynamicMarkers.punctuation_patterns || JASON_STYLE_MARKERS.punctuation,
        emojiUsage: dynamicMarkers.emoji_usage_description || JASON_STYLE_MARKERS.emojiUsage,
        personalityTraits: personalityTraits.length > 0 ? personalityTraits : JASON_STYLE_MARKERS.personalityTraits,
        commonPhrases: commonPhrases.slice(0, 10),  // Top 10 phrases
        characteristicWords: characteristicWords.slice(0, 15)  // Top 15 words
    };
}

/**
 * Get style markers (with caching and fallback)
 * @param {string} topic - Topic name or null for global
 * @returns {Promise<object>}
 */
async function getStyleMarkers(topic = null) {
    // Try cache first
    const cached = getCachedMarkers(topic);
    if (cached) {
        console.log(`[Dynamic Markers] Using cached markers for ${topic || 'global'}`);
        return cached;
    }

    // Try topic-specific markers
    if (topic) {
        const topicMarkers = await fetchDynamicMarkers(topic);
        if (topicMarkers) {
            const mapped = mapDynamicMarkers(topicMarkers);
            setCachedMarkers(mapped, topic);
            console.log(`[Dynamic Markers] Loaded topic-specific markers for ${topic}`);
            return mapped;
        }
    }

    // Try global markers
    const globalMarkers = await fetchDynamicMarkers(null);
    if (globalMarkers) {
        const mapped = mapDynamicMarkers(globalMarkers);
        setCachedMarkers(mapped, null);
        console.log('[Dynamic Markers] Loaded global markers');
        return mapped;
    }

    // Fallback to static markers
    console.log('[Dynamic Markers] Using static fallback markers');
    return JASON_STYLE_MARKERS;
}

/**
 * Invalidate the marker cache
 * Call this after updating style markers in the database
 * @param {string} topic - Optional topic to invalidate, or null to clear all
 */
export function invalidateMarkerCache(topic = null) {
    if (topic) {
        delete markerCache.topics[topic];
        console.log(`[Dynamic Markers] Cache invalidated for topic: ${topic}`);
    } else {
        markerCache = {
            global: null,
            topics: {},
            lastUpdated: null,
            ttl: 3600000
        };
        console.log('[Dynamic Markers] Cache fully invalidated');
    }
}

/**
 * Map style parameter values to prompt instructions
 */
function getStyleInstructions(styleParams) {
    if (!styleParams) return {};

    const { tone, emojiIntensity, length, energy } = styleParams;

    return {
        toneInstruction: getToneInstruction(tone),
        emojiInstruction: getEmojiInstruction(emojiIntensity),
        lengthInstruction: getLengthInstruction(length),
        energyInstruction: getEnergyInstruction(energy)
    };
}

function getToneInstruction(level) {
    if (!level) return '';
    if (level <= 3) return 'Use extremely casual, conversational language with slang and informal phrases';
    if (level <= 6) return 'Use relaxed, approachable language that feels natural and authentic';
    if (level <= 8) return 'Use professional language while maintaining warmth and approachability';
    return 'Use formal, polished language with sophisticated vocabulary';
}

function getEmojiInstruction(level) {
    if (!level) return '';
    if (level <= 2) return 'Use minimal or no emojis (maximum 1)';
    if (level <= 5) return 'Use 2-3 emojis strategically to emphasize key points';
    if (level <= 8) return 'Use 4-6 emojis expressively throughout the text';
    return 'Use emojis liberally (7+) for maximum expressiveness';
}

function getLengthInstruction(level) {
    if (!level) return '';
    if (level <= 3) return 'Use very short, punchy sentences (5-10 words average)';
    if (level <= 6) return 'Use medium-length sentences (10-15 words average)';
    if (level <= 8) return 'Use longer, flowing sentences (15-20 words average)';
    return 'Use complex, detailed sentences (20+ words average)';
}

function getEnergyInstruction(level) {
    if (!level) return '';
    if (level <= 3) return 'Use a calm, reflective tone with mellow energy';
    if (level <= 6) return 'Use balanced energy that\'s engaged but not overly excited';
    if (level <= 8) return 'Use enthusiastic, upbeat language with dynamic energy';
    return 'Use intense, electrifying language with maximum hype';
}

/**
 * Build the system prompt for AI caption generation
 * @param {object} styleData - Optional custom style markers
 * @param {object} styleParams - Optional style parameters {tone, emojiIntensity, length, energy}
 * @param {string} topic - Optional topic for topic-specific markers
 * @returns {Promise<string>}
 */
export async function buildSystemPrompt(styleData = {}, styleParams = null, topic = null) {
    // Fetch dynamic markers (with caching and fallback)
    const dynamicMarkers = await getStyleMarkers(topic);

    // Merge with any custom overrides
    const markers = { ...dynamicMarkers, ...styleData };

    let basePrompt = `You are a writing assistant helping create Instagram summaries for a blog called "In Suave We Trust" (ISWT).

Your goal is to write in Jason's authentic voice. Here are key characteristics:

TONE: ${markers.tone}

WRITING STYLE:
- ${markers.sentenceStyle}
- Use ${markers.punctuation}
- Emoji usage: ${markers.emojiUsage}

PERSONALITY TRAITS:
${markers.personalityTraits.map(t => `- ${t}`).join('\n')}`;

    // Add common phrases if available from dynamic markers
    if (markers.commonPhrases && markers.commonPhrases.length > 0) {
        basePrompt += `\n\nCHARACTERISTIC PHRASES Jason uses:
${markers.commonPhrases.map(p => `- "${p}"`).join('\n')}`;
    }

    // Add characteristic words if available
    if (markers.characteristicWords && markers.characteristicWords.length > 0) {
        basePrompt += `\n\nCHARACTERISTIC VOCABULARY:
Consider naturally incorporating words like: ${markers.characteristicWords.slice(0, 10).join(', ')}`;
    }

    basePrompt += `

KEY RULES:
1. Write as if Jason is speaking directly to his audience
2. Keep it authentic - never sound corporate or generic
3. Reference specific details from the blog post
4. Create intrigue that makes people want to read more
5. Stay concise - this is for an Instagram slide
6. Don't use hashtags in the summary (those go in the caption separately)
7. Don't start with "Hey" or generic greetings
8. Avoid clickbait language but do create curiosity`;

    // Add style parameter instructions if provided
    if (styleParams) {
        const instructions = getStyleInstructions(styleParams);
        basePrompt += `\n\nSTYLE CUSTOMIZATION:`;
        if (instructions.toneInstruction) {
            basePrompt += `\n- Tone: ${instructions.toneInstruction}`;
        }
        if (instructions.emojiInstruction) {
            basePrompt += `\n- Emoji usage: ${instructions.emojiInstruction}`;
        }
        if (instructions.lengthInstruction) {
            basePrompt += `\n- Sentence length: ${instructions.lengthInstruction}`;
        }
        if (instructions.energyInstruction) {
            basePrompt += `\n- Energy level: ${instructions.energyInstruction}`;
        }
    }

    return basePrompt;
}

/**
 * Build the user prompt for generating a summary
 * @param {object} options
 * @param {string} options.title - Blog post title
 * @param {string} options.content - Blog post content
 * @param {number} options.maxLength - Maximum character length (default: 400)
 * @param {string[]} options.exampleCaptions - Past captions for style reference
 * @param {string} options.topic - Optional topic for context
 * @returns {string}
 */
export function buildSummaryPrompt(options) {
    const { title, content, maxLength = 400, exampleCaptions = [], topic = null } = options;

    let prompt = `Create a compelling Instagram summary for this blog post:

TITLE: ${title}`;

    if (topic) {
        prompt += `
TOPIC: ${topic} (tailor your writing style to this content type)`;
    }

    prompt += `

BLOG CONTENT:
${truncateContent(content, 2000)}

---

Generate a summary that:
1. Captures the essence of the post
2. Creates intrigue for readers to click through
3. Sounds authentic to Jason's voice
4. Is suitable for an Instagram carousel slide (${maxLength} chars max)
5. Can stand alone as engaging content

`;

    if (exampleCaptions.length > 0) {
        prompt += `\nHere are some examples of Jason's writing style for reference:\n`;
        exampleCaptions.slice(0, 3).forEach((example, i) => {
            prompt += `\nExample ${i + 1}:\n"${example}"\n`;
        });
        prompt += `\nWrite a new summary in this same style.\n`;
    }

    prompt += `\nRespond with ONLY the summary text, nothing else. Keep it under ${maxLength} characters.`;

    return prompt;
}

/**
 * Build prompt for generating the full Instagram caption
 * @param {object} options
 * @param {string} options.title - Blog post title
 * @param {string} options.summary - The generated summary
 * @param {string[]} options.suggestedHashtags - Hashtags to potentially include
 * @returns {string}
 */
export function buildCaptionPrompt(options) {
    const { title, summary, suggestedHashtags = [] } = options;
    
    return `Create an Instagram caption for this blog post:

TITLE: ${title}
SUMMARY: ${summary}

The caption should:
1. Hook readers in the first line (shows before "...more")
2. Include a clear call-to-action (link in bio)
3. Add 5-10 relevant hashtags at the end
4. Total length under 2200 characters (Instagram limit)

${suggestedHashtags.length > 0 ? `Consider using these hashtags: ${suggestedHashtags.join(', ')}` : ''}

Format the response as:
[HOOK - attention-grabbing first line]

[BODY - 2-3 sentences expanding on the summary]

[CTA - call to action]

[HASHTAGS]`;
}

/**
 * Build prompt for style analysis of existing captions
 * @param {string[]} captions - Array of existing captions to analyze
 * @returns {string}
 */
export function buildStyleAnalysisPrompt(captions) {
    return `Analyze the following Instagram captions and identify key style markers:

${captions.map((c, i) => `Caption ${i + 1}:\n"${c}"\n`).join('\n')}

Identify and list:
1. Common phrases or vocabulary
2. Typical sentence structure
3. Emoji usage patterns
4. Tone characteristics
5. Any unique writing quirks
6. Average caption length

Respond in JSON format:
{
    "commonPhrases": [],
    "sentencePatterns": [],
    "emojiPatterns": [],
    "toneMarkers": [],
    "uniqueQuirks": [],
    "averageLength": 0
}`;
}

/**
 * Build prompt for improving based on feedback
 * @param {object} options
 * @param {string} options.originalText - AI-generated text
 * @param {string} options.editedText - Human-edited version
 * @param {number} options.rating - Rating 1-10
 * @param {string} options.notes - Feedback notes
 * @returns {string}
 */
export function buildFeedbackLearningPrompt(options) {
    const { originalText, editedText, rating, notes } = options;
    
    return `Learn from this feedback to improve future generations:

ORIGINAL AI TEXT:
"${originalText}"

HUMAN EDITED VERSION:
"${editedText}"

RATING: ${rating}/10
NOTES: ${notes || 'No notes provided'}

Analyze:
1. What changes did the human make?
2. Why might they have made these changes?
3. What patterns should be adjusted in future generations?

Respond in JSON:
{
    "keyChanges": [],
    "likelyReasons": [],
    "suggestedAdjustments": []
}`;
}

/**
 * Helper to truncate content at word boundary
 */
function truncateContent(content, maxLength) {
    if (!content || content.length <= maxLength) return content;
    
    const truncated = content.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    
    return lastSpace > maxLength * 0.8
        ? truncated.substring(0, lastSpace) + '...'
        : truncated + '...';
}

/**
 * Generate a hash for prompt deduplication
 * @param {string} prompt - The prompt text
 * @returns {string}
 */
export function hashPrompt(prompt) {
    let hash = 0;
    for (let i = 0; i < prompt.length; i++) {
        const char = prompt.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
}

