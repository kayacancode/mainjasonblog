#!/usr/bin/env node

/**
 * Simple script to get Page Access Token from User Access Token
 * Usage: node get-page-token.js YOUR_USER_ACCESS_TOKEN
 */

const https = require('https');

const userAccessToken = process.argv[2];

if (!userAccessToken) {
    console.log('❌ Please provide a User Access Token');
    console.log('Usage: node get-page-token.js YOUR_USER_ACCESS_TOKEN');
    process.exit(1);
}

console.log('🔍 Getting Page Access Token...');
console.log('User Token:', userAccessToken.substring(0, 20) + '...');

const url = `https://graph.facebook.com/me/accounts?access_token=${userAccessToken}&fields=id,name,access_token,instagram_business_account`;

https.get(url, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
        data += chunk;
    });
    
    res.on('end', () => {
        try {
            const response = JSON.parse(data);
            
            if (response.error) {
                console.log('❌ Error:', response.error.message);
                return;
            }
            
            if (!response.data || response.data.length === 0) {
                console.log('❌ No pages found. Make sure you have admin access to a Facebook Page.');
                return;
            }
            
            console.log(`📄 Found ${response.data.length} pages:`);
            
            for (const page of response.data) {
                console.log(`\n🏢 Page: ${page.name} (ID: ${page.id})`);
                console.log(`🔑 Page Access Token: ${page.access_token}`);
                
                if (page.instagram_business_account) {
                    const instagram = page.instagram_business_account;
                    console.log(`📱 Instagram: ${instagram.username || 'N/A'} (ID: ${instagram.id})`);
                    console.log(`\n🎉 SUCCESS! Use this Page Access Token in your code:`);
                    console.log(`   ${page.access_token}`);
                } else {
                    console.log(`⚠️  No Instagram Business account connected to this page`);
                }
            }
            
        } catch (error) {
            console.log('❌ Error parsing response:', error.message);
            console.log('Raw response:', data);
        }
    });
    
}).on('error', (error) => {
    console.log('❌ Error making request:', error.message);
});
