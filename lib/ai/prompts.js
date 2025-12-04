/**
 * AI Prompt Templates for Instagram Caption Generation
 * These prompts help generate content in Jason's authentic voice
 */

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
 * Build the system prompt for AI caption generation
 * @param {object} styleData - Optional custom style markers
 * @returns {string}
 */
export function buildSystemPrompt(styleData = {}) {
    const markers = { ...JASON_STYLE_MARKERS, ...styleData };
    
    return `You are a writing assistant helping create Instagram summaries for a blog called "In Suave We Trust" (ISWT).

Your goal is to write in Jason's authentic voice. Here are key characteristics:

TONE: ${markers.tone}

WRITING STYLE:
- ${markers.sentenceStyle}
- Use ${markers.punctuation}
- Emoji usage: ${markers.emojiUsage}

PERSONALITY TRAITS:
${markers.personalityTraits.map(t => `- ${t}`).join('\n')}

KEY RULES:
1. Write as if Jason is speaking directly to his audience
2. Keep it authentic - never sound corporate or generic
3. Reference specific details from the blog post
4. Create intrigue that makes people want to read more
5. Stay concise - this is for an Instagram slide
6. Don't use hashtags in the summary (those go in the caption separately)
7. Don't start with "Hey" or generic greetings
8. Avoid clickbait language but do create curiosity`;
}

/**
 * Build the user prompt for generating a summary
 * @param {object} options
 * @param {string} options.title - Blog post title
 * @param {string} options.content - Blog post content
 * @param {number} options.maxLength - Maximum character length (default: 400)
 * @param {string[]} options.exampleCaptions - Past captions for style reference
 * @returns {string}
 */
export function buildSummaryPrompt(options) {
    const { title, content, maxLength = 400, exampleCaptions = [] } = options;
    
    let prompt = `Create a compelling Instagram summary for this blog post:

TITLE: ${title}

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

