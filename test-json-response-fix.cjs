const https = require('https');

// Test the fixed JSON response from document deletion
const testDocumentDeletionResponse = async () => {
    console.log('🧪 Testing Fixed JSON Response for Document Deletion...\n');
    
    const options = {
        hostname: 'zwxrsuw8o9.execute-api.eu-west-1.amazonaws.com',
        port: 443,
        path: '/dev/documents/55LVEIRFTI/A4DBIXGZM3/test-document-for-deletion.txt',
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
            console.log('📋 Response Headers:');
            Object.keys(res.headers).forEach(key => {
                console.log(`   ${key}: ${res.headers[key]}`);
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
                        console.log('   ❌ Response is empty or null - this would cause parsing errors');
                        console.log('   💡 Expected: Valid JSON object with success message');
                        resolve({ success: false, issue: 'empty_response' });
                        return;
                    }
                    
                    const parsed = JSON.parse(data);
                    console.log('   ✅ JSON parsing successful!');
                    console.log('   📋 Parsed object:');
                    console.log(JSON.stringify(parsed, null, 4));
                    
                    // Check if it's a proper success response
                    if (parsed.success !== undefined || parsed.message !== undefined || parsed.error !== undefined) {
                        console.log('   ✅ Response has proper structure');
                        resolve({ success: true, response: parsed });
                    } else {
                        console.log('   ⚠️ Response parsed but structure is unexpected');
                        resolve({ success: true, response: parsed, warning: 'unexpected_structure' });
                    }
                    
                } catch (parseError) {
                    console.log('   ❌ JSON parsing failed!');
                    console.log(`   Error: ${parseError.message}`);
                    console.log('   💡 This would cause frontend console errors');
                    resolve({ success: false, issue: 'parse_error', error: parseError.message });
                }
            });
        });

        req.on('error', (error) => {
            console.error('❌ Request failed:', error.message);
            reject(error);
        });

        req.end();
    });
};

// Test batch deletion as well
const testBatchDeletionResponse = async () => {
    console.log('\n🧪 Testing Batch Deletion JSON Response...\n');
    
    const options = {
        hostname: 'zwxrsuw8o9.execute-api.eu-west-1.amazonaws.com',
        port: 443,
        path: '/dev/documents/55LVEIRFTI/A4DBIXGZM3/batch',
        method: 'DELETE',
        headers: {
            'Origin': 'http://localhost:5173',
            'Content-Type': 'application/json',
            'X-AWS-Access-Key-Id': 'test-key',
            'X-AWS-Secret-Access-Key': 'test-secret',
            'X-AWS-Session-Token': 'test-token'
        }
    };

    const requestBody = JSON.stringify({
        document_ids: ['test-doc-1.txt', 'test-doc-2.pdf']
    });

    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            console.log(`📊 Status Code: ${res.statusCode}`);
            
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
                        console.log('   ❌ Response is empty or null - this would cause parsing errors');
                        resolve({ success: false, issue: 'empty_response' });
                        return;
                    }
                    
                    const parsed = JSON.parse(data);
                    console.log('   ✅ JSON parsing successful!');
                    console.log('   📋 Parsed object keys:', Object.keys(parsed));
                    
                    resolve({ success: true, response: parsed });
                    
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

// Run tests
const runTests = async () => {
    try {
        console.log('🚀 Testing JSON Response Fixes for Document Operations\n');
        console.log('=' .repeat(70));
        
        const individualResult = await testDocumentDeletionResponse();
        const batchResult = await testBatchDeletionResponse();
        
        console.log('\n' + '=' .repeat(70));
        console.log('📊 Test Results Summary:');
        console.log(`   Individual Deletion: ${individualResult.success ? '✅ FIXED' : '❌ STILL BROKEN'}`);
        console.log(`   Batch Deletion: ${batchResult.success ? '✅ FIXED' : '❌ STILL BROKEN'}`);
        
        if (individualResult.success && batchResult.success) {
            console.log('\n🎉 SUCCESS: JSON parsing errors should be eliminated!');
            console.log('   Frontend will now receive proper JSON responses');
            console.log('   No more console errors about parsing null responses');
        } else {
            console.log('\n⚠️ Some issues remain:');
            if (!individualResult.success) {
                console.log(`   - Individual deletion: ${individualResult.issue}`);
            }
            if (!batchResult.success) {
                console.log(`   - Batch deletion: ${batchResult.issue}`);
            }
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
};

runTests();
