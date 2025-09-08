import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { week_start } = req.body;
        
        if (!week_start) {
            return res.status(400).json({ error: 'week_start is required' });
        }

        console.log('API: Generating images directly for week:', week_start);

        // Get tracks for the specified week
        const { data: tracks, error: tracksError } = await supabase
            .from('tracks')
            .select('*')
            .eq('week_start', week_start);

        if (tracksError) {
            console.error('Error fetching tracks:', tracksError);
            return res.status(500).json({ error: 'Failed to fetch tracks' });
        }

        if (!tracks || tracks.length === 0) {
            return res.status(404).json({ error: 'No tracks found for this week' });
        }

        // For now, just return success and let the user know to use GitHub Actions
        return res.status(200).json({ 
            success: true, 
            message: 'Image generation will be handled by GitHub Actions. Please check the Actions tab for progress.',
            tracks_count: tracks.length,
            week_start: week_start,
            workflow_url: `https://github.com/shayanbaig/mainjasonblog/actions`
        });

    } catch (error) {
        console.error('Error in generate-images-direct API:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
