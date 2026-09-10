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
