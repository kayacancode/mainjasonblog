-- Migration: Add Instagram automation columns and tables for blog posts
-- Enables blog-to-Instagram carousel workflow with tracking and AI feedback

-- ============================================================================
-- PART 1: Add Instagram columns to posts table
-- ============================================================================

ALTER TABLE posts 
ADD COLUMN IF NOT EXISTS instagram_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS instagram_status TEXT DEFAULT 'none',
ADD COLUMN IF NOT EXISTS instagram_post_id TEXT,
ADD COLUMN IF NOT EXISTS instagram_error TEXT,
ADD COLUMN IF NOT EXISTS instagram_published_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS instagram_assets JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS instagram_retry_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS instagram_caption TEXT,
ADD COLUMN IF NOT EXISTS instagram_ai_summary TEXT,
ADD COLUMN IF NOT EXISTS instagram_cover_override TEXT;

-- Add comments for documentation
COMMENT ON COLUMN posts.instagram_enabled IS 'Whether Instagram automation is enabled for this post';
COMMENT ON COLUMN posts.instagram_status IS 'Current status: none, pending, generating, publishing, published, failed';
COMMENT ON COLUMN posts.instagram_post_id IS 'Instagram post ID after successful publish';
COMMENT ON COLUMN posts.instagram_error IS 'Last error message if publishing failed';
COMMENT ON COLUMN posts.instagram_published_at IS 'Timestamp when post was published to Instagram';
COMMENT ON COLUMN posts.instagram_assets IS 'JSON object with slide URLs: {slide1: url, slide2: url, ...}';
COMMENT ON COLUMN posts.instagram_retry_count IS 'Number of retry attempts for failed publishes';
COMMENT ON COLUMN posts.instagram_caption IS 'Final caption used for Instagram post';
COMMENT ON COLUMN posts.instagram_ai_summary IS 'AI-generated summary for Slide 2';
COMMENT ON COLUMN posts.instagram_cover_override IS 'Custom cover image URL if user overrides default';

-- Create index for filtering by Instagram status
CREATE INDEX IF NOT EXISTS idx_posts_instagram_status ON posts(instagram_status);
CREATE INDEX IF NOT EXISTS idx_posts_instagram_enabled ON posts(instagram_enabled);

-- ============================================================================
-- PART 2: Create instagram_carousel_runs table for tracking each run
-- ============================================================================

CREATE TABLE IF NOT EXISTS instagram_carousel_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    run_mode TEXT NOT NULL DEFAULT 'publish', -- preview, publish, retry
    status TEXT NOT NULL DEFAULT 'started', -- started, generating, uploading, publishing, completed, failed
    
    -- Timestamps
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    
    -- Generated assets
    slide1_url TEXT,
    slide2_url TEXT,
    additional_slides JSONB DEFAULT '[]',
    
    -- AI generation
    ai_prompt_used TEXT,
    ai_model_used TEXT,
    ai_summary_generated TEXT,
    ai_tokens_used INTEGER,
    
    -- Final output
    caption_used TEXT,
    instagram_post_id TEXT,
    
    -- Error tracking
    error_message TEXT,
    error_code TEXT,
    error_step TEXT, -- which step failed: graphics, ai, upload, publish
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for carousel runs
CREATE INDEX IF NOT EXISTS idx_carousel_runs_post_id ON instagram_carousel_runs(post_id);
CREATE INDEX IF NOT EXISTS idx_carousel_runs_status ON instagram_carousel_runs(status);
CREATE INDEX IF NOT EXISTS idx_carousel_runs_created_at ON instagram_carousel_runs(created_at DESC);

-- Add comments
COMMENT ON TABLE instagram_carousel_runs IS 'Tracks each Instagram carousel generation/publish attempt';

-- ============================================================================
-- PART 3: Create ai_caption_corpus table for style training data
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_caption_corpus (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_type TEXT NOT NULL DEFAULT 'manual', -- manual, instagram, blog
    source_id TEXT, -- Instagram post ID or blog post ID
    
    -- The actual content
    caption_text TEXT NOT NULL,
    post_title TEXT,
    post_summary TEXT,
    
    -- Style markers extracted
    style_markers JSONB DEFAULT '{}', -- {emoji_usage, sentence_length, tone, etc.}
    
    -- Usage tracking
    is_approved BOOLEAN DEFAULT true,
    use_for_training BOOLEAN DEFAULT true,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for training queries
CREATE INDEX IF NOT EXISTS idx_caption_corpus_training ON ai_caption_corpus(use_for_training, is_approved);

COMMENT ON TABLE ai_caption_corpus IS 'Historical captions used to train AI on Jason voice/style';

-- ============================================================================
-- PART 4: Create ai_caption_feedback table for edit-improvement loop
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_caption_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
    carousel_run_id UUID REFERENCES instagram_carousel_runs(id) ON DELETE SET NULL,
    
    -- AI output
    ai_generated_text TEXT NOT NULL,
    ai_model_used TEXT,
    ai_prompt_hash TEXT, -- Hash of prompt for deduplication
    
    -- Human feedback
    human_edited_text TEXT,
    was_edited BOOLEAN DEFAULT false,
    style_rating INTEGER CHECK (style_rating >= 1 AND style_rating <= 10),
    feedback_notes TEXT,
    
    -- What changed
    edit_diff JSONB DEFAULT '{}', -- Could store diff or key changes
    
    -- Timestamps
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    edited_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for feedback analysis
CREATE INDEX IF NOT EXISTS idx_caption_feedback_post ON ai_caption_feedback(post_id);
CREATE INDEX IF NOT EXISTS idx_caption_feedback_rating ON ai_caption_feedback(style_rating);
CREATE INDEX IF NOT EXISTS idx_caption_feedback_edited ON ai_caption_feedback(was_edited);

COMMENT ON TABLE ai_caption_feedback IS 'Stores AI generations paired with human edits for training improvement';

-- ============================================================================
-- PART 5: Create instagram_tokens table for caching page tokens
-- ============================================================================

CREATE TABLE IF NOT EXISTS instagram_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id TEXT NOT NULL UNIQUE,
    page_name TEXT,
    instagram_account_id TEXT,
    
    -- Token data
    access_token TEXT NOT NULL,
    token_type TEXT DEFAULT 'page_access_token',
    expires_at TIMESTAMPTZ,
    
    -- Refresh tracking
    last_verified_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ,
    is_valid BOOLEAN DEFAULT true,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for token lookups
CREATE INDEX IF NOT EXISTS idx_instagram_tokens_page ON instagram_tokens(page_id);
CREATE INDEX IF NOT EXISTS idx_instagram_tokens_valid ON instagram_tokens(is_valid);

COMMENT ON TABLE instagram_tokens IS 'Cached Instagram/Facebook page tokens for publishing';

-- ============================================================================
-- PART 6: Trigger to update updated_at timestamps
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to new tables
DROP TRIGGER IF EXISTS update_instagram_carousel_runs_updated_at ON instagram_carousel_runs;
CREATE TRIGGER update_instagram_carousel_runs_updated_at
    BEFORE UPDATE ON instagram_carousel_runs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_ai_caption_corpus_updated_at ON ai_caption_corpus;
CREATE TRIGGER update_ai_caption_corpus_updated_at
    BEFORE UPDATE ON ai_caption_corpus
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_instagram_tokens_updated_at ON instagram_tokens;
CREATE TRIGGER update_instagram_tokens_updated_at
    BEFORE UPDATE ON instagram_tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

