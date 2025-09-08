#!/usr/bin/env python3
"""
Instagram Image Generator using Google Gemini Nano Banana API
Reads from enhanced_data JSON files and generates Instagram-ready images
"""

import glob
import json
import logging
import os
import random
from datetime import datetime, timedelta
from io import BytesIO
from typing import Any, Dict, List, Optional

import google.generativeai as genai
import requests
from dotenv import load_dotenv
from PIL import Image, ImageDraw, ImageFont
from supabase import Client, create_client

# Load environment variables from .env file (located at project root)
load_dotenv('../../../.env')

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Supabase client
SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_KEY')
supabase: Optional[Client] = None

if SUPABASE_URL and SUPABASE_KEY:
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    logger.info("✅ Supabase client initialized")
else:
    logger.warning("⚠️ Supabase credentials not found, images will only be saved locally")
class InstagramImageGenerator:
    """Generate Instagram-ready images using Google Gemini AI"""
    
    def __init__(self, gemini_api_key: str):
        """Initialize the Gemini API client"""
        self.gemini_api_key = gemini_api_key
        genai.configure(api_key=gemini_api_key)
        # Use the image generation model
        # Try different models for image generation
        try:
            self.model = genai.GenerativeModel('gemini-2.5-flash-image-preview')
        except:
            try:
                self.model = genai.GenerativeModel('gemini-1.5-flash')
            except:
                self.model = genai.GenerativeModel('gemini-pro')
        
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
        """Get top artists by popularity from tracks, ensuring uniqueness"""
        artist_popularity = {}
        
        for track in tracks:
            # Try both 'artist' and 'artists' fields
            artist = track.get('artists', track.get('artist', 'Unknown Artist'))
            popularity = track.get('popularity', 0)
            
            # Handle multiple artists in one track (e.g., "Drake, Future")
            if ',' in artist:
                # Split by comma and take the first artist
                artist = artist.split(',')[0].strip()
            
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
        
        # Ensure we have unique artists
        unique_artists = []
        seen_names = set()
        
        for artist in sorted_artists:
            if artist['name'] not in seen_names:
                unique_artists.append(artist)
                seen_names.add(artist['name'])
                if len(unique_artists) >= count:
                    break
        
        return unique_artists
    
    def get_random_color_scheme(self) -> Dict[str, str]:
        """Get a random color scheme for the images"""
        color_schemes = [
            {"primary": "dark blue", "secondary": "navy", "accent": "royal blue"},
            {"primary": "dark purple", "secondary": "deep purple", "accent": "violet"},
            {"primary": "dark red", "secondary": "burgundy", "accent": "crimson"},
            {"primary": "dark green", "secondary": "forest green", "accent": "emerald"},
            {"primary": "dark orange", "secondary": "burnt orange", "accent": "amber"},
            {"primary": "dark teal", "secondary": "deep teal", "accent": "turquoise"},
            {"primary": "dark magenta", "secondary": "deep magenta", "accent": "fuchsia"},
            {"primary": "dark indigo", "secondary": "deep indigo", "accent": "electric blue"}
        ]
        return random.choice(color_schemes)
    
    def search_artist_info(self, artist_name: str) -> str:
        """Search for real artist information using web search"""
        try:
            import re

            import requests
            from bs4 import BeautifulSoup

            # Clean artist name for search
            clean_name = artist_name.replace(',', '').replace('&', 'and').strip()
            search_query = f"{clean_name} musician artist biography appearance"
            
            # Use a simple search approach
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
            
            try:
                # Search for artist info
                search_url = f"https://www.google.com/search?q={search_query}"
                response = requests.get(search_url, headers=headers, timeout=10)
                
                if response.status_code == 200:
                    soup = BeautifulSoup(response.content, 'html.parser')
                    
                    # Extract basic info from search results
                    text_content = soup.get_text().lower()
                    
                    # Look for common descriptors
                    descriptors = []
                    
                    # Age/age range
                    if 'born' in text_content or 'age' in text_content:
                        age_match = re.search(r'born (\d{4})|age (\d+)', text_content)
                        if age_match:
                            year = age_match.group(1) or age_match.group(2)
                            if year:
                                current_year = 2024
                                if year.isdigit() and len(year) == 4:
                                    age = current_year - int(year)
                                    if age < 30:
                                        descriptors.append(f"Young adult, {age} years old")
                                    elif age < 50:
                                        descriptors.append(f"Adult, {age} years old")
                                    else:
                                        descriptors.append(f"Mature adult, {age} years old")
                    
                    # Gender/ethnicity clues
                    if any(word in text_content for word in ['black', 'african', 'african-american']):
                        descriptors.append("Black/African-American")
                    elif any(word in text_content for word in ['white', 'caucasian']):
                        descriptors.append("White/Caucasian")
                    elif any(word in text_content for word in ['hispanic', 'latino', 'latina']):
                        descriptors.append("Hispanic/Latino")
                    elif any(word in text_content for word in ['asian']):
                        descriptors.append("Asian")
                    
                    # Style descriptors
                    if any(word in text_content for word in ['rapper', 'hip-hop', 'rap']):
                        descriptors.append("Hip-hop/rap artist")
                    elif any(word in text_content for word in ['singer', 'vocalist', 'soul', 'r&b']):
                        descriptors.append("Singer/vocalist")
                    elif any(word in text_content for word in ['producer', 'beatmaker']):
                        descriptors.append("Producer/beatmaker")
                    
                    # Build description
                    if descriptors:
                        base_desc = f"{artist_name}: Professional musician"
                        for desc in descriptors[:3]:  # Limit to 3 descriptors
                            base_desc += f", {desc}"
                        return base_desc
                    
            except Exception as e:
                logger.warning(f"Search failed for {artist_name}: {e}")
                
        except Exception as e:
            logger.warning(f"Could not search for artist info: {e}")
        
        # Fallback to generic description
        return f"{artist_name}: Professional musician and artist with distinctive features"
    def generate_artist_collage_prompt(self, artists: List[Dict], tracks: List[Dict]) -> str:
        """Generate a detailed prompt for cover image featuring the top track"""
        # Get the top track (highest popularity)
        top_track = max(tracks, key=lambda x: x.get('popularity', 0))
        artist_name = top_track.get('artists', top_track.get('artist', 'Unknown Artist'))
        track_name = top_track.get('track_name', top_track.get('name', 'Unknown Track'))
        
        # Search for real artist information
        artist_reference = self.search_artist_info(artist_name)
        
        prompt = f"""
        Create a professional Instagram post image (1080x1080px, square format) featuring the top track of the week.

        ARTIST: {artist_name}
        TRACK: {track_name}
        
        ARTIST REFERENCE:
        {artist_reference}

        CRITICAL REQUIREMENT - REALISTIC ARTIST PORTRAIT WITH 2025 REFERENCE:
        - Generate a PHOTOREALISTIC portrait of the actual famous artist: {artist_name}
        - Use 2025 up-to-date picture reference for the most current and realistic appearance
        - The artist must be IMMEDIATELY RECOGNIZABLE as {artist_name}
        - Use the artist reference information to create distinctive features
        - Style: Professional music industry photoshoot, 2025 contemporary look
        - The portrait should capture the artist's current distinctive facial features, hairstyle, and signature style
        - High-resolution, detailed facial features that match the real artist's 2025 appearance
        - Studio lighting with dramatic shadows
        - Professional photography style with modern, current aesthetic

        VISUAL STYLE:
        - Professional music industry aesthetic with a sleek, modern 2025 feel
        - Black or dark background for high contrast
        - The artist should be the central figure, clearly recognizable
        - High-quality, professional photography style
        - Modern, contemporary design
        - Clean, minimalist aesthetic

        TEXT LAYOUT:
        - TOP CENTER: "{artist_name.upper()}" in large, bold white font
        - BOTTOM LEFT: "{track_name.upper()}" in medium white font
        - BOTTOM RIGHT: "NEW MUSIC FRIDAY" with "NEW" in red and "MUSIC FRIDAY" in white, bold sans-serif font

        DESIGN REQUIREMENTS:
        - Ensure the dark background enhances contrast and makes the text pop
        - Background should be visually interesting but not overpower the artist
        - All text must be clearly legible
        - Use a modern, clean font style appropriate for music promotion
        - Maintain proper spacing and hierarchy
        - Instagram-optimized square format
        - High contrast, professional lighting
        - NO soundwaves, NO geometric elements, NO tech branding
        - Focus on the actual famous artist: {artist_name} with 2025 contemporary reference

        IMPORTANT: This must be a recognizable portrait of {artist_name} using 2025 up-to-date picture reference for the most current and realistic appearance.
        """
        
        return prompt.strip()
    
    def generate_tracklist_prompt(self, tracks: List[Dict]) -> str:
        """Generate a detailed prompt for tracklist image"""
        # Format tracks for display with proper dash formatting and truncation
        track_list = []
        for i, track in enumerate(tracks, 1):
            artist = track.get('artists', track.get('artist', 'Unknown Artist'))
            track_name = track.get('track_name', track.get('name', 'Unknown Track'))
            
            # Truncate long artist names to prevent text wrapping
            if len(artist) > 25:
                artist = artist[:22] + "..."
            
            # Format with proper alignment: " 1." for single digits, "10." for double digits
            if i < 10:
                track_list.append(f" {i}. {track_name} - {artist}")
            else:
                track_list.append(f"{i}. {track_name} - {artist}")
        
        tracks_text = "\n".join(track_list)
        
        prompt = f"""
        Create a professional Instagram post image (1080x1080px, square format) showing a music tracklist.

        EXACT TRACKLIST TO DISPLAY (COPY EXACTLY):
        {tracks_text}

        VISUAL EXAMPLE OF CORRECT FORMATTING:
         1. Track Name - Artist Name
         2. Another Track - Another Artist
         3. Long Track Name - Artist Name
         4. Short Track - Artist
         5. Track With Features - Main Artist
         6. Another Track - Artist
         7. Track Name - Artist
         8. Track Name - Artist
         9. Track Name - Artist
        10. Track Name - Artist

        MANDATORY FORMATTING RULES:
        1. Use a MONOSPACE FONT (Courier, Monaco, Consolas) for the tracklist - THIS IS CRITICAL
        2. Use MEDIUM font size (not large) for consistent sizing across generations
        3. Display the tracklist EXACTLY as shown above
        4. Format: "NUMBER. Track Name - Artist Name" (NO extra spaces)
        5. Numbers 1-9: " 1.", " 2.", " 3.", " 4.", " 5.", " 6.", " 7.", " 8.", " 9."
        6. Number 10: "10." (no leading space)
        7. All periods must align vertically in a perfect straight line
        8. All track names must start at the same horizontal position
        9. All artist names must start at the same horizontal position after the dash
        10. NO extra spaces between track name and dash
        11. NO extra spaces between dash and artist name
        12. EVERY track must have a dash between track name and artist name
        13. NO text wrapping, NO duplicate numbers
        14. Display ALL 10 tracks in order 1-10
        15. USE MONOSPACE FONT FOR PERFECT ALIGNMENT - NO PROPORTIONAL FONTS
        16. NO extra spacing between lines - keep consistent line spacing
        17. NO missing track numbers - must be 1, 2, 3, 4, 5, 6, 7, 8, 9, 10

        VISUAL STYLE:
        - Professional music industry aesthetic with a sleek, modern feel
        - Black overlay background for a moody, high-contrast effect
        - Clean, professional typography
        - Minimalist design

        TEXT LAYOUT:
        - TOP CENTER: "THIS WEEK'S TOP TRACKS" in large, bold white font
        - BOTTOM RIGHT: "NEW MUSIC FRIDAY" with "NEW" in red and "MUSIC FRIDAY" in white, bold sans-serif font (EXACTLY matching the cover image style)
        - Center: The exact tracklist provided above, perfectly aligned

        CRITICAL: Use monospace font (Courier, Monaco, or Consolas) and display the tracklist EXACTLY as provided above. NO EXTRA SPACES, NO DEVIATIONS, NO MISSING TRACKS. The monospace font is essential for perfect alignment.
        """
        
        return prompt.strip()
    
    def upload_image_to_supabase(self, image_path: str, week_start: str) -> Optional[str]:
        """Upload image to Supabase storage and return public URL"""
        if not supabase:
            logger.warning("Supabase not available, skipping upload")
            return None
            
        try:
            # Read image file
            with open(image_path, 'rb') as f:
                image_data = f.read()
            
            # Create filename with week_start
            filename = f"instagram_images/{week_start}_{os.path.basename(image_path)}"
            
            # Upload to Supabase storage
            result = supabase.storage.from_('instagram-images').upload(filename, image_data)
            
            if result:
                # Get public URL
                public_url = supabase.storage.from_('instagram-images').get_public_url(filename)
                logger.info(f"✅ Image uploaded: {public_url}")
                return public_url
            else:
                logger.error(f"❌ Failed to upload image: {filename}")
                return None
                
        except Exception as e:
            logger.error(f"❌ Error uploading image: {e}")
            return None
    
    def delete_old_images_for_week(self, week_start: str) -> bool:
        """Delete old images for a specific week from Supabase storage and database"""
        if not supabase:
            logger.warning("⚠️ Supabase not available, skipping cleanup")
            return False
            
        try:
            # Get existing images for this week
            existing_images = supabase.table('images').select('*').eq('week_start', week_start).execute()
            
            if existing_images.data:
                image_record = existing_images.data[0]
                
                # Delete from storage
                if image_record.get('cover_image_url'):
                    self.delete_image_from_supabase(image_record['cover_image_url'])
                if image_record.get('tracklist_image_url'):
                    self.delete_image_from_supabase(image_record['tracklist_image_url'])
                
                # Delete from database
                result = supabase.table('images').delete().eq('week_start', week_start).execute()
                
                if result.data:
                    logger.info(f"🗑️ Deleted old images for week {week_start}")
                    return True
                else:
                    logger.warning(f"⚠️ Failed to delete old image metadata for week {week_start}")
                    return False
            else:
                logger.info(f"ℹ️ No existing images found for week {week_start}")
                return True
                
        except Exception as e:
            logger.error(f"❌ Error deleting old images for week {week_start}: {e}")
            return False

    def delete_image_from_supabase(self, image_url: str) -> bool:
        """Delete an image from Supabase storage"""
        try:
            # Extract the file path from the URL
            # URL format: https://xxx.supabase.co/storage/v1/object/public/instagram-images/instagram_images/filename.png
            if 'instagram-images/instagram_images/' in image_url:
                file_path = image_url.split('instagram-images/instagram_images/')[-1]
                # Remove any query parameters (like ?v=123)
                if '?' in file_path:
                    file_path = file_path.split('?')[0]
                file_path = f"instagram_images/{file_path}"
                
                logger.info(f"🗑️ Attempting to delete: {file_path}")
                
                # Delete from storage
                result = supabase.storage.from_('instagram-images').remove([file_path])
                
                if result:
                    logger.info(f"✅ Successfully deleted image: {file_path}")
                    return True
                else:
                    logger.warning(f"⚠️ Failed to delete image: {file_path}")
                    return False
            else:
                logger.warning(f"⚠️ Invalid image URL format: {image_url}")
                return False
                
        except Exception as e:
            logger.error(f"❌ Error deleting image from Supabase: {e}")
            return False

    def save_image_metadata(self, week_start: str, cover_url: str, tracklist_url: str) -> bool:
        """Save image metadata to Supabase images table"""
        if not supabase:
            logger.warning("Supabase not available, skipping metadata save")
            return False
            
        try:
            # Check if record exists
            existing = supabase.table('images').select('id').eq('week_start', week_start).execute()
            
            if existing.data:
                # Update existing record
                result = supabase.table('images').update({
                    'cover_image_url': cover_url,
                    'tracklist_image_url': tracklist_url,
                    'updated_at': datetime.now().isoformat()
                }).eq('week_start', week_start).execute()
            else:
                # Insert new record
                result = supabase.table('images').insert({
                    'week_start': week_start,
                    'cover_image_url': cover_url,
                    'tracklist_image_url': tracklist_url
                }).execute()
            
            if result.data:
                logger.info(f"✅ Image metadata saved for week {week_start}")
                return True
            else:
                logger.error(f"❌ Failed to save image metadata for week {week_start}")
                return False
                
        except Exception as e:
            logger.error(f"❌ Error saving image metadata: {e}")
            return False
    
    def get_week_start_from_tracks(self, tracks: List[Dict]) -> str:
        """Extract week_start from tracks data"""
        # Look for week_start in the first track
        if tracks and 'week_start' in tracks[0]:
            return tracks[0]['week_start']
        
        # Fallback: calculate from current date (assuming Friday)
        today = datetime.now()
        # Find the most recent Friday
        days_since_friday = (today.weekday() - 4) % 7
        if days_since_friday == 0 and today.hour < 4:  # If it's Friday before 4 AM, use previous Friday
            days_since_friday = 7
        friday = today - timedelta(days=days_since_friday)
        return friday.strftime('%Y-%m-%d')
    def generate_weekly_update_prompt(self, tracks: List[Dict], artists: List[Dict]) -> str:
        """Generate a detailed prompt for weekly update image"""
        playlist_sources = list(set([track.get('playlist_name', 'Unknown') for track in tracks]))
        artist_names = [artist['name'] for artist in artists]
        
        prompt = f"""
        Create a professional Instagram post image (1080x1080px, square format) for a weekly music update in the style of New Music Friday promotional materials.

        WEEKLY STATS:
        - Featured Artists: {', '.join(artist_names)}
        - Playlist Sources: {', '.join(playlist_sources)}
        - Total New Tracks: {len(tracks)}

        STYLE REQUIREMENTS:
        - Dark background (black to dark green gradient)
        - Professional music industry aesthetic
        - Clean, modern typography
        - High contrast white text
        - Instagram-optimized square format

        LAYOUT:
        - Main Header: "WEEKLY MUSIC UPDATE" at the top
        - Subheader: Playlist sources
        - Featured artists section
        - Statistics section (track count)
        - Professional music platform branding

        DESIGN:
        - Dark background with subtle gradient
        - Clean, readable typography
        - Professional music platform styling
        - No geometric or tech elements
        - Natural, organic design

        The image should look like a professional music platform's weekly update, similar to New Music Friday promotional graphics.
        """
        
        return prompt.strip()
    
    def create_clean_promotional_design(self, tracks: List[Dict], output_path: str) -> bool:
        """Create a clean, simple promotional design"""
        try:
            import random

            from PIL import Image, ImageDraw, ImageFont

            # Create a 1080x1080 canvas
            canvas = Image.new('RGB', (1080, 1080), (0, 0, 0))
            draw = ImageDraw.Draw(canvas)
            
            # Get top track info
            top_track = max(tracks, key=lambda x: x.get('popularity', 0))
            artist_name = top_track.get('artists', top_track.get('artist', 'Unknown Artist'))
            track_name = top_track.get('track_name', top_track.get('name', 'Unknown Track'))
            
            # Create a gradient background
            for y in range(1080):
                # Create a subtle gradient from black to dark gray
                color_value = int(20 + (y / 1080) * 30)  # 20 to 50
                draw.line([(0, y), (1080, y)], fill=(color_value, color_value, color_value))
            
            # Add some subtle geometric elements
            # Random colored rectangles for visual interest
            colors = [(255, 0, 0), (0, 255, 0), (0, 0, 255), (255, 255, 0), (255, 0, 255), (0, 255, 255)]
            for _ in range(3):
                x = random.randint(50, 800)
                y = random.randint(50, 800)
                width = random.randint(100, 300)
                height = random.randint(100, 300)
                color = random.choice(colors)
                # Make them semi-transparent by using a darker shade
                color = tuple(int(c * 0.3) for c in color)
                draw.rectangle([x, y, x + width, y + height], fill=color)
            
            # Add text
            try:
                # Use system fonts
                font_large = ImageFont.truetype("/System/Library/Fonts/Arial.ttf", 72)
                font_medium = ImageFont.truetype("/System/Library/Fonts/Arial.ttf", 48)
                font_small = ImageFont.truetype("/System/Library/Fonts/Arial.ttf", 36)
            except:
                # Fallback to default font
                font_large = ImageFont.load_default()
                font_medium = ImageFont.load_default()
                font_small = ImageFont.load_default()
            
            # Add text with shadows for better readability
            text_color = (255, 255, 255)
            shadow_color = (0, 0, 0)
            
            # Artist name at top
            artist_text = artist_name.upper()
            draw.text((541, 151), artist_text, fill=shadow_color, font=font_large, anchor='mt')  # Shadow
            draw.text((540, 150), artist_text, fill=text_color, font=font_large, anchor='mt')    # Main text
            
            # Track name at bottom left
            track_text = track_name.upper()
            draw.text((51, 901), track_text, fill=shadow_color, font=font_medium, anchor='lb')  # Shadow
            draw.text((50, 900), track_text, fill=text_color, font=font_medium, anchor='lb')    # Main text
            
            # NEW MUSIC FRIDAY at bottom right
            nmf_text = "NEW MUSIC FRIDAY"
            draw.text((1031, 901), nmf_text, fill=shadow_color, font=font_medium, anchor='rb')  # Shadow
            draw.text((1030, 900), nmf_text, fill=text_color, font=font_medium, anchor='rb')    # Main text
            
            # Add a subtle border
            draw.rectangle([10, 10, 1070, 1070], outline=(100, 100, 100), width=2)
            
            # Save the image
            canvas.save(output_path, 'PNG')
            logger.info(f"✅ Clean promotional design created: {output_path}")
            return True
            
        except Exception as e:
            logger.error(f"Error creating clean promotional design: {e}")
            return False

    def create_album_artwork_collage(self, tracks: List[Dict], output_path: str) -> bool:
        """Create a collage using actual album artwork from tracks"""
        try:
            from io import BytesIO

            import requests
            from PIL import Image, ImageDraw, ImageFont

            # Get album artwork URLs from top tracks
            artwork_urls = []
            for track in tracks[:4]:  # Use top 4 tracks
                album_art_url = track.get('album_art_url')
                if album_art_url and album_art_url != 'N/A':
                    artwork_urls.append(album_art_url)
            
            if not artwork_urls:
                logger.warning("No album artwork found, falling back to AI generation")
                return self.generate_image_with_gemini(self.generate_artist_collage_prompt([], tracks), output_path)
            
            # Create a 1080x1080 canvas
            canvas = Image.new('RGB', (1080, 1080), (0, 0, 0))
            draw = ImageDraw.Draw(canvas)
            
            # Try to load and arrange album artwork
            try:
                # Load album artwork
                artwork_images = []
                for url in artwork_urls[:4]:
                    try:
                        response = requests.get(url, timeout=10)
                        if response.status_code == 200:
                            img = Image.open(BytesIO(response.content))
                            img = img.resize((200, 200))  # Resize to 200x200
                            artwork_images.append(img)
                    except Exception as e:
                        logger.warning(f"Failed to load artwork from {url}: {e}")
                        continue
                
                if artwork_images:
                    # Arrange artwork in a 2x2 grid
                    positions = [(50, 50), (430, 50), (50, 430), (430, 430)]
                    for i, img in enumerate(artwork_images[:4]):
                        if i < len(positions):
                            canvas.paste(img, positions[i])
                
                # Add text overlay
                try:
                    # Use a default font if available
                    font_large = ImageFont.truetype("/System/Library/Fonts/Arial.ttf", 48)
                    font_medium = ImageFont.truetype("/System/Library/Fonts/Arial.ttf", 32)
                    font_small = ImageFont.truetype("/System/Library/Fonts/Arial.ttf", 24)
                except:
                    # Fallback to default font
                    font_large = ImageFont.load_default()
                    font_medium = ImageFont.load_default()
                    font_small = ImageFont.load_default()
                
                # Get top track info
                top_track = max(tracks, key=lambda x: x.get('popularity', 0))
                artist_name = top_track.get('artists', top_track.get('artist', 'Unknown Artist'))
                track_name = top_track.get('track_name', top_track.get('name', 'Unknown Track'))
                
                # Add text
                draw.text((540, 50), artist_name.upper(), fill='white', font=font_large, anchor='mt')
                draw.text((50, 900), track_name.upper(), fill='white', font=font_medium, anchor='lb')
                draw.text((1030, 900), "NEW MUSIC FRIDAY", fill='white', font=font_medium, anchor='rb')
                
                # Save the image
                canvas.save(output_path, 'PNG')
                logger.info(f"✅ Album artwork collage created: {output_path}")
                return True
                
            except Exception as e:
                logger.error(f"Error creating album artwork collage: {e}")
                return False
                
        except Exception as e:
            logger.error(f"Error in create_album_artwork_collage: {e}")
            return False

    def generate_image_with_gemini(self, prompt: str, output_path: str) -> bool:
        """Generate image using Gemini AI and save to file"""
        try:
            logger.info(f"Generating image with Gemini AI...")
            
            # Try different approaches for Gemini image generation
            try:
                # Method 1: Direct image generation (if supported)
                response = self.model.generate_content(
                    f"Generate an image: {prompt}",
                    generation_config={
                        "response_mime_type": "image/png"
                    }
                )
                
                if response and hasattr(response, 'parts') and response.parts:
                    # Check if we got image data
                    if hasattr(response.parts[0], 'inline_data'):
                        # Extract image data
                        image_data = response.parts[0].inline_data.data
                        
                        with open(output_path, 'wb') as f:
                            f.write(image_data)
                        
                        logger.info(f"✅ Image generated and saved to: {output_path}")
                        return True
                    else:
                        logger.warning("No image data in response, trying alternative method")
                        raise Exception("No image data received")
                else:
                    logger.warning("No response parts, trying alternative method")
                    raise Exception("No response parts")
                    
            except Exception as e1:
                logger.info(f"Method 1 failed: {e1}, trying alternative approach...")
                
                # Method 2: Try with different model configuration
                try:
                    # Use a more explicit prompt for image generation
                    image_prompt = f"""Create a high-quality Instagram post image with the following specifications:

{prompt}

Requirements:
- 1080x1080 pixels (square format)
- High resolution, professional quality
- Instagram-optimized design
- PNG format"""

                    response = self.model.generate_content(image_prompt)
                    
                    if response and hasattr(response, 'parts') and response.parts:
                        # Try to extract any image data
                        for part in response.parts:
                            if hasattr(part, 'inline_data') and part.inline_data:
                                image_data = part.inline_data.data
                                
                                with open(output_path, 'wb') as f:
                                    f.write(image_data)
                                
                                logger.info(f"✅ Image generated and saved to: {output_path}")
                                return True
                    
                    # If no image data, save the response as text for debugging
                    logger.warning("No image data found in response, saving text response")
                    with open(output_path.replace('.png', '_response.txt'), 'w') as f:
                        f.write(str(response))
                    
                    raise Exception("No image data in response")
                    
                except Exception as e2:
                    logger.warning(f"Method 2 also failed: {e2}")
                    raise Exception("All image generation methods failed")
            
        except Exception as e:
            logger.error(f"Error generating image: {e}")
            # Fallback to prompt saving
            self.save_prompt_fallback(prompt, output_path)
            return False
    
    def save_prompt_fallback(self, prompt: str, output_path: str):
        """Fallback method to save prompt if image generation fails"""
        try:
            # Save the prompt for reference
            prompt_file = output_path.replace('.png', '_prompt.txt')
            with open(prompt_file, 'w', encoding='utf-8') as f:
                f.write(f"Generated on: {datetime.now().isoformat()}\n\n")
                f.write("PROMPT FOR IMAGE GENERATION:\n")
                f.write("=" * 50 + "\n\n")
                f.write(prompt)
                f.write("\n\n" + "=" * 50 + "\n")
                f.write("INSTRUCTIONS:\n")
                f.write("1. Copy this prompt to Google Gemini (gemini.google.com)\n")
                f.write("2. Use the 'Create Image' feature\n")
                f.write("3. Save the generated image as the PNG file\n")
                f.write("4. The image will be ready for Instagram posting\n")
            
            logger.info(f"Prompt saved to: {prompt_file}")
            
            # Create a placeholder image with the prompt info
            self.create_placeholder_image(prompt, output_path)
            
        except Exception as e:
            logger.error(f"Error saving prompt fallback: {e}")
    
    def create_placeholder_image(self, prompt: str, output_path: str):
        """Create a placeholder image with prompt information"""
        try:
            # Create a 1080x1080 image
            img = Image.new('RGB', (1080, 1080), color='#1a1a1a')
            draw = ImageDraw.Draw(img)
            
            # Try to use a default font, fallback to basic if not available
            try:
                font_large = ImageFont.truetype("/System/Library/Fonts/Arial.ttf", 48)
                font_medium = ImageFont.truetype("/System/Library/Fonts/Arial.ttf", 24)
                font_small = ImageFont.truetype("/System/Library/Fonts/Arial.ttf", 16)
            except:
                font_large = ImageFont.load_default()
                font_medium = ImageFont.load_default()
                font_small = ImageFont.load_default()
            
            # Add text to the placeholder
            y_pos = 100
            draw.text((540, y_pos), "Instagram Image Generator", fill='white', font=font_large, anchor='mm')
            y_pos += 100
            
            draw.text((540, y_pos), "Prompt saved to text file", fill='#888888', font=font_medium, anchor='mm')
            y_pos += 50
            
            draw.text((540, y_pos), "Use Google Gemini to generate the actual image", fill='#888888', font=font_small, anchor='mm')
            y_pos += 30
            
            draw.text((540, y_pos), "Visit: gemini.google.com", fill='#4a9eff', font=font_small, anchor='mm')
            
            # Save the placeholder
            img.save(output_path)
            logger.info(f"Placeholder image saved to: {output_path}")
            
        except Exception as e:
            logger.error(f"Error creating placeholder image: {e}")
    
    def generate_all_images(self, output_dir: str = "output", tracks_data: List[Dict] = None) -> Dict[str, str]:
        """Generate all Instagram images from the latest tracks data"""
        results = {}
        
        # Use provided tracks_data or find latest tracks data
        if tracks_data is None:
            tracks_data = self.find_latest_tracks_data(output_dir)
        if not tracks_data:
            logger.error("No tracks data found")
            return results
        
        # Handle both dict format (from JSON) and list format (from database)
        if isinstance(tracks_data, list):
            tracks = tracks_data
        else:
            tracks = tracks_data.get('tracks', [])
        if not tracks:
            logger.error("No tracks found in data")
            return results
        
        logger.info(f"Found {len(tracks)} tracks to process")
        
        # Get top artists
        top_artists = self.get_top_artists(tracks, 4)
        logger.info(f"Top artists: {[artist['name'] for artist in top_artists]}")
        
        # Generate timestamp for filenames and create run folder
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        run_folder = os.path.join(output_dir, f"run_{timestamp}")
        
        # Skip local folder creation - using Supabase only
        logger.info(f"📁 Using Supabase storage only - no local files")
        
        # 1. Artist Collage
        logger.info("🎨 Generating artist collage...")
        artist_prompt = self.generate_artist_collage_prompt(top_artists, tracks)
        artist_path = f"artist_collage_{timestamp}.png"
        
        if self.generate_image_with_gemini(artist_prompt, artist_path):
            results['artist_collage'] = artist_path
            logger.info(f"✅ Artist collage: {artist_path}")
        
        # 2. Tracklist Image
        logger.info("📱 Generating tracklist image...")
        tracklist_prompt = self.generate_tracklist_prompt(tracks)
        tracklist_path = f"tracklist_{timestamp}.png"
        
        if self.generate_image_with_gemini(tracklist_prompt, tracklist_path):
            results['tracklist'] = tracklist_path
            logger.info(f"✅ Tracklist: {tracklist_path}")
        
        # Get week_start for database storage
        week_start = self.get_week_start_from_tracks(tracks)
        logger.info(f"📅 Week start: {week_start}")
        
        # Delete old images for this week before generating new ones
        if week_start:
            logger.info(f"🗑️ Cleaning up old images for week {week_start}...")
            self.delete_old_images_for_week(week_start)
        
        # Upload images to Supabase if available
        cover_url = None
        tracklist_url = None
        
        if 'artist_collage' in results:
            cover_url = self.upload_image_to_supabase(results['artist_collage'], week_start)
        
        if 'tracklist' in results:
            tracklist_url = self.upload_image_to_supabase(results['tracklist'], week_start)
        
        # Save metadata to database
        if cover_url and tracklist_url:
            self.save_image_metadata(week_start, cover_url, tracklist_url)
        
        # Skip local metadata saving - using Supabase only
        logger.info(f"📄 Using Supabase storage only - no local metadata files")
        
        return results
    
    def generate_images_for_existing_weeks(self) -> List[str]:
        """Generate images for weeks that don't have them yet"""
        if not supabase:
            logger.warning("Supabase not available, cannot check existing weeks")
            return []
        
        try:
            # Get all weeks with tracks
            tracks_response = supabase.table('tracks').select('week_start').execute()
            if not tracks_response.data:
                logger.info("No tracks found in database")
                return []
            
            # Get unique week_starts
            week_starts = list(set([track['week_start'] for track in tracks_response.data]))
            logger.info(f"Found {len(week_starts)} weeks with tracks: {week_starts}")
            
            # Get weeks that already have images
            images_response = supabase.table('images').select('week_start').execute()
            existing_weeks = [img['week_start'] for img in images_response.data] if images_response.data else []
            
            # Find weeks without images
            missing_weeks = [week for week in week_starts if week not in existing_weeks]
            logger.info(f"Weeks missing images: {missing_weeks}")
            
            generated_weeks = []
            for week_start in missing_weeks:
                logger.info(f"🔄 Generating images for week {week_start}")
                
                # Get tracks for this week
                tracks_response = supabase.table('tracks').select('*').eq('week_start', week_start).execute()
                if not tracks_response.data:
                    logger.warning(f"No tracks found for week {week_start}")
                    continue
                
                tracks = tracks_response.data
                logger.info(f"Found {len(tracks)} tracks for week {week_start}")
                
                # Generate images for this week
                results = self.generate_all_images('output')
                if results:
                    generated_weeks.append(week_start)
                    logger.info(f"✅ Generated images for week {week_start}")
                else:
                    logger.error(f"❌ Failed to generate images for week {week_start}")
            
            return generated_weeks
            
        except Exception as e:
            logger.error(f"❌ Error generating images for existing weeks: {e}")
            return []

