/**
 * Direct Instagram posting test (bypasses OAuth)
 * This tests if the Page Access Token works for Instagram posting
 */

const testInstagramPosting = async () => {
    const pageAccessToken = 'EAASjRdfvycUBPhDzwFbsIsNiKwFCZCQag47QMNNFQeGKhwKxJMjCkeM08xEg6bZCOMLE9J4q0C4f3VngbSVFWkzIaE73J34tNLSRH3rWgpXBv5YPtZCV07J0leLSSvUc4Wn7iRjPQFjQQa8S8zACGtiTLuExKyCesGVoQhPGxRSZBqiOnRO3HgD7juIIB9spZAhi4';
    
    // Test data (you'll need to replace with actual image URLs)
    const testData = {
        pageAccessToken: pageAccessToken,
        coverImageUrl: 'https://your-supabase-url.supabase.co/storage/v1/object/public/instagram-images/your-cover-image.png',
        tracklistImageUrl: 'https://your-supabase-url.supabase.co/storage/v1/object/public/instagram-images/your-tracklist-image.png',
        caption: 'Test Instagram post from automation! 🎵 #NewMusicFriday',
        hashtags: ['#NewMusicFriday', '#Music', '#Test']
    };
    
    try {
        console.log('🧪 Testing Instagram posting directly...');
        
        const response = await fetch('/api/instagram-publish', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(testData)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            console.log('✅ Instagram posting test successful!');
            console.log('Result:', result);
        } else {
            console.log('❌ Instagram posting test failed:');
            console.log('Error:', result);
        }
        
    } catch (error) {
        console.error('❌ Test error:', error);
    }
};

// Run the test
testInstagramPosting();
