const fs = require('fs');
const path = require('path');

// Load environment variables manually
function loadEnvVars() {
    try {
        const envContent = fs.readFileSync('.env.local', 'utf8');
        const envVars = {};
        
        envContent.split('\n').forEach(line => {
            const [key, ...valueParts] = line.split('=');
            if (key && valueParts.length > 0) {
                envVars[key.trim()] = valueParts.join('=').trim();
            }
        });
        
        return envVars;
    } catch (error) {
        console.error('❌ Error loading .env.local:', error.message);
        return {};
    }
}

// Test upload with accented characters in filename
async function testUploadWithAccents() {
    console.log('🧪 Testing document upload with accented characters...\n');
    
    // Load environment variables
    const envVars = loadEnvVars();
    
    const API_BASE_URL = envVars.VITE_API_GATEWAY_URL || envVars.VITE_LAMBDA_URL;
    
    // For testing, we'll use placeholder credentials - user needs to provide real ones
    const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || 'PLACEHOLDER_ACCESS_KEY';
    const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || 'PLACEHOLDER_SECRET_KEY';
    const AWS_SESSION_TOKEN = process.env.AWS_SESSION_TOKEN;
    
    if (!API_BASE_URL) {
        console.error('❌ Missing API_BASE_URL in .env.local');
        return;
    }
    
    if (AWS_ACCESS_KEY_ID === 'PLACEHOLDER_ACCESS_KEY') {
        console.log('⚠️ Using placeholder credentials. For real testing, set environment variables:');
        console.log('   export AWS_ACCESS_KEY_ID="your_access_key"');
        console.log('   export AWS_SECRET_ACCESS_KEY="your_secret_key"');
        console.log('   export AWS_SESSION_TOKEN="your_session_token" (optional)');
        console.log('');
        console.log('📝 This test will demonstrate the fix but may fail with authentication.');
        console.log('');
    }
    
    console.log(`📡 API Base URL: ${API_BASE_URL}`);
    
    // Test data
    const knowledgeBaseId = 'IXQHCKDQPV';
    const dataSourceId = 'IXQHCKDQPV-IXQHCKDQPV';
    
    // Create a test file with accented characters in the name
    const testFileName = 'LCS - Gen AI en SDLC - Codificación - Evaluación resultados v0.3 3.txt';
    const testContent = 'Este es un documento de prueba con caracteres especiales: ñáéíóúü';
    
    // Convert to base64
    const base64Content = Buffer.from(testContent, 'utf8').toString('base64');
    
    const uploadPayload = {
        action: 'upload_document',
        knowledge_base_id: knowledgeBaseId,
        data_source_id: dataSourceId,
        file_content: base64Content,
        filename: testFileName,
        content_type: 'text/plain',
        aws_credentials: {
            aws_access_key_id: AWS_ACCESS_KEY_ID,
            aws_secret_access_key: AWS_SECRET_ACCESS_KEY,
            aws_session_token: AWS_SESSION_TOKEN
        }
    };
    
    try {
        console.log(`📤 Uploading document: "${testFileName}"`);
        console.log(`📄 Content size: ${testContent.length} characters`);
        console.log(`🔐 Using AWS credentials: ${AWS_ACCESS_KEY_ID.substring(0, 8)}...`);
        
        const response = await fetch(API_BASE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(uploadPayload)
        });
        
        console.log(`📊 Response status: ${response.status}`);
        console.log(`📋 Response headers:`, Object.fromEntries(response.headers.entries()));
        
        const responseText = await response.text();
        console.log(`📝 Raw response: ${responseText.substring(0, 500)}${responseText.length > 500 ? '...' : ''}`);
        
        if (response.ok) {
            try {
                const result = JSON.parse(responseText);
                console.log('\n✅ Upload successful!');
                console.log(`📄 Document ID: ${result.id}`);
                console.log(`📝 Document name: ${result.name}`);
                console.log(`📊 Document size: ${result.size} bytes`);
                console.log(`🕒 Created at: ${result.createdAt}`);
                
                // Test listing documents to verify it appears
                console.log('\n🔍 Verifying document appears in list...');
                
                const listPayload = {
                    action: 'list_documents',
                    knowledge_base_id: knowledgeBaseId,
                    data_source_id: dataSourceId,
                    aws_credentials: {
                        aws_access_key_id: AWS_ACCESS_KEY_ID,
                        aws_secret_access_key: AWS_SECRET_ACCESS_KEY,
                        aws_session_token: AWS_SESSION_TOKEN
                    }
                };
                
                const listResponse = await fetch(API_BASE_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify(listPayload)
                });
                
                if (listResponse.ok) {
                    const listResult = JSON.parse(await listResponse.text());
                    const uploadedDoc = listResult.documents?.find(doc => doc.name.includes('Codificación'));
                    
                    if (uploadedDoc) {
                        console.log('✅ Document found in list!');
                        console.log(`📄 Listed name: ${uploadedDoc.name}`);
                        console.log(`🆔 Listed ID: ${uploadedDoc.id}`);
                    } else {
                        console.log('⚠️ Document not found in list (may take time to sync)');
                    }
                } else {
                    console.log('⚠️ Could not verify document in list');
                }
                
            } catch (parseError) {
                console.error('❌ Error parsing success response:', parseError.message);
            }
        } else {
            console.error(`❌ Upload failed with status ${response.status}`);
            try {
                const errorResult = JSON.parse(responseText);
                console.error('📋 Error details:', errorResult);
            } catch {
                console.error('📋 Raw error response:', responseText);
            }
        }
        
    } catch (error) {
        console.error('❌ Network error:', error.message);
    }
}

// Run the test
testUploadWithAccents().catch(console.error);
