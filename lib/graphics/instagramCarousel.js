/**
 * Instagram Carousel Graphics Generator
 * Creates branded slide images for blog-to-Instagram automation
 */

import sharp from 'sharp';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import { join, dirname } from 'path';
import { existsSync, readdirSync, mkdirSync, readFileSync } from 'fs';
import { getSupabaseUrl, getSupabaseServiceKey, isVercel } from '../env';

// Constants
const CANVAS_WIDTH = 1080;
const CANVAS_HEIGHT = 1080;

// Brand colors
const BRAND_RED = '#E23E36';
const OFF_WHITE = '#E8DCCF';
const PURE_WHITE = '#FFFFFF';
const BACKGROUND_DARK = '#191414';
const TEXT_GRAY = '#B3B3B3';

// Lazy Supabase client
let supabaseClient = null;
function getSupabase() {
    if (!supabaseClient) {
        supabaseClient = createClient(getSupabaseUrl(), getSupabaseServiceKey());
    }
    return supabaseClient;
}

// Load logo once
const projectRoot = process.cwd();
const logoPath = join(projectRoot, 'public', 'tlogo.png');
let logoBuffer = null;
try {
    logoBuffer = readFileSync(logoPath);
} catch (error) {
    console.warn('Logo not found at', logoPath);
}

/**
 * Setup fontconfig for serverless environments
 */
function setupFontconfig() {
    if (isVercel() || process.env.AWS_LAMBDA_FUNCTION_NAME) {
        const fontsDir = join(process.cwd(), 'fonts');
        process.env.FONTCONFIG_PATH = fontsDir;
        
        const fontsConfFile = join(fontsDir, 'fonts.conf');
        if (existsSync(fontsConfFile)) {
            process.env.FONTCONFIG_FILE = fontsConfFile;
        }
        
        // Create cache directory
        const cacheDir = '/tmp/fonts-cache';
        try {
            if (!existsSync(cacheDir)) {
                mkdirSync(cacheDir, { recursive: true });
            }
        } catch (e) {
            // Ignore
        }
    }
}

/**
 * Escape text for SVG
 */
function escapeForSvg(text = '') {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Create SVG text element with stroke and fill
 */
function createTextSVG(text, x, y, fontSize, fill, stroke, strokeWidth = 2, textAnchor = 'start') {
    const escapedText = escapeForSvg(text);
    const fontFamily = 'Liberation Sans Bold, LiberationSans-Bold, Liberation Sans, Arial Bold, Arial, sans-serif';
    
    let strokeColor = stroke;
    let strokeOpacity = '1';
    const rgbaMatch = typeof stroke === 'string' && stroke.match(/rgba\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([0-9.]+)\s*\)/i);
    if (rgbaMatch) {
        const [, r, g, b, a] = rgbaMatch;
        strokeColor = `rgb(${r}, ${g}, ${b})`;
        strokeOpacity = a;
    }
    
    const strokeText = `<text x="${x}" y="${y}" font-family="${fontFamily}" font-size="${fontSize}" font-weight="700" fill="none" stroke="${strokeColor}" stroke-width="${strokeWidth * 2}" stroke-opacity="${strokeOpacity}" text-anchor="${textAnchor}" dominant-baseline="hanging">${escapedText}</text>`;
    const fillText = `<text x="${x}" y="${y}" font-family="${fontFamily}" font-size="${fontSize}" font-weight="700" fill="${fill}" text-anchor="${textAnchor}" dominant-baseline="hanging">${escapedText}</text>`;
    
    return strokeText + fillText;
}

/**
 * Word-wrap text to fit within maxWidth
 */
function wrapText(text, fontSize, maxWidth) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';
    
    for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const estimatedWidth = testLine.length * (fontSize * 0.55);
        
        if (estimatedWidth > maxWidth && currentLine) {
            lines.push(currentLine);
            currentLine = word;
        } else {
            currentLine = testLine;
        }
    }
    
    if (currentLine) {
        lines.push(currentLine);
    }
    
    return lines;
}

