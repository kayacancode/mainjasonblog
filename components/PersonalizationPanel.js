/**
 * PersonalizationPanel Component
 * Main sidebar panel for AI personalization with style controls and variant comparison
 */

import React, { useState } from 'react';
import VariantCard from './VariantCard';
import FeedbackModal from './FeedbackModal';

export default function PersonalizationPanel({
    postId,
    title,
    content,
    onVariantSelected
}) {
    // Style parameters
    const [styleParams, setStyleParams] = useState({
        tone: 6,
        emojiIntensity: 3,
        length: 7,
        energy: 4
    });

    // Variants state
    const [variants, setVariants] = useState([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [selectedVariantId, setSelectedVariantId] = useState(null);
    const [sessionId, setSessionId] = useState(null);
    const [error, setError] = useState(null);

    // Feedback modal state
    const [feedbackVariant, setFeedbackVariant] = useState(null);
    const [showFeedbackModal, setShowFeedbackModal] = useState(false);

    /**
     * Generate 3 variants with different parameter combinations
     */
    const handleGenerateVariants = async () => {
        if (!title || !content) {
            setError('Please enter a title and content first');
            return;
        }

        setIsGenerating(true);
        setError(null);

        try {
            const response = await fetch('/api/ai/generate-variants', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    postId,
                    title,
                    content,
                    userParams: styleParams
                })
            });

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Failed to generate variants');
            }

            setVariants(data.variants || []);
            setSessionId(data.sessionId);
            setSelectedVariantId(null); // Reset selection

        } catch (err) {
            console.error('Variant generation error:', err);
            setError(err.message);
        } finally {
            setIsGenerating(false);
        }
    };

    /**
     * Handle parameter slider change
     */
    const handleParamChange = (param, value) => {
        setStyleParams(prev => ({
            ...prev,
            [param]: parseInt(value)
        }));
    };

    /**
     * Handle variant selection
     */
    const handleSelectVariant = (variant) => {
        setSelectedVariantId(variant.id);
        if (onVariantSelected) {
            onVariantSelected(variant);
        }
    };

    /**
     * Handle quick feedback (thumbs up/down)
     */
    const handleQuickFeedback = async (variantId, isPositive) => {
        const variant = variants.find(v => v.id === variantId);
        if (!variant) return;

        try {
            const feedbackData = {
                postId: postId || null,
                variantId,
                aiGeneratedText: variant.text,
                styleRating: isPositive ? 8 : 4, // Quick rating: 8 for thumbs up, 4 for thumbs down
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

            // If thumbs up, auto-select the variant
            if (isPositive) {
                handleSelectVariant(variant);
            }

        } catch (err) {
            console.error('Quick feedback error:', err);
            setError(err.message);
        }
    };

    /**
     * Open detailed feedback modal
     */
    const handleOpenDetailedFeedback = (variant) => {
        setFeedbackVariant(variant);
        setShowFeedbackModal(true);
    };

    /**
     * Handle feedback modal submission
     */
    const handleFeedbackSubmit = (feedbackData) => {
        console.log('Feedback submitted:', feedbackData);
        // Optionally refresh variants or show success message
    };

    return (
        <div className="h-full flex flex-col bg-[#1a1a1a] rounded-xl border border-gray-700 overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-gray-700">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">AI Personalization Lab</h2>
                        <p className="text-sm text-gray-400">Customize style and compare variants</p>
                    </div>
                </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Style Parameters */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white">Style Parameters:</h3>

                    <StyleSlider
                        label="Tone"
                        value={styleParams.tone}
                        onChange={(val) => handleParamChange('tone', val)}
                        leftLabel="Casual"
                        rightLabel="Formal"
                        description="How formal or casual should the writing be?"
                    />

                    <StyleSlider
                        label="Emoji Intensity"
                        value={styleParams.emojiIntensity}
                        onChange={(val) => handleParamChange('emojiIntensity', val)}
                        leftLabel="Minimal"
                        rightLabel="Heavy"
                        description="How many emojis to use?"
                    />

                    <StyleSlider
                        label="Length"
                        value={styleParams.length}
                        onChange={(val) => handleParamChange('length', val)}
                        leftLabel="Short"
                        rightLabel="Long"
                        description="Average sentence length"
                    />

                    <StyleSlider
                        label="Energy"
                        value={styleParams.energy}
                        onChange={(val) => handleParamChange('energy', val)}
                        leftLabel="Chill"
                        rightLabel="Hype"
                        description="Energy level and enthusiasm"
                    />
                </div>

                {/* Generate Button */}
                <button
                    type="button"
                    onClick={handleGenerateVariants}
                    disabled={isGenerating || !title || !content}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-4 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                >
                    {isGenerating ? (
                        <span className="flex items-center justify-center gap-2">
                            <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Generating 3 Variants...
                        </span>
                    ) : (
                        <span className="flex items-center justify-center gap-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            Generate 3 Variants
                        </span>
                    )}
                </button>

                {/* Error Message */}
                {error && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                            <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p className="text-red-400 text-sm">{error}</p>
                        </div>
                    </div>
                )}

                {/* Variants Grid */}
                {variants.length > 0 && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-white">
                                Compare Variants:
                            </h3>
                            {selectedVariantId && (
                                <span className="text-sm text-green-400 flex items-center gap-2">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Variant selected
                                </span>
                            )}
                        </div>

                        <div className="space-y-4">
                            {variants.map((variant, index) => (
                                <VariantCard
                                    key={variant.id}
                                    variant={variant}
                                    label={String.fromCharCode(65 + index)} // A, B, C
                                    isSelected={selectedVariantId === variant.id}
                                    onThumbsUp={(id) => handleQuickFeedback(id, true)}
                                    onThumbsDown={(id) => handleQuickFeedback(id, false)}
                                    onSelect={handleSelectVariant}
                                    onDetailedFeedback={handleOpenDetailedFeedback}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {variants.length === 0 && !isGenerating && (
                    <div className="text-center py-12">
                        <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                        </div>
                        <h4 className="text-lg font-medium text-gray-400 mb-2">No variants yet</h4>
                        <p className="text-sm text-gray-500">
                            Adjust the style parameters above and click "Generate 3 Variants" to get started
                        </p>
                    </div>
                )}
            </div>

            {/* Feedback Modal */}
            <FeedbackModal
                variant={feedbackVariant}
                postId={postId}
                isOpen={showFeedbackModal}
                onClose={() => {
                    setShowFeedbackModal(false);
                    setFeedbackVariant(null);
                }}
                onSubmit={handleFeedbackSubmit}
            />
        </div>
    );
}

/**
 * Style Slider Component
 */
function StyleSlider({ label, value, onChange, leftLabel, rightLabel, description }) {
    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-300">
                    {label}
                </label>
                <span className="text-sm font-bold text-white bg-gray-800 px-2 py-1 rounded">
                    {value}/10
                </span>
            </div>

            {description && (
                <p className="text-xs text-gray-500">{description}</p>
            )}

            <div className="space-y-2">
                <input
                    type="range"
                    min="1"
                    max="10"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                    style={{
                        background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(value - 1) * 11.11}%, #374151 ${(value - 1) * 11.11}%, #374151 100%)`
                    }}
                />
                <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{leftLabel}</span>
                    <span>{rightLabel}</span>
                </div>
            </div>
        </div>
    );
}
