import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import { join } from 'path';
import { readFileSync } from 'fs';

const CANVAS_WIDTH = 1080;
const CANVAS_HEIGHT = 1080;
const HEADER_HEIGHT = 140;
const TRACK_START_Y = HEADER_HEIGHT + 70;
const TRACK_ROW_HEIGHT = 78;
const TRACK_MARGIN_X = 70;
const FOOTER_Y = CANVAS_HEIGHT - 45;
const BRAND_RED = '#E23E36';
const BACKGROUND = '#191414';
const TEXT_WHITE = '#FFFFFF';
const TEXT_GRAY = '#B3B3B3';

const projectRoot = process.cwd();
const logoPath = join(projectRoot, 'public', 'tlogo.png');
let logoBuffer = null;
try {
    logoBuffer = readFileSync(logoPath);
} catch (error) {
    console.warn('Tracklist logo not found, continuing without it:', error.message);
}

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

        const formattedTracks = topTracks.map(t => ({
            name: t.track_name || t.name || 'Unknown Track',
            artist: t.artists || t.artist || 'Unknown Artist',
            popularity: t.popularity || 0,
            week_start: weekStart
        }));

        let imageBuffer = null;
        try {
            imageBuffer = await generateTracklistImage(formattedTracks, weekStart);
        } catch (error) {
            console.error('Failed to generate tracklist image via Sharp:', error);
            return res.status(500).json({ error: 'Failed to generate tracklist image', details: error.message });
        }

        const filename = `${weekStart}_tracklist.png`;
        
        const { error: uploadError } = await supabase.storage
            .from('instagram-images')
            .upload(filename, imageBuffer, {
                contentType: 'image/png',
                cacheControl: '0',
                upsert: true,
            });

        if (uploadError) {
            console.error('Upload error:', uploadError);
            return res.status(500).json({ error: 'Failed to upload tracklist image' });
        }

        const { data } = supabase.storage
            .from('instagram-images')
            .getPublicUrl(filename);

        if (!data || !data.publicUrl) {
            console.error('Missing public URL after upload');
            return res.status(500).json({ error: 'Failed to resolve tracklist URL after upload' });
        }

        const cacheBuster = Date.now();
        const tracklistUrl = `${data.publicUrl}?v=${cacheBuster}`;

        // Upsert into images table
        const { data: existing, error: checkError } = await supabase
            .from('images')
            .select('week_start')
            .eq('week_start', weekStart)
            .single();

        const payload = { week_start: weekStart, tracklist_image_url: tracklistUrl, updated_at: new Date().toISOString() };
        if (existing && !checkError) {
            await supabase.from('images').update(payload).eq('week_start', weekStart);
        } else {
            payload.created_at = new Date().toISOString();
            await supabase.from('images').insert(payload);
        }

        console.log(`✅ Tracklist regenerated successfully: ${tracklistUrl}`);

        return res.status(200).json({ success: true, tracklist_url: tracklistUrl, message: 'Tracklist regenerated successfully' });

    } catch (error) {
        console.error('Error regenerating tracklist:', error);
        return res.status(500).json({ 
            error: 'Internal server error',
            details: error.message 
        });
    }
}

