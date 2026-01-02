-- Add subtitle column to posts table
ALTER TABLE posts ADD COLUMN IF NOT EXISTS subtitle TEXT;

