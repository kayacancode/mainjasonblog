import { createClient } from '@supabase/supabase-js';
import { exec } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';
import { unlinkSync, readFileSync, mkdirSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';

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

        // Format tracks for Python script (pass via stdin, no file needed)
        const formattedTracks = topTracks.map(t => ({
            name: t.track_name || t.name || 'Unknown Track',
            artist: t.artists || t.artist || 'Unknown Artist',
            popularity: t.popularity || 0,
            week_start: weekStart
        }));

        // Use /tmp only for the final image output (PIL requires file system)
        const tmpDir = tmpdir();
        const timestamp = Date.now();
        const outputDir = join(tmpDir, `tracklist_${timestamp}`);
        mkdirSync(outputDir, { recursive: true });
        const imagePath = join(outputDir, `${weekStart}_tracklist.png`);

        const projectRoot = process.cwd();
        const spotifyApiDir = join(projectRoot, 'pages/api/spotify_api');
        
        // Write tracks to a temporary JSON file in /tmp (like the working endpoint does)
        const tracksJsonPath = join(tmpDir, `tracks_${timestamp}.json`);
        writeFileSync(tracksJsonPath, JSON.stringify(formattedTracks, null, 2));
        
        // Python script that reads from JSON file and writes image to specified path
        // Using the same pattern as process-custom-image-python.js
        const pythonScript = `
import sys
import os
import json

# Get project root and spotify_api directory from environment
project_root = os.environ.get('PROJECT_ROOT', '${projectRoot.replace(/\\/g, '/')}')
spotify_api_dir = os.path.join(project_root, 'pages', 'api', 'spotify_api')
sys.path.insert(0, spotify_api_dir)

# Read tracks from JSON file
tracks_json_path = sys.argv[1]
week_start = sys.argv[2]
output_path = sys.argv[3]

with open(tracks_json_path, 'r') as f:
    tracks_data = json.load(f)

# Import and use main.py's create_tracklist_image
try:
    from main import SpotifyNewMusicAutomation, SpotifyConfig
except ImportError:
    # If spotipy is missing, import directly
    import importlib.util
    main_path = os.path.join(spotify_api_dir, 'main.py')
    spec = importlib.util.spec_from_file_location("main", main_path)
    main_module = importlib.util.module_from_spec(spec)
    from unittest.mock import MagicMock
    sys.modules['spotipy'] = MagicMock()
    sys.modules['spotipy.oauth2'] = MagicMock()
    spec.loader.exec_module(main_module)
    SpotifyNewMusicAutomation = main_module.SpotifyNewMusicAutomation
    SpotifyConfig = main_module.SpotifyConfig

config = SpotifyConfig()
config.OUTPUT_DIR = os.path.dirname(output_path)
os.makedirs(config.OUTPUT_DIR, exist_ok=True)

automation = SpotifyNewMusicAutomation.__new__(SpotifyNewMusicAutomation)
automation.config = config
automation.spotify = None

# Generate tracklist image
tracklist_path = automation.create_tracklist_image(tracks_data, os.path.basename(output_path))

print(json.dumps({"success": True, "tracklist_path": tracklist_path}))
`;

        // Write Python script to /tmp (like the working endpoint does)
        const tempScriptPath = join(tmpDir, `regenerate_tracklist_${timestamp}.py`);
        writeFileSync(tempScriptPath, pythonScript);

        let result = null;
        try {
            // Execute Python script using exec (like the working endpoint)
            const { stdout, stderr } = await execAsync(
                `python3 "${tempScriptPath}" "${tracksJsonPath}" "${weekStart}" "${imagePath}"`,
                {
                    maxBuffer: 10 * 1024 * 1024,
                    cwd: projectRoot,
                    env: { ...process.env, PROJECT_ROOT: projectRoot }
                }
            );

            if (stderr && !stderr.includes('DeprecationWarning')) {
                console.warn('Python stderr:', stderr);
            }

            result = JSON.parse(stdout || '{}');

            if (!result.success || !result.tracklist_path) {
                return res.status(500).json({ error: result.error || 'Failed to regenerate tracklist' });
            }

            // Read the generated image file and upload directly to Supabase
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
            // Cleanup temp files (like the working endpoint does)
            try {
                if (tempScriptPath) unlinkSync(tempScriptPath);
            } catch (e) {
                console.warn('Failed to cleanup temp script:', e);
            }
            try {
                if (tracksJsonPath) unlinkSync(tracksJsonPath);
            } catch (e) {
                console.warn('Failed to cleanup tracks JSON file:', e);
            }
            try {
                // Cleanup generated image file from /tmp
                if (result && result.tracklist_path) {
                    unlinkSync(result.tracklist_path);
                    // Try to remove the output directory if empty
                    try {
                        const dir = require('path').dirname(result.tracklist_path);
                        require('fs').rmdirSync(dir);
                    } catch (e) {
                        // Directory not empty or already removed, ignore
                    }
                }
            } catch (e) {
                console.warn('Failed to cleanup generated image:', e);
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

