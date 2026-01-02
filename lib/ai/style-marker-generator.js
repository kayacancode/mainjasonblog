/**
 * Style Marker Generator
 * Aggregates blog content analysis data to generate dynamic style markers
 * Converts quantitative metrics into qualitative prompt descriptions
 */

import { createClient } from '@supabase/supabase-js';
import { getSupabaseUrl, getSupabaseServiceKey } from './env';

// Lazy Supabase client
let supabaseClient = null;
function getSupabase() {
    if (!supabaseClient) {
        supabaseClient = createClient(getSupabaseUrl(), getSupabaseServiceKey());
    }
    return supabaseClient;
}

/**
 * Compute global style markers from all analyzed blog posts
 * @param {number} minPostsRequired - Minimum posts needed for reliable markers
 * @returns {Promise<object>} Generated markers or null if insufficient data
 */
export async function computeGlobalStyleMarkers(minPostsRequired = 5) {
    const supabase = getSupabase();

    console.log('[Style Markers] Computing global markers...');

    // Fetch all blog content analyses
    const { data: analyses, error } = await supabase
        .from('blog_content_analysis')
        .select('*')
        .order('analyzed_at', { ascending: false });

    if (error) {
        throw new Error(`Failed to fetch analyses: ${error.message}`);
    }

    if (!analyses || analyses.length < minPostsRequired) {
        console.log(`[Style Markers] Insufficient data: ${analyses?.length || 0} posts (need ${minPostsRequired})`);
        return null;
    }

    console.log(`[Style Markers] Analyzing ${analyses.length} posts for global markers`);

    // Aggregate statistics
    const aggregated = aggregateAnalyses(analyses);

    // Generate natural language descriptions
    const markers = {
        scope_type: 'global',
        topic_name: null,

        // Generate descriptions
        tone_description: generateToneDescription(aggregated),
        vocabulary_characteristics: generateVocabularyDescription(aggregated),
        sentence_style_description: generateSentenceStyleDescription(aggregated),
        punctuation_patterns: generatePunctuationDescription(aggregated),
        emoji_usage_description: 'Use emojis naturally to emphasize key points',
        personality_traits: generatePersonalityTraits(aggregated),

        // Quantitative metrics
        avg_tone_score: aggregated.avg_tone_score,
        avg_sentence_length: aggregated.avg_sentence_length,
        avg_vocabulary_richness: aggregated.avg_vocabulary_richness,
        avg_exclamation_freq: aggregated.avg_exclamation_freq,
        avg_question_freq: aggregated.avg_question_freq,

        // Common patterns
        common_phrases: extractCommonPhrases(analyses),
        characteristic_words: extractCharacteristicWords(analyses),

        posts_analyzed: analyses.length,
        last_updated_at: new Date().toISOString()
    };

    // Store in database
    await storeMarkers(markers);

    console.log('[Style Markers] Global markers computed successfully');
    return markers;
}

/**
 * Compute topic-specific style markers
 * @param {string} topic - Topic name (e.g., 'music', 'personal')
 * @param {number} minPostsRequired - Minimum posts for this topic
 * @returns {Promise<object>} Generated markers or null if insufficient data
 */
export async function computeTopicStyleMarkers(topic, minPostsRequired = 5) {
    const supabase = getSupabase();

    console.log(`[Style Markers] Computing markers for topic: ${topic}...`);

    // Fetch analyses for this topic
    const { data: analyses, error } = await supabase
        .from('blog_content_analysis')
        .select('*')
        .eq('primary_topic', topic)
        .order('analyzed_at', { ascending: false });

    if (error) {
        throw new Error(`Failed to fetch analyses for topic ${topic}: ${error.message}`);
    }

    if (!analyses || analyses.length < minPostsRequired) {
        console.log(`[Style Markers] Insufficient data for ${topic}: ${analyses?.length || 0} posts (need ${minPostsRequired})`);
        return null;
    }

    console.log(`[Style Markers] Analyzing ${analyses.length} posts for topic: ${topic}`);

    // Aggregate statistics
    const aggregated = aggregateAnalyses(analyses);

    // Generate descriptions with topic context
    const markers = {
        scope_type: 'topic-specific',
        topic_name: topic,

        tone_description: generateToneDescription(aggregated, topic),
        vocabulary_characteristics: generateVocabularyDescription(aggregated, topic),
        sentence_style_description: generateSentenceStyleDescription(aggregated, topic),
        punctuation_patterns: generatePunctuationDescription(aggregated, topic),
        emoji_usage_description: 'Use emojis naturally to emphasize key points',
        personality_traits: generatePersonalityTraits(aggregated, topic),

        avg_tone_score: aggregated.avg_tone_score,
        avg_sentence_length: aggregated.avg_sentence_length,
        avg_vocabulary_richness: aggregated.avg_vocabulary_richness,
        avg_exclamation_freq: aggregated.avg_exclamation_freq,
        avg_question_freq: aggregated.avg_question_freq,

        common_phrases: extractCommonPhrases(analyses),
        characteristic_words: extractCharacteristicWords(analyses),

        posts_analyzed: analyses.length,
        last_updated_at: new Date().toISOString()
    };

    // Store in database
    await storeMarkers(markers);

    console.log(`[Style Markers] Topic markers for ${topic} computed successfully`);
    return markers;
}

