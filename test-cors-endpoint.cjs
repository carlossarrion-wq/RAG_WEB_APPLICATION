const https = require('https');

// Test CORS preflight request
function testCorsPreflightRequest() {
    console.log('🧪 Probando petición OPTIONS (CORS preflight)...\n');
    
    const options = {
        hostname: 'zwxrsuw8o9.execute-api.eu-west-1.amazonaws.com',
        port: 443,
        path: '/dev/documents/55LVEIRFTI/A4DBIXGZM3/batch',
        method: 'OPTIONS',
        headers: {
            'Origin': 'http://localhost:5173',
            'Access-Control-Request-Method': 'DELETE',
            'Access-Control-Request-Headers': 'Content-Type,X-AWS-Access-Key-Id,X-AWS-Secret-Access-Key,X-AWS-Session-Token'
        }
    };

    const req = https.request(options, (res) => {
        console.log(`📡 Status: ${res.statusCode} ${res.statusMessage}`);
        console.log('📋 Response Headers:');
        
        Object.keys(res.headers).forEach(key => {
            console.log(`   ${key}: ${res.headers[key]}`);
        });
        
        let data = '';
        res.on('data', (chunk) => {
            data += chunk;
        });
        
        res.on('end', () => {
            console.log('\n📄 Response Body:');
            console.log(data || '(empty)');
            
            // Verificar headers CORS específicos
            console.log('\n🔍 Análisis CORS:');
            
            const corsHeaders = {
                'access-control-allow-origin': res.headers['access-control-allow-origin'],
                'access-control-allow-methods': res.headers['access-control-allow-methods'],
                'access-control-allow-headers': res.headers['access-control-allow-headers']
            };
            
            console.log('Headers CORS encontrados:');
            Object.keys(corsHeaders).forEach(key => {
                const value = corsHeaders[key];
                if (value) {
                    console.log(`   ✅ ${key}: ${value}`);
                } else {
                    console.log(`   ❌ ${key}: MISSING`);
                }
            });
            
            // Verificar si CORS está configurado correctamente
            const hasOrigin = corsHeaders['access-control-allow-origin'];
            const hasMethods = corsHeaders['access-control-allow-methods'];
            const hasHeaders = corsHeaders['access-control-allow-headers'];
            
            console.log('\n📊 Resultado:');
            if (hasOrigin && hasMethods && hasHeaders) {
                console.log('✅ CORS parece estar configurado correctamente');
                
                // Verificar si incluye DELETE
                if (hasMethods.includes('DELETE')) {
                    console.log('✅ Método DELETE permitido');
                } else {
                    console.log('❌ Método DELETE NO permitido');
                }
                
                // Verificar headers personalizados
                const customHeaders = ['X-AWS-Access-Key-Id', 'X-AWS-Secret-Access-Key', 'X-AWS-Session-Token'];
                const missingHeaders = customHeaders.filter(header => 
                    !hasHeaders.toLowerCase().includes(header.toLowerCase())
                );
                
                if (missingHeaders.length === 0) {
                    console.log('✅ Todos los headers personalizados AWS permitidos');
                } else {
                    console.log(`❌ Headers faltantes: ${missingHeaders.join(', ')}`);
                }
                
            } else {
                console.log('❌ CORS NO está configurado correctamente');
                console.log('   Faltan headers CORS básicos');
            }
            
            console.log('\n🔄 Ahora probando petición DELETE real...');
            testDeleteRequest();
        });
    });

    req.on('error', (error) => {
        console.error('❌ Error en petición OPTIONS:', error.message);
    });

    req.end();
}

function testDeleteRequest() {
    console.log('\n🗑️ Probando petición DELETE...\n');
    
    const options = {
        hostname: 'zwxrsuw8o9.execute-api.eu-west-1.amazonaws.com',
        port: 443,
        path: '/dev/documents/55LVEIRFTI/A4DBIXGZM3/batch',
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
            'Origin': 'http://localhost:5173',
            'X-AWS-Access-Key-Id': 'TEST_KEY',
            'X-AWS-Secret-Access-Key': 'TEST_SECRET',
            'X-AWS-Session-Token': 'TEST_TOKEN'
        }
    };

    const req = https.request(options, (res) => {
        console.log(`📡 Status: ${res.statusCode} ${res.statusMessage}`);
        console.log('📋 Response Headers:');
        
        Object.keys(res.headers).forEach(key => {
            console.log(`   ${key}: ${res.headers[key]}`);
        });
        
        let data = '';
        res.on('data', (chunk) => {
            data += chunk;
        });
        
        res.on('end', () => {
            console.log('\n📄 Response Body:');
            console.log(data || '(empty)');
            
            console.log('\n📊 Análisis final:');
            if (res.statusCode === 200 || res.statusCode === 204) {
                console.log('✅ Petición DELETE exitosa');
            } else if (res.statusCode === 403) {
                console.log('⚠️ Error 403: Problema de autenticación (esperado con credenciales de prueba)');
            } else if (res.statusCode === 404) {
                console.log('⚠️ Error 404: Endpoint no encontrado');
            } else {
                console.log(`❌ Error ${res.statusCode}: ${data}`);
            }
            
            // Verificar headers CORS en respuesta DELETE
            const corsOrigin = res.headers['access-control-allow-origin'];
            if (corsOrigin) {
                console.log(`✅ CORS Origin en respuesta DELETE: ${corsOrigin}`);
            } else {
                console.log('❌ Falta header CORS Origin en respuesta DELETE');
            }
        });
    });

    req.on('error', (error) => {
        console.error('❌ Error en petición DELETE:', error.message);
    });

    // Enviar body de prueba
    const testBody = JSON.stringify({
        document_ids: ['test-doc-1', 'test-doc-2']
    });
    
    req.write(testBody);
    req.end();
}

console.log('🚀 Iniciando pruebas de CORS para endpoint de eliminación por lotes...\n');
testCorsPreflightRequest();
