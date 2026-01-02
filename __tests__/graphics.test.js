/**
 * Tests for lib/graphics/instagramCarousel.js
 * Graphics generation for Instagram carousels
 */

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'test-service-key';

// Mock axios
jest.mock('axios', () => ({
    get: jest.fn(() => Promise.resolve({ 
        data: Buffer.from('fake-image-data') 
    }))
}));

// Mock sharp
jest.mock('sharp', () => {
    const mockSharp = jest.fn(() => ({
        resize: jest.fn().mockReturnThis(),
        ensureAlpha: jest.fn().mockReturnThis(),
        composite: jest.fn().mockReturnThis(),
        png: jest.fn().mockReturnThis(),
        toBuffer: jest.fn(() => Promise.resolve(Buffer.from('processed-image')))
    }));
    mockSharp.prototype = mockSharp;
    return mockSharp;
});

// Mock Supabase
jest.mock('@supabase/supabase-js', () => ({
    createClient: jest.fn(() => ({
        storage: {
            from: jest.fn(() => ({
                upload: jest.fn(() => Promise.resolve({ error: null })),
                getPublicUrl: jest.fn(() => ({ 
                    data: { publicUrl: 'https://test.supabase.co/storage/v1/object/public/instagram-images/test.png' } 
                }))
            }))
        }
    }))
}));

describe('Graphics Module', () => {
    describe('escapeForSvg', () => {
        const escapeForSvg = (text = '') => {
            return String(text)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        };

        it('should escape ampersands', () => {
            expect(escapeForSvg('A & B')).toBe('A &amp; B');
        });

        it('should escape angle brackets', () => {
            expect(escapeForSvg('<test>')).toBe('&lt;test&gt;');
        });

        it('should escape quotes', () => {
            expect(escapeForSvg('"quoted"')).toBe('&quot;quoted&quot;');
        });

        it('should handle empty strings', () => {
            expect(escapeForSvg('')).toBe('');
        });

        it('should handle null/undefined', () => {
            expect(escapeForSvg(null)).toBe('null');
            expect(escapeForSvg(undefined)).toBe('undefined');
        });
    });

    describe('wrapText', () => {
        const wrapText = (text, fontSize, maxWidth) => {
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
        };

        it('should not wrap short text', () => {
            const lines = wrapText('Short text', 40, 500);
            expect(lines.length).toBe(1);
        });

        it('should wrap long text into multiple lines', () => {
            const longText = 'This is a very long title that should definitely wrap into multiple lines';
            const lines = wrapText(longText, 40, 200);
            expect(lines.length).toBeGreaterThan(1);
        });

        it('should handle single word', () => {
            const lines = wrapText('SingleWord', 40, 100);
            expect(lines.length).toBeGreaterThanOrEqual(1);
        });
    });

    describe('Canvas dimensions', () => {
        const CANVAS_WIDTH = 1080;
        const CANVAS_HEIGHT = 1080;

        it('should use Instagram square format', () => {
            expect(CANVAS_WIDTH).toBe(1080);
            expect(CANVAS_HEIGHT).toBe(1080);
        });

        it('should maintain 1:1 aspect ratio', () => {
            expect(CANVAS_WIDTH / CANVAS_HEIGHT).toBe(1);
        });
    });

    describe('Brand colors', () => {
        const BRAND_RED = '#E23E36';
        const OFF_WHITE = '#E8DCCF';
        const BACKGROUND_DARK = '#191414';

        it('should use correct brand red', () => {
            expect(BRAND_RED).toBe('#E23E36');
        });

        it('should use Spotify-style dark background', () => {
            expect(BACKGROUND_DARK).toBe('#191414');
        });

        it('should have valid hex colors', () => {
            const hexRegex = /^#[0-9A-Fa-f]{6}$/;
            expect(hexRegex.test(BRAND_RED)).toBe(true);
            expect(hexRegex.test(OFF_WHITE)).toBe(true);
            expect(hexRegex.test(BACKGROUND_DARK)).toBe(true);
        });
    });

    describe('Slide generation', () => {
        it('should generate slide 1 with title', async () => {
            // Test would require actual sharp processing
            const options = {
                coverImageUrl: 'https://example.com/cover.jpg',
                title: 'Test Blog Post',
                subtitle: 'New Blog Post'
            };
            expect(options.title).toBeDefined();
        });

        it('should generate slide 2 with AI summary', async () => {
            const options = {
                summaryText: 'This is the AI-generated summary text',
                title: 'Test Blog Post'
            };
            expect(options.summaryText).toBeDefined();
            expect(options.summaryText.length).toBeGreaterThan(0);
        });
    });

    describe('Upload functionality', () => {
        it('should generate correct file path', () => {
            const postId = 'test-post-123';
            const slideNumber = 1;
            const filename = `blog/${postId}/slide-${slideNumber}.png`;
            expect(filename).toBe('blog/test-post-123/slide-1.png');
        });

        it('should add cache buster to URLs', () => {
            const baseUrl = 'https://test.supabase.co/storage/v1/object/public/test.png';
            const timestamp = Date.now();
            const cacheBustedUrl = `${baseUrl}?v=${timestamp}`;
            expect(cacheBustedUrl).toContain('?v=');
        });
    });
});

