const https = require('https');

// Test configuration for DEV stage
const API_BASE_URL = 'https://zwxrsuw8o9.execute-api.eu-west-1.amazonaws.com/dev';
const KNOWLEDGE_BASE_ID = '55LVEIRFTI';
const DATA_SOURCE_ID = 'A4DBIXGZM3';

console.log('🧪 Testing DEV stage endpoints...\n');

function makeRequest(method, path, headers = {}) {
    return new Promise((resolve, reject) => {
        const url = new URL(API_BASE_URL + path);
        
        const options = {
            hostname: url.hostname,
            port: 443,
            path: url.pathname,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const result = {
                        statusCode: res.statusCode,
                        headers: res.headers,
                        body: data ? JSON.parse(data) : null
                    };
                    resolve(result);
                } catch (e) {
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        body: data,
                        parseError: e.message
                    });
                }
            });
        });

        req.on('error', reject);
        req.end();
    });
}

async function testEndpoints() {
    console.log(`Testing API: ${API_BASE_URL}`);
    console.log(`Knowledge Base: ${KNOWLEDGE_BASE_ID}`);
    console.log(`Data Source: ${DATA_SOURCE_ID}\n`);

    // Test 1: Basic documents endpoint
    console.log('1️⃣ Testing basic documents endpoint OPTIONS...');
    try {
        const result1 = await makeRequest('OPTIONS', `/documents/${KNOWLEDGE_BASE_ID}/${DATA_SOURCE_ID}`);
        console.log(`   Status: ${result1.statusCode}`);
        console.log(`   CORS Headers:`);
        console.log(`     Access-Control-Allow-Origin: ${result1.headers['access-control-allow-origin']}`);
        
        if (result1.statusCode === 200) {
            console.log('   ✅ Basic documents endpoint working');
        } else {
            console.log('   ❌ Basic documents endpoint failed');
            console.log('   Response:', result1.body);
        }
    } catch (error) {
        console.log('   ❌ Error:', error.message);
    }

    // Test 2: Batch endpoint
    console.log('\n2️⃣ Testing batch endpoint OPTIONS...');
    try {
        const result2 = await makeRequest('OPTIONS', `/documents/${KNOWLEDGE_BASE_ID}/${DATA_SOURCE_ID}/batch`);
        console.log(`   Status: ${result2.statusCode}`);
        console.log(`   CORS Headers:`);
        console.log(`     Access-Control-Allow-Origin: ${result2.headers['access-control-allow-origin']}`);
        
        if (result2.statusCode === 200) {
            console.log('   ✅ Batch endpoint working');
        } else {
            console.log('   ❌ Batch endpoint failed');
            console.log('   Response:', result2.body);
        }
    } catch (error) {
        console.log('   ❌ Error:', error.message);
    }

    // Test 3: Chat endpoint (known working)
    console.log('\n3️⃣ Testing chat endpoint OPTIONS...');
    try {
        const result3 = await makeRequest('OPTIONS', '/kb-query');
        console.log(`   Status: ${result3.statusCode}`);
        console.log(`   CORS Headers:`);
        console.log(`     Access-Control-Allow-Origin: ${result3.headers['access-control-allow-origin']}`);
        
        if (result3.statusCode === 200) {
            console.log('   ✅ Chat endpoint working');
        } else {
            console.log('   ❌ Chat endpoint failed');
            console.log('   Response:', result3.body);
        }
    } catch (error) {
        console.log('   ❌ Error:', error.message);
    }

    console.log('\n🏁 Test completed!');
}

testEndpoints().catch(console.error);
