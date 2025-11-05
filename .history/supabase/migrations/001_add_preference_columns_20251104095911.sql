-- Migration: Add preference columns to images table
-- Adds support for selecting preferred cover track and custom tracklist title

-- Add columns for preferred track selection
ALTER TABLE images 
ADD COLUMN IF NOT EXISTS preferred_track_id BIGINT,
ADD COLUMN IF NOT EXISTS preferred_track_name TEXT,
ADD COLUMN IF NOT EXISTS preferred_track_image TEXT;

-- Add column for custom tracklist title
ALTER TABLE images 
ADD COLUMN IF NOT EXISTS tracklist_title TEXT;

-- Add comment for documentation
COMMENT ON COLUMN images.preferred_track_id IS 'ID of the track selected as cover image (references tracks.id)';
COMMENT ON COLUMN images.preferred_track_name IS 'Name of the preferred track for reference';
COMMENT ON COLUMN images.preferred_track_image IS 'Album art URL of the preferred track';
COMMENT ON COLUMN images.tracklist_title IS 'Custom title for the tracklist graphic (falls back to default if null)';

