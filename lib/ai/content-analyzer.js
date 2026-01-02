/**
 * Blog Content Analyzer
 * Extracts writing style patterns from blog post content
 * Includes vocabulary analysis, tone detection, sentence structure analysis, and topic classification
 */

// Common English stop words to filter out
const STOP_WORDS = new Set([
    'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i', 'it', 'for', 'not', 'on', 'with',
    'he', 'as', 'you', 'do', 'at', 'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
    'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what', 'so', 'up', 'out', 'if',
    'about', 'who', 'get', 'which', 'go', 'me', 'when', 'make', 'can', 'like', 'time', 'no', 'just',
    'him', 'know', 'take', 'people', 'into', 'year', 'your', 'good', 'some', 'could', 'them', 'see',
    'other', 'than', 'then', 'now', 'look', 'only', 'come', 'its', 'over', 'think', 'also', 'back',
    'after', 'use', 'two', 'how', 'our', 'work', 'first', 'well', 'way', 'even', 'new', 'want',
    'because', 'any', 'these', 'give', 'day', 'most', 'us', 'is', 'was', 'are', 'been', 'has', 'had',
    'were', 'said', 'did', 'having', 'may', 'should', 'am', 'being'
]);

// Topic classification keywords
const TOPIC_KEYWORDS = {
    music: [
        'album', 'song', 'track', 'artist', 'band', 'music', 'sound', 'beat', 'rhythm', 'melody',
        'lyrics', 'verse', 'chorus', 'production', 'producer', 'record', 'recording', 'studio',
        'genre', 'rap', 'hip', 'hop', 'r&b', 'rnb', 'pop', 'rock', 'jazz', 'soul', 'funk',
        'listen', 'hearing', 'audio', 'vocal', 'vocals', 'singing', 'rapper', 'musician',
        'release', 'ep', 'lp', 'single', 'mixtape', 'debut', 'sophomore', 'discography'
    ],
    personal: [
        'i', 'me', 'my', 'myself', 'we', 'our', 'feel', 'feeling', 'thought', 'thinking',
        'believe', 'opinion', 'experience', 'life', 'personal', 'story', 'journey', 'reflection',
        'learned', 'realized', 'understand', 'perspective', 'view', 'insight'
    ],
    review: [
        'review', 'rating', 'score', 'verdict', 'opinion', 'assessment', 'evaluation', 'critique',
        'analysis', 'breakdown', 'impression', 'standout', 'highlight', 'favorite', 'best', 'worst',
        'recommend', 'recommendation', 'worth', 'skip', 'miss'
    ],
    tutorial: [
        'how', 'guide', 'step', 'tutorial', 'learn', 'teach', 'explain', 'understand', 'method',
        'technique', 'process', 'instruction', 'tip', 'trick', 'hack', 'way', 'approach'
    ],
    culture: [
        'culture', 'cultural', 'society', 'social', 'community', 'movement', 'trend', 'influence',
        'impact', 'generation', 'era', 'scene', 'style', 'fashion', 'art', 'artistic'
    ],
    technology: [
        'tech', 'technology', 'digital', 'online', 'internet', 'web', 'app', 'software', 'platform',
        'tool', 'device', 'computer', 'phone', 'streaming', 'ai', 'algorithm'
    ]
};

// Casual language markers
const CASUAL_MARKERS = [
    'gonna', 'wanna', 'gotta', 'kinda', 'sorta', 'yeah', 'nah', 'yep', 'nope', 'yup',
    'cause', 'cuz', 'cos', 'lol', 'tbh', 'ngl', 'fr', 'lowkey', 'highkey', 'legit',
    'like', 'literally', 'basically', 'totally', 'super', 'pretty', 'really', 'actually',
    'honestly', 'seriously', 'definitely', 'absolutely'
];

// Formal language markers
const FORMAL_MARKERS = [
    'therefore', 'furthermore', 'moreover', 'consequently', 'thus', 'hence', 'nevertheless',
    'nonetheless', 'however', 'although', 'whereas', 'whereby', 'wherein', 'heretofore',
    'notwithstanding', 'subsequently', 'accordingly', 'additionally', 'alternatively'
];

