const https = require('https');
const fs = require('fs');

// Test document upload functionality
const testDocumentUpload = async () => {
    console.log('🧪 Testing Document Upload Functionality...\n');
    
    // Create a simple test file content
    const testFileContent = Buffer.from('Este es un documento de prueba para subir a la Knowledge Base.\n\nContenido de ejemplo para verificar la funcionalidad de subida.', 'utf-8');
    const base64Content = testFileContent.toString('base64');
    
    const options = {
        hostname: 'zwxrsuw8o9.execute-api.eu-west-1.amazonaws.com',
        port: 443,
        path: '/dev/documents/55LVEIRFTI/A4DBIXGZM3',
        method: 'POST',
        headers: {
            'Origin': 'http://localhost:5173',
            'Content-Type': 'application/json',
            'X-AWS-Access-Key-Id': 'test-key',
            'X-AWS-Secret-Access-Key': 'test-secret',
            'X-AWS-Session-Token': 'test-token'
        }
    };

    const requestBody = JSON.stringify({
        filename: 'documento-prueba.txt',
        file_content: base64Content,
        content_type: 'text/plain'
    });

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
                console.log('\n📄 Raw Response:');
                console.log(`   Length: ${data.length} characters`);
                console.log(`   Content: "${data}"`);
                
                // Test JSON parsing
                console.log('\n🔍 JSON Parsing Test:');
                try {
                    if (data.trim() === '' || data === 'null') {
                        console.log('   ❌ Response is empty or null');
                        resolve({ success: false, issue: 'empty_response' });
                        return;
                    }
                    
                    const parsed = JSON.parse(data);
                    console.log('   ✅ JSON parsing successful!');
                    console.log('   📋 Parsed object:');
                    console.log(JSON.stringify(parsed, null, 4));
                    
                    // Check if it's a proper upload response
                    if (parsed.id || parsed.document_id || parsed.success) {
                        console.log('   ✅ Upload response has proper structure');
                        resolve({ success: true, response: parsed });
                    } else if (parsed.error) {
                        console.log('   ⚠️ Upload failed with error:', parsed.error);
                        resolve({ success: false, error: parsed.error });
                    } else {
                        console.log('   ⚠️ Response parsed but structure is unexpected');
                        resolve({ success: true, response: parsed, warning: 'unexpected_structure' });
                    }
                    
                } catch (parseError) {
                    console.log('   ❌ JSON parsing failed!');
                    console.log(`   Error: ${parseError.message}`);
                    resolve({ success: false, issue: 'parse_error', error: parseError.message });
                }
            });
        });

        req.on('error', (error) => {
            console.error('❌ Request failed:', error.message);
            reject(error);
        });

        req.write(requestBody);
        req.end();
    });
};

// Test OPTIONS request for upload endpoint
const testUploadCORS = async () => {
    console.log('\n🧪 Testing Upload Endpoint CORS...\n');
    
    const options = {
        hostname: 'zwxrsuw8o9.execute-api.eu-west-1.amazonaws.com',
        port: 443,
        path: '/dev/documents/55LVEIRFTI/A4DBIXGZM3',
        method: 'OPTIONS',
        headers: {
            'Origin': 'http://localhost:5173',
            'Access-Control-Request-Method': 'POST',
            'Access-Control-Request-Headers': 'content-type,x-aws-access-key-id,x-aws-secret-access-key,x-aws-session-token'
        }
    };

    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            console.log(`📊 Status Code: ${res.statusCode}`);
            
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
                                       corsHeaders.methods?.includes('POST');
                
                console.log(`   Preflight Result: ${preflightSuccess ? '✅ SUCCESS' : '❌ FAILED'}\n`);
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

// Run tests
const runTests = async () => {
    try {
        console.log('🚀 Testing Document Upload Functionality\n');
        console.log('=' .repeat(70));
        
        const corsResult = await testUploadCORS();
        const uploadResult = await testDocumentUpload();
        
        console.log('\n' + '=' .repeat(70));
        console.log('📊 Test Results Summary:');
        console.log(`   Upload CORS: ${corsResult ? '✅ WORKING' : '❌ FAILED'}`);
        console.log(`   Upload Functionality: ${uploadResult.success ? '✅ WORKING' : '❌ FAILED'}`);
        
        if (corsResult && uploadResult.success) {
            console.log('\n🎉 SUCCESS: Document upload should work in frontend!');
            console.log('   The green "+" button should function correctly');
            console.log('   Users can upload documents to data sources');
        } else {
            console.log('\n⚠️ Issues found:');
            if (!corsResult) {
                console.log('   - CORS preflight failing for POST requests');
            }
            if (!uploadResult.success) {
                console.log(`   - Upload functionality: ${uploadResult.issue || uploadResult.error}`);
            }
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
};

runTests();
