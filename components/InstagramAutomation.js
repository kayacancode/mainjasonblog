/**
 * Instagram Automation Controls Component
 * Full control panel for Instagram automation on blog posts
 */

import React, { useState, useEffect, useCallback } from 'react';
import InstagramStatusBadge from './InstagramStatusBadge';
import CarouselPreview from './CarouselPreview';

export default function InstagramAutomation({
    postId,
    initialEnabled = false,
    initialStatus = 'none',
    initialAiSummary = '',
    initialCoverUrl = '',
    instagramPostId = null,
    instagramError = null,
    publishedAt = null,
    onEnabledChange,
    onCoverChange,
    onSummaryChange,
    onPublish,
    onRetry,
    compact = false
}) {
    const [enabled, setEnabled] = useState(initialEnabled);
    const [aiSummary, setAiSummary] = useState(initialAiSummary);
    const [coverUrl, setCoverUrl] = useState(initialCoverUrl);
    const [styleRating, setStyleRating] = useState(7);
    const [feedbackNotes, setFeedbackNotes] = useState('');
    
    const [isGenerating, setIsGenerating] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [previewData, setPreviewData] = useState(null);
    const [error, setError] = useState(null);
    
    // Update parent when enabled changes
    const handleEnabledChange = useCallback((newValue) => {
        setEnabled(newValue);
        onEnabledChange?.(newValue);
    }, [onEnabledChange]);
    
    // Generate AI summary
    const handleGenerateSummary = async (regenerate = false) => {
        if (!postId) return;
        
        setIsGenerating(true);
        setError(null);
        
        try {
            const response = await fetch('/api/ai/generate-style-caption', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    postId,
                    regenerate
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                setAiSummary(data.summary);
                onSummaryChange?.(data.summary);
            } else {
                setError(data.error || 'Failed to generate summary');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setIsGenerating(false);
        }
    };
    
    // Generate preview
    const handlePreview = async () => {
        if (!postId) return;
        
        setIsGenerating(true);
        setError(null);
        
        try {
            const response = await fetch('/api/blog-instagram', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    postId,
                    mode: 'preview',
                    customCoverUrl: coverUrl || undefined,
                    aiSummaryOverride: aiSummary || undefined
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                setPreviewData({
                    slides: data.slides,
                    caption: data.caption,
                    aiSummary: data.aiSummary
                });
                setShowPreview(true);
                
                // Update summary if it was generated
                if (data.aiSummary && !aiSummary) {
                    setAiSummary(data.aiSummary);
                    onSummaryChange?.(data.aiSummary);
                }
            } else {
                setError(data.error || 'Failed to generate preview');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setIsGenerating(false);
        }
    };
    
    // Publish to Instagram
    const handlePublish = async () => {
        if (!postId || isPublishing) return;
        
        const confirmed = window.confirm('Publish this post to Instagram?');
        if (!confirmed) return;
        
        setIsPublishing(true);
        setError(null);
        
        try {
            const response = await fetch('/api/blog-instagram', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    postId,
                    mode: 'publish',
                    customCoverUrl: coverUrl || undefined,
                    aiSummaryOverride: aiSummary || undefined
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                onPublish?.(data);
                alert('Successfully published to Instagram!');
            } else {
                setError(data.error || 'Failed to publish');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setIsPublishing(false);
        }
    };
    
    // Retry failed publish
    const handleRetry = async () => {
        if (!postId || isPublishing) return;
        
        setIsPublishing(true);
        setError(null);
        
        try {
            const response = await fetch('/api/blog-instagram', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    postId,
                    mode: 'retry'
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                onRetry?.(data);
                alert('Successfully published to Instagram!');
            } else {
                setError(data.error || 'Retry failed');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setIsPublishing(false);
        }
    };
    
    // Submit feedback
    const handleSubmitFeedback = async () => {
        if (!postId || !aiSummary) return;
        
        try {
            await fetch('/api/ai/feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    postId,
                    aiGeneratedText: initialAiSummary,
                    humanEditedText: aiSummary,
                    styleRating,
                    feedbackNotes
                })
            });
        } catch (err) {
            console.error('Feedback submission failed:', err);
        }
    };
    
    // Compact view for dashboard
    if (compact) {
        return (
            <div className="flex items-center gap-2">
                <InstagramStatusBadge 
                    status={initialStatus} 
                    error={instagramError}
                    size="sm"
                />
                {initialStatus === 'failed' && (
                    <button
                        onClick={handleRetry}
                        disabled={isPublishing}
                        className="text-xs text-blue-600 hover:underline disabled:opacity-50"
                    >
                        Retry
                    </button>
                )}
            </div>
        );
    }
    
    return (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073z"/>
                        </svg>
                        <h3 className="text-white font-semibold">Instagram Automation</h3>
                    </div>
                    <InstagramStatusBadge 
                        status={initialStatus} 
                        error={instagramError}
                        publishedAt={publishedAt}
                        instagramPostId={instagramPostId}
                        showDetails={false}
                    />
                </div>
            </div>
            
            <div className="p-4 space-y-4">
                {/* Enable toggle */}
                <div className="flex items-center justify-between">
                    <div>
                        <p className="font-medium text-gray-900">Auto-publish to Instagram</p>
                        <p className="text-sm text-gray-500">Generate carousel when post is published</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={enabled}
                            onChange={(e) => handleEnabledChange(e.target.checked)}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                </div>
                
                {/* Custom cover image */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Custom Cover Image (optional)
                    </label>
                    <input
                        type="url"
                        value={coverUrl}
                        onChange={(e) => {
                            setCoverUrl(e.target.value);
                            onCoverChange?.(e.target.value);
                        }}
                        placeholder="https://example.com/image.jpg"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                </div>
                
                {/* AI Summary editor */}
                <div>
                    <div className="flex items-center justify-between mb-1">
                        <label className="block text-sm font-medium text-gray-700">
                            AI Summary (Slide 2)
                        </label>
                        <button
                            onClick={() => handleGenerateSummary(!aiSummary)}
                            disabled={isGenerating || !postId}
                            className="text-xs text-purple-600 hover:text-purple-800 disabled:opacity-50"
                        >
                            {isGenerating ? 'Generating...' : aiSummary ? 'Regenerate' : 'Generate'}
                        </button>
                    </div>
                    <textarea
                        value={aiSummary}
                        onChange={(e) => {
                            setAiSummary(e.target.value);
                            onSummaryChange?.(e.target.value);
                        }}
                        rows={4}
                        placeholder="AI-generated summary will appear here..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        {aiSummary.length}/400 characters
                    </p>
                </div>
                
                {/* Style rating (only show if summary was generated) */}
                {aiSummary && initialAiSummary && (
                    <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-sm font-medium text-gray-700 mb-2">Rate AI Quality</p>
                        <div className="flex items-center gap-2">
                            <input
                                type="range"
                                min="1"
                                max="10"
                                value={styleRating}
                                onChange={(e) => setStyleRating(parseInt(e.target.value))}
                                className="flex-1"
                            />
                            <span className="text-sm font-medium text-gray-900 w-8">{styleRating}/10</span>
                        </div>
                        <input
                            type="text"
                            value={feedbackNotes}
                            onChange={(e) => setFeedbackNotes(e.target.value)}
                            placeholder="Optional feedback notes..."
                            className="mt-2 w-full px-2 py-1 text-xs border border-gray-200 rounded"
                        />
                        <button
                            onClick={handleSubmitFeedback}
                            className="mt-2 text-xs text-purple-600 hover:text-purple-800"
                        >
                            Submit Feedback
                        </button>
                    </div>
                )}
                
                {/* Error display */}
                {(error || instagramError) && (
                    <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg">
                        {error || instagramError}
                    </div>
                )}
                
                {/* Action buttons */}
                <div className="flex gap-2 pt-2">
                    <button
                        onClick={handlePreview}
                        disabled={isGenerating || isPublishing || !postId}
                        className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 disabled:opacity-50 transition-colors text-sm"
                    >
                        {isGenerating ? 'Generating...' : 'Preview Carousel'}
                    </button>
                    
                    {initialStatus === 'failed' ? (
                        <button
                            onClick={handleRetry}
                            disabled={isPublishing}
                            className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 disabled:opacity-50 transition-colors text-sm"
                        >
                            {isPublishing ? 'Publishing...' : 'Retry Publish'}
                        </button>
                    ) : initialStatus !== 'published' && (
                        <button
                            onClick={handlePublish}
                            disabled={isPublishing || initialStatus === 'publishing'}
                            className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 transition-colors text-sm"
                        >
                            {isPublishing ? 'Publishing...' : 'Publish Now'}
                        </button>
                    )}
                </div>
                
                {/* Published link */}
                {initialStatus === 'published' && instagramPostId && (
                    <div className="text-center">
                        <a
                            href={`https://www.instagram.com/p/${instagramPostId}/`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-purple-600 hover:underline"
                        >
                            View on Instagram
                        </a>
                    </div>
                )}
            </div>
            
            {/* Preview modal */}
            {showPreview && previewData && (
                <CarouselPreview
                    slides={previewData.slides}
                    caption={previewData.caption}
                    aiSummary={previewData.aiSummary}
                    onClose={() => setShowPreview(false)}
                />
            )}
        </div>
    );
}

