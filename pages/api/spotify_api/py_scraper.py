"""
Enhanced Selenium scraper with album art fetching and popularity filtering
"""

import json
import logging
import os
import time
from typing import Dict, List

import requests
import spotipy
from selenium_scraper import SpotifySeleniumScraper
from spotipy.oauth2 import SpotifyOAuth
from supabase import Client, create_client

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
                redirect_uri=os.getenv('SPOTIPY_REDIRECT_URI', 'http://127.0.0.1:8080/callback'),
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
        Run the complete enhanced automation with EXACTLY 5 unique tracks per playlist.
        Dedupe within each playlist and across playlists (NMF has priority).
        Ensures RR still fills to 5 by pulling from a larger candidate pool.
        """
        import os
        from datetime import datetime, timedelta

        from main import SpotifyNewMusicAutomation

        def _norm(s: str) -> str:
            return (s or "").strip().lower()

        def track_key(t: dict):
            # Prefer stable Spotify ID; fallback to normalized name+artist
            return t.get("id") or (_norm(t.get("name")), _norm(t.get("artist")))

        def pick_top_unique(tracks, limit=5, exclude_keys=None):
            """Pick top N unique tracks by popularity, avoiding keys in exclude_keys."""
            if exclude_keys is None:
                exclude_keys = set()
            unique = []
            seen = set()
            sorted_tracks = sorted(tracks, key=lambda x: x.get('popularity', 0), reverse=True)
            for tr in sorted_tracks:
                k = track_key(tr)
                if k in seen or k in exclude_keys:
                    continue
                seen.add(k)
                unique.append(tr)
                if len(unique) == limit:
                    break
            return unique

        print("🚀 Starting Enhanced New Music Friday Automation...")
        print("🎯 Goal: 5 unique tracks per playlist (no cross-duplication)")
        print("🖼️ With full album art and metadata")
        print("🔇 Running completely headless")

        # --- IMPORTANT FIX ---
        # Pull a bigger candidate pool so RR can refill after excluding NMF overlaps.
        candidate_pool_per_playlist = max(top_tracks_per_playlist, 100)

        # Get enhanced playlist data with a LARGE pool to allow refills after cross-dedupe
        playlist_data = self.get_enhanced_playlist_data(
            use_cached=use_cached,
            top_tracks_per_playlist=candidate_pool_per_playlist
        )

        nmf_tracks = playlist_data.get('new_music_friday', []) if use_new_music_friday else []
        rr_tracks = playlist_data.get('release_radar', []) if use_release_radar else []

        # Debug: Show how many tracks we got from each playlist
        print(f"🔍 Debug - New Music Friday tracks available: {len(nmf_tracks)}")
        print(f"🔍 Debug - Release Radar tracks available: {len(rr_tracks)}")
        
        # First, pick top-unique for NMF
        nmf_unique = pick_top_unique(nmf_tracks, limit=5)
        print(f"🔍 Debug - New Music Friday unique tracks selected: {len(nmf_unique)}")

        # Exclude NMF picks from RR, then pick top-unique until RR also has 5
        nmf_keys = {track_key(t) for t in nmf_unique}
        rr_unique = pick_top_unique(rr_tracks, limit=5, exclude_keys=nmf_keys)
        print(f"🔍 Debug - Release Radar unique tracks selected: {len(rr_unique)}")

        # Add playlist source tags
        for t in nmf_unique:
            t['playlist_source'] = 'New Music Friday'
        for t in rr_unique:
            t['playlist_source'] = 'Release Radar'

        # Final combined list
        unique_tracks = nmf_unique + rr_unique

        print("🎵 Final selection:")
        print(f"   • New Music Friday: {len(nmf_unique)} (target 5)")
        print(f"   • Release Radar: {len(rr_unique)} (target 5)")
        print(f"   • Total: {len(unique_tracks)}")

        if not unique_tracks:
            print("❌ No tracks found")
            return {}

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

        # Save JSON data
        data_filename = f"enhanced_data_{timestamp}.json"
        data_path = automation.save_track_data(unique_tracks, data_filename)

        # Save tracks to Supabase
        print("💾 Saving tracks to Supabase...")
        try:
            from supabase import create_client

            # Hardcoded Supabase credentials (same approach as Spotify)
            supabase_url = "https://yxziaumwnvyswnqfyosh.supabase.co"
            supabase_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4emlhdW13bnZ5c3ducWZ5b3NoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTAxOTcxOSwiZXhwIjoyMDcwNTk1NzE5fQ.vZUvnae2z3UyAirkc2c21cqAByK14bqg3HRtEs0LxXg"
            
            # Only use environment variables if they're not empty
            env_url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
            env_key = os.getenv('SUPABASE_SERVICE_KEY')
            
            if env_url and env_url.strip():
                supabase_url = env_url
                print("🔍 Using Supabase URL from environment")
            else:
                print("🔍 Using hardcoded Supabase URL")
                
            if env_key and env_key.strip():
                supabase_key = env_key
                print("🔍 Using Supabase KEY from environment")
            else:
                print("🔍 Using hardcoded Supabase KEY")
            
            print(f"🔍 Debug - Using Supabase URL: {supabase_url[:50]}...")
            print(f"🔍 Debug - Using Supabase KEY: {supabase_key[:20]}...")
            
            # Validate credentials before creating client
            if not supabase_url or not supabase_url.strip():
                raise Exception("Invalid Supabase URL")
            if not supabase_key or not supabase_key.strip():
                raise Exception("Invalid Supabase KEY")

            print("🔗 Creating Supabase client...")
            try:
                supabase = create_client(supabase_url, supabase_key)
                print("✅ Supabase client created successfully!")
            except Exception as client_error:
                print(f"❌ Failed to create Supabase client: {client_error}")
                raise client_error

            # Week start (Friday - the day the refresh happens)
            today = datetime.now()
            days_since_friday = (today.weekday() - 4) % 7  # 4 = Friday (0=Monday, 4=Friday)
            week_start = today - timedelta(days=days_since_friday)
            week_start_str = week_start.strftime('%Y-%m-%d')

            tracks_saved = 0
            for track in unique_tracks:
                track_data = {
                    'track_name': track.get('name', ''),
                    'artists': track.get('artist', ''),
                    'album': track.get('album', ''),
                    'spotify_url': track.get('spotify_url', ''),
                    'album_art_url': track.get('album_art_url'),
                    'popularity': track.get('popularity', 0),
                    'playlist_name': track.get('playlist_source', 'Unknown'),
                    'week_start': week_start_str,
                    'created_at': datetime.now().isoformat()
                }
                result = supabase.table('tracks').insert(track_data).execute()
                if getattr(result, "data", None):
                    tracks_saved += 1

            print(f"✅ Successfully saved {tracks_saved}/{len(unique_tracks)} tracks to Supabase")

        except Exception as e:
            print(f"⚠️ Failed to save to Supabase: {e}")
            print("💾 Tracks still saved to JSON file")

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
    # Try to get from environment variables first, fallback to hardcoded values
    client_id = os.getenv('SPOTIFY_CLIENT_ID', "cf27169236814c0cab9f7b9f90005058")
    client_secret = os.getenv('SPOTIFY_CLIENT_SECRET', "4ad9af9ecb7d4001a50632ad314c623b")
    
    print(f"🔍 Debug - Using Spotify Client ID: {client_id[:10]}...")
    
    automation = EnhancedSpotifyAutomation(client_id, client_secret)
    
    print("🧪 Testing Enhanced Automation...")
    print("=" * 60)
    
    # Always pull fresh tracks (no caching)
    use_cached = False
    
    print(f"🔍 Running in GitHub Actions: {bool(os.getenv('GITHUB_ACTIONS'))}")
    print(f"🔍 Using cached data: {use_cached} (always fresh)")
    
    # Run enhanced automation
    results = automation.run_enhanced_automation(
        use_new_music_friday=True,
        use_release_radar=True,  # Enable both playlists
        top_tracks_per_playlist=5,  # Get top 5 most popular from each
        use_cached=use_cached
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

    # Debug: Print all environment variables that start with SPOTIFY or SUPABASE
    print("🔍 Debug - Environment variables:")
    for key, value in os.environ.items():
        if key.startswith(('SPOTIFY', 'SUPABASE', 'NEXT_PUBLIC')):
            print(f"  {key}: {value[:20]}..." if len(value) > 20 else f"  {key}: {value}")
    
    test_enhanced_automation()