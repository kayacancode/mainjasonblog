/**
 * Instagram Automation Controls Component
 * Full control panel for Instagram automation on blog posts
 */

import React, { useState, useEffect, useCallback } from 'react';
import InstagramStatusBadge from './InstagramStatusBadge';
import CarouselPreview from './CarouselPreview';

export default function InstagramAutomation({
    postId,
    title = '',
    content = '',
    coverImage = '',
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
    onReadyStateChange,
    compact = false
}) {
    const [enabled, setEnabled] = useState(initialEnabled);
    const [aiSummary, setAiSummary] = useState(initialAiSummary);
    const [coverUrl, setCoverUrl] = useState(initialCoverUrl);
    const [subtitle, setSubtitle] = useState('Album Review');
    const [styleRating, setStyleRating] = useState(7);
    const [feedbackNotes, setFeedbackNotes] = useState('');
    
    const [isGenerating, setIsGenerating] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [previewData, setPreviewData] = useState(null);
    const [error, setError] = useState(null);
    
    // Slide preview state
    const [slidePreview, setSlidePreview] = useState(null);
    const [slide2Preview, setSlide2Preview] = useState(null);
    const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
    const [isGeneratingSlide2Preview, setIsGeneratingSlide2Preview] = useState(false);
    const [selectedSlide, setSelectedSlide] = useState(1);
    
    // Report ready state to parent (all slides generated + summary exists)
    useEffect(() => {
        const isReady = !!(slidePreview && slide2Preview && aiSummary);
        onReadyStateChange?.(isReady);
    }, [slidePreview, slide2Preview, aiSummary, onReadyStateChange]);
    
    // Update parent when enabled changes
    const handleEnabledChange = useCallback((newValue) => {
        setEnabled(newValue);
        onEnabledChange?.(newValue);
    }, [onEnabledChange]);
    
    // Generate slide preview with title overlay
    const handleGenerateSlidePreview = async () => {
        if (!title) {
            setError('Please enter a title first');
            return;
        }
        
        setIsGeneratingPreview(true);
        setError(null);
        
        try {
            const response = await fetch('/api/preview-slide', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    coverImageUrl: coverUrl || coverImage,
                    title,
                    subtitle
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                setSlidePreview(data.preview);
            } else {
                setError(data.error || 'Failed to generate preview');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setIsGeneratingPreview(false);
        }
    };
    
    // Generate slide 2 preview with AI summary
    const handleGenerateSlide2Preview = async () => {
        if (!title) {
            setError('Please enter a title first');
            return;
        }
        
        setIsGeneratingSlide2Preview(true);
        setError(null);
        
        try {
            let summaryToUse = aiSummary;
            
            // If no summary exists, auto-generate it first
            if (!summaryToUse) {
                if (!content) {
                    setError('Please enter content first to generate summary');
                    setIsGeneratingSlide2Preview(false);
                    return;
                }
                
                const summaryResponse = await fetch('/api/ai/generate-style-caption', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        postId,
                        title,
                        content,
                        regenerate: false
                    })
                });
                
                const summaryData = await summaryResponse.json();
                
                if (summaryData.success) {
                    summaryToUse = summaryData.summary;
                    setAiSummary(summaryData.summary);
                    onSummaryChange?.(summaryData.summary);
                } else {
                    setError(summaryData.error || 'Failed to generate summary');
                    setIsGeneratingSlide2Preview(false);
                    return;
                }
            }
            
            // Now generate slide 2 preview
            const response = await fetch('/api/preview-slide2', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title,
                    summaryText: summaryToUse
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                setSlide2Preview(data.preview);
                setSelectedSlide(2);
            } else {
                setError(data.error || 'Failed to generate slide 2 preview');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setIsGeneratingSlide2Preview(false);
        }
    };
    
    // Generate AI summary
    const handleGenerateSummary = async (regenerate = false) => {
        if (!title || !content) {
            setError('Please enter a title and content first');
            return;
        }
        
        setIsGenerating(true);
        setError(null);
        
        try {
            const response = await fetch('/api/ai/generate-style-caption', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    postId,
                    title,
                    content,
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
        // If we already have slide previews generated, just show those
        if (slidePreview || slide2Preview) {
            const slides = [];
            if (slidePreview) slides.push(slidePreview);
            if (slide2Preview) slides.push(slide2Preview);
            
            setPreviewData({
                slides: slides,
                caption: null,
                aiSummary: aiSummary
            });
            setShowPreview(true);
            return;
        }
        
        // Otherwise, call the API to generate full preview
        if (!postId) {
            setError('Please save the post first or generate individual slides');
            return;
        }
        
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
                    aiSummaryOverride: aiSummary || undefined,
                    subtitle: subtitle || undefined
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
            </div>
        );
    }
    
    return (
        <div className="bg-[#2a2a2a] rounded-xl border border-gray-700 overflow-hidden">
            {/* Minimal Header */}
            <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between bg-[#222]">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#F2EA6D] to-[#FFD800] flex items-center justify-center text-black">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073z"/>
                        </svg>
                    </div>
                    <div>
                        <h3 className="text-white font-bold text-lg leading-none">Instagram</h3>
                        <p className="text-xs text-gray-400 mt-1">Automated Carousel Generator</p>
                    </div>
                </div>
                <InstagramStatusBadge 
                    status={initialStatus} 
                    error={instagramError}
                    publishedAt={publishedAt}
                    instagramPostId={instagramPostId}
                    showDetails={false}
                />
            </div>
            
            <div className="p-6 space-y-8">
                {/* Main Toggle */}
                <div className="flex items-center justify-between bg-[#333] p-4 rounded-xl border border-gray-600">
                    <div>
                        <p className="font-bold text-white text-base">Auto-publish to Instagram</p>
                        <p className="text-sm text-gray-400 mt-1">Generate and publish carousel automatically</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={enabled}
                            onChange={(e) => handleEnabledChange(e.target.checked)}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#F2EA6D]"></div>
                    </label>
                </div>
                
                {enabled && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-top-4 duration-300">
                        {/* Left Column: Visuals */}
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h4 className="text-sm uppercase tracking-wider text-gray-400 font-bold">Visuals</h4>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => { handleGenerateSlidePreview(); setSelectedSlide(1); }}
                                        disabled={isGeneratingPreview || !title}
                                        className="text-xs font-bold text-[#F2EA6D] hover:text-[#FFD800] disabled:opacity-50 uppercase tracking-wide transition-colors"
                                    >
                                        {isGeneratingPreview ? 'Generating...' : 'Slide 1'}
                                    </button>
                                    <span className="text-gray-600">|</span>
                                    <button
                                        type="button"
                                        onClick={handleGenerateSlide2Preview}
                                        disabled={isGeneratingSlide2Preview || !title}
                                        className="text-xs font-bold text-[#F2EA6D] hover:text-[#FFD800] disabled:opacity-50 uppercase tracking-wide transition-colors"
                                    >
                                        {isGeneratingSlide2Preview ? 'Generating...' : 'Slide 2'}
                                    </button>
                                </div>
                            </div>
                            
                            {/* Slide Tabs */}
                            <div className="flex gap-1 bg-[#1a1a1a] p-1 rounded-lg">
                                <button
                                    type="button"
                                    onClick={() => setSelectedSlide(1)}
                                    className={`flex-1 py-2 px-3 text-xs font-bold uppercase tracking-wide rounded-md transition-colors ${
                                        selectedSlide === 1 
                                            ? 'bg-[#333] text-white' 
                                            : 'text-gray-500 hover:text-gray-300'
                                    }`}
                                >
                                    Cover Slide
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSelectedSlide(2)}
                                    className={`flex-1 py-2 px-3 text-xs font-bold uppercase tracking-wide rounded-md transition-colors ${
                                        selectedSlide === 2 
                                            ? 'bg-[#333] text-white' 
                                            : 'text-gray-500 hover:text-gray-300'
                                    }`}
                                >
                                    Summary Slide
                                </button>
                            </div>

                            <div className="bg-[#222] rounded-xl border border-gray-700 p-4 flex flex-col items-center justify-center min-h-[300px] relative group">
                                {selectedSlide === 1 ? (
                                    // Slide 1 Preview
                                    slidePreview ? (
                                        <div className="relative w-full aspect-square rounded-lg overflow-hidden shadow-2xl">
                                            <img 
                                                src={slidePreview} 
                                                alt="Slide 1 preview" 
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    ) : (coverImage || coverUrl) ? (
                                        <div className="relative w-full aspect-square rounded-lg overflow-hidden opacity-50 group-hover:opacity-75 transition-opacity">
                                            <img 
                                                src={coverUrl || coverImage} 
                                                alt="Cover raw" 
                                                className="w-full h-full object-cover grayscale"
                                            />
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <button 
                                                    type="button"
                                                    onClick={handleGenerateSlidePreview}
                                                    className="bg-white/10 backdrop-blur-sm border border-white/20 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-white/20 transition-colors"
                                                >
                                                    Generate Slide 1
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center text-gray-500">
                                            <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                            <p className="text-sm">Upload a blog cover image first</p>
                                        </div>
                                    )
                                ) : (
                                    // Slide 2 Preview
                                    slide2Preview ? (
                                        <div className="relative w-full aspect-square rounded-lg overflow-hidden shadow-2xl">
                                            <img 
                                                src={slide2Preview} 
                                                alt="Slide 2 preview" 
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    ) : (
                                        <div className="text-center text-gray-500">
                                            <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                            <p className="text-sm mb-3">Summary slide not generated yet</p>
                                            <button 
                                                type="button"
                                                onClick={handleGenerateSlide2Preview}
                                                disabled={isGeneratingSlide2Preview || !title}
                                                className="bg-[#F2EA6D] text-black px-4 py-2 rounded-lg text-sm font-bold hover:bg-[#FFD800] disabled:opacity-50 transition-colors"
                                            >
                                                {isGeneratingSlide2Preview ? 'Generating...' : 'Generate Slide 2'}
                                            </button>
                                        </div>
                                    )
                                )}
                            </div>
                            
                            <div>
                                <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wider font-bold">
                                    Override Cover URL
                                </label>
                                <input
                                    type="url"
                                    value={coverUrl}
                                    onChange={(e) => {
                                        setCoverUrl(e.target.value);
                                        onCoverChange?.(e.target.value);
                                    }}
                                    placeholder="https://..."
                                    className="w-full bg-[#222] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:ring-1 focus:ring-[#F2EA6D] focus:border-[#F2EA6D] outline-none transition-all"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wider font-bold">
                                    Subtitle (Post Type)
                                </label>
                                <input
                                    type="text"
                                    value={subtitle}
                                    onChange={(e) => setSubtitle(e.target.value)}
                                    placeholder="Album Review"
                                    className="w-full bg-[#222] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:ring-1 focus:ring-[#F2EA6D] focus:border-[#F2EA6D] outline-none transition-all"
                                />
                                <p className="text-xs text-gray-500 mt-1">Appears on cover slide (e.g., Album Review, New Release, Interview)</p>
                            </div>
                        </div>

                        {/* Right Column: Content */}
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h4 className="text-sm uppercase tracking-wider text-gray-400 font-bold">Content & AI</h4>
                                <button
                                    type="button"
                                    onClick={() => handleGenerateSummary(true)}
                                    disabled={isGenerating || !title || !content}
                                    className="text-xs font-bold text-[#F2EA6D] hover:text-[#FFD800] disabled:opacity-50 uppercase tracking-wide transition-colors"
                                >
                                    {isGenerating ? 'Writing...' : 'Auto-Generate Summary'}
                                </button>
                            </div>

                            <div className="relative">
                                <textarea
                                    value={aiSummary}
                                    onChange={(e) => {
                                        setAiSummary(e.target.value);
                                        onSummaryChange?.(e.target.value);
                                    }}
                                    rows={12}
                                    placeholder="AI summary will appear here..."
                                    className="w-full bg-[#222] border border-gray-700 text-gray-200 px-4 py-3 rounded-xl text-sm focus:ring-1 focus:ring-[#F2EA6D] focus:border-[#F2EA6D] outline-none resize-none leading-relaxed"
                                />
                                <div className="absolute bottom-3 right-3 text-xs text-gray-500 font-mono">
                                    {aiSummary.length}/400
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="pt-4">
                                <button
                                    type="button"
                                    onClick={handlePreview}
                                    disabled={isGenerating || (!slidePreview && !slide2Preview && !postId)}
                                    className="w-full px-4 py-3 bg-[#333] text-white border border-gray-600 rounded-lg font-bold hover:bg-[#444] disabled:opacity-50 transition-colors text-sm"
                                >
                                    Open Full Preview
                                </button>
                            </div>
                            
                            {initialStatus === 'published' && instagramPostId && (
                                <div className="text-center pt-2">
                                    <a
                                        href={`https://www.instagram.com/p/${instagramPostId}/`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center text-sm text-[#F2EA6D] hover:text-[#FFD800] font-medium"
                                    >
                                        View Live Post
                                        <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                    </a>
                                </div>
                            )}

                            {/* Error display */}
                            {(error || instagramError) && (
                                <div className="bg-red-900/30 border border-red-800 text-red-200 text-sm p-4 rounded-lg flex items-start gap-3">
                                    <svg className="w-5 h-5 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    <span>{error || instagramError}</span>
                                </div>
                            )}
                        </div>
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

