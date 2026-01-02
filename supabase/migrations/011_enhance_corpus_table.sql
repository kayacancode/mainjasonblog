-- Migration 011: Enhance AI Caption Corpus for Topic-Aware Learning
-- Adds topic columns to ai_caption_corpus for topic-specific example retrieval

-- Add topic columns to existing ai_caption_corpus table
ALTER TABLE ai_caption_corpus
ADD COLUMN IF NOT EXISTS topic TEXT,
ADD COLUMN IF NOT EXISTS topics JSONB DEFAULT '[]';

-- Create indexes for efficient topic-based queries
CREATE INDEX IF NOT EXISTS idx_corpus_topic ON ai_caption_corpus(topic);
CREATE INDEX IF NOT EXISTS idx_corpus_topics ON ai_caption_corpus USING GIN (topics);

-- Add index on source_type for efficient filtering
CREATE INDEX IF NOT EXISTS idx_corpus_source_type ON ai_caption_corpus(source_type);

-- Comments for documentation
COMMENT ON COLUMN ai_caption_corpus.topic IS 'Primary topic category from blog content analysis (e.g., music, personal, review)';
COMMENT ON COLUMN ai_caption_corpus.topics IS 'Array of all detected topics for multi-topic posts';
