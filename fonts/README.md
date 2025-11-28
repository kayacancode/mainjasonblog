# Fonts Directory

This directory contains font configuration and font files for Sharp image generation in serverless environments.

## Setup

The `fonts.conf` file configures fontconfig to:
- Look for fonts in `/var/task/fonts/` (Vercel serverless path)
- Use `/tmp/fonts-cache/` as the writable cache directory

## Adding Fonts

To add custom fonts, place `.ttf` or `.otf` files in this directory. They will be automatically included in the serverless function bundle when the API route reads this directory.

Recommended fonts for serverless compatibility:
- DejaVu Sans (free, widely available)
- Liberation Sans (free, similar to Arial)
- Noto Sans (free, good Unicode support)

## Environment Variable

Set `FONTCONFIG_PATH` in Vercel to `/var/task/fonts` (or let the code set it automatically).


