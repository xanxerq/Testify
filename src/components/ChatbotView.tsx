import React, { useState, useRef, useEffect } from 'react';
import Markdown from 'react-markdown';
import {
  Bot,
  Send,
  Sparkles,
  RotateCcw,
  Copy,
  Check,
  BookOpen,
  GraduationCap,
  Layers,
  HelpCircle,
  Lightbulb,
  MessageSquare,
  ArrowRight,
  User as UserIcon,
} from 'lucide-react';
import { EducationalLevel, User } from '../types';
import { geminiService } from '../services/geminiService';
import { usePdc } from '../context/PdcContext';
import { PdcAdaptationButton } from './PdcAdaptationButton';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
}

interface ChatbotViewProps {
  user?: User | null;
  onNavigateToFlashcards?: (subject?: string, topic?: string, level?: EducationalLevel) => void;
  onNavigateToExam?: (subject?: string, topic?: string) => void;
  initialSubject?: string;
  initialTopic?: string;
}

const COMMON_LEVELS: EducationalLevel[] = [
  'Secundaria (ESO)',
  'Bachillerato',
  'Preparación PAU / EBAU',
  'Universidad / Grado',
  'Formación Profesional',
  'Primaria',
];

const SUGGESTED_QUESTIONS = [
  {
    category: 'Ciencias',
    text: '¿Cómo funciona la respiración celular y en qué se diferencia de la fotosíntesis?',
  },
  {
    category: 'Matemáticas',
    text: '¿Cómo se resuelve una ecuación de segundo grado completa e incompleta?',
  },
  {
    category: 'Historia',
    text: '¿Cuáles fueron las causas y consecuencias de la Primera Guerra Mundial?',
  },
  {
    category: 'Lengua',
    text: '¿Cómo distinguir entre un complemento directo y un complemento indirecto?',
  },
];

