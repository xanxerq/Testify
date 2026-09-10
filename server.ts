import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const PORT = 3000;
const app = express();

// Enable large JSON payloads for images and PDFs (base64)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Supported modern Gemini model
const GEMINI_TEXT_MODEL = 'gemini-flash-latest';

function isHighDemandOrTransientError(error: any): boolean {
  if (!error) return false;
  const status = error?.status || error?.code || error?.error?.code || error?.error?.status;
  let raw = '';
  try {
    raw = typeof error === 'string' ? error : (error?.message || '');
    if (error?.error) {
      raw += ' ' + (typeof error.error === 'string' ? error.error : JSON.stringify(error.error));
    }
  } catch {}

  const message = (raw + ' ' + (error?.statusText || '')).toLowerCase();

  return (
    status === 503 ||
    status === '503' ||
    status === 'UNAVAILABLE' ||
    status === 429 ||
    status === '429' ||
    status === 'RESOURCE_EXHAUSTED' ||
    message.includes('503') ||
    message.includes('high demand') ||
    message.includes('unavailable') ||
    message.includes('overloaded') ||
    message.includes('spikes in demand') ||
    message.includes('temporary') ||
    message.includes('resource_exhausted') ||
    message.includes('rate limit') ||
    message.includes('quota')
  );
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function generateContentWithFallback(
  ai: GoogleGenAI,
  params: {
    contents: any;
    config: any;
    primaryModel?: string;
  }
) {
  const modelsToTry = [
    params.primaryModel || GEMINI_TEXT_MODEL,
    'gemini-flash-latest',
    'gemini-3.1-flash-lite',
    'gemini-3.8-flash',
  ].filter((model, idx, arr) => arr.indexOf(model) === idx);

  let lastError: any = null;

  for (let round = 1; round <= 2; round++) {
    for (let mIdx = 0; mIdx < modelsToTry.length; mIdx++) {
      const currentModel = modelsToTry[mIdx];

      try {
        console.log(`[Server Gemini] Llamando a modelo "${currentModel}" (ronda ${round})...`);
        const response = await ai.models.generateContent({
          model: currentModel,
          contents: params.contents,
          config: params.config,
        });

        if (response && response.text && response.text.trim()) {
          return response;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`[Server Gemini] Error en ${currentModel}:`, err?.message || err);

        if (isHighDemandOrTransientError(err)) {
          console.log(`[Server Gemini] Modelo "${currentModel}" saturado (503/429). Conmutando de inmediato a siguiente modelo...`);
          continue;
        } else {
          throw err;
        }
      }
    }

    if (round < 2) {
      await sleep(600);
    }
  }

  if (isHighDemandOrTransientError(lastError)) {
    throw new Error(
      'Los servidores de Google Gemini están experimentando una sobrecarga temporal de demanda (Error 503). Por favor, intenta de nuevo en unos momentos.'
    );
  }

  throw lastError || new Error('No se pudo obtener respuesta de la IA.');
}

async function callFallbackProviderServer(params: {
  apiKey: string;
  systemPrompt: string;
  userPromptText: string;
  materials?: any[];
}): Promise<string> {
  const apiKey = params.apiKey;
  const customBaseUrl = process.env.VITE_FALLBACK_BASE_URL || process.env.FALLBACK_BASE_URL;
  const customModel = process.env.VITE_FALLBACK_MODEL || process.env.FALLBACK_MODEL;

  if (apiKey.startsWith('AIza') && !customBaseUrl) {
    const ai = new GoogleGenAI({ apiKey });
    const res = await ai.models.generateContent({
      model: customModel || 'gemini-flash-latest',
      contents: [{ text: params.userPromptText }],
      config: {
        systemInstruction: params.systemPrompt,
        responseMimeType: 'application/json',
        temperature: 0.3,
      },
    });
    return res.text || '';
  }

  let baseUrl = customBaseUrl || 'https://api.openai.com/v1';
  let model = customModel || 'gpt-4o-mini';

  if (apiKey.startsWith('sk-or-')) {
    baseUrl = customBaseUrl || 'https://openrouter.ai/api/v1';
    model = customModel || 'openai/gpt-4o-mini';
  } else if (apiKey.startsWith('gsk_')) {
    baseUrl = customBaseUrl || 'https://api.groq.com/openai/v1';
    model = customModel || 'llama-3.3-70b-versatile';
  }

  const endpoint = `${baseUrl.replace(/\/+$/, '')}/chat/completions`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: params.systemPrompt },
        { role: 'user', content: params.userPromptText },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const errTxt = await response.text();
    throw new Error(`Fallback HTTP ${response.status}: ${errTxt.substring(0, 200)}`);
  }

  const data: any = await response.json();
  return data?.choices?.[0]?.message?.content || '';
}

