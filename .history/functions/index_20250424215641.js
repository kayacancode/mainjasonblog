const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

// This function runs every minute to check for scheduled posts that should be published
exports.publishScheduledPosts = functions.pubsub.schedule('every 1 minutes').onRun(async (context) => {
  const db = admin.firestore();
  const now = new Date();
  
  // Query for all unpublished posts
  const unpublishedPostsQuery = db.collection('posts')
    .where('isPublished', '==', false);
  
  const snapshot = await unpublishedPostsQuery.get();
  
  if (snapshot.empty) {
    console.log('No unpublished posts found');
    return null;
  }
  
  // Filter posts that should be published now
  const postsToPublish = [];
  snapshot.forEach(doc => {
    const post = doc.data();
    if (post.scheduledFor && post.scheduledFor.toDate() <= now) {
      postsToPublish.push({
        id: doc.id,
        ...post
      });
    }
  });
  
  if (postsToPublish.length === 0) {
    console.log('No scheduled posts to publish');
    return null;
  }
  
  // Update each scheduled post to be published
  const batch = db.batch();
  postsToPublish.forEach(post => {
    const postRef = db.collection('posts').doc(post.id);
    batch.update(postRef, { 
      isPublished: true,
      publishedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log(`Post ${post.id} will be published`);
  });
  
  // Commit the batch
  await batch.commit();
  console.log(`Published ${postsToPublish.length} scheduled posts`);
  
  return null;
}); 