-- Migration: Create ai_generation_variants table
-- Stores multiple AI-generated variants for side-by-side comparison

CREATE TABLE IF NOT EXISTS ai_generation_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    generation_session_id UUID NOT NULL,

    -- Generated content
    variant_text TEXT NOT NULL,
    variant_type TEXT NOT NULL CHECK (variant_type IN ('user-custom', 'ai-recommended', 'experimental')),

    -- Style parameters used for generation
    style_params JSONB NOT NULL,

    -- AI generation metadata
    ai_model_used TEXT,
    ai_prompt_hash TEXT,
    tokens_used INTEGER,

    -- User interaction tracking
    was_selected BOOLEAN DEFAULT false,
    was_edited BOOLEAN DEFAULT false,
    feedback_id UUID REFERENCES ai_caption_feedback(id) ON DELETE SET NULL,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_variants_session ON ai_generation_variants(generation_session_id);
CREATE INDEX IF NOT EXISTS idx_variants_post ON ai_generation_variants(post_id);
CREATE INDEX IF NOT EXISTS idx_variants_selected ON ai_generation_variants(was_selected);
CREATE INDEX IF NOT EXISTS idx_variants_created ON ai_generation_variants(created_at DESC);

-- Table comments
COMMENT ON TABLE ai_generation_variants IS 'Stores multiple AI-generated caption variants with different style parameters for comparison';
COMMENT ON COLUMN ai_generation_variants.generation_session_id IS 'Groups variants generated together in the same session';
COMMENT ON COLUMN ai_generation_variants.variant_type IS 'Type: user-custom (user parameters), ai-recommended (learned preferences), experimental (random variation)';
COMMENT ON COLUMN ai_generation_variants.style_params IS 'JSON object: { tone: 1-10, emojiIntensity: 1-10, length: 1-10, energy: 1-10 }';
COMMENT ON COLUMN ai_generation_variants.was_selected IS 'Whether this variant was chosen by the user';
COMMENT ON COLUMN ai_generation_variants.feedback_id IS 'Links to feedback record if user provided feedback on this variant';

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_variants_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_variants_updated_at_trigger ON ai_generation_variants;
CREATE TRIGGER update_variants_updated_at_trigger
    BEFORE UPDATE ON ai_generation_variants
    FOR EACH ROW
    EXECUTE FUNCTION update_variants_updated_at();
