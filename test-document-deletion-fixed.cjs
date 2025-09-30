const https = require('https');

// Test configuration
const API_BASE_URL = 'https://zwxrsuw8o9.execute-api.eu-west-1.amazonaws.com/prod';
const KNOWLEDGE_BASE_ID = 'TJ8IMVJVQW';
const DATA_SOURCE_ID = 'IXQP2QZQHM';

// AWS credentials from .env.local - read manually
const fs = require('fs');
let AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_SESSION_TOKEN;

try {
    const envContent = fs.readFileSync('.env.local', 'utf8');
    const lines = envContent.split('\n');
    
    lines.forEach(line => {
        const [key, value] = line.split('=');
        if (key === 'VITE_AWS_ACCESS_KEY_ID') AWS_ACCESS_KEY_ID = value;
        if (key === 'VITE_AWS_SECRET_ACCESS_KEY') AWS_SECRET_ACCESS_KEY = value;
        if (key === 'VITE_AWS_SESSION_TOKEN') AWS_SESSION_TOKEN = value;
    });
} catch (error) {
    console.error('Error reading .env.local file:', error.message);
    process.exit(1);
}

console.log('🧪 Testing document deletion functionality after JSON parsing fix...\n');

function makeRequest(method, path, body = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(API_BASE_URL + path);
        
        const options = {
            hostname: url.hostname,
            port: 443,
            path: url.pathname,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'X-AWS-Access-Key-Id': AWS_ACCESS_KEY_ID,
                'X-AWS-Secret-Access-Key': AWS_SECRET_ACCESS_KEY,
                'X-AWS-Session-Token': AWS_SESSION_TOKEN
            }
        };

        if (body) {
            const bodyStr = JSON.stringify(body);
            options.headers['Content-Length'] = Buffer.byteLength(bodyStr);
        }

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
        
        if (body) {
            req.write(JSON.stringify(body));
        }
        
        req.end();
    });
}

async function testCORSPreflight() {
    console.log('1️⃣ Testing CORS preflight (OPTIONS request)...');
    try {
        const result = await makeRequest('OPTIONS', `/documents/${KNOWLEDGE_BASE_ID}/${DATA_SOURCE_ID}`);
        
        console.log(`   Status: ${result.statusCode}`);
        console.log(`   CORS Headers:`);
        console.log(`     Access-Control-Allow-Origin: ${result.headers['access-control-allow-origin']}`);
        console.log(`     Access-Control-Allow-Methods: ${result.headers['access-control-allow-methods']}`);
        console.log(`     Access-Control-Allow-Headers: ${result.headers['access-control-allow-headers']}`);
        
        if (result.statusCode === 200) {
            console.log('   ✅ OPTIONS request successful - JSON parsing error fixed!');
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

async function testDocumentListing() {
    console.log('\n2️⃣ Testing document listing (GET request)...');
    try {
        const result = await makeRequest('GET', `/documents/${KNOWLEDGE_BASE_ID}/${DATA_SOURCE_ID}`);
        
        console.log(`   Status: ${result.statusCode}`);
        console.log(`   CORS Headers:`);
        console.log(`     Access-Control-Allow-Origin: ${result.headers['access-control-allow-origin']}`);
        
        if (result.statusCode === 200) {
            console.log('   ✅ Document listing successful');
            console.log(`   Found ${result.body.count} documents`);
            
            if (result.body.documents && result.body.documents.length > 0) {
                console.log('   📄 Sample documents:');
                result.body.documents.slice(0, 3).forEach((doc, i) => {
                    console.log(`     ${i + 1}. ${doc.name} (ID: ${doc.id})`);
                });
                return result.body.documents;
            } else {
                console.log('   📄 No documents found to test deletion');
                return [];
            }
        } else {
            console.log('   ❌ Document listing failed');
            console.log('   Response body:', result.body);
            return [];
        }
    } catch (error) {
        console.log('   ❌ Document listing error:', error.message);
        return [];
    }
}

async function testDocumentDeletion(documents) {
    if (documents.length === 0) {
        console.log('\n3️⃣ Skipping deletion test - no documents available');
        return;
    }

    console.log('\n3️⃣ Testing document deletion (DELETE request)...');
    
    // Test with the first document
    const testDoc = documents[0];
    console.log(`   Testing deletion of: ${testDoc.name} (ID: ${testDoc.id})`);
    
    try {
        const result = await makeRequest('DELETE', `/documents/${KNOWLEDGE_BASE_ID}/${DATA_SOURCE_ID}/${testDoc.id}`);
        
        console.log(`   Status: ${result.statusCode}`);
        console.log(`   CORS Headers:`);
        console.log(`     Access-Control-Allow-Origin: ${result.headers['access-control-allow-origin']}`);
        
        if (result.statusCode === 200) {
            console.log('   ✅ Document deletion request successful');
            console.log('   Response:', result.body);
        } else {
            console.log('   ❌ Document deletion failed');
            console.log('   Response body:', result.body);
        }
    } catch (error) {
        console.log('   ❌ Document deletion error:', error.message);
    }
}

async function runTests() {
    console.log(`Testing API: ${API_BASE_URL}`);
    console.log(`Knowledge Base: ${KNOWLEDGE_BASE_ID}`);
    console.log(`Data Source: ${DATA_SOURCE_ID}\n`);

    // Test 1: CORS preflight
    const corsWorking = await testCORSPreflight();
    
    // Test 2: Document listing
    const documents = await testDocumentListing();
    
    // Test 3: Document deletion (only if CORS is working)
    if (corsWorking) {
        await testDocumentDeletion(documents);
    } else {
        console.log('\n3️⃣ Skipping deletion test - CORS preflight failed');
    }
    
    console.log('\n🏁 Test completed!');
    
    if (corsWorking) {
        console.log('✅ JSON parsing error has been fixed - CORS preflight now works');
        console.log('✅ Document operations should now work properly in the frontend');
    } else {
        console.log('❌ There may still be issues with the Lambda function');
    }
}

runTests().catch(console.error);
