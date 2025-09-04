# 🎵 Automated Music Update Scheduling System

This document explains how to set up automated weekly music updates using GitHub Actions.

## 🚀 Overview

The system automatically runs your Spotify scraper every Friday to pull the latest tracks from "New Music Friday" and "Release Radar" playlists, ensuring you always have fresh music content.

## ⚙️ Setup Instructions

### 1. GitHub Secrets Configuration

You need to add the following secrets to your GitHub repository:

1. Go to your repository → **Settings** → **Secrets and variables** → **Actions**
2. Add these repository secrets:

```
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
SPOTIFY_REDIRECT_URI=your_spotify_redirect_uri
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_SUPABASE_SERVICE_KEY
```

### 2. GitHub Actions Workflow

The workflow file `.github/workflows/music-update.yml` is already configured and will:

- **Schedule**: Run every Friday at 2 PM UTC (10 AM EST, 7 AM PST, 6 PM CET)
- **Manual Trigger**: Allow manual execution via GitHub Actions tab
- **Environment**: Set up Python 3.9 with Chrome browser and virtual display
- **Dependencies**: Install all required Python packages and system tools
- **Execution**: Run your `py_scraper.py` script in headless mode
- **Auto-commit**: Commit any changes made by the scraper
- **Error Handling**: Provide detailed success/failure summaries

### 3. Workflow Features

#### Automatic Scheduling
- **Cron**: `0 14 * * 5` (Every Friday at 2 PM UTC)
- **Timezone**: UTC (adjust cron if you need different timezone)
- **Frequency**: Weekly

#### Manual Triggering
- Go to **Actions** tab in your repository
- Select **Weekly Music Update** workflow
- Click **Run workflow** button
- Choose branch and click **Run workflow**

#### Execution Environment
- **Python**: 3.9 with all required packages
- **Browser**: Chrome with virtual display for headless operation
- **Modules**: Local module support configured with proper Python path
- **Environment**: Headless operation ready with Xvfb virtual display
- **Authentication**: Environment variables loaded from GitHub Secrets

#### Dependencies Installation
The workflow automatically installs:
- `spotipy` - Spotify API client
- `python-dotenv` - Environment variable management
- `supabase` - Supabase client
- `selenium` - Web automation framework
- `webdriver-manager` - Chrome driver management
- `pillow` - Image processing
- `requests` - HTTP requests
- `typing-extensions` - Enhanced typing support

#### System Dependencies
- **Google Chrome**: Browser for Selenium automation
- **Virtual Display (Xvfb)**: Headless operation support
- **Python 3.9**: Runtime environment
- **Ubuntu Latest**: Operating system with all required tools

## 📊 Monitoring

### GitHub Actions Tab
- View all workflow runs
- Check execution logs
- Monitor success/failure rates
- See execution times

### Manual Monitoring
- Check your Supabase database for new tracks
- Review the tracks management interface
- Monitor for any error notifications

## 🔧 Customization

### Change Schedule
Edit `.github/workflows/music-update.yml`:

```yaml
on:
  schedule:
    - cron: '0 9 * * 1'  # Every Monday at 9 AM UTC
```

### Change Timezone
The cron runs in UTC. To convert to your timezone:
- **EST**: UTC-5 (add 5 hours to UTC time)
- **PST**: UTC-8 (add 8 hours to UTC time)
- **CET**: UTC+1 (subtract 1 hour from UTC time)

### Add Notifications
You can add Slack, Discord, or email notifications to the workflow:

```yaml
- name: Notify on success
  uses: 8398a7/action-slack@v3
  with:
    status: success
    text: '🎵 Music update completed successfully!'
  env:
    SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

## 🚨 Troubleshooting

### Common Issues

1. **Environment Variables Missing**
   - Ensure all secrets are set in GitHub repository
   - Check secret names match exactly

2. **Python Dependencies**
   - Verify `py_scraper.py` has all required imports
   - Check for any missing Python packages
   - Ensure Selenium and Chrome dependencies are available
   - Verify local module imports (selenium_scraper, etc.)

3. **File Paths**
   - Ensure `py_scraper.py` is in `pages/api/spotify_api/`
   - Check file permissions

4. **Authentication Issues**
   - Verify Spotify credentials are valid
   - Check Supabase connection

### Debug Steps

1. **Check Workflow Logs**
   - Go to Actions tab
   - Click on failed workflow run
   - Review step-by-step logs

2. **Test Locally**
   - Run `python py_scraper.py` locally
   - Check for any errors

3. **Verify Secrets**
   - Ensure all environment variables are accessible
   - Test Spotify API connection

## 📈 Benefits

- **Automated**: No manual intervention needed
- **Consistent**: Regular weekly updates
- **Reliable**: GitHub Actions infrastructure
- **Monitored**: Full execution history
- **Flexible**: Easy to modify schedule
- **Scalable**: Can handle multiple playlists

## 📝 Notes

- The workflow runs in a clean Ubuntu environment
- Each run installs dependencies fresh (Python packages, Chrome, virtual display)
- Chrome runs in headless mode with virtual display for automation
- Local Python modules are properly configured with PYTHONPATH
- Changes are automatically committed to your repository
- Failed runs are logged for debugging with detailed summaries
- You can disable the workflow in GitHub Actions settings

---

**Next scheduled run**: Every Friday at 2 PM UTC  
**Last run**: Check GitHub Actions tab  
**Status**: Active ✅
