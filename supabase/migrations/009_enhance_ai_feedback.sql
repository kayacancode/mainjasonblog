-- Migration: Enhance ai_caption_feedback table
-- Add columns for detailed aspect ratings and variant linking

-- Add new columns to ai_caption_feedback table
ALTER TABLE ai_caption_feedback
ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES ai_generation_variants(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS aspect_ratings JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS what_liked TEXT,
ADD COLUMN IF NOT EXISTS what_improve TEXT,
ADD COLUMN IF NOT EXISTS used_params JSONB DEFAULT '{}';

-- Add column comments
COMMENT ON COLUMN ai_caption_feedback.variant_id IS 'Links to the specific variant from ai_generation_variants if feedback is for a generated variant';
COMMENT ON COLUMN ai_caption_feedback.aspect_ratings IS 'Individual aspect ratings: { toneMatch: 1-10, lengthAppropriate: 1-10, emojiUsage: 1-10, authenticity: 1-10 }';
COMMENT ON COLUMN ai_caption_feedback.what_liked IS 'Qualitative feedback: what the user liked about the generated text';
COMMENT ON COLUMN ai_caption_feedback.what_improve IS 'Qualitative feedback: what the user thinks should improve';
COMMENT ON COLUMN ai_caption_feedback.used_params IS 'Style parameters used for generation: { tone: 1-10, emojiIntensity: 1-10, length: 1-10, energy: 1-10 }';

-- Create index for variant lookups
CREATE INDEX IF NOT EXISTS idx_feedback_variant ON ai_caption_feedback(variant_id);

-- Create index for param-based analytics
CREATE INDEX IF NOT EXISTS idx_feedback_params ON ai_caption_feedback USING GIN (used_params);

-- Create index for aspect ratings analytics
CREATE INDEX IF NOT EXISTS idx_feedback_aspects ON ai_caption_feedback USING GIN (aspect_ratings);