export const ChatbotView: React.FC<ChatbotViewProps> = ({
  user,
  onNavigateToFlashcards,
  onNavigateToExam,
  initialSubject = '',
  initialTopic = '',
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [subject, setSubject] = useState(initialSubject);
  const [topic, setTopic] = useState(initialTopic);
  const [level, setLevel] = useState<EducationalLevel>('Bachillerato');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { isPdcActive } = usePdc();

  // Enforce ESO level when PDC is active (LOMLOE rule)
  useEffect(() => {
    if (isPdcActive) {
      setLevel('Secundaria (ESO)');
    }
  }, [isPdcActive]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputValue).trim();
    if (!query || isLoading) return;

    setErrorMsg(null);
    setInputValue('');

    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newHistory = [...messages, userMessage];
    setMessages(newHistory);
    setIsLoading(true);

    try {
      // Prepare payload formatted for AI tutor
      const apiMessages = newHistory.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const reply = await geminiService.askChatbot(
        apiMessages,
        subject.trim() || undefined,
        level,
        topic.trim() || undefined,
        isPdcActive
      );

      const botMessage: ChatMessage = {
        id: `msg_${Date.now() + 1}`,
        role: 'model',
        content: reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (err: any) {
      console.error('Error asking chatbot:', err);
      setErrorMsg(err.message || 'Error al obtener respuesta del tutor IA.');
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearChat = () => {
    if (messages.length === 0) return;
    setMessages([]);
    setErrorMsg(null);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 animate-fadeIn flex flex-col h-[calc(100vh-5rem)]">
      {/* Top Header */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs mb-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-xs">
              <Bot className="w-4 h-4" />
            </span>
            <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
              Chatbot Tutor IA
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-bold border border-indigo-200/60 uppercase tracking-wider">
              Sin Fotos
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Haz cualquier pregunta académica o duda de estudio. La IA te explica paso a paso al instante.
          </p>
        </div>

        {/* Configuration Bar: Subject & Level */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* PRIMER BOTÓN DE TODOS: Adaptación PDC (exclusivo para ESO) */}
          <PdcAdaptationButton variant="pill" showTooltip={true} />

          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Asignatura (opcional)"
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-36 sm:w-44"
          />

          <select
            value={level}
            disabled={isPdcActive}
            onChange={(e) => setLevel(e.target.value as EducationalLevel)}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
              isPdcActive
                ? 'bg-amber-50 border border-amber-300 text-amber-950 font-bold cursor-not-allowed'
                : 'bg-slate-50 border border-slate-200 text-slate-700'
            }`}
            title={isPdcActive ? 'Nivel fijado en Secundaria (ESO) por la adaptación PDC' : 'Seleccionar nivel educativo'}
          >
            {COMMON_LEVELS.map((lvl) => (
              <option key={lvl} value={lvl} disabled={isPdcActive && lvl !== 'Secundaria (ESO)'}>
                {lvl} {isPdcActive && lvl !== 'Secundaria (ESO)' ? '(Solo ESO)' : ''}
              </option>
            ))}
          </select>

          {messages.length > 0 && (
            <button
              type="button"
              onClick={handleClearChat}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 text-xs font-semibold transition-colors"
              title="Borrar conversación"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">Limpiar</span>
            </button>
          )}
        </div>
      </div>

      {/* PDC Mode Active Notification Banner */}
      {isPdcActive && (
        <div className="mb-3 px-4 py-2.5 rounded-xl bg-amber-50/90 border border-amber-200/80 text-amber-900 text-xs flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="text-base">🎓</span>
            <div>
              <span className="font-bold">Adaptación PDC Activa:</span>{' '}
              <span className="text-amber-800">
                El tutor IA responderá con lenguaje sencillo, lectura fácil y resolución paso a paso.
              </span>
            </div>
          </div>
          <span className="text-[10px] font-bold text-amber-700 bg-amber-200/60 px-2 py-0.5 rounded-full shrink-0">
            Lectura Fácil
          </span>
        </div>
      )}

      {/* Main Messages Area */}
      <div className="flex-1 overflow-y-auto bg-slate-50/50 rounded-2xl border border-slate-200/80 p-4 sm:p-6 space-y-4 mb-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4 max-w-lg mx-auto my-auto">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-200/80 text-indigo-600 flex items-center justify-center mb-4 shadow-xs">
              <MessageSquare className="w-7 h-7" />
            </div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 mb-1">
              ¿En qué te puedo ayudar hoy?
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mb-6 leading-relaxed">
              Pregúntame cualquier concepto, fórmula, acontecimiento histórico, duda de gramática o ejercicio.
              <strong> No hace falta que subas ninguna foto</strong>, escribe tu duda directamente.
            </p>

            {/* Quick suggested prompt bubbles */}
            <div className="w-full text-left space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 text-center mb-1">
                Preguntas de ejemplo:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {SUGGESTED_QUESTIONS.map((sq, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSendMessage(sq.text)}
                    className="p-2.5 rounded-xl bg-white hover:bg-indigo-50/80 border border-slate-200 hover:border-indigo-200 text-xs text-slate-700 hover:text-indigo-900 text-left transition-all shadow-2xs group flex flex-col justify-between"
                  >
                    <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-1">
                      {sq.category}
                    </span>
                    <span className="line-clamp-2">{sq.text}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          messages.map((m) => {
            const isUser = m.role === 'user';
            return (
              <div
                key={m.id}
                className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] sm:max-w-[78%] rounded-2xl p-4 shadow-2xs text-sm ${
                    isUser
                      ? 'bg-indigo-600 text-white rounded-tr-xs'
                      : 'bg-white text-slate-900 border border-slate-200 rounded-tl-xs'
                  }`}
                >
                  <div className="flex items-center justify-between gap-4 mb-1.5 pb-1 border-b border-white/10 text-[11px] opacity-75 font-medium">
                    <span>{isUser ? user?.name || 'Tú' : 'Profesor IA'}</span>
                    <span>{m.timestamp}</span>
                  </div>

                  {isUser ? (
                    <div className="whitespace-pre-wrap leading-relaxed font-medium">
                      {m.content}
                    </div>
                  ) : (
                    <div>
                      <div className="markdown-body text-slate-800 leading-relaxed text-sm">
                        <Markdown>{m.content}</Markdown>
                      </div>

                      {/* Action buttons under AI response */}
                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() =>
                              handleSendMessage(
                                `¿Podrías explicarme esto mismo con una analogía o ejemplo muy sencillo de la vida cotidiana?`
                              )
                            }
                            className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 text-[11px] font-semibold transition-colors"
                          >
                            💡 Más sencillo
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleSendMessage(
                                `Ponme un ejemplo práctico detallado o ejercicio con solución sobre esto.`
                              )
                            }
                            className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 text-[11px] font-semibold transition-colors"
                          >
                            📝 Dame un ejemplo
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleSendMessage(
                                `Hazme una pregunta de autoevaluación para comprobar si lo he entendido bien.`
                              )
                            }
                            className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 text-[11px] font-semibold transition-colors"
                          >
                            ❓ Pruébame
                          </button>
                          {onNavigateToFlashcards && (
                            <button
                              type="button"
                              onClick={() => onNavigateToFlashcards(subject || 'General', topic || 'Repaso', level)}
                              className="px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 text-[11px] font-bold border border-amber-200 transition-colors flex items-center gap-1"
                            >
                              <Sparkles className="w-3 h-3 text-amber-600" />
                              <span>Crear Flashcards</span>
                            </button>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleCopy(m.id, m.content)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                          title="Copiar respuesta"
                        >
                          {copiedId === m.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-[11px] text-emerald-600 font-bold">Copiado</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span className="text-[11px]">Copiar</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {isUser && (
                  <div className="w-8 h-8 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                    {user?.name?.charAt(0).toUpperCase() || <UserIcon className="w-4 h-4 text-slate-500" />}
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex gap-3 justify-start items-center">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
              <Bot className="w-4 h-4 animate-pulse" />
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-xs p-4 shadow-2xs flex items-center gap-2">
              <div className="flex gap-1.5 items-center">
                <span className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-xs text-slate-500 font-medium pl-1">El Tutor IA está pensando la explicación...</span>
            </div>
          </div>
        )}

        {/* Error message */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between gap-2">
            <span>{errorMsg}</span>
            <button
              type="button"
              onClick={() => handleSendMessage()}
              className="px-2.5 py-1 bg-rose-600 text-white font-bold rounded-lg hover:bg-rose-700"
            >
              Reintentar
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form Bar */}
      <div className="bg-white rounded-2xl p-2.5 sm:p-3 border border-slate-200 shadow-sm shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-end gap-2"
        >
          <textarea
            ref={inputRef}
            rows={2}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe aquí tu duda, problema o concepto (Pulsa Enter para enviar)..."
            className="flex-1 p-2 bg-slate-50 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 resize-none border border-slate-200"
          />

          <button
            id="btn-send-chat"
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            className="px-4 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 shrink-0"
            title="Enviar mensaje (Enter)"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline text-xs">Enviar</span>
          </button>
        </form>
        <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 pt-1.5">
          <span>Responde preguntas directamente sin necesidad de fotos</span>
          <span>Shift + Enter para salto de línea</span>
        </div>
      </div>
    </div>
  );
};
