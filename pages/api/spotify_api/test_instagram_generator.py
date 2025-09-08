#!/usr/bin/env python3
"""
Test script for Instagram image generation
"""

import json
import os
import sys
from datetime import datetime

from dotenv import load_dotenv
from instagram_image_generator import InstagramImageGenerator

# Load environment variables from .env file (located at project root)
load_dotenv('../../../.env')


def create_sample_data():
    """Create sample tracks data for testing"""
    sample_tracks = [
        {
            'track_name': 'God\'s Plan',
            'artists': 'Drake',
            'popularity': 95,
            'playlist_name': 'New Music Friday',
            'album': 'Scorpion',
            'spotify_url': 'https://open.spotify.com/track/example1'
        },
        {
            'track_name': 'Runaway',
            'artists': 'Kanye West',
            'popularity': 90,
            'playlist_name': 'New Music Friday',
            'album': 'My Beautiful Dark Twisted Fantasy',
            'spotify_url': 'https://open.spotify.com/track/example2'
        },
        {
            'track_name': 'L$D',
            'artists': 'A$AP Rocky',
            'popularity': 88,
            'playlist_name': 'Release Radar',
            'album': 'AT.LONG.LAST.A$AP',
            'spotify_url': 'https://open.spotify.com/track/example3'
        },
        {
            'track_name': 'Blinding Lights',
            'artists': 'The Weeknd',
            'popularity': 92,
            'playlist_name': 'Release Radar',
            'album': 'After Hours',
            'spotify_url': 'https://open.spotify.com/track/example4'
        },
        {
            'track_name': 'Bad Guy',
            'artists': 'Billie Eilish',
            'popularity': 87,
            'playlist_name': 'Release Radar',
            'album': 'When We All Fall Asleep, Where Do We Go?',
            'spotify_url': 'https://open.spotify.com/track/example5'
        },
        {
            'track_name': 'Levitating',
            'artists': 'Dua Lipa',
            'popularity': 85,
            'playlist_name': 'New Music Friday',
            'album': 'Future Nostalgia',
            'spotify_url': 'https://open.spotify.com/track/example6'
        },
        {
            'track_name': 'Watermelon Sugar',
            'artists': 'Harry Styles',
            'popularity': 89,
            'playlist_name': 'New Music Friday',
            'album': 'Fine Line',
            'spotify_url': 'https://open.spotify.com/track/example7'
        },
        {
            'track_name': 'Good 4 U',
            'artists': 'Olivia Rodrigo',
            'popularity': 91,
            'playlist_name': 'New Music Friday',
            'album': 'SOUR',
            'spotify_url': 'https://open.spotify.com/track/example8'
        },
        {
            'track_name': 'Industry Baby',
            'artists': 'Lil Nas X, Jack Harlow',
            'popularity': 86,
            'playlist_name': 'New Music Friday',
            'album': 'MONTERO',
            'spotify_url': 'https://open.spotify.com/track/example9'
        },
        {
            'track_name': 'Heat Waves',
            'artists': 'Glass Animals',
            'popularity': 84,
            'playlist_name': 'New Music Friday',
            'album': 'Dreamland',
            'spotify_url': 'https://open.spotify.com/track/example10'
        }
    ]
    
    # Create sample data structure
    sample_data = {
        'tracks': sample_tracks,
        'metadata': {
            'total_tracks': len(sample_tracks),
            'playlist_sources': ['New Music Friday', 'Release Radar'],
            'generated_at': datetime.now().isoformat(),
            'source': 'test_data'
        }
    }
    
    return sample_data

