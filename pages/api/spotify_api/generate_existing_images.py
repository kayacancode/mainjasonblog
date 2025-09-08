#!/usr/bin/env python3
"""
Generate images for existing weeks that don't have them yet
"""

import os
import sys

from instagram_image_generator import InstagramImageGenerator, logger


def main():
    """Generate images for existing weeks"""
    # Get API key from environment
    gemini_api_key = os.getenv('GEMINI_API_KEY')
    if not gemini_api_key:
        logger.error("GEMINI_API_KEY environment variable not set")
        return False
    
    # Initialize generator
    generator = InstagramImageGenerator(gemini_api_key)
    
    # Generate images for existing weeks
    logger.info("🔄 Generating images for existing weeks...")
    generated_weeks = generator.generate_images_for_existing_weeks()
    
    if generated_weeks:
        logger.info(f"✅ Generated images for {len(generated_weeks)} weeks: {generated_weeks}")
        return True
    else:
        logger.info("ℹ️ No weeks needed image generation")
        return True

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
