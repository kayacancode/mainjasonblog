const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

// This function runs every minute to check for scheduled posts that should be published
exports.publishScheduledPosts = functions.pubsub.schedule('every 1 minutes').onRun(async (context) => {
  const db = admin.firestore();
  const now = new Date();
  
  // Query for posts that are scheduled to be published now or earlier
  const scheduledPostsQuery = db.collection('posts')
    .where('isPublished', '==', false)
    .where('scheduledFor', '<=', now);
  
  const snapshot = await scheduledPostsQuery.get();
  
  if (snapshot.empty) {
    console.log('No scheduled posts to publish');
    return null;
  }
  
  // Update each scheduled post to be published
  const batch = db.batch();
  snapshot.forEach(doc => {
    const postRef = db.collection('posts').doc(doc.id);
    batch.update(postRef, { 
      isPublished: true,
      publishedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log(`Post ${doc.id} will be published`);
  });
  
  // Commit the batch
  await batch.commit();
  console.log(`Published ${snapshot.size} scheduled posts`);
  
  return null;
}); 