/**
 * API Endpoint: Migrate Historical Summaries
 * Populates ai_caption_corpus with existing Instagram summaries from posts
 * Automatically approved since we trust historical data
 */

import { supabase } from '../../../lib/supabaseClient';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    try {
        const {
            dryRun = false,           // If true, only report what would be migrated
            minSummaryLength = 50     // Minimum length for meaningful summaries
        } = req.body;

        console.log('[Historical Migration] Starting...', { dryRun, minSummaryLength });

        // Step 1: Fetch posts with Instagram summaries
        const { data: posts, error: fetchError } = await supabase
            .from('posts')
            .select('id, title, instagram_ai_summary')
            .not('instagram_ai_summary', 'is', null);

        if (fetchError) {
            throw new Error(`Failed to fetch posts: ${fetchError.message}`);
        }

        if (!posts || posts.length === 0) {
            return res.status(200).json({
                success: true,
                migrated: 0,
                skipped: 0,
                errors: 0,
                message: 'No posts with Instagram summaries found'
            });
        }

        console.log(`[Historical Migration] Found ${posts.length} posts with summaries`);

        // Filter by minimum length
        const validPosts = posts.filter(p =>
            p.instagram_ai_summary && p.instagram_ai_summary.length >= minSummaryLength
        );

        console.log(`[Historical Migration] ${validPosts.length} posts meet length requirement`);

        // Step 2: Check which summaries are already in corpus
        const { data: existingCorpus } = await supabase
            .from('ai_caption_corpus')
            .select('caption_text, source_id')
            .eq('source_type', 'historical_migration');

        const existingSummaries = new Set(existingCorpus?.map(c => c.caption_text) || []);
        const existingSourceIds = new Set(existingCorpus?.map(c => c.source_id) || []);

        const postsToMigrate = validPosts.filter(p =>
            !existingSummaries.has(p.instagram_ai_summary) &&
            !existingSourceIds.has(p.id)
        );

        console.log(`[Historical Migration] ${postsToMigrate.length} new summaries to migrate`);

        if (postsToMigrate.length === 0) {
            return res.status(200).json({
                success: true,
                migrated: 0,
                skipped: validPosts.length,
                errors: 0,
                message: 'All historical summaries already in corpus'
            });
        }

        // If dry run, just report what would be done
        if (dryRun) {
            return res.status(200).json({
                success: true,
                dryRun: true,
                wouldMigrate: postsToMigrate.length,
                skipped: validPosts.length - postsToMigrate.length,
                sample: postsToMigrate.slice(0, 5).map(p => ({
                    postId: p.id,
                    title: p.title,
                    summaryLength: p.instagram_ai_summary.length
                }))
            });
        }

        // Step 3: Migrate summaries
        const results = {
            migrated: 0,
            skipped: 0,
            errors: 0,
            errorDetails: []
        };

        for (const post of postsToMigrate) {
            try {
                await migrateSingleSummary(post);
                results.migrated++;
                console.log(`[Historical Migration] Migrated: "${post.title}" (${post.id})`);
            } catch (error) {
                results.errors++;
                results.errorDetails.push({
                    postId: post.id,
                    postTitle: post.title,
                    error: error.message || String(error)
                });
                console.error(`[Historical Migration] Error migrating ${post.id}:`, error);
            }
        }

        console.log('[Historical Migration] Complete:', results);

        return res.status(200).json({
            success: true,
            ...results,
            message: `Migrated ${results.migrated} summaries, skipped ${validPosts.length - postsToMigrate.length}, encountered ${results.errors} errors`
        });

    } catch (error) {
        console.error('[Historical Migration] Fatal error:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Failed to migrate historical summaries'
        });
    }
}

/**
 * Migrate a single post's summary to the corpus
 * @param {object} post - Post object with id, title, instagram_ai_summary
 */
async function migrateSingleSummary(post) {
    const { id, title, instagram_ai_summary } = post;

    // Try to get topic from blog_content_analysis if available
    const { data: analysis } = await supabase
        .from('blog_content_analysis')
        .select('primary_topic, detected_topics')
        .eq('post_id', id)
        .single();

    // Analyze style markers of the summary
    const styleMarkers = analyzeStyleMarkers(instagram_ai_summary);

    // Prepare corpus entry
    const corpusEntry = {
        caption_text: instagram_ai_summary,
        source_type: 'historical_migration',
        source_id: id,
        post_title: title,
        topic: analysis?.primary_topic || null,
        topics: analysis?.detected_topics || [],
        style_markers: styleMarkers,
        is_approved: true,         // Trust historical data
        use_for_training: true,    // Enable for training immediately
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    // Insert into corpus
    const { error: insertError } = await supabase
        .from('ai_caption_corpus')
        .insert(corpusEntry);

    if (insertError) {
        throw new Error(`Database insert failed: ${insertError.message}`);
    }
}

/**
 * Analyze style markers of text (simplified version)
 * Based on analyzeStyleMarkers from feedback.js
 * @param {string} text - Text to analyze
 * @returns {object} Style markers
 */
function analyzeStyleMarkers(text) {
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
