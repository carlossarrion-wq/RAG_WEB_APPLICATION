const https = require('https');

// Test the individual document deletion endpoint that's failing
const testIndividualDocumentCORS = async () => {
    console.log('🧪 Testing Individual Document CORS Fix...\n');
    
    const options = {
        hostname: 'zwxrsuw8o9.execute-api.eu-west-1.amazonaws.com',
        port: 443,
        path: '/dev/documents/55LVEIRFTI/A4DBIXGZM3/data%2Frecetas_imagenes.docx',
        method: 'OPTIONS',
        headers: {
            'Origin': 'http://localhost:5173',
            'Access-Control-Request-Method': 'DELETE',
            'Access-Control-Request-Headers': 'content-type,x-aws-access-key-id,x-aws-secret-access-key,x-aws-session-token'
        }
    };

    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            console.log(`📊 Status Code: ${res.statusCode}`);
            console.log('📋 Response Headers:');
            Object.keys(res.headers).forEach(key => {
                if (key.toLowerCase().includes('cors') || key.toLowerCase().includes('access-control')) {
                    console.log(`   ${key}: ${res.headers[key]}`);
                }
            });
            
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                console.log('\n📄 Response Body:');
                try {
                    const parsed = JSON.parse(data);
                    console.log(JSON.stringify(parsed, null, 2));
                } catch (e) {
                    console.log(data);
                }
                
                // Check CORS headers
                const corsHeaders = {
                    'access-control-allow-origin': res.headers['access-control-allow-origin'],
                    'access-control-allow-methods': res.headers['access-control-allow-methods'],
                    'access-control-allow-headers': res.headers['access-control-allow-headers']
                };
                
                console.log('\n✅ CORS Analysis:');
                console.log(`   Origin allowed: ${corsHeaders['access-control-allow-origin'] === '*' ? '✅ Yes' : '❌ No'}`);
                console.log(`   DELETE method allowed: ${corsHeaders['access-control-allow-methods']?.includes('DELETE') ? '✅ Yes' : '❌ No'}`);
                console.log(`   Required headers allowed: ${corsHeaders['access-control-allow-headers']?.includes('x-aws-access-key-id') ? '✅ Yes' : '❌ No'}`);
                
                resolve({
                    statusCode: res.statusCode,
                    headers: corsHeaders,
                    body: data
                });
            });
        });

        req.on('error', (error) => {
            console.error('❌ Request failed:', error.message);
            reject(error);
        });

        req.end();
    });
};

// Also test a simulated DELETE request
const testActualDelete = async () => {
    console.log('\n🧪 Testing Actual DELETE Request (simulated)...\n');
    
    const options = {
        hostname: 'zwxrsuw8o9.execute-api.eu-west-1.amazonaws.com',
        port: 443,
        path: '/dev/documents/55LVEIRFTI/A4DBIXGZM3/data%2Frecetas_imagenes.docx',
        method: 'DELETE',
        headers: {
            'Origin': 'http://localhost:5173',
            'Content-Type': 'application/json',
            'X-AWS-Access-Key-Id': 'test-key',
            'X-AWS-Secret-Access-Key': 'test-secret',
            'X-AWS-Session-Token': 'test-token'
        }
    };

    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            console.log(`📊 Status Code: ${res.statusCode}`);
            console.log('📋 CORS Headers in Response:');
            Object.keys(res.headers).forEach(key => {
                if (key.toLowerCase().includes('cors') || key.toLowerCase().includes('access-control')) {
                    console.log(`   ${key}: ${res.headers[key]}`);
                }
            });
            
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                console.log('\n📄 Response Body:');
                try {
                    const parsed = JSON.parse(data);
                    console.log(JSON.stringify(parsed, null, 2));
                } catch (e) {
                    console.log(data);
                }
                
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    body: data
                });
            });
        });

        req.on('error', (error) => {
            console.error('❌ Request failed:', error.message);
            reject(error);
        });

        req.end();
    });
};

// Run tests
const runTests = async () => {
    try {
        console.log('🚀 Testing Individual Document Deletion CORS Fix\n');
        console.log('=' .repeat(60));
        
        await testIndividualDocumentCORS();
        await testActualDelete();
        
        console.log('\n' + '=' .repeat(60));
        console.log('✅ Tests completed!');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
};

runTests();
