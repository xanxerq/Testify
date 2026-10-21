import { GoogleGenAI } from '@google/genai';
import {
  getGeminiApiKey,
  GEMINI_TEXT_MODEL,
  generateContentWithFallback,
  isHighDemandOrTransientError,
} from './geminiService';
import {
  ClassroomActivity,
  ClassroomExam,
  ClassroomExamQuestion,
  TeacherActivityConfig,
  TeacherExamConfig,
  UploadedMaterial,
} from '../types';

const STORAGE_KEY_TEACHER_EXAMS = 'testify_teacher_classroom_exams';
const STORAGE_KEY_TEACHER_ACTIVITIES = 'testify_teacher_classroom_activities';

// Helper to clean JSON string from Gemini response
function cleanJsonOutput(text: string): string {
  let cleaned = text.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  return cleaned.trim();
}

/**
 * Transforms uploaded materials (PDFs, images, text files) into Gemini-ready multimodal parts.
 */
function buildMultimodalParts(materials?: UploadedMaterial[]): any[] {
  const parts: any[] = [];
  if (!Array.isArray(materials) || materials.length === 0) return parts;

  for (const mat of materials) {
    if (!mat) continue;

    // Plain text files
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
        parts.push({
          text: `[DOCUMENTO DE TEORÍA / ACTIVIDADES ADJUNTO - "${mat.name || 'Material'}"]:\n${textBody.trim()}`,
        });
      }
      continue;
    }

    // Binary files (PDF or Images)
    if (mat.base64Data) {
      const cleanBase64 = mat.base64Data.replace(/^data:[^;]+;base64,/, '').trim();
      if (!cleanBase64) continue;

      let mimeType = (mat.mimeType || (mat.type === 'pdf' ? 'application/pdf' : 'image/jpeg')).toLowerCase();

      // If marked as PDF but contains plaintext
      if (mimeType === 'application/pdf' && !cleanBase64.startsWith('JVBERi')) {
        try {
          const decoded = atob(cleanBase64);
          if (decoded && decoded.trim()) {
            parts.push({
              text: `[DOCUMENTO DE TEORÍA ADJUNTO - "${mat.name || 'Material'}"]:\n${decoded.trim()}`,
            });
            continue;
          }
        } catch {}
      }

      parts.push({
        inlineData: {
          mimeType,
          data: cleanBase64,
        },
      });
    }
  }

  return parts;
}