/**
 * Aggregate statistics across multiple analyses
 * @param {Array} analyses - Array of blog_content_analysis records
 * @returns {object} Aggregated statistics
 */
function aggregateAnalyses(analyses) {
    const count = analyses.length;

    // Calculate averages
    const avg = (field) => analyses.reduce((sum, a) => sum + (a[field] || 0), 0) / count;

    // Aggregate tone markers
    const allCasualMarkers = analyses.flatMap(a => JSON.parse(a.casual_markers || '[]'));
    const allFormalMarkers = analyses.flatMap(a => JSON.parse(a.formal_markers || '[]'));

    // Calculate tone score (0 = casual, 1 = formal)
    const casualCount = allCasualMarkers.length;
    const formalCount = allFormalMarkers.length;
    const toneScore = formalCount > 0 || casualCount > 0
        ? formalCount / (formalCount + casualCount)
        : 0.5;

    // Count first/second person usage
    const firstPersonCount = analyses.filter(a => a.uses_first_person).length;
    const secondPersonCount = analyses.filter(a => a.uses_second_person).length;

    // Aggregate emotion indicators
    const emotionSums = { enthusiasm: 0, reflective: 0, critical: 0 };
    analyses.forEach(a => {
        const emotions = JSON.parse(a.emotion_indicators || '{}');
        emotionSums.enthusiasm += emotions.enthusiasm || 0;
        emotionSums.reflective += emotions.reflective || 0;
        emotionSums.critical += emotions.critical || 0;
    });

    return {
        count,
        avg_sentence_length: parseFloat(avg('avg_sentence_length').toFixed(2)),
        avg_vocabulary_richness: parseFloat(avg('vocabulary_richness').toFixed(4)),
        avg_short_ratio: parseFloat(avg('short_sentence_ratio').toFixed(2)),
        avg_long_ratio: parseFloat(avg('long_sentence_ratio').toFixed(2)),
        avg_exclamation_freq: parseFloat(avg('exclamation_frequency').toFixed(2)),
        avg_question_freq: parseFloat(avg('question_frequency').toFixed(2)),
        avg_ellipsis_freq: parseFloat(avg('ellipsis_frequency').toFixed(2)),
        avg_tone_score: parseFloat(toneScore.toFixed(2)),
        casual_markers: allCasualMarkers,
        formal_markers: allFormalMarkers,
        first_person_ratio: firstPersonCount / count,
        second_person_ratio: secondPersonCount / count,
        avg_enthusiasm: parseFloat((emotionSums.enthusiasm / count).toFixed(2)),
        avg_reflective: parseFloat((emotionSums.reflective / count).toFixed(2)),
        avg_critical: parseFloat((emotionSums.critical / count).toFixed(2))
    };
}

/**
 * Generate tone description from aggregated data
 * @param {object} aggregated - Aggregated statistics
 * @param {string} topic - Optional topic for context
 * @returns {string} Natural language tone description
 */
function generateToneDescription(aggregated, topic = null) {
    const toneScore = aggregated.avg_tone_score;
    let baseTone;

    if (toneScore < 0.3) {
        baseTone = 'extremely casual and conversational';
    } else if (toneScore < 0.5) {
        baseTone = 'relaxed and approachable with casual language';
    } else if (toneScore < 0.7) {
        baseTone = 'balanced - professional yet conversational';
    } else if (toneScore < 0.85) {
        baseTone = 'polished and professional while maintaining warmth';
    } else {
        baseTone = 'formal and sophisticated';
    }

    // Add first/second person context
    const personContext = [];
    if (aggregated.first_person_ratio > 0.7) {
        personContext.push('speaks from personal experience');
    }
    if (aggregated.second_person_ratio > 0.5) {
        personContext.push('directly addresses the reader');
    }

    let description = baseTone;
    if (personContext.length > 0) {
        description += `, ${personContext.join(' and ')}`;
    }

    if (topic) {
        description += `. Authentic and passionate when discussing ${topic}`;
    }

    return description;
}

/**
 * Generate vocabulary description
 * @param {object} aggregated - Aggregated statistics
 * @param {string} topic - Optional topic
 * @returns {object} Vocabulary characteristics
 */
