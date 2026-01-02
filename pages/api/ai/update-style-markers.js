/**
 * API Endpoint: Update Style Markers
 * Generates/refreshes dynamic style markers from blog content analysis
 * Can update global markers, topic-specific markers, or all markers
 */

import { computeGlobalStyleMarkers, computeTopicStyleMarkers } from '../../../lib/ai/style-marker-generator';
import { supabase } from '../../../lib/supabaseClient';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    try {
        const {
            scope = 'all',           // 'all', 'global', or specific topic like 'music'
            minPostsRequired = 5     // Minimum posts needed to generate markers
        } = req.body;

        console.log('[Style Markers Update] Starting...', { scope, minPostsRequired });

        const results = {
            updated: [],
            skipped: [],
            errors: []
        };

        // Update global markers
        if (scope === 'all' || scope === 'global') {
            try {
                console.log('[Style Markers Update] Computing global markers...');
                const globalMarkers = await computeGlobalStyleMarkers(minPostsRequired);

                if (globalMarkers) {
                    results.updated.push({
                        scope: 'global',
                        topic: null,
                        postsAnalyzed: globalMarkers.posts_analyzed
                    });
                } else {
                    results.skipped.push({
                        scope: 'global',
                        reason: `Insufficient posts (need ${minPostsRequired})`
                    });
                }
            } catch (error) {
                console.error('[Style Markers Update] Error computing global markers:', error);
                results.errors.push({
                    scope: 'global',
                    error: error.message || String(error)
                });
            }
        }

        // Update topic-specific markers
        if (scope === 'all' || (scope !== 'global' && scope !== 'all')) {
            const topicsToProcess = scope === 'all'
                ? await getAllTopics()
                : [scope];

            for (const topic of topicsToProcess) {
                try {
                    console.log(`[Style Markers Update] Computing markers for topic: ${topic}...`);
                    const topicMarkers = await computeTopicStyleMarkers(topic, minPostsRequired);

                    if (topicMarkers) {
                        results.updated.push({
                            scope: 'topic-specific',
                            topic,
                            postsAnalyzed: topicMarkers.posts_analyzed
                        });
                    } else {
                        results.skipped.push({
                            scope: 'topic-specific',
                            topic,
                            reason: `Insufficient posts (need ${minPostsRequired})`
                        });
                    }
                } catch (error) {
                    console.error(`[Style Markers Update] Error computing markers for ${topic}:`, error);
                    results.errors.push({
                        scope: 'topic-specific',
                        topic,
                        error: error.message || String(error)
                    });
                }
            }
        }

        console.log('[Style Markers Update] Complete:', results);

        return res.status(200).json({
            success: true,
            ...results,
            message: `Updated ${results.updated.length} marker sets, skipped ${results.skipped.length}, encountered ${results.errors.length} errors`
        });

    } catch (error) {
        console.error('[Style Markers Update] Fatal error:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Failed to update style markers'
        });
    }
}

/**
 * Get all distinct topics from blog_content_analysis
 * @returns {Promise<Array>} Array of topic names
 */
async function getAllTopics() {
    const { data, error } = await supabase
        .from('blog_content_analysis')
        .select('primary_topic')
        .not('primary_topic', 'is', null);

    if (error) {
        throw new Error(`Failed to fetch topics: ${error.message}`);
    }

    // Get unique topics
    const topics = [...new Set(data.map(d => d.primary_topic))];

    console.log(`[Style Markers Update] Found ${topics.length} distinct topics:`, topics);

    return topics;
}
