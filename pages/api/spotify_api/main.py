"""
New Music Friday Instagram Automation
Main automation script for generating Instagram content from Spotify playlists
"""

import json
import logging
import os
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple

import requests
import spotipy
from hybrid_approach import HybridSpotifyFetcher
from PIL import Image, ImageDraw, ImageFont
from spotipy.oauth2 import SpotifyClientCredentials, SpotifyOAuth
from supabase import Client, create_client

# Load environment variables from .env file
try:
    from dotenv import load_dotenv

    # Load .env file from the main project directory (three levels up from this file)
    env_path = os.path.join(os.path.dirname(__file__), '..', '..', '..', '.env')
    load_dotenv(env_path)
    # Reload the config after loading environment variables
    import importlib

    import config
    importlib.reload(config)
    from config import SpotifyConfig
except ImportError:
    # If python-dotenv is not installed, continue without it
    from config import SpotifyConfig

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize Supabase client
# Try environment variables first, then fall back to hardcoded credentials
SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_KEY')

# Fallback to hardcoded credentials if environment variables are not available
if not SUPABASE_URL or not SUPABASE_KEY:
    SUPABASE_URL = "https://yxziaumwnvyswnqfyosh.supabase.co"
    SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4emlhdW13bnZ5c3ducWZ5b3NoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTAxOTcxOSwiZXhwIjoyMDcwNTk1NzE5fQ.vZUvnae2z3UyAirkc2c21cqAByK14bqg3HRtEs0LxXg"
    logger.info("🔍 Using hardcoded Supabase credentials for consistency")

supabase: Optional[Client] = None

if SUPABASE_URL and SUPABASE_KEY:
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        logger.info("✅ Supabase client initialized")
    except Exception as e:
        logger.warning(f"⚠️ Failed to initialize Supabase: {e}")
        supabase = None
else:
    logger.warning("⚠️ Supabase credentials not found, images will only be saved locally")

