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

        // Create a temporary Python script to generate the tracklist (no external spotipy dependency)
        const tempScript = `
import sys
import os
import json
from datetime import datetime
from PIL import Image, ImageDraw, ImageFont

# Read tracks from JSON file
tracks_json_path = sys.argv[1]
week_start = sys.argv[2]

with open(tracks_json_path, 'r') as f:
    tracks = json.load(f)

def load_font(size):
    candidates = [
        "/System/Library/Fonts/HelveticaNeue.ttc",
        "/System/Library/Fonts/Helvetica.ttc",
        "/Library/Fonts/HelveticaNeue.ttc",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "Arial.ttf",
    ]
    for path in candidates:
        try:
            return ImageFont.truetype(path, size=size)
        except Exception:
            continue
    return ImageFont.load_default()

def create_tracklist_image(tracks, out_path):
    canvas_w, canvas_h = 1080, 1080
    bg = (0, 0, 0)
    off_white = (232, 220, 207)
    red = (226, 62, 54)
    gray = (210, 210, 210)
    margin = 60

    img = Image.new('RGB', (canvas_w, canvas_h), bg)
    draw = ImageDraw.Draw(img)

    title_font = load_font(50)
    track_font = load_font(36)
    artist_font = load_font(28)
    small_font = load_font(26)

    # Titles
    title = "New Music Out Now"
    draw.text((margin, margin), title, fill=off_white, font=title_font)

    # Subtitle using week_start
    try:
        friday_date = datetime.strptime(week_start, '%Y-%m-%d')
    except Exception:
        friday_date = datetime.now()
    subtitle = "New Music Friday - " + friday_date.strftime('%B %d, %Y')
    draw.text((margin, margin + 60), subtitle, fill=gray, font=small_font)

    # Tracklist
    y = margin + 120
    line_gap = 16
    for idx, t in enumerate(tracks[:10], start=1):
        name = t.get('track_name') or t.get('name') or 'Unknown Track'
        artists = t.get('artists') or t.get('artist') or 'Unknown Artist'
        draw.text((margin, y), f"{idx}. {name}", fill=off_white, font=track_font, stroke_width=1, stroke_fill=(0,0,0))
        y += 42
        draw.text((margin, y), artists, fill=gray, font=artist_font)
        y += 42 + line_gap

    # Bottom-right NEW / MUSIC / FRIDAY
    stack = [("NEW", red, 40), ("MUSIC", gray, 34), ("FRIDAY", gray, 34)]
    total_h = sum(size + 10 for _, _, size in stack) - 10
    y_stack = canvas_h - margin - total_h
    for text, color, size in stack:
        f = load_font(size)
        bbox = draw.textbbox((0,0), text, font=f)
        w = bbox[2]-bbox[0]
        draw.text((canvas_w - margin - w, y_stack), text, fill=color, font=f)
        y_stack += size + 10

    img.save(out_path)

out_dir = os.path.join(os.path.dirname(tracks_json_path), 'output')
os.makedirs(out_dir, exist_ok=True)
tracklist_path = os.path.join(out_dir, f"{week_start}_tracklist.png")
create_tracklist_image(tracks, tracklist_path)

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

