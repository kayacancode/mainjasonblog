"""
Hybrid approach: Use the accessible playlist from your library + mock data for demonstration
"""

import json
import os
import random
from typing import Dict, List

import spotipy
from spotipy.oauth2 import SpotifyOAuth


class HybridSpotifyFetcher:
    """Hybrid approach using real accessible playlist + demo functionality"""
    
    def __init__(self, client_id: str, client_secret: str):
        self.client_id = client_id
        self.client_secret = client_secret
        
        # Initialize Spotify with OAuth
        scope = "playlist-read-private playlist-read-collaborative user-library-read"
        auth_manager = SpotifyOAuth(
            client_id=client_id,
            client_secret=client_secret,
            redirect_uri=os.getenv('SPOTIFY_REDIRECT_URI', 'http://127.0.0.1:8080/callback'),
            scope=scope,
            cache_path=".spotify_cache"
        )
        
        self.spotify = spotipy.Spotify(auth_manager=auth_manager)
    
    def get_release_radar_tracks(self) -> List[Dict]:
        """Get tracks from your actual Release Radar playlist"""
        playlist_id = "48XYmqqcZURisAnkANGu6R"  # Your "Release Radar Michael" playlist
        
        print(f"🎵 Getting Release Radar tracks from your playlist...")
        
        try:
            tracks = self.spotify.playlist_tracks(playlist_id, limit=50)
            result_tracks = []
            
            for item in tracks['items']:
                if item.get('track') and item['track']:
                    track = item['track']
                    
                    # Get album art URL
                    album_art_url = None
                    if track.get('album', {}).get('images'):
                        images = track['album']['images']
                        album_art_url = max(images, key=lambda x: x.get('width', 0)).get('url')
                    
                    # Extract artists
                    artists = ', '.join([artist['name'] for artist in track.get('artists', []) if artist.get('name')])
                    
                    track_data = {
                        'id': track.get('id', ''),
                        'name': track.get('name', ''),
                        'artist': artists,
                        'album': track.get('album', {}).get('name', ''),
                        'popularity': track.get('popularity', 0),
                        'album_art_url': album_art_url,
                        'spotify_url': f"https://open.spotify.com/track/{track.get('id', '')}"
                    }
                    
                    result_tracks.append(track_data)
            
            print(f"✅ Got {len(result_tracks)} tracks from Release Radar")
            return result_tracks
            
        except Exception as e:
            print(f"❌ Error getting Release Radar: {e}")
            return []
    
    def get_new_music_friday_simulation(self) -> List[Dict]:
        """
        Create a New Music Friday simulation using trending/popular tracks
        This demonstrates the functionality while we work on the real scraping
        """
        
        print(f"🎵 Creating New Music Friday simulation with current popular tracks...")
        
        try:
            # Get current popular tracks from different genres/markets
            search_terms = [
                "year:2024 genre:pop", 
                "year:2024 genre:hip-hop",
                "year:2024 genre:r&b", 
                "year:2024 genre:rock",
                "year:2024 genre:electronic"
            ]
            
            all_tracks = []
            
            for search_term in search_terms:
                try:
                    results = self.spotify.search(q=search_term, type='track', limit=10, market='US')
                    
                    for track in results['tracks']['items']:
                        # Get album art
                        album_art_url = None
                        if track.get('album', {}).get('images'):
                            images = track['album']['images']
                            album_art_url = max(images, key=lambda x: x.get('width', 0)).get('url')
                        
                        # Extract artists
                        artists = ', '.join([artist['name'] for artist in track.get('artists', []) if artist.get('name')])
                        
                        track_data = {
                            'id': track.get('id', ''),
                            'name': track.get('name', ''),
                            'artist': artists,
                            'album': track.get('album', {}).get('name', ''),
                            'popularity': track.get('popularity', 0),
                            'album_art_url': album_art_url,
                            'spotify_url': f"https://open.spotify.com/track/{track.get('id', '')}"
                        }
                        
                        all_tracks.append(track_data)
                
                except Exception as e:
                    print(f"⚠️ Search error for '{search_term}': {e}")
                    continue
            
            # Remove duplicates and sort by popularity
            seen = set()
            unique_tracks = []
            for track in all_tracks:
                track_key = (track['name'], track['artist'])
                if track_key not in seen:
                    seen.add(track_key)
                    unique_tracks.append(track)
            
            # Sort by popularity and take top 30
            unique_tracks.sort(key=lambda x: x['popularity'], reverse=True)
            result_tracks = unique_tracks[:30]
            
            print(f"✅ Created New Music Friday simulation with {len(result_tracks)} tracks")
            return result_tracks
            
        except Exception as e:
            print(f"❌ Error creating New Music Friday simulation: {e}")
            return []
    
    def save_tracks_data(self, nmf_tracks: List[Dict], rr_tracks: List[Dict]):
        """Save the track data for the automation to use"""
        
        data = {
            'new_music_friday': nmf_tracks,
            'release_radar': rr_tracks,
            'generated_at': '2024-01-01T00:00:00',  # Current timestamp would go here
            'source': 'hybrid_approach'
        }
        
        with open('spotify_tracks_data.json', 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        
        print(f"💾 Saved track data to spotify_tracks_data.json")
        return data

def test_hybrid_approach():
    """Test the hybrid approach"""
    
    client_id = "cf27169236814c0cab9f7b9f90005058"
    client_secret = "4ad9af9ecb7d4001a50632ad314c623b"
    
    fetcher = HybridSpotifyFetcher(client_id, client_secret)
    
    print("🧪 Testing Hybrid Approach...")
    print("=" * 50)
    
    # Get Release Radar (real data)
    print("\n1️⃣ Getting Release Radar (Real Data)...")
    rr_tracks = fetcher.get_release_radar_tracks()
    
    if rr_tracks:
        print("Sample Release Radar tracks:")
        for i, track in enumerate(rr_tracks[:5]):
            print(f"  {i+1}. {track['name']} - {track['artist']}")
    
    # Get New Music Friday simulation
    print("\n2️⃣ Creating New Music Friday Simulation...")
    nmf_tracks = fetcher.get_new_music_friday_simulation()
    
    if nmf_tracks:
        print("Sample New Music Friday tracks:")
        for i, track in enumerate(nmf_tracks[:5]):
            print(f"  {i+1}. {track['name']} - {track['artist']} (popularity: {track['popularity']})")
    
    # Save data
    print("\n3️⃣ Saving Data...")
    saved_data = fetcher.save_tracks_data(nmf_tracks, rr_tracks)
    
    print(f"\n🎉 SUMMARY:")
    print(f"• Release Radar tracks: {len(rr_tracks)}")
    print(f"• New Music Friday tracks: {len(nmf_tracks)}")
    print(f"• Total tracks for automation: {len(rr_tracks) + len(nmf_tracks)}")
    print(f"• Data saved to: spotify_tracks_data.json")
    
    return nmf_tracks, rr_tracks

if __name__ == "__main__":
    test_hybrid_approach()