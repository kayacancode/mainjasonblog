"""
Enhanced Selenium scraper with album art fetching and popularity filtering
"""

from selenium_scraper import SpotifySeleniumScraper
import spotipy
from spotipy.oauth2 import SpotifyOAuth
from typing import List, Dict
import requests
import json
import time
import logging

logger = logging.getLogger(__name__)

class EnhancedSpotifyAutomation:
    """Enhanced automation that combines Selenium scraping with Spotify API for complete data"""
    
    def __init__(self, client_id: str, client_secret: str):
        self.client_id = client_id
        self.client_secret = client_secret
        self._setup_spotify_api()
        
    def _setup_spotify_api(self):
        """Setup Spotify API for getting additional track data"""
        try:
            scope = "playlist-read-private playlist-read-collaborative user-library-read"
            auth_manager = SpotifyOAuth(
                client_id=self.client_id,
                client_secret=self.client_secret,
                redirect_uri="http://127.0.0.1:8080/callback",
                scope=scope,
                cache_path=".spotify_cache"
            )
            
            self.spotify = spotipy.Spotify(auth_manager=auth_manager)
            print("✅ Spotify API initialized for enhanced data fetching")
            
        except Exception as e:
            print(f"⚠️ Spotify API setup failed: {e}")
            self.spotify = None
    
    def enhance_track_data(self, tracks: List[Dict]) -> List[Dict]:
        """
        Enhance scraped tracks with Spotify API data (album art, popularity, etc.)
        
        Args:
            tracks: List of tracks from Selenium scraper
            
        Returns:
            Enhanced tracks with complete metadata
        """
        if not self.spotify:
            print("⚠️ Spotify API not available, using scraped data only")
            return tracks
        
        enhanced_tracks = []
        
        print(f"🔍 Enhancing {len(tracks)} tracks with Spotify API data...")
        
        for i, track in enumerate(tracks):
            try:
                # Search for the track on Spotify to get full metadata
                search_query = f"track:{track['name']} artist:{track['artist']}"
                results = self.spotify.search(q=search_query, type='track', limit=1, market='US')
                
                if results['tracks']['items']:
                    spotify_track = results['tracks']['items'][0]
                    
                    # Get album art URL
                    album_art_url = None
                    if spotify_track.get('album', {}).get('images'):
                        images = spotify_track['album']['images']
                        # Get the largest image
                        album_art_url = max(images, key=lambda x: x.get('width', 0)).get('url')
                    
                    # Create enhanced track data
                    enhanced_track = {
                        'id': spotify_track.get('id', ''),
                        'name': spotify_track.get('name', track['name']),
                        'artist': ', '.join([artist['name'] for artist in spotify_track.get('artists', [])]),
                        'album': spotify_track.get('album', {}).get('name', ''),
                        'popularity': spotify_track.get('popularity', 0),
                        'album_art_url': album_art_url,
                        'spotify_url': f"https://open.spotify.com/track/{spotify_track.get('id', '')}"
                    }
                    
                    enhanced_tracks.append(enhanced_track)
                    
                    if (i + 1) % 10 == 0:
                        print(f"  Enhanced {i + 1}/{len(tracks)} tracks...")
                        
                else:
                    # Keep original track if not found on Spotify
                    enhanced_tracks.append(track)
                    print(f"  ⚠️ Track not found on Spotify: {track['name']} - {track['artist']}")
                
                # Small delay to respect rate limits
                time.sleep(0.1)
                
            except Exception as e:
                print(f"  ⚠️ Error enhancing track {track['name']}: {e}")
                enhanced_tracks.append(track)  # Keep original track
        
        print(f"✅ Enhanced {len(enhanced_tracks)} tracks with complete metadata")
        return enhanced_tracks
    
    def filter_most_popular(self, tracks: List[Dict], limit: int = 15) -> List[Dict]:
        """
        Filter tracks to get only the most popular ones
        
        Args:
            tracks: List of tracks with popularity data
            limit: Number of top tracks to return
            
        Returns:
            List of most popular tracks
        """
        # Sort by popularity (descending) and take top tracks
        popular_tracks = sorted(tracks, key=lambda x: x.get('popularity', 0), reverse=True)
        
        # Take only the most popular tracks
        top_tracks = popular_tracks[:limit]
        
        print(f"🏆 Filtered to top {len(top_tracks)} most popular tracks:")
        for i, track in enumerate(top_tracks[:5]):  # Show top 5
            popularity = track.get('popularity', 0)
            print(f"  {i+1}. {track['name']} - {track['artist']} (popularity: {popularity})")
        
        if len(top_tracks) > 5:
            print(f"  ...and {len(top_tracks) - 5} more tracks")
        
        return top_tracks
    
    def get_enhanced_playlist_data(self, use_cached: bool = True, top_tracks_per_playlist: int = 15) -> Dict:
        """
        Get enhanced data from both playlists with popularity filtering
        
        Args:
            use_cached: Whether to use cached scraped data
            top_tracks_per_playlist: Number of top tracks to get from each playlist
            
        Returns:
            Dictionary with enhanced track data from both playlists
        """
        print("🚀 Getting enhanced playlist data with popularity filtering...")
        
        # First, get the raw scraped data
        scraper = None
        try:
            cache_file = 'selenium_scraped_data.json'
            
            # Use cached data if available and requested
            if use_cached and os.path.exists(cache_file):
                print("📂 Using cached scraped data...")
                with open(cache_file, 'r', encoding='utf-8') as f:
                    cached_data = json.load(f)
                
                nmf_tracks = cached_data.get('new_music_friday', [])
                rr_tracks = cached_data.get('release_radar', [])
            else:
                print("🌐 Scraping fresh data from Spotify...")
                scraper = SpotifySeleniumScraper(headless=True)
                
                # Scrape both playlists
                nmf_tracks = scraper.scrape_new_music_friday()
                rr_tracks = scraper.scrape_release_radar()
                
                # Save scraped data
                scraped_data = {
                    'new_music_friday': nmf_tracks,
                    'release_radar': rr_tracks,
                    'scraped_at': time.strftime('%Y-%m-%d %H:%M:%S'),
                    'method': 'enhanced_scraper'
                }
                
                with open(cache_file, 'w', encoding='utf-8') as f:
                    json.dump(scraped_data, f, indent=2, ensure_ascii=False)
            
            # Enhance track data with Spotify API
            print("\n📈 Enhancing New Music Friday tracks...")
            enhanced_nmf = self.enhance_track_data(nmf_tracks) if nmf_tracks else []
            
            print("\n📈 Enhancing Release Radar tracks...")
            enhanced_rr = self.enhance_track_data(rr_tracks) if rr_tracks else []
            
            # Filter to most popular tracks
            print(f"\n🏆 Filtering to top {top_tracks_per_playlist} tracks per playlist...")
            
            top_nmf = self.filter_most_popular(enhanced_nmf, top_tracks_per_playlist) if enhanced_nmf else []
            top_rr = self.filter_most_popular(enhanced_rr, top_tracks_per_playlist) if enhanced_rr else []
            
            return {
                'new_music_friday': top_nmf,
                'release_radar': top_rr
            }
            
        except Exception as e:
            print(f"❌ Error getting enhanced playlist data: {e}")
            return {'new_music_friday': [], 'release_radar': []}
        
        finally:
            if scraper:
                scraper.close()
    
    def run_enhanced_automation(self, 
                              use_new_music_friday: bool = True,
                              use_release_radar: bool = False,
                              top_tracks_per_playlist: int = 15,
                              use_cached: bool = True) -> Dict:
        """
        Run the complete enhanced automation
        
        Args:
            use_new_music_friday: Whether to include New Music Friday
            use_release_radar: Whether to include Release Radar  
            top_tracks_per_playlist: Number of top tracks from each playlist
            use_cached: Whether to use cached data
            
        Returns:
            Dictionary with automation results
        """
        from main import SpotifyNewMusicAutomation
        from datetime import datetime
        import os
        
        print("🚀 Starting Enhanced New Music Friday Automation...")
        print(f"🎯 Getting top {top_tracks_per_playlist} tracks from each playlist")
        print("🖼️ With full album art and metadata")
        print("🔇 Running completely headless")
        
        # Get enhanced playlist data
        playlist_data = self.get_enhanced_playlist_data(use_cached, top_tracks_per_playlist)
        
        all_tracks = []
        
        if use_new_music_friday and playlist_data['new_music_friday']:
            nmf_tracks = playlist_data['new_music_friday']
            all_tracks.extend(nmf_tracks)
            print(f"✅ Added {len(nmf_tracks)} top New Music Friday tracks")
        
        if use_release_radar and playlist_data['release_radar']:
            rr_tracks = playlist_data['release_radar']
            all_tracks.extend(rr_tracks)
            print(f"✅ Added {len(rr_tracks)} top Release Radar tracks")
        
        if not all_tracks:
            print("❌ No tracks found")
            return {}
        
        # Remove duplicates
        unique_tracks = []
        seen = set()
        for track in all_tracks:
            track_key = (track['name'], track['artist'])
            if track_key not in seen:
                seen.add(track_key)
                unique_tracks.append(track)
        
        print(f"🎵 Processing {len(unique_tracks)} unique tracks...")
        
        # Initialize main automation
        automation = SpotifyNewMusicAutomation(self.client_id, self.client_secret)
        
        # Generate content
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        print("🎨 Creating enhanced album art collage...")
        collage_filename = f"enhanced_collage_{timestamp}.png"
        collage_path = automation.create_collage(unique_tracks, collage_filename)
        
        print("📋 Creating enhanced tracklist...")
        tracklist_filename = f"enhanced_tracklist_{timestamp}.png"
        tracklist_path = automation.create_tracklist_image(unique_tracks, tracklist_filename)
        
        print("📝 Generating caption...")
        caption = automation.generate_caption(unique_tracks)
        
        # Save files
        data_filename = f"enhanced_data_{timestamp}.json"
        data_path = automation.save_track_data(unique_tracks, data_filename)
        
        caption_filename = f"enhanced_caption_{timestamp}.txt"
        caption_path = os.path.join(automation.config.OUTPUT_DIR, caption_filename)
        with open(caption_path, 'w', encoding='utf-8') as f:
            f.write(caption)
        
        results = {
            'track_count': len(unique_tracks),
            'collage_image': collage_path,
            'tracklist_image': tracklist_path,
            'caption': caption,
            'caption_file': caption_path,
            'data_file': data_path,
            'generated_at': datetime.now().isoformat(),
            'source': 'enhanced_spotify_scraper',
            'tracks_per_playlist': top_tracks_per_playlist
        }
        
        print("🎉 Enhanced automation completed successfully!")
        print(f"📸 Collage: {collage_path}")
        print(f"📋 Tracklist: {tracklist_path}")
        print(f"📝 Caption: {caption_path}")
        print(f"💾 Data: {data_path}")
        
        return results

def test_enhanced_automation():
    """Test the enhanced automation"""
    client_id = "cf27169236814c0cab9f7b9f90005058"
    client_secret = "4ad9af9ecb7d4001a50632ad314c623b"
    
    automation = EnhancedSpotifyAutomation(client_id, client_secret)
    
    print("🧪 Testing Enhanced Automation...")
    print("=" * 60)
    
    # Run enhanced automation
    results = automation.run_enhanced_automation(
        use_new_music_friday=True,
        use_release_radar=False,  # Set to True for both playlists
        top_tracks_per_playlist=12,  # Get top 12 most popular from each
        use_cached=True
    )
    
    if results:
        print(f"\n✅ SUCCESS! Enhanced Instagram content generated:")
        print(f"• Source: {results['source']}")
        print(f"• Top tracks per playlist: {results['tracks_per_playlist']}")
        print(f"• Total tracks processed: {results['track_count']}")
        print(f"• Features: Full album art, popularity filtering, headless operation")
        print(f"\n📱 Ready for Instagram posting!")
    else:
        print("❌ Enhanced automation failed")

if __name__ == "__main__":
    import os
    test_enhanced_automation()