def main():
    """Main function to run the image generator"""
    # Get API key from environment
    gemini_api_key = os.getenv('GEMINI_API_KEY')
    if not gemini_api_key:
        logger.error("GEMINI_API_KEY environment variable not set")
        logger.info("Please set your Gemini API key:")
        logger.info("export GEMINI_API_KEY='your_api_key_here'")
        return False
    
    # Initialize generator
    generator = InstagramImageGenerator(gemini_api_key)
    
    # Check command line arguments
    import sys
    generate_existing = '--existing' in sys.argv
    
    # Check for --week parameter
    week_start = None
    if '--week' in sys.argv:
        try:
            week_index = sys.argv.index('--week')
            if week_index + 1 < len(sys.argv):
                week_start = sys.argv[week_index + 1]
                logger.info(f"🎯 Generating images for specific week: {week_start}")
            else:
                logger.error("❌ --week parameter requires a week_start value")
                return False
        except (ValueError, IndexError):
            logger.error("❌ Invalid --week parameter")
            return False
    
    if week_start:
        # Generate images for specific week
        logger.info(f"🚀 Generating images for week {week_start}...")
        
        # Get tracks for this week from Supabase
        if not supabase:
            logger.error("❌ Supabase not available")
            return False
            
        try:
            tracks_response = supabase.table('tracks').select('*').eq('week_start', week_start).execute()
            if not tracks_response.data:
                logger.error(f"❌ No tracks found for week {week_start}")
                return False
                
            tracks = tracks_response.data
            logger.info(f"📊 Found {len(tracks)} tracks for week {week_start}")
            
            # Generate images for this week
            results = generator.generate_all_images('output', tracks_data=tracks)
            
            if results:
                logger.info("🎉 Image generation completed successfully!")
                for image_type, path in results.items():
                    logger.info(f"📸 {image_type}: {path}")
                return True
            else:
                logger.error("❌ No images were generated")
                return False
                
        except Exception as e:
            logger.error(f"❌ Error generating images for week {week_start}: {e}")
            return False
            
    elif generate_existing:
        logger.info("🔄 Generating images for existing weeks...")
        generated_weeks = generator.generate_images_for_existing_weeks()
        if generated_weeks:
            logger.info(f"✅ Generated images for {len(generated_weeks)} weeks: {generated_weeks}")
            return True
        else:
            logger.info("ℹ️ No weeks needed image generation")
            return True
    else:
        # Generate images for current week
        logger.info("🚀 Starting Instagram image generation...")
        results = generator.generate_all_images()
        
        if results:
            logger.info("🎉 Image generation completed successfully!")
            for image_type, path in results.items():
                logger.info(f"📸 {image_type}: {path}")
            return True
        else:
            logger.error("❌ No images were generated")
            return False

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