function generateVocabularyDescription(aggregated, topic = null) {
    const richness = aggregated.avg_vocabulary_richness;

    let description;
    if (richness > 0.5) {
        description = 'rich and varied vocabulary with diverse word choice';
    } else if (richness > 0.35) {
        description = 'balanced vocabulary - clear but not repetitive';
    } else {
        description = 'accessible vocabulary that emphasizes clarity';
    }

    if (topic) {
        description += ` with ${topic}-specific terminology where appropriate`;
    }

    return {
        description,
        richness_score: aggregated.avg_vocabulary_richness
    };
}

/**
 * Generate sentence style description
 * @param {object} aggregated - Aggregated statistics
 * @param {string} topic - Optional topic
 * @returns {string} Sentence style description
 */
function generateSentenceStyleDescription(aggregated, topic = null) {
    const avgLength = aggregated.avg_sentence_length;
    const shortRatio = aggregated.avg_short_ratio;
    const longRatio = aggregated.avg_long_ratio;

    let style;
    if (shortRatio > 0.4) {
        style = 'short, punchy sentences that create momentum';
    } else if (longRatio > 0.3) {
        style = 'longer, flowing sentences with detailed thoughts';
    } else {
        style = 'mix of short impactful statements and longer flowing thoughts';
    }

    if (avgLength < 12) {
        style += '. Concise and direct';
    } else if (avgLength > 18) {
        style += '. Elaborate and descriptive';
    }

    return style;
}

/**
 * Generate punctuation description
 * @param {object} aggregated - Aggregated statistics
 * @param {string} topic - Optional topic
 * @returns {string} Punctuation pattern description
 */
function generatePunctuationDescription(aggregated, topic = null) {
    const patterns = [];

    if (aggregated.avg_exclamation_freq > 5) {
        patterns.push('enthusiastic use of exclamation points');
    } else if (aggregated.avg_exclamation_freq > 2) {
        patterns.push('occasional emphasis with exclamation points');
    }

    if (aggregated.avg_question_freq > 3) {
        patterns.push('engages reader with questions');
    }

    if (aggregated.avg_ellipsis_freq > 2) {
        patterns.push('uses ellipses for dramatic pauses');
    }

    return patterns.length > 0
        ? patterns.join(', ')
        : 'standard punctuation with occasional emphasis';
}

/**
 * Generate personality traits list
 * @param {object} aggregated - Aggregated statistics
 * @param {string} topic - Optional topic
 * @returns {Array} Personality traits
 */
function generatePersonalityTraits(aggregated, topic = null) {
    const traits = [];

    if (aggregated.avg_enthusiasm > 0.5) {
        traits.push('enthusiastic and passionate');
    }

    if (aggregated.avg_reflective > 0.3) {
        traits.push('thoughtful and introspective');
    }

    if (aggregated.avg_critical > 0.3) {
        traits.push('analytical with balanced critique');
    }

    if (aggregated.first_person_ratio > 0.6) {
        traits.push('personal and authentic');
    }

    if (aggregated.second_person_ratio > 0.4) {
        traits.push('engaging and conversational');
    }

    // Add topic-specific traits
    if (topic === 'music') {
        traits.push('deep appreciation for musical artistry');
    } else if (topic === 'personal') {
        traits.push('open and vulnerable in storytelling');
    }

    return traits;
}

/**
 * Extract common phrases from analyses
 * @param {Array} analyses - Blog content analyses
 * @returns {Array} Common phrases
 */
function extractCommonPhrases(analyses) {
    const phraseFreq = {};

    analyses.forEach(analysis => {
        const keywords = JSON.parse(analysis.top_keywords || '[]');
        // Get top 5 keywords from each post
        keywords.slice(0, 5).forEach(item => {
            const word = item.word || item;
            if (word && word.length > 3) {
                phraseFreq[word] = (phraseFreq[word] || 0) + 1;
            }
        });
    });

    // Sort by frequency and return top 20
    return Object.entries(phraseFreq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([phrase]) => phrase);
}

/**
 * Extract characteristic words
 * @param {Array} analyses - Blog content analyses
 * @returns {Array} Characteristic words
 */
function extractCharacteristicWords(analyses) {
    const wordFreq = {};

    analyses.forEach(analysis => {
        const keywords = JSON.parse(analysis.top_keywords || '[]');
        keywords.slice(0, 10).forEach(item => {
            const word = item.word || item;
            if (word && word.length > 3) {
                wordFreq[word] = (wordFreq[word] || 0) + 1;
            }
        });
    });

    // Return top 15 most frequent words
    return Object.entries(wordFreq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .map(([word]) => word);
}

/**
 * Store markers in database
 * @param {object} markers - Generated markers
 */
async function storeMarkers(markers) {
    const supabase = getSupabase();

    const { error } = await supabase
        .from('dynamic_style_markers')
        .upsert(markers, {
            onConflict: 'scope_type,topic_name'
        });

    if (error) {
        throw new Error(`Failed to store markers: ${error.message}`);
    }
}
