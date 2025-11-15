import { createClient } from '@supabase/supabase-js';
import { exec } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';
import { writeFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';

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

        // Create a temporary Python script that imports from the existing main.py
        const tempScript = `
import sys
import os
import json
import requests
from PIL import Image, ImageDraw, ImageFont
from io import BytesIO
import base64

# Add the spotify_api directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'spotify_api'))

try:
    from main import SpotifyNewMusicAutomation
    
    # Create a mock track dict
    track_data = {
        'name': '${trackName || 'Custom Image'}',
        'artist': '${artistName || 'Custom'}',
        'album_art_url': '${imageUrl}'
    }
    
    # Download the image
    response = requests.get('${imageUrl}')
    response.raise_for_status()
    
    # Save temporarily
    temp_path = '/tmp/temp_album_art.jpg'
    with open(temp_path, 'wb') as f:
        f.write(response.content)
    
    # Create automation instance
    automation = SpotifyNewMusicAutomation('', '')
    
    # Process the image using the existing method
    # We'll need to modify this to work with a URL instead
    # For now, let's use a simpler approach - just download and process
    
    # Process image
    img = Image.open(temp_path)
    img = img.convert('RGB')
    img = img.resize((1080, 1080), Image.Resampling.LANCZOS)
    
    # Create overlay (simplified version)
    overlay = Image.new('RGBA', (1080, 1080), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    
    # White border
    margin = 28
    radius = 40
    draw.rounded_rectangle(
        [(margin, margin), (1080-margin, 1080-margin)],
        radius=radius,
        outline=(255, 255, 255, 255),
        width=18
    )
    
    # Save to bytes
    output = BytesIO()
    img.save(output, format='PNG', quality=95)
    img_bytes = output.getvalue()
    
    # Convert to base64
    result = {
        'success': True,
        'image': base64.b64encode(img_bytes).decode('utf-8')
    }
    
    # Cleanup
    os.remove(temp_path)
    
    print(json.dumps(result))
    
except Exception as e:
    result = {
        'success': False,
        'error': str(e)
    }
    print(json.dumps(result))
    sys.exit(1)
`;

        // Write temp script
        const tempScriptPath = join(tmpdir(), `process_image_${Date.now()}.py`);
        writeFileSync(tempScriptPath, tempScript);

        try {
            // Execute Python script
            const { stdout, stderr } = await execAsync(`python3 "${tempScriptPath}"`, {
                maxBuffer: 10 * 1024 * 1024,
                cwd: join(process.cwd(), 'pages/api')
            });

            if (stderr && !stderr.includes('DeprecationWarning')) {
                console.warn('Python stderr:', stderr);
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
                    cacheControl: '0',
                    upsert: true
                });

            if (uploadError) {
                console.error('Error uploading processed image:', uploadError);
                return res.status(500).json({ error: 'Failed to upload processed image' });
            }

            // Get public URL with cache busting
            const { data } = supabase.storage
                .from('instagram-images')
                .getPublicUrl(filename);

            if (!data || !data.publicUrl) {
                console.error('Missing public URL for processed image');
                return res.status(500).json({ error: 'Failed to resolve processed image URL' });
            }

            const cacheBuster = Date.now();
            const processedImageUrl = `${data.publicUrl}?v=${cacheBuster}`;

            return res.status(200).json({
                success: true,
                processedImageUrl
            });

        } finally {
            // Cleanup temp script
            try {
                unlinkSync(tempScriptPath);
            } catch (e) {
                console.warn('Failed to cleanup temp script:', e);
            }
        }

    } catch (error) {
        console.error('Error processing custom image:', error);
        return res.status(500).json({ 
            error: 'Internal server error',
            details: error.message 
        });
    }
}







