"""
Email notification system for New Music Friday automation
Sends automated emails to clients when content is ready
"""

import logging
import os
from datetime import datetime, timedelta
from typing import Optional

import requests

logger = logging.getLogger(__name__)

class EmailNotifier:
    """Handles sending email notifications for New Music Friday content"""
    
    def __init__(self):
        # Try environment variables first, then fall back to hardcoded credentials
        self.api_key = os.getenv('SENDGRID_API_KEY')
        self.client_email = os.getenv('CLIENT_EMAIL_ADDRESS', 'client@example.com')
        self.dashboard_url = os.getenv('DASHBOARD_URL', 'https://your-domain.com/tracks-management')
        
        # Fallback to hardcoded credentials if environment variables are not available
        if not self.api_key:
            # TODO: Replace with your actual SendGrid API key
            self.api_key = "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"
            self.client_email = "shayan1baig@gmail.com"  # Replace with actual client email
            self.dashboard_url = "https://www.insuavewetrust.com/tracks-management"  # Replace with your actual domain
            logger.info("🔍 Using hardcoded email credentials for testing")
        
        if not self.api_key or self.api_key == "SG.Ee5x-iAGRTi-u8_ZBBpdNQ.UqihyPftWrjKYyxFHLR6QPexfAWjF1idq1hUT3fxyIYG.Ee5x-iAGRTi-u8_ZBBpdNQ.UqihyPftWrjKYyxFHLR6QPexfAWjF1idq1hUT3fxyIY":
            logger.warning("⚠️ SendGrid API key not configured, email notifications disabled")
            self.enabled = False
        else:
            # Sender verification completed - enable email notifications
            self.enabled = True
            logger.info("✅ Email notifier initialized and enabled")
    
    def send_weekly_notification(self, 
                                artist_name: str, 
                                track_name: str, 
                                week_start: str,
                                cover_url: str, 
                                tracklist_url: str) -> bool:
        """
        Send email notification for completed New Music Friday content
        
        Args:
            artist_name: Name of the artist
            track_name: Name of the track
            week_start: Week start date (YYYY-MM-DD)
            cover_url: URL to cover image
            tracklist_url: URL to tracklist image
            
        Returns:
            True if email sent successfully, False otherwise
        """
        if not self.enabled:
            logger.warning("⚠️ Email notifications disabled - no API key")
            return False
        
        try:
            # Calculate review deadline (2 days from now)
            review_deadline = (datetime.now() + timedelta(days=2)).strftime('%B %d, %Y at 11:59 PM')
            
            # Format week start for display
            week_date = datetime.strptime(week_start, '%Y-%m-%d').strftime('%B %d, %Y')
            
            # Create email content
            subject = f"🎵 New Music Friday Post Ready - {artist_name} - {track_name}"
            
            html_content = self._create_html_template(
                artist_name, track_name, week_date, week_start,
                cover_url, tracklist_url, review_deadline
            )
            
            # Send email via SendGrid API
            success = self._send_email(subject, html_content)
            
            if success:
                logger.info(f"✅ Email notification sent successfully for {artist_name} - {track_name}")
            else:
                logger.error(f"❌ Failed to send email notification for {artist_name} - {track_name}")
            
            return success
            
        except Exception as e:
            logger.error(f"❌ Error sending email notification: {e}")
            return False
    
    def _create_html_template(self, artist_name: str, track_name: str, week_date: str, 
                            week_start: str, cover_url: str, tracklist_url: str, 
                            review_deadline: str) -> str:
        """Create HTML email template"""
        
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>New Music Friday Post Ready</title>
            <style>
                body {{
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                    background-color: #f8f9fa;
                }}
                .container {{
                    background: white;
                    border-radius: 12px;
                    padding: 30px;
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                }}
                .header {{
                    text-align: center;
                    margin-bottom: 30px;
                    padding-bottom: 20px;
                    border-bottom: 2px solid #e9ecef;
                }}
                .logo {{
                    font-size: 28px;
                    font-weight: bold;
                    color: #e23e36;
                    margin-bottom: 10px;
                }}
                .content {{
                    margin-bottom: 30px;
                }}
                .highlight {{
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 20px;
                    border-radius: 8px;
                    text-align: center;
                    margin: 20px 0;
                }}
                .track-info {{
                    font-size: 18px;
                    font-weight: 600;
                    margin: 10px 0;
                }}
                .cta-button {{
                    display: inline-block;
                    background: #e23e36;
                    color: white;
                    padding: 15px 30px;
                    text-decoration: none;
                    border-radius: 8px;
                    font-weight: 600;
                    font-size: 16px;
                    margin: 20px 0;
                    transition: background-color 0.3s;
                }}
                .cta-button:hover {{
                    background: #c0392b;
                }}
                .deadline {{
                    background: #fff3cd;
                    border: 1px solid #ffeaa7;
                    border-radius: 6px;
                    padding: 15px;
                    margin: 20px 0;
                    color: #856404;
                }}
                .footer {{
                    text-align: center;
                    margin-top: 30px;
                    padding-top: 20px;
                    border-top: 1px solid #e9ecef;
                    color: #666;
                    font-size: 14px;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">🎵 New Music Friday</div>
                    <p>Your weekly music content is ready!</p>
                </div>
                
                <div class="content">
                    <div class="highlight">
                        <div class="track-info">{artist_name}</div>
                        <div class="track-info">"{track_name}"</div>
                        <p>Week of {week_date}</p>
                    </div>
                    
                    <h3>📸 Generated Content</h3>
                    <p>Your cover image and tracklist have been generated and are ready for review in the dashboard.</p>
                    
                    <div class="deadline">
                        <strong>⏰ Review Deadline:</strong> {review_deadline}
                        <br>
                        Please review the content and make any necessary edits before the deadline.
                    </div>
                    
                    <div style="text-align: center;">
                        <a href="{self.dashboard_url}" class="cta-button">
                            🎛️ Go to Dashboard
                        </a>
                    </div>
                    
                    <p>
                        <strong>What's Next?</strong><br>
                        • Review the generated images and caption<br>
                        • Make any edits if needed<br>
                        • Approve the content for posting<br>
                        • The content will be automatically scheduled
                    </p>
                </div>
                
                <div class="footer">
                    <p>This is an automated notification from your New Music Friday system.</p>
                    <p>If you have any questions, please contact your system administrator.</p>
                </div>
            </div>
        </body>
        </html>
        """
    
    def _send_email(self, subject: str, html_content: str) -> bool:
        """Send email via SendGrid API"""
        try:
            url = "https://api.sendgrid.com/v3/mail/send"
            
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            
            data = {
                "personalizations": [
                    {
                        "to": [{"email": self.client_email}],
                        "subject": subject
                    }
                ],
                "from": {
                    "email": "shayan1baig@gmail.com",  # Use your verified Gmail
                    "name": "New Music Friday System"
                },
                "content": [
                    {
                        "type": "text/html",
                        "value": html_content
                    }
                ]
            }
            
            response = requests.post(url, headers=headers, json=data)
            
            if response.status_code == 202:
                logger.info("✅ Email sent successfully via SendGrid")
                return True
            else:
                logger.error(f"❌ SendGrid API error: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"❌ Error calling SendGrid API: {e}")
            return False

# Convenience function for easy import
def send_weekly_notification(artist_name: str, track_name: str, week_start: str,
                           cover_url: str, tracklist_url: str) -> bool:
    """
    Convenience function to send weekly notification
    
    Args:
        artist_name: Name of the artist
        track_name: Name of the track  
        week_start: Week start date (YYYY-MM-DD)
        cover_url: URL to cover image
        tracklist_url: URL to tracklist image
        
    Returns:
        True if email sent successfully, False otherwise
    """
    notifier = EmailNotifier()
    return notifier.send_weekly_notification(
        artist_name, track_name, week_start, cover_url, tracklist_url
    )
