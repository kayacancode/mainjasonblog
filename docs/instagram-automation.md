# Instagram Automation Setup Guide

This document covers the complete setup for the Blog→Instagram carousel automation system.

## Overview

The automation system converts published blog posts into Instagram carousels with:
- Slide 1: Blog cover art with title overlay
- Slide 2: AI-generated summary in Jason's voice
- Additional slides: Optional content slides

## Environment Variables

Add these to your `.env.local` (development) and Vercel environment variables (production):

### Required Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...your-anon-key
SUPABASE_SERVICE_KEY=eyJ...your-service-key

# Meta/Facebook (for Instagram Graph API)
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret

# AI Provider (choose one)
OPENAI_API_KEY=sk-...your-openai-key
# OR
ANTHROPIC_API_KEY=sk-ant-...your-anthropic-key
```

### Optional Variables

```env
# Fallback page token (if OAuth flow has issues)
FACEBOOK_PAGE_ACCESS_TOKEN=your-long-lived-page-token

# AI Configuration
AI_PROVIDER=openai          # or 'anthropic'
AI_MODEL=gpt-4o-mini        # or 'claude-3-sonnet-20240229'

# Base URL (auto-detected on Vercel)
NEXT_PUBLIC_BASE_URL=https://www.insuavewetrust.com
```

## Database Setup

Run the migration to add required tables and columns:

### Option 1: Supabase Dashboard

1. Go to SQL Editor in Supabase Dashboard
2. Paste the contents of `supabase/migrations/005_blog_instagram_status.sql`
3. Click "Run"

### Option 2: Supabase CLI

```bash
supabase db push
```

### Tables Created

| Table | Purpose |
|-------|---------|
| `posts` (columns added) | Instagram status, assets, AI summary |
| `instagram_carousel_runs` | Track each generation/publish attempt |
| `ai_caption_corpus` | Historical captions for style training |
| `ai_caption_feedback` | Human edits for improving AI |
| `instagram_tokens` | Cached page access tokens |

## Meta/Facebook App Setup

### 1. Create a Meta App

1. Go to [Meta Developers](https://developers.facebook.com/)
2. Create a new app (Business type)
3. Add "Instagram Graph API" product

### 2. Configure Permissions

Required permissions:
- `pages_show_list`
- `pages_read_engagement`
- `instagram_basic`
- `instagram_content_publish`
- `instagram_manage_comments`

### 3. Link Facebook Page to Instagram

1. In Facebook Business Suite, connect your Instagram Business account
2. Ensure the Facebook Page is set as the linked page
3. The user authenticating must be an Admin of the Facebook Page

### 4. Configure OAuth

Add these redirect URIs in Meta App settings:
- `https://www.insuavewetrust.com/instagram-callback`
- `http://localhost:3000/instagram-callback` (development)

## Supabase Storage Setup

The system uses the `instagram-images` bucket. Ensure it exists and has proper policies:

```sql
-- Already created by migration 004, but verify:
INSERT INTO storage.buckets (id, name, public)
VALUES ('instagram-images', 'instagram-images', true)
ON CONFLICT (id) DO UPDATE SET public = excluded.public;
```

### Folder Structure

```
instagram-images/
├── blog/
│   ├── {post-id}/
│   │   ├── slide-1.png
│   │   ├── slide-2.png
│   │   └── slide-{n}.png
│   └── ...
└── ... (existing tracklist images)
```

## API Endpoints

### Blog Instagram Orchestration

`POST /api/blog-instagram`

```json
{
  "postId": "uuid",
  "mode": "preview" | "publish" | "retry"
}
```

### AI Caption Generation

`POST /api/ai/generate-style-caption`

```json
{
  "postId": "uuid",
  "title": "Blog Post Title",
  "content": "Full blog post text...",
  "regenerate": false
}
```

### AI Feedback

`POST /api/ai/feedback`

```json
{
  "postId": "uuid",
  "runId": "uuid",
  "aiGeneratedText": "Original AI text",
  "humanEditedText": "Edited text",
  "styleRating": 8,
  "feedbackNotes": "Changed tone slightly"
}
```

## Admin Dashboard Features

### Create/Edit Post Page

- **Instagram Toggle**: Enable/disable automation for each post
- **Cover Override**: Upload custom cover art instead of default
- **Preview Carousel**: See generated slides before publishing
- **AI Summary Editor**: View, edit, and rate AI-generated text

### Dashboard

- **Status Badge**: Shows current Instagram status per post
- **Retry Button**: Re-attempt failed publishes
- **View Assets**: See generated slide images
- **Error Details**: View failure reasons

## Workflow

### Automatic Publishing

1. Create blog post with Instagram toggle enabled
2. On publish, system automatically:
   - Generates Slide 1 (cover + title)
   - Calls AI to generate Slide 2 summary
   - Uploads assets to Supabase Storage
   - Creates Instagram carousel via Graph API
   - Records status in database

### Manual Preview/Publish

1. Create blog post (can leave unpublished)
2. Click "Preview IG Carousel" to generate preview
3. Edit AI summary if needed
4. Click "Publish to Instagram" when ready

### Retry Flow

1. If publish fails, status shows "failed"
2. Check error message in dashboard
3. Fix any issues (token, image, etc.)
4. Click "Retry" to attempt again

## Troubleshooting

### Common Issues

