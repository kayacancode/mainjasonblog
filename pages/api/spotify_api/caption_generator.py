#!/usr/bin/env python3
"""
OpenAI Caption Generator for Instagram posts
Generates captions and hashtags based on track metadata
"""

import os
import json
import logging
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass

try:
    import openai
except ImportError:
    openai = None

logger = logging.getLogger(__name__)

@dataclass
class CaptionStyle:
    """Caption style configuration"""
    name: str
    description: str
    emoji_heavy: bool = False
    minimal: bool = False
    review_style: bool = False
    max_length: int = 500

class CaptionGenerator:
    """OpenAI-powered caption generator for Instagram posts"""
    
    # Predefined caption styles
    STYLES = {
        'emoji_heavy': CaptionStyle(
            name='emoji_heavy',
            description='Lots of emojis and excitement',
            emoji_heavy=True,
            max_length=450
        ),
        'minimal': CaptionStyle(
            name='minimal',
            description='Clean and simple',
            minimal=True,
            max_length=400
        ),
        'review_style': CaptionStyle(
            name='review_style',
            description='Music review format',
            review_style=True,
            max_length=500
        ),
        'balanced': CaptionStyle(
            name='balanced',
            description='Mix of emojis and text',
            max_length=500
        )
    }
    
    def __init__(self, api_key: str = None):
        """Initialize the caption generator"""
        self.api_key = api_key or os.getenv('OPENAI_API_KEY')
        
        if not self.api_key:
            logger.warning("OpenAI API key not found, will use fallback templates")
            self.openai_available = False
        else:
            if openai:
                openai.api_key = self.api_key
                self.openai_available = True
                logger.info("✅ OpenAI client initialized")
            else:
                logger.warning("OpenAI package not installed, will use fallback templates")
                self.openai_available = False
    
    def generate_caption(self, 
                        tracks: List[Dict], 
                        week_start: str,
                        include_hashtags: bool = True) -> Dict:
        """
        Generate caption and hashtags for a week's tracks in reviewer style
        
        Args:
            tracks: List of track dictionaries
            week_start: Week start date (YYYY-MM-DD)
            include_hashtags: Whether to generate hashtags
            
        Returns:
            Dictionary with caption, hashtags, and metadata
        """
        try:
            
            if self.openai_available:
                return self._generate_openai_caption(tracks, week_start, include_hashtags)
            else:
                return self._generate_fallback_caption(tracks, week_start, include_hashtags)
                
        except Exception as e:
            logger.error(f"Error generating caption: {e}")
            return self._generate_fallback_caption(tracks, week_start, include_hashtags)
    
    def _generate_openai_caption(self, 
                                tracks: List[Dict], 
                                week_start: str,
                                include_hashtags: bool) -> Dict:
        """Generate caption using OpenAI API"""
        try:
            # Prepare track data for OpenAI
            track_info = self._prepare_track_data(tracks)
            
            # Create prompt in reviewer style
            prompt = self._create_prompt(track_info, week_start)
            
            # Call OpenAI API (new v1.0+ syntax)
            client = openai.OpenAI(api_key=self.api_key)
            response = client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {
                        "role": "system",
                        "content": "You are a music blogger creating Instagram captions for New Music Friday playlists. Create engaging, authentic captions that music fans would love."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                max_tokens=300,
                temperature=0.7
            )
            
            caption_text = response.choices[0].message.content.strip()
            
            # Generate hashtags if requested
            hashtags = []
            if include_hashtags:
                hashtags = self._generate_hashtags(tracks, week_start)
            
            return {
                'caption': caption_text,
                'hashtags': hashtags,
                'style': style.name,
                'generated_at': datetime.now().isoformat(),
                'method': 'openai',
                'character_count': len(caption_text)
            }
            
        except Exception as e:
            logger.error(f"OpenAI API error: {e}")
            return self._generate_fallback_caption(tracks, week_start, include_hashtags)
    
    def _generate_fallback_caption(self, 
                                  tracks: List[Dict], 
                                  week_start: str,
                                  include_hashtags: bool) -> Dict:
        """Generate fallback caption using templates"""
        try:
            # Get top tracks (up to 3 for caption)
            top_tracks = tracks[:3]
            
            # Create reviewer-style caption
            caption = self._create_review_caption(top_tracks, week_start)
            
            # Generate hashtags if requested
            hashtags = []
            if include_hashtags:
                hashtags = self._generate_fallback_hashtags(tracks, week_start)
            
            return {
                'caption': caption,
                'hashtags': hashtags,
                'style': 'reviewer',
                'generated_at': datetime.now().isoformat(),
                'method': 'fallback',
                'character_count': len(caption)
            }
            
        except Exception as e:
            logger.error(f"Fallback caption generation error: {e}")
            return self._create_emergency_caption(week_start)
    
    def _prepare_track_data(self, tracks: List[Dict]) -> str:
        """Prepare track data for OpenAI prompt"""
        track_info = []
        for track in tracks[:5]:  # Limit to top 5 tracks
            artist = track.get('artist', 'Unknown Artist')
            name = track.get('name', 'Unknown Track')
            genre = track.get('genre', 'Unknown Genre')
            mood = track.get('mood', 'Unknown Mood')
            popularity = track.get('popularity', 0)
            
            track_info.append(f"• {artist} - {name} ({genre}, {mood}, popularity: {popularity})")
        
        return "\n".join(track_info)
    
    def _create_prompt(self, track_info: str, week_start: str) -> str:
        """Create OpenAI prompt in reviewer style"""
        return f"""Create an engaging Instagram caption for New Music Friday (week of {week_start}).

Tracks this week:
{track_info}

Write this as a music reviewer/blogger would - with personality, insight, and enthusiasm. Include:
- A brief review of 1-2 standout tracks with specific commentary
- Your take on the overall vibe and quality of the week
- Some personality and music knowledge that shows you actually listen
- Engaging language that music fans would appreciate and relate to
- Appropriate emojis that enhance the message

Keep it under 500 characters and make it feel authentic and knowledgeable about music. Don't include hashtags (they'll be added separately)."""
    
    def _create_emoji_heavy_caption(self, tracks: List[Dict], week_start: str) -> str:
        """Create emoji-heavy fallback caption"""
        top_artists = [track.get('artist', 'Unknown') for track in tracks[:3]]
        artists_text = ", ".join(top_artists)
        
        return f"🎵 NEW MUSIC FRIDAY - Week of {week_start} 🎵\n\n🔥 This week's fire tracks from {artists_text} and more! 🔥\n\n💯 Fresh sounds hitting different! What's your favorite? 💯\n\n#NewMusicFriday #FreshTracks #MusicDiscovery"
    
    def _create_minimal_caption(self, tracks: List[Dict], week_start: str) -> str:
        """Create minimal fallback caption"""
        top_artists = [track.get('artist', 'Unknown') for track in tracks[:2]]
        artists_text = " & ".join(top_artists)
        
        return f"New Music Friday - {week_start}\n\nFeaturing {artists_text} and more fresh tracks.\n\nWhat are you listening to this week?"
    
    def _create_review_caption(self, tracks: List[Dict], week_start: str) -> str:
        """Create review-style fallback caption"""
        top_track = tracks[0] if tracks else {}
        artist = top_track.get('artist', 'Unknown Artist')
        track_name = top_track.get('name', 'Unknown Track')
        
        return f"New Music Friday Review - {week_start}\n\nThis week's standout: {artist} delivers with '{track_name}' - a track that showcases their signature style.\n\nPlus more fresh releases from the week's top artists. Solid lineup overall."
    
    def _create_balanced_caption(self, tracks: List[Dict], week_start: str) -> str:
        """Create balanced fallback caption"""
        top_artists = [track.get('artist', 'Unknown') for track in tracks[:3]]
        artists_text = ", ".join(top_artists)
        
        return f"🎵 New Music Friday - {week_start}\n\nThis week's highlights include fresh tracks from {artists_text} and more!\n\nAlways excited to discover new sounds. What caught your ear? 🎧"
    
    def _create_emergency_caption(self, week_start: str) -> Dict:
        """Create emergency fallback caption"""
        caption = f"New Music Friday - {week_start}\n\nFresh tracks this week! 🎵\n\n#NewMusicFriday #MusicDiscovery"
        
        return {
            'caption': caption,
            'hashtags': ['#NewMusicFriday', '#MusicDiscovery', '#FreshTracks'],
            'style': 'emergency',
            'generated_at': datetime.now().isoformat(),
            'method': 'emergency',
            'character_count': len(caption)
        }
    
    def _generate_hashtags(self, tracks: List[Dict], week_start: str) -> List[str]:
        """Generate hashtags using OpenAI"""
        try:
            if not self.openai_available:
                return self._generate_fallback_hashtags(tracks, week_start)
            
            # Get genres and moods from tracks
            genres = list(set([track.get('genre', '') for track in tracks if track.get('genre')]))
            moods = list(set([track.get('mood', '') for track in tracks if track.get('mood')]))
            
            prompt = f"""Generate 10-15 relevant Instagram hashtags for a New Music Friday post.

Week: {week_start}
Genres: {', '.join(genres[:3])}
Moods: {', '.join(moods[:3])}

Include:
- #NewMusicFriday
- Genre-specific hashtags
- General music hashtags
- Discovery hashtags

Return only the hashtags, one per line, no other text."""

            client = openai.OpenAI(api_key=self.api_key)
            response = client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=100,
                temperature=0.5
            )
            
            hashtags = [line.strip() for line in response.choices[0].message.content.split('\n') if line.strip()]
            return hashtags[:15]  # Limit to 15 hashtags
            
        except Exception as e:
            logger.error(f"Hashtag generation error: {e}")
            return self._generate_fallback_hashtags(tracks, week_start)
    
    def _generate_fallback_hashtags(self, tracks: List[Dict], week_start: str) -> List[str]:
        """Generate fallback hashtags"""
        hashtags = [
            '#NewMusicFriday',
            '#MusicDiscovery',
            '#FreshTracks',
            '#NewMusic',
            '#MusicFriday'
        ]
        
        # Add genre-based hashtags
        genres = [track.get('genre', '').lower() for track in tracks if track.get('genre')]
        if 'pop' in ' '.join(genres):
            hashtags.append('#PopMusic')
        if 'hip hop' in ' '.join(genres) or 'rap' in ' '.join(genres):
            hashtags.append('#HipHop')
        if 'rock' in ' '.join(genres):
            hashtags.append('#RockMusic')
        if 'electronic' in ' '.join(genres) or 'edm' in ' '.join(genres):
            hashtags.append('#ElectronicMusic')
        
        # Add year hashtag
        year = week_start.split('-')[0]
        hashtags.append(f'#{year}Music')
        
        return hashtags[:12]  # Limit to 12 hashtags
    
    def regenerate_caption(self, 
                          tracks: List[Dict], 
                          week_start: str,
                          new_style: str = None) -> Dict:
        """Regenerate caption with optional new style"""
        style = new_style or 'balanced'
        return self.generate_caption(tracks, week_start, style, include_hashtags=True)

def main():
    """Test the caption generator"""
    # Sample track data
    sample_tracks = [
        {
            'artist': 'Drake',
            'name': 'DOG HOUSE',
            'genre': 'Hip Hop',
            'mood': 'Energetic',
            'popularity': 79
        },
        {
            'artist': 'Twenty One Pilots',
            'name': 'City Walls',
            'genre': 'Alternative Rock',
            'mood': 'Melancholic',
            'popularity': 78
        }
    ]
    
    generator = CaptionGenerator()
    
    print("Testing caption generation...")
    print("=" * 50)
    
    for style_name in ['emoji_heavy', 'minimal', 'review_style', 'balanced']:
        print(f"\n{style_name.upper()} STYLE:")
        print("-" * 30)
        
        result = generator.generate_caption(
            tracks=sample_tracks,
            week_start='2025-09-12',
            style=style_name,
            include_hashtags=True
        )
        
        print(f"Caption: {result['caption']}")
        print(f"Hashtags: {' '.join(result['hashtags'])}")
        print(f"Method: {result['method']}")
        print(f"Characters: {result['character_count']}")

if __name__ == "__main__":
    main()
