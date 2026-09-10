export type EducationalLevel =
  | 'Primaria'
  | 'Secundaria (ESO)'
  | 'Bachillerato'
  | 'Formación Profesional'
  | 'Universidad / Grado'
  | 'Máster / Oposiciones';

export type ExamDifficulty = 'Fácil' | 'Media' | 'Difícil';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'admin' | 'user';
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
}

export interface HomeworkSolveConfig {
  subject?: string;
  level?: EducationalLevel;
  specificDoubt?: string;
}


