/**
 * AI Caption Feedback API
 * Stores human edits and ratings for improving AI generation
 */

import { createClient } from '@supabase/supabase-js';

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

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    const {
        postId,
        runId,
        variantId,           // NEW: Link to specific variant
        aiGeneratedText,
        humanEditedText,
        styleRating,
        feedbackNotes,
        aspectRatings,       // NEW: Detailed aspect ratings
        whatLiked,           // NEW: What user liked
        whatImprove,         // NEW: What should improve
        usedParams           // NEW: Parameters used for generation
    } = req.body;

    // Validate required fields
    if (!aiGeneratedText) {
        return res.status(400).json({ error: 'aiGeneratedText is required' });
    }

    if (styleRating !== undefined && (styleRating < 1 || styleRating > 10)) {
        return res.status(400).json({ error: 'styleRating must be between 1 and 10' });
    }

    // Validate aspect ratings if provided
    if (aspectRatings) {
        const aspects = ['toneMatch', 'lengthAppropriate', 'emojiUsage', 'authenticity'];
        for (const aspect of aspects) {
            if (aspectRatings[aspect] !== undefined) {
                if (aspectRatings[aspect] < 1 || aspectRatings[aspect] > 10) {
                    return res.status(400).json({ error: `${aspect} must be between 1 and 10` });
                }
            }
        }
    }
    
    const supabase = getSupabase();
    
    try {
        // Determine if there were edits
        const wasEdited = humanEditedText && humanEditedText !== aiGeneratedText;
        
        // Calculate edit diff (simple version)
        let editDiff = null;
        if (wasEdited) {
            editDiff = {
                originalLength: aiGeneratedText.length,
                editedLength: humanEditedText.length,
                lengthDelta: humanEditedText.length - aiGeneratedText.length,
                timestamp: new Date().toISOString()
            };
        }
        
        // Insert or update feedback record
        const feedbackData = {
            post_id: postId || null,
            carousel_run_id: runId || null,
            variant_id: variantId || null,                          // NEW
            ai_generated_text: aiGeneratedText,
            human_edited_text: humanEditedText || null,
            was_edited: wasEdited,
            style_rating: styleRating || null,
            feedback_notes: feedbackNotes || null,
            aspect_ratings: aspectRatings || {},                    // NEW
            what_liked: whatLiked || null,                          // NEW
            what_improve: whatImprove || null,                      // NEW
            used_params: usedParams || {},                          // NEW
            edit_diff: editDiff,
            edited_at: wasEdited ? new Date().toISOString() : null
        };
        
        // Check if feedback already exists for this post
        let existingFeedback = null;
        if (postId) {
            const { data } = await supabase
                .from('ai_caption_feedback')
                .select('id')
                .eq('post_id', postId)
                .eq('ai_generated_text', aiGeneratedText)
                .single();
            existingFeedback = data;
        }
        
        let result;
        if (existingFeedback) {
            // Update existing
            const { data, error } = await supabase
                .from('ai_caption_feedback')
                .update({
                    human_edited_text: humanEditedText || null,
                    was_edited: wasEdited,
                    style_rating: styleRating || null,
                    feedback_notes: feedbackNotes || null,
                    edit_diff: editDiff,
                    edited_at: new Date().toISOString()
                })
                .eq('id', existingFeedback.id)
                .select()
                .single();
            
            if (error) throw error;
            result = data;
        } else {
            // Insert new
            const { data, error } = await supabase
                .from('ai_caption_feedback')
                .insert(feedbackData)
                .select()
                .single();
            
            if (error) throw error;
            result = data;
        }
        
        // If rating is high (8+) and it was approved without edits, add to corpus
        if (styleRating >= 8 && !wasEdited) {
            await addToCorpus(supabase, {
                captionText: aiGeneratedText,
                postId,
                sourceType: 'ai_generated'
            });
        }
        
        // If it was edited and rated well (7+), add edited version to corpus
        if (wasEdited && styleRating >= 7 && humanEditedText) {
            await addToCorpus(supabase, {
                captionText: humanEditedText,
                postId,
                sourceType: 'human_edited'
            });
        }
        
        // Mark variant as selected if variantId provided
        if (variantId) {
            await supabase
                .from('ai_generation_variants')
                .update({
                    was_selected: true,
                    was_edited: wasEdited,
                    feedback_id: result.id
                })
                .eq('id', variantId);
        }

        // Update post with edited summary if applicable
        if (postId && humanEditedText) {
            await supabase
                .from('posts')
                .update({ instagram_ai_summary: humanEditedText })
                .eq('id', postId);
        }

        // Trigger preference recalculation for high-rated feedback (async, don't await)
        if (styleRating >= 8 && usedParams) {
            // Import and call preference calculator in background
            import('../../../lib/ai/preference-calculator.js')
                .then(({ calculatePreferences }) => {
                    const { data: { user } } = supabase.auth.getUser();
                    return user ? calculatePreferences(user.id) : null;
                })
                .catch(err => console.error('Preference calculation error:', err));
        }

        return res.status(200).json({
            success: true,
            feedbackId: result.id,
            wasEdited,
            addedToCorpus: (styleRating >= 8 && !wasEdited) || (wasEdited && styleRating >= 7),
            preferencesUpdated: styleRating >= 8 && usedParams,
            message: 'Feedback recorded successfully'
        });
        
    } catch (error) {
        console.error('Feedback API error:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
}

/**
 * Add a caption to the training corpus
 */
async function addToCorpus(supabase, options) {
    const { captionText, postId, sourceType } = options;
    
    try {
        // Check if already in corpus
        const { data: existing } = await supabase
            .from('ai_caption_corpus')
            .select('id')
            .eq('caption_text', captionText)
            .single();
        
        if (existing) {
            return; // Already exists
        }
        
        // Get post title if available
        let postTitle = null;
        if (postId) {
            const { data: post } = await supabase
                .from('posts')
                .select('title')
                .eq('id', postId)
                .single();
            postTitle = post?.title;
        }
        
        // Analyze style markers (basic version)
        const styleMarkers = analyzeStyleMarkers(captionText);
        
        // Insert into corpus
        await supabase
            .from('ai_caption_corpus')
            .insert({
                caption_text: captionText,
                source_type: sourceType,
                source_id: postId,
                post_title: postTitle,
                style_markers: styleMarkers,
                is_approved: true,
                use_for_training: true
            });
        
        console.log('Added caption to training corpus');
    } catch (error) {
        console.error('Error adding to corpus:', error);
        // Non-critical, don't throw
    }
}

/**
 * Basic style marker analysis
 */
function analyzeStyleMarkers(text) {
    const words = text.split(/\s+/);
    const sentences = text.split(/[.!?]+/).filter(s => s.trim());
    
    // Count emojis
    const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;
    const emojis = text.match(emojiRegex) || [];
    
    return {
        wordCount: words.length,
        sentenceCount: sentences.length,
        avgWordsPerSentence: sentences.length > 0 ? Math.round(words.length / sentences.length) : 0,
        emojiCount: emojis.length,
        emojisUsed: [...new Set(emojis)],
        hasQuestion: text.includes('?'),
        hasEllipsis: text.includes('...'),
        startsWithEmoji: emojiRegex.test(text.charAt(0)),
        endsWithEmoji: emojiRegex.test(text.charAt(text.length - 1)),
        characterCount: text.length
    };
}

