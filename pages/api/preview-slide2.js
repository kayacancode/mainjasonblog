/**
 * API endpoint to generate a preview of Instagram Slide 2 (AI summary slide)
 * Returns a base64 image for display in the admin UI
 */

import { generateSlide2 } from '../../lib/graphics/instagramCarousel';

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

    const { title, summaryText } = req.body;

    if (!summaryText) {
        return res.status(400).json({ error: 'Summary text is required' });
    }

    try {
        console.log('🎨 Generating slide 2 preview for:', title || 'Untitled');
        
        // Generate the slide
        const slideBuffer = await generateSlide2({
            summaryText,
            title: title || 'Summary'
        });

        // Convert to base64
        const base64 = slideBuffer.toString('base64');
        const dataUrl = `data:image/png;base64,${base64}`;

        console.log('✅ Slide 2 preview generated successfully');

        return res.status(200).json({
            success: true,
            preview: dataUrl
        });
    } catch (error) {
        console.error('Error generating slide 2 preview:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Failed to generate slide 2 preview'
        });
    }
}