/**
 * Main analysis function - orchestrates all analysis steps
 * @param {string} postContent - Full blog post content
 * @param {string} postTitle - Blog post title
 * @returns {object} Complete analysis object
 */
export function analyzePost(postContent, postTitle) {
    if (!postContent || typeof postContent !== 'string') {
        throw new Error('Invalid post content provided');
    }

    // Clean content (remove HTML tags if any)
    const cleanContent = stripHTML(postContent);

    // Tokenize into sentences and words
    const sentences = tokenizeSentences(cleanContent);
    const words = tokenizeWords(cleanContent);

    // Perform various analyses
    const sentenceAnalysis = analyzeSentenceStructure(sentences);
    const vocabularyAnalysis = extractVocabularyProfile(words);
    const punctuationAnalysis = analyzePunctuationPatterns(cleanContent);
    const toneAnalysis = detectToneMarkers(cleanContent, words);
    const topicAnalysis = classifyTopic(cleanContent, postTitle);

    // Compile complete analysis
    return {
        title: postTitle,
        word_count: words.length,
        character_count: cleanContent.length,

        // Topic classification
        detected_topics: topicAnalysis.topics,
        primary_topic: topicAnalysis.primary_topic,
        topic_confidence: topicAnalysis.confidence,

        // Vocabulary
        vocabulary_profile: vocabularyAnalysis.profile,
        top_keywords: vocabularyAnalysis.keywords,
        vocabulary_richness: vocabularyAnalysis.richness,

        // Sentence structure
        avg_sentence_length: sentenceAnalysis.avg_length,
        avg_words_per_sentence: sentenceAnalysis.avg_length,
        sentence_length_variance: sentenceAnalysis.variance,
        short_sentence_ratio: sentenceAnalysis.short_ratio,
        long_sentence_ratio: sentenceAnalysis.long_ratio,

        // Punctuation
        exclamation_frequency: punctuationAnalysis.exclamation_freq,
        question_frequency: punctuationAnalysis.question_freq,
        ellipsis_frequency: punctuationAnalysis.ellipsis_freq,
        dash_frequency: punctuationAnalysis.dash_freq,

        // Tone
        casual_markers: toneAnalysis.casual_markers,
        formal_markers: toneAnalysis.formal_markers,
        emotion_indicators: toneAnalysis.emotion_indicators,

        // Style
        uses_first_person: toneAnalysis.uses_first_person,
        uses_second_person: toneAnalysis.uses_second_person,
        paragraph_count: countParagraphs(cleanContent),
        avg_paragraph_length: averageParagraphLength(cleanContent)
    };
}

/**
 * Classify post topic based on keyword matching
 * @param {string} content - Post content
 * @param {string} title - Post title
 * @returns {object} Topic classification results
 */
export function classifyTopic(content, title) {
    const combinedText = `${title} ${content}`.toLowerCase();
    const words = tokenizeWords(combinedText);

    const topicScores = {};

    // Calculate scores for each topic
    for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
        let score = 0;
        for (const keyword of keywords) {
            // Count occurrences of each keyword
            const occurrences = words.filter(w => w === keyword || w.includes(keyword)).length;
            score += occurrences;
        }
        topicScores[topic] = score;
    }

    // Sort topics by score
    const sortedTopics = Object.entries(topicScores)
        .filter(([_, score]) => score > 0)
        .sort((a, b) => b[1] - a[1]);

    if (sortedTopics.length === 0) {
        return {
            topics: [],
            primary_topic: null,
            confidence: 0
        };
    }

    // Calculate confidence for primary topic
    const totalScore = sortedTopics.reduce((sum, [_, score]) => sum + score, 0);
    const primaryScore = sortedTopics[0][1];
    const confidence = Math.min(primaryScore / totalScore, 1.0).toFixed(2);

    return {
        topics: sortedTopics.slice(0, 3).map(([topic]) => topic), // Top 3 topics
        primary_topic: sortedTopics[0][0],
        confidence: parseFloat(confidence)
    };
}

