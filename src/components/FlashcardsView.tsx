import React, { useState, useEffect, useRef } from 'react';
import Markdown from 'react-markdown';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Bot,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  HelpCircle,
  Layers,
  Lightbulb,
  MessageSquare,
  Plus,
  RotateCcw,
  RotateCw,
  Send,
  Shuffle,
  Sparkles,
  Trophy,
  Wand2,
  X,
} from 'lucide-react';
import { EducationalLevel, Exam, Flashcard, FlashcardDeck, User } from '../types';
import { geminiService } from '../services/geminiService';
import { usePdc } from '../context/PdcContext';
import { PdcAdaptationButton } from './PdcAdaptationButton';

interface FlashcardsViewProps {
  initialDeck?: FlashcardDeck | null;
  initialExam?: Exam | null;
  initialSubject?: string | null;
  initialTopic?: string | null;
  initialLevel?: EducationalLevel | null;
  onNavigateToExam: (subject?: string, topic?: string, level?: EducationalLevel) => void;
  user?: User | null;
  onOpenAuthRequired?: () => void;
  onOpenChatbot?: (subject?: string, topic?: string) => void;
}

const EDUCATIONAL_LEVELS: EducationalLevel[] = [
  'Secundaria (ESO)',
  'Bachillerato',
  'Preparación PAU / EBAU',
  'Universidad / Grado',
  'Formación Profesional',
  'Primaria',
  'Máster / Oposiciones',
];

