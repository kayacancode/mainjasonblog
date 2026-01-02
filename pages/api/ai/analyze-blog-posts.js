/**
 * API Endpoint: Analyze Blog Posts
 * Analyzes blog post content to extract writing style patterns
 * Can process specific posts or batch analyze all unpublished posts
 */

import { supabase } from '../../../lib/supabaseClient';
import { analyzePost } from '../../../lib/ai/content-analyzer';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    try {
        const {
            postIds = null,        // Optional: array of specific post IDs to analyze
            reanalyze = false,     // Force re-analysis of already-analyzed posts
            batchSize = 10         // Number of posts to process in parallel
        } = req.body;

        console.log('[Blog Analysis] Starting analysis...', { postIds, reanalyze, batchSize });

        // Build query for posts to analyze
        let postsQuery = supabase
            .from('posts')
            .select('id, title, post_text');

        // Filter by specific post IDs if provided
        if (postIds && Array.isArray(postIds) && postIds.length > 0) {
            postsQuery = postsQuery.in('id', postIds);
        } else {
            // Otherwise, get all published posts with content
            postsQuery = postsQuery
                .not('post_text', 'is', null)
                .gt('post_text', '');
        }

        const { data: posts, error: fetchError } = await postsQuery;

        if (fetchError) {
            throw new Error(`Failed to fetch posts: ${fetchError.message}`);
        }

        if (!posts || posts.length === 0) {
            return res.status(200).json({
                success: true,
                analyzed: 0,
                skipped: 0,
                errors: 0,
                message: 'No posts found to analyze'
            });
        }

        console.log(`[Blog Analysis] Found ${posts.length} posts to process`);

        // If not forcing re-analysis, filter out already-analyzed posts
        let postsToAnalyze = posts;
        if (!reanalyze) {
            const postIdsToCheck = posts.map(p => p.id);
            const { data: existingAnalyses } = await supabase
                .from('blog_content_analysis')
                .select('post_id')
                .in('post_id', postIdsToCheck);

            const analyzedPostIds = new Set(existingAnalyses?.map(a => a.post_id) || []);
            postsToAnalyze = posts.filter(p => !analyzedPostIds.has(p.id));

            console.log(`[Blog Analysis] ${existingAnalyses?.length || 0} already analyzed, ${postsToAnalyze.length} to process`);
        }

        if (postsToAnalyze.length === 0) {
            return res.status(200).json({
                success: true,
                analyzed: 0,
                skipped: posts.length,
                errors: 0,
                message: 'All posts already analyzed. Use reanalyze=true to force re-analysis.'
            });
        }

        // Process posts in batches
        const results = {
            analyzed: 0,
            skipped: 0,
            errors: 0,
            errorDetails: []
        };

        for (let i = 0; i < postsToAnalyze.length; i += batchSize) {
            const batch = postsToAnalyze.slice(i, i + batchSize);
            console.log(`[Blog Analysis] Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(postsToAnalyze.length / batchSize)}`);

            const batchPromises = batch.map(post => analyzeAndStore(post, reanalyze));
            const batchResults = await Promise.allSettled(batchPromises);

            // Aggregate results
            batchResults.forEach((result, idx) => {
                if (result.status === 'fulfilled') {
                    if (result.value.success) {
                        results.analyzed++;
                    } else {
                        results.skipped++;
                    }
                } else {
                    results.errors++;
                    results.errorDetails.push({
                        postId: batch[idx].id,
                        postTitle: batch[idx].title,
                        error: result.reason.message || String(result.reason)
                    });
                    console.error(`[Blog Analysis] Error analyzing post ${batch[idx].id}:`, result.reason);
                }
            });
        }

        console.log('[Blog Analysis] Complete:', results);

        return res.status(200).json({
            success: true,
            ...results,
            message: `Analyzed ${results.analyzed} posts, skipped ${results.skipped}, encountered ${results.errors} errors`
        });

    } catch (error) {
        console.error('[Blog Analysis] Fatal error:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Failed to analyze blog posts'
        });
    }
}

/**
 * Analyze a single post and store results
 * @param {object} post - Post object with id, title, post_text
 * @param {boolean} reanalyze - Whether to update existing analysis
 * @returns {Promise<object>} Result object
 */
async function analyzeAndStore(post, reanalyze) {
    try {
        const { id, title, post_text } = post;

        // Validate post data
        if (!post_text || post_text.length < 100) {
            return {
                success: false,
                message: 'Post content too short for meaningful analysis'
            };
        }

        console.log(`[Blog Analysis] Analyzing post: "${title}" (${id})`);

        // Perform analysis
        const analysis = analyzePost(post_text, title);

        // Prepare data for database
        const analysisData = {
            post_id: id,
            title: analysis.title,
            word_count: analysis.word_count,
            character_count: analysis.character_count,

            // Topic classification
            detected_topics: JSON.stringify(analysis.detected_topics || []),
            primary_topic: analysis.primary_topic,
            topic_confidence: analysis.topic_confidence,

            // Vocabulary
            vocabulary_profile: JSON.stringify(analysis.vocabulary_profile || {}),
            top_keywords: JSON.stringify(analysis.top_keywords || []),
            vocabulary_richness: analysis.vocabulary_richness,

            // Sentence structure
            avg_sentence_length: analysis.avg_sentence_length,
            avg_words_per_sentence: analysis.avg_words_per_sentence,
            sentence_length_variance: analysis.sentence_length_variance,
            short_sentence_ratio: analysis.short_sentence_ratio,
            long_sentence_ratio: analysis.long_sentence_ratio,

            // Punctuation
            exclamation_frequency: analysis.exclamation_frequency,
            question_frequency: analysis.question_frequency,
            ellipsis_frequency: analysis.ellipsis_frequency,
            dash_frequency: analysis.dash_frequency,

            // Tone
            casual_markers: JSON.stringify(analysis.casual_markers || []),
            formal_markers: JSON.stringify(analysis.formal_markers || []),
            emotion_indicators: JSON.stringify(analysis.emotion_indicators || {}),

            // Style
            uses_first_person: analysis.uses_first_person,
            uses_second_person: analysis.uses_second_person,
            paragraph_count: analysis.paragraph_count,
            avg_paragraph_length: analysis.avg_paragraph_length,

            // Metadata
            analysis_version: '1.0',
            analyzed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        // Store or update in database
        if (reanalyze) {
            // Update existing analysis
            const { error: updateError } = await supabase
                .from('blog_content_analysis')
                .upsert(analysisData, {
                    onConflict: 'post_id'
                });

            if (updateError) {
                throw new Error(`Database update failed: ${updateError.message}`);
            }
        } else {
            // Insert new analysis
            const { error: insertError } = await supabase
                .from('blog_content_analysis')
                .insert(analysisData);

            if (insertError) {
                // If conflict (already exists), skip silently
                if (insertError.code === '23505') {
                    return {
                        success: false,
                        message: 'Analysis already exists'
                    };
                }
                throw new Error(`Database insert failed: ${insertError.message}`);
            }
        }

        console.log(`[Blog Analysis] Successfully analyzed: "${title}" - Topic: ${analysis.primary_topic}`);

        return {
            success: true,
            postId: id,
            primaryTopic: analysis.primary_topic,
            wordCount: analysis.word_count
        };

    } catch (error) {
        console.error(`[Blog Analysis] Error in analyzeAndStore:`, error);
        throw error;
    }
}
