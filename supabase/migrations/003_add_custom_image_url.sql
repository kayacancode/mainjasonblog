-- Migration: Add custom_image_url column to images table
-- Adds support for user-uploaded custom images with branding overlay

-- Add column for custom image URL
ALTER TABLE images 
ADD COLUMN IF NOT EXISTS custom_image_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN images.custom_image_url IS 'URL of user-uploaded custom image (already processed with branding overlay)';