/**
 * Extract vocabulary profile from words
 * @param {string[]} words - Array of words
 * @returns {object} Vocabulary analysis
 */
export function extractVocabularyProfile(words) {
    // Filter out stop words and very short words
    const meaningfulWords = words
        .filter(w => !STOP_WORDS.has(w) && w.length > 2)
        .map(w => w.toLowerCase());

    // Calculate frequency
    const wordFreq = {};
    meaningfulWords.forEach(word => {
        wordFreq[word] = (wordFreq[word] || 0) + 1;
    });

    // Get top keywords (most frequent meaningful words)
    const keywords = Object.entries(wordFreq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([word, count]) => ({ word, count }));

    // Calculate vocabulary richness (unique words / total words)
    const uniqueWords = new Set(meaningfulWords);
    const richness = meaningfulWords.length > 0
        ? (uniqueWords.size / meaningfulWords.length).toFixed(4)
        : 0;

    // Find rare words (appearing only once)
    const rareWords = Object.entries(wordFreq)
        .filter(([_, count]) => count === 1)
        .map(([word]) => word)
        .slice(0, 10); // Limit to first 10

    return {
        profile: {
            unique_word_count: uniqueWords.size,
            total_meaningful_words: meaningfulWords.length,
            rare_words: rareWords
        },
        keywords,
        richness: parseFloat(richness)
    };
}

/**
 * Analyze sentence structure patterns
 * @param {string[]} sentences - Array of sentences
 * @returns {object} Sentence structure analysis
 */
export function analyzeSentenceStructure(sentences) {
    if (sentences.length === 0) {
        return {
            avg_length: 0,
            variance: 0,
            short_ratio: 0,
            long_ratio: 0
        };
    }

    // Calculate word count for each sentence
    const sentenceLengths = sentences.map(s => tokenizeWords(s).length);

    // Average length
    const avgLength = sentenceLengths.reduce((sum, len) => sum + len, 0) / sentenceLengths.length;

    // Variance
    const variance = sentenceLengths.reduce((sum, len) => sum + Math.pow(len - avgLength, 2), 0) / sentenceLengths.length;

    // Short sentence ratio (< 10 words)
    const shortCount = sentenceLengths.filter(len => len < 10).length;
    const shortRatio = shortCount / sentenceLengths.length;

    // Long sentence ratio (> 25 words)
    const longCount = sentenceLengths.filter(len => len > 25).length;
    const longRatio = longCount / sentenceLengths.length;

    return {
        avg_length: parseFloat(avgLength.toFixed(2)),
        variance: parseFloat(variance.toFixed(2)),
        short_ratio: parseFloat(shortRatio.toFixed(2)),
        long_ratio: parseFloat(longRatio.toFixed(2))
    };
}

/**
 * Detect tone markers (casual vs formal, emotion indicators)
 * @param {string} content - Full content
 * @param {string[]} words - Tokenized words
 * @returns {object} Tone analysis
 */
