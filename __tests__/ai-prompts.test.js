/**
 * Tests for lib/ai/prompts.js
 * AI prompt templates and utilities
 */

import { 
    JASON_STYLE_MARKERS,
    buildSystemPrompt,
    buildSummaryPrompt,
    buildCaptionPrompt,
    hashPrompt
} from '../lib/ai/prompts';

describe('AI Prompts Module', () => {
    describe('JASON_STYLE_MARKERS', () => {
        it('should have required style properties', () => {
            expect(JASON_STYLE_MARKERS).toHaveProperty('tone');
            expect(JASON_STYLE_MARKERS).toHaveProperty('vocabulary');
            expect(JASON_STYLE_MARKERS).toHaveProperty('sentenceStyle');
            expect(JASON_STYLE_MARKERS).toHaveProperty('punctuation');
            expect(JASON_STYLE_MARKERS).toHaveProperty('emojiUsage');
            expect(JASON_STYLE_MARKERS).toHaveProperty('personalityTraits');
        });

        it('should have personality traits array', () => {
            expect(Array.isArray(JASON_STYLE_MARKERS.personalityTraits)).toBe(true);
            expect(JASON_STYLE_MARKERS.personalityTraits.length).toBeGreaterThan(0);
        });
    });

    describe('buildSystemPrompt', () => {
        it('should return a non-empty string', () => {
            const prompt = buildSystemPrompt();
            expect(typeof prompt).toBe('string');
            expect(prompt.length).toBeGreaterThan(0);
        });

        it('should include ISWT reference', () => {
            const prompt = buildSystemPrompt();
            expect(prompt.toLowerCase()).toContain('in suave we trust');
        });

        it('should include style guidelines', () => {
            const prompt = buildSystemPrompt();
            expect(prompt).toContain('TONE');
            expect(prompt).toContain('WRITING STYLE');
        });

        it('should accept custom style data', () => {
            const customStyle = { tone: 'Custom tone' };
            const prompt = buildSystemPrompt(customStyle);
            expect(prompt).toContain('Custom tone');
        });
    });

    describe('buildSummaryPrompt', () => {
        const mockOptions = {
            title: 'Test Blog Post',
            content: 'This is the blog post content for testing.',
            maxLength: 400
        };

        it('should include the title', () => {
            const prompt = buildSummaryPrompt(mockOptions);
            expect(prompt).toContain('Test Blog Post');
        });

        it('should include the content', () => {
            const prompt = buildSummaryPrompt(mockOptions);
            expect(prompt).toContain('blog post content');
        });

        it('should specify max length', () => {
            const prompt = buildSummaryPrompt(mockOptions);
            expect(prompt).toContain('400');
        });

        it('should include example captions when provided', () => {
            const optionsWithExamples = {
                ...mockOptions,
                exampleCaptions: ['Example caption 1', 'Example caption 2']
            };
            const prompt = buildSummaryPrompt(optionsWithExamples);
            expect(prompt).toContain('Example caption 1');
        });

        it('should handle missing example captions', () => {
            const prompt = buildSummaryPrompt(mockOptions);
            expect(prompt).not.toContain('Example');
        });
    });

    describe('buildCaptionPrompt', () => {
        const mockOptions = {
            title: 'Test Title',
            summary: 'Test summary text'
        };

        it('should include title and summary', () => {
            const prompt = buildCaptionPrompt(mockOptions);
            expect(prompt).toContain('Test Title');
            expect(prompt).toContain('Test summary');
        });

        it('should request call to action', () => {
            const prompt = buildCaptionPrompt(mockOptions);
            expect(prompt.toLowerCase()).toContain('call-to-action');
        });

        it('should mention hashtags', () => {
            const prompt = buildCaptionPrompt(mockOptions);
            expect(prompt.toLowerCase()).toContain('hashtag');
        });

        it('should include suggested hashtags when provided', () => {
            const optionsWithHashtags = {
                ...mockOptions,
                suggestedHashtags: ['#TestTag', '#BlogPost']
            };
            const prompt = buildCaptionPrompt(optionsWithHashtags);
            expect(prompt).toContain('#TestTag');
        });
    });

    describe('hashPrompt', () => {
        it('should return a string', () => {
            const hash = hashPrompt('test prompt');
            expect(typeof hash).toBe('string');
        });

        it('should return consistent hash for same input', () => {
            const hash1 = hashPrompt('same prompt');
            const hash2 = hashPrompt('same prompt');
            expect(hash1).toBe(hash2);
        });

        it('should return different hash for different input', () => {
            const hash1 = hashPrompt('prompt one');
            const hash2 = hashPrompt('prompt two');
            expect(hash1).not.toBe(hash2);
        });

        it('should handle empty string', () => {
            const hash = hashPrompt('');
            expect(hash).toBe('0');
        });
    });
});

describe('Prompt Content Guidelines', () => {
    it('should not include corporate language warnings', () => {
        const prompt = buildSystemPrompt();
        expect(prompt.toLowerCase()).toContain('authentic');
        expect(prompt.toLowerCase()).toContain('never sound corporate');
    });

    it('should discourage clickbait', () => {
        const prompt = buildSystemPrompt();
        expect(prompt.toLowerCase()).toContain('clickbait');
    });

    it('should specify Instagram constraints', () => {
        const prompt = buildSummaryPrompt({
            title: 'Test',
            content: 'Content',
            maxLength: 400
        });
        expect(prompt.toLowerCase()).toContain('instagram');
    });
});

describe('Text Truncation', () => {
    const truncateContent = (content, maxLength) => {
        if (!content || content.length <= maxLength) return content;
        const truncated = content.substring(0, maxLength);
        const lastSpace = truncated.lastIndexOf(' ');
        return lastSpace > maxLength * 0.8
            ? truncated.substring(0, lastSpace) + '...'
            : truncated + '...';
    };

    it('should not truncate short content', () => {
        const short = 'Short content';
        expect(truncateContent(short, 100)).toBe(short);
    });

    it('should truncate long content', () => {
        const long = 'A'.repeat(200);
        const truncated = truncateContent(long, 100);
        expect(truncated.length).toBeLessThanOrEqual(103); // 100 + '...'
    });

    it('should truncate at word boundary when possible', () => {
        const text = 'This is a long sentence that needs truncation';
        const truncated = truncateContent(text, 25);
        expect(truncated.endsWith('...')).toBe(true);
    });

    it('should handle empty content', () => {
        expect(truncateContent('', 100)).toBe('');
        expect(truncateContent(null, 100)).toBe(null);
    });
});

