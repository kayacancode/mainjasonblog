#!/usr/bin/env python3
"""
Process album art image with branding overlay
Standalone script with all overlay logic included
"""

import sys
import json
import os
import tempfile
from io import BytesIO

# Try to import required libraries
try:
    import requests
except ImportError:
    print(json.dumps({'success': False, 'error': 'requests library not installed. Run: pip install requests'}))
    sys.exit(1)

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    print(json.dumps({'success': False, 'error': 'PIL/Pillow library not installed. Run: pip install Pillow'}))
    sys.exit(1)

def process_image_with_overlay(image_url, track_name, artist_name):
    """Process image URL with branding overlay"""
    try:
        # Download image
        response = requests.get(image_url, timeout=30)
        response.raise_for_status()
        
        # Create temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as tmp_file:
            tmp_file.write(response.content)
            tmp_path = tmp_file.name
        
        try:
            # Create mock track dict
            track_dict = {
                'name': track_name,
                'artist': artist_name,
                'album_art_url': image_url
            }
            
            
            # Open and resize image
            img = Image.open(tmp_path)
            if img.mode != 'RGB':
                img = img.convert('RGB')
            img = img.resize((1080, 1080), Image.Resampling.LANCZOS)
            
            # Create overlay using the same logic as create_single_artist_image
            # This is a simplified version - you may want to copy the full logic
            overlay = Image.new('RGBA', (1080, 1080), (0, 0, 0, 0))
            draw = ImageDraw.Draw(overlay)
            
            # Colors
            off_white = (232, 220, 207, 255)
            pure_white = (255, 255, 255, 255)
            brand_red = (226, 62, 54, 255)
            light_gray = (210, 210, 210, 255)
            
            # Load font function (same as main.py)
            def load_font_prefer_helvetica(size: int, condensed: bool = False):
                candidates = [
                    # macOS fonts
                    ("/System/Library/Fonts/HelveticaNeue.ttc", [0, 1, 2, 3, 4, 5, 6, 7, 8]),
                    ("/System/Library/Fonts/Helvetica.ttc", [0, 1, 2, 3, 4, 5]),
                    ("/Library/Fonts/HelveticaNeue.ttc", [0, 1, 2, 3, 4, 5, 6]),
                    ("/System/Library/Fonts/Supplemental/HelveticaNeue.ttc", [0, 1, 2, 3, 4, 5, 6]),
                    # Windows fonts
                    ("C:/Windows/Fonts/arialbd.ttf", [0]),
                    ("C:/Windows/Fonts/arial.ttf", [0]),
                    ("C:/Windows/Fonts/calibrib.ttf", [0]),
                    ("C:/Windows/Fonts/calibri.ttf", [0]),
                    ("C:/Windows/Fonts/segoeuib.ttf", [0]),
                    ("C:/Windows/Fonts/segoeui.ttf", [0]),
                    # Linux fonts
                    ("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", [0]),
                    ("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", [0]),
                    ("/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf", [0]),
                    ("/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf", [0]),
                    ("/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf", [0]),
                    ("/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf", [0]),
                    ("Arial.ttf", [0])
                ]
                index_order = [2, 3, 1, 4, 5, 0]
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
            
            size_multiplier = 1.0
            
            # White border
            margin = 28
            radius = 40
            draw.rounded_rectangle(
                [(margin, margin), (1080-margin, 1080-margin)],
                radius=radius,
                outline=pure_white,
                width=18
            )
            
            # Top artist name (centered)
            artist_font = load_font(120)
            artist_text = artist_name.upper()
            bbox = draw.textbbox((0, 0), artist_text, font=artist_font)
            text_width = bbox[2] - bbox[0]
            text_x = (1080 - text_width) // 2
            text_y = margin + 30
            draw.text((text_x, text_y), artist_text, fill=off_white, font=artist_font, stroke_width=3, stroke_fill=(0,0,0,160))
            
            # Bottom-left track name
            track_font = load_font(75)
            track_text = track_name.upper()
            draw.text((margin + 30, 1080 - margin - 100), track_text, fill=off_white, font=track_font, stroke_width=2, stroke_fill=(0,0,0,150))
            
            # Bottom-right NEW MUSIC FRIDAY
            new_font = load_font(65)
            music_font = load_font(50)
            draw.text((1080 - margin - 200, 1080 - margin - 150), "NEW", fill=brand_red, font=new_font, stroke_width=2, stroke_fill=(0,0,0,150))
            draw.text((1080 - margin - 200, 1080 - margin - 100), "MUSIC", fill=light_gray, font=music_font, stroke_width=2, stroke_fill=(0,0,0,150))
            draw.text((1080 - margin - 200, 1080 - margin - 50), "FRIDAY", fill=light_gray, font=music_font, stroke_width=2, stroke_fill=(0,0,0,150))
            
            # ISWT branding
            iswt_font = load_font(50)
            iswt_text = "ISWT"
            iswt_bbox = draw.textbbox((0, 0), iswt_text, font=iswt_font)
            iswt_width = iswt_bbox[2] - iswt_bbox[0]
            iswt_x = 1080 - iswt_width - 50
            iswt_y = 1080 - 100
            draw.rectangle([iswt_x - 8, iswt_y - 8, iswt_x + iswt_width + 8, iswt_y + 60], fill=(0, 0, 0, 180))
            draw.text((iswt_x + 2, iswt_y + 2), iswt_text, fill=(0, 0, 0, 220), font=iswt_font)
            draw.text((iswt_x, iswt_y), iswt_text, fill=pure_white, font=iswt_font)
            
            # Composite
            img = img.convert('RGBA')
            black_overlay = Image.new('RGBA', (1080, 1080), (0, 0, 0, 60))
            img = Image.alpha_composite(img, black_overlay)
            final_img = Image.alpha_composite(img, overlay)
            final_img = final_img.convert('RGB')
            
            # Convert to bytes
            output = BytesIO()
            final_img.save(output, format='PNG', quality=95)
            return output.getvalue()
            
        finally:
            # Cleanup temp file
            try:
                os.unlink(tmp_path)
            except:
                pass
                
    except Exception as e:
        raise Exception(f"Error processing image: {str(e)}")

if __name__ == '__main__':
    try:
        input_data = json.load(sys.stdin)
        image_url = input_data.get('imageUrl')
        track_name = input_data.get('trackName', 'Custom Image')
        artist_name = input_data.get('artistName', 'Custom')
        
        if not image_url:
            print(json.dumps({'success': False, 'error': 'imageUrl is required'}))
            sys.exit(1)
        
        processed_image = process_image_with_overlay(image_url, track_name, artist_name)
        
        import base64
        result = {
            'success': True,
            'image': base64.b64encode(processed_image).decode('utf-8')
        }
        print(json.dumps(result))
        
    except Exception as e:
        result = {
            'success': False,
            'error': str(e)
        }
        print(json.dumps(result))
        sys.exit(1)

