/**
 * Client-side Instagram publishing functionality
 * Handles OAuth flow and post creation from the dashboard
 */

class InstagramPublisher {
    constructor() {
        // Facebook App ID will be set by the parent page after script loads
        this.facebookAppId = null;
        this.redirectUri = `${window.location.origin}/instagram-callback`;
    }
    
    /**
     * Initiate Instagram OAuth flow
     */
    async initiateInstagramLogin() {
        if (!this.facebookAppId) {
            throw new Error('Facebook App ID not configured. Please check your environment variables.');
        }
        
        const scope = 'public_profile,email,pages_show_list,pages_read_engagement,pages_manage_posts,pages_manage_engagement';
        const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${this.facebookAppId}&redirect_uri=${this.redirectUri}&scope=${scope}&response_type=code`;
        
        // Open popup window for OAuth
        const popup = window.open(
            authUrl,
            'instagram-auth',
            'width=600,height=600,scrollbars=yes,resizable=yes'
        );
        
        // Listen for OAuth completion
        return new Promise((resolve, reject) => {
            console.log('🔍 Starting OAuth flow with URL:', authUrl);
            
            const checkClosed = setInterval(() => {
                if (popup.closed) {
                    clearInterval(checkClosed);
                    console.error('❌ OAuth popup was closed by user');
                    reject(new Error('OAuth popup was closed'));
                }
            }, 1000);
            
            // Listen for message from popup
            const messageHandler = (event) => {
                console.log('📨 Received message from popup:', event.data);
                
                if (event.origin !== window.location.origin) {
                    console.log('⚠️ Message from different origin, ignoring');
                    return;
                }
                
                if (event.data.type === 'INSTAGRAM_AUTH_SUCCESS') {
                    clearInterval(checkClosed);
                    window.removeEventListener('message', messageHandler);
                    popup.close();
                    console.log('✅ OAuth success, access token received');
                    resolve(event.data.accessToken);
                } else if (event.data.type === 'INSTAGRAM_AUTH_ERROR') {
                    clearInterval(checkClosed);
                    window.removeEventListener('message', messageHandler);
                    popup.close();
                    console.error('❌ OAuth error:', event.data.error);
                    reject(new Error(event.data.error));
                }
            };
            
            window.addEventListener('message', messageHandler);
            
            // Cleanup after 5 minutes
            setTimeout(() => {
                clearInterval(checkClosed);
                window.removeEventListener('message', messageHandler);
                if (!popup.closed) {
                    popup.close();
                }
                reject(new Error('OAuth timeout after 5 minutes'));
            }, 300000);
        });
    }
    
    /**
     * Create Instagram post
     */
    async createPost(postData) {
        try {
            const response = await fetch('/api/instagram-publish', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(postData)
            });
            
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.error || 'Failed to create Instagram post');
            }
            
            return result;
        } catch (error) {
            console.error('Error creating Instagram post:', error);
            throw error;
        }
    }
    
    /**
     * Handle "Create Post" button click
     */
    async handleCreatePost(weekStart, coverImageUrl, tracklistImageUrl, caption, hashtags) {
        try {
            // Get Instagram access token
            const accessToken = await this.initiateInstagramLogin();
            
            // Create post data
            const postData = {
                weekStart,
                pageAccessToken: accessToken,
                coverImageUrl,
                tracklistImageUrl,
                caption,
                hashtags
            };
            
            // Create the post
            const result = await this.createPost(postData);
            
            // Return success result for React to handle UI updates
            return {
                success: true,
                postId: result.postId,
                message: `✅ Instagram post created successfully! Post ID: ${result.postId}`
            };
            
        } catch (error) {
            console.error('Error creating Instagram post:', error);
            console.error('Error details:', {
                message: error.message,
                stack: error.stack,
                name: error.name
            });
            // Return error result for React to handle UI updates
            return {
                success: false,
                error: error.message || 'Unknown error occurred',
                message: `❌ Error creating Instagram post: ${error.message || 'Unknown error occurred'}`
            };
        }
    }
    
}

// Export the class constructor for use in other files
window.InstagramPublisher = InstagramPublisher;





