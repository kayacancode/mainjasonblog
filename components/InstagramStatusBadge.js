/**
 * Instagram Status Badge Component
 * Displays the current Instagram publishing status with appropriate styling
 */

import React from 'react';

const STATUS_CONFIG = {
    none: {
        label: 'Not Set',
        bgColor: 'bg-gray-100',
        textColor: 'text-gray-600',
        icon: null
    },
    pending: {
        label: 'Pending',
        bgColor: 'bg-yellow-100',
        textColor: 'text-yellow-800',
        icon: '⏳'
    },
    generating: {
        label: 'Generating',
        bgColor: 'bg-blue-100',
        textColor: 'text-blue-800',
        icon: '🎨',
        animate: true
    },
    publishing: {
        label: 'Publishing',
        bgColor: 'bg-purple-100',
        textColor: 'text-purple-800',
        icon: '🚀',
        animate: true
    },
    published: {
        label: 'Published',
        bgColor: 'bg-green-100',
        textColor: 'text-green-800',
        icon: '✅'
    },
    failed: {
        label: 'Failed',
        bgColor: 'bg-red-100',
        textColor: 'text-red-800',
        icon: '❌'
    }
};

export default function InstagramStatusBadge({ 
    status, 
    error, 
    publishedAt,
    instagramPostId,
    showDetails = false,
    size = 'sm' // sm, md, lg
}) {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.none;
    
    const sizeClasses = {
        sm: 'text-xs px-2 py-0.5',
        md: 'text-sm px-2.5 py-1',
        lg: 'text-base px-3 py-1.5'
    };
    
    return (
        <div className="inline-flex flex-col items-start gap-1">
            <span 
                className={`
                    inline-flex items-center gap-1 rounded-full font-medium
                    ${config.bgColor} ${config.textColor} ${sizeClasses[size]}
                    ${config.animate ? 'animate-pulse' : ''}
                `}
            >
                {config.icon && <span>{config.icon}</span>}
                <span>{config.label}</span>
            </span>
            
            {showDetails && (
                <div className="text-xs text-gray-500 space-y-0.5">
                    {publishedAt && status === 'published' && (
                        <p>Published: {new Date(publishedAt).toLocaleDateString()}</p>
                    )}
                    {instagramPostId && (
                        <a 
                            href={`https://www.instagram.com/p/${instagramPostId}/`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                        >
                            View on Instagram
                        </a>
                    )}
                    {error && status === 'failed' && (
                        <p className="text-red-600 max-w-xs truncate" title={error}>
                            Error: {error}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}

