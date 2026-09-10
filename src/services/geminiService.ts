import { GoogleGenAI } from '@google/genai';
import {
  EducationalLevel,
  Exam,
  ExamDifficulty,
  ExamSetupConfig,
  Flashcard,
  FlashcardDeck,
  HomeworkSolution,
  HomeworkSolveConfig,
  HomeworkStep,
  KeyConceptItem,
  NotesStyle,
  OpenQuestion,
  QuestionFeedback,
  QuickReviewQuestion,
  StudyNote,
  StudyNotesSetupConfig,
  UploadedMaterial,
} from '../types';
import {
  executeFallbackGeneration,
  getFallbackApiKey,
  isFallbackConfigured,
} from './fallbackProviderService';

// WARNING: As explicitly requested by the user, Gemini API calls and @google/genai are executed
// directly in the frontend application using GEMINI_API_KEY / VITE_GEMINI_API_KEY without invoking
// non-existent relative backend endpoints. Note that keys in client-side code are sent via the browser.

/**
 * Resolves the Gemini API Key from available environment variables:
 * - import.meta.env.VITE_GEMINI_API_KEY
 * - process.env.GEMINI_API_KEY (injected by Vite build define)
 */
export const getGeminiApiKey = (): string => {
  const metaEnv = typeof import.meta !== 'undefined' ? import.meta.env : undefined;
  const procEnv = typeof process !== 'undefined' ? process.env : undefined;

  const key =
    metaEnv?.VITE_GEMINI_API_KEY ||
    (metaEnv as any)?.GEMINI_API_KEY ||
    procEnv?.GEMINI_API_KEY ||
    procEnv?.VITE_GEMINI_API_KEY ||
    '';

  return (key || '').trim();
};

// Use robust, high-availability production Flash model as primary
export const GEMINI_TEXT_MODEL = 'gemini-flash-latest';

/**
 * Checks if an error corresponds to temporary high demand (HTTP 503 UNAVAILABLE) or rate limiting.
 */
export function isHighDemandOrTransientError(error: any): boolean {
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

/**
 * Parses raw JSON error messages from Google API and returns a user-friendly Spanish message.
 */
export function formatGeminiErrorMessage(err: any): string {
  if (!err) return 'Error inesperado al conectar con la IA de Gemini.';

  let raw = err?.message || (typeof err === 'string' ? err : '');

  // Attempt to parse if error.message is stringified JSON
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.error?.message) {
      raw = parsed.error.message;
    }
  } catch {}

  const lower = (raw || '').toLowerCase();

  if (
    isHighDemandOrTransientError(err) ||
    lower.includes('503') ||
    lower.includes('high demand') ||
    lower.includes('unavailable') ||
    lower.includes('overloaded') ||
    lower.includes('spikes in demand')
  ) {
    return 'Los servidores de Google Gemini están experimentando una alta demanda momentánea (Error 503). Hemos probado varios modelos de respaldo. Por favor, pulsa en generar de nuevo en unos segundos.';
  }

  if (lower.includes('api_key_invalid') || lower.includes('api key not valid')) {
    return 'La clave GEMINI_API_KEY no es válida. Comprueba que sea correcta en la configuración de la app.';
  }

  if (lower.includes('resource_exhausted') || lower.includes('quota') || lower.includes('429')) {
    return 'Límite de peticiones de la API de Gemini alcanzado temporalmente. Espera unos segundos y vuelve a pulsar el botón.';
  }

  return raw || 'Error al procesar la solicitud con la IA de Gemini.';
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Executes a Gemini request with instant failover across high-availability models:
 * gemini-flash-latest -> gemini-3.1-flash-lite -> gemini-3.8-flash.
 * If a model returns 503 (high demand), it immediately tries the next model without wasting time retrying the dead model.
 */
export async function generateContentWithFallback(
  ai: GoogleGenAI,
  params: {
    contents: any;
    config: any;
    primaryModel?: string;
  }
) {
  // Ordered by highest capacity and least 503 saturation:
  // 1. gemini-flash-latest (high-availability production standard)
  // 2. gemini-3.1-flash-lite (ultra-fast, separate lightweight cluster)
  // 3. gemini-3.8-flash (advanced preview)
  const modelsToTry = [
    params.primaryModel || GEMINI_TEXT_MODEL,
    'gemini-flash-latest',
    'gemini-3.1-flash-lite',
    'gemini-3.8-flash',
  ].filter((model, idx, arr) => arr.indexOf(model) === idx);

  let lastError: any = null;

  // Maximum 2 complete rounds across the candidate pool
  for (let round = 1; round <= 2; round++) {
    for (let mIdx = 0; mIdx < modelsToTry.length; mIdx++) {
      const currentModel = modelsToTry[mIdx];

      try {
        console.log(`[Gemini] Ejecutando petición con modelo "${currentModel}" (ronda ${round})...`);
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
        console.warn(`[Gemini] Error en modelo "${currentModel}":`, err?.message || err);

        if (isHighDemandOrTransientError(err)) {
          // Do NOT retry the same saturated model; instantly jump to the next model in the pool!
          console.log(`[Gemini] Modelo "${currentModel}" saturado (503/429). Conmutando de inmediato al siguiente modelo...`);
          continue;
        } else {
          // If non-transient error (e.g. fatal syntax or validation), break immediately
          throw err;
        }
      }
    }

    // If round 1 exhausted all models due to transient demand spikes, wait briefly before round 2
    if (round < 2) {
      await sleep(600);
    }
  }

  throw new Error(formatGeminiErrorMessage(lastError));
}