// Lazy initialize Gemini client to avoid crashes if key is missing during build
let geminiClient: GoogleGenAI | null = null;
function getGemini(): GoogleGenAI {
  if (!geminiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('GEMINI_API_KEY is not defined in environment');
    }
    geminiClient = new GoogleGenAI({
      apiKey: apiKey || '',
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return geminiClient;
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
  });
});

// Verification codes cache (email -> { code, expiresAt, name })
const verificationCodesCache = new Map<string, { code: string; expiresAt: number; name?: string }>();

// Endpoint: Send 6-digit email verification code
app.post('/api/send-verification-code', (req, res) => {
  try {
    const { email, name } = req.body;
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ error: 'Correo electrónico no válido' });
    }

    const cleanEmail = email.trim().toLowerCase();
    // Generate 6-digit numeric code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes validity

    verificationCodesCache.set(cleanEmail, { code, expiresAt, name });
    console.log(`[VERIFICACIÓN] Código generado para ${cleanEmail}: ${code}`);

    return res.json({
      success: true,
      message: `Código de verificación enviado correctamente a ${cleanEmail}`,
      code, // Returned for instant testing/verification in preview
      expiresInSeconds: 900,
    });
  } catch (err: any) {
    console.error('Error sending verification code:', err);
    return res.status(500).json({ error: 'Error al enviar código de verificación' });
  }
});

// Endpoint: Validate verification code
app.post('/api/verify-code', (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ error: 'Email y código son obligatorios', valid: false });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cached = verificationCodesCache.get(cleanEmail);

    if (!cached) {
      return res.status(400).json({ error: 'No hay un código pendiente para este correo o ha caducado.', valid: false });
    }

    if (Date.now() > cached.expiresAt) {
      verificationCodesCache.delete(cleanEmail);
      return res.status(400).json({ error: 'El código ha caducado. Solicita uno nuevo.', valid: false });
    }

    if (cached.code !== code.toString().trim()) {
      return res.status(400).json({ error: 'El código introducido no es correcto.', valid: false });
    }

    // Code is valid
    verificationCodesCache.delete(cleanEmail);
    return res.json({ success: true, valid: true, message: 'Código verificado con éxito' });
  } catch (err: any) {
    console.error('Error verifying code:', err);
    return res.status(500).json({ error: 'Error al verificar el código', valid: false });
  }
});

