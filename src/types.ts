export type EducationalLevel =
  | 'Secundaria (ESO)'
  | 'Bachillerato'
  | 'Preparación PAU / EBAU'
  | 'Primaria'
  | 'Formación Profesional'
  | 'Universidad / Grado'
  | 'Máster / Oposiciones';

export type ExamDifficulty = 'Fácil' | 'Media' | 'Difícil';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'admin' | 'user' | 'teacher';
  institution?: string;
  subjectArea?: string;
  provider: 'google' | 'email';
  emailVerified: boolean;
  createdAt: string;
}

export interface UploadedMaterial {
  id: string;
  name: string;
  type: 'image' | 'pdf' | 'text';
  mimeType: string;
  base64Data: string; // Base64 without data prefix or with data prefix
  previewUrl?: string;
  sizeBytes: number;
}

export interface ExamSetupConfig {
  subject: string;
  topic: string;
  level: EducationalLevel;
  difficulty: ExamDifficulty;
  testCount: number;
  openCount: number;
  timed: boolean;
  timeLimitMinutes: number;
  additionalNotes?: string;
  isPdcAdapted?: boolean;
}

export interface BaseQuestion {
  id: string;
  questionText: string;
  points: number;
}

export interface MultipleChoiceQuestion extends BaseQuestion {
  type: 'multiple_choice';
  options: string[]; // 4 options
  correctOptionIndex: number; // 0 to 3
  explanation: string;
}

export interface OpenQuestion extends BaseQuestion {
  type: 'open';
  sampleAnswer: string;
  gradingCriteria: string[];
  hint?: string;
}

export type ExamQuestion = MultipleChoiceQuestion | OpenQuestion;

export interface Exam {
  id: string;
  title: string;
  subject: string;
  topic: string;
  level: EducationalLevel;
  difficulty: ExamDifficulty;
  createdAt: string;
  timeLimitMinutes?: number;
  overview: string;
  questions: ExamQuestion[];
  totalPoints: number;
  isPdcAdapted?: boolean;
}

export interface QuestionFeedback {
  questionId: string;
  score: number;
  maxScore: number;
  isCorrect?: boolean;
  feedback: string;
  strengths?: string[];
  improvements?: string[];
  userAnswer?: string | number;
}

export interface ExamSubmission {
  examId: string;
  startedAt: string;
  submittedAt: string;
  timeSpentSeconds: number;
  answers: Record<string, string | number>; // questionId -> selectedIndex or text answer
}

export interface ExamResult {
  id: string;
  examId: string;
  userId: string;
  userEmail?: string;
  userName?: string;
  examTitle: string;
  subject: string;
  topic: string;
  level: EducationalLevel;
  completedAt: string;
  totalScore: number;
  maxPossibleScore: number;
  percentage: number;
  testScore: number;
  maxTestScore: number;
  openScore: number;
  maxOpenScore: number;
  feedbackByQuestion: Record<string, QuestionFeedback>;
  generalFeedback: string;
  examData: Exam;
  userAnswers: Record<string, string | number>;
}

export type NotesStyle =
  | 'comprehensive' // Resumen completo y detallado
  | 'outline'       // Esquema y puntos clave
  | 'flashcards'    // Tarjetas y preguntas/respuestas de repaso
  | 'glossary';     // Glosario y fórmulas/conceptos esenciales

export interface StudyNotesSetupConfig {
  subject: string;
  topic: string;
  level: EducationalLevel;
  style: NotesStyle;
  focusKeywords?: string;
  additionalInstructions?: string;
  isPdcAdapted?: boolean;
}

export interface KeyConceptItem {
  term: string;
  definition: string;
  exampleOrNote?: string;
}

export interface QuickReviewQuestion {
  question: string;
  answer: string;
}

export interface StudyNote {
  id: string;
  userId?: string;
  title: string;
  subject: string;
  topic: string;
  level: EducationalLevel;
  style: NotesStyle;
  createdAt: string;
  summary: string;
  contentMarkdown: string;
  keyConcepts: KeyConceptItem[];
  quickReviewQuestions: QuickReviewQuestion[];
  tags: string[];
  isPublished?: boolean;
  publishedAt?: string;
  authorName?: string;
  authorEmail?: string;
  likesCount?: number;
  downloadsCount?: number;
  isPdcAdapted?: boolean;
}

export interface RoomParticipant {
  id: string;
  name: string;
  avatar?: string;
  isHost: boolean;
  joinedAt: string;
  status: 'waiting' | 'in_exam' | 'finished';
  score?: number;
  maxScore?: number;
  percentage?: number;
  timeSpentSeconds?: number;
  finishedAt?: string;
}

export interface ExamRoom {
  id: string;
  code: string;
  hostId: string;
  hostName: string;
  status: 'waiting' | 'in_progress' | 'completed';
  createdAt: string;
  startedAt?: string;
  exam: Exam;
  participants: Record<string, RoomParticipant>;
}

export interface HomeworkStep {
  stepNumber: number;
  title: string;
  explanation: string;
  formulaOrMath?: string;
  tip?: string;
}

export interface HomeworkSolution {
  id: string;
  userId?: string;
  createdAt: string;
  subject?: string;
  topic?: string;
  level?: EducationalLevel;
  exerciseText: string;
  finalAnswer: string;
  steps: HomeworkStep[];
  keyConcepts: string[];
  commonMistakes: string[];
  similarPractice?: {
    question: string;
    answer: string;
    explanation: string;
  };
  exerciseImageUrl?: string;
  additionalNotes?: string;
  isPdcAdapted?: boolean;
}

export interface HomeworkSolveConfig {
  subject?: string;
  level?: EducationalLevel;
  specificDoubt?: string;
  isPdcAdapted?: boolean;
}

