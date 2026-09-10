import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  HelpCircle,
  Layers,
  Lightbulb,
  Plus,
  RotateCcw,
  RotateCw,
  Shuffle,
  Sparkles,
  Trophy,
  Wand2,
} from 'lucide-react';
import { EducationalLevel, Exam, Flashcard, FlashcardDeck, UploadedMaterial, User } from '../types';
import { geminiService } from '../services/geminiService';

interface FlashcardsViewProps {
  initialDeck?: FlashcardDeck | null;
  initialExam?: Exam | null;
  initialSubject?: string | null;
  initialTopic?: string | null;
  initialLevel?: EducationalLevel | null;
  onNavigateToExam: (subject?: string, topic?: string, level?: EducationalLevel) => void;
  user?: User | null;
  onOpenAuthRequired?: () => void;
}

export const FlashcardsView: React.FC<FlashcardsViewProps> = ({
  initialDeck,
  initialExam,
  initialSubject,
  initialTopic,
  initialLevel,
  onNavigateToExam,
  user,
}) => {
  // Deck state: empty by default unless an initialDeck or initialExam is provided
  const [deck, setDeck] = useState<FlashcardDeck | null>(() => {
    if (initialDeck && initialDeck.cards.length > 0) return initialDeck;
    if (initialExam && initialExam.questions.length > 0) {
      return geminiService.convertExamToFlashcards(initialExam);
    }
    return null;
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [masteredCardIds, setMasteredCardIds] = useState<Set<string>>(new Set());

  // Form state for creating a deck
  const [genSubject, setGenSubject] = useState('');
  const [genTopic, setGenTopic] = useState('');
  const [genLevel, setGenLevel] = useState<EducationalLevel>('Bachillerato');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  useEffect(() => {
    if (initialDeck && initialDeck.cards.length > 0) {
      setDeck(initialDeck);
      setCurrentIndex(0);
      setIsFlipped(false);
      setShowHint(false);
      setMasteredCardIds(new Set());
    } else if (initialExam && initialExam.questions.length > 0) {
      const examDeck = geminiService.convertExamToFlashcards(initialExam);
      setDeck(examDeck);
      setCurrentIndex(0);
      setIsFlipped(false);
      setShowHint(false);
      setMasteredCardIds(new Set());
    }
  }, [initialDeck, initialExam]);

  useEffect(() => {
    if (initialSubject) setGenSubject(initialSubject);
    if (initialTopic) setGenTopic(initialTopic);
    if (initialLevel) setGenLevel(initialLevel);
  }, [initialSubject, initialTopic, initialLevel]);

  const cards = deck?.cards || [];
  const currentCard: Flashcard | undefined = cards[currentIndex];

  // Keyboard navigation for space bar to flip, left/right arrow to navigate
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        setIsFlipped((prev) => !prev);
      } else if (e.code === 'ArrowRight') {
        handleNextCard();
      } else if (e.code === 'ArrowLeft') {
        handlePrevCard();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, cards.length]);

  const handleNextCard = () => {
    if (currentIndex < cards.length - 1) {
      setIsFlipped(false);
      setShowHint(false);
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrevCard = () => {
    if (currentIndex > 0) {
      setIsFlipped(false);
      setShowHint(false);
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleToggleMastered = (cardId: string) => {
    setMasteredCardIds((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) {
        next.delete(cardId);
      } else {
        next.add(cardId);
        // Automatically advance to next card when marked as mastered
        if (currentIndex < cards.length - 1) {
          setTimeout(() => handleNextCard(), 300);
        }
      }
      return next;
    });
  };

  const handleShuffleDeck = () => {
    if (!deck) return;
    const shuffled = [...deck.cards].sort(() => Math.random() - 0.5);
    setDeck({ ...deck, cards: shuffled });
    setCurrentIndex(0);
    setIsFlipped(false);
    setShowHint(false);
  };

  const handleRestartDeck = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setShowHint(false);
    setMasteredCardIds(new Set());
  };

  const handleGenerateDeck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!genSubject.trim() || !genTopic.trim()) {
      setGenError('Por favor, indica la asignatura y el tema a repasar.');
      return;
    }

    try {
      setIsGeneratingAi(true);
      setGenError(null);

      const newDeck = await geminiService.generateFlashcards(
        genSubject.trim(),
        genTopic.trim(),
        genLevel,
        [],
        8
      );

      setDeck(newDeck);
      setCurrentIndex(0);
      setIsFlipped(false);
      setShowHint(false);
      setMasteredCardIds(new Set());
      setIsGeneratingModalOpen(false);
    } catch (err: any) {
      console.error('Error generating flashcards:', err);
      setGenError(err.message || 'Error al generar las tarjetas con IA.');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const masteredCount = masteredCardIds.size;
  const progressPercent = cards.length > 0 ? Math.round((masteredCount / cards.length) * 100) : 0;
  const isCurrentMastered = currentCard ? masteredCardIds.has(currentCard.id) : false;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10 animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-700" />
              <span>Modo Flashcards</span>
            </span>
            {deck?.subject && (
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/60 text-xs font-semibold">
                {deck.subject}
              </span>
            )}
            {deck?.level && (
              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-medium">
                {deck.level}
              </span>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            {deck?.title || 'Tarjetas de Estudio Interactivas'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Repasa y consolida los conceptos clave girando cada tarjeta antes de ponerte a prueba en el examen.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => {
              setGenSubject(deck?.subject || 'Biología y Geología');
              setGenTopic(deck?.topic || 'La Célula');
              setGenLevel(deck?.level || 'Bachillerato');
              setIsGeneratingModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs sm:text-sm font-bold border border-indigo-200 transition-colors"
          >
            <Wand2 className="w-4 h-4" />
            <span>Generar Nuevo Mazo</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigateToExam(deck?.subject, deck?.topic, deck?.level)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold shadow-sm shadow-indigo-200 transition-all hover:scale-[1.02] active:scale-95"
          >
            <GraduationCap className="w-4 h-4" />
            <span>Hacer Examen Tipo Test →</span>
          </button>
        </div>
      </div>

      {/* Progress & Controls Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Progress details */}
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center font-bold text-sm">
              {currentIndex + 1}/{cards.length}
            </div>
            <div>
              <div className="text-xs font-bold text-slate-800">
                Tarjeta {currentIndex + 1} de {cards.length}
              </div>
              <div className="text-[11px] text-slate-500 font-medium">
                {masteredCount} dominadas ({progressPercent}%)
              </div>
            </div>
          </div>

          <div className="hidden sm:block w-36 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Quick Shuffle & Reset */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={handleShuffleDeck}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold transition-colors"
            title="Mezclar el orden de las tarjetas"
          >
            <Shuffle className="w-3.5 h-3.5 text-slate-500" />
            <span>Mezclar</span>
          </button>
          <button
            type="button"
            onClick={handleRestartDeck}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold transition-colors"
            title="Reiniciar progreso del mazo"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>Reiniciar</span>
          </button>
        </div>
      </div>

      {/* The 3D Interactive Flashcard */}
      {currentCard ? (
        <div className="perspective-1000 mb-6">
          <div
            onClick={() => setIsFlipped((prev) => !prev)}
            className={`relative w-full min-h-[340px] sm:min-h-[380px] rounded-3xl p-6 sm:p-10 cursor-pointer select-none transition-all duration-500 shadow-md hover:shadow-xl border transform ${
              isFlipped
                ? 'bg-gradient-to-br from-indigo-900 to-slate-900 text-white border-indigo-700'
                : 'bg-white text-slate-900 border-slate-200 hover:border-indigo-300'
            }`}
          >
            {/* Header info inside card */}
            <div className="flex items-center justify-between gap-2 mb-6">
              <div className="flex items-center gap-2">
                <span
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                    isFlipped
                      ? 'bg-indigo-800/80 text-indigo-200 border border-indigo-700'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {currentCard.category || (isFlipped ? 'Respuesta / Explicación' : 'Pregunta / Concepto')}
                </span>
                {isCurrentMastered && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    <Check className="w-3 h-3" /> Dominada
                  </span>
                )}
              </div>

              <div
                className={`text-xs font-semibold flex items-center gap-1.5 ${
                  isFlipped ? 'text-indigo-300' : 'text-slate-400'
                }`}
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>{isFlipped ? 'Ver pregunta' : 'Clic para voltear'}</span>
              </div>
            </div>

            {/* Card Content (Front vs Back) */}
            <div className="flex flex-col justify-center min-h-[190px] text-center px-2 sm:px-6">
              {!isFlipped ? (
                <div>
                  <div className="text-xs uppercase font-bold text-indigo-600 tracking-wider mb-2">
                    Anverso • Pregunta
                  </div>
                  <h2 className="text-lg sm:text-2xl font-bold text-slate-900 leading-snug">
                    {currentCard.front}
                  </h2>

                  {/* Hint section */}
                  {currentCard.hint && (
                    <div className="mt-6">
                      {showHint ? (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 text-xs text-left max-w-md animate-fadeIn">
                          <Lightbulb className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>Pista: {currentCard.hint}</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowHint(true);
                          }}
                          className="inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-semibold underline underline-offset-4"
                        >
                          <HelpCircle className="w-3.5 h-3.5" />
                          <span>Ver pista orientativa</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="animate-fadeIn">
                  <div className="text-xs uppercase font-bold text-emerald-400 tracking-wider mb-2">
                    Reverso • Respuesta y Explicación
                  </div>
                  <div className="text-base sm:text-xl font-medium text-slate-100 leading-relaxed max-w-2xl mx-auto whitespace-pre-line text-left sm:text-center">
                    {currentCard.back}
                  </div>
                </div>
              )}
            </div>

            {/* Card Footer status info */}
            <div className="mt-6 pt-4 border-t border-slate-100/20 flex items-center justify-between text-xs">
              <span className={isFlipped ? 'text-indigo-300/80' : 'text-slate-400'}>
                {currentIndex + 1} de {cards.length}
              </span>
              <span className={isFlipped ? 'text-indigo-300/80' : 'text-slate-400'}>
                Barra espaciadora o clic para girar
              </span>
            </div>
          </div>
        </div>
      ) : null}

      {/* Bottom Controls: Navigation and Mastery */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Previous button */}
        <button
          type="button"
          onClick={handlePrevCard}
          disabled={currentIndex === 0}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-bold shadow-xs disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Anterior</span>
        </button>

        {/* Mastery Toggle Button */}
        {currentCard && (
          <button
            type="button"
            onClick={() => handleToggleMastered(currentCard.id)}
            className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-sm ${
              isCurrentMastered
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200'
            }`}
          >
            <CheckCircle2 className={`w-4 h-4 ${isCurrentMastered ? 'text-white' : 'text-emerald-600'}`} />
            <span>{isCurrentMastered ? 'Tarjeta Dominada' : 'Marcar como Dominada (Lo sé)'}</span>
          </button>
        )}

        {/* Next button */}
        <button
          type="button"
          onClick={handleNextCard}
          disabled={currentIndex === cards.length - 1}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          <span>Siguiente</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Completion Banner */}
      {progressPercent === 100 && cards.length > 0 && (
        <div className="mt-8 p-6 rounded-3xl bg-emerald-50 border border-emerald-200 text-center animate-fadeIn">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-3">
            <Trophy className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-emerald-950">
            ¡Enhorabuena! Has dominado todas las tarjetas
          </h3>
          <p className="text-xs sm:text-sm text-emerald-800 mt-1 max-w-md mx-auto">
            Tienes los conceptos de este tema perfectamente claros. Es el momento ideal para realizar el examen de prueba.
          </p>
          <div className="mt-4 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleRestartDeck}
              className="px-4 py-2 rounded-xl bg-white border border-emerald-300 text-emerald-800 text-xs sm:text-sm font-bold hover:bg-emerald-100 transition-colors"
            >
              Volver a repasar
            </button>
            <button
              type="button"
              onClick={() => onNavigateToExam(deck?.subject, deck?.topic, deck?.level)}
              className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs sm:text-sm font-bold shadow-sm transition-all"
            >
              Hacer Examen Tipo Test 🚀
            </button>
          </div>
        </div>
      )}

      {/* Modal: Generar nuevo mazo de tarjetas con IA */}
      {isGeneratingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  Generar Tarjetas de Estudio con IA
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsGeneratingModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            {genError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 text-rose-800 text-xs border border-rose-200">
                {genError}
              </div>
            )}

            <form onSubmit={handleGenerateDeck} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Materia / Asignatura
                </label>
                <input
                  type="text"
                  required
                  value={genSubject}
                  onChange={(e) => setGenSubject(e.target.value)}
                  placeholder="Ej. Biología Celular, Historia de España, Inglés..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Tema específico
                </label>
                <input
                  type="text"
                  required
                  value={genTopic}
                  onChange={(e) => setGenTopic(e.target.value)}
                  placeholder="Ej. Fotosíntesis y Respiración, Guerra Fría, Sintaxis..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nivel Educativo
                </label>
                <select
                  value={genLevel}
                  onChange={(e) => setGenLevel(e.target.value as EducationalLevel)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                >
                  <option value="Primaria">Primaria (6 - 12 años)</option>
                  <option value="Secundaria (ESO)">Secundaria (ESO)</option>
                  <option value="Bachillerato">Bachillerato / Selectividad</option>
                  <option value="Formación Profesional">Formación Profesional</option>
                  <option value="Universidad / Grado">Universidad / Grado</option>
                  <option value="Máster / Oposiciones">Máster / Oposiciones</option>
                </select>
              </div>

              {/* Quick Preset Buttons */}
              <div className="pt-1">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Sugerencias rápidas:
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_SUBJECTS.slice(0, 5).map((qs) => (
                    <button
                      key={qs.id}
                      type="button"
                      onClick={() => {
                        setGenSubject(qs.name);
                        setGenTopic(qs.topics[0]?.title || '');
                        setGenLevel(qs.defaultLevel);
                      }}
                      className="px-2 py-1 text-xs rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 transition-colors"
                    >
                      {qs.icon} {qs.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsGeneratingModalOpen(false)}
                  className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isGeneratingAi}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-sm disabled:opacity-50 transition-all"
                >
                  {isGeneratingAi ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Generando con IA...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Generar 8 Tarjetas</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
