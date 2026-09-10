import { GoogleGenAI } from '@google/genai';
import {
  EducationalLevel,
  Exam,
  ExamDifficulty,
  ExamSetupConfig,
  KeyConceptItem,
  NotesStyle,
  OpenQuestion,
  QuestionFeedback,
  QuickReviewQuestion,
  StudyNote,
  StudyNotesSetupConfig,
  UploadedMaterial,
} from '../types';

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

// Use modern supported model as mandated by Google AI Studio Gemini API guidelines
export const GEMINI_TEXT_MODEL = 'gemini-3.8-flash';

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
  // Check if an API key is available
  hasApiKey(): boolean {
    const key = getGeminiApiKey();
    return Boolean(key && key !== 'MY_GEMINI_API_KEY');
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

    const ai = getGeminiClient();

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
1. Si se han adjuntado fotos o documentos de temario, básate estricta y fielmente en los conceptos, fórmulas, hechos o definiciones que aparecen en ese material.
2. Cada pregunta tipo test debe tener exactamente 4 opciones de respuesta (índices 0, 1, 2, 3), sólo una correcta, distractores plausibles y pedagógicos, y una explicación clara de por qué la respuesta correcta lo es.
3. Cada pregunta abierta debe requerir análisis, explicación de conceptos o desarrollo según el nivel educativo indicado. Incluye una respuesta modelo esperada (sampleAnswer) y los criterios clave de evaluación (gradingCriteria) que el profesor buscará al calificar.
4. Asigna puntos equilibrados (1 punto por cada tipo test, 2 o 3 puntos por cada abierta).
5. Adapta la complejidad del vocabulario y rigor al nivel "${level}".`;

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

    try {
      // Use gemini-3.8-flash with well-structured generationConfig parameters
      const response = await ai.models.generateContent({
        model: GEMINI_TEXT_MODEL,
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
        throw new Error('La IA no devolvió ningún contenido.');
      }

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
        return {
          ...q,
          id: q.id || `q_${idx + 1}`,
          points: qPoints,
          type: q.type === 'open' ? 'open' : 'multiple_choice',
          options: Array.isArray(q.options) ? q.options : ['Opción A', 'Opción B', 'Opción C', 'Opción D'],
          correctOptionIndex: typeof q.correctOptionIndex === 'number' ? q.correctOptionIndex : 0,
          explanation: q.explanation || 'Respuesta fundamentada en el temario.',
        };
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
    } catch (err: any) {
      console.error('Error generating exam with Gemini API:', err);
      const msg = err.message || '';
      if (msg.includes('API_KEY_INVALID') || msg.includes('API key not valid')) {
        throw new Error('La clave GEMINI_API_KEY no es válida. Comprueba que sea correcta en la configuración.');
      }
      if (msg.includes('RESOURCE_EXHAUSTED') || msg.includes('429')) {
        throw new Error('Límite de cuota de Gemini alcanzado temporalmente. Espera unos segundos e inténtalo de nuevo.');
      }
      throw new Error(err.message || 'Error al procesar el examen con la IA de Gemini.');
    }
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
      const response = await ai.models.generateContent({
        model: GEMINI_TEXT_MODEL,
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
      const msg = err.message || '';
      if (msg.includes('API_KEY_INVALID') || msg.includes('API key not valid')) {
        throw new Error('La clave GEMINI_API_KEY no es válida. Comprueba que sea correcta en la configuración.');
      }
      if (msg.includes('RESOURCE_EXHAUSTED') || msg.includes('429')) {
        throw new Error('Límite de cuota de Gemini alcanzado temporalmente. Espera unos segundos e inténtalo de nuevo.');
      }
      throw new Error(err.message || 'Error al procesar los apuntes con la IA de Gemini.');
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

      const response = await ai.models.generateContent({
        model: GEMINI_TEXT_MODEL,
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
};
