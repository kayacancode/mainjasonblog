import { createClient } from '@supabase/supabase-js';
import { spawn } from 'child_process';
import { join } from 'path';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

function runPythonScript(scriptPath, inputData) {
    return new Promise((resolve, reject) => {
        const python = spawn('python3', [scriptPath]);
        let stdout = '';
        let stderr = '';

        python.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        python.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        python.on('error', (error) => {
            reject(new Error(`Failed to start Python script: ${error.message}. Make sure Python 3 is installed.`));
        });

        python.on('close', (code) => {
            if (code !== 0) {
                console.error('Python script stderr:', stderr);
                console.error('Python script stdout:', stdout);
                reject(new Error(`Python script exited with code ${code}. ${stderr || stdout || 'Unknown error'}`));
            } else {
                try {
                    if (!stdout) {
                        reject(new Error('Python script produced no output'));
                        return;
                    }
                    const result = JSON.parse(stdout);
                    resolve(result);
                } catch (e) {
                    console.error('Failed to parse output. stdout:', stdout);
                    console.error('Parse error:', e.message);
                    reject(new Error(`Failed to parse Python output: ${e.message}. Output: ${stdout.substring(0, 200)}`));
                }
            }
        });

        python.stdin.write(inputData);
        python.stdin.end();
    });
}

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
        const result = await runPythonScript(scriptPath, inputData);

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

