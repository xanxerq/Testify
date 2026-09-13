import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  Download,
  FileCheck,
  FileQuestion,
  HelpCircle,
  Lightbulb,
  Printer,
  Send,
  Sparkles,
  Users,
  Trophy,
} from 'lucide-react';
import { Exam, ExamQuestion, MultipleChoiceQuestion, OpenQuestion } from '../types';
import { exportExamToPrintablePdf } from '../utils/pdfExport';
import { usePdc } from '../context/PdcContext';
import { PdcAdaptationButton } from './PdcAdaptationButton';

interface ExamTakerProps {
  exam: Exam;
  onSubmit: (answers: Record<string, string | number>, timeSpentSeconds: number) => void;
  onCancel: () => void;
  isGrading: boolean;
  roomCode?: string | null;
  onOpenFriendInvite?: () => void;
  onStudyFlashcards?: (exam: Exam) => void;
}

export const ExamTaker: React.FC<ExamTakerProps> = ({
  exam,
  onSubmit,
  onCancel,
  isGrading,
  roomCode,
  onOpenFriendInvite,
  onStudyFlashcards,
}) => {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [showHint, setShowHint] = useState<boolean>(false);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [showPdfModal, setShowPdfModal] = useState<boolean>(false);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);

  const { isPdcActive } = usePdc();

  // Timer state
  const totalSeconds = (exam.timeLimitMinutes || 20) * 60;
  const [secondsRemaining, setSecondsRemaining] = useState<number>(totalSeconds);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(
    Boolean(exam.timeLimitMinutes && exam.timeLimitMinutes > 0)
  );

  useEffect(() => {
    if (!isTimerRunning) return;

    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleFinalSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isTimerRunning]);

  const currentQuestion: ExamQuestion = exam.questions[currentIndex] || exam.questions[0];

  const handleSelectOption = (index: number) => {
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: index,
    }));
  };

  const handleOpenAnswerChange = (text: string) => {
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: text,
    }));
  };

  // Count answered questions
  const answeredCount = exam.questions.filter((q) => {
    const val = answers[q.id];
    if (val === undefined || val === null) return false;
    if (typeof val === 'string') return val.trim().length > 0;
    return typeof val === 'number';
  }).length;

  const unansweredCount = exam.questions.length - answeredCount;

  const handleFinalSubmit = () => {
    setIsTimerRunning(false);
    setShowConfirmModal(false);
    const timeSpent = totalSeconds - secondsRemaining;
    onSubmit(answers, Math.max(timeSpent, 1));
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const isLowTime = isTimerRunning && secondsRemaining <= 180; // 3 mins or less

  const handleExportPdf = (includeSolutions: boolean) => {
    setIsExportingPdf(true);
    try {
      exportExamToPrintablePdf(exam, includeSolutions);
      setShowPdfModal(false);
    } catch (err) {
      console.error('Error generando PDF:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-8 animate-fadeIn">
      {/* Multiplayer Room Notification Banner */}
      {roomCode ? (
        <div className="mb-4 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-900 to-indigo-800 text-white flex items-center justify-between gap-3 text-xs sm:text-sm shadow-md border border-indigo-700">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-300 shrink-0" />
            <span className="font-bold">
              Reto Multijugador activo: <span className="font-mono text-amber-300">#{roomCode}</span>
            </span>
          </div>
          <span className="text-[11px] text-indigo-200 hidden sm:inline">
            ¡Completa el examen para ver el podio y quién queda en 1º lugar!
          </span>
        </div>
      ) : onOpenFriendInvite ? (
        <div className="mb-4 px-4 py-2 rounded-xl bg-indigo-50/70 border border-indigo-100 flex items-center justify-between text-xs text-indigo-900">
          <span className="flex items-center gap-1.5 font-medium">
            <Users className="w-4 h-4 text-indigo-600" />
            <span>¿Quieres competir contra tus compañeros con este examen?</span>
          </span>
          <button
            type="button"
            onClick={onOpenFriendInvite}
            className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors cursor-pointer"
          >
            Retar Amigos
          </button>
        </div>
      ) : null}

      {/* Top Header Card */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/60">
              {exam.subject}
            </span>
            <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
              {exam.level}
            </span>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
              Dificultad: {exam.difficulty}
            </span>
            {(exam.isPdcAdapted || isPdcActive) && (
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                <span>🎓</span>
                <span>Adaptación PDC</span>
              </span>
            )}
          </div>
          <h1 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
            {exam.title}
          </h1>
        </div>

        {/* Timer & Secondary actions & Submit controls */}
        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-between sm:justify-end flex-wrap">
          {/* PDC Adaptation Button */}
          <PdcAdaptationButton variant="pill" showTooltip={true} />

          {exam.timeLimitMinutes && exam.timeLimitMinutes > 0 ? (
            <div
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs sm:text-sm font-mono font-bold transition-colors ${
                isLowTime
                  ? 'bg-rose-50 border-rose-200 text-rose-700 animate-pulse'
                  : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
            >
              <Clock className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isLowTime ? 'text-rose-600' : 'text-slate-500'}`} />
              <span>{formatTime(secondsRemaining)}</span>
            </div>
          ) : null}

          {/* Flashcards Study Button */}
          {onStudyFlashcards && (
            <button
              type="button"
              onClick={() => onStudyFlashcards(exam)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80 text-xs font-bold rounded-xl transition-all shadow-xs"
              title="Estudia las preguntas de este examen como tarjetas didácticas interactivas"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span className="hidden xs:inline">Modo Flashcards</span>
            </button>
          )}

          {/* Export to PDF Button */}
          <button
            id="btn-download-exam-pdf"
            type="button"
            onClick={() => setShowPdfModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold rounded-xl shadow-xs transition-all"
            title="Descargar examen maquetado en PDF para imprimir o compartir"
          >
            <Download className="w-3.5 h-3.5 text-indigo-600" />
            <span>Exportar PDF</span>
          </button>

          <button
            id="btn-open-submit-modal"
            type="button"
            onClick={() => setShowConfirmModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-sm transition-all"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Entregar Examen</span>
          </button>
        </div>
      </div>

      {/* Question Progress Selector */}
      <div className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200 shadow-sm mb-6">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-2.5">
          <span>
            Pregunta {currentIndex + 1} de {exam.questions.length}
          </span>
          <span className="text-indigo-600 font-bold">
            {answeredCount} respondidas ({Math.round((answeredCount / exam.questions.length) * 100)}%)
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mb-3">
          <div
            className="h-full bg-indigo-600 transition-all duration-300 rounded-full"
            style={{ width: `${(answeredCount / exam.questions.length) * 100}%` }}
          />
        </div>

        {/* Question Index Pills */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 scrollbar-none">
          {exam.questions.map((q, idx) => {
            const isAnswered =
              answers[q.id] !== undefined &&
              answers[q.id] !== null &&
              answers[q.id].toString().trim().length > 0;
            const isCurrent = idx === currentIndex;

            return (
              <button
                key={q.id}
                type="button"
                onClick={() => {
                  setCurrentIndex(idx);
                  setShowHint(false);
                }}
                className={`min-w-[36px] h-9 rounded-xl text-xs font-bold flex items-center justify-center transition-all ${
                  isCurrent
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 scale-105'
                    : isAnswered
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Question Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm mb-6 min-h-[360px] flex flex-col justify-between">
        <div>
          {/* Question Tag & Points */}
          <div className="flex items-center justify-between gap-2 mb-4">
            <span
              className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                currentQuestion.type === 'multiple_choice'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200/60'
                  : 'bg-purple-50 text-purple-700 border border-purple-200/60'
              }`}
            >
              {currentQuestion.type === 'multiple_choice'
                ? 'Pregunta Tipo Test (1 respuesta)'
                : 'Pregunta de Desarrollo / Normal'}
            </span>

            <span className="text-xs font-extrabold text-slate-500">
              Valor: {currentQuestion.points}{' '}
              {currentQuestion.points === 1 ? 'punto' : 'puntos'}
            </span>
          </div>

          {/* Question Statement */}
          <h2 className="text-base sm:text-xl font-bold text-slate-900 leading-relaxed mb-6">
            {currentIndex + 1}. {currentQuestion.questionText}
          </h2>

          {/* Render Multiple Choice Options */}
          {currentQuestion.type === 'multiple_choice' && (
            <div className="space-y-3">
              {(currentQuestion as MultipleChoiceQuestion).options.map((option, optIdx) => {
                const isSelected = answers[currentQuestion.id] === optIdx;
                const letter = String.fromCharCode(65 + optIdx); // A, B, C, D

                return (
                  <div
                    key={optIdx}
                    onClick={() => handleSelectOption(optIdx)}
                    className={`flex items-center gap-3.5 p-3.5 sm:p-4 rounded-2xl border cursor-pointer select-none transition-all active:scale-[0.99] ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/70 shadow-sm ring-1 ring-indigo-600'
                        : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100 text-slate-800'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                        isSelected
                          ? 'bg-indigo-600 text-white'
                          : 'bg-white border border-slate-300 text-slate-600'
                      }`}
                    >
                      {isSelected ? <Check className="w-4 h-4" /> : letter}
                    </div>

                    <span
                      className={`text-sm sm:text-base font-medium leading-normal flex-1 ${
                        isSelected ? 'text-indigo-950 font-semibold' : 'text-slate-800'
                      }`}
                    >
                      {option}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Render Open / Development Question */}
          {currentQuestion.type === 'open' && (
            <div className="space-y-4">
              <div className="relative">
                <textarea
                  id={`open-answer-${currentQuestion.id}`}
                  rows={6}
                  value={(answers[currentQuestion.id] as string) || ''}
                  onChange={(e) => handleOpenAnswerChange(e.target.value)}
                  placeholder="Redacta tu respuesta de manera clara y fundamentada basándote en los conceptos del temario..."
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm sm:text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all resize-y leading-relaxed font-normal"
                />
                <div className="flex justify-between items-center text-[11px] text-slate-400 mt-1.5 px-1">
                  <span>
                    Consejo: Desarrolla los conceptos clave; la IA evaluará tu comprensión.
                  </span>
                  <span>
                    {((answers[currentQuestion.id] as string) || '').length} caracteres
                  </span>
                </div>
              </div>

              {/* Optional Hint Toggle */}
              {(currentQuestion as OpenQuestion).hint && (
                <div>
                  <button
                    type="button"
                    onClick={() => setShowHint(!showHint)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 hover:text-amber-800 transition-colors"
                  >
                    <Lightbulb className="w-3.5 h-3.5" />
                    <span>{showHint ? 'Ocultar pista' : '¿Necesitas una pista?'}</span>
                  </button>

                  {showHint && (
                    <div className="mt-2 p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs text-amber-900 leading-relaxed animate-fadeIn">
                      💡 <strong>Pista orientativa:</strong>{' '}
                      {(currentQuestion as OpenQuestion).hint}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Question Footer Navigation */}
        <div className="pt-6 border-t border-slate-100 flex items-center justify-between gap-3 mt-6">
          <button
            type="button"
            onClick={() => {
              if (currentIndex > 0) {
                setCurrentIndex(currentIndex - 1);
                setShowHint(false);
              }
            }}
            disabled={currentIndex === 0}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-xl text-slate-600 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Anterior</span>
          </button>

          {currentIndex < exam.questions.length - 1 ? (
            <button
              type="button"
              onClick={() => {
                setCurrentIndex(currentIndex + 1);
                setShowHint(false);
              }}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs sm:text-sm font-semibold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-all"
            >
              <span>Siguiente</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowConfirmModal(true)}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs sm:text-sm font-bold rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-all"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Finalizar y Corregir</span>
            </button>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-100">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
              <Send className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-slate-900">
              ¿Deseas entregar el examen ahora?
            </h3>

            {unansweredCount > 0 ? (
              <div className="my-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Aún te quedan <strong>{unansweredCount} preguntas</strong> sin responder.
                  ¿Seguro que deseas corregir el examen?
                </span>
              </div>
            ) : (
              <p className="text-xs sm:text-sm text-slate-500 my-2">
                Has respondido a todas las preguntas ({answeredCount} de {exam.questions.length}).
                La IA evaluará inmediatamente tus respuestas.
              </p>
            )}

            <div className="mt-6 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 text-xs sm:text-sm font-semibold hover:bg-slate-50 transition-colors"
              >
                Seguir respondiendo
              </button>

              <button
                id="btn-confirm-submit"
                type="button"
                disabled={isGrading}
                onClick={handleFinalSubmit}
                className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-indigo-600/20 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {isGrading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  'Entregar y corregir'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF Export Options Modal */}
      {showPdfModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">
                    Exportar Examen a PDF
                  </h3>
                  <p className="text-xs text-slate-500">
                    Maquetado limpio listo para imprimir en A4 o compartir digitalmente
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPdfModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 my-4">
              {/* Option 1: Full Exam + Solutions Sheet */}
              <button
                type="button"
                disabled={isExportingPdf}
                onClick={() => handleExportPdf(true)}
                className="w-full text-left p-4 rounded-2xl border-2 border-indigo-600/30 bg-indigo-50/40 hover:bg-indigo-50 hover:border-indigo-600 transition-all group flex items-start gap-3.5"
              >
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                  <FileCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900 group-hover:text-indigo-950">
                      Examen Completo + Plantilla de Soluciones
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-extrabold uppercase">
                      Recomendado
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Incluye todas las preguntas maquetadas con recuadros y renglones, más una página final con las respuestas correctas, justificaciones pedagógicas y rúbrica para corrección.
                  </p>
                </div>
              </button>

              {/* Option 2: Exam only (no solutions) */}
              <button
                type="button"
                disabled={isExportingPdf}
                onClick={() => handleExportPdf(false)}
                className="w-full text-left p-4 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all group flex items-start gap-3.5"
              >
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900 group-hover:text-slate-950">
                    Solo Enunciados (Sin Soluciones)
                  </div>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Ideal para profesores o estudiantes que deseen imprimir el examen en blanco para repartir en clase o realizar la prueba en papel sin ver las respuestas.
                  </p>
                </div>
              </button>
            </div>

            <div className="pt-2 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setShowPdfModal(false)}
                className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
