/**
 * AI Style Preference Calculator
 * Analyzes feedback patterns to learn user's preferred style parameters
 */

import { createClient } from '@supabase/supabase-js';
import { getSupabaseUrl, getSupabaseServiceKey } from '../env';

// Lazy Supabase client
let supabaseClient = null;
function getSupabase() {
    if (!supabaseClient) {
        supabaseClient = createClient(getSupabaseUrl(), getSupabaseServiceKey());
    }
    return supabaseClient;
}

/**
 * Calculate and store user's style preferences based on feedback history
 * @param {string} userId - User ID to calculate preferences for
 * @returns {object|null} Calculated preferences or null if insufficient data
 */
export async function calculatePreferences(userId) {
    if (!userId) {
        console.error('User ID is required for preference calculation');
        return null;
    }

    const supabase = getSupabase();

    try {
        // Fetch all high-rated feedback (rating >= 8) with style parameters
        const { data: highRated, error: fetchError } = await supabase
            .from('ai_caption_feedback')
            .select('used_params, style_rating, aspect_ratings, created_at')
            .gte('style_rating', 8)
            .not('used_params', 'is', null)
            .order('created_at', { ascending: false })
            .limit(50);

        if (fetchError) {
            console.error('Error fetching feedback:', fetchError);
            return null;
        }

        if (!highRated || highRated.length < 5) {
            console.log(`Insufficient data for preference calculation: ${highRated?.length || 0} samples (need 5+)`);
            return null;
        }

        // Extract parameter values from feedback
        const toneValues = [];
        const emojiValues = [];
        const lengthValues = [];
        const energyValues = [];

        for (const feedback of highRated) {
            if (feedback.used_params) {
                if (feedback.used_params.tone) toneValues.push(feedback.used_params.tone);
                if (feedback.used_params.emojiIntensity) emojiValues.push(feedback.used_params.emojiIntensity);
                if (feedback.used_params.length) lengthValues.push(feedback.used_params.length);
                if (feedback.used_params.energy) energyValues.push(feedback.used_params.energy);
            }
        }

        // Calculate preference ranges (min/max of high-rated params)
        const preferences = {
            preferred_tone_min: toneValues.length > 0 ? Math.min(...toneValues) : null,
            preferred_tone_max: toneValues.length > 0 ? Math.max(...toneValues) : null,
            preferred_emoji_min: emojiValues.length > 0 ? Math.min(...emojiValues) : null,
            preferred_emoji_max: emojiValues.length > 0 ? Math.max(...emojiValues) : null,
            preferred_length_min: lengthValues.length > 0 ? Math.min(...lengthValues) : null,
            preferred_length_max: lengthValues.length > 0 ? Math.max(...lengthValues) : null,
            preferred_energy_min: energyValues.length > 0 ? Math.min(...energyValues) : null,
            preferred_energy_max: energyValues.length > 0 ? Math.max(...energyValues) : null,

            // Calculate confidence scores based on sample size (max 1.0 at 20+ samples)
            tone_confidence: Math.min(toneValues.length / 20, 1).toFixed(2),
            emoji_confidence: Math.min(emojiValues.length / 20, 1).toFixed(2),
            length_confidence: Math.min(lengthValues.length / 20, 1).toFixed(2),
            energy_confidence: Math.min(energyValues.length / 20, 1).toFixed(2),

            feedback_count: highRated.length,
            high_rated_count: highRated.length,
            last_calculated_at: new Date().toISOString()
        };

        // Upsert preferences to database (update if exists, insert if not)
        const { data: upserted, error: upsertError } = await supabase
            .from('ai_style_preferences')
            .upsert({
                user_id: userId,
                ...preferences
            }, {
                onConflict: 'user_id'
            })
            .select()
            .single();

        if (upsertError) {
            console.error('Error upserting preferences:', upsertError);
            return null;
        }

        console.log(`Preferences calculated for user ${userId}:`, {
            tone: `${preferences.preferred_tone_min}-${preferences.preferred_tone_max} (confidence: ${preferences.tone_confidence})`,
            emoji: `${preferences.preferred_emoji_min}-${preferences.preferred_emoji_max} (confidence: ${preferences.emoji_confidence})`,
            length: `${preferences.preferred_length_min}-${preferences.preferred_length_max} (confidence: ${preferences.length_confidence})`,
            energy: `${preferences.preferred_energy_min}-${preferences.preferred_energy_max} (confidence: ${preferences.energy_confidence})`,
            samples: highRated.length
        });

        return upserted;

    } catch (error) {
        console.error('Preference calculation error:', error);
        return null;
    }
}

/**
 * Get recommended parameters based on learned preferences
 * @param {object} preferences - Preferences object from ai_style_preferences table
 * @returns {object} Recommended parameters {tone, emojiIntensity, length, energy}
 */
export function getRecommendedParams(preferences) {
    // Default parameters if no preferences or low confidence
    const defaults = {
        tone: 6,
        emojiIntensity: 3,
        length: 7,
        energy: 4
    };

    if (!preferences) {
        return defaults;
    }

    // Check if we have enough confidence (threshold: 0.3)
    const hasConfidence =
        preferences.tone_confidence >= 0.3 &&
        preferences.emoji_confidence >= 0.3 &&
        preferences.length_confidence >= 0.3 &&
        preferences.energy_confidence >= 0.3;

    if (!hasConfidence) {
        console.log('Low confidence, using defaults');
        return defaults;
    }

    // Calculate midpoints of preferred ranges
    const recommended = {
        tone: Math.round((preferences.preferred_tone_min + preferences.preferred_tone_max) / 2),
        emojiIntensity: Math.round((preferences.preferred_emoji_min + preferences.preferred_emoji_max) / 2),
        length: Math.round((preferences.preferred_length_min + preferences.preferred_length_max) / 2),
        energy: Math.round((preferences.preferred_energy_min + preferences.preferred_energy_max) / 2)
    };

    return recommended;
}

/**
 * Fetch user's preferences from database
 * @param {string} userId - User ID
 * @returns {object|null} Preferences object or null if not found
 */
export async function getUserPreferences(userId) {
    if (!userId) return null;

    const supabase = getSupabase();

    try {
        const { data, error } = await supabase
            .from('ai_style_preferences')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
            console.error('Error fetching preferences:', error);
            return null;
        }

        return data;

    } catch (error) {
        console.error('Get preferences error:', error);
        return null;
    }
}

/**
 * Get recommended parameters for a user (fetches preferences and calculates)
 * @param {string} userId - User ID
 * @returns {object} Recommended parameters
 */
export async function getRecommendedParamsForUser(userId) {
    const preferences = await getUserPreferences(userId);
    return getRecommendedParams(preferences);
}
