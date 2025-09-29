const https = require('https');

// Lista de Knowledge Bases y Data Sources que quieres probar
// Puedes agregar más IDs aquí según los tengas en tu aplicación
const testCases = [
    { kbId: 'TJ8IMVJVQW', dsId: 'TGSBEBDDSH', name: 'Data Source 1' },
    // Agrega más data sources aquí si los conoces
];

function testDataSource(kbId, dsId, name) {
    return new Promise((resolve) => {
        const options = {
            hostname: 'zwxrsuw8o9.execute-api.eu-west-1.amazonaws.com',
            port: 443,
            path: `/dev/documents/${kbId}/${dsId}`,
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        };

        console.log(`\n🔍 Testing ${name}: ${kbId}/${dsId}`);
        console.log(`📡 URL: https://${options.hostname}${options.path}`);

        const req = https.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const jsonData = JSON.parse(data);
                    
                    console.log(`📊 Status: ${res.statusCode}`);
                    console.log(`📄 Documents found: ${jsonData.count || 0}`);
                    
                    if (jsonData.debug_info) {
                        console.log(`📦 Bucket: ${jsonData.debug_info.bucket_name}`);
                        console.log(`📂 Prefixes searched:`, jsonData.debug_info.prefixes_searched);
                        console.log(`🔢 Total objects found: ${jsonData.debug_info.total_objects_found}`);
                        console.log(`✅ Objects after filtering: ${jsonData.debug_info.objects_after_filtering}`);
                    }
                    
                    if (jsonData.documents && jsonData.documents.length > 0) {
                        console.log(`📋 First document: ${jsonData.documents[0].name}`);
                        console.log(`📏 Size: ${jsonData.documents[0].size} bytes`);
                        console.log(`📄 Type: ${jsonData.documents[0].type}`);
                    }
                    
                    if (jsonData.error) {
                        console.log(`❌ Error: ${jsonData.error}`);
                    }
                    
                    resolve({
                        kbId,
                        dsId,
                        name,
                        success: res.statusCode === 200,
                        count: jsonData.count || 0,
                        debug_info: jsonData.debug_info,
                        error: jsonData.error
                    });
                } catch (e) {
                    console.log(`❌ Parse error: ${e.message}`);
                    console.log(`📄 Raw response: ${data}`);
                    resolve({
                        kbId,
                        dsId,
                        name,
                        success: false,
                        error: `Parse error: ${e.message}`
                    });
                }
            });
        });

        req.on('error', (error) => {
            console.error(`❌ Request error: ${error.message}`);
            resolve({
                kbId,
                dsId,
                name,
                success: false,
                error: error.message
            });
        });

        req.end();
    });
}

async function diagnoseAllDataSources() {
    console.log('🚀 DIAGNOSING ALL DATA SOURCES');
    console.log('==================================================');
    
    const results = [];
    
    for (const testCase of testCases) {
        const result = await testDataSource(testCase.kbId, testCase.dsId, testCase.name);
        results.push(result);
        
        // Wait a bit between requests
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('\n📊 SUMMARY REPORT');
    console.log('==================================================');
    
    results.forEach(result => {
        console.log(`\n${result.name} (${result.kbId}/${result.dsId}):`);
        console.log(`  Status: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}`);
        console.log(`  Documents: ${result.count || 0}`);
        
        if (result.debug_info) {
            console.log(`  Bucket: ${result.debug_info.bucket_name}`);
            console.log(`  Total S3 objects: ${result.debug_info.total_objects_found}`);
            console.log(`  After filtering: ${result.debug_info.objects_after_filtering}`);
        }
        
        if (result.error) {
            console.log(`  Error: ${result.error}`);
        }
    });
    
    // Recommendations
    console.log('\n💡 RECOMMENDATIONS');
    console.log('==================================================');
    
    const emptyDataSources = results.filter(r => r.success && r.count === 0);
    const failedDataSources = results.filter(r => !r.success);
    
    if (emptyDataSources.length > 0) {
        console.log('📭 Empty data sources found:');
        emptyDataSources.forEach(ds => {
            console.log(`  - ${ds.name}: Check if documents exist in the configured S3 prefix`);
        });
    }
    
    if (failedDataSources.length > 0) {
        console.log('❌ Failed data sources:');
        failedDataSources.forEach(ds => {
            console.log(`  - ${ds.name}: ${ds.error}`);
        });
    }
}

// Si quieres probar data sources específicos, puedes agregarlos aquí
console.log('ℹ️  To test additional data sources, add them to the testCases array in this script');
console.log('ℹ️  Format: { kbId: "YOUR_KB_ID", dsId: "YOUR_DS_ID", name: "Descriptive Name" }');

diagnoseAllDataSources().catch(console.error);
