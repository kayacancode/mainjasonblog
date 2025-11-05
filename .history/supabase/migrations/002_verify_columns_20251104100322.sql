-- Verification query: Check if preference columns exist
-- Run this to verify the migration was successful

SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns
WHERE table_name = 'images' 
  AND column_name IN ('preferred_track_id', 'preferred_track_name', 'preferred_track_image', 'tracklist_title')
ORDER BY column_name;

-- Expected output: 4 rows showing the new columns

