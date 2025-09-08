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

        console.log('API: Generating images for week:', week_start);
        console.log('API: Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
        console.log('API: Service key exists:', !!process.env.SUPABASE_SERVICE_KEY);

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

        // Trigger GitHub Actions workflow for image generation
        console.log(`Triggering GitHub Actions for week ${week_start} with ${tracks.length} tracks`);
        console.log('GITHUB_REPOSITORY:', process.env.GITHUB_REPOSITORY);
        console.log('GITHUB_TOKEN exists:', !!process.env.GITHUB_TOKEN);
        
        // Fallback repository name if not set
        const repository = process.env.GITHUB_REPOSITORY || 'shayanbaig/mainjasonblog';
        
        try {
            const response = await fetch(`https://api.github.com/repos/${repository}/actions/workflows/instagram-image-generation.yml/dispatches`, {
                method: 'POST',
                headers: {
                    'Authorization': `token ${process.env.GITHUB_TOKEN}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ref: 'main',
                    inputs: {
                        week_start: week_start
                    }
                })
            });

            if (response.ok) {
                return res.status(200).json({ 
                    success: true, 
                    message: 'Image generation triggered successfully! Check GitHub Actions for progress.',
                    tracks_count: tracks.length,
                    week_start: week_start,
                    workflow_url: `https://github.com/${repository}/actions`
                });
            } else {
                const errorText = await response.text();
                console.error('GitHub API error:', response.status, errorText);
                return res.status(500).json({ 
                    success: false, 
                    error: 'Failed to trigger image generation workflow',
                    details: errorText
                });
            }
            
        } catch (error) {
            console.error('Error triggering GitHub Actions:', error);
            return res.status(500).json({ 
                success: false, 
                error: 'Failed to trigger image generation workflow',
                details: error.message
            });
        }

    } catch (error) {
        console.error('Error in generate-images API:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
