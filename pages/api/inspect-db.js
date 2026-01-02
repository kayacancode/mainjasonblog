import { createClient } from '@supabase/supabase-js';

// Lazy Supabase client to avoid module-level errors
let supabaseInstance = null;
function getSupabase() {
    if (!supabaseInstance) {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
        if (!supabaseUrl || !supabaseKey) {
            throw new Error('Missing Supabase environment variables');
        }
        supabaseInstance = createClient(supabaseUrl, supabaseKey);
    }
    return supabaseInstance;
}

export default async function handler(req, res) {
    const supabase = getSupabase();
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const results = {};

        // Inspect images table structure
        const { data: imagesSample, error: imagesError } = await supabase
            .from('images')
            .select('*')
            .limit(1);

        if (!imagesError && imagesSample && imagesSample.length > 0) {
            results.images_table = {
                columns: Object.keys(imagesSample[0]),
                sample: imagesSample[0],
                total_records: (await supabase.from('images').select('id', { count: 'exact', head: true })).count
            };
        } else {
            // Get schema by trying to query with select *
            const { data: allImages } = await supabase.from('images').select('*').limit(1);
            results.images_table = {
                columns: allImages && allImages.length > 0 ? Object.keys(allImages[0]) : [],
                sample: allImages?.[0] || null,
                error: imagesError?.message
            };
        }

        // Inspect tracks table structure
        const { data: tracksSample, error: tracksError } = await supabase
            .from('tracks')
            .select('*')
            .limit(1);

        if (!tracksError && tracksSample && tracksSample.length > 0) {
            results.tracks_table = {
                columns: Object.keys(tracksSample[0]),
                sample: tracksSample[0],
                total_records: (await supabase.from('tracks').select('id', { count: 'exact', head: true })).count
            };
        } else {
            results.tracks_table = {
                columns: [],
                sample: null,
                error: tracksError?.message
            };
        }

        // Get count of records in images table
        const { count: imagesCount } = await supabase
            .from('images')
            .select('*', { count: 'exact', head: true });

        // Get count of records in tracks table
        const { count: tracksCount } = await supabase
            .from('tracks')
            .select('*', { count: 'exact', head: true });

        // Get recent weeks from images
        const { data: recentImages } = await supabase
            .from('images')
            .select('week_start, cover_image_url, tracklist_image_url, caption, tracklist_title, preferred_track_id')
            .order('week_start', { ascending: false })
            .limit(5);

        // Get recent tracks grouped by week
        const { data: recentTracks } = await supabase
            .from('tracks')
            .select('week_start, id, track_name, artists, album_art_url')
            .order('week_start', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(20);

        results.summary = {
            images_count: imagesCount || 0,
            tracks_count: tracksCount || 0,
            recent_weeks: recentImages || [],
            recent_tracks_by_week: recentTracks || []
        };

        return res.status(200).json({
            success: true,
            database_inspection: results,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Database inspection error:', error);
        return res.status(500).json({ 
            error: 'Failed to inspect database',
            details: error.message 
        });
    }
}