// Endpoint: Generate Exam from syllabus materials (images, PDF, notes)
app.post('/api/generate-exam', async (req, res) => {
  try {
    const {
      subject,
      topic,
      level,
      difficulty,
      testCount = 5,
      openCount = 2,
      timeLimitMinutes = 20,
      materials = [], // array of { name, mimeType, base64Data }
      additionalNotes = '',
    } = req.body;

    if (!subject || !topic) {
      return res.status(400).json({ error: 'Materia y tema son obligatorios' });
    }

    const ai = getGemini();

    // Prepare multimodal parts
    const parts: any[] = [];

    // Add materials (Images and PDFs)
    if (Array.isArray(materials) && materials.length > 0) {
      for (const mat of materials) {
        if (mat.base64Data && mat.mimeType) {
          // Remove prefix if present (e.g. data:image/png;base64,)
          const cleanBase64 = mat.base64Data.replace(/^data:[^;]+;base64,/, '');
          parts.push({
            inlineData: {
              mimeType: mat.mimeType,
              data: cleanBase64,
            },
          });
        }
      }
    }

    const systemPrompt = `Eres un profesor experto y pedagogo de alto nivel encargado de diseñar exámenes formales y didácticos.
Tu objetivo es generar un examen riguroso, equilibrado y perfectamente adaptado al nivel educativo y al temario proporcionado por el alumno.
Idioma obligatorio: Español.

Parámetros del examen:
- Materia: "${subject}"
- Tema específico: "${topic}"
- Nivel educativo: "${level}"
- Dificultad: "${difficulty}"
- Cantidad de preguntas tipo test (opción múltiple): exactamente ${testCount}
- Cantidad de preguntas normales / abiertas (desarrollo / razonamiento): exactamente ${openCount}
${additionalNotes ? `- Indicaciones especiales del alumno: "${additionalNotes}"` : ''}

CRITERIOS FUNDAMENTALES:
1. Si se han adjuntado fotos o PDF de apuntes/temario, básate estricta y fielmente en los conceptos, fórmulas, hechos o definiciones que aparecen en ese material.
2. Cada pregunta tipo test debe tener exactamente 4 opciones de respuesta (índices 0, 1, 2, 3), sólo una correcta, distractores plausibles y pedagógicos, y una explicación clara de por qué la respuesta correcta lo es.
3. Cada pregunta abierta debe requerir análisis, explicación de conceptos o desarrollo según el nivel educativo indicado. Incluye una respuesta modelo esperada (sampleAnswer) y los criterios clave de evaluación (gradingCriteria) que el profesor buscará al calificar.
4. Asigna puntos equilibrados (por ejemplo, 1 punto por cada tipo test, 2 o 3 puntos por cada abierta).
5. Adapta la complejidad del vocabulario y rigor al nivel "${level}".`;

    const userPromptText = `Por favor, analiza el temario adjunto (fotos o PDF) y los parámetros para generar el examen completo en formato JSON con la siguiente estructura:
{
  "title": "Título descriptivo del examen",
  "overview": "Breve resumen pedagógico del temario evaluado en este examen (2-3 frases)",
  "suggestedTimeMinutes": ${timeLimitMinutes || 20},
  "questions": [
    {
      "id": "q1",
      "type": "multiple_choice",
      "questionText": "Enunciado de la pregunta tipo test",
      "points": 1,
      "options": [
        "Opción A",
        "Opción B",
        "Opción C",
        "Opción D"
      ],
      "correctOptionIndex": 0,
      "explanation": "Explicación detallada de por qué es la correcta y qué error cometen los distractores."
    },
    {
      "id": "q2",
      "type": "open",
      "questionText": "Enunciado de la pregunta de desarrollo",
      "points": 2,
      "sampleAnswer": "Respuesta modelo ideal completa y fundamentada.",
      "gradingCriteria": [
        "Menciona el concepto clave X",
        "Explica correctamente la relación con Y",
        "Utiliza la terminología adecuada"
      ],
      "hint": "Pista opcional orientativa para el estudiante si se queda bloqueado."
    }
  ]
}

Asegúrate de incluir exactamente ${testCount} preguntas de tipo "multiple_choice" y exactamente ${openCount} preguntas de tipo "open". Devuelve únicamente el objeto JSON válido.`;

    parts.push({ text: userPromptText });

    let responseText = '';
    try {
      const response = await generateContentWithFallback(ai, {
        primaryModel: GEMINI_TEXT_MODEL,
        contents: parts,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: 'application/json',
          temperature: 0.3,
          maxOutputTokens: 8192,
        },
      });
      responseText = response.text || '';
    } catch (primaryErr: any) {
      console.warn('[Server] Fallo en Gemini, verificando clave de respaldo...', primaryErr?.message);
      const fallbackKey = process.env.VITE_FALLBACK_API_KEY || process.env.FALLBACK_API_KEY;
      if (fallbackKey) {
        responseText = await callFallbackProviderServer({
          apiKey: fallbackKey,
          systemPrompt,
          userPromptText,
          materials,
        });
      } else {
        throw primaryErr;
      }
    }

    let examData;
    try {
      examData = JSON.parse(responseText);
    } catch (parseErr) {
      // Fallback: search for JSON substring
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        examData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('La IA no devolvió un formato JSON válido.');
      }
    }

    // Ensure IDs and calculated points
    let currentTotalPoints = 0;
    const questions = (examData.questions || []).map((q: any, idx: number) => {
      const qPoints = Number(q.points) || (q.type === 'open' ? 2 : 1);
      currentTotalPoints += qPoints;
      return {
        ...q,
        id: q.id || `q_${idx + 1}`,
        points: qPoints,
        type: q.type === 'open' ? 'open' : 'multiple_choice',
      };
    });

    const exam = {
      id: `exam_${Date.now()}`,
      title: examData.title || `Examen de ${subject}: ${topic}`,
      subject,
      topic,
      level,
      difficulty,
      createdAt: new Date().toISOString(),
      timeLimitMinutes: Number(examData.suggestedTimeMinutes) || timeLimitMinutes || 20,
      overview: examData.overview || `Examen generado sobre ${topic} (${subject}).`,
      questions,
      totalPoints: currentTotalPoints,
    };

    return res.json({ success: true, exam });
  } catch (err: any) {
    console.error('Error generating exam:', err);
    let errorMsg = err.message || 'Ocurrió un error inesperado al procesar el temario.';
    try {
      const parsed = JSON.parse(errorMsg);
      if (parsed?.error?.message) errorMsg = parsed.error.message;
    } catch {}
    if (isHighDemandOrTransientError(err)) {
      errorMsg = 'Los servidores de Google Gemini están experimentando una alta demanda momentánea (Error 503). Por favor, intenta de nuevo en unos momentos.';
    }
    return res.status(500).json({
      error: 'Error al generar el examen con IA',
      message: errorMsg,
    });
  }
});

