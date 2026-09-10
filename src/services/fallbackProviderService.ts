import { GoogleGenAI } from '@google/genai';
import { UploadedMaterial } from '../types';

/**
 * Resolves the Fallback API Key from available environment variables:
 * - import.meta.env.VITE_FALLBACK_API_KEY
 * - process.env.VITE_FALLBACK_API_KEY / process.env.FALLBACK_API_KEY
 */
export const getFallbackApiKey = (): string => {
  const metaEnv = typeof import.meta !== 'undefined' ? import.meta.env : undefined;
  const procEnv = typeof process !== 'undefined' ? process.env : undefined;

  const key =
    metaEnv?.VITE_FALLBACK_API_KEY ||
    (metaEnv as any)?.FALLBACK_API_KEY ||
    procEnv?.VITE_FALLBACK_API_KEY ||
    procEnv?.FALLBACK_API_KEY ||
    '';

  return (key || '').trim();
};

export const getFallbackBaseUrl = (): string => {
  const metaEnv = typeof import.meta !== 'undefined' ? import.meta.env : undefined;
  const procEnv = typeof process !== 'undefined' ? process.env : undefined;

  const url =
    metaEnv?.VITE_FALLBACK_BASE_URL ||
    (metaEnv as any)?.FALLBACK_BASE_URL ||
    procEnv?.VITE_FALLBACK_BASE_URL ||
    procEnv?.FALLBACK_BASE_URL ||
    '';

  return (url || '').trim();
};

export const getFallbackModel = (): string => {
  const metaEnv = typeof import.meta !== 'undefined' ? import.meta.env : undefined;
  const procEnv = typeof process !== 'undefined' ? process.env : undefined;

  const model =
    metaEnv?.VITE_FALLBACK_MODEL ||
    (metaEnv as any)?.FALLBACK_MODEL ||
    procEnv?.VITE_FALLBACK_MODEL ||
    procEnv?.FALLBACK_MODEL ||
    '';

  return (model || '').trim();
};

export const isFallbackConfigured = (): boolean => {
  const key = getFallbackApiKey();
  return Boolean(key && key.length > 5);
};

interface ProviderConfig {
  type: 'gemini' | 'openai-compatible';
  baseUrl: string;
  model: string;
}

function resolveProviderConfig(apiKey: string): ProviderConfig {
  const customBaseUrl = getFallbackBaseUrl();
  const customModel = getFallbackModel();

  // 1. If key is Google Gemini secondary key (typically starts with AIza...)
  if (apiKey.startsWith('AIza') && !customBaseUrl) {
    return {
      type: 'gemini',
      baseUrl: 'https://generativelanguage.googleapis.com',
      model: customModel || 'gemini-flash-latest',
    };
  }

  // 2. If key is OpenRouter
  if (apiKey.startsWith('sk-or-')) {
    return {
      type: 'openai-compatible',
      baseUrl: customBaseUrl || 'https://openrouter.ai/api/v1',
      model: customModel || 'openai/gpt-4o-mini',
    };
  }

  // 3. If key is Groq
  if (apiKey.startsWith('gsk_')) {
    return {
      type: 'openai-compatible',
      baseUrl: customBaseUrl || 'https://api.groq.com/openai/v1',
      model: customModel || 'llama-3.3-70b-versatile',
    };
  }

  // 4. Default to OpenAI / standard OpenAI-compatible API
  return {
    type: 'openai-compatible',
    baseUrl: customBaseUrl || 'https://api.openai.com/v1',
    model: customModel || 'gpt-4o-mini',
  };
}

/**
 * Executes request via secondary Gemini key using GoogleGenAI SDK
 */
async function executeGeminiFallback(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPromptText: string,
  materials?: UploadedMaterial[]
): Promise<string> {
  const ai = new GoogleGenAI({ apiKey });
  const contents: any[] = [];

  if (Array.isArray(materials) && materials.length > 0) {
    for (const mat of materials) {
      if (!mat) continue;
      if (mat.type === 'text' || mat.mimeType === 'text/plain') {
        let textBody = '';
        if (mat.base64Data) {
          try {
            textBody = atob(mat.base64Data.replace(/^data:[^;]+;base64,/, '').trim());
          } catch {
            textBody = mat.base64Data;
          }
        }
        if (textBody.trim()) {
          contents.push({
            text: `[Material de temario adjunto - ${mat.name || 'Temario'}]:\n${textBody.trim()}`,
          });
        }
      } else if (mat.base64Data) {
        const cleanBase64 = mat.base64Data.replace(/^data:[^;]+;base64,/, '').trim();
        if (cleanBase64) {
          contents.push({
            inlineData: {
              mimeType: mat.mimeType || 'image/jpeg',
              data: cleanBase64,
            },
          });
        }
      }
    }
  }

  contents.push({ text: userPromptText });

  const response = await ai.models.generateContent({
    model: model || 'gemini-flash-latest',
    contents,
    config: {
      systemInstruction: systemPrompt,
      responseMimeType: 'application/json',
      temperature: 0.3,
      maxOutputTokens: 8192,
    },
  });

  const text = response.text || '';
  if (!text.trim()) {
    throw new Error('La API de respaldo (Gemini secundario) devolvió una respuesta vacía.');
  }
  return text;
}

