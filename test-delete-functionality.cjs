const https = require('https');

// Configuración
const LAMBDA_URL = 'https://zwxrsuw8o9.execute-api.eu-west-1.amazonaws.com/dev';
const KNOWLEDGE_BASE_ID = '55LVEIRFTI';
const DATA_SOURCE_ID = 'A4DBIXGZM3';

// Credenciales AWS de prueba (reemplazar con las reales)
const AWS_CREDENTIALS = {
  accessKeyId: 'ASIA...',  // Reemplazar con tu Access Key ID
  secretAccessKey: '...',   // Reemplazar con tu Secret Access Key
  sessionToken: '...'       // Reemplazar con tu Session Token si aplica
};

async function testDeleteFunctionality() {
  console.log('🧪 Probando funcionalidad de eliminación de documentos...\n');

  try {
    // Paso 1: Listar documentos primero
    console.log('📋 Paso 1: Listando documentos disponibles...');
    const documents = await makeRequest('GET', `/documents/${KNOWLEDGE_BASE_ID}/${DATA_SOURCE_ID}`);
    
    if (!documents.documents || documents.documents.length === 0) {
      console.log('❌ No hay documentos disponibles para probar la eliminación');
      return;
    }

    console.log(`✅ Encontrados ${documents.documents.length} documentos:`);
    documents.documents.forEach((doc, index) => {
      console.log(`   ${index + 1}. ${doc.name} (ID: ${doc.id})`);
    });

    // Paso 2: Probar eliminación por lotes (simulada - no eliminaremos realmente)
    console.log('\n🗑️ Paso 2: Probando eliminación por lotes (simulación)...');
    
    // Tomar los primeros 2 documentos para la prueba
    const testDocumentIds = documents.documents.slice(0, 2).map(doc => doc.id);
    console.log(`📝 IDs de documentos para prueba: ${testDocumentIds.join(', ')}`);

    // Hacer la llamada de eliminación por lotes
    const deleteResult = await makeRequest('DELETE', `/documents/${KNOWLEDGE_BASE_ID}/${DATA_SOURCE_ID}/batch`, {
      document_ids: testDocumentIds
    });

    console.log('✅ Eliminación por lotes exitosa:', deleteResult);

  } catch (error) {
    console.error('❌ Error en la prueba:', error.message);
    
    if (error.message.includes('CORS')) {
      console.log('\n🔍 Análisis del error CORS:');
      console.log('- El error indica que falta el header Access-Control-Allow-Origin');
      console.log('- Esto sugiere que la configuración CORS no está funcionando correctamente');
      console.log('- Verifica que la función Lambda esté devolviendo los headers CORS correctos');
    }
  }
}

function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(LAMBDA_URL + path);
    
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'X-AWS-Access-Key-Id': AWS_CREDENTIALS.accessKeyId,
        'X-AWS-Secret-Access-Key': AWS_CREDENTIALS.secretAccessKey,
      }
    };

    if (AWS_CREDENTIALS.sessionToken) {
      options.headers['X-AWS-Session-Token'] = AWS_CREDENTIALS.sessionToken;
    }

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`📡 Respuesta HTTP ${res.statusCode} para ${method} ${path}`);
        console.log(`📋 Headers de respuesta:`, res.headers);
        
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const jsonData = JSON.parse(data);
            resolve(jsonData);
          } catch (e) {
            resolve({ raw: data });
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (body && (method === 'POST' || method === 'PUT' || method === 'DELETE')) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

// Ejecutar la prueba
console.log('🚀 Iniciando prueba de funcionalidad de eliminación...\n');
console.log('⚠️  IMPORTANTE: Actualiza las credenciales AWS en el script antes de ejecutar\n');

testDeleteFunctionality().then(() => {
  console.log('\n✅ Prueba completada');
}).catch((error) => {
  console.error('\n❌ Error en la prueba:', error);
});
