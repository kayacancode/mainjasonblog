/**
 * VariantCard Component
 * Displays a single AI-generated variant with actions
 */

import React from 'react';

export default function VariantCard({
    variant,
    label,
    isSelected,
    onThumbsUp,
    onThumbsDown,
    onSelect,
    onDetailedFeedback
}) {
    if (!variant) return null;

    const { id, text, params, type } = variant;

    // Format variant type for display
    const getTypeLabel = (type) => {
        switch (type) {
            case 'user-custom':
                return 'Your Settings';
            case 'ai-recommended':
                return 'AI Recommended';
            case 'experimental':
                return 'Experimental';
            default:
                return type;
        }
    };

    // Get color based on variant type
    const getTypeColor = (type) => {
        switch (type) {
            case 'user-custom':
                return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
            case 'ai-recommended':
                return 'bg-green-500/20 text-green-400 border-green-500/30';
            case 'experimental':
                return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
            default:
                return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
        }
    };

    return (
        <div className={`
            rounded-xl border-2 transition-all duration-200
            ${isSelected
                ? 'border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/20'
                : 'border-gray-700 bg-[#2a2a2a] hover:border-gray-600'
            }
        `}>
            {/* Header */}
            <div className="p-4 border-b border-gray-700">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-lg font-semibold text-white">
                        Variant {label}
                    </span>
                    <span className={`
                        px-3 py-1 rounded-full text-xs font-medium border
                        ${getTypeColor(type)}
                    `}>
                        {getTypeLabel(type)}
                    </span>
                </div>
            </div>

            {/* Variant Text */}
            <div className="p-4">
                <div className="bg-black/30 rounded-lg p-4 mb-4 min-h-[120px] max-h-[200px] overflow-y-auto">
                    <p className="text-gray-200 text-sm leading-relaxed whitespace-pre-wrap">
                        {text}
                    </p>
                </div>

                {/* Style Parameters */}
                {params && (
                    <div className="flex flex-wrap gap-2 mb-4">
                        <ParamBadge label="Tone" value={params.tone} />
                        <ParamBadge label="Emoji" value={params.emojiIntensity} />
                        <ParamBadge label="Length" value={params.length} />
                        <ParamBadge label="Energy" value={params.energy} />
                    </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2">
                    {/* Quick Feedback */}
                    <button
                        onClick={() => onThumbsUp(id)}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                        title="Like this variant"
                    >
                        <span className="text-lg">👍</span>
                        <span className="hidden sm:inline">Like</span>
                    </button>

                    <button
                        onClick={() => onThumbsDown(id)}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                        title="Dislike this variant"
                    >
                        <span className="text-lg">👎</span>
                        <span className="hidden sm:inline">Dislike</span>
                    </button>
                </div>

                <div className="flex items-center gap-2 mt-2">
                    {/* Select Button */}
                    <button
                        onClick={() => onSelect(variant)}
                        className={`
                            flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors
                            ${isSelected
                                ? 'bg-blue-600 text-white cursor-default'
                                : 'bg-gray-700 hover:bg-gray-600 text-white'
                            }
                        `}
                        disabled={isSelected}
                    >
                        {isSelected ? '✓ Selected' : 'Select This'}
                    </button>

                    {/* Detailed Feedback Button */}
                    <button
                        onClick={() => onDetailedFeedback(variant)}
                        className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                        Give Feedback
                    </button>
                </div>
            </div>
        </div>
    );
}

/**
 * Parameter Badge Component
 */
function ParamBadge({ label, value }) {
    // Color based on value
    const getColor = (val) => {
        if (val <= 3) return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
        if (val <= 6) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
        if (val <= 8) return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
        return 'bg-red-500/20 text-red-400 border-red-500/30';
    };

    return (
        <span className={`
            px-2 py-1 rounded-md text-xs font-medium border
            ${getColor(value)}
        `}>
            {label}: {value}/10
        </span>
    );
}
