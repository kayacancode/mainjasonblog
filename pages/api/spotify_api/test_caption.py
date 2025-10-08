#!/usr/bin/env python3
"""
Test script for the caption generator
"""

import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from caption_generator import CaptionGenerator


def test_caption_generator():
    """Test the caption generator with sample data"""
    
    # Sample track data
    sample_tracks = [
        {
            'artist': 'Drake',
            'name': 'DOG HOUSE',
            'genre': 'Hip Hop',
            'mood': 'Energetic',
            'popularity': 79
        },
        {
            'artist': 'Twenty One Pilots',
            'name': 'City Walls',
            'genre': 'Alternative Rock',
            'mood': 'Melancholic',
            'popularity': 78
        },
        {
            'artist': 'Ed Sheeran',
            'name': 'Camera',
            'genre': 'Pop',
            'mood': 'Upbeat',
            'popularity': 73
        }
    ]
    
    print("🧪 Testing Caption Generator")
    print("=" * 50)
    
    generator = CaptionGenerator()
    
    # Test all styles
    styles = ['balanced', 'emoji_heavy', 'minimal', 'review_style']
    
    for style in styles:
        print(f"\n🎨 Testing {style.upper()} style:")
        print("-" * 30)
        
        try:
            result = generator.generate_caption(
                tracks=sample_tracks,
                week_start='2025-09-12',
                include_hashtags=True
            )
            
            print(f"✅ Caption ({result['character_count']} chars):")
            print(f"   {result['caption']}")
            print(f"🏷️ Hashtags ({len(result['hashtags'])}):")
            print(f"   {' '.join(result['hashtags'])}")
            print(f"📊 Method: {result['method']}")
            
        except Exception as e:
            print(f"❌ Error: {e}")
    
    print(f"\n🎉 Caption generator test complete!")

if __name__ == "__main__":
    test_caption_generator()