/**
 * Executes request via OpenAI-compatible endpoint (OpenAI, OpenRouter, Groq, DeepSeek, etc.)
 */
async function executeOpenAICompatibleFallback(
  apiKey: string,
  baseUrl: string,
  model: string,
  systemPrompt: string,
  userPromptText: string,
  materials?: UploadedMaterial[]
): Promise<string> {
  const endpoint = `${baseUrl.replace(/\/+$/, '')}/chat/completions`;

  const userContentParts: any[] = [];

  if (Array.isArray(materials) && materials.length > 0) {
    for (const mat of materials) {
      if (!mat) continue;
      if (mat.type === 'text' || mat.mimeType === 'text/plain') {
        let textBody = '';
        if (mat.base64Data) {
          try {
            textBody = atob(mat.base64Data.replace(/^data:[^;]+;base64,/, '').trim());
          } catch {
            textBody = mat.base64Data;
          }
        }
        if (textBody.trim()) {
          userContentParts.push({
            type: 'text',
            text: `[Material de temario adjunto - ${mat.name || 'Temario'}]:\n${textBody.trim()}`,
          });
        }
      } else if (mat.base64Data) {
        const cleanBase64 = mat.base64Data.trim();
        const dataUri = cleanBase64.startsWith('data:')
          ? cleanBase64
          : `data:${mat.mimeType || 'image/jpeg'};base64,${cleanBase64}`;

        userContentParts.push({
          type: 'image_url',
          image_url: {
            url: dataUri,
          },
        });
      }
    }
  }

  userContentParts.push({
    type: 'text',
    text: userPromptText,
  });

  const requestBody: any = {
    model,
    messages: [
      {
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'user',
        content: userContentParts.length === 1 ? userContentParts[0].text : userContentParts,
      },
    ],
    temperature: 0.3,
    response_format: { type: 'json_object' },
  };

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
    'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'https://aistudio.google.com',
    'X-Title': 'Generador de Exámenes',
  };

  let res: Response;
  try {
    res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    });
  } catch (networkErr: any) {
    throw new Error(`Fallo de red al conectar con el proveedor de respaldo: ${networkErr?.message || networkErr}`);
  }

  // If endpoint returns 400 because response_format is unsupported by that specific model, retry once without response_format
  if (res.status === 400) {
    delete requestBody.response_format;
    try {
      res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      });
    } catch (retryErr: any) {
      throw new Error(`Fallo al contactar al proveedor de respaldo: ${retryErr?.message || retryErr}`);
    }
  }

  if (!res.ok) {
    let errorDetail = '';
    try {
      const errJson = await res.json();
      errorDetail = errJson?.error?.message || JSON.stringify(errJson);
    } catch {
      errorDetail = await res.text().catch(() => '');
    }
    throw new Error(`Error ${res.status} del proveedor de respaldo (${model}): ${errorDetail.substring(0, 300)}`);
  }

  const data = await res.json();
  const rawContent = data?.choices?.[0]?.message?.content;

  if (!rawContent || !rawContent.trim()) {
    throw new Error('El proveedor de respaldo devolvió un contenido de examen vacío.');
  }

  return rawContent;
}

/**
 * Main entrance to execute exam generation via the fallback provider
 */
export async function executeFallbackGeneration(params: {
  apiKey?: string;
  systemPrompt: string;
  userPromptText: string;
  materials?: UploadedMaterial[];
}): Promise<string> {
  const apiKey = params.apiKey || getFallbackApiKey();
  if (!apiKey) {
    throw new Error('No hay ninguna clave VITE_FALLBACK_API_KEY configurada para el proveedor de respaldo.');
  }

  const config = resolveProviderConfig(apiKey);
  console.log(`[Fallback Provider] Conectando con proveedor de respaldo tipo "${config.type}" (${config.model})...`);

  if (config.type === 'gemini') {
    return await executeGeminiFallback(
      apiKey,
      config.model,
      params.systemPrompt,
      params.userPromptText,
      params.materials
    );
  }

  return await executeOpenAICompatibleFallback(
    apiKey,
    config.baseUrl,
    config.model,
    params.systemPrompt,
    params.userPromptText,
    params.materials
  );
}
