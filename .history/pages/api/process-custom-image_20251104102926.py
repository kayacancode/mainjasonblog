#!/usr/bin/env python3
"""
Process custom user-uploaded image with branding overlay
This script can be called from Node.js API endpoint
"""

import sys
import json
import os
import requests
from PIL import Image, ImageDraw, ImageFont
from io import BytesIO
import base64

def load_font_prefer_helvetica(size: int, condensed: bool = False):
    """Load font preferring Helvetica Neue"""
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

def process_custom_image(image_url: str, track_name: str = "Custom Image", artist_name: str = "Custom") -> bytes:
    """
    Process a custom image by adding branding overlay
    
    Args:
        image_url: URL of the image to process
        track_name: Track name for bottom-left text
        artist_name: Artist name for top text
        
    Returns:
        Processed image as bytes
    """
    # Download image
    response = requests.get(image_url)
    response.raise_for_status()
    
    # Open image
    artist_image = Image.open(BytesIO(response.content))
    
    # Convert to RGB if needed
    if artist_image.mode != 'RGB':
        artist_image = artist_image.convert('RGB')
    
    # Resize to Instagram-friendly dimensions (1080x1080)
    target_size = (1080, 1080)
    artist_image = artist_image.resize(target_size, Image.Resampling.LANCZOS)
    
    # Create overlay with branding
    overlay = Image.new('RGBA', target_size, (0, 0, 0, 0))
    draw_overlay = ImageDraw.Draw(overlay)
    
    # Colors
    off_white = (232, 220, 207, 255)
    light_gray = (210, 210, 210, 255)
    pure_white = (255, 255, 255, 255)
    brand_red = (226, 62, 54, 255)
    
    size_multiplier = 1.0
    title_font = load_font_prefer_helvetica(int(85 * size_multiplier), condensed=False)
    name_font = load_font_prefer_helvetica(int(60 * size_multiplier), condensed=False)
    stacked_font_big = load_font_prefer_helvetica(int(65 * size_multiplier), condensed=False)
    stacked_font_small = load_font_prefer_helvetica(int(50 * size_multiplier), condensed=False)
    
    # Rounded white border
    radius = 40
    margin = 28
    draw_overlay.rounded_rectangle(
        [(margin, margin), (target_size[0]-margin, target_size[1]-margin)],
        radius=radius,
        outline=pure_white,
        width=18
    )
    
    # Top artist name (uppercase, centered)
    artist_name_upper = (artist_name or "").upper()
    available_width = target_size[0] - (margin * 2) - 40
    artist_font_size = int(160 * size_multiplier)
    
    # Find optimal font size
    while artist_font_size > 80:
        test_font = load_font_prefer_helvetica(artist_font_size, condensed=False)
        test_bbox = draw_overlay.textbbox((0, 0), artist_name_upper, font=test_font)
        test_width = test_bbox[2] - test_bbox[0]
        if test_width <= available_width:
            break
        artist_font_size -= 10
    
    # Handle multi-line if needed
    if artist_font_size <= int(80 * size_multiplier):
        artist_font_size = int(100 * size_multiplier)
        words = artist_name_upper.split()
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
                    lines.append(word[:20] + "...")
                    current_line = ""
        if current_line:
            lines.append(current_line)
    else:
        lines = [artist_name_upper]
    
    dynamic_title_font = load_font_prefer_helvetica(artist_font_size, condensed=False)
    
    # Position artist name at top
    if len(lines) == 1:
        name_bbox = draw_overlay.textbbox((0, 0), lines[0], font=dynamic_title_font)
        name_w = name_bbox[2] - name_bbox[0]
        name_x = (target_size[0] - name_w) // 2
        name_y = margin + 30
        draw_overlay.text((name_x, name_y), lines[0], fill=off_white, font=dynamic_title_font, stroke_width=3, stroke_fill=(0,0,0,160))
    else:
        line_height = 0
        for line in lines:
            bbox = draw_overlay.textbbox((0, 0), line, font=dynamic_title_font)
            line_height = max(line_height, bbox[3] - bbox[1])
        total_height = (line_height + 20) * len(lines)
        start_y = margin + 30
        for i, line in enumerate(lines):
            line_bbox = draw_overlay.textbbox((0, 0), line, font=dynamic_title_font)
            line_w = line_bbox[2] - line_bbox[0]
            line_x = (target_size[0] - line_w) // 2
            line_y = start_y + (i * (line_height + 20))
            draw_overlay.text((line_x, line_y), line, fill=off_white, font=dynamic_title_font, stroke_width=3, stroke_fill=(0,0,0,160))
    
    # Bottom-left track title
    track_title = (track_name or "").upper()
    available_width = (target_size[0] // 2) - margin - 20
    track_font_size = int(100 * size_multiplier)
    
    while track_font_size > 60:
        test_font = load_font_prefer_helvetica(track_font_size, condensed=False)
        test_bbox = draw_overlay.textbbox((0, 0), track_title, font=test_font)
        test_width = test_bbox[2] - test_bbox[0]
        if test_width <= available_width:
            break
        track_font_size -= 5
    
    if track_font_size <= int(60 * size_multiplier):
        track_font_size = int(75 * size_multiplier)
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
                    lines.append(word[:15] + "...")
                    current_line = ""
        if current_line:
            lines.append(current_line)
    else:
        lines = [track_title]
    
    dynamic_track_font = load_font_prefer_helvetica(track_font_size, condensed=False)
    
    l_margin = margin + 30
    b_margin = margin + 50
    line_height = 0
    for line in lines:
        bbox = draw_overlay.textbbox((0, 0), line, font=dynamic_track_font)
        line_height = max(line_height, bbox[3] - bbox[1])
    total_height = (line_height + 20) * len(lines)
    start_y = target_size[1] - b_margin - total_height
    
    for i, line in enumerate(lines):
        y_pos = start_y + (i * (line_height + 20))
        draw_overlay.text((l_margin, y_pos), line, fill=off_white, font=dynamic_track_font, stroke_width=2, stroke_fill=(0,0,0,150))
    
    # Bottom-right stacked NEW / MUSIC / FRIDAY
    r_margin = margin + 50
    b_margin_right = margin + 40
    words_stack = [
        ("NEW", brand_red, stacked_font_big),
        ("MUSIC", light_gray, stacked_font_small),
        ("FRIDAY", light_gray, stacked_font_small),
    ]
    max_w = 0
    heights = []
    for w, color, fnt in words_stack:
        bbox = draw_overlay.textbbox((0,0), w, font=fnt)
        max_w = max(max_w, bbox[2]-bbox[0])
        heights.append(bbox[3]-bbox[1])
    x_right = target_size[0] - r_margin
    y_start = target_size[1] - b_margin_right - sum(heights) - 16*2
    y = y_start
    for (w, color, fnt), h in zip(words_stack, heights):
        bbox = draw_overlay.textbbox((0,0), w, font=fnt)
        w_px = bbox[2]-bbox[0]
        x = x_right - w_px
        draw_overlay.text((x, y), w, fill=color, font=fnt, stroke_width=2, stroke_fill=(0,0,0,150))
        y += h + 16
    
    # Add ISWT branding
    iswt_text = "ISWT"
    iswt_font = load_font_prefer_helvetica(int(50 * size_multiplier), condensed=False)
    iswt_bbox = draw_overlay.textbbox((0, 0), iswt_text, font=iswt_font)
    iswt_width = iswt_bbox[2] - iswt_bbox[0]
    iswt_height = iswt_bbox[3] - iswt_bbox[1]
    iswt_x = target_size[0] - iswt_width - 50
    iswt_y = target_size[1] - iswt_height - 50
    
    padding = 8
    bg_rect = [
        iswt_x - padding,
        iswt_y - padding,
        iswt_x + iswt_width + padding,
        iswt_y + iswt_height + padding
    ]
    draw_overlay.rectangle(bg_rect, fill=(0, 0, 0, 180))
    draw_overlay.text((iswt_x + 2, iswt_y + 2), iswt_text, fill=(0, 0, 0, 220), font=iswt_font)
    draw_overlay.text((iswt_x, iswt_y), iswt_text, fill=pure_white, font=iswt_font)
    
    # Composite overlays
    artist_image = artist_image.convert('RGBA')
    black_overlay = Image.new('RGBA', target_size, (0, 0, 0, 60))
    artist_image = Image.alpha_composite(artist_image, black_overlay)
    final_image = Image.alpha_composite(artist_image, overlay)
    final_image = final_image.convert('RGB')
    
    # Save to bytes
    output = BytesIO()
    final_image.save(output, format='PNG', quality=95)
    return output.getvalue()

if __name__ == '__main__':
    # Read JSON from stdin
    input_data = json.load(sys.stdin)
    
    image_url = input_data.get('imageUrl')
    track_name = input_data.get('trackName', 'Custom Image')
    artist_name = input_data.get('artistName', 'Custom')
    
    try:
        processed_image = process_custom_image(image_url, track_name, artist_name)
        # Output base64 encoded image
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