// Endpoint: Grade an open answer with AI
app.post('/api/grade-open-answer', async (req, res) => {
  try {
    const {
      question, // { questionText, sampleAnswer, gradingCriteria, points }
      userAnswer,
      subject,
      topic,
      level,
    } = req.body;

    if (!question || !question.questionText) {
      return res.status(400).json({ error: 'Pregunta no especificada' });
    }

    const maxPoints = Number(question.points) || 2;
    const answerText = (userAnswer || '').toString().trim();

    if (!answerText) {
      return res.json({
        score: 0,
        maxScore: maxPoints,
        feedback: 'No se proporcionó ninguna respuesta para esta pregunta.',
        strengths: [],
        improvements: ['Escribe una respuesta desarrollada basándote en el temario.'],
      });
    }

    const ai = getGemini();

    const prompt = `Eres un docente universitario y calificador de exámenes calificado.
Evalúa de manera justa, constructiva y rigurosa la respuesta del estudiante a una pregunta de desarrollo.

Contexto educativo:
- Materia: "${subject || 'General'}"
- Tema: "${topic || 'General'}"
- Nivel del estudiante: "${level || 'Bachillerato'}"

Pregunta del examen:
"${question.questionText}"

Puntuación máxima posible: ${maxPoints} puntos.

Respuesta modelo esperada:
"${question.sampleAnswer || 'Sin respuesta modelo predefinida'}"

Criterios de evaluación requeridos:
${Array.isArray(question.gradingCriteria) ? question.gradingCriteria.map((c: string) => `- ${c}`).join('\n') : 'Claridad, rigor conceptual y completitud.'}

Respuesta redactada por el alumno:
"""
${answerText}
"""

Instrucciones de calificación:
1. Asigna una puntuación numérica justa entre 0.0 y ${maxPoints}.0 (puedes usar decimales con paso de 0.25 o 0.5).
2. Proporciona una retroalimentación detallada y empática en español que señale los aciertos y corrija los conceptos erróneos o incompletos.
3. Lista de puntos fuertes (strengths) encontrados en la respuesta del alumno.
4. Lista de aspectos a mejorar (improvements).

Devuelve EXCLUSIVAMENTE un JSON con esta estructura exacta:
{
  "score": 1.5,
  "feedback": "Texto de devolución pedagógica para el alumno",
  "strengths": ["Menciona el concepto clave...", "Buena redacción..."],
  "improvements": ["Faltó explicar la fase...", "Cuidado con confundir el término X con Y..."]
}`;

    const response = await generateContentWithFallback(ai, {
      primaryModel: GEMINI_TEXT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.2,
        maxOutputTokens: 2048,
      },
    });

    const responseText = response.text || '';
    let result;
    try {
      result = JSON.parse(responseText);
    } catch {
      const match = responseText.match(/\{[\s\S]*\}/);
      if (match) {
        result = JSON.parse(match[0]);
      } else {
        result = {
          score: Math.round(maxPoints * 0.5 * 10) / 10,
          feedback: 'Respuesta evaluada por la IA.',
          strengths: ['Respuesta enviada'],
          improvements: ['Revisar con la respuesta modelo.'],
        };
      }
    }

    // Clamp score
    let finalScore = Number(result.score);
    if (isNaN(finalScore) || finalScore < 0) finalScore = 0;
    if (finalScore > maxPoints) finalScore = maxPoints;

    return res.json({
      score: Math.round(finalScore * 10) / 10,
      maxScore: maxPoints,
      feedback: result.feedback || 'Evaluación completada.',
      strengths: Array.isArray(result.strengths) ? result.strengths : [],
      improvements: Array.isArray(result.improvements) ? result.improvements : [],
    });
  } catch (err: any) {
    console.error('Error grading open answer:', err);
    return res.status(500).json({
      error: 'Error al calificar la respuesta',
      message: err.message,
    });
  }
});

// Start server and attach Vite middleware in development
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Exam AI Server running on port ${PORT}`);
  });
}

startServer();
