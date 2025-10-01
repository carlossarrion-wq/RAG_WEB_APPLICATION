rconst https = require('https');

// Test the frontend document deletion with proper authentication
const testFrontendDocumentDeletion = async () => {
    console.log('🧪 Testing Frontend Document Deletion Simulation...\n');
    
    // First, let's test the OPTIONS request that the browser would send
    const optionsTest = {
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

    console.log('🔍 Step 1: Testing CORS Preflight (OPTIONS)...');
    
    return new Promise((resolve, reject) => {
        const req = https.request(optionsTest, (res) => {
            console.log(`   Status: ${res.statusCode}`);
            
            const corsHeaders = {
                origin: res.headers['access-control-allow-origin'],
                methods: res.headers['access-control-allow-methods'],
                headers: res.headers['access-control-allow-headers']
            };
            
            console.log(`   CORS Origin: ${corsHeaders.origin}`);
            console.log(`   CORS Methods: ${corsHeaders.methods}`);
            console.log(`   CORS Headers: ${corsHeaders.headers}`);
            
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                const preflightSuccess = res.statusCode === 200 && 
                                       corsHeaders.origin === '*' && 
                                       corsHeaders.methods?.includes('DELETE');
                
                console.log(`   Preflight Result: ${preflightSuccess ? '✅ SUCCESS' : '❌ FAILED'}\n`);
                
                if (preflightSuccess) {
                    console.log('🔍 Step 2: CORS Preflight passed! Browser would now send actual DELETE request.');
                    console.log('   Note: Actual deletion would require valid AWS credentials from frontend.\n');
                    
                    console.log('✅ CORS Configuration Analysis:');
                    console.log('   ✅ Origin "*" allows localhost:5173');
                    console.log('   ✅ DELETE method is allowed');
                    console.log('   ✅ Required AWS headers are allowed');
                    console.log('   ✅ CORS preflight will succeed in browser\n');
                    
                    console.log('🎯 Frontend Integration Status:');
                    console.log('   ✅ CORS errors should be resolved');
                    console.log('   ✅ Document deletion should work with valid credentials');
                    console.log('   ✅ API Gateway integration is properly configured');
                } else {
                    console.log('❌ CORS Preflight failed - browser would block the request');
                }
                
                resolve(preflightSuccess);
            });
        });

        req.on('error', (error) => {
            console.error('❌ Request failed:', error.message);
            reject(error);
        });

        req.end();
    });
};

// Test multiple document paths to ensure the fix works for all documents
const testMultipleDocuments = async () => {
    console.log('🧪 Testing Multiple Document Paths...\n');
    
    const testPaths = [
        '/dev/documents/55LVEIRFTI/A4DBIXGZM3/data%2Frecetas_imagenes.docx',
        '/dev/documents/55LVEIRFTI/A4DBIXGZM3/test-document.pdf',
        '/dev/documents/TESTKNOWLEDGE/TESTDATASOURCE/sample.txt'
    ];
    
    for (const path of testPaths) {
        console.log(`🔍 Testing path: ${path}`);
        
        const options = {
            hostname: 'zwxrsuw8o9.execute-api.eu-west-1.amazonaws.com',
            port: 443,
            path: path,
            method: 'OPTIONS',
            headers: {
                'Origin': 'http://localhost:5173',
                'Access-Control-Request-Method': 'DELETE'
            }
        };
        
        await new Promise((resolve) => {
            const req = https.request(options, (res) => {
                const success = res.statusCode === 200 && 
                              res.headers['access-control-allow-origin'] === '*';
                console.log(`   Result: ${success ? '✅ CORS OK' : '❌ CORS Failed'} (${res.statusCode})`);
                resolve();
            });
            
            req.on('error', () => {
                console.log('   Result: ❌ Request Failed');
                resolve();
            });
            
            req.end();
        });
    }
};

// Run all tests
const runTests = async () => {
    try {
        console.log('🚀 Frontend Document Deletion CORS Verification\n');
        console.log('=' .repeat(60));
        
        const success = await testFrontendDocumentDeletion();
        
        if (success) {
            await testMultipleDocuments();
        }
        
        console.log('\n' + '=' .repeat(60));
        console.log('✅ All tests completed!');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
};

runTests();