class SpotifyNewMusicAutomation:
    """Main automation class for New Music Friday Instagram content generation"""
    
    def __init__(self, client_id: str, client_secret: str):
        """
        Initialize the automation with Spotify credentials
        
        Args:
            client_id: Spotify Client ID
            client_secret: Spotify Client Secret
        """
        self.client_id = client_id
        self.client_secret = client_secret
        self.spotify = None
        self.config = SpotifyConfig()
        
        # Ensure output directory exists
        os.makedirs(self.config.OUTPUT_DIR, exist_ok=True)
        
        # Initialize Spotify client
        self._initialize_spotify_client()
    
    def _initialize_spotify_client(self) -> None:
        """Initialize the Spotify client with user authorization"""
        try:
            # Use OAuth for user authorization (required for personal playlists)
            scope = "playlist-read-private playlist-read-collaborative user-library-read"
            auth_manager = SpotifyOAuth(
                client_id=self.client_id,
                client_secret=self.client_secret,
                redirect_uri=os.getenv('SPOTIPY_REDIRECT_URI', 'http://127.0.0.1:8080/callback'),
                scope=scope,
                cache_path=".spotify_cache"
            )
            
            self.spotify = spotipy.Spotify(
                auth_manager=auth_manager,
                requests_timeout=self.config.REQUEST_TIMEOUT
            )
            
            # Test the connection
            user = self.spotify.current_user()
            logger.info(f"✅ Spotify client initialized successfully for user: {user['display_name']}")
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize Spotify client: {e}")
            logger.info("💡 Make sure to authorize the app in your browser when prompted")
            raise
    
    def get_playlist_tracks(self, playlist_id: str, limit: int = None) -> List[Dict]:
        """
        Get tracks from a Spotify playlist
        
        Args:
            playlist_id: Spotify playlist ID
            limit: Maximum number of tracks to retrieve
            
        Returns:
            List of track dictionaries with metadata
        """
        try:
            limit = limit or self.config.TRACK_LIMIT
            logger.info(f"🎵 Fetching tracks from playlist: {playlist_id}")
            
            results = self.spotify.playlist_tracks(
                playlist_id, 
                limit=limit,
                fields="items(track(id,name,artists,album(name,images),popularity))"
            )
            
            tracks = []
            for item in results['items']:
                if item['track'] and item['track']['id']:  # Skip local tracks
                    track_data = self._extract_track_data(item['track'])
                    if track_data:
                        tracks.append(track_data)
            
            logger.info(f"✅ Successfully retrieved {len(tracks)} tracks")
            return tracks
            
        except Exception as e:
            logger.error(f"❌ Error fetching playlist tracks: {e}")
            return []
    
    def _extract_track_data(self, track: Dict) -> Optional[Dict]:
        """
        Extract relevant data from a Spotify track object
        
        Args:
            track: Spotify track object
            
        Returns:
            Cleaned track data dictionary
        """
        try:
            # Get album art URL (highest quality available)
            album_art_url = None
            if track.get('album', {}).get('images'):
                # Sort by size (width) and get the largest
                images = track['album']['images']
                images.sort(key=lambda x: x.get('width', 0), reverse=True)
                album_art_url = images[0]['url']
            
            return {
                'id': track['id'],
                'name': track['name'],
                'artist': ', '.join([artist['name'] for artist in track.get('artists', [])]),
                'artist_ids': [artist['id'] for artist in track.get('artists', [])],
                'album': track.get('album', {}).get('name', ''),
                'popularity': track.get('popularity', 0),
                'album_art_url': album_art_url,
                'spotify_url': f"https://open.spotify.com/track/{track['id']}"
            }
        except Exception as e:
            logger.warning(f"⚠️ Error extracting track data: {e}")
            return None
    
    def download_album_art(self, url: str, filename: str) -> Optional[str]:
        """
        Download album art from URL
        
        Args:
            url: Album art URL
            filename: Local filename to save to
            
        Returns:
            Local file path if successful, None otherwise
        """
        if not url:
            return None
            
        try:
            response = requests.get(url, timeout=self.config.REQUEST_TIMEOUT)
            response.raise_for_status()
            
            filepath = os.path.join(self.config.OUTPUT_DIR, filename)
            with open(filepath, 'wb') as f:
                f.write(response.content)
            
            return filepath
            
        except Exception as e:
            logger.warning(f"⚠️ Failed to download album art: {e}")
            return None
    
    def get_artist_image_url(self, artist_id: str, spotify_client) -> Optional[str]:
        """
        Get artist image URL from Spotify API
        
        Args:
            artist_id: Spotify artist ID
            spotify_client: Spotify client instance
            
        Returns:
            Artist image URL if found, None otherwise
        """
        try:
            artist = spotify_client.artist(artist_id)
            images = artist.get('images', [])
            
            # Get the largest image available
            if images:
                # Sort by width (largest first)
                images.sort(key=lambda x: x.get('width', 0), reverse=True)
                return images[0]['url']
            
            return None
            
        except Exception as e:
            logger.warning(f"⚠️ Failed to get artist image for {artist_id}: {e}")
            return None
    
    def download_artist_image(self, url: str, filename: str) -> Optional[str]:
        """
        Download artist image from URL
        
        Args:
            url: Artist image URL
            filename: Local filename to save to
            
        Returns:
            Local file path if successful, None otherwise
        """
        if not url:
            return None
            
        try:
            response = requests.get(url, timeout=self.config.REQUEST_TIMEOUT)
            response.raise_for_status()
            
            filepath = os.path.join(self.config.OUTPUT_DIR, filename)
            with open(filepath, 'wb') as f:
                f.write(response.content)
            
            return filepath
            
        except Exception as e:
            logger.warning(f"⚠️ Failed to download artist image: {e}")
            return None
    
    def create_single_artist_image(self, track: Dict, spotify_client, output_filename: str = "nmf_single_artist.png") -> str:
        """
        Create a single artist image with "New Music Friday" overlay
        
        Args:
            track: Track dictionary with artist information
            output_filename: Output filename for the image
            
        Returns:
            Path to the generated image
        """
        # Try to get artist ID from track, fallback to searching by name
        artist_id = None
        if track.get('artist_ids') and track['artist_ids']:
            artist_id = track['artist_ids'][0]
        else:
            # If no artist_ids, try to search for the artist by name
            try:
                artist_name = track.get('artist', '').split(',')[0].strip()  # Get first artist if multiple
                search_results = spotify_client.search(q=f'artist:"{artist_name}"', type='artist', limit=1)
                if search_results['artists']['items']:
                    artist_id = search_results['artists']['items'][0]['id']
                    logger.info(f"Found artist ID for {artist_name}: {artist_id}")
            except Exception as e:
                logger.warning(f"Could not find artist ID for {track.get('artist', 'Unknown')}: {e}")
        
        if not artist_id:
            logger.warning("⚠️ No artist ID found for track")
            return None
            
        # Get the artist's image
        artist_image_url = self.get_artist_image_url(artist_id, spotify_client)
        
        if not artist_image_url:
            logger.warning(f"⚠️ No artist image found for artist ID: {artist_id}")
            return None
        
        try:
            # Download artist image
            art_filename = f"artist_{artist_id}.jpg"
            art_path = self.download_artist_image(artist_image_url, art_filename)
            
            if not art_path or not os.path.exists(art_path):
                logger.warning(f"⚠️ Failed to download artist image for {track['name']}")
                return None
            
            # Open and process the artist image
            artist_image = Image.open(art_path)
            
            # Resize to Instagram-friendly dimensions (1080x1080)
            target_size = (1080, 1080)
            artist_image = artist_image.resize(target_size, Image.Resampling.LANCZOS)
            
            # Create overlay with branding similar to the reference
            overlay = Image.new('RGBA', target_size, (0, 0, 0, 0))
            draw_overlay = ImageDraw.Draw(overlay)

            # Colors
            off_white = (232, 220, 207, 255)  # beige/cream title color
            light_gray = (210, 210, 210, 255)
            pure_white = (255, 255, 255, 255)
            brand_red = (226, 62, 54, 255)

            # Fonts (prefer Helvetica Neue Bold / Condensed Bold on macOS)
            def load_font_prefer_helvetica(size: int, condensed: bool = False):
                candidates = [
                    ("/System/Library/Fonts/HelveticaNeue.ttc", [0, 1, 2, 3, 4, 5, 6, 7, 8]),
                    ("/System/Library/Fonts/Helvetica.ttc", [0, 1, 2, 3, 4, 5]),
                    ("/Library/Fonts/HelveticaNeue.ttc", [0, 1, 2, 3, 4, 5, 6]),
                    ("/System/Library/Fonts/Supplemental/HelveticaNeue.ttc", [0, 1, 2, 3, 4, 5, 6]),
                    ("/Library/Fonts/Arial Bold.ttf", [0]),
                    ("Arial.ttf", [0])
                ]
                # Try specific TTC indexes first (heuristics)
                # For bold fonts: prioritize Bold (index 2), then Heavy (index 3), then Medium (index 1)
                # Avoid italic fonts (typically higher indexes like 6, 7, 8)
                index_order = [2, 3, 1, 4, 5, 0] if condensed else [2, 3, 1, 4, 5, 0]
                for path, idxs in candidates:
                    if os.path.exists(path):
                        for idx in index_order:
                            if idx in idxs:
                                try:
                                    return ImageFont.truetype(path, size=size, index=idx)
                                except Exception:
                                    continue
                        try:
                            return ImageFont.truetype(path, size=size)
                        except Exception:
                            continue
                return ImageFont.load_default()

            # Larger/bolder sizes
            title_font = load_font_prefer_helvetica(150, condensed=False)   # top artist name
            name_font = load_font_prefer_helvetica(92, condensed=False)     # bottom-left lines
            stacked_font_big = load_font_prefer_helvetica(92, condensed=False)   # NEW - bold not condensed
            stacked_font_small = load_font_prefer_helvetica(92, condensed=False) # MUSIC/FRIDAY - bold not condensed

            # Rounded white border
            radius = 40
            margin = 28
            draw_overlay.rounded_rectangle(
                [(margin, margin), (target_size[0]-margin, target_size[1]-margin)],
                radius=radius,
                outline=pure_white,
                width=18
            )

            # Artist name at top - Smart dynamic sizing with proper line breaking
            artist_name = (track['artist'] or "").upper()
            
            # Calculate available width for artist name (full width minus margins)
            available_width = target_size[0] - (margin * 2) - 40  # Leave 40px margin on each side
            artist_font_size = 120
            
            # Find the optimal font size that fits
            while artist_font_size > 60:  # Minimum font size
                test_font = load_font_prefer_helvetica(artist_font_size, condensed=False)
                test_bbox = draw_overlay.textbbox((0, 0), artist_name, font=test_font)
                test_width = test_bbox[2] - test_bbox[0]
                
                if test_width <= available_width:
                    break
                artist_font_size -= 10
            
            # If still too long, try two lines with proper word breaking
            if artist_font_size <= 60:
                artist_font_size = 80
                words = artist_name.split()
                lines = []
                current_line = ""
                
                for word in words:
                    test_line = current_line + (" " if current_line else "") + word
                    test_font = load_font_prefer_helvetica(artist_font_size, condensed=False)
                    test_bbox = draw_overlay.textbbox((0, 0), test_line, font=test_font)
                    test_width = test_bbox[2] - test_bbox[0]
                    
                    if test_width <= available_width:
                        current_line = test_line
                    else:
                        if current_line:
                            lines.append(current_line)
                            current_line = word
                        else:
                            # Single word too long, truncate it
                            lines.append(word[:20] + "...")
                            current_line = ""
                
                if current_line:
                    lines.append(current_line)
            else:
                lines = [artist_name]
            
            # Create final font
            dynamic_title_font = load_font_prefer_helvetica(artist_font_size, condensed=False)
            
            # Position artist name at top, centered
            if len(lines) == 1:
                # Single line - center it
                name_bbox = draw_overlay.textbbox((0, 0), lines[0], font=dynamic_title_font)
                name_w = name_bbox[2] - name_bbox[0]
                name_x = (target_size[0] - name_w) // 2
                name_y = margin + 40
                draw_overlay.text((name_x, name_y), lines[0], fill=off_white, font=dynamic_title_font, stroke_width=3, stroke_fill=(0,0,0,160))
            else:
                # Multiple lines - center each line
                line_height = 0
                for line in lines:
                    bbox = draw_overlay.textbbox((0, 0), line, font=dynamic_title_font)
                    line_height = max(line_height, bbox[3] - bbox[1])
                
                total_height = (line_height + 15) * len(lines)
                start_y = margin + 40
                
                for i, line in enumerate(lines):
                    line_bbox = draw_overlay.textbbox((0, 0), line, font=dynamic_title_font)
                    line_w = line_bbox[2] - line_bbox[0]
                    line_x = (target_size[0] - line_w) // 2
                    line_y = start_y + (i * (line_height + 15))
                    draw_overlay.text((line_x, line_y), line, fill=off_white, font=dynamic_title_font, stroke_width=3, stroke_fill=(0,0,0,160))

            # Track title in bottom left - Smart sizing and line breaking
            track_title = (track['name'] or "").upper()
            
            # Calculate available space for track title (left side)
            available_width = (target_size[0] // 2) - margin - 20  # Left half minus margin
            track_font_size = 90
            
            # Find optimal font size that fits
            while track_font_size > 50:  # Minimum font size
                test_font = load_font_prefer_helvetica(track_font_size, condensed=False)
                test_bbox = draw_overlay.textbbox((0, 0), track_title, font=test_font)
                test_width = test_bbox[2] - test_bbox[0]
                
                if test_width <= available_width:
                    break
                track_font_size -= 5
            
            # If still too long, try two lines with proper word breaking
            if track_font_size <= 50:
                track_font_size = 70
                words = track_title.split()
                lines = []
                current_line = ""
                
                for word in words:
                    test_line = current_line + (" " if current_line else "") + word
                    test_font = load_font_prefer_helvetica(track_font_size, condensed=False)
                    test_bbox = draw_overlay.textbbox((0, 0), test_line, font=test_font)
                    test_width = test_bbox[2] - test_bbox[0]
                    
                    if test_width <= available_width:
                        current_line = test_line
                    else:
                        if current_line:
                            lines.append(current_line)
                            current_line = word
                        else:
                            # Single word too long, truncate it
                            lines.append(word[:15] + "...")
                            current_line = ""
                
                if current_line:
                    lines.append(current_line)
            else:
                lines = [track_title]
            
            # Create final font
            dynamic_track_font = load_font_prefer_helvetica(track_font_size, condensed=False)

            # Position track title in bottom left
            l_margin = margin + 20
            b_margin = margin + 100  # Space from bottom
            
            # Calculate total height needed for all lines
            line_height = 0
            for line in lines:
                bbox = draw_overlay.textbbox((0, 0), line, font=dynamic_track_font)
                line_height = max(line_height, bbox[3] - bbox[1])
            
            total_height = (line_height + 20) * len(lines)  # 20px spacing between lines
            start_y = target_size[1] - b_margin - total_height
            
            # Draw each line
            for i, line in enumerate(lines):
                y_pos = start_y + (i * (line_height + 20))
                draw_overlay.text((l_margin, y_pos), line, fill=off_white, font=dynamic_track_font, stroke_width=2, stroke_fill=(0,0,0,150))

            # Bottom-right stacked NEW / MUSIC / FRIDAY - Positioned in bottom right
            r_margin = margin + 40
            
            # Use appropriate fonts for bottom positioning
            stacked_font_big = load_font_prefer_helvetica(65, condensed=False)
            stacked_font_small = load_font_prefer_helvetica(55, condensed=False)
            
            words_stack = [
                ("NEW", brand_red, stacked_font_big),
                ("MUSIC", light_gray, stacked_font_small),
                ("FRIDAY", light_gray, stacked_font_small),
            ]
            
            # Calculate total height needed
            total_height = 0
            heights = []
            for w, color, fnt in words_stack:
                bbox = draw_overlay.textbbox((0,0), w, font=fnt)
                h = bbox[3] - bbox[1]
                heights.append(h)
                total_height += h + 15  # 15px spacing between words
            
            # Position in bottom right corner
            x_right = target_size[0] - r_margin
            y_start = target_size[1] - margin - total_height - 30  # Space from bottom
            
            y = y_start
            for (w, color, fnt), h in zip(words_stack, heights):
                bbox = draw_overlay.textbbox((0,0), w, font=fnt)
                w_px = bbox[2]-bbox[0]
                x = x_right - w_px
                draw_overlay.text((x, y), w, fill=color, font=fnt, stroke_width=2, stroke_fill=(0,0,0,150))
                y += h + 15
            
            # Create a translucent black overlay to improve text readability
            black_overlay = Image.new('RGBA', target_size, (0, 0, 0, 80))  # 80/255 = ~31% opacity
            
            # Composite the overlays onto the artist image
            artist_image = artist_image.convert('RGBA')
            # First apply the black overlay
            artist_image = Image.alpha_composite(artist_image, black_overlay)
            # Then apply the text overlay
            final_image = Image.alpha_composite(artist_image, overlay)
            final_image = final_image.convert('RGB')
            
            # Save the final image
            output_path = os.path.join(self.config.OUTPUT_DIR, output_filename)
            final_image.save(output_path, 'PNG', quality=95)
            
            # Clean up downloaded file
            os.remove(art_path)
            
            logger.info(f"✅ Single artist image saved to: {output_path}")
            return output_path
            
        except Exception as e:
            logger.error(f"❌ Error creating single artist image: {e}")
            if art_path and os.path.exists(art_path):
                os.remove(art_path)
            return None

    def create_collage(self, tracks: List[Dict], output_filename: str = "nmf_collage.png") -> str:
        """
        Create a collage of artist images with "New Music Friday" overlay from tracks
        
        Args:
            tracks: List of track dictionaries
            output_filename: Output filename for the collage
            
        Returns:
            Path to the generated collage image
        """
        logger.info("🎨 Creating album art collage...")
        
        cols, rows = self.config.COLLAGE_GRID
        album_size = self.config.ALBUM_ART_SIZE
        canvas_width, canvas_height = self.config.CANVAS_SIZE
        
        # Create canvas
        canvas = Image.new('RGB', (canvas_width, canvas_height), self.config.SPOTIFY_BLACK)
        draw = ImageDraw.Draw(canvas)
        
        # Calculate spacing
        total_album_width = cols * album_size
        total_album_height = rows * album_size
        margin_x = (canvas_width - total_album_width) // 2
        margin_y = (canvas_height - total_album_height) // 2
        
        # Process tracks (limit to grid size)
        max_tracks = cols * rows
        tracks_to_use = tracks[:max_tracks]
        
        # Create placeholder image for missing album art
        placeholder = Image.new('RGB', (album_size, album_size), self.config.SPOTIFY_GRAY)
        placeholder_draw = ImageDraw.Draw(placeholder)
        
        try:
            # Try to load a default font, fallback to default if not available
            font = ImageFont.truetype("Arial.ttf", 12) if os.name == 'nt' else ImageFont.load_default()
        except:
            font = ImageFont.load_default()
        
        placeholder_draw.text((album_size//2, album_size//2), "?", 
                            fill=self.config.SPOTIFY_WHITE, 
                            anchor="mm", font=font)
        
        for i, track in enumerate(tracks_to_use):
            row = i // cols
            col = i % cols
            
            x = margin_x + col * album_size
            y = margin_y + row * album_size
            
            # Download and process artist image
            artist_image = placeholder.copy()
            if track.get('artist_ids') and track['artist_ids']:
                # Get the first artist's image
                artist_id = track['artist_ids'][0]
                artist_image_url = self.get_artist_image_url(artist_id)
                
                if artist_image_url:
                    art_filename = f"artist_{artist_id}.jpg"
                    art_path = self.download_artist_image(artist_image_url, art_filename)
                    
                    if art_path and os.path.exists(art_path):
                        try:
                            artist_image = Image.open(art_path)
                            artist_image = artist_image.resize((album_size, album_size), Image.Resampling.LANCZOS)
                            
                            # Create overlay with "New Music Friday" text
                            overlay = Image.new('RGBA', (album_size, album_size), (0, 0, 0, 0))
                            draw_overlay = ImageDraw.Draw(overlay)
                            
                            # Create semi-transparent background for text
                            text_bg = Image.new('RGBA', (album_size, 40), (0, 0, 0, 150))
                            overlay.paste(text_bg, (0, album_size - 40))
                            
                            # Add "New Music Friday" text
                            try:
                                text_font = ImageFont.truetype("Arial.ttf", 12) if os.name == 'nt' else ImageFont.load_default()
                            except:
                                text_font = ImageFont.load_default()
                            
                            text = "New Music Friday"
                            text_bbox = draw_overlay.textbbox((0, 0), text, font=text_font)
                            text_width = text_bbox[2] - text_bbox[0]
                            text_x = (album_size - text_width) // 2
                            text_y = album_size - 35
                            
                            draw_overlay.text((text_x, text_y), text, fill=(255, 255, 255, 255), font=text_font)
                            
                            # Composite the overlay onto the artist image
                            artist_image = artist_image.convert('RGBA')
                            artist_image = Image.alpha_composite(artist_image, overlay)
                            artist_image = artist_image.convert('RGB')
                            
                            # Clean up downloaded file
                            os.remove(art_path)
                        except Exception as e:
                            logger.warning(f"⚠️ Error processing artist image for {track['name']}: {e}")
            
            # Paste artist image onto canvas
            canvas.paste(artist_image, (x, y))
        
        # Add title
        try:
            title_font = ImageFont.truetype("Arial.ttf", 36) if os.name == 'nt' else ImageFont.load_default()
        except:
            title_font = ImageFont.load_default()
        
        title = f"New Music Friday - {datetime.now().strftime('%B %d, %Y')}"
        title_bbox = draw.textbbox((0, 0), title, font=title_font)
        title_width = title_bbox[2] - title_bbox[0]
        title_x = (canvas_width - title_width) // 2
        
        # Add background for title
        title_bg_height = 60
        draw.rectangle([0, 0, canvas_width, title_bg_height], fill=self.config.SPOTIFY_GREEN)
        draw.text((title_x, 15), title, fill=self.config.SPOTIFY_WHITE, font=title_font)
        
        # Save collage
        output_path = os.path.join(self.config.OUTPUT_DIR, output_filename)
        canvas.save(output_path, 'PNG', quality=95)
        
        logger.info(f"✅ Collage saved to: {output_path}")
        return output_path
    
    def create_tracklist_image(self, tracks: List[Dict], output_filename: str = "nmf_tracklist.png") -> str:
        """
        Create a tracklist image with track names and artists
        
        Args:
            tracks: List of track dictionaries
            output_filename: Output filename for the tracklist
            
        Returns:
            Path to the generated tracklist image
        """
        logger.info("📋 Creating tracklist image...")
        
        canvas_width, canvas_height = self.config.CANVAS_SIZE
        canvas = Image.new('RGB', (canvas_width, canvas_height), self.config.SPOTIFY_BLACK)
        draw = ImageDraw.Draw(canvas)
        
        # Sort tracks by popularity - limit to top 10
        sorted_tracks = sorted(tracks[:10], 
                             key=lambda x: x.get('popularity', 0), reverse=True)
        
        # Load fonts using same Helvetica Neue Bold as single artist image
        def load_font_prefer_helvetica(size: int, condensed: bool = False):
            candidates = [
                ("/System/Library/Fonts/HelveticaNeue.ttc", [0, 1, 2, 3, 4, 5, 6, 7, 8]),
                ("/System/Library/Fonts/Helvetica.ttc", [0, 1, 2, 3, 4, 5]),
                ("/Library/Fonts/HelveticaNeue.ttc", [0, 1, 2, 3, 4, 5, 6]),
                ("/System/Library/Fonts/Supplemental/HelveticaNeue.ttc", [0, 1, 2, 3, 4, 5, 6]),
                ("/Library/Fonts/Arial Bold.ttf", [0]),
                ("Arial.ttf", [0])
            ]
            # Try specific TTC indexes first (heuristics)
            # For bold fonts: prioritize Bold (index 2), then Heavy (index 3), then Medium (index 1)
            # Avoid italic fonts (typically higher indexes like 6, 7, 8)
            index_order = [2, 3, 1, 4, 5, 0] if condensed else [2, 3, 1, 4, 5, 0]
            for path, idxs in candidates:
                if os.path.exists(path):
                    for idx in index_order:
                        if idx in idxs:
                            try:
                                return ImageFont.truetype(path, size=size, index=idx)
                            except Exception:
                                continue
                    try:
                        return ImageFont.truetype(path, size=size)
                    except Exception:
                        continue
            return ImageFont.load_default()

        # Bigger font sizes for tracklist
        title_font = load_font_prefer_helvetica(48, condensed=False)    # Main title - bigger
        track_font = load_font_prefer_helvetica(36, condensed=False)    # Track names - much bigger
        artist_font = load_font_prefer_helvetica(28, condensed=False)   # Artist names - bigger
        
        # Title section
        title = f"Top {len(sorted_tracks)} Tracks"
        subtitle = f"New Music Friday - {datetime.now().strftime('%B %d, %Y')}"
        
        # Title background - use same red as "NEW" from artist image
        brand_red = (226, 62, 54)
        title_height = 100
        draw.rectangle([0, 0, canvas_width, title_height], fill=brand_red)
        
        # Center title text
        title_bbox = draw.textbbox((0, 0), title, font=title_font)
        title_width = title_bbox[2] - title_bbox[0]
        title_x = (canvas_width - title_width) // 2
        
        subtitle_bbox = draw.textbbox((0, 0), subtitle, font=artist_font)
        subtitle_width = subtitle_bbox[2] - subtitle_bbox[0]
        subtitle_x = (canvas_width - subtitle_width) // 2
        
        draw.text((title_x, 20), title, fill=self.config.SPOTIFY_WHITE, font=title_font)
        draw.text((subtitle_x, 60), subtitle, fill=self.config.SPOTIFY_WHITE, font=artist_font)
        
        # Track list - balanced padding
        y_offset = title_height + 50  # Moderate padding under title
        line_height = 70  # Balanced line height for good spacing
        margin = 40  # Standard margin
        
        for i, track in enumerate(sorted_tracks):  # Only top 10 tracks
            track_y = y_offset + i * line_height
            
            # Track number - larger and better positioned
            number_text = f"{i+1:2d}."
            draw.text((margin, track_y), number_text, fill=self.config.SPOTIFY_GRAY, font=track_font)
            
            # Track name (truncate if too long and clean encoding) - Dynamic sizing
            track_name = track['name']
            # Replace problematic characters
            track_name = track_name.replace('\u201c', '"').replace('\u201d', '"').replace('\u2018', "'").replace('\u2019', "'")
            
            # Dynamic font sizing for track names
            if len(track_name) > 30:
                track_name = track_name[:30] + "..."
                dynamic_track_font_size = 28
            elif len(track_name) > 25:
                dynamic_track_font_size = 32
            elif len(track_name) > 20:
                dynamic_track_font_size = 34
            else:
                dynamic_track_font_size = 36
            
            # Create dynamic font for track name
            dynamic_track_font = load_font_prefer_helvetica(dynamic_track_font_size, condensed=False)
            
            # Position track name with minimal padding
            track_y_pos = track_y + 5  # Minimal padding from the line
            draw.text((margin + 50, track_y_pos), track_name, fill=self.config.SPOTIFY_WHITE, font=dynamic_track_font)
            
            # Artist name (clean encoding) - add consistent spacing from track name
            artist_name = track['artist']
            artist_name = artist_name.replace('\u201c', '"').replace('\u201d', '"').replace('\u2018', "'").replace('\u2019', "'")
            
            # Dynamic font sizing for artist names
            if len(artist_name) > 35:
                artist_name = artist_name[:35] + "..."
                dynamic_artist_font_size = 22
            elif len(artist_name) > 30:
                dynamic_artist_font_size = 24
            elif len(artist_name) > 25:
                dynamic_artist_font_size = 26
            else:
                dynamic_artist_font_size = 28
            
            # Create dynamic font for artist name
            dynamic_artist_font = load_font_prefer_helvetica(dynamic_artist_font_size, condensed=False)
            
            # Calculate consistent spacing based on track name height
            track_bbox = draw.textbbox((0, 0), track_name, font=dynamic_track_font)
            track_height = track_bbox[3] - track_bbox[1]
            artist_y_pos = track_y_pos + track_height + 8  # Tighter 8px spacing
            draw.text((margin + 50, artist_y_pos), artist_name, fill=self.config.SPOTIFY_GRAY, font=dynamic_artist_font)
        
        # Footer
        footer_text = "Suave's new music friday recap"
        footer_bbox = draw.textbbox((0, 0), footer_text, font=artist_font)
        footer_width = footer_bbox[2] - footer_bbox[0]
        footer_x = (canvas_width - footer_width) // 2
        
        draw.text((footer_x, canvas_height - 40), footer_text, 
                 fill=self.config.SPOTIFY_GRAY, font=artist_font)
        
        # Save tracklist
        output_path = os.path.join(self.config.OUTPUT_DIR, output_filename)
        canvas.save(output_path, 'PNG', quality=95)
        
        logger.info(f"✅ Tracklist saved to: {output_path}")
        return output_path
    
    def upload_image_to_supabase(self, image_path: str, week_start: str, image_type: str) -> Optional[str]:
        """
        Upload image to Supabase post-images storage and return public URL
        
        Args:
            image_path: Local path to the image file
            week_start: Week start date string (YYYY-MM-DD)
            image_type: Type of image ('cover' or 'tracklist')
            
        Returns:
            Public URL if successful, None otherwise
        """
        if not supabase:
            logger.warning("Supabase not available, skipping upload")
            return None
            
        try:
            if not os.path.exists(image_path):
                logger.error(f"❌ Image file not found: {image_path}")
                return None
            
            # Read image file
            with open(image_path, 'rb') as f:
                image_data = f.read()
            
            # Create filename with week_start and image type
            filename = f"instagram_images/{week_start}_{image_type}_{os.path.basename(image_path)}"
            
            # Upload to Supabase storage
            result = supabase.storage.from_('instagram-images').upload(filename, image_data, {
                'content-type': 'image/png',
                'upsert': 'true'
            })
            
            if result:
                # Get public URL
                public_url = supabase.storage.from_('instagram-images').get_public_url(filename)
                logger.info(f"✅ Image uploaded to Supabase: {public_url}")
                return public_url
            else:
                logger.error(f"❌ Failed to upload image: {filename}")
                return None
                
        except Exception as e:
            logger.error(f"❌ Error uploading image to Supabase: {e}")
            return None
    
    def save_image_metadata(self, week_start: str, cover_url: str, tracklist_url: str) -> bool:
        """
        Save image metadata to Supabase images table with duplicate prevention
        
        Args:
            week_start: Week start date string (YYYY-MM-DD)
            cover_url: Public URL of cover image
            tracklist_url: Public URL of tracklist image
            
        Returns:
            True if successful, False otherwise
        """
        if not supabase:
            logger.warning("Supabase not available, skipping metadata save")
            return False
            
        try:
            # Check if record already exists with images
            existing = supabase.table('images').select('id, cover_image_url, tracklist_image_url').eq('week_start', week_start).execute()
            
            if existing.data and existing.data[0]:
                existing_record = existing.data[0]
                # Check if both images already exist
                if existing_record.get('cover_image_url') and existing_record.get('tracklist_image_url'):
                    logger.info(f"⚠️ Images already exist for week {week_start}, skipping upload to prevent duplicates")
                    return True
                else:
                    # Update existing record with missing images
                    logger.info(f"🔄 Updating existing record for week {week_start}")
                    result = supabase.table('images').update({
                        'cover_image_url': cover_url or existing_record.get('cover_image_url'),
                        'tracklist_image_url': tracklist_url or existing_record.get('tracklist_image_url'),
                        'updated_at': datetime.now().isoformat()
                    }).eq('week_start', week_start).execute()
            else:
                # Insert new record
                logger.info(f"➕ Creating new record for week {week_start}")
                result = supabase.table('images').insert({
                    'week_start': week_start,
                    'cover_image_url': cover_url,
                    'tracklist_image_url': tracklist_url,
                    'created_at': datetime.now().isoformat()
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
    
    def generate_caption(self, tracks: List[Dict]) -> str:
        """
        Generate Instagram caption for the post
        
        Args:
            tracks: List of track dictionaries
            
        Returns:
            Instagram caption string
        """
        # Sort by popularity for top mentions
        top_tracks = sorted(tracks[:10], key=lambda x: x.get('popularity', 0), reverse=True)
        
        caption_parts = [
            f"🎵 New Music Friday - {datetime.now().strftime('%B %d, %Y')}",
            "",
            f"Discovered {len(tracks)} fresh tracks this week! Here are some highlights:",
            ""
        ]
        
        # Add top 5 tracks
        for i, track in enumerate(top_tracks[:5]):
            caption_parts.append(f"{i+1}. {track['name']} - {track['artist']}")
        
        if len(tracks) > 5:
            caption_parts.append(f"...and {len(tracks) - 5} more amazing tracks!")
        
        caption_parts.extend([
            "",
            "Swipe to see the full tracklist! 👉",
            "",
            "#NewMusicFriday #Spotify #Music #NewMusic #MusicDiscovery #Playlist"
        ])
        
        return "\n".join(caption_parts)
    
    def save_track_data(self, tracks: List[Dict], filename: str = None) -> str:
        """
        Save track data to JSON file
        
        Args:
            tracks: List of track dictionaries
            filename: Optional custom filename
            
        Returns:
            Path to saved JSON file
        """
        if not filename:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"nmf_data_{timestamp}.json"
        
        output_path = os.path.join(self.config.OUTPUT_DIR, filename)
        
        data = {
            'generated_at': datetime.now().isoformat(),
            'track_count': len(tracks),
            'tracks': tracks
        }
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        
        logger.info(f"💾 Track data saved to: {output_path}")
        return output_path
    
    def run_automation(self, 
                      use_new_music_friday: bool = True,
                      use_release_radar: bool = False,
                      custom_playlist_id: str = None) -> Dict:
        """
        Run the complete automation workflow using hybrid approach
        
        Args:
            use_new_music_friday: Whether to use New Music Friday playlist
            use_release_radar: Whether to use Release Radar playlist
            custom_playlist_id: Optional custom playlist ID
            
        Returns:
            Dictionary with results and file paths
        """
        logger.info("🚀 Starting New Music Friday automation...")
        
        all_tracks = []
        
        # Use hybrid fetcher to get the playlists
        try:
            hybrid_fetcher = HybridSpotifyFetcher(self.client_id, self.client_secret)
            
            if use_new_music_friday:
                logger.info("📻 Getting New Music Friday tracks (simulation with popular 2024 tracks)...")
                nmf_tracks = hybrid_fetcher.get_new_music_friday_simulation()
                all_tracks.extend(nmf_tracks)
                logger.info(f"✅ Added {len(nmf_tracks)} New Music Friday tracks")
            
            if use_release_radar:
                logger.info("🔄 Getting Release Radar tracks (from your saved playlist)...")
                rr_tracks = hybrid_fetcher.get_release_radar_tracks()
                all_tracks.extend(rr_tracks)
                logger.info(f"✅ Added {len(rr_tracks)} Release Radar tracks")
            
            if custom_playlist_id:
                logger.info(f"🎼 Processing custom playlist: {custom_playlist_id}")
                custom_tracks = self.get_playlist_tracks(custom_playlist_id)
                all_tracks.extend(custom_tracks)
                
        except Exception as e:
            logger.error(f"❌ Error with hybrid fetcher: {e}")
            logger.info("🔄 Falling back to original API method...")
            
            # Fallback to original method
            if use_new_music_friday:
                logger.info("📻 Processing New Music Friday playlist...")
                nmf_tracks = self.get_playlist_tracks(self.config.NEW_MUSIC_FRIDAY_ID)
                all_tracks.extend(nmf_tracks)
            
            if use_release_radar:
                logger.info("🔄 Processing Release Radar playlist...")
                rr_tracks = self.get_playlist_tracks(self.config.RELEASE_RADAR_ID)
                all_tracks.extend(rr_tracks)
            
            if custom_playlist_id:
                logger.info(f"🎼 Processing custom playlist: {custom_playlist_id}")
                custom_tracks = self.get_playlist_tracks(custom_playlist_id)
                all_tracks.extend(custom_tracks)
        
        if not all_tracks:
            logger.error("❌ No tracks found! Check your playlist IDs and credentials.")
            return {}
        
        # Remove duplicates based on track ID
        unique_tracks = []
        seen_ids = set()
        for track in all_tracks:
            if track['id'] not in seen_ids:
                unique_tracks.append(track)
                seen_ids.add(track['id'])
        
        logger.info(f"🎵 Processing {len(unique_tracks)} unique tracks...")
        
        # Generate timestamp for files
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # Calculate week start (Friday)
        today = datetime.now()
        days_since_friday = (today.weekday() - 4) % 7  # 4 = Friday (0=Monday, 4=Friday)
        week_start = today - timedelta(days=days_since_friday)
        week_start_str = week_start.strftime('%Y-%m-%d')
        
        # Create single artist image (using the first track)
        if unique_tracks:
            single_artist_filename = f"nmf_single_artist_{timestamp}.png"
            single_artist_path = self.create_single_artist_image(unique_tracks[0], hybrid_fetcher.spotify, single_artist_filename)
        else:
            single_artist_path = None
        
        # Create tracklist
        tracklist_filename = f"nmf_tracklist_{timestamp}.png"
        tracklist_path = self.create_tracklist_image(unique_tracks, tracklist_filename)
        
        # Generate caption
        caption = self.generate_caption(unique_tracks)
        
        # Save track data
        data_filename = f"nmf_data_{timestamp}.json"
        data_path = self.save_track_data(unique_tracks, data_filename)
        
        # Save caption to file
        caption_filename = f"nmf_caption_{timestamp}.txt"
        caption_path = os.path.join(self.config.OUTPUT_DIR, caption_filename)
        with open(caption_path, 'w', encoding='utf-8') as f:
            f.write(caption)
        
        # Upload images to Supabase and save metadata
        cover_url = None
        tracklist_url = None
        
        if single_artist_path and os.path.exists(single_artist_path):
            cover_url = self.upload_image_to_supabase(single_artist_path, week_start_str, 'cover')
        
        if tracklist_path and os.path.exists(tracklist_path):
            tracklist_url = self.upload_image_to_supabase(tracklist_path, week_start_str, 'tracklist')
        
        # Save image metadata to Supabase
        if cover_url or tracklist_url:
            self.save_image_metadata(week_start_str, cover_url, tracklist_url)
        
        results = {
            'track_count': len(unique_tracks),
            'single_artist_image': single_artist_path,
            'tracklist_image': tracklist_path,
            'cover_url': cover_url,
            'tracklist_url': tracklist_url,
            'week_start': week_start_str,
            'caption': caption,
            'caption_file': caption_path,
            'data_file': data_path,
            'generated_at': datetime.now().isoformat()
        }
        
        logger.info("🎉 Automation completed successfully!")
        logger.info(f"🎨 Single Artist Image: {single_artist_path}")
        logger.info(f"📋 Tracklist: {tracklist_path}")
        if cover_url:
            logger.info(f"☁️ Cover URL: {cover_url}")
        if tracklist_url:
            logger.info(f"☁️ Tracklist URL: {tracklist_url}")
        logger.info(f"📝 Caption: {caption_path}")
        logger.info(f"💾 Data: {data_path}")
        
        return results

def main():
    """Main function for running the automation"""
    # Get credentials from environment or config
    client_id = SpotifyConfig.CLIENT_ID
    client_secret = SpotifyConfig.CLIENT_SECRET
    
    if not client_id or not client_secret:
        print("❌ Error: Spotify credentials not found!")
        print("Please set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET environment variables")
        print("Or update the SpotifyConfig class in config.py")
        return
    
    try:
        # Initialize automation
        automation = SpotifyNewMusicAutomation(client_id, client_secret)
        
        # Run automation
        results = automation.run_automation(
            use_new_music_friday=True,
            use_release_radar=False  # Change to True if you want both playlists
        )
        
        if results:
            print("\n🎉 Success! Generated content:")
            print(f"🎨 Single Artist Image: {results['single_artist_image']}")
            print(f"📋 Tracklist: {results['tracklist_image']}")
            print(f"📝 Caption: {results['caption_file']}")
            print(f"\n📱 Ready for Instagram! Check the 'output' folder.")
        else:
            print("❌ Automation failed. Check the logs above.")
            
    except Exception as e:
        logger.error(f"❌ Automation failed: {e}")
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    main()