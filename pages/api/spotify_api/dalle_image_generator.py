#!/usr/bin/env python3
"""
Instagram Image Generator using OpenAI DALL-E API
Actually generates real images, not just prompts
"""

import glob
import json
import logging
import os
from datetime import datetime
from typing import Any, Dict, List, Optional

import requests
from dotenv import load_dotenv
from PIL import Image, ImageDraw, ImageFont

# Load environment variables from .env file
load_dotenv('../../../.env')

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DALLEImageGenerator:
    """Generate Instagram-ready images using OpenAI DALL-E API"""
    
    def __init__(self, openai_api_key: str):
        """Initialize the OpenAI API client"""
        self.openai_api_key = openai_api_key
        self.api_url = "https://api.openai.com/v1/images/generations"
        
    def generate_image_with_dalle(self, prompt: str, output_path: str) -> bool:
        """Generate image using DALL-E API and save to file"""
        try:
            logger.info(f"Generating image with DALL-E...")
            
            headers = {
                "Authorization": f"Bearer {self.openai_api_key}",
                "Content-Type": "application/json"
            }
            
            data = {
                "model": "dall-e-3",
                "prompt": prompt,
                "n": 1,
                "size": "1024x1024",  # Square format for Instagram
                "quality": "hd",
                "style": "natural"
            }
            
            response = requests.post(self.api_url, headers=headers, json=data)
            
            if response.status_code == 200:
                result = response.json()
                image_url = result['data'][0]['url']
                
                # Download and save the image
                img_response = requests.get(image_url)
                if img_response.status_code == 200:
                    with open(output_path, 'wb') as f:
                        f.write(img_response.content)
                    
                    logger.info(f"✅ Image saved to: {output_path}")
                    return True
                else:
                    logger.error(f"Failed to download image: {img_response.status_code}")
                    return False
            else:
                logger.error(f"DALL-E API error: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"Error generating image: {e}")
            return False
    
    def find_latest_tracks_data(self, output_dir: str = "output") -> Optional[Dict]:
        """Find the most recent enhanced_data JSON file"""
        try:
            pattern = os.path.join(output_dir, "enhanced_data_*.json")
            json_files = glob.glob(pattern)
            
            if not json_files:
                logger.error(f"No enhanced_data JSON files found in {output_dir}")
                return None
            
            # Sort by modification time, get the most recent
            latest_file = max(json_files, key=os.path.getmtime)
            logger.info(f"Found latest tracks data: {latest_file}")
            
            with open(latest_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            return data
            
        except Exception as e:
            logger.error(f"Error finding latest tracks data: {e}")
            return None
    
    def get_top_artists(self, tracks: List[Dict], count: int = 4) -> List[Dict]:
        """Get top artists by popularity from tracks"""
        artist_popularity = {}
        
        for track in tracks:
            artist = track.get('artists', 'Unknown Artist')
            popularity = track.get('popularity', 0)
            
            if artist not in artist_popularity:
                artist_popularity[artist] = {
                    'name': artist,
                    'popularity': 0,
                    'tracks': []
                }
            
            artist_popularity[artist]['popularity'] = max(
                artist_popularity[artist]['popularity'], 
                popularity
            )
            artist_popularity[artist]['tracks'].append(track)
        
        # Sort by popularity and return top artists
        sorted_artists = sorted(
            artist_popularity.values(), 
            key=lambda x: x['popularity'], 
            reverse=True
        )
        
        return sorted_artists[:count]
    
    def generate_artist_collage_prompt(self, artists: List[Dict], tracks: List[Dict]) -> str:
        """Generate a detailed prompt for artist collage"""
        artist_names = [artist['name'] for artist in artists]
        playlist_sources = list(set([track.get('playlist_name', 'Unknown') for track in tracks]))
        
        prompt = f"""Create a professional Instagram post image featuring a music artist collage. 

FEATURED ARTISTS: {', '.join(artist_names)}
SOURCE: {', '.join(playlist_sources)}

Style: Modern, dark background, professional headshots of each artist arranged in a diamond formation, high contrast, vibrant colors, music industry aesthetic, Instagram-optimized square format, premium music platform branding."""
        
        return prompt.strip()
    
    def generate_tracklist_prompt(self, tracks: List[Dict]) -> str:
        """Generate a detailed prompt for tracklist image"""
        playlist_sources = list(set([track.get('playlist_name', 'Unknown') for track in tracks]))
        
        # Format tracks for display
        track_list = []
        for i, track in enumerate(tracks, 1):
            artist = track.get('artists', 'Unknown Artist')
            track_name = track.get('track_name', 'Unknown Track')
            track_list.append(f"{i}. {track_name} - {artist}")
        
        tracks_text = "\n".join(track_list)
        
        prompt = f"""Create a professional Instagram post image showing a music tracklist.

HEADER: "This Week's Top Tracks"
SOURCE: {', '.join(playlist_sources)}

TRACKLIST:
{tracks_text}

Style: Clean, modern design, dark background, white text, professional typography, Instagram-optimized square format, music platform aesthetic, easy to read on mobile."""
        
        return prompt.strip()
    
    def generate_weekly_update_prompt(self, tracks: List[Dict], artists: List[Dict]) -> str:
        """Generate a detailed prompt for weekly update image"""
        playlist_sources = list(set([track.get('playlist_name', 'Unknown') for track in tracks]))
        artist_names = [artist['name'] for artist in artists]
        
        prompt = f"""Create a comprehensive Instagram post image for a weekly music update.

HEADER: "Weekly Music Update"
FEATURED ARTISTS: {', '.join(artist_names)}
PLAYLIST SOURCES: {', '.join(playlist_sources)}
TOTAL TRACKS: {len(tracks)}

Style: Modern, premium design, dark gradient background, professional typography, high contrast, vibrant accent colors, Instagram-optimized square format, music industry branding, eye-catching and professional."""
        
        return prompt.strip()
    
    def generate_all_images(self, output_dir: str = "output") -> Dict[str, str]:
        """Generate all Instagram images from the latest tracks data"""
        results = {}
        
        # Find latest tracks data
        tracks_data = self.find_latest_tracks_data(output_dir)
        if not tracks_data:
            logger.error("No tracks data found")
            return results
        
        tracks = tracks_data.get('tracks', [])
        if not tracks:
            logger.error("No tracks found in data")
            return results
        
        logger.info(f"Found {len(tracks)} tracks to process")
        
        # Get top artists
        top_artists = self.get_top_artists(tracks, 4)
        logger.info(f"Top artists: {[artist['name'] for artist in top_artists]}")
        
        # Generate timestamp for filenames
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # 1. Artist Collage
        logger.info("🎨 Generating artist collage...")
        artist_prompt = self.generate_artist_collage_prompt(top_artists, tracks)
        artist_path = os.path.join(output_dir, f"dalle_artist_collage_{timestamp}.png")
        
        if self.generate_image_with_dalle(artist_prompt, artist_path):
            results['artist_collage'] = artist_path
            logger.info(f"✅ Artist collage: {artist_path}")
        
        # 2. Tracklist Image
        logger.info("📱 Generating tracklist image...")
        tracklist_prompt = self.generate_tracklist_prompt(tracks)
        tracklist_path = os.path.join(output_dir, f"dalle_tracklist_{timestamp}.png")
        
        if self.generate_image_with_dalle(tracklist_prompt, tracklist_path):
            results['tracklist'] = tracklist_path
            logger.info(f"✅ Tracklist: {tracklist_path}")
        
        # 3. Weekly Update
        logger.info("🎵 Generating weekly update...")
        weekly_prompt = self.generate_weekly_update_prompt(tracks, top_artists)
        weekly_path = os.path.join(output_dir, f"dalle_weekly_update_{timestamp}.png")
        
        if self.generate_image_with_dalle(weekly_prompt, weekly_path):
            results['weekly_update'] = weekly_path
            logger.info(f"✅ Weekly update: {weekly_path}")
        
        return results

def main():
    """Main function to run the image generator"""
    # Get API key from environment
    openai_api_key = os.getenv('OPENAI_API_KEY')
    if not openai_api_key:
        logger.error("OPENAI_API_KEY environment variable not set")
        logger.info("Please set your OpenAI API key in your .env file:")
        logger.info("OPENAI_API_KEY=your_api_key_here")
        return False
    
    # Initialize generator
    generator = DALLEImageGenerator(openai_api_key)
    
    # Generate all images
    logger.info("🚀 Starting DALL-E image generation...")
    results = generator.generate_all_images()
    
    if results:
        logger.info("🎉 Image generation completed successfully!")
        for image_type, path in results.items():
            logger.info(f"📸 {image_type}: {path}")
    else:
        logger.error("❌ No images were generated")
        return False
    
    return True

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
