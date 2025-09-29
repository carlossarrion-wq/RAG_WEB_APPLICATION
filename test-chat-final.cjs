const https = require('https');

// Configuración del test
const API_URL = 'https://zwxrsuw8o9.execute-api.eu-west-1.amazonaws.com/dev/kb-query';

const testPayload = {
    query: "Hola, ¿puedes ayudarme?",
    model_id: "anthropic.claude-sonnet-4-20250514-v1:0",
    knowledge_base_id: "TJ8IMVJVQW"
};

console.log('🧪 Probando funcionalidad de chat...');
console.log('📡 URL:', API_URL);
console.log('📝 Payload:', JSON.stringify(testPayload, null, 2));

const postData = JSON.stringify(testPayload);

const options = {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
    }
};

const req = https.request(API_URL, options, (res) => {
    console.log(`\n📊 Status Code: ${res.statusCode}`);
    console.log('📋 Headers:', JSON.stringify(res.headers, null, 2));
    
    let data = '';
    
    res.on('data', (chunk) => {
        data += chunk;
    });
    
    res.on('end', () => {
        console.log('\n📤 Respuesta recibida:');
        try {
            const response = JSON.parse(data);
            console.log(JSON.stringify(response, null, 2));
            
            if (res.statusCode === 200 && response.answer) {
                console.log('\n✅ Test EXITOSO - Chat funcionando correctamente');
                console.log('💬 Respuesta del modelo:', response.answer.substring(0, 100) + '...');
                console.log('⏱️ Tiempo de procesamiento:', response.processing_time_ms + 'ms');
                console.log('🔍 Resultados de búsqueda:', response.retrievalResults.length + ' documentos');
                console.log('🤖 Modelo usado:', response.model_used);
            } else {
                console.log('\n❌ Test FALLIDO - Respuesta inesperada');
            }
        } catch (error) {
            console.log('\n❌ Error parseando JSON:', error.message);
            console.log('📄 Respuesta raw:', data);
        }
    });
});

req.on('error', (error) => {
    console.error('\n❌ Error en la petición:', error.message);
});

req.write(postData);
req.end();
