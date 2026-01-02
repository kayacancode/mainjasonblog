-- Migration: Create ai_style_preferences table
-- Stores learned style preferences from user feedback patterns

CREATE TABLE IF NOT EXISTS ai_style_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Learned parameter ranges (based on high-rated feedback)
    preferred_tone_min INTEGER CHECK (preferred_tone_min >= 1 AND preferred_tone_min <= 10),
    preferred_tone_max INTEGER CHECK (preferred_tone_max >= 1 AND preferred_tone_max <= 10),
    preferred_emoji_min INTEGER CHECK (preferred_emoji_min >= 1 AND preferred_emoji_min <= 10),
    preferred_emoji_max INTEGER CHECK (preferred_emoji_max >= 1 AND preferred_emoji_max <= 10),
    preferred_length_min INTEGER CHECK (preferred_length_min >= 1 AND preferred_length_min <= 10),
    preferred_length_max INTEGER CHECK (preferred_length_max >= 1 AND preferred_length_max <= 10),
    preferred_energy_min INTEGER CHECK (preferred_energy_min >= 1 AND preferred_energy_min <= 10),
    preferred_energy_max INTEGER CHECK (preferred_energy_max >= 1 AND preferred_energy_max <= 10),

    -- Confidence scores (0-1, based on sample size)
    tone_confidence DECIMAL(3,2) CHECK (tone_confidence >= 0 AND tone_confidence <= 1),
    emoji_confidence DECIMAL(3,2) CHECK (emoji_confidence >= 0 AND emoji_confidence <= 1),
    length_confidence DECIMAL(3,2) CHECK (length_confidence >= 0 AND length_confidence <= 1),
    energy_confidence DECIMAL(3,2) CHECK (energy_confidence >= 0 AND energy_confidence <= 1),

    -- Sample size information
    feedback_count INTEGER DEFAULT 0,
    high_rated_count INTEGER DEFAULT 0,

    -- Metadata
    last_calculated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for user lookup
CREATE INDEX IF NOT EXISTS idx_preferences_user ON ai_style_preferences(user_id);

-- Ensure one preference record per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_preferences_user_unique ON ai_style_preferences(user_id);

-- Table comments
COMMENT ON TABLE ai_style_preferences IS 'Stores learned style preferences calculated from user feedback patterns';
COMMENT ON COLUMN ai_style_preferences.preferred_tone_min IS 'Minimum tone value from high-rated feedback (1=casual, 10=formal)';
COMMENT ON COLUMN ai_style_preferences.tone_confidence IS 'Confidence score 0-1 based on sample size (1.0 = 20+ samples)';
COMMENT ON COLUMN ai_style_preferences.feedback_count IS 'Total number of feedback records analyzed';
COMMENT ON COLUMN ai_style_preferences.high_rated_count IS 'Number of high-rated (8+) feedback records used for calculation';

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_preferences_updated_at_trigger ON ai_style_preferences;
CREATE TRIGGER update_preferences_updated_at_trigger
    BEFORE UPDATE ON ai_style_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_preferences_updated_at();