**"No Instagram Business account found"**
- Ensure Facebook Page is linked to Instagram Business account
- Verify you're an Admin of the Facebook Page
- Re-authenticate OAuth flow

**"Token expired"**
- Long-lived tokens last ~60 days
- Set `FACEBOOK_PAGE_ACCESS_TOKEN` as fallback
- Re-authenticate to refresh tokens

**"Image URL not accessible"**
- Ensure Supabase bucket is public
- Check storage policies allow reads
- Verify image was uploaded successfully

**"AI generation failed"**
- Check API key is valid
- Verify AI provider is set correctly
- Check rate limits haven't been exceeded

### Debug Mode

Enable verbose logging by setting:

```env
DEBUG=instagram:*
```

Or call the env validation helper:

```javascript
import { logEnvStatus } from '../lib/env';
logEnvStatus();
```

## AI Style Training

### Adding Training Data

1. Go to Supabase Dashboard
2. Open `ai_caption_corpus` table
3. Add historical captions with:
   - `caption_text`: The actual caption
   - `source_type`: 'manual', 'instagram', or 'blog'
   - `style_markers`: JSON with style analysis

### Improving AI Output

The system learns from human edits:

1. AI generates initial summary
2. Admin edits if needed
3. Admin rates the output (1-10)
4. System stores original + edited for training

Higher-rated outputs and approved edits influence future generations.

## Monitoring

### Key Metrics to Track

- Success rate (published / attempted)
- Average retry count
- AI style rating trends
- Token refresh frequency

### Supabase Queries

```sql
-- Recent carousel runs
SELECT * FROM instagram_carousel_runs 
ORDER BY created_at DESC LIMIT 20;

-- Failed posts
SELECT p.title, p.instagram_error, p.instagram_retry_count
FROM posts p
WHERE p.instagram_status = 'failed';

-- AI feedback summary
SELECT 
  AVG(style_rating) as avg_rating,
  COUNT(*) FILTER (WHERE was_edited) as edited_count,
  COUNT(*) as total_count
FROM ai_caption_feedback;
```

## Testing

### Running Unit Tests

```bash
# Install Jest if not already installed
npm install --save-dev jest @babel/preset-env babel-jest

# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test -- __tests__/instagram.test.js
```

### Manual QA Checklist

Use this checklist before deploying to production:

#### Pre-Deployment Checks

- [ ] All environment variables are set in Vercel
- [ ] Database migrations have been applied
- [ ] Instagram tokens are valid and not expired
- [ ] AI API key is valid with sufficient credits

#### Automatic Publishing Flow

1. [ ] Create a new blog post with Instagram toggle enabled
2. [ ] Publish the post
3. [ ] Verify status changes: none -> generating -> publishing -> published
4. [ ] Check that carousel appears on Instagram
5. [ ] Verify Slide 1 has correct title overlay
6. [ ] Verify Slide 2 has AI-generated summary
7. [ ] Verify caption includes title, summary, and hashtags
8. [ ] Verify database records are updated correctly

#### Manual Preview Flow

1. [ ] Create a new blog post (don't publish yet)
2. [ ] Click "Preview IG Carousel" button
3. [ ] Verify preview modal shows both slides
4. [ ] Edit AI summary in the text area
5. [ ] Rate the AI output (1-10)
6. [ ] Submit feedback
7. [ ] Verify feedback is stored in `ai_caption_feedback` table

#### Retry Flow

1. [ ] Intentionally create a failing condition (e.g., invalid token)
2. [ ] Attempt to publish (should fail)
3. [ ] Verify status shows "failed" with error message
4. [ ] Fix the issue
5. [ ] Click "Retry" button
6. [ ] Verify post publishes successfully

#### Token Refresh Flow

1. [ ] Check current token expiration date
2. [ ] Re-authenticate via OAuth
3. [ ] Verify new token is cached in `instagram_tokens` table
4. [ ] Verify old token is marked as invalid

#### AI Personalization Flow

1. [ ] Add at least 5 captions to `ai_caption_corpus`
2. [ ] Generate AI summary for a new post
3. [ ] Verify summary style matches example captions
4. [ ] Edit the summary and rate it 8+
5. [ ] Verify edited version is added to corpus (if rated 7+)

#### Error Handling

1. [ ] Test with missing cover image - should use placeholder
2. [ ] Test with very long title - should truncate properly
3. [ ] Test with special characters in title - should escape for SVG
4. [ ] Test with AI API down - should use fallback summary
5. [ ] Test with Supabase storage error - should report error clearly

#### Performance Checks

- [ ] Carousel generation completes within 30 seconds
- [ ] Preview loads within 10 seconds
- [ ] Dashboard loads Instagram status without delay
- [ ] No memory leaks in serverless functions

### Staging vs Production

Before enabling automation in production:

1. Test complete flow in staging environment
2. Verify all API keys work in production context
3. Confirm Facebook App is in "Live" mode (not development)
4. Ensure Instagram Business account is properly linked
5. Run through checklist above in production with a test post
6. Delete test post from Instagram before announcing feature

### Known Limitations

- Instagram API rate limits: 25 posts per day max
- Long-lived tokens expire in ~60 days
- Image processing may fail for very large images (>10MB)
- Carousel limited to 10 slides maximum
- AI generation requires OpenAI or Anthropic API key