/**
 * Generate Slide 1: Cover image with title overlay
 * @param {object} options
 * @param {string} options.coverImageUrl - URL of cover image
 * @param {string} options.title - Blog post title
 * @param {string} options.subtitle - Optional subtitle
 * @returns {Promise<Buffer>} PNG buffer
 */
export async function generateSlide1(options) {
    const { coverImageUrl, title, subtitle } = options;
    
    setupFontconfig();
    
    // Download cover image
    let imageBuffer;
    if (coverImageUrl) {
        try {
            const response = await axios.get(coverImageUrl, {
                responseType: 'arraybuffer',
                timeout: 30000
            });
            imageBuffer = Buffer.from(response.data);
        } catch (error) {
            console.error('Error downloading cover image:', error.message);
            // Create placeholder
            imageBuffer = await sharp({
                create: {
                    width: CANVAS_WIDTH,
                    height: CANVAS_HEIGHT,
                    channels: 4,
                    background: { r: 25, g: 20, b: 20, alpha: 1 }
                }
            }).png().toBuffer();
        }
    } else {
        // Create dark background placeholder
        imageBuffer = await sharp({
            create: {
                width: CANVAS_WIDTH,
                height: CANVAS_HEIGHT,
                channels: 4,
                background: { r: 25, g: 20, b: 20, alpha: 1 }
            }
        }).png().toBuffer();
    }
    
    // Process image: auto-orient based on EXIF, then resize to 1080x1080
    let image = sharp(imageBuffer)
        .rotate() // Auto-rotate based on EXIF orientation
        .resize(CANVAS_WIDTH, CANVAS_HEIGHT, {
            fit: 'cover',
            position: 'center'
        })
        .ensureAlpha();
    
    const margin = 28;
    const radius = 40;
    const borderWidth = 18;
    
    // Calculate text layout
    const titleUpper = (title || 'BLOG POST').toUpperCase();
    let titleFontSize = 120;
    const availableWidth = CANVAS_WIDTH - (margin * 2) - 60;
    
    // Find optimal font size
    while (titleFontSize > 60) {
        const estimatedWidth = titleUpper.length * (titleFontSize * 0.55);
        if (estimatedWidth <= availableWidth) break;
        titleFontSize -= 10;
    }
    
    // Wrap if still too long
    let titleLines = [titleUpper];
    if (titleFontSize <= 60) {
        titleFontSize = 80;
        titleLines = wrapText(titleUpper, titleFontSize, availableWidth);
    }
    
    // Build SVG overlay
    let svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" viewBox="0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}">`;
    
    // Dark overlay
    svgContent += `<rect width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" fill="rgba(0, 0, 0, 0.55)"/>`;
    
    // Border
    svgContent += `<rect x="${margin}" y="${margin}" width="${CANVAS_WIDTH - margin * 2}" height="${CANVAS_HEIGHT - margin * 2}" rx="${radius}" ry="${radius}" fill="none" stroke="${PURE_WHITE}" stroke-width="${borderWidth}"/>`;
    
    // Title (centered)
    const titleLineHeight = titleFontSize * 1.2;
    const totalTitleHeight = titleLines.length * titleLineHeight;
    const titleStartY = (CANVAS_HEIGHT - totalTitleHeight) / 2;
    
    titleLines.forEach((line, index) => {
        const y = titleStartY + (index * titleLineHeight);
        svgContent += createTextSVG(line, CANVAS_WIDTH / 2, y, titleFontSize, OFF_WHITE, 'rgba(0, 0, 0, 0.6)', 3, 'middle');
    });
    
    // Subtitle if provided
    if (subtitle) {
        const subtitleY = titleStartY + totalTitleHeight + 30;
        svgContent += createTextSVG(subtitle.toUpperCase(), CANVAS_WIDTH / 2, subtitleY, 36, TEXT_GRAY, 'rgba(0, 0, 0, 0.5)', 2, 'middle');
    }
    
    // Bottom-left branding (stacked "NEW" and "POST")
    const stackWords = [
        { text: 'NEW', color: BRAND_RED, fontSize: 55 },
        { text: 'POST', color: TEXT_GRAY, fontSize: 42 }
    ];
    
    const stackSpacing = 14;
    let stackY = CANVAS_HEIGHT - margin - 100;
    stackWords.forEach(({ text, color, fontSize }) => {
        svgContent += createTextSVG(text, margin + 50, stackY, fontSize, color, 'rgba(0, 0, 0, 0.5)', 2, 'start');
        stackY += fontSize + stackSpacing;
    });
    
    svgContent += '</svg>';
    
    // Composite overlay onto image
    const svgBuffer = Buffer.from(svgContent, 'utf-8');
    
    const result = await image
        .composite([{ input: svgBuffer, blend: 'over' }])
        .png()
        .toBuffer();
    
    // Add logo
    return addLogoOverlay(result);
}

