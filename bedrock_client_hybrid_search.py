import boto3
import json
import logging
import time
import os
from botocore.exceptions import ClientError

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Mapeo de IDs de modelos a ARNs de perfiles de inferencia
# Usar los ARNs reales proporcionados
MODEL_TO_PROFILE_ARN = {
    "anthropic.claude-sonnet-4-20250514-v1:0": "arn:aws:bedrock:eu-west-1:573734645132:inference-profile/eu.anthropic.claude-sonnet-4-20250514-v1:0",
    # Para Nova Pro, usar un formato similar si está disponible
    "amazon.nova-pro-v1:0": "arn:aws:bedrock:eu-west-1:573734645132:inference-profile/eu.amazon.nova-pro-v1:0"
}

# Mapeo de modelos a sus proveedores
MODEL_PROVIDERS = {
    "anthropic.claude-sonnet-4-20250514-v1:0": "anthropic",
    "amazon.nova-pro-v1:0": "amazon"
}

# Mapeo de perfiles de inferencia a sus proveedores
PROFILE_TO_PROVIDER = {
    "arn:aws:bedrock:eu-west-1:573734645132:inference-profile/eu.anthropic.claude-sonnet-4-20250514-v1:0": "anthropic",
    "arn:aws:bedrock:eu-west-1:573734645132:inference-profile/eu.amazon.nova-pro-v1:0": "amazon"
}

