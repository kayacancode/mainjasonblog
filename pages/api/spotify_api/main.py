"""
New Music Friday Instagram Automation
Main automation script for generating Instagram content from Spotify playlists
"""

import json
import logging
import os
from datetime import datetime
from typing import Dict, List, Optional, Tuple

import requests
import spotipy
from config import SpotifyConfig
from hybrid_approach import HybridSpotifyFetcher
from PIL import Image, ImageDraw, ImageFont
from spotipy.oauth2 import SpotifyClientCredentials, SpotifyOAuth

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

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
                redirect_uri=os.getenv('SPOTIFY_REDIRECT_URI', 'http://127.0.0.1:8080/callback'),
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
    
    def create_collage(self, tracks: List[Dict], output_filename: str = "nmf_collage.png") -> str:
        """
        Create a collage of album art from tracks
        
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
            
            # Download and process album art
            album_image = placeholder.copy()
            if track.get('album_art_url'):
                art_filename = f"art_{track['id']}.jpg"
                art_path = self.download_album_art(track['album_art_url'], art_filename)
                
                if art_path and os.path.exists(art_path):
                    try:
                        album_image = Image.open(art_path)
                        album_image = album_image.resize((album_size, album_size), Image.Resampling.LANCZOS)
                        # Clean up downloaded file
                        os.remove(art_path)
                    except Exception as e:
                        logger.warning(f"⚠️ Error processing album art for {track['name']}: {e}")
            
            # Paste album art onto canvas
            canvas.paste(album_image, (x, y))
        
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
        
        # Sort tracks by popularity
        sorted_tracks = sorted(tracks[:self.config.TRACK_LIMIT], 
                             key=lambda x: x.get('popularity', 0), reverse=True)
        
        # Load fonts
        try:
            title_font = ImageFont.truetype("Arial.ttf", 32) if os.name == 'nt' else ImageFont.load_default()
            track_font = ImageFont.truetype("Arial.ttf", 18) if os.name == 'nt' else ImageFont.load_default()
            artist_font = ImageFont.truetype("Arial.ttf", 14) if os.name == 'nt' else ImageFont.load_default()
        except:
            title_font = ImageFont.load_default()
            track_font = ImageFont.load_default()
            artist_font = ImageFont.load_default()
        
        # Title section
        title = f"Top {len(sorted_tracks)} Tracks"
        subtitle = f"New Music Friday - {datetime.now().strftime('%B %d, %Y')}"
        
        # Title background
        title_height = 100
        draw.rectangle([0, 0, canvas_width, title_height], fill=self.config.SPOTIFY_GREEN)
        
        # Center title text
        title_bbox = draw.textbbox((0, 0), title, font=title_font)
        title_width = title_bbox[2] - title_bbox[0]
        title_x = (canvas_width - title_width) // 2
        
        subtitle_bbox = draw.textbbox((0, 0), subtitle, font=artist_font)
        subtitle_width = subtitle_bbox[2] - subtitle_bbox[0]
        subtitle_x = (canvas_width - subtitle_width) // 2
        
        draw.text((title_x, 20), title, fill=self.config.SPOTIFY_WHITE, font=title_font)
        draw.text((subtitle_x, 60), subtitle, fill=self.config.SPOTIFY_WHITE, font=artist_font)
        
        # Track list
        y_offset = title_height + 30
        line_height = 35
        margin = 30
        
        for i, track in enumerate(sorted_tracks[:20]):  # Limit to top 20
            track_y = y_offset + i * line_height
            
            # Track number
            number_text = f"{i+1:2d}."
            draw.text((margin, track_y), number_text, fill=self.config.SPOTIFY_GRAY, font=track_font)
            
            # Track name (truncate if too long and clean encoding)
            track_name = track['name']
            # Replace problematic characters
            track_name = track_name.replace('\u201c', '"').replace('\u201d', '"').replace('\u2018', "'").replace('\u2019', "'")
            if len(track_name) > 25:
                track_name = track_name[:25] + "..."
            
            draw.text((margin + 40, track_y), track_name, fill=self.config.SPOTIFY_WHITE, font=track_font)
            
            # Artist name (clean encoding)
            artist_name = track['artist']
            artist_name = artist_name.replace('\u201c', '"').replace('\u201d', '"').replace('\u2018', "'").replace('\u2019', "'")
            if len(artist_name) > 30:
                artist_name = artist_name[:30] + "..."
            
            draw.text((margin + 40, track_y + 18), artist_name, fill=self.config.SPOTIFY_GRAY, font=artist_font)
        
        # Footer
        footer_text = f"Generated with love - {len(tracks)} tracks total"
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
        
        # Create collage
        collage_filename = f"nmf_collage_{timestamp}.png"
        collage_path = self.create_collage(unique_tracks, collage_filename)
        
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
        
        results = {
            'track_count': len(unique_tracks),
            'collage_image': collage_path,
            'tracklist_image': tracklist_path,
            'caption': caption,
            'caption_file': caption_path,
            'data_file': data_path,
            'generated_at': datetime.now().isoformat()
        }
        
        logger.info("🎉 Automation completed successfully!")
        logger.info(f"📸 Collage: {collage_path}")
        logger.info(f"📋 Tracklist: {tracklist_path}")
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
            print(f"📸 Collage: {results['collage_image']}")
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