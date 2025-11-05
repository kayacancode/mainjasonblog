import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import axios from 'axios';

// Lazy initialization of Supabase client - same pattern as other API endpoints
function getSupabaseClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY;
    
    if (!supabaseUrl) {
        throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
    }
    
    if (!supabaseKey) {
        // Try to get from other sources or provide helpful error
        console.error('SUPABASE_SERVICE_KEY not found in environment variables');
        throw new Error('Missing SUPABASE_SERVICE_KEY. Please add it to your .env.local file. You can find it in your Supabase project settings under API > Service Role Key.');
    }
    
    return createClient(supabaseUrl, supabaseKey);
}

/**
 * Create SVG for text overlay with proper styling
 */
function createTextSVG(text, x, y, fontSize, fill, stroke, strokeWidth = 2, textAnchor = 'start') {
    const escapedText = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    
    return `<text x="${x}" y="${y}" font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="bold" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" text-anchor="${textAnchor}" dominant-baseline="hanging">${escapedText}</text>`;
}

/**
 * Process image with branding overlay
 */
async function processImageWithOverlay(imageUrl, trackName, artistName) {
    // Suppress Fontconfig warnings in serverless environments
    if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
        process.env.FONTCONFIG_PATH = '/tmp';
    }
    
    // Download image
    const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 30000
    });
    
    const imageBuffer = Buffer.from(response.data);
    
    // Constants matching Python script
    const targetSize = 1080;
    const margin = 28;
    const radius = 40;
    const borderWidth = 18;
    
    // Colors
    const offWhite = 'rgb(232, 220, 207)';
    const pureWhite = 'rgb(255, 255, 255)';
    const brandRed = 'rgb(226, 62, 54)';
    const lightGray = 'rgb(210, 210, 210)';
    const blackStroke = 'rgba(0, 0, 0, 0.6)';
    
    // Load and resize image
    let image = sharp(imageBuffer);
    
    // Resize to 1080x1080 maintaining aspect ratio, then extend/crop to square
    image = image
        .resize(targetSize, targetSize, {
            fit: 'cover',
            position: 'center'
        })
        .ensureAlpha();
    
    // Calculate text positions and sizes
    const artistText = (artistName || 'Custom').toUpperCase();
    const trackText = (trackName || 'Custom Image').toUpperCase();
    
    // Artist name at top (centered) - dynamic sizing
    let artistFontSize = 160;
    const availableWidth = targetSize - (margin * 2) - 40;
    let artistLines = [artistText];
    
    // Calculate optimal font size for artist name
    while (artistFontSize > 80) {
        const estimatedWidth = artistText.length * (artistFontSize * 0.6);
        if (estimatedWidth <= availableWidth) {
            break;
        }
        artistFontSize -= 10;
    }
    
    // Handle multi-line artist name if needed
    if (artistFontSize <= 80) {
        artistFontSize = 100;
        const words = artistText.split(' ');
        artistLines = [];
        let currentLine = '';
        for (const word of words) {
            const testLine = currentLine ? `${currentLine} ${word}` : word;
            const estimatedWidth = testLine.length * (artistFontSize * 0.6);
            if (estimatedWidth > availableWidth && currentLine) {
                artistLines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        }
        if (currentLine) {
            artistLines.push(currentLine);
        }
    }
    
    // Track name at bottom-left - dynamic sizing
    let trackFontSize = 100;
    const trackAvailableWidth = (targetSize / 2) - margin - 20;
    let trackLines = [trackText];
    
    // Calculate optimal font size for track name
    while (trackFontSize > 60) {
        const estimatedWidth = trackText.length * (trackFontSize * 0.6);
        if (estimatedWidth <= trackAvailableWidth) {
            break;
        }
        trackFontSize -= 5;
    }
    
    // Handle multi-line track name if needed
    if (trackFontSize <= 60) {
        trackFontSize = 75;
        const words = trackText.split(' ');
        trackLines = [];
        let currentLine = '';
        for (const word of words) {
            const testLine = currentLine ? `${currentLine} ${word}` : word;
            const estimatedWidth = testLine.length * (trackFontSize * 0.6);
            if (estimatedWidth > trackAvailableWidth && currentLine) {
                trackLines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        }
        if (currentLine) {
            trackLines.push(currentLine);
        }
    }
    
    // Create text overlay SVG
    let textSVG = `<svg width="${targetSize}" height="${targetSize}">`;
    
    // Artist name at top (centered)
    const artistY = margin + 30;
    const artistLineHeight = artistFontSize * 1.2;
    artistLines.forEach((line, index) => {
        const x = targetSize / 2; // Center point
        const y = artistY + (index * artistLineHeight);
        textSVG += createTextSVG(line, x, y, artistFontSize, offWhite, 'rgba(0, 0, 0, 0.63)', 3, 'middle');
    });
    
    // Track name at bottom-left
    const trackLineHeight = trackFontSize * 1.2;
    const trackStartY = targetSize - margin - 50 - (trackLines.length * trackLineHeight);
    trackLines.forEach((line, index) => {
        const x = margin + 30;
        const y = trackStartY + (index * trackLineHeight);
        textSVG += createTextSVG(line, x, y, trackFontSize, offWhite, 'rgba(0, 0, 0, 0.59)', 2, 'start');
    });
    
    // Bottom-right stacked NEW / MUSIC / FRIDAY
    const stackedFontBig = 65;
    const stackedFontSmall = 50;
    const rMargin = margin + 50;
    const bMarginRight = margin + 40;
    const stackSpacing = 16;
    
    const stackWords = [
        { text: 'NEW', color: brandRed, fontSize: stackedFontBig },
        { text: 'MUSIC', color: lightGray, fontSize: stackedFontSmall },
        { text: 'FRIDAY', color: lightGray, fontSize: stackedFontSmall }
    ];
    
    // Calculate total height of stack
    let totalStackHeight = 0;
    stackWords.forEach(({ fontSize }) => {
        totalStackHeight += fontSize + stackSpacing;
    });
    totalStackHeight -= stackSpacing; // Remove last spacing
    
    let stackY = targetSize - bMarginRight - totalStackHeight;
    stackWords.forEach(({ text, color, fontSize }) => {
        const x = targetSize - rMargin; // Right-aligned position
        textSVG += createTextSVG(text, x, stackY, fontSize, color, 'rgba(0, 0, 0, 0.59)', 2, 'end');
        stackY += fontSize + stackSpacing;
    });
    
    textSVG += '</svg>';
    
    // Prepare all overlays
    const darkOverlaySVG = `
        <svg width="${targetSize}" height="${targetSize}">
            <rect width="${targetSize}" height="${targetSize}" fill="rgba(0, 0, 0, 0.6)"/>
        </svg>
    `;
    
    const borderSVG = `
        <svg width="${targetSize}" height="${targetSize}">
            <rect x="${margin}" y="${margin}" 
                  width="${targetSize - margin * 2}" 
                  height="${targetSize - margin * 2}" 
                  rx="${radius}" 
                  ry="${radius}" 
                  fill="none" 
                  stroke="${pureWhite}" 
                  stroke-width="${borderWidth}"/>
        </svg>
    `;
    
    // Apply all overlays in a single composite operation
    const darkOverlayBuffer = Buffer.from(darkOverlaySVG);
    const borderBuffer = Buffer.from(borderSVG);
    const textBuffer = Buffer.from(textSVG);
    
    image = image.composite([
        {
            input: darkOverlayBuffer,
            blend: 'over'
        },
        {
            input: borderBuffer,
            blend: 'over'
        },
        {
            input: textBuffer,
            blend: 'over'
        }
    ]);
    
    // Convert to PNG and return buffer
    const processedBuffer = await image.png().toBuffer();
    return processedBuffer;
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

        // Process image with overlay
        let imageBuffer;
        try {
            imageBuffer = await processImageWithOverlay(
                imageUrl,
                trackName || 'Custom Image',
                artistName || 'Custom'
            );
        } catch (error) {
            console.error('Error processing image:', error);
            return res.status(500).json({ 
                error: 'Failed to process image',
                details: error.message 
            });
        }

        // Upload processed image to Supabase
        let supabase;
        try {
            supabase = getSupabaseClient();
        } catch (error) {
            return res.status(500).json({ 
                error: 'Supabase configuration missing',
                details: error.message
            });
        }

        const filename = `${weekStart}_custom_processed.png`;
        
        // Try to remove existing file first (for upsert behavior)
        await supabase.storage
            .from('instagram-images')
            .remove([filename])
            .catch(() => {
                // Ignore errors if file doesn't exist
            });
        
        // Upload the new file
        const { error: uploadError } = await supabase.storage
            .from('instagram-images')
            .upload(filename, imageBuffer, {
                contentType: 'image/png',
                cacheControl: '3600'
            });

        if (uploadError) {
            console.error('Error uploading processed image:', uploadError);
            return res.status(500).json({ error: 'Failed to upload processed image', details: uploadError.message });
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
