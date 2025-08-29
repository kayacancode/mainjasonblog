import os
from typing import Optional

class SpotifyConfig:
    """Configuration class for Spotify API credentials and settings"""
    
    # Spotify API Credentials (get from https://developer.spotify.com/dashboard/)
    CLIENT_ID: Optional[str] = os.getenv('SPOTIFY_CLIENT_ID')
    CLIENT_SECRET: Optional[str] = os.getenv('SPOTIFY_CLIENT_SECRET')
    
    # Playlist IDs
    NEW_MUSIC_FRIDAY_ID = "37i9dQZF1DX4JAvHpjipBk"  # Official New Music Friday
    RELEASE_RADAR_ID = "37i9dQZEVXbl2WP21t2Aqe"     # Your Release Radar
    
    # Image Settings
    COLLAGE_GRID = (4, 5)  # 4 columns, 5 rows = 20 tracks
    ALBUM_ART_SIZE = 200
    CANVAS_SIZE = (1080, 1080)
    
    # Colors (Spotify brand colors)
    SPOTIFY_GREEN = "#1DB954"
    SPOTIFY_BLACK = "#191414"
    SPOTIFY_WHITE = "#FFFFFF"
    SPOTIFY_GRAY = "#B3B3B3"
    
    # Output Settings
    OUTPUT_DIR = "output"
    TRACK_LIMIT = 20
    
    # API Settings
    REQUEST_TIMEOUT = 10
    MAX_RETRIES = 3