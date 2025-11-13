import { createClient } from '@supabase/supabase-js';
import { exec } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';
import { writeFileSync, unlinkSync, readFileSync } from 'fs';

const execAsync = promisify(exec);

// Initialize Supabase client
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { weekStart } = req.body;

        if (!weekStart) {
            return res.status(400).json({ error: 'weekStart is required' });
        }

        console.log(`🔄 Regenerating tracklist for week: ${weekStart}`);

        // Fetch all tracks for this week
        const { data: tracks, error: tracksError } = await supabase
            .from('tracks')
            .select('*')
            .eq('week_start', weekStart)
            .order('popularity', { ascending: false });

        if (tracksError) {
            console.error('Error fetching tracks:', tracksError);
            return res.status(500).json({ error: 'Failed to fetch tracks', details: tracksError.message });
        }

        if (!tracks || tracks.length === 0) {
            return res.status(404).json({ error: 'No tracks found for this week' });
        }

        // Sort by popularity and take top 10
        const topTracks = tracks
            .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
            .slice(0, 10);

        console.log(`📊 Using top ${topTracks.length} tracks (sorted by popularity)`);

        // Write tracks to a temporary JSON file
        const tracksJsonPath = join(process.cwd(), 'pages/api', `tracks_${Date.now()}.json`);
        writeFileSync(tracksJsonPath, JSON.stringify(topTracks, null, 2));

        // Create a temporary Python script to use main.py's create_tracklist_image method
        const tempScript = `
import sys
import os
import json

# Add spotify_api directory to path
script_dir = os.path.dirname(os.path.abspath(__file__))
spotify_api_dir = os.path.join(script_dir, 'spotify_api')
sys.path.insert(0, spotify_api_dir)

# Read tracks from JSON file
tracks_json_path = sys.argv[1]
week_start = sys.argv[2]

with open(tracks_json_path, 'r') as f:
    tracks_data = json.load(f)

# Convert tracks to format expected by main.py
# Map track_name/name to 'name' and artists/artist to 'artist'
formatted_tracks = []
for t in tracks_data:
    formatted_track = {
        'name': t.get('track_name') or t.get('name') or 'Unknown Track',
        'artist': t.get('artists') or t.get('artist') or 'Unknown Artist',
        'popularity': t.get('popularity', 0),
        'week_start': week_start
    }
    formatted_tracks.append(formatted_track)

# Import and use main.py's create_tracklist_image
# Handle missing spotipy gracefully since we don't need it for tracklist generation
try:
    from main import SpotifyNewMusicAutomation, SpotifyConfig
except ImportError as e:
    # If spotipy is missing, we can still use the method by importing directly
    # Set up minimal environment
    import importlib.util
    main_path = os.path.join(spotify_api_dir, 'main.py')
    spec = importlib.util.spec_from_file_location("main", main_path)
    main_module = importlib.util.module_from_spec(spec)
    # Mock spotipy to avoid import error
    import sys
    from unittest.mock import MagicMock
    sys.modules['spotipy'] = MagicMock()
    sys.modules['spotipy.oauth2'] = MagicMock()
    spec.loader.exec_module(main_module)
    SpotifyNewMusicAutomation = main_module.SpotifyNewMusicAutomation
    SpotifyConfig = main_module.SpotifyConfig

config = SpotifyConfig()
# Set output directory to pages/api/output
config.OUTPUT_DIR = os.path.join(os.path.dirname(tracks_json_path), 'output')
os.makedirs(config.OUTPUT_DIR, exist_ok=True)

automation = SpotifyNewMusicAutomation.__new__(SpotifyNewMusicAutomation)
automation.config = config
automation.spotify = None

# Generate tracklist
tracklist_filename = f"{week_start}_tracklist.png"
tracklist_path = automation.create_tracklist_image(formatted_tracks, tracklist_filename)

print(json.dumps({"success": True, "tracklist_path": tracklist_path}))
`;

        const tempScriptPath = join(process.cwd(), 'pages/api', `regenerate_tracklist_${Date.now()}.py`);
        writeFileSync(tempScriptPath, tempScript);

        try {
            // Execute Python script with tracks JSON file path
            const { stdout, stderr } = await execAsync(
                `python3 "${tempScriptPath}" "${tracksJsonPath}" "${weekStart}"`,
                {
                    maxBuffer: 10 * 1024 * 1024,
                    cwd: join(process.cwd(), 'pages/api')
                }
            );

            if (stderr && !stderr.includes('DeprecationWarning')) {
                console.warn('Python stderr:', stderr);
            }

            const result = JSON.parse(stdout || '{}');

            if (!result.success || !result.tracklist_path) {
                return res.status(500).json({ error: result.error || 'Failed to regenerate tracklist' });
            }

            // Read the generated image file and upload via Supabase JS client
            const imageBuffer = readFileSync(result.tracklist_path);
            const filename = `${weekStart}_tracklist.png`;
            const { error: uploadError } = await supabase.storage
                .from('instagram-images')
                .upload(filename, imageBuffer, {
                    contentType: 'image/png',
                    cacheControl: '3600',
                    upsert: true,
                });

            if (uploadError) {
                console.error('Upload error:', uploadError);
                return res.status(500).json({ error: 'Failed to upload tracklist image' });
            }

            const { data } = supabase.storage
                .from('instagram-images')
                .getPublicUrl(filename);

            // Upsert into images table
            const { data: existing, error: checkError } = await supabase
                .from('images')
                .select('week_start')
                .eq('week_start', weekStart)
                .single();

            const payload = { week_start: weekStart, tracklist_image_url: data.publicUrl, updated_at: new Date().toISOString() };
            if (existing && !checkError) {
                await supabase.from('images').update(payload).eq('week_start', weekStart);
            } else {
                payload.created_at = new Date().toISOString();
                await supabase.from('images').insert(payload);
            }

            console.log(`✅ Tracklist regenerated successfully: ${data.publicUrl}`);

            return res.status(200).json({ success: true, tracklist_url: data.publicUrl, message: 'Tracklist regenerated successfully' });

        } catch (error) {
            console.error('Error executing Python script:', error);
            return res.status(500).json({ 
                error: 'Failed to regenerate tracklist',
                details: error.message 
            });
        } finally {
            // Cleanup temp files
            try {
                unlinkSync(tempScriptPath);
            } catch (e) {
                console.warn('Failed to cleanup temp script:', e);
            }
            try {
                unlinkSync(tracksJsonPath);
            } catch (e) {
                console.warn('Failed to cleanup tracks JSON file:', e);
            }
        }

    } catch (error) {
        console.error('Error regenerating tracklist:', error);
        return res.status(500).json({ 
            error: 'Internal server error',
            details: error.message 
        });
    }
}

