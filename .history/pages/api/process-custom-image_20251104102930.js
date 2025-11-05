import { createClient } from '@supabase/supabase-js';
import { exec } from 'child_process';
import { promisify } from 'util';
import { tmpdir } from 'os';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';

const execAsync = promisify(exec);
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { imageUrl, weekStart, trackName, artistName } = req.body;

        if (!imageUrl || !weekStart) {
            return res.status(400).json({ error: 'imageUrl and weekStart are required' });
        }

        // Path to Python script
        const scriptPath = join(process.cwd(), 'pages/api/process-custom-image.py');

        // Prepare input data for Python script
        const inputData = JSON.stringify({
            imageUrl,
            trackName: trackName || 'Custom Image',
            artistName: artistName || 'Custom'
        });

        // Call Python script
        const { stdout, stderr } = await execAsync(
            `python3 "${scriptPath}"`,
            {
                input: inputData,
                maxBuffer: 10 * 1024 * 1024 // 10MB buffer for image data
            }
        );

        if (stderr) {
            console.error('Python script stderr:', stderr);
        }

        const result = JSON.parse(stdout);

        if (!result.success) {
            return res.status(500).json({ error: result.error || 'Failed to process image' });
        }

        // Decode base64 image
        const imageBuffer = Buffer.from(result.image, 'base64');

        // Upload processed image to Supabase
        const filename = `${weekStart}_custom_processed.png`;
        const { error: uploadError } = await supabase.storage
            .from('instagram-images')
            .upload(filename, imageBuffer, {
                contentType: 'image/png',
                upsert: true
            });

        if (uploadError) {
            console.error('Error uploading processed image:', uploadError);
            return res.status(500).json({ error: 'Failed to upload processed image' });
        }

        // Get public URL
        const { data } = supabase.storage
            .from('instagram-images')
            .getPublicUrl(filename);

        return res.status(200).json({
            success: true,
            processedImageUrl: data.publicUrl
        });

    } catch (error) {
        console.error('Error processing custom image:', error);
        return res.status(500).json({ 
            error: 'Internal server error',
            details: error.message 
        });
    }
}

