import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Camera,
  Upload,
  FileText,
  X,
  CheckCircle2,
  HelpCircle,
  Lightbulb,
  AlertTriangle,
  ArrowRight,
  Printer,
  Copy,
  Check,
  RotateCcw,
  Send,
  BookOpen,
  GraduationCap,
  History,
  Trash2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Search,
  MessageSquare,
  Eye,
  PlusCircle,
} from 'lucide-react';
import {
  EducationalLevel,
  HomeworkSolution,
  HomeworkSolveConfig,
  UploadedMaterial,
  User,
} from '../types';
import { geminiService } from '../services/geminiService';
import { homeworkService } from '../services/homeworkService';
import { CameraModal } from './CameraModal';
import { usePdc } from '../context/PdcContext';
import { PdcAdaptationButton } from './PdcAdaptationButton';

interface HomeworkSolverViewProps {
  user: User | null;
  onNavigateToNotes?: () => void;
  onNavigateToExam?: () => void;
}

const COMMON_SUBJECTS = [
  'Matemáticas',
  'Física y Química',
  'Lengua Castellana y Literatura',
  'Biología y Geología',
  'Inglés / Idiomas',
  'Historia y Geografía',
  'Economía',
  'Tecnología e Informática',
  'Filosofía',
];

const EDUCATIONAL_LEVELS: EducationalLevel[] = [
  'Primaria',
  'Secundaria (ESO)',
  'Bachillerato',
  'Formación Profesional',
  'Universidad / Grado',
  'Máster / Oposiciones',
];

