const https = require('https');

// Test configuration
const API_BASE_URL = 'https://zwxrsuw8o9.execute-api.eu-west-1.amazonaws.com/prod';
const KNOWLEDGE_BASE_ID = 'TJ8IMVJVQW';
const DATA_SOURCE_ID = 'IXQP2QZQHM';

console.log('🧪 Testing CORS functionality after JSON parsing fix...\n');

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

async function testCORSPreflight() {
    console.log('1️⃣ Testing CORS preflight (OPTIONS request) - No Auth Required...');
    try {
        const result = await makeRequest('OPTIONS', `/documents/${KNOWLEDGE_BASE_ID}/${DATA_SOURCE_ID}`);
        
        console.log(`   Status: ${result.statusCode}`);
        console.log(`   CORS Headers:`);
        console.log(`     Access-Control-Allow-Origin: ${result.headers['access-control-allow-origin']}`);
        console.log(`     Access-Control-Allow-Methods: ${result.headers['access-control-allow-methods']}`);
        console.log(`     Access-Control-Allow-Headers: ${result.headers['access-control-allow-headers']}`);
        console.log(`     Access-Control-Max-Age: ${result.headers['access-control-max-age']}`);
        
        if (result.statusCode === 200) {
            console.log('   ✅ OPTIONS request successful - JSON parsing error fixed!');
            console.log('   Response body:', result.body);
            return true;
        } else {
            console.log('   ❌ OPTIONS request failed');
            console.log('   Response body:', result.body);
            return false;
        }
    } catch (error) {
        console.log('   ❌ OPTIONS request error:', error.message);
        return false;
    }
}

async function testChatEndpoint() {
    console.log('\n2️⃣ Testing chat endpoint OPTIONS (should also work)...');
    try {
        const result = await makeRequest('OPTIONS', '/');
        
        console.log(`   Status: ${result.statusCode}`);
        console.log(`   CORS Headers:`);
        console.log(`     Access-Control-Allow-Origin: ${result.headers['access-control-allow-origin']}`);
        
        if (result.statusCode === 200) {
            console.log('   ✅ Chat endpoint OPTIONS successful');
            return true;
        } else {
            console.log('   ❌ Chat endpoint OPTIONS failed');
            console.log('   Response body:', result.body);
            return false;
        }
    } catch (error) {
        console.log('   ❌ Chat endpoint OPTIONS error:', error.message);
        return false;
    }
}

async function testWithInvalidAuth() {
    console.log('\n3️⃣ Testing GET request with invalid auth (should return proper CORS + error)...');
    try {
        const result = await makeRequest('GET', `/documents/${KNOWLEDGE_BASE_ID}/${DATA_SOURCE_ID}`, {
            'X-AWS-Access-Key-Id': 'invalid',
            'X-AWS-Secret-Access-Key': 'invalid'
        });
        
        console.log(`   Status: ${result.statusCode}`);
        console.log(`   CORS Headers:`);
        console.log(`     Access-Control-Allow-Origin: ${result.headers['access-control-allow-origin']}`);
        
        if (result.headers['access-control-allow-origin']) {
            console.log('   ✅ CORS headers present even with auth error - Lambda CORS working!');
        } else {
            console.log('   ❌ No CORS headers with auth error');
        }
        
        console.log('   Response body:', result.body);
        
    } catch (error) {
        console.log('   ❌ GET request error:', error.message);
    }
}

async function runTests() {
    console.log(`Testing API: ${API_BASE_URL}`);
    console.log(`Knowledge Base: ${KNOWLEDGE_BASE_ID}`);
    console.log(`Data Source: ${DATA_SOURCE_ID}\n`);

    // Test 1: CORS preflight for documents
    const corsWorking = await testCORSPreflight();
    
    // Test 2: CORS preflight for chat
    await testChatEndpoint();
    
    // Test 3: Test with invalid auth to see if CORS headers are returned
    await testWithInvalidAuth();
    
    console.log('\n🏁 Test completed!');
    
    if (corsWorking) {
        console.log('✅ JSON parsing error has been fixed - CORS preflight now works');
        console.log('✅ Lambda function is properly handling OPTIONS requests');
        console.log('✅ Document operations should now work properly in the frontend with valid credentials');
        console.log('\n📝 Next steps:');
        console.log('   1. Generate AWS temporary credentials using: aws sts get-session-token');
        console.log('   2. Test document operations in the frontend with valid credentials');
    } else {
        console.log('❌ There may still be issues with the Lambda function');
    }
}

runTests().catch(console.error);