/**
 * Generate Slide 2: AI Summary slide
 * @param {object} options
 * @param {string} options.summaryText - AI-generated summary
 * @param {string} options.title - Blog post title for header
 * @returns {Promise<Buffer>} PNG buffer
 */
export async function generateSlide2(options) {
    const { summaryText, title } = options;
    
    setupFontconfig();
    
    const margin = 60;
    const headerHeight = 120;
    
    // Calculate summary layout
    const summaryFontSize = 38;
    const summaryLineHeight = summaryFontSize * 1.5;
    const availableWidth = CANVAS_WIDTH - (margin * 2);
    const summaryLines = wrapText(summaryText || 'Read the full post...', summaryFontSize, availableWidth);
    
    // Limit to reasonable number of lines
    const maxLines = 12;
    const displayLines = summaryLines.slice(0, maxLines);
    if (summaryLines.length > maxLines) {
        displayLines[maxLines - 1] = displayLines[maxLines - 1].replace(/\s+\S*$/, '...');
    }
    
    // Build SVG
    let svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" viewBox="0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}">
<defs>
    <style type="text/css">
        <![CDATA[
            .header { font-family: 'Liberation Sans', sans-serif; font-weight: bold; font-size: 42px; fill: ${PURE_WHITE}; }
            .summary { font-family: 'Liberation Sans', sans-serif; font-size: ${summaryFontSize}px; fill: ${OFF_WHITE}; }
            .footer { font-family: 'Liberation Sans', sans-serif; font-size: 28px; fill: ${TEXT_GRAY}; }
        ]]>
    </style>