export const HomeworkSolverView: React.FC<HomeworkSolverViewProps> = ({
  user,
  onNavigateToNotes,
  onNavigateToExam,
}) => {
  // Tabs: 'solve' (upload and solve) or 'history' (saved homeworks)
  const [activeTab, setActiveTab] = useState<'solve' | 'history'>('solve');

  // Uploaded photo / materials state
  const [materials, setMaterials] = useState<UploadedMaterial[]>([]);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Configuration options
  const [subject, setSubject] = useState('');
  const [customSubject, setCustomSubject] = useState('');
  const [level, setLevel] = useState<EducationalLevel>('Secundaria (ESO)');
  const [specificDoubt, setSpecificDoubt] = useState('');
  const [manualText, setManualText] = useState('');

  // Resolution state
  const [isSolving, setIsSolving] = useState(false);
  const [solvingStage, setSolvingStage] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [currentSolution, setCurrentSolution] = useState<HomeworkSolution | null>(null);

  // Interactive Tutor Chat state for the current solution
  const [tutorChat, setTutorChat] = useState<Array<{ role: 'user' | 'model'; text: string }>>([]);
  const [chatInput, setChatInput] = useState('');
  const [isAnsweringChat, setIsAnsweringChat] = useState(false);

  // UI helpers
  const [copiedSolution, setCopiedSolution] = useState(false);
  const [showPracticeAnswer, setShowPracticeAnswer] = useState(false);
  const [previewImageModal, setPreviewImageModal] = useState<string | null>(null);

  // History list
  const [savedHomeworks, setSavedHomeworks] = useState<HomeworkSolution[]>(() =>
    homeworkService.getHomeworkList(user?.id)
  );
  const [historySearchQuery, setHistorySearchQuery] = useState('');

  const { isPdcActive } = usePdc();

  // Enforce ESO level when PDC is active (LOMLOE constraint)
  useEffect(() => {
    if (isPdcActive) {
      setLevel('Secundaria (ESO)');
    }
  }, [isPdcActive]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Reload history when tab changes or user changes
  useEffect(() => {
    setSavedHomeworks(homeworkService.getHomeworkList(user?.id));
  }, [user?.id, activeTab]);

  // Support paste image from clipboard anywhere on screen
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (activeTab !== 'solve') return;
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
          const file = item.getAsFile();
          if (file) {
            processFile(file);
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [activeTab]);

  const processFile = (file: File) => {
    setErrorMsg(null);
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      setErrorMsg('Por favor, sube una imagen (JPG, PNG, WEBP) o un documento PDF del ejercicio.');
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setErrorMsg('El archivo es demasiado grande (máximo 20 MB).');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64Data = reader.result as string;
      const newMaterial: UploadedMaterial = {
        id: `mat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: file.name,
        type: file.type.startsWith('image/') ? 'image' : 'pdf',
        mimeType: file.type,
        base64Data,
        previewUrl: file.type.startsWith('image/') ? base64Data : undefined,
        sizeBytes: file.size,
      };

      setMaterials((prev) => [...prev, newMaterial]);
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      Array.from(e.target.files).forEach(processFile);
      e.target.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      Array.from(e.dataTransfer.files).forEach(processFile);
    }
  };

  const removeMaterial = (id: string) => {
    setMaterials((prev) => prev.filter((m) => m.id !== id));
  };

  // Solve the homework exercise
  const handleSolveExercise = async () => {
    setErrorMsg(null);

    // Prepare list of materials including manual text if provided
    const allMaterials: UploadedMaterial[] = [...materials];
    if (manualText.trim()) {
      allMaterials.push({
        id: `mat_text_${Date.now()}`,
        name: 'Texto del ejercicio',
        type: 'text',
        mimeType: 'text/plain',
        base64Data: btoa(unescape(encodeURIComponent(manualText.trim()))),
        sizeBytes: manualText.length,
      });
    }

    if (allMaterials.length === 0) {
      setErrorMsg('Por favor, sube una foto de tu ejercicio o escribe el enunciado.');
      return;
    }

    const selectedSubject = subject === 'Otro' ? customSubject.trim() : subject;
    const config: HomeworkSolveConfig = {
      subject: selectedSubject || undefined,
      level,
      specificDoubt: specificDoubt.trim() || undefined,
      isPdcAdapted: isPdcActive,
    };

    setIsSolving(true);
    setSolvingStage('Escaneando y transcribiendo el ejercicio de la foto...');
    setShowPracticeAnswer(false);
    setTutorChat([]);

    try {
      const stageTimer1 = setTimeout(() => {
        setSolvingStage('Calculando la solución matemática y conceptual exacta...');
      }, 2500);

      const stageTimer2 = setTimeout(() => {
        setSolvingStage('Redactando explicación paso a paso y consejos pedagógicos...');
      }, 5500);

      const solution = await geminiService.solveHomeworkExercise(allMaterials, config);

      clearTimeout(stageTimer1);
      clearTimeout(stageTimer2);

      // Save to local persistence
      const saved = homeworkService.saveHomework(solution, user?.id);
      setCurrentSolution(saved);
      setSavedHomeworks(homeworkService.getHomeworkList(user?.id));
    } catch (err: any) {
      console.error('Error al resolver el ejercicio:', err);
      setErrorMsg(err.message || 'No se pudo resolver el ejercicio. Inténtalo de nuevo.');
    } finally {
      setIsSolving(false);
      setSolvingStage('');
    }
  };

  // Submit follow-up question to the AI tutor
  const handleSendTutorChat = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() || !currentSolution || isAnsweringChat) return;

    const userQuestion = chatInput.trim();
    setChatInput('');
    const newChat = [...tutorChat, { role: 'user' as const, text: userQuestion }];
    setTutorChat(newChat);
    setIsAnsweringChat(true);

    try {
      const reply = await geminiService.askHomeworkDoubt(currentSolution, userQuestion, tutorChat);
      setTutorChat([...newChat, { role: 'model' as const, text: reply }]);
      setTimeout(() => {
        chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err: any) {
      setTutorChat([
        ...newChat,
        {
          role: 'model' as const,
          text: 'No pude responder a tu duda en este momento. Por favor, reformula tu pregunta.',
        },
      ]);
    } finally {
      setIsAnsweringChat(false);
    }
  };

  const handleCopySolution = () => {
    if (!currentSolution) return;
    const textToCopy = `EJERCICIO: ${currentSolution.exerciseText}

RESULTADO FINAL:
${currentSolution.finalAnswer}

PASO A PASO:
${currentSolution.steps.map((s) => `[Paso ${s.stepNumber}: ${s.title}]\n${s.explanation}${s.formulaOrMath ? `\nCálculo / Fórmula: ${s.formulaOrMath}` : ''}${s.tip ? `\nConsejo: ${s.tip}` : ''}`).join('\n\n')}

CONCEPTOS CLAVE:
${currentSolution.keyConcepts.join(', ')}

ERRORES COMUNES A EVITAR:
${currentSolution.commonMistakes.join('\n- ')}`;

    navigator.clipboard.writeText(textToCopy);
    setCopiedSolution(true);
    setTimeout(() => setCopiedSolution(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDeleteHistoryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('¿Deseas eliminar este ejercicio resuelto de tu historial?')) {
      homeworkService.deleteHomework(id);
      setSavedHomeworks(homeworkService.getHomeworkList(user?.id));
      if (currentSolution?.id === id) {
        setCurrentSolution(null);
      }
    }
  };

  // Filtered history list
  const filteredHomeworks = savedHomeworks.filter((item) => {
    if (!historySearchQuery.trim()) return true;
    const q = historySearchQuery.toLowerCase();
    return (
      item.subject?.toLowerCase().includes(q) ||
      item.topic?.toLowerCase().includes(q) ||
      item.exerciseText.toLowerCase().includes(q) ||
      item.finalAnswer.toLowerCase().includes(q)
    );
  });

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      {/* Top Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-8 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200/60">
              <Sparkles className="w-3.5 h-3.5" /> Tutor de Deberes IA
            </span>
            <span className="text-xs text-slate-500 hidden sm:inline">• Foto a Solución Paso a Paso</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Resolución de Deberes y Ejercicios
          </h1>
          <p className="text-sm sm:text-base text-slate-600 mt-1 max-w-2xl">
            Sube una foto de tu ejercicio o problema del libro o cuaderno. La IA lo transcribe, lo resuelve y te explica detalladamente cómo se hace cada paso para que aprendas.
          </p>
        </div>

        {/* Actions & View switcher tabs */}
        <div className="flex items-center gap-2.5 flex-wrap self-start sm:self-center">
          <PdcAdaptationButton variant="pill" showTooltip={true} />

          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200/70">
          <button
            id="tab-btn-solve"
            onClick={() => {
              setActiveTab('solve');
            }}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'solve'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Resolver Ejercicio</span>
          </button>

          <button
            id="tab-btn-history"
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'history'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Mis Ejercicios</span>
            {savedHomeworks.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700">
                {savedHomeworks.length}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>

      {/* TAB 1: SOLVE HOMEWORK */}
      {activeTab === 'solve' && (
        <div className="space-y-8">
          {/* Main Solver Form (Only show upload form if no active solution or if user wants to solve another) */}
          {!currentSolution && (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 sm:p-8 space-y-6">
              {/* Photo Upload Dropzone */}
              <div>
                <label className="block text-sm font-bold text-slate-900 mb-2">
                  1. Foto del ejercicio o problema <span className="text-rose-500">*</span>
                </label>
                <p className="text-xs text-slate-500 mb-3">
                  Haz una foto nítida de tu cuaderno, libro o examen, o sube una imagen/captura de pantalla.
                </p>

                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`relative border-2 border-dashed rounded-xl p-6 sm:p-8 text-center transition-all ${
                    isDragging
                      ? 'border-indigo-500 bg-indigo-50/50 scale-[0.99]'
                      : 'border-slate-300 hover:border-indigo-400 bg-slate-50/50'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.pdf"
                    multiple
                    className="hidden"
                    onChange={handleFileInputChange}
                  />

                  <div className="flex flex-col items-center justify-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center shadow-inner">
                      <Camera className="w-7 h-7" />
                    </div>

                    <div>
                      <p className="text-base font-bold text-slate-900">
                        Arrastra aquí la foto del ejercicio o pégala con Ctrl+V
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Compatible con imágenes (JPG, PNG, WEBP) y documentos PDF
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-2.5 mt-2">
                      <button
                        type="button"
                        id="btn-open-camera"
                        onClick={() => setIsCameraOpen(true)}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-sm transition-all active:scale-95"
                      >
                        <Camera className="w-4 h-4" />
                        <span>Hacer foto con la cámara</span>
                      </button>

                      <button
                        type="button"
                        id="btn-upload-file"
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-sm font-semibold transition-all active:scale-95 shadow-sm"
                      >
                        <Upload className="w-4 h-4" />
                        <span>Subir desde dispositivo</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Uploaded Materials Preview Thumbnails */}
                {materials.length > 0 && (
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {materials.map((mat) => (
                      <div
                        key={mat.id}
                        className="relative group flex items-center gap-3 p-2.5 rounded-xl bg-slate-100/80 border border-slate-200"
                      >
                        {mat.previewUrl ? (
                          <div
                            className="w-14 h-14 rounded-lg bg-cover bg-center shrink-0 border border-slate-300 overflow-hidden cursor-pointer"
                            style={{ backgroundImage: `url(${mat.previewUrl})` }}
                            onClick={() => setPreviewImageModal(mat.previewUrl || null)}
                            title="Haz clic para ampliar foto"
                          >
                            <div className="w-full h-full bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Eye className="w-4 h-4 text-white drop-shadow" />
                            </div>
                          </div>
                        ) : (
                          <div className="w-14 h-14 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center shrink-0 text-indigo-600">
                            <FileText className="w-6 h-6" />
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-slate-900 truncate">
                            {mat.name}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {(mat.sizeBytes / 1024).toFixed(0)} KB • {mat.type.toUpperCase()}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeMaterial(mat.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Eliminar foto"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Optional: Text Enunciation or Clarification */}
              <div>
                <label className="block text-sm font-bold text-slate-900 mb-1">
                  Texto del ejercicio o dudas específicas <span className="text-slate-400 font-normal">(opcional)</span>
                </label>
                <textarea
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                  placeholder="Si prefieres escribir el ejercicio directamente o añadir un detalle que no se lea bien en la foto, escríbelo aquí..."
                  rows={3}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-y"
                />
              </div>

              {/* Educational Context Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Asignatura (opcional)
                  </label>
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="">Autodetectar de la foto</option>
                    {COMMON_SUBJECTS.map((sub) => (
                      <option key={sub} value={sub}>
                        {sub}
                      </option>
                    ))}
                    <option value="Otro">Otra asignatura...</option>
                  </select>

                  {subject === 'Otro' && (
                    <input
                      type="text"
                      placeholder="Escribe la asignatura..."
                      value={customSubject}
                      onChange={(e) => setCustomSubject(e.target.value)}
                      className="mt-2 w-full px-3 py-1.5 rounded-lg border border-slate-300 text-sm"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span>Nivel Educativo</span>
                    {isPdcActive && (
                      <span className="text-[10px] font-black text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                        Fijado a ESO por PDC
                      </span>
                    )}
                  </label>
                  <select
                    value={level}
                    disabled={isPdcActive}
                    onChange={(e) => setLevel(e.target.value as EducationalLevel)}
                    className={`w-full px-3 py-2 rounded-xl border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 ${
                      isPdcActive
                        ? 'bg-amber-50 border-amber-300 text-amber-950 font-bold cursor-not-allowed'
                        : 'border-slate-300 bg-white text-slate-800'
                    }`}
                  >
                    {EDUCATIONAL_LEVELS.map((lvl) => (
                      <option key={lvl} value={lvl} disabled={isPdcActive && lvl !== 'Secundaria (ESO)'}>
                        {lvl} {isPdcActive && lvl !== 'Secundaria (ESO)' ? '(Solo ESO en PDC)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  ¿Tienes alguna duda o instrucción concreta? <span className="text-slate-400 font-normal">(opcional)</span>
                </label>
                <input
                  type="text"
                  value={specificDoubt}
                  onChange={(e) => setSpecificDoubt(e.target.value)}
                  placeholder="Ej: 'No entiendo el apartado b', 'Explícamelo con la fórmula cuadrática', 'Hazlo paso a paso muy simple'..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              {/* Error Message */}
              {errorMsg && (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">No se pudo procesar el ejercicio</p>
                    <p className="text-xs mt-0.5 text-rose-700">{errorMsg}</p>
                  </div>
                </div>
              )}

              {/* PDC Curricular Adaptation Option Card */}
              <div className="pt-2">
                <PdcAdaptationButton variant="card" showTooltip={true} />
              </div>

              {/* Main Submit Button */}
              <div className="pt-2">
                <button
                  type="button"
                  id="btn-solve-homework"
                  disabled={isSolving || (materials.length === 0 && !manualText.trim())}
                  onClick={handleSolveExercise}
                  className={`w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl font-bold text-base shadow-md transition-all active:scale-[0.99] ${
                    isSolving || (materials.length === 0 && !manualText.trim())
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                      : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-indigo-200'
                  }`}
                >
                  {isSolving ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>{solvingStage || 'Resolviendo ejercicio...'}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      <span>Resolver y explicar paso a paso</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ACTIVE SOLUTION VIEW */}
          {currentSolution && (
            <div className="space-y-6">
              {/* Back / Action Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm print:hidden">
                <button
                  type="button"
                  id="btn-solve-another"
                  onClick={() => {
                    setCurrentSolution(null);
                    setMaterials([]);
                    setManualText('');
                    setSpecificDoubt('');
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-semibold transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Resolver otro ejercicio</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopySolution}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-sm font-semibold transition-colors shadow-sm"
                    title="Copiar solución completa al portapapeles"
                  >
                    {copiedSolution ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-600" />
                        <span className="text-emerald-700 font-bold">¡Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copiar</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handlePrint}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-sm font-semibold transition-colors shadow-sm"
                    title="Imprimir o guardar en PDF"
                  >
                    <Printer className="w-4 h-4" />
                    <span className="hidden sm:inline">Imprimir / PDF</span>
                  </button>
                </div>
              </div>

              {/* Solution Sheet Card */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-10 space-y-8">
                {/* Meta Badges */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  {currentSolution.subject && (
                    <span className="px-3 py-1 rounded-full font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {currentSolution.subject}
                    </span>
                  )}
                  {currentSolution.topic && (
                    <span className="px-3 py-1 rounded-full font-semibold bg-violet-50 text-violet-700 border border-violet-200">
                      {currentSolution.topic}
                    </span>
                  )}
                  {currentSolution.level && (
                    <span className="px-3 py-1 rounded-full font-medium bg-slate-100 text-slate-600">
                      {currentSolution.level}
                    </span>
                  )}
                  <span className="text-slate-400 ml-auto">
                    {new Date(currentSolution.createdAt).toLocaleDateString('es-ES', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                {/* Enunciado detectado / transcrito */}
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                      Enunciado detectado del ejercicio
                    </span>
                    {currentSolution.exerciseImageUrl && (
                      <button
                        type="button"
                        onClick={() => setPreviewImageModal(currentSolution.exerciseImageUrl || null)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Ver foto original</span>
                      </button>
                    )}
                  </div>
                  <p className="text-base sm:text-lg font-medium text-slate-900 whitespace-pre-line leading-relaxed">
                    {currentSolution.exerciseText}
                  </p>
                </div>

                {/* Solución Final Destacada */}
                <div className="p-6 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50/60 border-2 border-emerald-300 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-900">
                      Resultado / Solución Final
                    </span>
                  </div>
                  <p className="text-xl sm:text-2xl font-black text-emerald-950 tracking-tight pl-9">
                    {currentSolution.finalAnswer}
                  </p>
                </div>

                {/* Explicación Paso a Paso */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 flex items-center gap-2">
                      <GraduationCap className="w-5 h-5 text-indigo-600" />
                      <span>Cómo se resuelve (Paso a paso)</span>
                    </h2>
                    <span className="text-xs text-slate-500 font-medium">
                      {currentSolution.steps.length} pasos detallados
                    </span>
                  </div>

                  <div className="space-y-4 pt-1">
                    {currentSolution.steps.map((step) => (
                      <div
                        key={step.stepNumber}
                        className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm space-y-3 transition-all hover:border-indigo-300"
                      >
                        {/* Step Header */}
                        <div className="flex items-start gap-3">
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-600 text-white font-extrabold text-sm shrink-0 shadow-sm mt-0.5">
                            {step.stepNumber}
                          </span>
                          <div>
                            <h3 className="text-base font-bold text-slate-900">
                              {step.title}
                            </h3>
                            <p className="text-sm sm:text-base text-slate-700 mt-1 leading-relaxed whitespace-pre-line">
                              {step.explanation}
                            </p>
                          </div>
                        </div>

                        {/* Formula or Math calculation block */}
                        {step.formulaOrMath && (
                          <div className="ml-10 p-3.5 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs sm:text-sm overflow-x-auto shadow-inner border border-slate-800">
                            <span className="text-slate-400 select-none mr-2 font-sans text-xs">
                              Cálculo:
                            </span>
                            <span className="font-bold text-amber-300">
                              {step.formulaOrMath}
                            </span>
                          </div>
                        )}

                        {/* Tip / pedagogical note */}
                        {step.tip && (
                          <div className="ml-10 p-3 rounded-xl bg-amber-50/80 border border-amber-200/70 text-amber-900 text-xs sm:text-sm flex items-start gap-2.5">
                            <Lightbulb className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-bold">Consejo clave: </span>
                              <span>{step.tip}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Key Concepts & Common Mistakes 2-Column Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
                  {/* Key Concepts */}
                  {currentSolution.keyConcepts.length > 0 && (
                    <div className="p-5 rounded-2xl bg-indigo-50/60 border border-indigo-100 space-y-2.5">
                      <h4 className="text-xs font-extrabold uppercase tracking-wider text-indigo-900 flex items-center gap-1.5">
                        <BookOpen className="w-4 h-4 text-indigo-600" />
                        <span>Fórmulas y Conceptos Clave</span>
                      </h4>
                      <ul className="space-y-1.5 text-sm text-indigo-950">
                        {currentSolution.keyConcepts.map((c, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-indigo-500 font-bold">•</span>
                            <span>{c}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Common Mistakes */}
                  {currentSolution.commonMistakes.length > 0 && (
                    <div className="p-5 rounded-2xl bg-rose-50/60 border border-rose-100 space-y-2.5">
                      <h4 className="text-xs font-extrabold uppercase tracking-wider text-rose-900 flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-rose-600" />
                        <span>Errores Típicos a Evitar</span>
                      </h4>
                      <ul className="space-y-1.5 text-sm text-rose-950">
                        {currentSolution.commonMistakes.map((m, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-rose-500 font-bold">✕</span>
                            <span>{m}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Pon a prueba lo aprendido (Ejercicio similar de práctica) */}
                {currentSolution.similarPractice && (
                  <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-violet-600" />
                        <span>Pon a prueba lo aprendido (Ejercicio similar)</span>
                      </span>
                    </div>

                    <p className="text-sm sm:text-base font-semibold text-slate-900">
                      {currentSolution.similarPractice.question}
                    </p>

                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => setShowPracticeAnswer(!showPracticeAnswer)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-xs font-bold text-indigo-600 hover:text-indigo-800 shadow-sm transition-colors"
                      >
                        {showPracticeAnswer ? (
                          <>
                            <ChevronUp className="w-3.5 h-3.5" />
                            <span>Ocultar solución</span>
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-3.5 h-3.5" />
                            <span>Ver solución y comprobar resultado</span>
                          </>
                        )}
                      </button>

                      {showPracticeAnswer && (
                        <div className="mt-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-950 space-y-1">
                          <p className="font-bold text-emerald-900">
                            Respuesta: {currentSolution.similarPractice.answer}
                          </p>
                          <p className="text-xs text-emerald-800">
                            {currentSolution.similarPractice.explanation}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Pregúntale al Tutor IA (Chat interactivo de dudas para este ejercicio) */}
                <div className="pt-4 border-t border-slate-200 space-y-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-indigo-600" />
                      <span>¿Tienes alguna duda sobre este ejercicio o algún paso?</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Pregúntale al tutor IA sobre cualquier cálculo o concepto y te lo explicará con paciencia.
                    </p>
                  </div>

                  {/* Suggestion Chips */}
                  {tutorChat.length === 0 && (
                    <div className="flex flex-wrap gap-2">
                      {[
                        '¿Por qué se usa esa fórmula y no otra?',
                        '¿Hay alguna forma más rápida o sencilla de resolverlo?',
                        '¿Puedes explicarme el paso 2 con más detalle?',
                      ].map((chip) => (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => {
                            setChatInput(chip);
                          }}
                          className="px-3 py-1.5 rounded-full bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 text-xs font-medium transition-colors border border-slate-200/80 text-left"
                        >
                          "{chip}"
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Chat messages history */}
                  {tutorChat.length > 0 && (
                    <div className="space-y-3 max-h-80 overflow-y-auto p-4 rounded-2xl bg-slate-50 border border-slate-200">
                      {tutorChat.map((msg, idx) => (
                        <div
                          key={idx}
                          className={`flex gap-2.5 ${
                            msg.role === 'user' ? 'justify-end' : 'justify-start'
                          }`}
                        >
                          {msg.role === 'model' && (
                            <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs shrink-0 mt-0.5">
                              <Sparkles className="w-3.5 h-3.5" />
                            </div>
                          )}
                          <div
                            className={`p-3 rounded-2xl text-xs sm:text-sm max-w-[85%] leading-relaxed ${
                              msg.role === 'user'
                                ? 'bg-indigo-600 text-white rounded-br-none'
                                : 'bg-white text-slate-900 border border-slate-200 shadow-sm rounded-bl-none'
                            }`}
                          >
                            <p className="whitespace-pre-line">{msg.text}</p>
                          </div>
                        </div>
                      ))}
                      {isAnsweringChat && (
                        <div className="flex gap-2.5 items-center text-slate-500 text-xs">
                          <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
                            <Sparkles className="w-3.5 h-3.5 animate-spin" />
                          </div>
                          <span>El tutor está escribiendo la explicación...</span>
                        </div>
                      )}
                      <div ref={chatBottomRef} />
                    </div>
                  )}

                  {/* Chat input form */}
                  <form onSubmit={handleSendTutorChat} className="flex gap-2">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Escribe tu duda sobre este ejercicio..."
                      disabled={isAnsweringChat}
                      className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                    <button
                      type="submit"
                      disabled={!chatInput.trim() || isAnsweringChat}
                      className={`px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-1.5 transition-all ${
                        !chatInput.trim() || isAnsweringChat
                          ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
                      }`}
                    >
                      <span>Preguntar</span>
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MY SOLVED HOMEWORK HISTORY */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">
                Historial de Deberes Resueltos
              </h2>
              <p className="text-xs sm:text-sm text-slate-500">
                Revisa y repasa las explicaciones de todos los ejercicios que has resuelto.
              </p>
            </div>

            {/* Search filter */}
            {savedHomeworks.length > 0 && (
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar por materia, tema o texto..."
                  value={historySearchQuery}
                  onChange={(e) => setHistorySearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            )}
          </div>

          {savedHomeworks.length === 0 ? (
            <div className="text-center py-16 px-4 bg-white rounded-3xl border border-slate-200 shadow-sm">
              <div className="w-16 h-16 rounded-3xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">No hay ejercicios resueltos aún</h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto mt-1 mb-6">
                Cuando subas fotos de tus deberes y los resuelvas con la IA, se guardarán aquí para que puedas repasarlos antes de los exámenes.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('solve')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-sm transition-all"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Resolver mi primer ejercicio</span>
              </button>
            </div>
          ) : filteredHomeworks.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
              <p className="text-sm text-slate-500">
                No se encontraron ejercicios con "{historySearchQuery}"
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredHomeworks.map((hw) => (
                <div
                  key={hw.id}
                  onClick={() => {
                    setCurrentSolution(hw);
                    setActiveTab('solve');
                  }}
                  className="group relative bg-white hover:bg-indigo-50/30 rounded-2xl border border-slate-200 hover:border-indigo-300 p-5 shadow-sm transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {hw.subject && (
                          <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            {hw.subject}
                          </span>
                        )}
                        {hw.topic && (
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700">
                            {hw.topic}
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={(e) => handleDeleteHistoryItem(hw.id, e)}
                        className="p-1.5 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-colors opacity-0 group-hover:opacity-100"
                        title="Eliminar de historial"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <p className="text-sm font-bold text-slate-900 line-clamp-2">
                      {hw.exerciseText}
                    </p>

                    <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200/60 text-xs">
                      <span className="font-bold text-emerald-900">Solución: </span>
                      <span className="text-emerald-950 font-medium line-clamp-1">
                        {hw.finalAnswer}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 text-xs text-slate-400">
                    <span>{hw.steps.length} pasos explicados</span>
                    <span className="flex items-center gap-1 font-semibold text-indigo-600 group-hover:translate-x-0.5 transition-transform">
                      Ver explicación completa <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Camera Capture Modal */}
      <CameraModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={(material) => {
          setMaterials((prev) => [...prev, material]);
          setIsCameraOpen(false);
        }}
      />

      {/* Enlarged Photo Preview Modal */}
      {previewImageModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPreviewImageModal(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh] bg-black rounded-2xl overflow-hidden shadow-2xl">
            <button
              onClick={() => setPreviewImageModal(null)}
              className="absolute top-3 right-3 p-2 rounded-full bg-black/60 text-white hover:bg-black transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={previewImageModal}
              alt="Foto del ejercicio"
              className="w-full h-auto max-h-[85vh] object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
};