def test_image_generation():
    """Test the image generation functionality"""
    
    # Check for API key
    gemini_api_key = os.getenv('GEMINI_API_KEY')
    if not gemini_api_key:
        print("❌ GEMINI_API_KEY not found in environment variables")
        print("Please set your Gemini API key:")
        print("export GEMINI_API_KEY='your_api_key_here'")
        return False
    
    print("🎨 Testing Instagram Image Generation...")
    
    # Create output directory
    os.makedirs('output', exist_ok=True)
    
    # Create sample data file
    sample_data = create_sample_data()
    sample_file = 'output/test_enhanced_data.json'
    
    with open(sample_file, 'w', encoding='utf-8') as f:
        json.dump(sample_data, f, indent=2, ensure_ascii=False)
    
    print(f"📄 Created sample data file: {sample_file}")
    
    # Initialize generator
    generator = InstagramImageGenerator(gemini_api_key)
    
    # Use the sample data directly instead of finding latest
    print("\n🔍 Using sample data with famous artists...")
    sample_data = create_sample_data()
    tracks = sample_data.get('tracks', [])
    print(f"✅ Using {len(tracks)} sample tracks with famous artists")
    
    # Test artist selection
    print("\n👥 Testing artist selection...")
    top_artists = generator.get_top_artists(tracks, 4)
    print(f"✅ Top artists: {[artist['name'] for artist in top_artists]}")
    
    # Test prompt generation
    print("\n📝 Testing prompt generation...")
    
    # Artist collage prompt
    artist_prompt = generator.generate_artist_collage_prompt(top_artists, tracks)
    print(f"✅ Artist collage prompt generated ({len(artist_prompt)} chars)")
    
    # Tracklist prompt
    tracklist_prompt = generator.generate_tracklist_prompt(tracks)
    print(f"✅ Tracklist prompt generated ({len(tracklist_prompt)} chars)")
    
    # Test image generation with sample data
    print("\n🎨 Testing image generation with famous artists...")
    
    # Generate timestamp for filenames and create test folder
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    test_folder = f"output/test_run_{timestamp}"
    os.makedirs(test_folder, exist_ok=True)
    print(f"📁 Created test folder: {test_folder}")
    
    # 1. Artist Collage
    print("🎨 Generating artist collage...")
    artist_prompt = generator.generate_artist_collage_prompt(top_artists, tracks)
    artist_path = os.path.join(test_folder, f"artist_collage_{timestamp}.png")
    
    if generator.generate_image_with_gemini(artist_prompt, artist_path):
        print(f"✅ Artist collage: {artist_path}")
    
    # 2. Tracklist Image
    print("📱 Generating tracklist image...")
    tracklist_prompt = generator.generate_tracklist_prompt(tracks)
    tracklist_path = os.path.join(test_folder, f"tracklist_{timestamp}.png")
    
    if generator.generate_image_with_gemini(tracklist_prompt, tracklist_path):
        print(f"✅ Tracklist: {tracklist_path}")
    
    # Save test metadata
    metadata = {
        'timestamp': timestamp,
        'test_folder': test_folder,
        'total_tracks': len(tracks),
        'top_artists': [artist['name'] for artist in top_artists],
        'playlist_sources': list(set([track.get('playlist_name', 'Unknown') for track in tracks]))
    }
    
    metadata_path = os.path.join(test_folder, f"metadata_{timestamp}.json")
    with open(metadata_path, 'w', encoding='utf-8') as f:
        json.dump(metadata, f, indent=2, ensure_ascii=False)
    
    print(f"📄 Test metadata saved: {metadata_path}")
    
    results = {'artist_collage': artist_path, 'tracklist': tracklist_path}
    
    if results:
        print("✅ Image generation completed!")
        for image_type, path in results.items():
            print(f"📸 {image_type}: {path}")
    else:
        print("❌ Image generation failed")
        return False
    
    print("\n🎉 Test completed successfully!")
    print("\n📝 Next steps:")
    print("1. Check the generated prompt files in the output/ directory")
    print("2. Copy the prompts to Google Gemini (gemini.google.com)")
    print("3. Use the 'Create Image' feature to generate the actual images")
    print("4. Save the images as PNG files for Instagram posting")
    
    return True

if __name__ == "__main__":
    success = test_image_generation()
    sys.exit(0 if success else 1)
