#!/usr/bin/env python3
"""
Run Instagram image generation with real track data
"""

import os
import sys
from datetime import datetime

from dotenv import load_dotenv
from instagram_image_generator import InstagramImageGenerator

# Load environment variables from .env file
load_dotenv('../../../.env')

def main():
    """Run image generation with real data"""
    # Get API key from environment
    gemini_api_key = os.getenv('GEMINI_API_KEY')
    if not gemini_api_key:
        print("❌ GEMINI_API_KEY not found in environment variables")
        print("Please set your Gemini API key in your .env file:")
        print("GEMINI_API_KEY=your_api_key_here")
        return False
    
    print("🎨 Running Instagram Image Generation with Real Data...")
    
    # Initialize generator
    generator = InstagramImageGenerator(gemini_api_key)
    
    # Generate all images using real data
    print("🚀 Starting image generation with real tracks...")
    results = generator.generate_all_images('output')
    
    if results:
        print("🎉 Image generation completed successfully!")
        for image_type, path in results.items():
            print(f"📸 {image_type}: {path}")
        
        print("\n📁 Check the run folder for your generated images!")
        print("🎨 Each run gets a unique color scheme and folder organization")
    else:
        print("❌ No images were generated")
        return False
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