function escapeForSvg(text = '') {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function truncateText(text = '', max = 32) {
    if (!text) return '';
    if (text.length <= max) return text;
    return `${text.slice(0, max - 3)}...`;
}

function getFridayDate(weekStart) {
    if (weekStart) {
        const parsed = new Date(`${weekStart}T00:00:00Z`);
        if (!Number.isNaN(parsed.getTime())) {
            return parsed;
        }
    }

    const today = new Date();
    const dayOfWeek = today.getUTCDay(); // 0 Sunday ... 6 Saturday
    const fridayOffset = (dayOfWeek >= 5 ? dayOfWeek - 5 : dayOfWeek + 2);
    const friday = new Date(today);
    friday.setUTCDate(today.getUTCDate() - fridayOffset);
    return friday;
}

function formatFridayLabel(weekStart) {
    const friday = getFridayDate(weekStart);
    return friday.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

async function generateTracklistImage(tracks, weekStart) {
    const subtitle = `New Music Friday - ${formatFridayLabel(weekStart)}`;
    const trackItems = tracks.map((track, index) => {
        const baseY = TRACK_START_Y + index * TRACK_ROW_HEIGHT;
        const number = `${index + 1}`.padStart(2, '0');
        const trackName = truncateText(track.name || 'Unknown Track', 34);
        const artistName = truncateText(track.artist || 'Unknown Artist', 42);
        const escapedTrack = escapeForSvg(trackName);
        const escapedArtist = escapeForSvg(artistName);

        return `
            <text class="track-number" x="${TRACK_MARGIN_X}" y="${baseY}">${number}.</text>
            <text class="track-title" x="${TRACK_MARGIN_X + 80}" y="${baseY}">${escapedTrack}</text>
            <text class="track-artist" x="${TRACK_MARGIN_X + 80}" y="${baseY + 30}">${escapedArtist}</text>
        `;
    }).join('\n');

    const svg = `<?xml version="1.0" encoding="UTF-8"?>
    <svg width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" viewBox="0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
        <style>
            .title { font-family: 'Helvetica Neue', Arial, sans-serif; font-weight: 700; font-size: 52px; fill: ${TEXT_WHITE}; }
            .subtitle { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 30px; fill: ${TEXT_WHITE}; }
            .track-number { font-family: 'Helvetica Neue', Arial, sans-serif; font-weight: 600; font-size: 36px; fill: ${TEXT_GRAY}; }
            .track-title { font-family: 'Helvetica Neue', Arial, sans-serif; font-weight: 700; font-size: 36px; fill: ${TEXT_WHITE}; }
            .track-artist { font-family: 'Helvetica Neue', Arial, sans-serif; font-weight: 500; font-size: 26px; fill: ${TEXT_GRAY}; }
            .footer { font-family: 'Helvetica Neue', Arial, sans-serif; font-weight: 500; font-size: 28px; fill: ${TEXT_GRAY}; }
        </style>
        <rect width="100%" height="100%" fill="${BACKGROUND}" />
        <rect width="100%" height="${HEADER_HEIGHT}" fill="${BRAND_RED}" />
        <text class="title" x="50%" y="60" text-anchor="middle">New Music Out Now</text>
        <text class="subtitle" x="50%" y="105" text-anchor="middle">${escapeForSvg(subtitle)}</text>
        ${trackItems}
        <text class="footer" x="50%" y="${FOOTER_Y}" text-anchor="middle">Suave's new music friday recap</text>
    </svg>`;

    let pngBuffer = await sharp(Buffer.from(svg)).png({ quality: 95 }).toBuffer();
    pngBuffer = await addLogoOverlay(pngBuffer);
    return pngBuffer;
}

async function addLogoOverlay(buffer) {
    if (!logoBuffer) {
        return buffer;
    }

    try {
        const targetHeight = 80;
        const resizedLogo = await sharp(logoBuffer).resize({ height: targetHeight }).png().toBuffer();
        const metadata = await sharp(resizedLogo).metadata();
        const logoWidth = Math.round(metadata.width || 0);
        const logoHeight = Math.round(metadata.height || targetHeight);
        const padding = 14;
        const margin = 45;
        const logoLeft = CANVAS_WIDTH - logoWidth - margin;
        const logoTop = CANVAS_HEIGHT - logoHeight - margin;

        const backgroundBuffer = await sharp({
            create: {
                width: logoWidth + padding * 2,
                height: logoHeight + padding * 2,
                channels: 4,
                background: { r: 0, g: 0, b: 0, alpha: 0.75 }
            }
        }).png().toBuffer();

        return await sharp(buffer)
            .composite([
                { input: backgroundBuffer, left: Math.max(Math.round(logoLeft - padding), 0), top: Math.max(Math.round(logoTop - padding), 0) },
                { input: resizedLogo, left: Math.max(Math.round(logoLeft), 0), top: Math.max(Math.round(logoTop), 0) }
            ])
            .png()
            .toBuffer();
    } catch (error) {
        console.warn('Failed to add logo overlay to tracklist:', error);
        return buffer;
    }
}
