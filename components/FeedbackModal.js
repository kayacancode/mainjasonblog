/**
 * FeedbackModal Component
 * Modal for collecting detailed feedback on AI-generated variants
 */

import React, { useState, useEffect } from 'react';

export default function FeedbackModal({
    variant,
    postId,
    isOpen,
    onClose,
    onSubmit
}) {
    const [toneMatch, setToneMatch] = useState(5);
    const [lengthAppropriate, setLengthAppropriate] = useState(5);
    const [emojiUsage, setEmojiUsage] = useState(5);
    const [authenticity, setAuthenticity] = useState(5);
    const [whatLiked, setWhatLiked] = useState('');
    const [whatImprove, setWhatImprove] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);

    // Reset form when variant changes
    useEffect(() => {
        if (variant) {
            setToneMatch(5);
            setLengthAppropriate(5);
            setEmojiUsage(5);
            setAuthenticity(5);
            setWhatLiked('');
            setWhatImprove('');
            setError(null);
        }
    }, [variant]);

    if (!isOpen || !variant) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        try {
            // Calculate overall style rating (average of aspects)
            const styleRating = Math.round((toneMatch + lengthAppropriate + emojiUsage + authenticity) / 4);

            const feedbackData = {
                postId: postId || null,
                variantId: variant.id,
                aiGeneratedText: variant.text,
                styleRating,
                aspectRatings: {
                    toneMatch,
                    lengthAppropriate,
                    emojiUsage,
                    authenticity
                },
                whatLiked: whatLiked.trim() || null,
                whatImprove: whatImprove.trim() || null,
                usedParams: variant.params || {}
            };

            const response = await fetch('/api/ai/feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(feedbackData)
            });

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Failed to submit feedback');
            }

            // Success!
            if (onSubmit) {
                onSubmit(feedbackData);
            }

            onClose();
        } catch (err) {
            console.error('Feedback submission error:', err);
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="bg-[#1a1a1a] rounded-2xl border border-gray-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
                {/* Header */}
                <div className="sticky top-0 bg-[#1a1a1a] border-b border-gray-700 p-6 flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-white">Detailed Feedback</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors p-2"
                        disabled={isSubmitting}
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Variant Preview */}
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                            Selected Variant:
                        </label>
                        <div className="bg-black/40 rounded-lg p-4 border border-gray-700">
                            <p className="text-gray-200 text-sm leading-relaxed whitespace-pre-wrap">
                                {variant.text}
                            </p>
                        </div>
                    </div>

                    {/* Aspect Ratings */}
                    <div>
                        <h3 className="text-lg font-semibold text-white mb-4">Rate Each Aspect:</h3>
                        <div className="space-y-4">
                            <RatingInput
                                label="Tone Match"
                                description="How well does the tone match the desired style?"
                                value={toneMatch}
                                onChange={setToneMatch}
                            />
                            <RatingInput
                                label="Length Appropriateness"
                                description="Is the length right for an Instagram post?"
                                value={lengthAppropriate}
                                onChange={setLengthAppropriate}
                            />
                            <RatingInput
                                label="Emoji Usage"
                                description="Are emojis used effectively?"
                                value={emojiUsage}
                                onChange={setEmojiUsage}
                            />
                            <RatingInput
                                label="Authenticity"
                                description="Does it sound authentic to your voice?"
                                value={authenticity}
                                onChange={setAuthenticity}
                            />
                        </div>
                    </div>

                    {/* Qualitative Feedback */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            What did you like?
                        </label>
                        <textarea
                            value={whatLiked}
                            onChange={(e) => setWhatLiked(e.target.value)}
                            className="w-full bg-[#2a2a2a] border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                            rows={3}
                            placeholder="e.g., Great flow, perfect tone, natural language..."
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            What should improve?
                        </label>
                        <textarea
                            value={whatImprove}
                            onChange={(e) => setWhatImprove(e.target.value)}
                            className="w-full bg-[#2a2a2a] border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                            rows={3}
                            placeholder="e.g., Too many emojis, too formal, needs more energy..."
                        />
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                            <p className="text-red-400 text-sm">{error}</p>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                            disabled={isSubmitting}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Submitting...
                                </span>
                            ) : (
                                'Submit Feedback'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

/**
 * Rating Input Component (1-10 stars)
 */
function RatingInput({ label, description, value, onChange }) {
    const stars = Array.from({ length: 10 }, (_, i) => i + 1);

    return (
        <div>
            <div className="flex items-center justify-between mb-2">
                <div>
                    <label className="block text-sm font-medium text-gray-300">
                        {label}
                    </label>
                    {description && (
                        <p className="text-xs text-gray-500 mt-1">{description}</p>
                    )}
                </div>
                <span className="text-lg font-bold text-white">
                    {value}/10
                </span>
            </div>
            <div className="flex items-center gap-1">
                {stars.map((star) => (
                    <button
                        key={star}
                        type="button"
                        onClick={() => onChange(star)}
                        className="transition-all hover:scale-110"
                    >
                        <svg
                            className={`w-6 h-6 ${
                                star <= value
                                    ? 'text-yellow-500 fill-current'
                                    : 'text-gray-600'
                            }`}
                            fill={star <= value ? 'currentColor' : 'none'}
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                            />
                        </svg>
                    </button>
                ))}
            </div>
        </div>
    );
}
