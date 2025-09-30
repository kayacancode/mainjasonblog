/**
 * Client-side Instagram publishing functionality
 * Handles OAuth flow and post creation from the dashboard
 */

class InstagramPublisher {
    constructor() {
        this.facebookAppId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
        this.redirectUri = `${window.location.origin}/instagram-callback`;
    }
    
    /**
     * Initiate Instagram OAuth flow
     */
    async initiateInstagramLogin() {
        const scope = 'instagram_business_basic,instagram_business_content_publish';
        const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${this.facebookAppId}&redirect_uri=${this.redirectUri}&scope=${scope}&response_type=code`;
        
        // Open popup window for OAuth
        const popup = window.open(
            authUrl,
            'instagram-auth',
            'width=600,height=600,scrollbars=yes,resizable=yes'
        );
        
        // Listen for OAuth completion
        return new Promise((resolve, reject) => {
            const checkClosed = setInterval(() => {
                if (popup.closed) {
                    clearInterval(checkClosed);
                    reject(new Error('OAuth popup was closed'));
                }
            }, 1000);
            
            // Listen for message from popup
            window.addEventListener('message', (event) => {
                if (event.origin !== window.location.origin) return;
                
                if (event.data.type === 'INSTAGRAM_AUTH_SUCCESS') {
                    clearInterval(checkClosed);
                    popup.close();
                    resolve(event.data.accessToken);
                } else if (event.data.type === 'INSTAGRAM_AUTH_ERROR') {
                    clearInterval(checkClosed);
                    popup.close();
                    reject(new Error(event.data.error));
                }
            });
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
            // Show loading state
            this.showLoadingState();
            
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
            
            // Show success message
            this.showSuccessMessage(result.postId);
            
            // Update UI to show post was created
            this.updatePostStatus(weekStart, 'published', result.postId);
            
        } catch (error) {
            console.error('Error creating Instagram post:', error);
            this.showErrorMessage(error.message);
        } finally {
            this.hideLoadingState();
        }
    }
    
    /**
     * Show loading state
     */
    showLoadingState() {
        const button = document.getElementById('create-post-btn');
        if (button) {
            button.disabled = true;
            button.innerHTML = '<span class="spinner"></span> Creating Post...';
        }
    }
    
    /**
     * Hide loading state
     */
    hideLoadingState() {
        const button = document.getElementById('create-post-btn');
        if (button) {
            button.disabled = false;
            button.innerHTML = 'Create Post';
        }
    }
    
    /**
     * Show success message
     */
    showSuccessMessage(postId) {
        const messageDiv = document.getElementById('post-message');
        if (messageDiv) {
            messageDiv.innerHTML = `
                <div class="alert alert-success">
                    ✅ Instagram post created successfully!<br>
                    Post ID: ${postId}
                </div>
            `;
        }
    }
    
    /**
     * Show error message
     */
    showErrorMessage(error) {
        const messageDiv = document.getElementById('post-message');
        if (messageDiv) {
            messageDiv.innerHTML = `
                <div class="alert alert-error">
                    ❌ Error creating Instagram post: ${error}
                </div>
            `;
        }
    }
    
    /**
     * Update post status in UI
     */
    updatePostStatus(weekStart, status, postId) {
        const statusElement = document.getElementById(`post-status-${weekStart}`);
        if (statusElement) {
            statusElement.textContent = status;
            statusElement.className = `status-${status}`;
        }
    }
}

// Initialize Instagram publisher
const instagramPublisher = new InstagramPublisher();

// Export for use in other files
window.InstagramPublisher = instagramPublisher;
