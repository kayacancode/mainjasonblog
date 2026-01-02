/**
 * API endpoint to generate a preview of Instagram Slide 1 (cover with title)
 * Returns a base64 image for display in the admin UI
 */

import { generateSlide1 } from '../../lib/graphics/instagramCarousel';

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '10mb'
        },
        responseLimit: '10mb'
    }
};

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { coverImageUrl, title, subtitle } = req.body;

    if (!title) {
        return res.status(400).json({ error: 'Title is required' });
    }

    try {
        console.log('🎨 Generating slide preview for:', title);
        
        // Generate the slide
        const slideBuffer = await generateSlide1({
            coverImageUrl: coverImageUrl || null,
            title,
            subtitle: subtitle || 'Album Review'
        });

        // Convert to base64
        const base64 = slideBuffer.toString('base64');
        const dataUrl = `data:image/png;base64,${base64}`;

        console.log('✅ Preview generated successfully');

        return res.status(200).json({
            success: true,
            preview: dataUrl
        });
    } catch (error) {
        console.error('Error generating preview:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Failed to generate preview'
        });
    }
}