export function detectToneMarkers(content, words) {
    const lowerContent = content.toLowerCase();
    const lowerWords = words.map(w => w.toLowerCase());

    // Find casual markers
    const foundCasualMarkers = CASUAL_MARKERS.filter(marker =>
        lowerWords.includes(marker) || lowerContent.includes(` ${marker} `)
    );

    // Find formal markers
    const foundFormalMarkers = FORMAL_MARKERS.filter(marker =>
        lowerWords.includes(marker) || lowerContent.includes(` ${marker} `)
    );

    // Detect person usage
    const firstPersonWords = ['i', 'me', 'my', 'mine', 'we', 'us', 'our', 'ours'];
    const secondPersonWords = ['you', 'your', 'yours'];

    const usesFirstPerson = lowerWords.some(w => firstPersonWords.includes(w));
    const usesSecondPerson = lowerWords.some(w => secondPersonWords.includes(w));

    // Detect emotion indicators (simple heuristic)
    const enthusiasmWords = ['amazing', 'incredible', 'awesome', 'fantastic', 'excellent', 'love', 'excited', 'perfect'];
    const reflectiveWords = ['think', 'thought', 'consider', 'reflect', 'ponder', 'contemplate', 'realize'];
    const criticalWords = ['however', 'but', 'although', 'unfortunately', 'disappointing', 'lacking', 'weak'];

    const enthusiasmCount = lowerWords.filter(w => enthusiasmWords.includes(w)).length;
    const reflectiveCount = lowerWords.filter(w => reflectiveWords.includes(w)).length;
    const criticalCount = lowerWords.filter(w => criticalWords.includes(w)).length;

    const totalWords = words.length;
    const emotionIndicators = {
        enthusiasm: totalWords > 0 ? parseFloat((enthusiasmCount / totalWords * 10).toFixed(2)) : 0,
        reflective: totalWords > 0 ? parseFloat((reflectiveCount / totalWords * 10).toFixed(2)) : 0,
        critical: totalWords > 0 ? parseFloat((criticalCount / totalWords * 10).toFixed(2)) : 0
    };

    return {
        casual_markers: foundCasualMarkers,
        formal_markers: foundFormalMarkers,
        emotion_indicators: emotionIndicators,
        uses_first_person: usesFirstPerson,
        uses_second_person: usesSecondPerson
    };
}

/**
 * Analyze punctuation patterns
 * @param {string} content - Full content
 * @returns {object} Punctuation frequency analysis (per 1000 words)
 */
export function analyzePunctuationPatterns(content) {
    const wordCount = tokenizeWords(content).length;
    const per1000 = wordCount > 0 ? 1000 / wordCount : 0;

    // Count different punctuation marks
    const exclamationCount = (content.match(/!/g) || []).length;
    const questionCount = (content.match(/\?/g) || []).length;
    const ellipsisCount = (content.match(/\.{3,}/g) || []).length;
    const dashCount = (content.match(/—|--/g) || []).length;

    return {
        exclamation_freq: parseFloat((exclamationCount * per1000).toFixed(2)),
        question_freq: parseFloat((questionCount * per1000).toFixed(2)),
        ellipsis_freq: parseFloat((ellipsisCount * per1000).toFixed(2)),
        dash_freq: parseFloat((dashCount * per1000).toFixed(2))
    };
}

/**
 * Strip HTML tags from content
 * @param {string} html - Content with potential HTML
 * @returns {string} Clean text
 */
function stripHTML(html) {
    return html
        .replace(/<[^>]*>/g, ' ') // Remove HTML tags
        .replace(/&nbsp;/g, ' ')   // Replace &nbsp;
        .replace(/&[a-z]+;/g, ' ') // Replace other HTML entities
        .replace(/\s+/g, ' ')      // Normalize whitespace
        .trim();
}

/**
 * Tokenize text into sentences
 * @param {string} text - Input text
 * @returns {string[]} Array of sentences
 */
function tokenizeSentences(text) {
    // Split on sentence-ending punctuation followed by space and capital letter
    return text
        .split(/[.!?]+\s+/)
        .filter(s => s.trim().length > 0)
        .map(s => s.trim());
}

/**
 * Tokenize text into words
 * @param {string} text - Input text
 * @returns {string[]} Array of words
 */
function tokenizeWords(text) {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s'-]/g, ' ') // Keep only letters, numbers, apostrophes, hyphens
        .split(/\s+/)
        .filter(w => w.length > 0);
}

/**
 * Count paragraphs in content
 * @param {string} content - Input content
 * @returns {number} Number of paragraphs
 */
function countParagraphs(content) {
    return content
        .split(/\n\s*\n/)
        .filter(p => p.trim().length > 0)
        .length;
}

/**
 * Calculate average paragraph length
 * @param {string} content - Input content
 * @returns {number} Average words per paragraph
 */
function averageParagraphLength(content) {
    const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    if (paragraphs.length === 0) return 0;

    const totalWords = paragraphs.reduce((sum, p) => sum + tokenizeWords(p).length, 0);
    return parseFloat((totalWords / paragraphs.length).toFixed(2));
}
