"""
Selenium Web Scraper for exact Spotify playlists
This will actually load the playlists in a browser and extract the track data
"""

import json
import logging
import re
import time
from typing import Dict, List

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait
from webdriver_manager.chrome import ChromeDriverManager

logger = logging.getLogger(__name__)

class SpotifySeleniumScraper:
    """Browser automation scraper for Spotify playlists"""
    
    def __init__(self, headless: bool = True):
        self.driver = None
        self.headless = headless
        self._setup_driver()
    
    def _setup_driver(self):
        """Setup Chrome WebDriver"""
        try:
            import os
            
            chrome_options = Options()
            
            if self.headless:
                chrome_options.add_argument("--headless")
            
            chrome_options.add_argument("--no-sandbox")
            chrome_options.add_argument("--disable-dev-shm-usage")
            chrome_options.add_argument("--disable-gpu")
            chrome_options.add_argument("--window-size=1920,1080")
            chrome_options.add_argument("--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
            
            # Use custom Chrome binary path if available (for GitHub Actions)
            chrome_bin = os.getenv('CHROME_BIN')
            if chrome_bin:
                chrome_options.binary_location = chrome_bin
            
            # Disable images and CSS for faster loading
            prefs = {
                "profile.managed_default_content_settings.images": 2,
                "profile.default_content_setting_values.stylesheets": 2
            }
            chrome_options.add_experimental_option("prefs", prefs)
            
            service = Service(ChromeDriverManager().install())
            self.driver = webdriver.Chrome(service=service, options=chrome_options)
            
            print("✅ Chrome WebDriver initialized successfully")
            
        except Exception as e:
            print(f"❌ Error setting up WebDriver: {e}")
            raise
    
    def scrape_playlist(self, playlist_url: str) -> List[Dict]:
        """
        Scrape a Spotify playlist using browser automation
        
        Args:
            playlist_url: Full Spotify playlist URL
            
        Returns:
            List of track dictionaries
        """
        print(f"🌐 Loading playlist: {playlist_url}")
        
        try:
            # Load the playlist page
            self.driver.get(playlist_url)
            
            # Wait for page to load
            time.sleep(5)
            
            # Try to handle any cookie banners or popups
            try:
                # Look for accept cookies button
                accept_button = WebDriverWait(self.driver, 5).until(
                    EC.element_to_be_clickable((By.XPATH, "//button[contains(text(), 'Accept') or contains(text(), 'Allow')]"))
                )
                accept_button.click()
                time.sleep(2)
            except:
                pass  # No cookie banner found
            
            # Get playlist title
            playlist_title = self._get_playlist_title()
            print(f"📋 Playlist: {playlist_title}")
            
            # Wait for tracks to load
            print("⏳ Waiting for tracks to load...")
            
            # Try multiple selectors for track rows
            track_selectors = [
                '[data-testid="tracklist-row"]',
                '[data-testid="track-row"]', 
                '.tracklist-row',
                '.Track__track-row',
                '[role="row"]'
            ]
            
            tracks_found = False
            for selector in track_selectors:
                try:
                    WebDriverWait(self.driver, 10).until(
                        EC.presence_of_all_elements_located((By.CSS_SELECTOR, selector))
                    )
                    tracks_found = True
                    print(f"✅ Found tracks using selector: {selector}")
                    break
                except:
                    continue
            
            if not tracks_found:
                print("⚠️ No tracks found with standard selectors, trying alternative approach...")
                
            # Scroll to load more tracks
            self._scroll_to_load_tracks()
            
            # Extract track data
            tracks = self._extract_tracks()
            
            print(f"✅ Successfully scraped {len(tracks)} tracks")
            return tracks
            
        except Exception as e:
            print(f"❌ Error scraping playlist: {e}")
            return []
    
    def _get_playlist_title(self) -> str:
        """Get the playlist title"""
        title_selectors = [
            '[data-testid="entityTitle"]',
            'h1[data-testid="playlist-title"]',
            'h1',
            '.Type__TypeElement-sc-goli3j-0'
        ]
        
        for selector in title_selectors:
            try:
                title_element = self.driver.find_element(By.CSS_SELECTOR, selector)
                return title_element.text
            except:
                continue
        
        return "Unknown Playlist"
    
    def _scroll_to_load_tracks(self):
        """Scroll down to load all tracks"""
        print("📜 Scrolling to load all tracks...")
        
        last_height = self.driver.execute_script("return document.body.scrollHeight")
        
        for scroll_attempt in range(10):  # Max 10 scrolls
            # Scroll to bottom
            self.driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
            
            # Wait for new content to load
            time.sleep(2)
            
            # Check if we've reached the end
            new_height = self.driver.execute_script("return document.body.scrollHeight")
            if new_height == last_height:
                break
            last_height = new_height
        
        print("✅ Finished scrolling")
    
    def _extract_tracks(self) -> List[Dict]:
        """Extract track data from the loaded page"""
        tracks = []
        
        try:
            # Get page source and look for JSON data
            page_source = self.driver.page_source
            
            # Method 1: Look for JSON data in script tags
            json_tracks = self._extract_from_json_scripts(page_source)
            if json_tracks:
                tracks.extend(json_tracks)
            
            # Method 2: Extract from DOM elements
            if not tracks:
                dom_tracks = self._extract_from_dom_elements()
                tracks.extend(dom_tracks)
            
            # Method 3: Regex extraction from page source
            if not tracks:
                regex_tracks = self._extract_with_regex(page_source)
                tracks.extend(regex_tracks)
            
        except Exception as e:
            print(f"⚠️ Error extracting tracks: {e}")
        
        return tracks[:50]  # Limit to 50 tracks
    
    def _extract_from_json_scripts(self, page_source: str) -> List[Dict]:
        """Extract tracks from JSON in script tags"""
        tracks = []
        
        try:
            # Look for common patterns in Spotify's JSON
            patterns = [
                r'window\.__data\s*=\s*({.*?});',
                r'"tracks":\s*{"items":\s*(\[.*?\])',
                r'"playlist":\s*{.*?"tracks":\s*{"items":\s*(\[.*?\])'
            ]
            
            for pattern in patterns:
                matches = re.findall(pattern, page_source, re.DOTALL)
                for match in matches:
                    try:
                        if match.startswith('['):
                            # It's a track array
                            track_data = json.loads(match)
                        else:
                            # It's a full object
                            data = json.loads(match)
                            track_data = self._find_tracks_in_json(data)
                        
                        if track_data:
                            for item in track_data:
                                track = self._parse_track_json(item)
                                if track:
                                    tracks.append(track)
                    except:
                        continue
                
                if tracks:
                    break
        
        except Exception as e:
            print(f"⚠️ JSON extraction error: {e}")
        
        return tracks
    
    def _extract_from_dom_elements(self) -> List[Dict]:
        """Extract tracks from DOM elements"""
        tracks = []
        
        try:
            # Try multiple selectors for track rows
            track_row_selectors = [
                '[data-testid="tracklist-row"]',
                '[data-testid="track-row"]',
                '.tracklist-row',
                '[role="row"]'
            ]
            
            track_rows = []
            for selector in track_row_selectors:
                try:
                    track_rows = self.driver.find_elements(By.CSS_SELECTOR, selector)
                    if track_rows:
                        print(f"✅ Found {len(track_rows)} track rows with selector: {selector}")
                        break
                except:
                    continue
            
            for row in track_rows:
                try:
                    track_data = self._extract_track_from_row(row)
                    if track_data:
                        tracks.append(track_data)
                except Exception as e:
                    continue  # Skip problematic rows
        
        except Exception as e:
            print(f"⚠️ DOM extraction error: {e}")
        
        return tracks
    
    def _extract_track_from_row(self, row_element) -> Dict:
        """Extract track data from a single row element"""
        try:
            # Try to find track name
            name_selectors = [
                '[data-testid="internal-track-link"]',
                '.track-name',
                'a[data-testid="track-name"]',
                '.tracklist-name'
            ]
            
            track_name = ""
            for selector in name_selectors:
                try:
                    name_element = row_element.find_element(By.CSS_SELECTOR, selector)
                    track_name = name_element.text or name_element.get_attribute('title')
                    if track_name:
                        break
                except:
                    continue
            
            # Try to find artist name
            artist_selectors = [
                '[data-testid="internal-track-link"] + span',
                '.track-artist',
                'a[data-testid="artist-name"]',
                '.tracklist-artists'
            ]
            
            artist_name = ""
            for selector in artist_selectors:
                try:
                    artist_element = row_element.find_element(By.CSS_SELECTOR, selector)
                    artist_name = artist_element.text or artist_element.get_attribute('title')
                    if artist_name:
                        break
                except:
                    continue
            
            # Try to find Spotify URL
            spotify_url = ""
            url_selectors = [
                '[data-testid="internal-track-link"]',
                'a[data-testid="track-name"]',
                '.track-name a'
            ]
            
            for selector in url_selectors:
                try:
                    url_element = row_element.find_element(By.CSS_SELECTOR, selector)
                    href = url_element.get_attribute('href')
                    if href and 'open.spotify.com/track/' in href:
                        spotify_url = href
                        break
                except:
                    continue
            
            # Extract track ID from URL if available
            track_id = ""
            if spotify_url:
                import re
                match = re.search(r'/track/([a-zA-Z0-9]+)', spotify_url)
                if match:
                    track_id = match.group(1)
            
            if track_name and len(track_name.strip()) > 0:
                return {
                    'id': track_id,
                    'name': track_name.strip(),
                    'artist': artist_name.strip() if artist_name else 'Unknown Artist',
                    'album': '',
                    'popularity': 0,
                    'album_art_url': None,
                    'spotify_url': spotify_url
                }
        
        except Exception as e:
            print(f"⚠️ Error extracting track from row: {e}")
        
        return None
    
    def _extract_with_regex(self, page_source: str) -> List[Dict]:
        """Extract tracks using regex patterns"""
        tracks = []
        
        try:
            # Look for track patterns in the HTML with URLs
            patterns = [
                r'href="(https://open\.spotify\.com/track/[^"]+)"[^>]*>([^<]+)</.*?data-testid="[^"]*artist[^"]*"[^>]*>([^<]+)<',
                r'"name":"([^"]+)".*?"artists":\[.*?"name":"([^"]+)".*?"external_urls":\{"spotify":"(https://open\.spotify\.com/track/[^"]+)"',
                r'data-testid="internal-track-link"[^>]*href="(https://open\.spotify\.com/track/[^"]+)"[^>]*>([^<]+)</.*?data-testid="[^"]*artist[^"]*"[^>]*>([^<]+)<',
                r'aria-label="([^"]+) by ([^"]+)".*?href="(https://open\.spotify\.com/track/[^"]+)"'
            ]
            
            for pattern in patterns:
                matches = re.findall(pattern, page_source, re.DOTALL)
                for match in matches:
                    if len(match) >= 3:
                        spotify_url = match[0].strip()
                        track_name = match[1].strip()
                        artist_name = match[2].strip()
                        
                        # Extract track ID from URL
                        track_id = ""
                        if spotify_url:
                            id_match = re.search(r'/track/([a-zA-Z0-9]+)', spotify_url)
                            if id_match:
                                track_id = id_match.group(1)
                        
                        if len(track_name) > 2 and len(artist_name) > 1:
                            tracks.append({
                                'id': track_id,
                                'name': track_name,
                                'artist': artist_name,
                                'album': '',
                                'popularity': 0,
                                'album_art_url': None,
                                'spotify_url': spotify_url
                            })
                
                if tracks:
                    break
        
        except Exception as e:
            print(f"⚠️ Regex extraction error: {e}")
        
        return tracks
    
    def _find_tracks_in_json(self, data: dict) -> List:
        """Recursively find tracks in JSON data"""
        if isinstance(data, dict):
            if 'tracks' in data and isinstance(data['tracks'], dict):
                items = data['tracks'].get('items', [])
                if isinstance(items, list):
                    return items
            
            # Search recursively
            for value in data.values():
                if isinstance(value, (dict, list)):
                    result = self._find_tracks_in_json(value)
                    if result:
                        return result
        
        elif isinstance(data, list):
            for item in data:
                if isinstance(item, dict):
                    result = self._find_tracks_in_json(item)
                    if result:
                        return result
        
        return []
    
    def _parse_track_json(self, item: dict) -> Dict:
        """Parse a track from JSON data"""
        try:
            track = item.get('track', item)
            
            if not isinstance(track, dict):
                return None
            
            name = track.get('name', '')
            artists = track.get('artists', [])
            
            if isinstance(artists, list):
                artist_names = [a.get('name', '') for a in artists if isinstance(a, dict)]
                artist = ', '.join(artist_names) if artist_names else 'Unknown'
            else:
                artist = 'Unknown'
            
            if name and len(name) > 1:
                return {
                    'id': track.get('id', ''),
                    'name': name,
                    'artist': artist,
                    'album': track.get('album', {}).get('name', ''),
                    'popularity': track.get('popularity', 0),
                    'album_art_url': self._get_album_art(track.get('album', {})),
                    'spotify_url': f"https://open.spotify.com/track/{track.get('id', '')}"
                }
        
        except Exception as e:
            print(f"⚠️ Error parsing track JSON: {e}")
        
        return None
    
    def _get_album_art(self, album: dict) -> str:
        """Get album art URL"""
        try:
            images = album.get('images', [])
            if isinstance(images, list) and images:
                return max(images, key=lambda x: x.get('width', 0)).get('url', '')
        except:
            pass
        return ''
    
    def scrape_new_music_friday(self) -> List[Dict]:
        """Scrape the exact New Music Friday playlist"""
        url = "https://open.spotify.com/playlist/37i9dQZF1DX4JAvHpjipBk"
        return self.scrape_playlist(url)
    
    def scrape_release_radar(self) -> List[Dict]:
        """Scrape the exact Release Radar playlist"""
        url = "https://open.spotify.com/playlist/37i9dQZEVXbl2WP21t2Aqe"
        return self.scrape_playlist(url)
    
    def close(self):
        """Close the browser"""
        if self.driver:
            self.driver.quit()
            print("🚪 Browser closed")

def test_selenium_scraper():
    """Test the Selenium scraper"""
    scraper = None
    
    try:
        print("🧪 Testing Selenium Scraper for exact playlists...")
        scraper = SpotifySeleniumScraper(headless=False)  # Set to True for headless mode
        
        # Test New Music Friday
        print("\n1️⃣ Scraping New Music Friday (37i9dQZF1DX4JAvHpjipBk)...")
        nmf_tracks = scraper.scrape_new_music_friday()
        
        if nmf_tracks:
            print(f"✅ Successfully scraped {len(nmf_tracks)} New Music Friday tracks:")
            for i, track in enumerate(nmf_tracks[:5]):
                print(f"  {i+1}. {track['name']} - {track['artist']}")
        else:
            print("❌ No New Music Friday tracks found")
        
        print("\n" + "="*60)
        
        # Test Release Radar
        print("\n2️⃣ Scraping Release Radar (37i9dQZEVXbl2WP21t2Aqe)...")
        rr_tracks = scraper.scrape_release_radar()
        
        if rr_tracks:
            print(f"✅ Successfully scraped {len(rr_tracks)} Release Radar tracks:")
            for i, track in enumerate(rr_tracks[:5]):
                print(f"  {i+1}. {track['name']} - {track['artist']}")
        else:
            print("❌ No Release Radar tracks found")
        
        # Save results
        if nmf_tracks or rr_tracks:
            results = {
                'new_music_friday': nmf_tracks,
                'release_radar': rr_tracks,
                'scraped_at': time.strftime('%Y-%m-%d %H:%M:%S'),
                'method': 'selenium_scraper'
            }
            
            with open('selenium_scraped_data.json', 'w', encoding='utf-8') as f:
                json.dump(results, f, indent=2, ensure_ascii=False)
            
            print(f"\n💾 Scraped data saved to selenium_scraped_data.json")
        
        return nmf_tracks, rr_tracks
        
    except Exception as e:
        print(f"❌ Scraper test failed: {e}")
        return [], []
    
    finally:
        if scraper:
            scraper.close()

if __name__ == "__main__":
    test_selenium_scraper()