/**
 * Carousel Preview Component
 * Displays Instagram carousel slide previews in a modal or inline
 */

import React, { useState } from 'react';

export default function CarouselPreview({
    slides = [],
    caption,
    aiSummary,
    isLoading = false,
    onClose,
    showModal = true
}) {
    const [currentSlide, setCurrentSlide] = useState(0);
    
    const slideUrls = Array.isArray(slides) 
        ? slides 
        : [slides.slide1, slides.slide2].filter(Boolean);
    
    const content = (
        <div className="bg-white rounded-xl overflow-hidden">
            {/* Slide viewer */}
            <div className="relative aspect-square bg-gray-900">
                {isLoading ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent"></div>
                    </div>
                ) : slideUrls.length > 0 ? (
                    <>
                        <img
                            src={slideUrls[currentSlide]}
                            alt={`Slide ${currentSlide + 1}`}
                            className="w-full h-full object-contain"
                        />
                        
                        {/* Slide navigation dots */}
                        {slideUrls.length > 1 && (
                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                                {slideUrls.map((_, index) => (
                                    <button
                                        key={index}
                                        onClick={() => setCurrentSlide(index)}
                                        className={`w-2 h-2 rounded-full transition-colors ${
                                            index === currentSlide 
                                                ? 'bg-white' 
                                                : 'bg-white/50 hover:bg-white/75'
                                        }`}
                                    />
                                ))}
                            </div>
                        )}
                        
                        {/* Navigation arrows */}
                        {slideUrls.length > 1 && (
                            <>
                                <button
                                    onClick={() => setCurrentSlide(prev => Math.max(0, prev - 1))}
                                    disabled={currentSlide === 0}
                                    className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center disabled:opacity-30 hover:bg-black/70 transition-colors"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                    </svg>
                                </button>
                                <button
                                    onClick={() => setCurrentSlide(prev => Math.min(slideUrls.length - 1, prev + 1))}
                                    disabled={currentSlide === slideUrls.length - 1}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center disabled:opacity-30 hover:bg-black/70 transition-colors"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </button>
                            </>
                        )}
                    </>
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                        <p>No preview available</p>
                    </div>
                )}
            </div>
            
            {/* Caption preview */}
            {(caption || aiSummary) && (
                <div className="p-4 border-t border-gray-200">
                    {aiSummary && (
                        <div className="mb-3">
                            <p className="text-xs font-medium text-gray-500 mb-1">AI Summary (Slide 2):</p>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">{aiSummary}</p>
                        </div>
                    )}
                    {caption && (
                        <div>
                            <p className="text-xs font-medium text-gray-500 mb-1">Caption:</p>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap line-clamp-4">{caption}</p>
                        </div>
                    )}
                </div>
            )}
            
            {/* Slide info */}
            <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
                Slide {currentSlide + 1} of {slideUrls.length}
            </div>
        </div>
    );
    
    if (!showModal) {
        return content;
    }
    
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="relative w-full max-w-md">
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute -top-2 -right-2 z-10 w-8 h-8 rounded-full bg-white shadow-lg flex items-center justify-center hover:bg-gray-100 transition-colors"
                >
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
                
                {content}
            </div>
        </div>
    );
}