export const teacherService = {
  // -------------------------------------------------------------
  // GENERAR EXAMEN PARA EL AULA (MODELO A/B + SOLUCIONARIO + RÚBRICA)
  // -------------------------------------------------------------
  async generateClassroomExam(
    config: TeacherExamConfig,
    materials?: UploadedMaterial[]
  ): Promise<ClassroomExam> {
    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      throw new Error(
        'No se ha encontrado la clave de API de Gemini. Configura VITE_GEMINI_API_KEY para generar exámenes de aula con IA.'
      );
    }

    const ai = new GoogleGenAI({ apiKey });
    const materialParts = buildMultimodalParts(materials);
    const hasMaterials = materialParts.length > 0;

    const promptText = `Eres un asesor pedagógico de alta dirección y profesor titular en España experto en el diseño de exámenes formales para centros educativos (LOMLOE, ESO, Bachillerato, FP y PAU).

Debes crear un EXAMEN ESCOLAR COMPLETO LISTO PARA EL AULA con su SOLUCIONARIO OFICIAL y RÚBRICA DOCENTE.

DATOS DEL EXAMEN:
- Materia/Asignatura: ${config.subject}
- Tema o Bloque de Contenidos: ${config.topic}
- Nivel Educativo: ${config.level}
- Dificultad: ${config.difficulty}
- Duración de la prueba: ${config.timeMinutes || 50} minutos
- Preguntas tipo test (4 opciones): ${config.testCount}
- Preguntas abiertas / desarrollo / problemas: ${config.openCount}
- Generar Modelo B alternativo anti-copia: ${config.generateModelB ? 'SÍ (Permutar u ordenar de forma distinta las preguntas y las opciones de los test para que dos alumnos contiguos no puedan copiarse)' : 'NO'}
- Adaptación curricular (PDC / DUA): ${config.isPdcAdapted ? 'SÍ, aplicar pautas de accesibilidad cognitiva, enunciados claros sin ambigüedad y apoyo paso a paso' : 'Estándar LOMLOE'}
- Datos del Centro: ${config.header.schoolName || 'Centro Educativo'} • ${config.header.department || 'Departamento'} • Curso: ${config.header.courseAndGroup || config.level}
- Requisitos adicionales del profesor: ${config.customRequirements || 'Ninguno en particular'}
${hasMaterials ? '\nINSTRUCCIÓN PRIMORDIAL SOBRE MATERIALES ADJUNTOS:\nEl profesor ha subido un PDF o documentos de teoría / actividades. Utiliza EXCLUSIVAMENTE este material como fuente principal para las preguntas, ejercicios numéricos, problemas o cuestiones teóricas del examen.' : ''}

INSTRUCCIONES DE DISEÑO:
1. Las preguntas deben ser rigurosas, pedagógicamente impecables y adecuadas a la edad y nivel en España.
2. Cada pregunta debe tener una puntuación numérica justa (la suma total debe ser exactamente 10.0 puntos).
3. Cada pregunta debe indicar qué competencia clave evalúa (ej: CCL1, STEM2, CD3, CPSAA4...).
4. Para las preguntas abiertas, define el espacio en líneas (blankSpaceLines, de 4 a 12 líneas) para que quede perfecto al fotocopiar o imprimir.
5. Elabora un Solucionario Oficial (answerKeyMarkdown) con la resolución paso a paso, errores típicos donde penalizar y desglose de puntos parciales.
6. Elabora una Rúbrica de Corrección LOMLOE (rubricMarkdown) estructurada en niveles (Insuficiente [1-4], Suficiente/Bien [5-6], Notable [7-8], Sobresaliente [9-10]).
7. Proporciona notas pedagógicas (pedagogicalNotes) con consejos prácticos para el docente durante la aplicación en el aula.

DEBES RESPONDER EXCLUSIVAMENTE CON UN OBJETO JSON VÁLIDO CON ESTA ESTRUCTURA EXACTA (sin markdown adicional fuera del JSON):
{
  "title": "Examen de ${config.subject}: ${config.topic}",
  "totalPoints": 10,
  "durationMinutes": ${config.timeMinutes || 50},
  "questionsModelA": [
    {
      "number": 1,
      "type": "multiple_choice",
      "questionText": "Texto de la pregunta...",
      "points": 1.0,
      "options": ["Opción A", "Opción B", "Opción C", "Opción D"],
      "correctOptionIndex": 0,
      "competencyTag": "STEM1",
      "blankSpaceLines": 0,
      "expectedAnswer": "Explicación de por qué la opción A es la correcta."
    },
    {
      "number": 2,
      "type": "open",
      "questionText": "Texto de la pregunta de desarrollo o problema práctico...",
      "points": 2.5,
      "blankSpaceLines": 8,
      "competencyTag": "CCL2",
      "expectedAnswer": "Respuesta modelo ideal que se espera del alumno...",
      "gradingCriteria": [
        "1.0 pto: Planteamiento correcto de la hipótesis",
        "1.0 pto: Justificación teórica fundamentada",
        "0.5 ptos: Precisión léxica y ortografía"
      ]
    }
  ],
  "questionsModelB": [
    /* Si generateModelB es true, incluye aquí la versión alternativa con el orden variado */
  ],
  "answerKeyMarkdown": "### Solucionario Oficial del Profesorado\\n\\n...",
  "rubricMarkdown": "### Rúbrica de Evaluación LOMLOE\\n\\n...",
  "pedagogicalNotes": "Consejos para el aula: Repartir el examen en silencio..."
}`;

    const contents = [...materialParts, { text: promptText }];

    try {
      const response = await generateContentWithFallback(ai, {
        contents,
        config: {
          temperature: 0.3,
          responseMimeType: 'application/json',
        },
      });

      const rawText = response.text || '';
      const parsed = JSON.parse(cleanJsonOutput(rawText));

      const classroomExam: ClassroomExam = {
        id: `exam_class_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        title: parsed.title || `Examen de ${config.subject}: ${config.topic}`,
        header: config.header,
        subject: config.subject,
        topic: config.topic,
        level: config.level,
        difficulty: config.difficulty,
        createdAt: new Date().toISOString(),
        durationMinutes: parsed.durationMinutes || config.timeMinutes || 50,
        totalPoints: parsed.totalPoints || 10,
        questionsModelA: parsed.questionsModelA || [],
        questionsModelB: config.generateModelB ? (parsed.questionsModelB || parsed.questionsModelA) : undefined,
        answerKeyMarkdown: parsed.answerKeyMarkdown || 'Solucionario oficial elaborado por Testify IA.',
        rubricMarkdown: parsed.rubricMarkdown || 'Rúbrica de evaluación LOMLOE.',
        pedagogicalNotes: parsed.pedagogicalNotes || 'Aplicar con tiempo límite establecido.',
        isPdcAdapted: config.isPdcAdapted,
      };

      // Auto-save to local history
      await this.saveClassroomExam(classroomExam);

      return classroomExam;
    } catch (err: any) {
      console.error('Error generating classroom exam:', err);
      if (isHighDemandOrTransientError(err)) {
        throw new Error('El modelo de IA está experimentando alta demanda. Espera unos segundos y vuelve a pulsar Generar.');
      }
      throw new Error(err.message || 'Error al generar el examen para el aula con IA.');
    }
  },

  // -------------------------------------------------------------
  // GENERAR ACTIVIDADES Y DINÁMICAS PARA CLASE
  // -------------------------------------------------------------
  async generateClassroomActivity(
    config: TeacherActivityConfig,
    materials?: UploadedMaterial[]
  ): Promise<ClassroomActivity> {
    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      throw new Error('No se ha encontrado la clave de API de Gemini.');
    }

    const ai = new GoogleGenAI({ apiKey });
    const materialParts = buildMultimodalParts(materials);
    const hasMaterials = materialParts.length > 0;

    const activityTypeLabels: Record<string, string> = {
      cooperative_group: 'Trabajo cooperativo en grupos con roles asignados (Coordinador, Secretario, Portavoz, Cronometrador)',
      individual_work: 'Trabajo individual y autónomo (Ficha de ejercicios progresivos, autorregulación y autoevaluación)',
      classroom_quiz: 'Concurso / Quiz interactivo proyectable por equipos con tarjetas y puntuación',
      structured_debate: 'Debate estructurado con posturas asignadas, turnos cronometrados y moderación',
      case_study: 'Estudio de caso del mundo real y resolución grupal de retos',
      quick_experiment: 'Taller práctico o experimento de aula con materiales sencillos',
      escape_room: 'Escape Room educativo de aula con pistas, enigmas temáticos y código final',
    };

    const isIndividual = config.type === 'individual_work';
    const isQuiz = config.type === 'classroom_quiz';

    const promptText = `Eres un catedrático de didáctica y formador de profesorado en España, experto en metodologías activas y situaciones de aprendizaje (LOMLOE).

Crea una DINÁMICA DE AULA / ACTIVIDAD DE CLASE COMPLETA para que un profesor pueda aplicarla directamente en su sesión de clase.

DATOS DE LA ACTIVIDAD:
- Tipo de dinámica: ${activityTypeLabels[config.type] || config.type}
- Materia: ${config.subject}
- Tema: ${config.topic}
- Nivel Educativo: ${config.level}
- Duración de la sesión: ${config.durationMinutes || 45} minutos
${isIndividual ? '- Modalidad: TRABAJO INDIVIDUAL AUTÓNOMO (cada estudiante resuelve su propia ficha individualmente, no hay roles de grupo)' : ''}
${isQuiz ? `- Configuración de Equipos para el Concurso:
  * Alumnos totales en clase: ${config.totalStudents || 25}
  * Número de equipos en el aula: ${config.teamCount || 5}
  * Personas por equipo: ${config.studentsPerTeam || Math.ceil((config.totalStudents || 25) / (config.teamCount || 5))}
  * Dinámica de competición: El aula compite dividida en estos ${config.teamCount || 5} equipos con marcador por rondas.` : ''}
${!isIndividual && !isQuiz ? `- Tamaño recomendado de grupos: ${config.groupSize || 4} alumnos por grupo` : ''}
- Objetivo didáctico: ${config.customGoal || 'Afianzar contenidos curriculares mediante participación activa'}
- Adaptación DUA / Inclusión: ${config.isPdcAdapted ? 'Sí, adaptado a diversidad y PDC' : 'Estándar'}
${hasMaterials ? '\nINSTRUCCIÓN PRIMORDIAL SOBRE EL PDF / MATERIAL ADJUNTO:\nEl docente ha subido un PDF o temario de teoría o actividades. Debes utilizar ESTE MATERIAL como la base directa para elaborar los ejercicios, preguntas, retos o casos de esta sesión.' : ''}

INSTRUCCIONES CLAVE DE DISEÑO:
1. Divide la sesión en fases cronometradas con minutos exactos (ej: Introducción y activación [5 min], Fase central de trabajo o rondas [25 min], Puesta en común / corrección [10 min], Conclusión y autoevaluación [5 min]).
2. Para cada fase describe qué hace el profesor (docente) y qué hacen los alumnos.
${isIndividual ? `3. IMPORTANTE PARA TRABAJO INDIVIDUAL:
- En "groupRoles", devuelve un array vacío [] porque los alumnos trabajan individualmente.
- La "Ficha Imprimible para el Alumnado" (printableStudentWorksheet) debe ser una ficha de ejercicios individuales completa y lista para fotocopiar (Nombre y Apellidos del alumno, fecha, ejercicios graduados de menor a mayor complejidad, espacio para cálculos o respuestas y rúbrica de autoevaluación al final).` : ''}
${isQuiz ? `3. IMPORTANTE PARA QUIZ / CONCURSO POR EQUIPOS:
- En la ficha y en la guía del docente, incluye el "Marcador Oficial del Aula" preparado para anotar las puntuaciones de los ${config.teamCount || 5} equipos en cada ronda.
- Diseña de 4 a 6 rondas de preguntas con diferentes niveles de puntos (ej: Ronda 1 Calentamiento: 10 pts, Ronda 2 Reto Rápido: 20 pts, Ronda 3 Pregunta Estrella: 30 pts).
- Incluye hojas de respuesta o tarjetas para que los equipos muestren o entreguen sus respuestas.` : ''}
${!isIndividual && !isQuiz ? `3. Si es trabajo cooperativo, define claramente los 4 roles (Coordinador/a, Portavoz, Secretario/a, Controlador/a de tiempo y material).` : ''}
4. Genera una "Ficha Imprimible para el Alumnado" (printableStudentWorksheet) con el título, instrucciones, enunciados y espacio de respuesta.
5. Genera la "Guía del Docente con Respuestas y Soluciones" (teacherAnswerKeyOrGuide).
6. Incluye una Rúbrica de Evaluación con criterios observables.

RESPONDE EXCLUSIVAMENTE CON UN OBJETO JSON VÁLIDO CON ESTA ESTRUCTURA EXACTA:
{
  "title": "Título atractivo de la dinámica de clase",
  "subtitle": "Subtítulo pedagógico breve",
  "targetCompetencies": ["CCL1", "STEM2", "CPSAA3", "CC4"],
  "estimatedMinutes": ${config.durationMinutes || 45},
  "recommendedGroupSize": ${isIndividual ? 1 : (isQuiz ? (config.studentsPerTeam || 4) : (config.groupSize || 4))},
  "materialsNeeded": ["Ficha de trabajo impresa", "Bolígrafos", "Cronómetro"],
  "setupInstructions": "Pautas previas antes de empezar la clase...",
  "phases": [
    {
      "phaseNumber": 1,
      "title": "Fase 1: Activación y preparación",
      "durationMinutes": 5,
      "teacherAction": "El profesor proyecta la consigna...",
      "studentAction": "Los alumnos preparan su material..."
    }
  ],
  "groupRoles": [
    ${isIndividual ? '' : `{
      "roleName": "Coordinador/a",
      "responsibilities": ["Moderar las intervenciones", "Asegurar que todos participan"]
    },
    {
      "roleName": "Secretario/a",
      "responsibilities": ["Redactar las conclusiones en la ficha oficial"]
    },
    {
      "roleName": "Portavoz",
      "responsibilities": ["Presentar las conclusiones del equipo"]
    },
    {
      "roleName": "Controlador/a de Tiempo",
      "responsibilities": ["Controlar que el grupo cumple los tiempos de cada fase"]
    }`}
  ],
  "deliverableOrProduct": "Descripción del producto que entregan al terminar",
  "evaluationRubric": "### Rúbrica de la Actividad\\n\\n...",
  "printableStudentWorksheet": "### Ficha de Trabajo\\n\\n...",
  "teacherAnswerKeyOrGuide": "### Guía Didáctica y Solucionario del Docente\\n\\n..."
}`;

    const contents = [...materialParts, { text: promptText }];

    try {
      const response = await generateContentWithFallback(ai, {
        contents,
        config: {
          temperature: 0.4,
          responseMimeType: 'application/json',
        },
      });

      const rawText = response.text || '';
      const parsed = JSON.parse(cleanJsonOutput(rawText));

      const activity: ClassroomActivity = {
        id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        type: config.type,
        title: parsed.title || `Actividad: ${config.topic}`,
        subtitle: parsed.subtitle || `Dinámica para ${config.level}`,
        subject: config.subject,
        topic: config.topic,
        level: config.level,
        targetCompetencies: parsed.targetCompetencies || ['CCL1', 'STEM1', 'CPSAA1'],
        estimatedMinutes: parsed.estimatedMinutes || config.durationMinutes || 45,
        recommendedGroupSize: isIndividual ? 1 : (parsed.recommendedGroupSize || config.groupSize || 4),
        totalStudents: isQuiz ? config.totalStudents : undefined,
        teamCount: isQuiz ? config.teamCount : undefined,
        studentsPerTeam: isQuiz ? config.studentsPerTeam : undefined,
        materialsNeeded: parsed.materialsNeeded || ['Ficha impresa', 'Material de escritura'],
        setupInstructions: parsed.setupInstructions || (isIndividual ? 'Distribuir una ficha a cada estudiante.' : 'Organizar las mesas en equipos.'),
        phases: parsed.phases || [],
        groupRoles: isIndividual ? [] : (parsed.groupRoles || []),
        deliverableOrProduct: parsed.deliverableOrProduct || (isIndividual ? 'Ficha individual resuelta' : 'Ficha de conclusiones de equipo'),
        evaluationRubric: parsed.evaluationRubric || 'Rúbrica de evaluación.',
        printableStudentWorksheet: parsed.printableStudentWorksheet || 'Ficha de trabajo.',
        teacherAnswerKeyOrGuide: parsed.teacherAnswerKeyOrGuide || 'Guía de observación para el profesor.',
        createdAt: new Date().toISOString(),
        isPdcAdapted: config.isPdcAdapted,
      };

      // Auto-save to local history
      await this.saveClassroomActivity(activity);

      return activity;
    } catch (err: any) {
      console.error('Error generating classroom activity:', err);
      if (isHighDemandOrTransientError(err)) {
        throw new Error('El modelo de IA está experimentando alta demanda. Espera unos segundos y vuelve a pulsar Generar.');
      }
      throw new Error(err.message || 'Error al generar la actividad con IA.');
    }
  },

  // -------------------------------------------------------------
  // HISTORIAL Y GUARDADO LOCAL
  // -------------------------------------------------------------
  getSavedClassroomExams(): ClassroomExam[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_TEACHER_EXAMS);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  async saveClassroomExam(exam: ClassroomExam): Promise<void> {
    try {
      const existing = this.getSavedClassroomExams();
      const updated = [exam, ...existing.filter((e) => e.id !== exam.id)];
      localStorage.setItem(STORAGE_KEY_TEACHER_EXAMS, JSON.stringify(updated.slice(0, 30)));
    } catch (e) {
      console.warn('Notice saving classroom exam locally:', e);
    }
  },

  async deleteClassroomExam(id: string): Promise<void> {
    try {
      const existing = this.getSavedClassroomExams();
      const filtered = existing.filter((e) => e.id !== id);
      localStorage.setItem(STORAGE_KEY_TEACHER_EXAMS, JSON.stringify(filtered));
    } catch (e) {
      console.warn('Notice deleting classroom exam:', e);
    }
  },

  getSavedClassroomActivities(): ClassroomActivity[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_TEACHER_ACTIVITIES);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  async saveClassroomActivity(activity: ClassroomActivity): Promise<void> {
    try {
      const existing = this.getSavedClassroomActivities();
      const updated = [activity, ...existing.filter((a) => a.id !== activity.id)];
      localStorage.setItem(STORAGE_KEY_TEACHER_ACTIVITIES, JSON.stringify(updated.slice(0, 30)));
    } catch (e) {
      console.warn('Notice saving classroom activity locally:', e);
    }
  },

  async deleteClassroomActivity(id: string): Promise<void> {
    try {
      const existing = this.getSavedClassroomActivities();
      const filtered = existing.filter((a) => a.id !== id);
      localStorage.setItem(STORAGE_KEY_TEACHER_ACTIVITIES, JSON.stringify(filtered));
    } catch (e) {
      console.warn('Notice deleting classroom activity:', e);
    }
  },
};