export interface Flashcard {
  id: string;
  front: string; // Question or key concept
  back: string;  // Detailed answer, explanation, formula
  hint?: string;
  category?: string;
  points?: number;
}

export interface FlashcardDeck {
  id: string;
  title: string;
  subject: string;
  topic: string;
  level: EducationalLevel;
  cards: Flashcard[];
  createdAt: string;
  isPdcAdapted?: boolean;
}

// -------------------------------------------------------------
// SECCIÓN DE PROFESORADO (EXÁMENES DE AULA Y ACTIVIDADES EN CLASE)
// -------------------------------------------------------------

export interface SchoolHeaderConfig {
  schoolName: string;      // ej: IES Complutense
  department: string;      // ej: Departamento de Ciencias
  courseAndGroup: string;  // ej: 3º ESO - Grupo B
  teacherName: string;     // ej: Prof. Gómez
  examDate: string;        // ej: 24 de Octubre de 2025
  evaluationPeriod: string;// ej: 1ª Evaluación
  instructions: string;    // Instrucciones oficiales para los alumnos
}

export interface TeacherExamConfig {
  subject: string;
  topic: string;
  level: EducationalLevel;
  difficulty: ExamDifficulty;
  header: SchoolHeaderConfig;
  testCount: number;
  openCount: number;
  generateModelB: boolean;       // Generar variante Modelo B para evitar copias
  includeAnswerKey: boolean;     // Generar solucionario detallado
  includeRubric: boolean;        // Incluir rúbrica por competencias LOMLOE
  isPdcAdapted?: boolean;        // Adaptación curricular LOMLOE / DUA
  timeMinutes: number;           // ej: 50 minutos
  customRequirements?: string;   // Instrucciones didácticas específicas del profesor
}

export interface ClassroomExamQuestion {
  number: number;
  type: 'multiple_choice' | 'open';
  questionText: string;
  points: number;
  options?: string[];            // 4 opciones para tipo test
  correctOptionIndex?: number;   // 0 a 3 (solo en versión docente / solucionario)
  modelBOptionOrder?: number[];  // Permutación para Modelo B
  expectedAnswer?: string;       // Respuesta desarrollada oficial
  gradingCriteria?: string[];    // Pautas de calificación objetiva
  competencyTag?: string;        // ej: CCL1, STEM2, CD3
  blankSpaceLines?: number;      // Espacio reservado para escribir en papel
}

export interface ClassroomExam {
  id: string;
  title: string;
  header: SchoolHeaderConfig;
  subject: string;
  topic: string;
  level: EducationalLevel;
  difficulty: ExamDifficulty;
  createdAt: string;
  durationMinutes: number;
  totalPoints: number;
  questionsModelA: ClassroomExamQuestion[];
  questionsModelB?: ClassroomExamQuestion[];
  answerKeyMarkdown: string;     // Solucionario completo para el profesor
  rubricMarkdown: string;        // Criterios de evaluación y rúbrica LOMLOE
  pedagogicalNotes: string;      // Recomendaciones didácticas
  isPdcAdapted?: boolean;
}

export type ActivityType =
  | 'cooperative_group'    // Trabajo cooperativo con roles definidos
  | 'individual_work'      // Trabajo individual / autónomo con ficha práctica y autoevaluación
  | 'classroom_quiz'       // Kahoot / Concurso de preguntas proyectable
  | 'structured_debate'    // Debate con posturas y turnos cronometrados
  | 'case_study'           // Estudio de caso / reto de la vida real
  | 'quick_experiment'     // Taller o experimento de aula con materiales sencillos
  | 'escape_room';         // Escape Room de aula con pistas y código final

export interface TeacherActivityConfig {
  type: ActivityType;
  subject: string;
  topic: string;
  level: EducationalLevel;
  durationMinutes: number;       // ej: 45-50 min (1 sesión)
  groupSize: number;             // ej: 3 a 5 alumnos (o 1 para individual)
  schoolName?: string;
  customGoal?: string;           // Objetivo pedagógico que busca el profesor
  isPdcAdapted?: boolean;
  // Parámetros específicos para Quiz / Concurso por Equipos
  totalStudents?: number;        // Total alumnos en clase (ej: 25)
  teamCount?: number;            // Cuántos equipos va a haber (ej: 5)
  studentsPerTeam?: number;      // Cuántas personas por equipo (ej: 5)
}

export interface GroupRole {
  roleName: string;              // Coordinador, Portavoz, Secretario, Temporizador...
  responsibilities: string[];    // Qué debe hacer este rol en el grupo
}

export interface ActivityPhase {
  phaseNumber: number;
  title: string;
  durationMinutes: number;
  teacherAction: string;
  studentAction: string;
}

export interface ClassroomActivity {
  id: string;
  type: ActivityType;
  title: string;
  subtitle: string;
  subject: string;
  topic: string;
  level: EducationalLevel;
  targetCompetencies: string[];  // Competencias clave (CCL, STEM, CD, CPSAA, CC, CE, CCEC)
  estimatedMinutes: number;
  recommendedGroupSize: number;
  totalStudents?: number;
  teamCount?: number;
  studentsPerTeam?: number;
  materialsNeeded: string[];
  setupInstructions: string;
  phases: ActivityPhase[];
  groupRoles?: GroupRole[];
  deliverableOrProduct: string;   // Qué deben entregar los alumnos
  evaluationRubric: string;      // Rúbrica de heteroevaluación y coevaluación
  printableStudentWorksheet: string; // Ficha imprimible para repartir en clase
  teacherAnswerKeyOrGuide: string;   // Hoja guía para el docente
  createdAt: string;
  isPdcAdapted?: boolean;
}