class BedrockClient:
    """Client for interacting with Amazon Bedrock Claude Sonnet 4 model."""
    
    def __init__(self, region_name='eu-west-1', model_id='anthropic.claude-sonnet-4-20250514-v1:0'):
        """Initialize Bedrock client with region and model."""
        self.client = boto3.client('bedrock-runtime', region_name=region_name)
        self.agent_client = boto3.client('bedrock-agent-runtime', region_name=region_name)
        self.model_id = model_id
        
        # Determinar el proveedor del modelo para ajustar el formato del prompt
        # Usamos el ID del modelo original, no el ARN del perfil de inferencia
        self.model_provider = MODEL_PROVIDERS.get(model_id, "unknown")
        logger.info(f"Modelo seleccionado: {model_id}, Proveedor: {self.model_provider}")
    
    def generate_content(self, requirement_text, application_context, max_tokens=4000, max_items=3, user_instructions=""):
        """
        Generate content using selected model with RAG-enhanced prompt.
        
        Args:
            requirement_text (str): The requirement description
            application_context (list): List of relevant application documentation chunks
            max_tokens (int): Maximum tokens in response
            max_items (int): Maximum number of items to generate (1-5)
            user_instructions (str): Additional user instructions for content generation
            
        Returns:
            dict: Generated content in structured JSON format
        """
        try:
            start_time = time.time()
            
            # Determinar si necesitamos usar un perfil de inferencia
            model_to_use = self.model_id
            using_profile = False
            if self.model_id in MODEL_TO_PROFILE_ARN:
                model_to_use = MODEL_TO_PROFILE_ARN[self.model_id]
                using_profile = True
                logger.info(f"Usando perfil de inferencia para el modelo {self.model_id}: {model_to_use}")
            else:
                logger.info(f"Usando modelo directamente: {model_to_use}")
            
            # Build prompt with application context
            prompt = self._build_prompt(requirement_text, application_context, max_items, user_instructions)
            
            # Prepare request body based on model provider and whether we're using a profile
            if self.model_provider == 'anthropic':
                # Para modelos Anthropic (Claude), siempre usamos el formato de mensajes
                request_body = {
                    "anthropic_version": "bedrock-2023-05-31",
                    "max_tokens": max_tokens,
                    "temperature": 0.1,  # Low temperature for consistent, factual output
                    "messages": [
                        {
                            "role": "user",
                            "content": prompt
                        }
                    ]
                }
                logger.info("Usando formato de solicitud para modelos Anthropic (mensajes)")
            elif self.model_provider == 'amazon':
                if using_profile and "nova-pro" in self.model_id:
                    # Para perfiles de inferencia de Amazon Nova Pro, SOLO usamos el parámetro messages
                    # CORREGIDO: El contenido debe ser un array de objetos JSON, pero sin la clave "type"
                    request_body = {
                        "messages": [
                            {
                                "role": "user",
                                "content": [
                                    {"text": prompt}  # Objeto JSON con clave "text" pero sin clave "type"
                                ]
                            }
                        ]
                    }
                    logger.info("Usando formato de solicitud para perfiles de inferencia de Amazon Nova Pro (content como array de objetos JSON con clave text)")
                elif using_profile:
                    # Para otros perfiles de inferencia de Amazon, usamos el formato de mensajes con max_tokens
                    request_body = {
                        "messages": [
                            {
                                "role": "user",
                                "content": prompt
                            }
                        ],
                        "max_tokens": max_tokens,
                        "temperature": 0.1
                        # Eliminado: "top_p": 0.9
                    }
                    logger.info("Usando formato de solicitud para perfiles de inferencia de Amazon (mensajes con max_tokens)")
                else:
                    # Para modelos Amazon directos, usamos el formato inputText
                    request_body = {
                        "inputText": prompt,
                        "textGenerationConfig": {
                            "maxTokenCount": max_tokens,
                            "temperature": 0.1,
                            "topP": 0.9
                        }
                    }
                    logger.info("Usando formato de solicitud para modelos Amazon directos (inputText)")
            else:
                # Formato genérico para otros modelos
                # Como fallback, usamos el formato de mensajes que es más común
                logger.warning(f"Proveedor de modelo desconocido: {self.model_provider}. Usando formato de mensajes como fallback.")
                request_body = {
                    "messages": [
                        {
                            "role": "user",
                            "content": prompt
                        }
                    ]
                }
            
            # Log del cuerpo de la solicitud para depuración
            logger.info(f"Request body format: {json.dumps(request_body, default=str)[:200]}...")
            
            # Invoke Bedrock model using the appropriate model ID or inference profile ARN
            response = self.client.invoke_model(
                modelId=model_to_use,
                body=json.dumps(request_body)
            )
            
            # Parse response based on model provider and whether we're using a profile
            response_body = json.loads(response['body'].read())
            logger.info(f"Response body structure: {list(response_body.keys())}")
            
            if self.model_provider == 'anthropic':
                # Para modelos Anthropic (Claude)
                if 'content' in response_body and len(response_body['content']) > 0:
                    content = response_body['content'][0]['text']
                else:
                    logger.warning("Formato de respuesta inesperado para modelo Anthropic")
                    content = str(response_body)
            elif self.model_provider == 'amazon':
                if using_profile:
                    # Para perfiles de inferencia de Amazon
                    if 'content' in response_body and len(response_body['content']) > 0:
                        # Para Nova Pro, el contenido puede estar en un formato diferente
                        if isinstance(response_body['content'][0], dict) and 'text' in response_body['content'][0]:
                            content = response_body['content'][0]['text']
                        else:
                            # Intentar extraer el texto de cada elemento del contenido
                            content_parts = []
                            for item in response_body['content']:
                                if isinstance(item, dict) and 'text' in item:
                                    content_parts.append(item['text'])
                                elif isinstance(item, str):
                                    content_parts.append(item)
                            content = ''.join(content_parts) if content_parts else str(response_body)
                    else:
                        logger.warning("Formato de respuesta inesperado para perfil de inferencia de Amazon")
                        content = str(response_body)
                else:
                    # Para modelos Amazon directos
                    content = response_body.get('results', [{}])[0].get('outputText', '')
            else:
                # Para proveedores desconocidos, intentamos extraer el contenido de manera genérica
                if 'content' in response_body and len(response_body['content']) > 0:
                    content = response_body['content'][0].get('text', str(response_body))
                else:
                    content = str(response_body)
            
            # Log which model or profile was actually used
            model_used = model_to_use
            
            # Extract JSON from response
            content_json = self._extract_json(content)
            
            # Log metrics
            processing_time = time.time() - start_time
            logger.info(f"Content generation completed in {processing_time:.2f}s")
            
            return {
                "items": content_json.get("items", []),
                "processing_time_ms": round(processing_time * 1000, 2),
                "model_used": model_used  # Incluir el modelo o perfil de inferencia utilizado
            }
            
        except ClientError as e:
            logger.error(f"Bedrock API error: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"Content generation failed: {str(e)}")
            raise
    
    def retrieve_and_generate(self, knowledge_base_id, prompt, model_id=None, retrieval_only=False):
        """
        Retrieve and generate with Knowledge Base using hybrid search.
        
        Args:
            knowledge_base_id (str): The Knowledge Base ID
            prompt (str): The user prompt
            model_id (str, optional): Specific model to use for this request
            retrieval_only (boolean): Whether to only retrieve without generating
            
        Returns:
            str: Generated response or retrieved content
        """
        try:
            start_time = time.time()
            
            # Si se proporciona un modelo específico para esta solicitud, usarlo
            current_model = model_id or self.model_id
            logger.info(f"Starting retrieve and generate using model: {current_model}")
            
            # Get the region directly from the client's credentials
            region = self.client.meta.region_name
            
            # Use inference profile ARN for RetrieveAndGenerate
            if current_model in MODEL_TO_PROFILE_ARN:
                model_arn = MODEL_TO_PROFILE_ARN[current_model]
            else:
                # Fallback to direct model ARN if no profile is available
                model_arn = f"arn:aws:bedrock:{region}::foundation-model/{current_model}"
            
            logger.info(f"Using model ARN: {model_arn}")
            logger.info(f"Knowledge Base ID: {knowledge_base_id}")
            logger.info(f"Retrieval only: {retrieval_only}")
            
            # Preparar la configuración para RetrieveAndGenerate con búsqueda híbrida
            # SOLUCIÓN: Usar configuración por defecto de AWS Bedrock sin plantillas personalizadas
            # Esto permite que Bedrock use sus plantillas internas optimizadas para generar citations
            command_input = {
                "input": {
                    "text": prompt,
                },
                "retrieveAndGenerateConfiguration": {
                    "type": "KNOWLEDGE_BASE" if not retrieval_only else "RETRIEVAL_ONLY",
                    "knowledgeBaseConfiguration": {
                        "knowledgeBaseId": knowledge_base_id,
                        "modelArn": model_arn,
                        # Eliminamos generationConfiguration y orchestrationConfiguration
                        # para permitir que Bedrock use sus plantillas internas optimizadas
                        # Configuración de vectorSearchConfiguration según la documentación
                        "retrievalConfiguration": {
                            "vectorSearchConfiguration": {
                                "numberOfResults": 10,  # Aumentar el número de resultados para tener más fragmentos
                                "overrideSearchType": "HYBRID"  # Usar búsqueda híbrida para mejorar resultados
                            }
                        }
                    }
                }
            }
            
            logger.info(f"Command input: {json.dumps(command_input, default=str)[:200]}...")
            
            # Ejecutar el comando RetrieveAndGenerate
            response = self.agent_client.retrieve_and_generate(**command_input)
            
            logger.info("Response received from AWS Bedrock")
            
            # Procesar la respuesta según el modo
            if retrieval_only:
                # Para modo de solo recuperación
                retrieved_results = []
                
                if hasattr(response, 'retrievalResults') and response.retrievalResults:
                    for result in response.retrievalResults:
                        retrieved_results.append({
                            "content": result.content.text if hasattr(result.content, 'text') else "",
                            "location": result.location.s3Location.uri if hasattr(result, 'location') and hasattr(result.location, 's3Location') else "",
                            "score": result.score if hasattr(result, 'score') else 0.0
                        })
                
                return {
                    "retrievalResults": retrieved_results,
                    "processing_time_ms": round((time.time() - start_time) * 1000, 2)
                }
            else:
                # Para modo RAG con respuesta generada
                # Imprimir la respuesta completa para depuración
                logger.info(f"Response structure: {dir(response)}")
                
                # Intentar acceder a la respuesta de diferentes maneras
                answer = "No se generó ninguna respuesta"
                retrieval_results = []
                
                # Imprimir las claves del diccionario de respuesta si es un diccionario
                if isinstance(response, dict):
                    logger.info(f"Response keys: {list(response.keys())}")
                    # Intentar acceder a la respuesta como un diccionario
                    if 'output' in response:
                        logger.info(f"Output content: {response['output']}")
                        if isinstance(response['output'], dict) and 'text' in response['output']:
                            answer = response['output']['text']
                        elif isinstance(response['output'], str):
                            answer = response['output']
                    # Intentar otras claves comunes
                    elif 'text' in response:
                        answer = response['text']
                    elif 'content' in response:
                        answer = response['content']
                    elif 'body' in response:
                        try:
                            if isinstance(response['body'], dict):
                                logger.info(f"Body content: {response['body']}")
                                if 'text' in response['body']:
                                    answer = response['body']['text']
                            else:
                                body_content = json.loads(response['body'].read().decode('utf-8'))
                                logger.info(f"Body content: {body_content}")
                                if 'output' in body_content and 'text' in body_content['output']:
                                    answer = body_content['output']['text']
                        except Exception as e:
                            logger.error(f"Error parsing response body: {str(e)}")
                    
                    # Extraer los fragmentos de texto de las citaciones
                    if 'citations' in response:
                        logger.info(f"Found citations in response: {response['citations']}")
                        for citation in response['citations']:
                            retrieval_result = {}
                            if isinstance(citation, dict):
                                # Extraer el contenido del fragmento
                                if 'retrievedReferences' in citation:
                                    for reference in citation['retrievedReferences']:
                                        if 'content' in reference and 'text' in reference['content']:
                                            retrieval_result['content'] = reference['content']['text']
                                        
                                        # Extraer la ubicación del fragmento si está disponible
                                        if 'location' in reference and 's3Location' in reference['location'] and 'uri' in reference['location']['s3Location']:
                                            retrieval_result['location'] = reference['location']['s3Location']['uri']
                                        
                                        # Extraer la puntuación de relevancia si está disponible
                                        if 'score' in reference:
                                            retrieval_result['score'] = reference['score']
                                        
                                        # Añadir el fragmento a la lista de resultados
                                        if retrieval_result:
                                            retrieval_results.append(retrieval_result)
                                            # Crear un nuevo diccionario para el siguiente fragmento
                                            retrieval_result = {}
                    
                    # Intentar extraer los fragmentos de texto de retrievalResults si existen
                    if 'retrievalResults' in response:
                        logger.info(f"Found retrievalResults in response: {response['retrievalResults']}")
                        for result in response['retrievalResults']:
                            retrieval_result = {}
                            if isinstance(result, dict):
                                # Extraer el contenido del fragmento
                                if 'content' in result:
                                    if isinstance(result['content'], dict) and 'text' in result['content']:
                                        retrieval_result['content'] = result['content']['text']
                                    elif isinstance(result['content'], str):
                                        retrieval_result['content'] = result['content']
                                
                                # Extraer la ubicación del fragmento
                                if 'location' in result and isinstance(result['location'], dict):
                                    if 's3Location' in result['location'] and 'uri' in result['location']['s3Location']:
                                        retrieval_result['location'] = result['location']['s3Location']['uri']
                                
                                # Extraer la puntuación de relevancia
                                if 'score' in result:
                                    retrieval_result['score'] = result['score']
                                
                                # Añadir el fragmento a la lista de resultados
                                if retrieval_result:
                                    retrieval_results.append(retrieval_result)
                # Si es un objeto con atributos
                else:
                    # Intentar acceder como atributos
                    if hasattr(response, 'output'):
                        logger.info(f"Output structure: {dir(response.output)}")
                        if hasattr(response.output, 'text'):
                            answer = response.output.text
                        elif isinstance(response.output, dict) and 'text' in response.output:
                            answer = response.output['text']
                    
                    # Si no se encontró la respuesta en output, buscar en otros atributos
                    if answer == "No se generó ninguna respuesta" and hasattr(response, 'body'):
                        try:
                            body_content = json.loads(response.body.read().decode('utf-8'))
                            logger.info(f"Body content: {body_content}")
                            if 'output' in body_content and 'text' in body_content['output']:
                                answer = body_content['output']['text']
                        except Exception as e:
                            logger.error(f"Error parsing response body: {str(e)}")
                    
                    # Extraer los fragmentos de texto (retrievalResults)
                    if hasattr(response, 'retrievalResults'):
                        logger.info(f"Found retrievalResults attribute in response")
                        for result in response.retrievalResults:
                            retrieval_result = {}
                            # Extraer el contenido del fragmento
                            if hasattr(result, 'content') and hasattr(result.content, 'text'):
                                retrieval_result['content'] = result.content.text
                            
                            # Extraer la ubicación del fragmento
                            if hasattr(result, 'location') and hasattr(result.location, 's3Location') and hasattr(result.location.s3Location, 'uri'):
                                retrieval_result['location'] = result.location.s3Location.uri
                            
                            # Extraer la puntuación de relevancia
                            if hasattr(result, 'score'):
                                retrieval_result['score'] = result.score
                            
                            # Añadir el fragmento a la lista de resultados
                            if retrieval_result:
                                retrieval_results.append(retrieval_result)
                
                # Imprimir la respuesta final para depuración
                logger.info(f"Final answer: {answer}")
                logger.info(f"Retrieved {len(retrieval_results)} fragments")
                
                return {
                    "answer": answer,
                    "processing_time_ms": round((time.time() - start_time) * 1000, 2),
                    "retrievalResults": retrieval_results
                }
                
        except Exception as e:
            logger.error(f"Error in retrieve and generate: {str(e)}")
            raise
    
    def _build_prompt(self, requirement_text, application_context, max_items=3, user_instructions=""):
        """
        Build RAG-enhanced prompt for content generation.
        
        Args:
            requirement_text (str): The requirement description
            application_context (list): List of relevant application documentation chunks
            max_items (int): Maximum number of items to generate (1-5)
            user_instructions (str): Additional user instructions for content generation
            
        Returns:
            str: Formatted prompt for Claude
        """
        # Log the prompt construction details
        logger.info(f"Building prompt with {len(application_context)} context chunks for requirement: {requirement_text[:100]}...")
        logger.info(f"User instructions: {user_instructions[:100] if user_instructions else 'None provided'}")
        
        # Format context chunks
        context_text = "\n\n".join([
            f"Document: {ctx.get('document_id', 'unknown')}\nContent: {ctx.get('text_chunk', '')}"
            for ctx in application_context
        ])
        
        # Log the context being used
        logger.info(f"Application context chunks: {len(application_context)} chunks, total context length: {len(context_text)} characters")
        
        # Build the prompt with user instructions having high priority
        prompt = f"""
Eres un arquitecto de software experto familiarizado con aplicaciones empresariales.

CONTEXTO DE LA APLICACIÓN:
{context_text}

REQUISITO A ANALIZAR:
{requirement_text}

INSTRUCCIONES ADICIONALES DEL USUARIO PARA LA GENERACIÓN DE CONTENIDO:
{user_instructions if user_instructions else "No se han proporcionado instrucciones adicionales."}

INSTRUCCIONES:
Basándote en el contexto de la aplicación, el requisito, y las INSTRUCCIONES ADICIONALES DEL USUARIO PARA LA GENERACIÓN DE CONTENIDO, genera de 1 a {max_items} elementos que:
1. CUMPLAN ESTRICTAMENTE con las instrucciones adicionales proporcionadas por el usuario (PRIORIDAD ALTA)
2. Se alineen con la arquitectura y patrones existentes de la aplicación
3. Aprovechen los componentes existentes de la aplicación cuando sea posible
4. Sigan los estándares y convenciones de desarrollo de la aplicación
5. Consideren puntos de integración con las características actuales de la aplicación
6. Incluyan estimaciones realistas de complejidad (escala 1-13)

IMPORTANTE: Las instrucciones adicionales del usuario tienen PRIORIDAD ALTA y deben ser consideradas como directrices obligatorias para la generación de contenido.

FORMATO DE SALIDA:
Devuelve solo JSON válido:
{{
  "items": [
    {{
      "title": "Título del elemento (máx 100 caracteres)",
      "description": "Descripción detallada del elemento (máx 500 caracteres)",
      "acceptanceCriteria": ["Criterio 1", "Criterio 2"],
      "applicationComponents": ["Componente1", "Componente2"],
      "integrationNotes": "Consideraciones de integración",
      "estimatedComplexity": 8,
      "priority": "High|Medium|Low"
    }}
  ]
}}
"""
        return prompt
    
    def _extract_json(self, content):
        """
        Extract JSON from Claude's response.
        
        Args:
            content (str): Claude's response text
            
        Returns:
            dict: Parsed JSON object
        """
        try:
            # Try to parse the entire response as JSON
            return json.loads(content)
        except json.JSONDecodeError:
            # If that fails, try to extract JSON from markdown code blocks
            import re
            json_match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', content)
            if json_match:
                try:
                    return json.loads(json_match.group(1))
                except json.JSONDecodeError:
                    logger.error("Failed to parse JSON from code block")
            
            # If all else fails, try to find anything that looks like JSON
            json_pattern = r'{[\s\S]*}'
            json_match = re.search(json_pattern, content)
            if json_match:
                try:
                    return json.loads(json_match.group(0))
                except json.JSONDecodeError:
                    logger.error("Failed to parse JSON from content")
            
            # Return empty result if no valid JSON found
            logger.error("No valid JSON found in response")
            return {"items": []}