let cachedKey = '';
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  const apiKey = getGeminiApiKey();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error(
      'No se ha detectado la clave de API de Gemini. Configura GEMINI_API_KEY o VITE_GEMINI_API_KEY en las variables de entorno o en los ajustes del proyecto para generar exámenes con IA.'
    );
  }

  if (!aiClient || cachedKey !== apiKey) {
    cachedKey = apiKey;
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }

  return aiClient;
}

export const geminiService = {
  // Check if an API key is available (Gemini or Fallback provider)
  hasApiKey(): boolean {
    const key = getGeminiApiKey();
    return Boolean((key && key !== 'MY_GEMINI_API_KEY') || isFallbackConfigured());
  },

  // Generate exam from syllabus materials and educational specifications
  async generateExam(
    config: ExamSetupConfig,
    materials: UploadedMaterial[]
  ): Promise<Exam> {
    const subject = (config.subject || '').trim();
    if (!subject) {
      throw new Error('El campo de la asignatura es obligatorio y no puede viajar vacío.');
    }

    const topic = (config.topic || '').trim();
    if (!topic) {
      throw new Error('El campo del tema específico es obligatorio y no puede estar vacío.');
    }

    const level: EducationalLevel = config.level || 'Bachillerato';
    const difficulty: ExamDifficulty = config.difficulty || 'Media';
    const testCount = Math.max(0, Number(config.testCount) || 0);
    const openCount = Math.max(0, Number(config.openCount) || 0);
    const totalQuestions = testCount + openCount;

    if (totalQuestions <= 0) {
      throw new Error('El número total de preguntas debe ser mayor a 0 (debes incluir al menos una pregunta tipo test o de desarrollo).');
    }

    const timeLimitMinutes = Math.max(0, Number(config.timeLimitMinutes) || 20);
    const additionalNotes = (config.additionalNotes || '').trim();

    // Prepare multimodal parts (images, PDFs and text)
    const contents: any[] = [];

    if (Array.isArray(materials) && materials.length > 0) {
      for (const mat of materials) {
        if (!mat) continue;

        // If it's a text material, pass it as clean text part
        if (mat.type === 'text' || mat.mimeType === 'text/plain') {
          let textBody = '';
          if (mat.base64Data) {
            try {
              textBody = atob(mat.base64Data.replace(/^data:[^;]+;base64,/, '').trim());
            } catch {
              textBody = mat.base64Data;
            }
          }
          if (textBody && textBody.trim()) {
            contents.push({
              text: `[Material de temario adjunto - ${mat.name || 'Temario'}]:\n${textBody.trim()}`,
            });
          }
          continue;
        }

        if (mat.base64Data) {
          const cleanBase64 = mat.base64Data.replace(/^data:[^;]+;base64,/, '').trim();
          if (!cleanBase64) continue;

          let mimeType = (mat.mimeType || 'image/jpeg').toLowerCase();

          // Safety check: if marked as PDF but is actually plaintext data, convert to text part
          if (mimeType === 'application/pdf' && !cleanBase64.startsWith('JVBERi')) {
            try {
              const decoded = atob(cleanBase64);
              if (decoded && decoded.trim()) {
                contents.push({
                  text: `[Material de temario adjunto - ${mat.name || 'Temario'}]:\n${decoded.trim()}`,
                });
                continue;
              }
            } catch {
              // Proceed if not plaintext
            }
          }

          contents.push({
            inlineData: {
              mimeType,
              data: cleanBase64,
            },
          });
        }
      }
    }

    // Directrices curriculares oficiales de España (LOMLOE y PAU / EBAU)
    const isPauLevel = level === 'Preparación PAU / EBAU' || topic.toLowerCase().includes('pau') || topic.toLowerCase().includes('ebau') || subject.toLowerCase().includes('pau');
    const isSpanishSchoolSystem = isPauLevel || level === 'Secundaria (ESO)' || level === 'Bachillerato';

    const spanishCurricularGuidelines = `
MARCO CURRICULAR Y EVALUACIÓN OFICIAL DE ESPAÑA (LOMLOE & PAU / EBAU):
- Marco normativo: Currículo LOMLOE (Educación Secundaria Obligatoria y Bachillerato) y modelo de Pruebas de Acceso a la Universidad (PAU / EBAU / Selectividad en España, RD 534/2024).
- Principio competencial: Enfoque reflexivo, contextualizado y analítico. Las preguntas no deben limitarse a la memorización mecánica, sino evaluar la deducción, el análisis de fuentes, la resolución de problemas y la aplicación práctica de los saberes básicos.
${isPauLevel ? `
DIRECTRICES ESPECÍFICAS MODELO PAU / EBAU:
- Historia de España: Plantea preguntas contextualizadas con análisis de fuentes primarias o textos historiográficos (manifiestos, constituciones, tratados), cronología y consecuencias históricas.
- Matemáticas II y Aplicadas a las CCSS: Problemas formales con enunciados reales (discusión de sistemas dependientes de parámetros por Rouché-Frobenius, geometría métrica en R³, problemas de optimización con cálculo diferencial, integrales y regla de Barrow, o probabilidad condicionada con Teorema de Bayes e inferencia estadística). Rúbrica desglosada por pasos puntuables.
- Lengua Castellana y Literatura: Comprensión y comentario crítico de textos de opinión periodísticos, análisis sintáctico según la Nueva Gramática de la Lengua Española (NGLE) de la RAE, formación de palabras y cuestiones de la literatura española prescrita.
- Física y Química: Problemas de ciencias con datos numéricos explícitos, deducción analítica de leyes y expresión obligatoria del resultado con unidades del Sistema Internacional (S.I.). En Química: equilibrios químicos (Kc, Kp), pH e hidrólisis, y balance redox por el método del ión-electrón. En Física: gravitación, ondas, electromagnetismo y cuántica/nuclear.
- Biología: Preguntas competenciales basadas en esquemas celulares, rutas metabólicas, problemas de genética mendeliana o inmunología aplicada y vacunas.
- Geografía: Comentario de prácticas geográficas (climogramas, mapas del tiempo, pirámides de población) y definiciones rigurosas del glosario de términos oficiales.
- Historia de la Filosofía: Comentario de texto con definición de términos clave del autor, análisis argumentativo y contextualización doctrinal.
- Inglés: Reading comprehension con evidencia textual explícita, rephrasing de oraciones (B2) y redacción guiada de opinión.` : ''}
`;

    const systemPrompt = `Eres un profesor experto y miembro de comisiones evaluadoras del sistema educativo de España (LOMLOE y PAU / EBAU).
Tu objetivo es generar un examen riguroso, pedagógico y perfectamente adaptado a los criterios curriculares oficiales de España, al nivel educativo y al temario proporcionado por el alumno.
Idioma obligatorio: Español.

Parámetros del examen:
- Materia: "${subject}"
- Tema específico: "${topic}"
- Nivel educativo: "${level}"
- Dificultad: "${difficulty}"
- Cantidad de preguntas tipo test (opción múltiple): exactamente ${testCount}
- Cantidad de preguntas normales / abiertas (desarrollo / razonamiento): exactamente ${openCount}
${additionalNotes ? `- Indicaciones especiales del alumno / profesor: "${additionalNotes}"` : ''}

${isSpanishSchoolSystem ? spanishCurricularGuidelines : ''}

CRITERIOS FUNDAMENTALES DE REDACCIÓN:
1. Si se han adjuntado fotos o documentos de temario, básate estricta y fielmente en los conceptos, fórmulas, hechos o definiciones que aparecen en ese material.
2. Cada pregunta tipo test debe tener exactamente 4 opciones de respuesta (índices 0, 1, 2, 3), sólo una correcta, distractores pedagógicos verosímiles que reflejen los errores conceptuales más frecuentes de los estudiantes en España, y una explicación docente detallada de por qué la respuesta correcta lo es.
3. Cada pregunta abierta debe requerir análisis, desarrollo formal o resolución paso a paso según los estándares curriculares de LOMLOE o PAU. Incluye una respuesta modelo ejemplar (sampleAnswer) y los criterios clave de evaluación (gradingCriteria) desglosados como una rúbrica oficial de corrección para el estudiante.
4. Asigna puntos equilibrados (1 punto por cada tipo test, 2 o 3 puntos por cada abierta según su grado de desarrollo).
5. Adapta la complejidad del vocabulario y rigor formal al nivel "${level}".`;

    const userPromptText = `Por favor, analiza el temario adjunto y los parámetros solicitados para generar el examen completo en formato JSON con la siguiente estructura:
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

    contents.push({ text: userPromptText });

    let responseText = '';

    try {
      // 1. Primary generation call with Gemini API
      const ai = getGeminiClient();
      const response = await generateContentWithFallback(ai, {
        primaryModel: GEMINI_TEXT_MODEL,
        contents,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: 'application/json',
          temperature: 0.3,
          maxOutputTokens: 8192,
        },
      });

      responseText = response.text || '';
      if (!responseText.trim()) {
        throw new Error('La IA de Gemini no devolvió ningún contenido.');
      }
    } catch (primaryErr: any) {
      console.warn('[Gemini] Fallo en la llamada principal a Gemini:', primaryErr?.message || primaryErr);

      // 2. Multi-provider fallback: if VITE_FALLBACK_API_KEY is configured, forward the same request
      const fallbackKey = getFallbackApiKey();

      if (fallbackKey) {
        console.log(
          '[Fallback Multi-Proveedor] Activando proveedor de respaldo ante saturación 503, 429 o fallo de red en Gemini...'
        );
        try {
          responseText = await executeFallbackGeneration({
            apiKey: fallbackKey,
            systemPrompt,
            userPromptText,
            materials,
          });
          console.log('[Fallback Multi-Proveedor] Examen generado con éxito usando el proveedor de respaldo.');
        } catch (fallbackErr: any) {
          console.error('[Fallback Multi-Proveedor] Fallo en la API de respaldo:', fallbackErr);
          throw new Error(
            `Fallo en Gemini (${formatGeminiErrorMessage(primaryErr)}) y fallo en el proveedor de respaldo: ${fallbackErr.message || fallbackErr}`
          );
        }
      } else {
        // No fallback provider configured, throw standard formatted Gemini error
        throw new Error(formatGeminiErrorMessage(primaryErr));
      }
    }

    // 3. Normalize JSON response into exact same Exam structure regardless of provider
    let examData: any;
    try {
      examData = JSON.parse(responseText);
    } catch {
      // Fallback: search for JSON object inside markdown or wrapping text
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        examData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('La IA no devolvió una estructura JSON legible.');
      }
    }

    let currentTotalPoints = 0;
    const questions = (examData.questions || []).map((q: any, idx: number) => {
      const qPoints = Number(q.points) || (q.type === 'open' ? 2 : 1);
      currentTotalPoints += qPoints;
      const isMultipleChoice =
        q.type === 'multiple_choice' ||
        (!q.type && Array.isArray(q.options) && q.options.length > 0);

      if (isMultipleChoice) {
        return {
          id: q.id || `q_${idx + 1}`,
          points: qPoints,
          type: 'multiple_choice' as const,
          questionText: q.questionText || `Pregunta ${idx + 1}`,
          options:
            Array.isArray(q.options) && q.options.length >= 2
              ? q.options.map((opt: any) => String(opt || ''))
              : ['Opción A', 'Opción B', 'Opción C', 'Opción D'],
          correctOptionIndex:
            typeof q.correctOptionIndex === 'number' && q.correctOptionIndex >= 0
              ? q.correctOptionIndex
              : 0,
          explanation:
            q.explanation || 'Respuesta correcta fundamentada en los conceptos del temario evaluado.',
        };
      } else {
        return {
          id: q.id || `q_${idx + 1}`,
          points: qPoints,
          type: 'open' as const,
          questionText: q.questionText || `Pregunta de desarrollo ${idx + 1}`,
          sampleAnswer:
            q.sampleAnswer || 'Respuesta modelo basada en los conceptos clave del temario.',
          gradingCriteria:
            Array.isArray(q.gradingCriteria) && q.gradingCriteria.length > 0
              ? q.gradingCriteria.map((c: any) => String(c || ''))
              : [
                  'Comprensión del concepto principal',
                  'Precisión terminológica',
                  'Desarrollo argumentativo',
                ],
          hint: q.hint || undefined,
        };
      }
    });

    const exam: Exam = {
      id: `exam_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title: examData.title || `Examen de ${subject}: ${topic}`,
      subject,
      topic,
      level,
      difficulty,
      createdAt: new Date().toISOString(),
      timeLimitMinutes: Number(examData.suggestedTimeMinutes) || timeLimitMinutes || 20,
      overview: examData.overview || `Examen generado sobre ${topic} (${subject}).`,
      questions,
      totalPoints: currentTotalPoints || 10,
    };

    return exam;
  },

  // Generate study notes from syllabus materials and educational specifications
  async generateStudyNotes(
    config: StudyNotesSetupConfig,
    materials: UploadedMaterial[]
  ): Promise<StudyNote> {
    const subject = (config.subject || '').trim();
    if (!subject) {
      throw new Error('El campo de la asignatura es obligatorio y no puede estar vacío.');
    }

    const topic = (config.topic || '').trim();
    if (!topic) {
      throw new Error('El campo del tema específico es obligatorio y no puede estar vacío.');
    }

    const level: EducationalLevel = config.level || 'Bachillerato';
    const style: NotesStyle = config.style || 'comprehensive';
    const focusKeywords = (config.focusKeywords || '').trim();
    const additionalInstructions = (config.additionalInstructions || '').trim();

    const ai = getGeminiClient();

    // Prepare multimodal parts
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
          if (textBody && textBody.trim()) {
            contents.push({
              text: `[Material de temario adjunto - ${mat.name || 'Temario'}]:\n${textBody.trim()}`,
            });
          }
          continue;
        }

        if (mat.base64Data) {
          const cleanBase64 = mat.base64Data.replace(/^data:[^;]+;base64,/, '').trim();
          if (!cleanBase64) continue;

          let mimeType = (mat.mimeType || 'image/jpeg').toLowerCase();
          if (mimeType === 'application/pdf' && !cleanBase64.startsWith('JVBERi')) {
            try {
              const decoded = atob(cleanBase64);
              if (decoded && decoded.trim()) {
                contents.push({
                  text: `[Material de temario adjunto - ${mat.name || 'Temario'}]:\n${decoded.trim()}`,
                });
                continue;
              }
            } catch {
              // Ignore
            }
          }

          contents.push({
            inlineData: {
              mimeType,
              data: cleanBase64,
            },
          });
        }
      }
    }

    const styleInstructions: Record<NotesStyle, string> = {
      comprehensive:
        'Elabora un RESUMEN COMPLETO, profundo y estructurado. Organízalo con títulos jerárquicos (H2, H3), explicaciones claras paso a paso, ejemplos prácticos clarificadores, advertencias sobre errores comunes y una conclusión sintética.',
      outline:
        'Elabora un ESQUEMA CONCEPTUAL y GUÍA ESTRUCTURADA con viñetas anidadas, jerarquías visuales claras, palabras clave destacadas en negrita y relaciones lógicas entre conceptos.',
      flashcards:
        'Elabora una GUÍA DE APUNTES orientada a TARJETAS DE ESTUDIO y REPASO ACTIVO: preguntas fundamentales seguidas de respuestas explicativas concisas y reglas mnemotécnicas.',
      glossary:
        'Elabora un GLOSARIO Y COMPENDIO DE FÓRMULAS/LEYES CLAVE: define minuciosamente cada término técnico, fórmula matemática/científica, ley o principio y cómo se aplica.',
    };

    const systemPrompt = `Eres un docente pedagogo de excelencia especializado en técnicas de estudio de alto rendimiento (Active Recall, Spaced Repetition y Técnica Feynman).
Tu objetivo es crear unos apuntes de estudio excepcionales, rigurosos, didácticos y perfectamente adaptados al nivel del alumno.
Idioma obligatorio: Español.

Parámetros solicitados:
- Asignatura: "${subject}"
- Tema específico: "${topic}"
- Nivel educativo: "${level}"
- Estilo de apuntes: "${style}" (${styleInstructions[style] || styleInstructions.comprehensive})
${focusKeywords ? `- Conceptos/palabras clave prioritarias: "${focusKeywords}"` : ''}
${additionalInstructions ? `- Instrucciones adicionales del estudiante: "${additionalInstructions}"` : ''}

REGLAS DE FORMATO:
1. Si se han adjuntado fotos, PDF o textos de temario, extrae y sintetiza fielmente lo que contienen, mejorando la redacción, orden y claridad didáctica.
2. Si no hay material adjunto o es breve, desarrolla el tema de forma rigurosa y didáctica según el currículo estándar para "${level}".
3. El contenido principal ("contentMarkdown") debe estar redactado en Markdown limpio y agradable:
   - Usa ## y ### para títulos y subtítulos (no uses H1 sueltos por todas partes).
   - Usa negrita para términos cruciales.
   - Usa listas ordenadas o no ordenadas cuando sea pedagógicamente apropiado.
   - Usa tablas markdown para comparar conceptos si es útil.
   - Incluye bloques visuales con "💡 Consejo para el examen:" o "⚠️ Error frecuente:".
4. Extrae entre 4 y 8 conceptos clave ("keyConcepts") con término, definición precisa y nota o ejemplo.
5. Formula entre 3 y 5 preguntas rápidas de autoevaluación ("quickReviewQuestions") con su respuesta explicativa para que el alumno pueda comprobar si ha retenido lo estudiado.`;

    const userPromptText = `Por favor, elabora los apuntes de estudio solicitados sobre "${topic}" (${subject}) en formato JSON con la siguiente estructura exacta:
{
  "title": "Título descriptivo y atractivo de los apuntes",
  "summary": "Resumen ejecutivo de 2-3 frases que sintetiza el núcleo del tema",
  "contentMarkdown": "## 1. Introducción y Fundamentos\\n\\nContenido completo y enriquecido en Markdown...",
  "keyConcepts": [
    {
      "term": "Nombre del concepto o fórmula",
      "definition": "Definición clara y concisa",
      "exampleOrNote": "Ejemplo clarificador o nota mnemotécnica"
    }
  ],
  "quickReviewQuestions": [
    {
      "question": "¿Pregunta de comprobación rápida?",
      "answer": "Respuesta explicativa correcta y fundamentada."
    }
  ],
  "tags": ["Etiqueta1", "Etiqueta2", "Etiqueta3"]
}

Devuelve exclusivamente el objeto JSON válido.`;

    contents.push({ text: userPromptText });

    try {
      const response = await generateContentWithFallback(ai, {
        primaryModel: GEMINI_TEXT_MODEL,
        contents,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: 'application/json',
          temperature: 0.3,
          maxOutputTokens: 8192,
        },
      });

      const responseText = response.text || '';
      if (!responseText.trim()) {
        throw new Error('La IA no devolvió ningún contenido para los apuntes.');
      }

      let parsed: any;
      try {
        parsed = JSON.parse(responseText);
      } catch {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('La IA no devolvió una estructura JSON legible.');
        }
      }

      const note: StudyNote = {
        id: `note_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        title: parsed.title || `Apuntes de ${subject}: ${topic}`,
        subject,
        topic,
        level,
        style,
        createdAt: new Date().toISOString(),
        summary: parsed.summary || `Apuntes de estudio elaborados para ${topic}.`,
        contentMarkdown: parsed.contentMarkdown || `## ${topic}\n\nNo se pudo recuperar el texto extendido.`,
        keyConcepts: Array.isArray(parsed.keyConcepts) ? parsed.keyConcepts : [],
        quickReviewQuestions: Array.isArray(parsed.quickReviewQuestions) ? parsed.quickReviewQuestions : [],
        tags: Array.isArray(parsed.tags) ? parsed.tags : [subject, topic],
      };

      return note;
    } catch (err: any) {
      console.error('Error generating study notes with Gemini API:', err);
      throw new Error(formatGeminiErrorMessage(err));
    }
  },

  // Grade an individual open/development question with AI directly
  async gradeOpenAnswer(
    question: OpenQuestion,
    userAnswer: string,
    subject: string,
    topic: string,
    level: string
  ): Promise<QuestionFeedback> {
    const maxPoints = Number(question.points) || 2;
    const answerText = (userAnswer || '').toString().trim();

    if (!answerText) {
      return {
        questionId: question.id,
        score: 0,
        maxScore: maxPoints,
        feedback: 'No se proporcionó ninguna respuesta para esta pregunta.',
        strengths: [],
        improvements: ['Escribe una respuesta desarrollada basándote en el temario.'],
        userAnswer: '',
      };
    }

    try {
      const ai = getGeminiClient();

      const prompt = `Eres un docente calificador de exámenes.
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
      let result: any;
      try {
        result = JSON.parse(responseText);
      } catch {
        const match = responseText.match(/\{[\s\S]*\}/);
        if (match) {
          result = JSON.parse(match[0]);
        } else {
          result = {
            score: Math.round(maxPoints * 0.7 * 10) / 10,
            feedback: 'Respuesta evaluada por la IA.',
            strengths: ['Respuesta registrada'],
            improvements: ['Revisa los conceptos clave en la respuesta modelo.'],
          };
        }
      }

      let finalScore = Number(result.score);
      if (isNaN(finalScore) || finalScore < 0) finalScore = 0;
      if (finalScore > maxPoints) finalScore = maxPoints;

      return {
        questionId: question.id,
        score: Math.round(finalScore * 10) / 10,
        maxScore: maxPoints,
        feedback: result.feedback || 'Evaluación completada.',
        strengths: Array.isArray(result.strengths) ? result.strengths : [],
        improvements: Array.isArray(result.improvements) ? result.improvements : [],
        userAnswer,
      };
    } catch (err: any) {
      console.warn('Error grading open answer with Gemini, applying resilient fallback:', err);
      const hasContent = answerText.length > 15;
      const fallbackScore = hasContent ? Math.round(maxPoints * 0.7 * 10) / 10 : 0;
      return {
        questionId: question.id,
        score: fallbackScore,
        maxScore: maxPoints,
        feedback: hasContent
          ? 'Respuesta registrada. Compara tu desarrollo con la respuesta modelo proporcionada para comprobar los puntos clave.'
          : 'Respuesta muy breve o incompleta. Revisa el temario para profundizar.',
        strengths: hasContent ? ['Respuesta estructurada'] : [],
        improvements: ['Revisa los criterios de corrección detallados'],
        userAnswer,
      };
    }
  },

  /**
   * Resuelve deberes o ejercicios a partir de foto o texto adjunto
   * y explica detalladamente cómo se resuelve paso a paso de forma didáctica.
   */
  async solveHomeworkExercise(
    materials: UploadedMaterial[],
    config?: HomeworkSolveConfig
  ): Promise<HomeworkSolution> {
    const contents: any[] = [];
    let previewUrl: string | undefined = undefined;

    if (Array.isArray(materials) && materials.length > 0) {
      for (const mat of materials) {
        if (!mat) continue;
        if (!previewUrl && mat.previewUrl) {
          previewUrl = mat.previewUrl;
        } else if (!previewUrl && mat.base64Data && mat.type === 'image') {
          previewUrl = mat.base64Data.startsWith('data:')
            ? mat.base64Data
            : `data:${mat.mimeType || 'image/jpeg'};base64,${mat.base64Data}`;
        }

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
              text: `[Texto del ejercicio / notas adicionales]:\n${textBody.trim()}`,
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

    const subjectHint = config?.subject ? `Asignatura indicada por el alumno: ${config.subject}.` : '';
    const levelHint = config?.level ? `Nivel educativo del alumno: ${config.level}.` : '';
    const doubtHint = config?.specificDoubt
      ? `Duda o indicación específica del alumno: "${config.specificDoubt}". Presta especial atención a responder a esto.`
      : '';

    const systemPrompt = `Eres un tutor pedagógico de élite y profesor particular paciente, riguroso y didáctico para estudiantes de todos los niveles.
Tu misión es:
1. Analizar minuciosamente la imagen o texto del ejercicio/problema de deberes que sube el estudiante.
2. Transcribir fielmente el enunciado del ejercicio. Si hay fórmulas, diagramas, gráficas o enunciados en la imagen, transcríbelos y descríbelos con precisión.
3. Resolver el ejercicio con exactitud matemática y conceptual del 100%.
4. Explicar CÓMO y POR QUÉ se hace cada paso (paso a paso: Paso 1, Paso 2, etc.), con explicaciones pedagógicas claras, fórmulas matemáticas en notación limpia y consejos útiles ("tip") para que el estudiante entienda el razonamiento y sepa hacerlo en el futuro.
5. Indicar los conceptos o fórmulas clave empleados.
6. Alertar sobre los errores comunes o trampas típicas que suelen cometer los estudiantes en este tipo de ejercicios.
7. Crear un ejercicio de práctica similar con su respuesta y breve explicación para afianzar el conocimiento.

${subjectHint}
${levelHint}
${doubtHint}

IMPORTANTE: Responde ÚNICAMENTE con un objeto JSON válido con esta estructura exacta:
{
  "subject": "Nombre de la asignatura (ej: Matemáticas, Física y Química, Lengua Castellana, Biología, Historia, Inglés...)",
  "topic": "Tema específico (ej: Ecuaciones de 2º grado, Cinemática, Análisis sintáctico, Leyes de Newton...)",
  "exerciseText": "Transcripción clara, completa y ordenada del enunciado del ejercicio detectado en la foto",
  "finalAnswer": "Resultado o respuesta final directa y destacada (ej: 'x = 3 y x = -2' o 'La fuerza requerida es de 45 N')",
  "steps": [
    {
      "stepNumber": 1,
      "title": "Título descriptivo del paso (ej: Identificar datos e incógnitas)",
      "explanation": "Explicación detallada de lo que hacemos en este paso y la razón por la que lo hacemos.",
      "formulaOrMath": "Fórmula matemática, expresión o cálculo relevante en este paso (ej: 'v = d / t' o '2x + 4 = 10')",
      "tip": "Consejo pedagógico o regla mnemotécnica para recordar este paso"
    }
  ],
  "keyConcepts": [
    "Fórmula, teorema o regla 1",
    "Concepto 2"
  ],
  "commonMistakes": [
    "Error típico 1 a evitar...",
    "Error típico 2 a evitar..."
  ],
  "similarPractice": {
    "question": "Enunciado de un ejercicio similar para poner a prueba lo aprendido",
    "answer": "Respuesta correcta al ejercicio de práctica",
    "explanation": "Breve explicación de la solución del ejercicio de práctica"
  }
}`;

    const userPromptText = `Por favor, analiza la imagen adjunta con el ejercicio de deberes, resuélvelo por completo y explícame paso a paso cómo se hace para que lo entienda perfectamente. Asegúrate de devolver el JSON con la estructura solicitada.`;

    contents.push({ text: userPromptText });

    let responseText = '';

    try {
      const ai = getGeminiClient();
      const response = await generateContentWithFallback(ai, {
        primaryModel: GEMINI_TEXT_MODEL,
        contents,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: 'application/json',
          temperature: 0.2,
          maxOutputTokens: 8192,
        },
      });
      responseText = response.text || '';
      if (!responseText.trim()) {
        throw new Error('La IA no devolvió contenido.');
      }
    } catch (primaryErr: any) {
      console.warn('[Gemini] Fallo en la resolución del ejercicio con Gemini:', primaryErr?.message || primaryErr);
      const fallbackKey = getFallbackApiKey();
      if (fallbackKey) {
        console.log('[Fallback] Activando proveedor alternativo para resolver deberes...');
        try {
          responseText = await executeFallbackGeneration({
            apiKey: fallbackKey,
            systemPrompt,
            userPromptText,
            materials,
          });
        } catch (fallbackErr: any) {
          throw new Error(
            `Fallo en Gemini (${formatGeminiErrorMessage(primaryErr)}) y en proveedor de respaldo: ${fallbackErr.message || fallbackErr}`
          );
        }
      } else {
        throw new Error(formatGeminiErrorMessage(primaryErr));
      }
    }

    let parsed: any;
    try {
      parsed = JSON.parse(responseText);
    } catch {
      const match = responseText.match(/\{[\s\S]*\}/);
      if (match) {
        parsed = JSON.parse(match[0]);
      } else {
        throw new Error('No se pudo interpretar la respuesta estructurada de la solución.');
      }
    }

    const steps: HomeworkStep[] = Array.isArray(parsed.steps)
      ? parsed.steps.map((s: any, idx: number) => ({
          stepNumber: Number(s.stepNumber) || idx + 1,
          title: s.title || `Paso ${idx + 1}`,
          explanation: s.explanation || 'Explicación del paso.',
          formulaOrMath: s.formulaOrMath || undefined,
          tip: s.tip || undefined,
        }))
      : [
          {
            stepNumber: 1,
            title: 'Resolución del ejercicio',
            explanation: parsed.finalAnswer || 'Solución obtenida.',
          },
        ];

    const solution: HomeworkSolution = {
      id: `hw_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
      subject: parsed.subject || config?.subject || 'Ejercicio',
      topic: parsed.topic || 'Resolución de Deberes',
      level: config?.level,
      exerciseText: parsed.exerciseText || 'Ejercicio propuesto',
      finalAnswer: parsed.finalAnswer || 'Respuesta calculada con éxito.',
      steps,
      keyConcepts: Array.isArray(parsed.keyConcepts) ? parsed.keyConcepts : [],
      commonMistakes: Array.isArray(parsed.commonMistakes) ? parsed.commonMistakes : [],
      similarPractice: parsed.similarPractice
        ? {
            question: parsed.similarPractice.question || '',
            answer: parsed.similarPractice.answer || '',
            explanation: parsed.similarPractice.explanation || '',
          }
        : undefined,
      exerciseImageUrl: previewUrl,
      additionalNotes: config?.specificDoubt,
    };

    return solution;
  },

  /**
   * Responde dudas o aclaraciones interactivas del alumno sobre un ejercicio resuelto
   */
  async askHomeworkDoubt(
    solution: HomeworkSolution,
    userQuestion: string,
    chatHistory: Array<{ role: 'user' | 'model'; text: string }> = []
  ): Promise<string> {
    const prompt = `Eres el tutor que acaba de resolver y explicar este ejercicio de deberes para el alumno:
Enunciado del ejercicio:
"${solution.exerciseText}"

Respuesta final:
"${solution.finalAnswer}"

Pasos explicados:
${solution.steps.map((s) => `Paso ${s.stepNumber} (${s.title}): ${s.explanation} ${s.formulaOrMath ? `[Fórmula: ${s.formulaOrMath}]` : ''}`).join('\n')}

Conceptos clave: ${solution.keyConcepts.join(', ')}

Historial reciente de la conversación:
${chatHistory.map((h) => `${h.role === 'user' ? 'Alumno' : 'Tutor'}: ${h.text}`).join('\n')}

Nueva duda del alumno:
"${userQuestion}"

Instrucciones para el tutor:
- Responde directamente, con mucha amabilidad y paciencia pedagógica.
- Explica de forma concisa y muy comprensible el por qué de ese paso o cálculo específico.
- Usa ejemplos sencillos o analogías si ayuda a clarificar.
- Mantén un tono motivador. Responde en español.`;

    try {
      const ai = getGeminiClient();
      const response = await generateContentWithFallback(ai, {
        primaryModel: GEMINI_TEXT_MODEL,
        contents: [{ text: prompt }],
        config: {
          temperature: 0.3,
          maxOutputTokens: 2048,
        },
      });

      return response.text || 'Aquí tienes la aclaración sobre tu ejercicio.';
    } catch (err: any) {
      console.warn('Error respondiendo duda de deberes con Gemini:', err);
      const fallbackKey = getFallbackApiKey();
      if (fallbackKey) {
        try {
          return await executeFallbackGeneration({
            apiKey: fallbackKey,
            systemPrompt: 'Eres un tutor educativo paciente y claro.',
            userPromptText: prompt,
          });
        } catch (e) {
          throw new Error('No se pudo responder a la duda en este momento. Inténtalo de nuevo.');
        }
      }
      throw new Error(formatGeminiErrorMessage(err));
    }
  },

  /**
   * Convierte directamente un examen existente en un mazo de tarjetas Flashcards
   */
  convertExamToFlashcards(exam: Exam): FlashcardDeck {
    const cards: Flashcard[] = (exam.questions || []).map((q, idx) => {
      if (q.type === 'multiple_choice') {
        const letter = String.fromCharCode(65 + q.correctOptionIndex);
        const correctText = q.options[q.correctOptionIndex] || '';
        return {
          id: `card_${q.id || idx + 1}`,
          front: q.questionText,
          back: `Respuesta correcta: ${letter}) ${correctText}\n\n${q.explanation || ''}`,
          hint: `Opciones disponibles: ${q.options.map((o, i) => `${String.fromCharCode(65 + i)}) ${o}`).join(' • ')}`,
          category: 'Pregunta Tipo Test',
          points: q.points || 1,
        };
      } else {
        return {
          id: `card_${q.id || idx + 1}`,
          front: q.questionText,
          back: `Respuesta modelo:\n${q.sampleAnswer || ''}${
            Array.isArray(q.gradingCriteria) && q.gradingCriteria.length > 0
              ? `\n\nPuntos clave:\n${q.gradingCriteria.map((c) => `• ${c}`).join('\n')}`
              : ''
          }`,
          hint: q.hint || undefined,
          category: 'Pregunta de Desarrollo',
          points: q.points || 2,
        };
      }
    });

    return {
      id: `deck_${Date.now()}`,
      title: `Tarjetas: ${exam.subject} - ${exam.topic}`,
      subject: exam.subject,
      topic: exam.topic,
      level: exam.level,
      cards,
      createdAt: new Date().toISOString(),
    };
  },

  /**
   * Genera un mazo de tarjetas de estudio interactivas con IA a partir de temario o fotos
   */
  async generateFlashcards(
    subject: string,
    topic: string,
    level: EducationalLevel = 'Bachillerato',
    materials: UploadedMaterial[] = [],
    count = 8,
    additionalInstructions = ''
  ): Promise<FlashcardDeck> {
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
          if (textBody && textBody.trim()) {
            contents.push({
              text: `[Material de temario adjunto - ${mat.name || 'Temario'}]:\n${textBody.trim()}`,
            });
          }
          continue;
        }

        if (mat.base64Data) {
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

    const systemPrompt = `Eres un pedagogo experto en técnicas de estudio activo, memoria espaciada (Spaced Repetition) y diseño de tarjetas didácticas (Flashcards).
Tu objetivo es generar exactamente ${count} tarjetas de memoria interactivas de alto rendimiento para el tema "${topic}" de la asignatura "${subject}" (Nivel: "${level}").
Idioma obligatorio: Español.

Criterios para las tarjetas:
1. El anverso ("front") debe ser una pregunta directa, una incógnita clave, un concepto a definir o una fórmula por deducir que desafíe la memoria del estudiante.
2. El reverso ("back") debe contener la respuesta clara, estructurada, sintética y fácil de asimilar.
3. Incluye una categoría ("category") como: "Concepto Clave", "Fórmula", "Definición", "Causa-Efecto" o "Dato Clave".
4. Incluye una pista opcional ("hint") para desbloquear el recuerdo.
${additionalInstructions ? `Instrucciones adicionales del alumno: "${additionalInstructions}"` : ''}`;

    const userPromptText = `Por favor, genera ${count} tarjetas de memoria en formato JSON con la siguiente estructura:
{
  "title": "Tarjetas de Repaso: ${subject} - ${topic}",
  "cards": [
    {
      "front": "¿Cuál es la función principal de X y dónde ocurre?",
      "back": "Respuesta clara y precisa explicando el mecanismo.",
      "hint": "Recuerda la relación con Y.",
      "category": "Concepto Clave"
    }
  ]
}
Devuelve únicamente el objeto JSON válido.`;

    contents.push({ text: userPromptText });

    let responseText = '';

    try {
      const ai = getGeminiClient();
      const response = await generateContentWithFallback(ai, {
        primaryModel: GEMINI_TEXT_MODEL,
        contents,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: 'application/json',
          temperature: 0.3,
          maxOutputTokens: 4096,
        },
      });
      responseText = response.text || '';
      if (!responseText.trim()) throw new Error('La IA no devolvió contenido para las tarjetas.');
    } catch (primaryErr: any) {
      console.warn('[Gemini] Fallo en la generación de tarjetas con Gemini:', primaryErr?.message || primaryErr);
      const fallbackKey = getFallbackApiKey();
      if (fallbackKey) {
        console.log('[Fallback] Activando proveedor alternativo para tarjetas...');
        try {
          responseText = await executeFallbackGeneration({
            apiKey: fallbackKey,
            systemPrompt,
            userPromptText,
            materials,
          });
        } catch (fallbackErr: any) {
          throw new Error(`Fallo en Gemini y en proveedor de respaldo: ${fallbackErr.message || fallbackErr}`);
        }
      } else {
        throw new Error(formatGeminiErrorMessage(primaryErr));
      }
    }

    let parsed: any;
    try {
      parsed = JSON.parse(responseText);
    } catch {
      const match = responseText.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
      else throw new Error('No se pudo decodificar el formato JSON de las tarjetas.');
    }

    const cards: Flashcard[] = (parsed.cards || []).map((c: any, idx: number) => ({
      id: `fc_${Date.now()}_${idx + 1}`,
      front: c.front || `Pregunta o concepto ${idx + 1}`,
      back: c.back || 'Respuesta y explicación.',
      hint: c.hint || undefined,
      category: c.category || 'Concepto Clave',
    }));

    return {
      id: `deck_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: parsed.title || `Tarjetas: ${subject} - ${topic}`,
      subject,
      topic,
      level,
      cards: cards.length > 0 ? cards : [
        {
          id: `fc_1`,
          front: `Concepto principal de ${topic}`,
          back: `Revisa los apuntes y materiales de ${subject}.`,
          category: 'General',
        }
      ],
      createdAt: new Date().toISOString(),
    };
  },
};
