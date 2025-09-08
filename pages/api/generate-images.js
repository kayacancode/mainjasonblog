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

        // Check if we're in development (local) or production
        const isDevelopment = process.env.NODE_ENV === 'development';
        
        if (isDevelopment) {
            // For local development, run Python script directly
            console.log(`Running image generation locally for week ${week_start} with ${tracks.length} tracks`);
            
            try {
                const { spawn } = require('child_process');
                const path = require('path');
                
                // Run the Python script directly
                const pythonScript = path.join(process.cwd(), 'pages', 'api', 'spotify_api', 'instagram_image_generator.py');
                
                const pythonProcess = spawn('python3', [pythonScript, '--week', week_start], {
                    cwd: path.join(process.cwd(), 'pages', 'api', 'spotify_api'),
                    env: {
                        ...process.env,
                        GEMINI_API_KEY: process.env.GEMINI_API_KEY,
                        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
                        SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY
                    }
                });
                
                let output = '';
                let errorOutput = '';
                
                pythonProcess.stdout.on('data', (data) => {
                    output += data.toString();
                    console.log('Python output:', data.toString());
                });
                
                pythonProcess.stderr.on('data', (data) => {
                    errorOutput += data.toString();
                    console.error('Python error:', data.toString());
                });
                
                pythonProcess.on('close', (code) => {
                    console.log(`Python script exited with code ${code}`);
                    if (code === 0) {
                        return res.status(200).json({ 
                            success: true, 
                            message: 'Images generated successfully!',
                            tracks_count: tracks.length,
                            week_start: week_start,
                            output: output
                        });
                    } else {
                        return res.status(500).json({ 
                            success: false, 
                            error: 'Image generation failed',
                            details: errorOutput
                        });
                    }
                });
                
            } catch (error) {
                console.error('Error running Python script:', error);
                return res.status(500).json({ 
                    success: false, 
                    error: 'Failed to run image generation script',
                    details: error.message
                });
            }
        } else {
            // For production, provide manual instructions
            console.log(`Image generation requested for week ${week_start} with ${tracks.length} tracks`);
            
            return res.status(200).json({ 
                success: true, 
                message: 'Image generation setup complete! Please run GitHub Actions manually.',
                instructions: 'Go to GitHub → Actions → Instagram Image Generation → Run workflow → Enter week_start: ' + week_start,
                tracks_count: tracks.length,
                week_start: week_start,
                workflow_url: `https://github.com/kayacancode/mainjasonblog/actions/workflows/instagram-image-generation.yml`
            });
        }

    } catch (error) {
        console.error('Error in generate-images API:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
