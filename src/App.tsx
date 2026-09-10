import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { AuthModal } from './components/AuthModal';
import { AdminDatabaseModal } from './components/AdminDatabaseModal';
import { ExamSetupForm } from './components/ExamSetupForm';
import { ExamTaker } from './components/ExamTaker';
import { ExamResults } from './components/ExamResults';
import { ExamHistory } from './components/ExamHistory';
import { StudyNotesView } from './components/StudyNotesView';
import { HomeworkSolverView } from './components/HomeworkSolverView';
import { RoomLobbyModal } from './components/RoomLobbyModal';
import { authService } from './services/authService';
import { geminiService } from './services/geminiService';
import { historyService } from './services/historyService';
import { examRoomService } from './services/examRoomService';
import {
  Exam,
  ExamResult,
  ExamSetupConfig,
  MultipleChoiceQuestion,
  OpenQuestion,
  QuestionFeedback,
  StudyNote,
  UploadedMaterial,
  User,
} from './types';

export default function App() {
  const [user, setUser] = useState<User | null>(() => authService.getCurrentUser());
  const [activeView, setActiveView] = useState<'create' | 'exam' | 'results' | 'history' | 'notes' | 'homework'>('create');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);

  // Multiplayer room states
  const [isRoomLobbyOpen, setIsRoomLobbyOpen] = useState(false);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [activeRoomCode, setActiveRoomCode] = useState<string | null>(null);
  const [activeParticipantId, setActiveParticipantId] = useState<string | null>(null);
  const [initialRoomCode, setInitialRoomCode] = useState<string | null>(null);

  // Pre-configured exam parameters (e.g. from study notes)
  const [presetExamConfig, setPresetExamConfig] = useState<Partial<ExamSetupConfig> | null>(null);
  const [presetMaterials, setPresetMaterials] = useState<UploadedMaterial[] | null>(null);

  // Synchronize Supabase auth state automatically & check for room URL parameter (?room=...)
  useEffect(() => {
    const unsubscribe = authService.listenAuthState((syncedUser) => {
      setUser(syncedUser);
    });

    try {
      const params = new URLSearchParams(window.location.search);
      const roomParam = params.get('room');
      if (roomParam) {
        setInitialRoomCode(roomParam.toUpperCase());
        setIsRoomLobbyOpen(true);
      }
    } catch (e) {
      console.warn('Error reading URL params:', e);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Active exam state
  const [currentExam, setCurrentExam] = useState<Exam | null>(null);
  const [currentResult, setCurrentResult] = useState<ExamResult | null>(null);

  // Async loaders
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGrading, setIsGrading] = useState(false);
  const [gradingProgressText, setGradingProgressText] = useState<string>('');

  // Handle generating exam
  const handleGenerateExam = async (
    config: ExamSetupConfig,
    materials: UploadedMaterial[],
    startMultiplayer = false
  ) => {
    try {
      setIsGenerating(true);
      const exam = await geminiService.generateExam(config, materials);
      setCurrentExam(exam);

      if (startMultiplayer) {
        // Open lobby for the host to invite friends
        setIsRoomLobbyOpen(true);
      } else {
        // Clear previous room context for individual exam
        setActiveRoomId(null);
        setActiveRoomCode(null);
        setActiveParticipantId(null);
        setActiveView('exam');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err: any) {
      console.error('Error in handleGenerateExam:', err);
      throw err;
    } finally {
      setIsGenerating(false);
    }
  };

  // Called when room exam begins
  const handleStartExamInRoom = async (
    exam: Exam,
    roomId: string,
    participantId: string
  ) => {
    setCurrentExam(exam);
    setActiveRoomId(roomId);
    setActiveParticipantId(participantId);

    // Fetch code for display
    try {
      const r = await examRoomService.getRoomById(roomId);
      if (r) setActiveRoomCode(r.code);
    } catch (e) {
      console.error(e);
    }

    setActiveView('exam');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle grading & submitting exam
  const handleSubmitExam = async (
    answers: Record<string, string | number>,
    timeSpentSeconds: number
  ) => {
    if (!currentExam) return;

    try {
      setIsGrading(true);
      setGradingProgressText('Corrigiendo preguntas tipo test y analizando desarrollo...');

      let testScore = 0;
      let maxTestScore = 0;
      let openScore = 0;
      let maxOpenScore = 0;

      const feedbackByQuestion: Record<string, QuestionFeedback> = {};

      // 1. Grade Multiple Choice questions
      for (const question of currentExam.questions) {
        if (question.type === 'multiple_choice') {
          const mcq = question as MultipleChoiceQuestion;
          maxTestScore += mcq.points;
          const userChoice = answers[mcq.id];
          const isCorrect = userChoice === mcq.correctOptionIndex;

          if (isCorrect) {
            testScore += mcq.points;
          }

          feedbackByQuestion[mcq.id] = {
            questionId: mcq.id,
            score: isCorrect ? mcq.points : 0,
            maxScore: mcq.points,
            isCorrect,
            feedback: isCorrect
              ? '¡Respuesta correcta! Has identificado la opción exacta del temario.'
              : `Opción incorrecta. La respuesta correcta era la opción ${String.fromCharCode(
                  65 + mcq.correctOptionIndex
                )}.`,
            userAnswer: userChoice,
          };
        }
      }

      // 2. Grade Open questions with Gemini AI in parallel
      const openQuestions = currentExam.questions.filter((q) => q.type === 'open') as OpenQuestion[];
      
      if (openQuestions.length > 0) {
        setGradingProgressText(
          `Evaluando ${openQuestions.length} pregunta(s) de desarrollo con la IA...`
        );

        const openGradingPromises = openQuestions.map(async (oq) => {
          maxOpenScore += oq.points;
          const userAns = (answers[oq.id] as string) || '';
          const fb = await geminiService.gradeOpenAnswer(
            oq,
            userAns,
            currentExam.subject,
            currentExam.topic,
            currentExam.level
          );
          return { id: oq.id, fb };
        });

        const openGradedResults = await Promise.all(openGradingPromises);
        for (const res of openGradedResults) {
          openScore += res.fb.score;
          feedbackByQuestion[res.id] = res.fb;
        }
      }

      const totalScore = testScore + openScore;
      const maxPossibleScore = maxTestScore + maxOpenScore || 1;
      const percentage = Math.round((totalScore / maxPossibleScore) * 100);

      const newResult: ExamResult = {
        id: `result_${Date.now()}`,
        examId: currentExam.id,
        userId: user?.id || 'guest',
        userEmail: user?.email || undefined,
        userName: user?.name || undefined,
        examTitle: currentExam.title,
        subject: currentExam.subject,
        topic: currentExam.topic,
        level: currentExam.level,
        completedAt: new Date().toISOString(),
        totalScore,
        maxPossibleScore,
        percentage,
        testScore,
        maxTestScore,
        openScore,
        maxOpenScore,
        feedbackByQuestion,
        generalFeedback:
          percentage >= 80
            ? 'Gran comprensión de la materia y rigor terminológico.'
            : percentage >= 50
            ? 'Buen dominio de los conceptos esenciales, revisa los detalles específicos.'
            : 'Se recomienda repasar las fotos o apuntes del temario y repetir el examen.',
        examData: currentExam,
        userAnswers: answers,
      };

      // Save to history and sync with Firestore
      await historyService.saveResult(newResult);

      // If playing in a multiplayer room, record this participant's final score in real time
      if (activeRoomId && activeParticipantId) {
        try {
          await examRoomService.submitParticipantResult(
            activeRoomId,
            activeParticipantId,
            {
              score: totalScore,
              maxScore: maxPossibleScore,
              percentage,
              timeSpentSeconds,
            }
          );
        } catch (roomErr) {
          console.error('Error submitting room result:', roomErr);
        }
      }

      setCurrentResult(newResult);
      setActiveView('results');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      console.error('Error submitting exam:', err);
      alert('Error al calificar el examen: ' + (err.message || 'Ocurrió un fallo de conexión.'));
    } finally {
      setIsGrading(false);
      setGradingProgressText('');
    }
  };

  const handleRetakeExam = () => {
    if (currentExam) {
      setActiveView('exam');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setActiveView('create');
    }
  };

  const handleNewExam = () => {
    setCurrentExam(null);
    setCurrentResult(null);
    setPresetExamConfig(null);
    setPresetMaterials(null);
    setActiveView('create');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleGenerateExamFromNote = (note: StudyNote) => {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(note.contentMarkdown);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64Notes = btoa(binary);

    const noteMaterial: UploadedMaterial = {
      id: `mat_note_${Date.now()}`,
      name: `Apuntes_${note.subject.replace(/\s+/g, '_')}.txt`,
      type: 'text',
      mimeType: 'text/plain',
      base64Data: base64Notes,
      sizeBytes: bytes.byteLength,
    };

    setPresetExamConfig({
      subject: note.subject,
      topic: note.topic,
      level: note.level,
      difficulty: 'Media',
      testCount: 5,
      openCount: 2,
      timed: true,
      timeLimitMinutes: 20,
      additionalNotes: `Generar preguntas basadas en los siguientes conceptos clave de los apuntes: ${note.keyConcepts.map((k) => k.term).join(', ')}`,
    });
    setPresetMaterials([noteMaterial]);
    setActiveView('create');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectHistoryResult = (res: ExamResult) => {
    setCurrentResult(res);
    setCurrentExam(res.examData);
    setActiveView('results');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSignOut = () => {
    authService.signOut();
    setUser(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Top Navigation */}
      <Navbar
        user={user}
        activeView={activeView}
        onNavigate={(view) => {
          if (view === 'create') handleNewExam();
          else setActiveView(view);
        }}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onOpenAdmin={() => setIsAdminModalOpen(true)}
        onOpenRoomsModal={() => {
          setInitialRoomCode(null);
          setIsRoomLobbyOpen(true);
        }}
        onSignOut={handleSignOut}
      />

      {/* Main Container View */}
      <main className="flex-1 pb-16">
        {activeView === 'create' && (
          <ExamSetupForm
            onGenerate={handleGenerateExam}
            isLoading={isGenerating}
            onOpenAuthRequired={() => setIsAuthModalOpen(true)}
            isAuthenticated={Boolean(user)}
            initialConfig={presetExamConfig}
            initialMaterials={presetMaterials}
            onOpenJoinRoom={() => {
              setInitialRoomCode(null);
              setIsRoomLobbyOpen(true);
            }}
            onNavigateToHomework={() => setActiveView('homework')}
          />
        )}

        {activeView === 'notes' && (
          <StudyNotesView
            user={user}
            onOpenAuthRequired={() => setIsAuthModalOpen(true)}
            onGenerateExamFromNote={handleGenerateExamFromNote}
          />
        )}

        {activeView === 'homework' && (
          <HomeworkSolverView
            user={user}
            onNavigateToNotes={() => setActiveView('notes')}
            onNavigateToExam={() => setActiveView('create')}
          />
        )}

        {activeView === 'exam' && currentExam && (
          <ExamTaker
            exam={currentExam}
            onSubmit={handleSubmitExam}
            onCancel={handleNewExam}
            isGrading={isGrading}
            roomCode={activeRoomCode}
            onOpenFriendInvite={() => setIsRoomLobbyOpen(true)}
          />
        )}

        {activeView === 'results' && currentResult && (
          <ExamResults
            result={currentResult}
            onRetake={handleRetakeExam}
            onNewExam={handleNewExam}
            roomId={activeRoomId}
            roomCode={activeRoomCode}
            currentParticipantId={activeParticipantId}
          />
        )}

        {activeView === 'history' && (
          <ExamHistory
            userId={user?.id}
            onSelectResult={handleSelectHistoryResult}
            onNewExam={handleNewExam}
          />
        )}
      </main>

      {/* Multiplayer Room Lobby Modal */}
      <RoomLobbyModal
        isOpen={isRoomLobbyOpen}
        onClose={() => setIsRoomLobbyOpen(false)}
        user={user}
        examToHost={currentExam}
        initialRoomCode={initialRoomCode}
        onStartExamInRoom={handleStartExamInRoom}
      />

      {/* Global Grading Overlay Modal */}
      {isGrading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl border border-slate-100">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4">
              <div className="w-8 h-8 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">
              Evaluando tu Examen con IA
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-2 leading-relaxed">
              {gradingProgressText || 'Analizando tus respuestas y elaborando la rúbrica...'}
            </p>
          </div>
        </div>
      )}

      {/* Auth Modal (Google & Email/Password) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={(loggedUser) => setUser(loggedUser)}
      />

      {/* Admin Database & Users Viewer Modal */}
      <AdminDatabaseModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        currentUser={user}
      />

      {/* Clean Footer */}
      <footer className="border-t border-slate-200 bg-white/70 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>
            Generador de Exámenes con IA • Diseñado para ordenadores y dispositivos móviles
          </p>
          <p className="text-slate-400">
            Sube tus apuntes en foto o PDF para estudiar con preguntas personalizadas
          </p>
        </div>
      </footer>
    </div>
  );
}
