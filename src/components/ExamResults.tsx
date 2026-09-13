import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  AlertCircle,
  Award,
  CheckCircle2,
  ChevronDown,
  Clock,
  Download,
  FileCheck,
  GraduationCap,
  HelpCircle,
  PlusCircle,
  Printer,
  RotateCcw,
  Sparkles,
  TrendingUp,
  XCircle,
  Users,
} from 'lucide-react';
import { Exam, ExamResult, MultipleChoiceQuestion, OpenQuestion } from '../types';
import { RoomLeaderboard } from './RoomLeaderboard';
import { exportExamResultToPdf } from '../utils/pdfExport';
import { usePdc } from '../context/PdcContext';
import { PdcAdaptationButton } from './PdcAdaptationButton';

interface ExamResultsProps {
  result: ExamResult;
  onRetake: () => void;
  onNewExam: () => void;
  roomId?: string | null;
  roomCode?: string | null;
  currentParticipantId?: string | null;
  onStudyFlashcards?: (exam: Exam) => void;
}

export const ExamResults: React.FC<ExamResultsProps> = ({
  result,
  onRetake,
  onNewExam,
  roomId,
  roomCode,
  currentParticipantId,
  onStudyFlashcards,
}) => {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfSuccess, setPdfSuccess] = useState(false);
  const { isPdcActive } = usePdc();

  useEffect(() => {
    // Trigger celebratory confetti if passed
    if (result.percentage >= 60) {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#4f46e5', '#7c3aed', '#10b981', '#f59e0b'],
      });
    }
  }, [result.percentage]);

  const scoreOutOfTen = Math.round((result.totalScore / result.maxPossibleScore) * 100) / 10;

  const getGradeInfo = (score: number) => {
    if (score >= 9) {
      return {
        label: 'Sobresaliente',
        color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
        badge: '🏆',
        message: '¡Excelente dominio del temario! Tus conceptos están muy consolidados.',
      };
    }
    if (score >= 7) {
      return {
        label: 'Notable',
        color: 'text-indigo-700 bg-indigo-50 border-indigo-200',
        badge: '⭐',
        message: '¡Buen trabajo! Tienes una sólida base con pequeños detalles a perfeccionar.',
      };
    }
    if (score >= 5) {
      return {
        label: 'Aprobado',
        color: 'text-amber-700 bg-amber-50 border-amber-200',
        badge: '👍',
        message: 'Has superado el examen. Conviene repasar las preguntas falladas.',
      };
    }
    return {
      label: 'Necesita Repaso',
      color: 'text-rose-700 bg-rose-50 border-rose-200',
      badge: '📚',
      message: 'No te desanimes. Revisa las explicaciones de la IA y vuelve a intentarlo.',
    };
  };

  const gradeInfo = getGradeInfo(scoreOutOfTen);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10 animate-fadeIn">
      {/* Header Summary Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm mb-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-6 border-b border-slate-100">
          <div className="text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold mb-2 flex-wrap">
              <span>{result.subject}</span>
              <span>•</span>
              <span>{result.level}</span>
              {(result.examData?.isPdcAdapted || isPdcActive) && (
                <>
                  <span>•</span>
                  <span className="text-amber-800 font-bold bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300 flex items-center gap-1">
                    <span>🎓</span> Adaptado a PDC
                  </span>
                </>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              {result.examTitle}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Completado el {new Date(result.completedAt).toLocaleDateString('es-ES', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>

          {/* Big Score Badge */}
          <div className="flex items-center gap-4 bg-gradient-to-br from-slate-50 to-indigo-50/40 p-4 rounded-2xl border border-slate-200/80">
            <div className="text-center">
              <div className="text-3xl sm:text-4xl font-extrabold text-indigo-950 font-mono tracking-tight">
                {scoreOutOfTen.toFixed(1)}
                <span className="text-base text-slate-400 font-normal"> / 10</span>
              </div>
              <div className="text-xs font-semibold text-slate-500 mt-0.5">
                {result.percentage}% acierto
              </div>
            </div>

            <div
              className={`px-3.5 py-2 rounded-xl border text-xs sm:text-sm font-bold flex items-center gap-1.5 ${gradeInfo.color}`}
            >
              <span>{gradeInfo.badge}</span>
              <span>{gradeInfo.label}</span>
            </div>
          </div>
        </div>

        {/* Breakdown Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70">
            <div className="text-xs text-slate-500 font-semibold mb-1">
              Puntuación Total
            </div>
            <div className="text-lg font-bold text-slate-900 font-mono">
              {result.totalScore.toFixed(1)} / {result.maxPossibleScore} pts
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Suma ponderada de todo el examen
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100">
            <div className="text-xs text-blue-700 font-semibold mb-1">
              Preguntas Tipo Test
            </div>
            <div className="text-lg font-bold text-blue-950 font-mono">
              {result.testScore} / {result.maxTestScore} pts
            </div>
            <div className="text-[11px] text-blue-600/80 mt-0.5">
              {result.maxTestScore > 0
                ? `${Math.round((result.testScore / result.maxTestScore) * 100)}% de acierto test`
                : 'Sin preguntas test'}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-100">
            <div className="text-xs text-purple-700 font-semibold mb-1">
              Desarrollo (Evaluación IA)
            </div>
            <div className="text-lg font-bold text-purple-950 font-mono">
              {result.openScore.toFixed(1)} / {result.maxOpenScore} pts
            </div>
            <div className="text-[11px] text-purple-600/80 mt-0.5">
              {result.maxOpenScore > 0
                ? `${Math.round((result.openScore / result.maxOpenScore) * 100)}% rúbrica IA`
                : 'Sin preguntas de desarrollo'}
            </div>
          </div>
        </div>

        {/* General Feedback Quote */}
        <div className="mt-5 p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 text-xs sm:text-sm text-indigo-900 flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Valoración Pedagógica Global:</p>
            <p className="mt-0.5 text-indigo-800 leading-relaxed">
              {gradeInfo.message} {result.generalFeedback}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="mt-6 pt-5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* PRIMER BOTÓN DE TODOS: Adaptación PDC */}
            <PdcAdaptationButton variant="pill" showTooltip={true} />

            <button
              id="btn-retake-exam"
              type="button"
              onClick={onRetake}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs sm:text-sm rounded-xl transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Repetir examen</span>
            </button>

            <button
              id="btn-download-pdf-exam"
              type="button"
              disabled={isGeneratingPdf}
              onClick={() => {
                try {
                  setIsGeneratingPdf(true);
                  exportExamResultToPdf(result, roomCode);
                  setPdfSuccess(true);
                  setTimeout(() => setPdfSuccess(false), 3000);
                } catch (e) {
                  console.error(e);
                  window.print();
                } finally {
                  setIsGeneratingPdf(false);
                }
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-xs sm:text-sm rounded-xl transition-all shadow-xs cursor-pointer"
            >
              <Download className="w-4 h-4 text-indigo-600" />
              <span>
                {pdfSuccess
                  ? '¡PDF Descargado!'
                  : isGeneratingPdf
                  ? 'Generando PDF...'
                  : 'Descargar PDF (con corrección y nota)'}
              </span>
            </button>

            {onStudyFlashcards && (
              <button
                type="button"
                onClick={() => onStudyFlashcards(result.examData)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80 font-bold text-xs sm:text-sm rounded-xl transition-all shadow-xs cursor-pointer"
                title="Estudiar las preguntas y respuestas de este examen con tarjetas interactivas de memoria"
              >
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>Repasar con Flashcards</span>
              </button>
            )}

            <button
              id="btn-print-exam"
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs sm:text-sm rounded-xl transition-colors cursor-pointer"
              title="Imprimir informe en papel o guardar en PDF del navegador"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-new-exam"
              type="button"
              onClick={onNewExam}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-sm transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Crear Nuevo Examen</span>
            </button>
          </div>
        </div>
      </div>

      {/* If exam was taken with friends: Show Live Room Leaderboard */}
      {roomId && (
        <RoomLeaderboard
          roomId={roomId}
          currentUserId={currentParticipantId || result.userId}
        />
      )}

      {/* Detailed Question By Question Correction */}
      <div className="space-y-6">
        <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <FileCheck className="w-5 h-5 text-indigo-600" />
          <span>Corrección Detallada Pregunta a Pregunta</span>
        </h2>

        {result.examData.questions.map((question, idx) => {
          const feedback = result.feedbackByQuestion[question.id];
          const userAnswer = result.userAnswers[question.id];
          const isTest = question.type === 'multiple_choice';

          if (isTest) {
            const mcq = question as MultipleChoiceQuestion;
            const selectedIdx = typeof userAnswer === 'number' ? userAnswer : -1;
            const isCorrect = selectedIdx === mcq.correctOptionIndex;

            return (
              <div
                key={question.id}
                className={`bg-white rounded-2xl p-5 sm:p-6 border shadow-xs transition-all ${
                  isCorrect ? 'border-emerald-200' : 'border-rose-200'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        isCorrect
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Pregunta Tipo Test
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {isCorrect ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Correcta (+{question.points} pt)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                        <XCircle className="w-3.5 h-3.5" /> Incorrecta (0 pts)
                      </span>
                    )}
                  </div>
                </div>

                <h3 className="text-sm sm:text-base font-bold text-slate-900 mb-4">
                  {question.questionText}
                </h3>

                {/* Options List with Answers */}
                <div className="space-y-2 mb-4">
                  {mcq.options.map((opt, optIdx) => {
                    const isUserChoice = selectedIdx === optIdx;
                    const isRightOption = mcq.correctOptionIndex === optIdx;
                    const letter = String.fromCharCode(65 + optIdx);

                    let itemStyle = 'border-slate-200 bg-slate-50/60 text-slate-700';
                    if (isRightOption) {
                      itemStyle = 'border-emerald-500 bg-emerald-50/70 text-emerald-950 font-semibold ring-1 ring-emerald-500';
                    } else if (isUserChoice && !isCorrect) {
                      itemStyle = 'border-rose-400 bg-rose-50/70 text-rose-950 line-through opacity-90';
                    }

                    return (
                      <div
                        key={optIdx}
                        className={`flex items-center justify-between p-3 rounded-xl border text-xs sm:text-sm ${itemStyle}`}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                              isRightOption
                                ? 'bg-emerald-600 text-white'
                                : isUserChoice
                                ? 'bg-rose-600 text-white'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {letter}
                          </span>
                          <span>{opt}</span>
                        </div>

                        <div className="flex items-center gap-1.5 text-xs font-bold shrink-0">
                          {isUserChoice && !isRightOption && (
                            <span className="text-rose-600">Tu respuesta</span>
                          )}
                          {isRightOption && (
                            <span className="text-emerald-700">Respuesta correcta</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* AI Explanation Box */}
                {mcq.explanation && (
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed">
                    <span className="font-bold text-slate-900">💡 Explicación del temario: </span>
                    {mcq.explanation}
                  </div>
                )}
              </div>
            );
          }

          // Open Question correction
          const openQ = question as OpenQuestion;
          const userText = (userAnswer as string) || '';
          const earnedScore = feedback?.score ?? 0;
          const maxScore = question.points;
          const scorePercent = (earnedScore / maxScore) * 100;

          return (
            <div
              key={question.id}
              className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-bold">
                    {idx + 1}
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Pregunta de Desarrollo (Normal)
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span
                    className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                      scorePercent >= 70
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : scorePercent >= 40
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}
                  >
                    Calificación IA: {earnedScore.toFixed(1)} / {maxScore} pts
                  </span>
                </div>
              </div>

              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                {question.questionText}
              </h3>

              {/* Student's answer */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Tu respuesta redactada:
                </div>
                {userText.trim() ? (
                  <p className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                    {userText}
                  </p>
                ) : (
                  <p className="text-xs text-rose-600 italic">
                    (No respondiste a esta pregunta en el examen)
                  </p>
                )}
              </div>

              {/* AI Feedback & Rubric */}
              {feedback && (
                <div className="p-4 rounded-xl bg-purple-50/60 border border-purple-100 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-purple-900">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    <span>Devolución del profesor IA:</span>
                  </div>
                  <p className="text-xs sm:text-sm text-purple-950 leading-relaxed">
                    {feedback.feedback}
                  </p>

                  {/* Strengths & Improvements */}
                  {(feedback.strengths && feedback.strengths.length > 0) ||
                  (feedback.improvements && feedback.improvements.length > 0) ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-purple-200/50">
                      {feedback.strengths && feedback.strengths.length > 0 && (
                        <div className="space-y-1">
                          <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                            Puntos fuertes:
                          </span>
                          <ul className="text-xs text-emerald-900 space-y-1 list-disc list-inside">
                            {feedback.strengths.map((s, sIdx) => (
                              <li key={sIdx}>{s}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {feedback.improvements && feedback.improvements.length > 0 && (
                        <div className="space-y-1">
                          <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">
                            Para mejorar:
                          </span>
                          <ul className="text-xs text-amber-900 space-y-1 list-disc list-inside">
                            {feedback.improvements.map((imp, impIdx) => (
                              <li key={impIdx}>{imp}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              )}

              {/* Sample Model Answer from Syllabus */}
              {openQ.sampleAnswer && (
                <details className="group p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs cursor-pointer">
                  <summary className="font-bold text-slate-800 flex items-center justify-between select-none">
                    <span>📖 Ver respuesta modelo esperada según el temario</span>
                    <ChevronDown className="w-4 h-4 text-slate-500 transition-transform group-open:rotate-180" />
                  </summary>
                  <p className="mt-2 text-slate-700 leading-relaxed border-t border-slate-200/60 pt-2 whitespace-pre-wrap">
                    {openQ.sampleAnswer}
                  </p>
                </details>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