export const FlashcardsView: React.FC<FlashcardsViewProps> = ({
  initialDeck,
  initialExam,
  initialSubject,
  initialTopic,
  initialLevel,
  onNavigateToExam,
  user,
  onOpenChatbot,
}) => {
  // Deck state: completely empty (null) by default unless passed from an active exam
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

  // Form state for creating a deck - completely empty inputs for the user to fill
  const [subject, setSubject] = useState(initialSubject || '');
  const [topic, setTopic] = useState(initialTopic || '');
  const [level, setLevel] = useState<EducationalLevel>(initialLevel || 'Bachillerato');
  const [cardCount, setCardCount] = useState(8);
  const [additionalInstructions, setAdditionalInstructions] = useState('');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const { isPdcActive } = usePdc();

  // Integrated Chatbot modal / side panel state
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ id: string; role: 'user' | 'model'; content: string }>>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

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
    if (initialSubject) setSubject(initialSubject);
    if (initialTopic) setTopic(initialTopic);
    if (initialLevel) setLevel(initialLevel);
  }, [initialSubject, initialTopic, initialLevel]);

  const cards = deck?.cards || [];
  const currentCard: Flashcard | undefined = cards[currentIndex];

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (!deck || cards.length === 0) return;

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
  }, [currentIndex, cards.length, deck]);

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

  const handleCreateDeck = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanSubject = subject.trim();
    const cleanTopic = topic.trim();

    if (!cleanSubject) {
      setFormError('Por favor, escribe la asignatura.');
      return;
    }

    if (!cleanTopic) {
      setFormError('Por favor, indica el tema o contenido que quieres estudiar.');
      return;
    }

    try {
      setIsGeneratingAi(true);
      setFormError(null);

      const newDeck = await geminiService.generateFlashcards(
        cleanSubject,
        cleanTopic,
        level,
        [],
        cardCount,
        additionalInstructions.trim(),
        isPdcActive
      );

      setDeck(newDeck);
      setCurrentIndex(0);
      setIsFlipped(false);
      setShowHint(false);
      setMasteredCardIds(new Set());
    } catch (err: any) {
      console.error('Error generating flashcards:', err);
      setFormError(err.message || 'Error al generar las tarjetas con IA.');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // Quick doubt question to integrated chatbot
  const handleSendChatQuestion = async (queryText?: string) => {
    const text = (queryText || chatInput).trim();
    if (!text || isChatLoading) return;

    setChatInput('');
    const userMsg = { id: `u_${Date.now()}`, role: 'user' as const, content: text };
    const nextList = [...chatMessages, userMsg];
    setChatMessages(nextList);
    setIsChatLoading(true);

    try {
      const botReply = await geminiService.askChatbot(
        nextList.map((m) => ({ role: m.role, content: m.content })),
        deck?.subject || subject,
        deck?.level || level,
        deck?.topic || topic
      );

      setChatMessages((prev) => [
        ...prev,
        { id: `b_${Date.now()}`, role: 'model' as const, content: botReply },
      ]);
    } catch (err: any) {
      setChatMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: 'model' as const,
          content: 'Lo siento, no pude procesar la duda en este momento. Inténtalo de nuevo.',
        },
      ]);
    } finally {
      setIsChatLoading(false);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  };

  const masteredCount = masteredCardIds.size;
  const progressPercent = cards.length > 0 ? Math.round((masteredCount / cards.length) * 100) : 0;
  const isCurrentMastered = currentCard ? masteredCardIds.has(currentCard.id) : false;

  // VIEW 1: Empty state -> Clean form to create deck
  if (!deck || deck.cards.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12 animate-fadeIn">
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-sm space-y-6">
          {/* Header */}
          <div className="text-center pb-2 border-b border-slate-100">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 text-white flex items-center justify-center mx-auto mb-3 shadow-md shadow-amber-200">
              <Sparkles className="w-7 h-7" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Crear Mazo de Flashcards
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-md mx-auto">
              Escribe tu asignatura y tema para generar tarjetas interactivas de estudio activo y memoria espaciada con IA.
            </p>
            <div className="flex justify-center mt-3">
              <PdcAdaptationButton variant="pill" showTooltip={true} />
            </div>
          </div>

          {formError && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
              {formError}
            </div>
          )}

          {/* Creation Form */}
          <form onSubmit={handleCreateDeck} className="space-y-5">
            {/* Asignatura */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Materia / Asignatura <span className="text-rose-500">*</span>
              </label>
              <input
                id="flashcard-subject-input"
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Escribe la asignatura (ej. Biología, Historia, Matemáticas, Filosofía...)"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all"
              />
            </div>

            {/* Tema */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Tema específico a repasar <span className="text-rose-500">*</span>
              </label>
              <input
                id="flashcard-topic-input"
                type="text"
                required
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Escribe el tema (ej. La Célula, La Segunda Guerra Mundial, Sintaxis, Derivadas...)"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all"
              />
            </div>

            {/* Nivel Educativo y Cantidad de tarjetas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Nivel Educativo
                </label>
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value as EducationalLevel)}
                  className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
                >
                  {EDUCATIONAL_LEVELS.map((lvl) => (
                    <option key={lvl} value={lvl}>
                      {lvl}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Cantidad de Tarjetas
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[5, 8, 10, 15].map((cnt) => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => setCardCount(cnt)}
                      className={`py-2.5 text-xs font-bold rounded-xl border transition-all ${
                        cardCount === cnt
                          ? 'border-amber-500 bg-amber-500 text-white shadow-xs'
                          : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      {cnt}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Instrucciones opcionales */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Instrucciones adicionales o enfoque (Opcional)
              </label>
              <input
                type="text"
                value={additionalInstructions}
                onChange={(e) => setAdditionalInstructions(e.target.value)}
                placeholder="Ej. Enfocar en fechas clave, fórmulas prácticas o definiciones de examen..."
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
              />
            </div>

            {/* PDC Curricular Adaptation Option Card */}
            <PdcAdaptationButton variant="card" showTooltip={true} />

            {/* Submit Button */}
            <div className="pt-3">
              <button
                id="btn-create-flashcard-deck"
                type="submit"
                disabled={isGeneratingAi}
                className="w-full py-4 px-6 bg-gradient-to-r from-amber-500 via-amber-600 to-indigo-600 hover:from-amber-600 hover:to-indigo-700 text-white font-extrabold rounded-2xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 text-sm sm:text-base disabled:opacity-50 cursor-pointer"
              >
                {isGeneratingAi ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Creando {cardCount} tarjetas con IA...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span>Crear Mazo con IA</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Quick info card about Chatbot without photos */}
          <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-indigo-950 block">
                  ¿Tienes dudas de teoría o ejercicios?
                </span>
                <span className="text-slate-600">
                  Usa nuestro Chatbot IA para preguntar directamente sin subir fotos.
                </span>
              </div>
            </div>
            {onOpenChatbot && (
              <button
                type="button"
                onClick={() => onOpenChatbot(subject, topic)}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shrink-0 shadow-xs"
              >
                Abrir Chatbot IA
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // VIEW 2: Active Deck Study Mode
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10 animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
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
            {(deck?.isPdcAdapted || isPdcActive) && (
              <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold flex items-center gap-1">
                <span>🎓</span>
                <span>Adaptación PDC</span>
              </span>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            {deck?.title || `Tarjetas: ${deck.subject} - ${deck.topic}`}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Pulsa en la tarjeta o presiona la barra espaciadora para voltear y ver la solución explicada.
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* PDC Toggle Button */}
          <PdcAdaptationButton variant="pill" showTooltip={true} />

          {/* Ask Chatbot AI */}
          <button
            type="button"
            onClick={() => setIsChatOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs sm:text-sm font-bold border border-indigo-200 transition-colors shadow-2xs"
            title="Preguntar cualquier duda al tutor IA sin subir fotos"
          >
            <Bot className="w-4 h-4 text-indigo-600" />
            <span>Chatbot IA</span>
          </button>

          {/* New Deck */}
          <button
            type="button"
            onClick={() => {
              setDeck(null);
              setSubject('');
              setTopic('');
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-bold border border-slate-200 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Crear Mazo</span>
          </button>

          {/* Take Exam */}
          <button
            type="button"
            onClick={() => onNavigateToExam(deck.subject, deck.topic, deck.level)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold shadow-sm shadow-indigo-200 transition-all hover:scale-[1.02] active:scale-95"
          >
            <GraduationCap className="w-4 h-4" />
            <span>Hacer Examen →</span>
          </button>
        </div>
      </div>

      {/* Progress & Controls Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
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
            title="Mezclar orden"
          >
            <Shuffle className="w-3.5 h-3.5 text-slate-500" />
            <span>Mezclar</span>
          </button>
          <button
            type="button"
            onClick={handleRestartDeck}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold transition-colors"
            title="Reiniciar progreso"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>Reiniciar</span>
          </button>
        </div>
      </div>

      {/* The 3D Interactive Flashcard */}
      {currentCard && (
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
                <span>{isFlipped ? 'Ver anverso' : 'Clic para voltear'}</span>
              </div>
            </div>

            {/* Card Content (Front vs Back) */}
            <div className="flex flex-col justify-center min-h-[190px] text-center px-2 sm:px-6">
              {!isFlipped ? (
                <div>
                  <div className="text-xs uppercase font-bold text-amber-600 tracking-wider mb-2">
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
                          className="inline-flex items-center gap-1.5 text-xs text-amber-700 hover:text-amber-800 font-semibold underline underline-offset-4"
                        >
                          <HelpCircle className="w-3.5 h-3.5" />
                          <span>Ver pista</span>
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
                  <div className="text-base sm:text-lg font-medium text-slate-100 leading-relaxed max-w-2xl mx-auto whitespace-pre-line text-left sm:text-center">
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
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsChatOpen(true);
                  handleSendChatQuestion(`Tengo dudas con esta tarjeta de ${deck.subject}: "${currentCard.front}". ¿Me lo explicas con más detalle?`);
                }}
                className={`inline-flex items-center gap-1 font-semibold ${
                  isFlipped ? 'text-indigo-300 hover:text-white' : 'text-indigo-600 hover:text-indigo-800'
                }`}
              >
                <Bot className="w-3.5 h-3.5" />
                <span>Preguntar duda de esta tarjeta</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Controls: Navigation and Mastery */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <button
          type="button"
          onClick={handlePrevCard}
          disabled={currentIndex === 0}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-bold shadow-xs disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Anterior</span>
        </button>

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

      {/* Completion Trophy Banner */}
      {progressPercent === 100 && cards.length > 0 && (
        <div className="mt-8 p-6 rounded-3xl bg-emerald-50 border border-emerald-200 text-center animate-fadeIn">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-3">
            <Trophy className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-emerald-950">
            ¡Enhorabuena! Has dominado todas las tarjetas
          </h3>
          <p className="text-xs sm:text-sm text-emerald-800 mt-1 max-w-md mx-auto">
            Tienes los conceptos de este tema perfectamente afianzados. Es el momento perfecto para ponerte a prueba con el examen.
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
              onClick={() => onNavigateToExam(deck.subject, deck.topic, deck.level)}
              className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs sm:text-sm font-bold shadow-sm transition-all"
            >
              Hacer Examen Tipo Test 🚀
            </button>
          </div>
        </div>
      )}

      {/* Slide-over or Modal Chatbot Assistant Panel */}
      {isChatOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white w-full max-w-md h-full shadow-2xl border-l border-slate-200 flex flex-col p-5 animate-slideLeft">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Tutor IA • {deck.subject}
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    Responde dudas directamente sin fotos
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsChatOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Chat conversation area */}
            <div className="flex-1 overflow-y-auto space-y-3 p-1">
              {chatMessages.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p className="font-semibold text-slate-600">
                    ¿Tienes dudas sobre las tarjetas o el tema?
                  </p>
                  <p className="mt-1">
                    Pregúntame cualquier concepto y te lo explicaré con ejemplos paso a paso.
                  </p>
                </div>
              ) : (
                chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[88%] p-3 rounded-2xl text-xs leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-indigo-600 text-white rounded-tr-xs'
                          : 'bg-slate-100 text-slate-800 rounded-tl-xs'
                      }`}
                    >
                      <div className="markdown-body">
                        <Markdown>{msg.content}</Markdown>
                      </div>
                    </div>
                  </div>
                ))
              )}

              {isChatLoading && (
                <div className="flex justify-start">
                  <div className="p-3 rounded-2xl bg-slate-100 text-xs text-slate-500 rounded-tl-xs flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-bounce" />
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-bounce delay-100" />
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-bounce delay-200" />
                    <span className="ml-1">El Tutor IA está respondiendo...</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input bar */}
            <div className="pt-3 border-t border-slate-100">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendChatQuestion();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Pregunta tu duda..."
                  className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim() || isChatLoading}
                  className="p-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl shadow-xs"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
