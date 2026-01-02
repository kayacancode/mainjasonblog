-- Migration 010: Blog Content Analysis System
-- Creates tables for analyzing blog post content to extract writing style patterns

-- Table 1: Blog Content Analysis
-- Stores extracted style patterns from individual blog posts
CREATE TABLE IF NOT EXISTS blog_content_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,

    -- Content metadata
    title TEXT NOT NULL,
    word_count INTEGER,
    character_count INTEGER,

    -- Topic classification
    detected_topics JSONB DEFAULT '[]', -- Array of topic strings: ["music", "personal"]
    primary_topic TEXT, -- Most confident topic
    topic_confidence DECIMAL(3,2), -- 0-1 confidence score for primary topic

    -- Vocabulary patterns
    vocabulary_profile JSONB DEFAULT '{}', -- {unique_words: [], common_phrases: [], rare_words: []}
    top_keywords JSONB DEFAULT '[]', -- Most frequently used meaningful words
    vocabulary_richness DECIMAL(5,2), -- Unique words / total words ratio

    -- Sentence structure analysis
    avg_sentence_length DECIMAL(5,2), -- Average words per sentence
    avg_words_per_sentence DECIMAL(5,2), -- Synonym for clarity
    sentence_length_variance DECIMAL(5,2), -- Variance in sentence lengths
    short_sentence_ratio DECIMAL(3,2), -- Percentage of sentences < 10 words
    long_sentence_ratio DECIMAL(3,2), -- Percentage of sentences > 25 words

    -- Punctuation patterns (per 1000 words)
    exclamation_frequency DECIMAL(5,2),
    question_frequency DECIMAL(5,2),
    ellipsis_frequency DECIMAL(5,2),
    dash_frequency DECIMAL(5,2),

    -- Tone indicators
    casual_markers JSONB DEFAULT '[]', -- ['gonna', 'wanna', 'kinda', etc.]
    formal_markers JSONB DEFAULT '[]', -- ['therefore', 'furthermore', etc.]
    emotion_indicators JSONB DEFAULT '{}', -- {enthusiasm: 0.8, reflective: 0.3, etc.}

    -- Writing style markers
    uses_first_person BOOLEAN DEFAULT false,
    uses_second_person BOOLEAN DEFAULT false,
    paragraph_count INTEGER,
    avg_paragraph_length DECIMAL(5,2),

    -- Analysis metadata
    analysis_version TEXT DEFAULT '1.0',
    analyzed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for blog_content_analysis
CREATE INDEX IF NOT EXISTS idx_analysis_post ON blog_content_analysis(post_id);
CREATE INDEX IF NOT EXISTS idx_analysis_topic ON blog_content_analysis(primary_topic);
CREATE INDEX IF NOT EXISTS idx_analysis_topics ON blog_content_analysis USING GIN (detected_topics);
CREATE INDEX IF NOT EXISTS idx_analysis_keywords ON blog_content_analysis USING GIN (top_keywords);
CREATE INDEX IF NOT EXISTS idx_analysis_version ON blog_content_analysis(analysis_version);

-- Ensure one analysis per post (can be updated when re-analyzed)
CREATE UNIQUE INDEX IF NOT EXISTS idx_analysis_post_unique ON blog_content_analysis(post_id);

-- Comments for documentation
COMMENT ON TABLE blog_content_analysis IS 'Stores extracted writing style patterns from blog post content for tone learning';
COMMENT ON COLUMN blog_content_analysis.detected_topics IS 'Array of detected topics, e.g., ["music", "personal", "review"]';
COMMENT ON COLUMN blog_content_analysis.vocabulary_profile IS 'Complex vocabulary analysis including unique words, phrases, rare terms';
COMMENT ON COLUMN blog_content_analysis.emotion_indicators IS 'Detected emotional tones with confidence scores';
COMMENT ON COLUMN blog_content_analysis.analysis_version IS 'Version of analysis algorithm used (allows re-analysis when algorithm improves)';


-- Table 2: Dynamic Style Markers
-- Stores aggregated style markers computed from analyzed blog posts
CREATE TABLE IF NOT EXISTS dynamic_style_markers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Scope of these markers
    scope_type TEXT NOT NULL CHECK (scope_type IN ('global', 'topic-specific')),
    topic_name TEXT, -- NULL for global scope, specific topic for topic-specific

    -- Aggregated style markers (natural language descriptions)
    tone_description TEXT,
    vocabulary_characteristics JSONB DEFAULT '{}',
    sentence_style_description TEXT,
    punctuation_patterns TEXT,
    emoji_usage_description TEXT,
    personality_traits JSONB DEFAULT '[]',

    -- Quantitative style parameters (averages across analyzed posts)
    avg_tone_score DECIMAL(3,2), -- 0-1 (casual to formal)
    avg_sentence_length DECIMAL(5,2),
    avg_vocabulary_richness DECIMAL(5,2),
    avg_exclamation_freq DECIMAL(5,2),
    avg_question_freq DECIMAL(5,2),

    -- Common patterns extracted from analysis
    common_phrases JSONB DEFAULT '[]', -- Most frequently used phrases
    characteristic_words JSONB DEFAULT '[]', -- Most characteristic vocabulary

    -- Metadata
    posts_analyzed INTEGER DEFAULT 0, -- Number of posts used for this marker set
    last_updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for dynamic_style_markers
CREATE INDEX IF NOT EXISTS idx_markers_scope ON dynamic_style_markers(scope_type, topic_name);

-- Ensure one marker set per scope+topic combination
CREATE UNIQUE INDEX IF NOT EXISTS idx_markers_scope_unique
    ON dynamic_style_markers(scope_type, COALESCE(topic_name, ''));

-- Comments for documentation
COMMENT ON TABLE dynamic_style_markers IS 'Dynamically generated style markers computed from blog content analysis';
COMMENT ON COLUMN dynamic_style_markers.scope_type IS '''global'' for all posts combined, ''topic-specific'' for filtered by topic';
COMMENT ON COLUMN dynamic_style_markers.topic_name IS 'NULL for global scope, topic name (e.g., ''music'') for topic-specific scope';
COMMENT ON COLUMN dynamic_style_markers.common_phrases IS 'Most frequently used multi-word phrases across analyzed posts';
COMMENT ON COLUMN dynamic_style_markers.characteristic_words IS 'Most distinctive/characteristic vocabulary words';