</defs>`;
    
    // Background
    svgContent += `<rect width="100%" height="100%" fill="${BACKGROUND_DARK}"/>`;
    
    // Header bar
    svgContent += `<rect width="100%" height="${headerHeight}" fill="${BRAND_RED}"/>`;
    
    // Header text
    const headerText = title ? title.toUpperCase().substring(0, 40) : 'SUMMARY';
    svgContent += `<text class="header" x="50%" y="${headerHeight / 2 + 15}" text-anchor="middle">${escapeForSvg(headerText)}</text>`;
    
    // Summary text
    const summaryStartY = headerHeight + 80;
    displayLines.forEach((line, index) => {
        const y = summaryStartY + (index * summaryLineHeight);
        svgContent += `<text class="summary" x="${margin}" y="${y}">${escapeForSvg(line)}</text>`;
    });
    
    // Footer
    svgContent += `<text class="footer" x="50%" y="${CANVAS_HEIGHT - 45}" text-anchor="middle">Swipe for more | insuavewetrust.com</text>`;
    
    svgContent += '</svg>';
    
    // Render SVG to PNG
    const svgBuffer = Buffer.from(svgContent, 'utf-8');
    const result = await sharp(svgBuffer, { density: 72 })
        .png()
        .toBuffer();
    
    return addLogoOverlay(result);
}

/**
 * Add logo overlay to bottom-right corner
 */
async function addLogoOverlay(buffer) {
    if (!logoBuffer) {
        return buffer;
    }
    
    try {
        const targetHeight = 70;
        const resizedLogo = await sharp(logoBuffer)
            .resize({ height: targetHeight })
            .png()
            .toBuffer();
        
        const metadata = await sharp(resizedLogo).metadata();
        const logoWidth = metadata.width || 70;
        const logoHeight = metadata.height || targetHeight;
        
        const margin = 40;
        const logoLeft = CANVAS_WIDTH - logoWidth - margin;
        const logoTop = CANVAS_HEIGHT - logoHeight - margin;
        
        return await sharp(buffer)
            .composite([
                { 
                    input: resizedLogo, 
                    left: Math.round(logoLeft), 
                    top: Math.round(logoTop) 
                }
            ])
            .png()
            .toBuffer();
    } catch (error) {
        console.warn('Failed to add logo:', error.message);
        return buffer;
    }
}

/**
 * Upload a slide to Supabase Storage
 * @param {Buffer} buffer - PNG buffer
 * @param {string} postId - Blog post ID
 * @param {number} slideNumber - Slide number (1, 2, etc.)
 * @returns {Promise<string>} Public URL
 */
export async function uploadSlide(buffer, postId, slideNumber) {
    const supabase = getSupabase();
    const filename = `blog/${postId}/slide-${slideNumber}.png`;
    
    const { error: uploadError } = await supabase.storage
        .from('instagram-images')
        .upload(filename, buffer, {
            contentType: 'image/png',
            cacheControl: '0',
            upsert: true
        });
    
    if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error(`Failed to upload slide ${slideNumber}: ${uploadError.message}`);
    }
    
    const { data } = supabase.storage
        .from('instagram-images')
        .getPublicUrl(filename);
    
    if (!data?.publicUrl) {
        throw new Error('Failed to get public URL for slide');
    }
    
    // Add cache buster
    return `${data.publicUrl}?v=${Date.now()}`;
}

/**
 * Generate complete carousel slides for a blog post
 * @param {object} options
 * @param {string} options.postId - Blog post ID
 * @param {string} options.title - Blog post title
 * @param {string} options.coverImageUrl - Cover image URL (optional)
 * @param {string} options.aiSummary - AI-generated summary for Slide 2
 * @param {boolean} options.upload - Whether to upload to Supabase (default: true)
 * @returns {Promise<{slide1Url: string, slide2Url: string, buffers?: {slide1: Buffer, slide2: Buffer}}>}
 */
export async function generateCarouselSlides(options) {
    const { postId, title, coverImageUrl, aiSummary, upload = true } = options;
    
    console.log('🎨 Generating carousel slides for:', title);
    
    // Generate Slide 1
    const slide1Buffer = await generateSlide1({
        coverImageUrl,
        title,
        subtitle: 'New Blog Post'
    });
    
    // Generate Slide 2
    const slide2Buffer = await generateSlide2({
        summaryText: aiSummary,
        title
    });
    
    if (!upload) {
        return {
            buffers: {
                slide1: slide1Buffer,
                slide2: slide2Buffer
            }
        };
    }
    
    // Upload slides
    const slide1Url = await uploadSlide(slide1Buffer, postId, 1);
    const slide2Url = await uploadSlide(slide2Buffer, postId, 2);
    
    console.log('✅ Slides generated and uploaded');
    
    return {
        slide1Url,
        slide2Url,
        buffers: {
            slide1: slide1Buffer,
            slide2: slide2Buffer
        }
    };
}

/**
 * Generate a preview of the carousel (returns base64 images)
 * @param {object} options - Same as generateCarouselSlides
 * @returns {Promise<{slide1Base64: string, slide2Base64: string}>}
 */
export async function generateCarouselPreview(options) {
    const { buffers } = await generateCarouselSlides({ ...options, upload: false });
    
    return {
        slide1Base64: `data:image/png;base64,${buffers.slide1.toString('base64')}`,
        slide2Base64: `data:image/png;base64,${buffers.slide2.toString('base64')}`
    };
}

