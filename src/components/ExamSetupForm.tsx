import React, { useState } from 'react';
import {
  AlertCircle,
  BookMarked,
  Camera,
  Check,
  Clock,
  FileText,
  FileUp,
  GraduationCap,
  HelpCircle,
  Image as ImageIcon,
  Layers,
  ListOrdered,
  Plus,
  Sliders,
  Sparkles,
  Trash2,
  UploadCloud,
  Users,
  Wand2,
} from 'lucide-react';
import {
  DEMO_PRESETS,
  POPULAR_SUBJECTS,
  QUICK_SUBJECTS,
  QuickSubjectInfo,
  SPANISH_STAGES,
  SpanishEducationStage,
} from '../data/demoMaterials';
import { EducationalLevel, ExamDifficulty, ExamSetupConfig, UploadedMaterial } from '../types';
import { CameraModal } from './CameraModal';

interface ExamSetupFormProps {
  onGenerate: (config: ExamSetupConfig, materials: UploadedMaterial[], startMultiplayer?: boolean) => Promise<void>;
  isLoading: boolean;
  onOpenAuthRequired: () => void;
  isAuthenticated: boolean;
  initialConfig?: Partial<ExamSetupConfig> | null;
  initialMaterials?: UploadedMaterial[] | null;
  onOpenJoinRoom?: () => void;
  onNavigateToHomework?: () => void;
  onNavigateToFlashcards?: (subject?: string, topic?: string, level?: EducationalLevel) => void;
}

const EDUCATIONAL_LEVELS: { level: EducationalLevel; label: string; desc: string }[] = [
  { level: 'Secundaria (ESO)', label: 'Secundaria (ESO)', desc: '1º a 4º ESO • Currículo LOMLOE' },
  { level: 'Bachillerato', label: 'Bachillerato', desc: '1º y 2º Bachillerato • LOMLOE' },
  { level: 'Preparación PAU / EBAU', label: 'Preparación PAU / EBAU', desc: 'Acceso Universidad • Selectividad España' },
  { level: 'Primaria', label: 'Primaria', desc: '6 - 12 años' },
  { level: 'Formación Profesional', label: 'Formación Profesional', desc: 'Grado Medio y Superior' },
  { level: 'Universidad / Grado', label: 'Universidad', desc: 'Grado / Carrera Universitaria' },
  { level: 'Máster / Oposiciones', label: 'Máster / Oposiciones', desc: 'Exámenes competitivos' },
];

export const ExamSetupForm: React.FC<ExamSetupFormProps> = ({
  onGenerate,
  isLoading,
  onOpenAuthRequired,
  isAuthenticated,
  initialConfig,
  initialMaterials,
  onOpenJoinRoom,
  onNavigateToHomework,
  onNavigateToFlashcards,
}) => {
  // Form state
  const [subject, setSubject] = useState(initialConfig?.subject || '');
  const [topic, setTopic] = useState(initialConfig?.topic || '');
  const [level, setLevel] = useState<EducationalLevel>(initialConfig?.level || 'Bachillerato');
  const [difficulty, setDifficulty] = useState<ExamDifficulty>(initialConfig?.difficulty || 'Media');
  const [testCount, setTestCount] = useState<number>(initialConfig?.testCount ?? 5);
  const [openCount, setOpenCount] = useState<number>(initialConfig?.openCount ?? 2);
  const [timed, setTimed] = useState<boolean>(initialConfig?.timed ?? true);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState<number>(initialConfig?.timeLimitMinutes ?? 20);
  const [additionalNotes, setAdditionalNotes] = useState<string>(initialConfig?.additionalNotes || '');

  // Active Spanish Education Stage ('eso' | 'bachillerato' | 'pau')
  const [selectedStage, setSelectedStage] = useState<SpanishEducationStage>(() => {
    if (initialConfig?.level === 'Preparación PAU / EBAU') return 'pau';
    if (initialConfig?.level === 'Secundaria (ESO)') return 'eso';
    return 'bachillerato';
  });

  // Quick subject selector state
  const [selectedQuickSubjectId, setSelectedQuickSubjectId] = useState<string | null>(null);
  const photoInputRef = React.useRef<HTMLInputElement>(null);
  const docInputRef = React.useRef<HTMLInputElement>(null);

  // Uploaded materials
  const [materials, setMaterials] = useState<UploadedMaterial[]>(initialMaterials || []);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isCameraOpen, setIsCameraOpen] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  React.useEffect(() => {
    if (initialConfig) {
      if (initialConfig.subject) setSubject(initialConfig.subject);
      if (initialConfig.topic) setTopic(initialConfig.topic);
      if (initialConfig.level) setLevel(initialConfig.level);
      if (initialConfig.difficulty) setDifficulty(initialConfig.difficulty);
      if (typeof initialConfig.testCount === 'number') setTestCount(initialConfig.testCount);
      if (typeof initialConfig.openCount === 'number') setOpenCount(initialConfig.openCount);
      if (typeof initialConfig.timed === 'boolean') setTimed(initialConfig.timed);
      if (typeof initialConfig.timeLimitMinutes === 'number') setTimeLimitMinutes(initialConfig.timeLimitMinutes);
      if (initialConfig.additionalNotes) setAdditionalNotes(initialConfig.additionalNotes);
    }
    if (initialMaterials && initialMaterials.length > 0) {
      setMaterials(initialMaterials);
    }
  }, [initialConfig, initialMaterials]);

  // Handle file input (Photos / PDF / TXT)
  const processFiles = (files: FileList | File[]) => {
    setValidationError(null);
    const fileArray = Array.from(files);

    fileArray.forEach((file) => {
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      const isImage = file.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|bmp)$/i.test(file.name);
      const isText = file.type === 'text/plain' || /\.(txt|md|markdown)$/i.test(file.name);

      if (!isPdf && !isImage && !isText) {
        setValidationError(`El archivo "${file.name}" no es compatible. Sube fotos de apuntes (JPG, PNG), documentos PDF o archivos de texto (TXT).`);
        return;
      }

      if (file.size > 20 * 1024 * 1024) {
        setValidationError(`El archivo "${file.name}" excede el límite máximo de 20 MB.`);
        return;
      }

      if (isText) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const textContent = (e.target?.result as string) || '';
          if (!textContent) return;
          const encoder = new TextEncoder();
          const bytes = encoder.encode(textContent);
          let binary = '';
          for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          const base64Data = btoa(binary);
          const newMaterial: UploadedMaterial = {
            id: `mat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            name: file.name,
            type: 'text',
            mimeType: 'text/plain',
            base64Data,
            sizeBytes: file.size,
          };
          setMaterials((prev) => [...prev, newMaterial]);
        };
        reader.readAsText(file);
      } else {
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result as string;
          if (!result) return;

          const cleanBase64 = result.replace(/^data:[^;]+;base64,/, '');
          const newMaterial: UploadedMaterial = {
            id: `mat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            name: file.name,
            type: isPdf ? 'pdf' : 'image',
            mimeType: isPdf ? 'application/pdf' : file.type || 'image/jpeg',
            base64Data: cleanBase64,
            previewUrl: isImage ? result : undefined,
            sizeBytes: file.size,
          };

          setMaterials((prev) => [...prev, newMaterial]);
        };
        reader.readAsDataURL(file);
      }
    });
  };


  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
      e.target.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleRemoveMaterial = (id: string) => {
    setMaterials((prev) => prev.filter((m) => m.id !== id));
  };

  // Load a demo preset
  const handleLoadDemoPreset = (presetId: string) => {
    const preset = DEMO_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    setSubject(preset.name);
    setTopic(preset.topic);
    setLevel(preset.level);
    setDifficulty(preset.difficulty);
    setTestCount(preset.testCount);
    setOpenCount(preset.openCount);
    setAdditionalNotes(preset.sampleNotesText);

    // Create a plain text material from the demo notes
    const encoder = new TextEncoder();
    const bytes = encoder.encode(preset.sampleNotesText);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64Notes = btoa(binary);

    const demoDoc: UploadedMaterial = {
      id: `demo_${Date.now()}`,
      name: `Temario_${preset.name.replace(/\s+/g, '_')}.txt`,
      type: 'text',
      mimeType: 'text/plain',
      base64Data: base64Notes,
      sizeBytes: bytes.byteLength,
    };

    setMaterials([demoDoc]);
    setValidationError(null);
  };

  const handleSubmit = async (e?: React.FormEvent, isMultiplayer = false) => {
    if (e) e.preventDefault();
    setValidationError(null);

    const trimmedSubject = (subject || '').trim();
    const trimmedTopic = (topic || '').trim();
    const parsedTestCount = Math.max(0, Number(testCount) || 0);
    const parsedOpenCount = Math.max(0, Number(openCount) || 0);
    const totalQuestions = parsedTestCount + parsedOpenCount;

    // Frontend validation: subject must not be empty
    if (!trimmedSubject) {
      setValidationError('El campo de la asignatura es obligatorio y no puede estar vacío.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (!trimmedTopic) {
      setValidationError('Por favor, escribe qué tema o unidad didáctica estás estudiando.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Frontend validation: total questions must be greater than 0
    if (totalQuestions <= 0) {
      setValidationError(
        'El número total de preguntas debe ser mayor a 0. Configura al menos una pregunta tipo test o de desarrollo antes de enviar la petición.'
      );
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (materials.length === 0 && !additionalNotes.trim()) {
      setValidationError(
        'Debes adjuntar al menos una foto o un archivo de tu temario (o cargar un temario de ejemplo) para que la IA elabore el examen.'
      );
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const config: ExamSetupConfig = {
      subject: trimmedSubject,
      topic: trimmedTopic,
      level,
      difficulty,
      testCount: parsedTestCount,
      openCount: parsedOpenCount,
      timed,
      timeLimitMinutes: timed ? timeLimitMinutes : 0,
      additionalNotes: additionalNotes.trim(),
    };

    try {
      await onGenerate(config, materials, isMultiplayer);
    } catch (err: any) {
      let msg = err.message || 'Error al generar el examen con IA. Inténtalo de nuevo.';
      try {
        const parsed = JSON.parse(msg);
        if (parsed?.error?.message) msg = parsed.error.message;
      } catch {}
      setValidationError(msg);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      {/* Intro Header con Título Visible y Descriptivo para SEO y Sistema Educativo de España */}
      <div className="text-center max-w-4xl mx-auto mb-8 sm:mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-200/80 text-indigo-800 text-xs font-semibold mb-3 shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-bold">Adaptado al Sistema Educativo de España</span>
          <span className="text-indigo-400">•</span>
          <span>LOMLOE & PAU 2025/2026</span>
        </div>
        <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
          Generador de exámenes con IA adaptado a LOMLOE, ESO, Bachillerato y PAU en España
        </h1>
        <p className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed max-w-3xl mx-auto">
          Crea exámenes a medida y simulacros oficiales con IA pedagógica. Elige tu etapa (<strong className="font-semibold text-slate-900">ESO</strong>, <strong className="font-semibold text-slate-900">Bachillerato</strong> o <strong className="font-semibold text-slate-900">Preparación PAU / EBAU</strong>), selecciona una de las materias del currículo oficial de España o sube <strong className="font-semibold text-slate-900">fotos de tus apuntes y PDF</strong>.
        </p>

        {/* Quick Shortcut to Homework Solver */}
        {onNavigateToHomework && (
          <div className="mt-4 inline-flex flex-wrap items-center justify-center gap-2 p-1.5 sm:p-2 pr-3 sm:pr-4 rounded-2xl bg-emerald-50/80 border border-emerald-200/80 text-xs sm:text-sm text-emerald-950 shadow-xs">
            <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white font-extrabold text-[11px] uppercase tracking-wide">
              Nuevo
            </span>
            <span>¿Tienes ejercicios o deberes difíciles? Sube su foto y te lo resuelve paso a paso con explicación.</span>
            <button
              type="button"
              onClick={onNavigateToHomework}
              className="font-bold text-emerald-700 hover:text-emerald-900 underline underline-offset-2 flex items-center gap-0.5 transition-colors ml-1"
            >
              <span>Ir a Resolver Deberes →</span>
            </button>
          </div>
        )}
      </div>

      {/* Error alert */}
      {validationError && (
        <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">
                {validationError.includes('503') || validationError.includes('demanda')
                  ? 'Sobrecarga temporal del modelo IA (503)'
                  : 'Revisa los datos del examen:'}
              </p>
              <p className="text-xs sm:text-sm mt-0.5 leading-relaxed">{validationError}</p>
            </div>
          </div>
          {(validationError.includes('503') || validationError.includes('demanda') || validationError.includes('segundos') || validationError.includes('instantes')) && (
            <button
              type="button"
              onClick={() => handleSubmit()}
              className="self-start sm:self-center px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs whitespace-nowrap shadow-xs transition-colors"
            >
              Reintentar ahora
            </button>
          )}
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Selector Estructurado por Niveles y Materias (LOMLOE y PAU España) */}
        <div className="bg-gradient-to-br from-indigo-50/60 via-white to-slate-50/80 rounded-2xl p-5 sm:p-6 border border-indigo-100 shadow-xs space-y-5">
          {/* Header del Selector con Selector de Dificultad */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-indigo-100/60">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">🇪🇸</span>
                <h2 className="text-sm sm:text-base font-bold text-slate-900">
                  Selector Oficial por Etapas y Materias
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold uppercase tracking-wider">
                  LOMLOE & PAU
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Selecciona la etapa educativa para cargar materias oficiales y modelos de examen adaptados al currículo de España
              </p>
            </div>

            {/* Dificultad del examen */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="text-xs font-semibold text-slate-500">Dificultad:</span>
              <div className="inline-flex items-center p-0.5 bg-slate-200/80 rounded-xl text-xs font-semibold">
                {(['Fácil', 'Media', 'Difícil'] as ExamDifficulty[]).map((dif) => (
                  <button
                    key={dif}
                    type="button"
                    onClick={() => setDifficulty(dif)}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      difficulty === dif
                        ? 'bg-white text-indigo-700 shadow-xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {dif}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 3 Pestañas Visuales Destacadas: ESO (1º a 4º), Bachillerato (1º y 2º) y Preparación PAU / EBAU */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-1.5 bg-slate-100/80 rounded-2xl border border-slate-200/80">
            {SPANISH_STAGES.map((stg) => {
              const isActive = selectedStage === stg.id;
              return (
                <button
                  key={stg.id}
                  type="button"
                  onClick={() => {
                    setSelectedStage(stg.id);
                    setLevel(stg.defaultLevel);
                    // Seleccionar la primera materia de esta etapa para que se muestre de inmediato
                    const stageFirstSub = QUICK_SUBJECTS.find((qs) => qs.stage === stg.id);
                    if (stageFirstSub) {
                      setSelectedQuickSubjectId(stageFirstSub.id);
                    }
                    if (validationError) setValidationError(null);
                  }}
                  className={`relative flex flex-col items-start text-left p-3 sm:p-3.5 rounded-xl transition-all ${
                    isActive
                      ? 'bg-white text-slate-950 shadow-md ring-2 ring-indigo-500/20 border border-slate-200/90 scale-[1.01]'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 border border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between w-full gap-2 mb-1">
                    <span className={`text-sm font-black tracking-tight ${isActive ? 'text-indigo-600' : 'text-slate-800'}`}>
                      {stg.label}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                        isActive
                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/60'
                          : 'bg-slate-200/70 text-slate-600'
                      }`}
                    >
                      {stg.badge}
                    </span>
                  </div>
                  <p className="text-[11px] leading-snug text-slate-500 font-normal">
                    {stg.sublabel}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Chips y Tarjetas con las Materias Oficiales de la Etapa Seleccionada */}
          {(() => {
            const stageSubjects = QUICK_SUBJECTS.filter((qs) => qs.stage === selectedStage);
            const activeQs =
              stageSubjects.find((qs) => qs.id === selectedQuickSubjectId) ||
              stageSubjects.find((qs) => qs.name.toLowerCase() === subject.toLowerCase()) ||
              stageSubjects[0];

            return (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                      <span>
                        Materias oficiales en{' '}
                        <strong className="text-indigo-700">
                          {selectedStage === 'eso'
                            ? 'ESO (1º a 4º)'
                            : selectedStage === 'bachillerato'
                            ? 'Bachillerato (1º y 2º)'
                            : 'Preparación PAU / EBAU'}
                        </strong>
                        :
                      </span>
                    </span>
                    <span className="hidden sm:inline text-[11px] text-slate-400 font-medium">
                      Haz clic para cargar temas del currículo oficial
                    </span>
                  </div>

                  {/* Grid de Materias Oficiales */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                    {stageSubjects.map((qs) => {
                      const isSelected =
                        subject === qs.name || selectedQuickSubjectId === qs.id;
                      return (
                        <button
                          key={qs.id}
                          type="button"
                          onClick={() => {
                            setSelectedQuickSubjectId(qs.id);
                            setSubject(qs.name);
                            setLevel(qs.defaultLevel);
                            if (validationError) setValidationError(null);
                          }}
                          className={`flex items-center gap-2 p-2.5 rounded-xl text-left border transition-all ${
                            isSelected
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-600/20 scale-[1.02] font-bold'
                              : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <span className="text-base shrink-0">{qs.icon}</span>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold truncate leading-tight">{qs.shortName}</p>
                            {qs.badge && (
                              <p className={`text-[10px] truncate leading-tight mt-0.5 ${isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>
                                {qs.badge}
                              </p>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Temas / Bloques de Saberes Básicos de la Materia Activa */}
                {activeQs && (
                  <div className="pt-3 border-t border-indigo-100/60 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-1.5">
                        <BookMarked className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                          Temario y Bloques Oficiales en <strong className="text-indigo-700">{activeQs.name}</strong>:
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {activeQs.topics.map((t) => {
                          const isCurrentTopic = topic === t.title;
                          return (
                            <button
                              key={t.title}
                              type="button"
                              onClick={() => {
                                setSelectedQuickSubjectId(activeQs.id);
                                setSubject(activeQs.name);
                                setTopic(t.title);
                                setLevel(activeQs.defaultLevel);
                                setAdditionalNotes(t.sampleNotes);
                                if (validationError) setValidationError(null);
                              }}
                              className={`px-2.5 py-1.5 text-xs rounded-xl font-medium border transition-all text-left ${
                                isCurrentTopic
                                  ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-bold shadow-2xs'
                                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                              }`}
                            >
                              {t.title}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {onNavigateToFlashcards && (
                      <button
                        type="button"
                        onClick={() =>
                          onNavigateToFlashcards(
                            subject || activeQs.name,
                            topic || activeQs.topics[0]?.title,
                            level
                          )
                        }
                        className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold transition-all shadow-2xs shrink-0"
                        title="Estudiar este temario con tarjetas interactivas antes de generar el examen"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                        <span>Estudiar con Flashcards</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })()}
        </div>

        {/* Step 1: Materia, Tema y Nivel */}
        <div className="bg-white rounded-2xl p-5 sm:p-7 border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
              1
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                ¿Qué estás estudiando?
              </h2>
              <p className="text-xs text-slate-500">
                Indica la materia, el tema específico y el nivel académico
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Materia */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>Materia / Asignatura <span className="text-rose-500">*</span></span>
                {!subject.trim() && (
                  <span className="text-[10px] text-rose-500 font-semibold lowercase">obligatorio</span>
                )}
              </label>
              <div className="relative">
                <BookMarked className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                <input
                  id="input-subject"
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => {
                    setSubject(e.target.value);
                    if (validationError && e.target.value.trim()) setValidationError(null);
                  }}
                  placeholder="Ej. Biología Celular, Historia de España, Matemáticas..."
                  className={`w-full pl-9 pr-3 py-2.5 bg-slate-50 border rounded-xl text-sm text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all ${
                    !subject.trim() && validationError
                      ? 'border-rose-400 ring-1 ring-rose-300'
                      : 'border-slate-200'
                  }`}
                />
              </div>

              {/* Suggestions chips */}
              <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] text-slate-400 font-medium">Sugerencias:</span>
                {POPULAR_SUBJECTS.slice(0, 4).map((sub) => (
                  <button
                    key={sub}
                    type="button"
                    onClick={() => {
                      setSubject(sub);
                      if (validationError) setValidationError(null);
                    }}
                    className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 transition-colors"
                  >
                    {sub}
                  </button>
                ))}
              </div>
            </div>

            {/* Tema */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>Tema específico <span className="text-rose-500">*</span></span>
                {!topic.trim() && (
                  <span className="text-[10px] text-rose-500 font-semibold lowercase">obligatorio</span>
                )}
              </label>
              <div className="relative">
                <Layers className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                <input
                  id="input-topic"
                  type="text"
                  required
                  value={topic}
                  onChange={(e) => {
                    setTopic(e.target.value);
                    if (validationError && e.target.value.trim()) setValidationError(null);
                  }}
                  placeholder="Ej. La Fotosíntesis y la Respiración Celular, Guerra Fría..."
                  className={`w-full pl-9 pr-3 py-2.5 bg-slate-50 border rounded-xl text-sm text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all ${
                    !topic.trim() && validationError
                      ? 'border-rose-400 ring-1 ring-rose-300'
                      : 'border-slate-200'
                  }`}
                />
              </div>
              <p className="mt-1.5 text-[11px] text-slate-400">
                La IA centrará las preguntas en este tema específico según tu material.
              </p>
            </div>
          </div>

          {/* Educational Level Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
              Nivel educativo
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              {EDUCATIONAL_LEVELS.map((item) => {
                const isSelected = level === item.level;
                return (
                  <button
                    key={item.level}
                    type="button"
                    onClick={() => setLevel(item.level)}
                    className={`p-3 rounded-xl text-left border transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/70 shadow-sm ring-1 ring-indigo-600'
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <GraduationCap
                        className={`w-4 h-4 ${isSelected ? 'text-indigo-600' : 'text-slate-400'}`}
                      />
                      {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                    </div>
                    <div>
                      <div
                        className={`text-xs font-bold leading-tight ${
                          isSelected ? 'text-indigo-900' : 'text-slate-800'
                        }`}
                      >
                        {item.label}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                        {item.desc}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Step 2: Temario (Fotos o PDF) */}
        <div className="bg-white rounded-2xl p-5 sm:p-7 border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
                2
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  Temario de estudio (Fotos o PDF)
                </h2>
                <p className="text-xs text-slate-500">
                  Sube fotografías de tu cuaderno o libro, o un archivo PDF de tus apuntes
                </p>
              </div>
            </div>

            {/* Demo Preset Buttons */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-semibold text-slate-400 mr-1">Probar con temario:</span>
              <button
                type="button"
                onClick={() => handleLoadDemoPreset('bio_fotosintesis')}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200/60 hover:bg-emerald-100 transition-colors"
              >
                🌱 Biología
              </button>
              <button
                type="button"
                onClick={() => handleLoadDemoPreset('hist_guerra_fria')}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-50 text-amber-700 border border-amber-200/60 hover:bg-amber-100 transition-colors"
              >
                📜 Historia
              </button>
              <button
                type="button"
                onClick={() => handleLoadDemoPreset('info_estructuras')}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 border border-blue-200/60 hover:bg-blue-100 transition-colors"
              >
                💻 Informática
              </button>
            </div>
          </div>

          {/* Upload Dropzone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`relative border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center transition-all ${
              isDragging
                ? 'border-indigo-600 bg-indigo-50/50 scale-[1.005]'
                : 'border-slate-300 hover:border-indigo-400 bg-slate-50/50'
            }`}
          >
            {/* Hidden file inputs */}
            <input
              id="file-upload-input"
              type="file"
              multiple
              accept="image/*,.pdf,.txt,.md"
              onChange={handleFileInputChange}
              className="hidden"
            />
            <input
              id="photo-upload-input"
              ref={photoInputRef}
              type="file"
              multiple
              accept="image/png,image/jpeg,image/webp,image/jpg"
              onChange={handleFileInputChange}
              className="hidden"
            />
            <input
              id="doc-upload-input"
              ref={docInputRef}
              type="file"
              multiple
              accept=".pdf,.txt,.md,application/pdf,text/plain"
              onChange={handleFileInputChange}
              className="hidden"
            />

            <div className="max-w-xl mx-auto flex flex-col items-center">
              <div className="w-14 h-14 rounded-2xl bg-indigo-100/70 text-indigo-600 flex items-center justify-center mb-3 shadow-inner">
                <UploadCloud className="w-7 h-7" />
              </div>
              <h3 className="text-sm sm:text-base font-bold text-slate-800">
                Sube o arrastra tus fotos de apuntes, PDF o documentos TXT
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md">
                Gemini Multimodal extraerá el contenido (fórmulas, esquemas y letra manuscrita) para formular preguntas basadas exactamente en tu temario.
              </p>

              {/* Action buttons inside dropzone */}
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-sm transition-all active:scale-95"
                >
                  <ImageIcon className="w-4 h-4" />
                  <span>Subir fotos (JPG, PNG)</span>
                </button>

                <button
                  type="button"
                  onClick={() => docInputRef.current?.click()}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition-all active:scale-95"
                >
                  <FileText className="w-4 h-4 text-rose-600" />
                  <span>Subir documento (PDF, TXT)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsCameraOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition-all active:scale-95"
                >
                  <Camera className="w-4 h-4 text-indigo-600" />
                  <span>Tomar foto con cámara</span>
                </button>
              </div>

              {/* Vision OCR badge */}
              <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200/50 text-indigo-800 text-[11px] font-medium">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span>Visión y OCR Activo: extrae automáticamente el texto de fotos de pizarras o cuadernos</span>
              </div>
            </div>
          </div>

          {/* Uploaded Materials Preview Grid */}
          {materials.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                <span>Materiales adjuntados para la IA ({materials.length}):</span>
                <button
                  type="button"
                  onClick={() => setMaterials([])}
                  className="text-rose-600 hover:text-rose-800 transition-colors"
                >
                  Eliminar todos
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {materials.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl shadow-xs group hover:border-indigo-300 transition-all"
                  >
                    {m.previewUrl ? (
                      <img
                        src={m.previewUrl}
                        alt={m.name}
                        className="w-12 h-12 rounded-lg object-cover bg-slate-100 shrink-0 border border-slate-100"
                      />
                    ) : m.type === 'pdf' ? (
                      <div className="w-12 h-12 rounded-lg bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                        <FileText className="w-6 h-6" />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                        <FileText className="w-6 h-6" />
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-800 truncate" title={m.name}>
                        {m.name}
                      </p>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">
                        {m.type === 'pdf'
                          ? 'Documento PDF'
                          : m.type === 'text'
                          ? 'Texto / Apuntes TXT'
                          : 'Foto de Apuntes (OCR)'}{' '}
                        • {Math.round(m.sizeBytes / 1024)} KB
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveMaterial(m.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Quitar material"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Optional: Text notes or highlights */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Notas adicionales o texto del temario (opcional)
            </label>
            <textarea
              rows={3}
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              placeholder="Puedes pegar aquí un fragmento de apuntes, definiciones clave o instrucciones para la IA (ej. 'Hacer hincapié en la fase lumínica')..."
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all resize-y"
            />
          </div>
        </div>

        {/* Step 3: Configuración del Examen */}
        <div className="bg-white rounded-2xl p-5 sm:p-7 border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
              3
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Formato y Dificultad del Examen
              </h2>
              <p className="text-xs text-slate-500">
                Ajusta el número de preguntas tipo test y preguntas de desarrollo
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Preguntas Tipo Test */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ListOrdered className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Preguntas Tipo Test (4 opciones)
                  </span>
                </div>
                <span className="text-base font-extrabold text-indigo-600 bg-indigo-100/70 px-2.5 py-0.5 rounded-lg">
                  {testCount}
                </span>
              </div>
              <input
                id="range-test-count"
                type="range"
                min={0}
                max={15}
                value={testCount}
                onChange={(e) => setTestCount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                <span>0 preguntas</span>
                <span>5 recomendadas</span>
                <span>15 preguntas</span>
              </div>
            </div>

            {/* Preguntas Normales / Desarrollo */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Preguntas de Desarrollo (Normales)
                  </span>
                </div>
                <span className="text-base font-extrabold text-indigo-600 bg-indigo-100/70 px-2.5 py-0.5 rounded-lg">
                  {openCount}
                </span>
              </div>
              <input
                id="range-open-count"
                type="range"
                min={0}
                max={5}
                value={openCount}
                onChange={(e) => setOpenCount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                <span>0 preguntas</span>
                <span>2 recomendadas</span>
                <span>5 preguntas</span>
              </div>
            </div>
          </div>

          {/* Total Questions Indicator with Validation Alert */}
          <div
            className={`p-3.5 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 transition-all ${
              testCount + openCount > 0
                ? 'bg-indigo-50/50 border-indigo-200/70 text-indigo-900'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            <div className="flex items-center gap-2 text-xs font-semibold">
              <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>
                Total de preguntas configuradas:{' '}
                <strong className="text-sm font-extrabold">
                  {testCount + openCount}
                </strong>{' '}
                ({testCount} tipo test + {openCount} de desarrollo)
              </span>
            </div>
            {testCount + openCount === 0 && (
              <span className="text-xs font-bold text-rose-700 bg-white/80 px-2.5 py-1 rounded-lg border border-rose-200">
                ⚠️ Debe haber al menos 1 pregunta en total
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
            {/* Dificultad */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Dificultad
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['Fácil', 'Media', 'Difícil'] as ExamDifficulty[]).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDifficulty(d)}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all ${
                      difficulty === d
                        ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm'
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Temporizador */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Temporizador
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setTimed(!timed)}
                  className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl border flex items-center justify-center gap-2 transition-all ${
                    timed
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                      : 'border-slate-200 bg-slate-50 text-slate-500'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>{timed ? 'Con límite de tiempo' : 'Sin temporizador'}</span>
                </button>

                {timed && (
                  <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
                    <input
                      type="number"
                      min={5}
                      max={120}
                      value={timeLimitMinutes}
                      onChange={(e) => setTimeLimitMinutes(Number(e.target.value))}
                      className="w-12 text-center text-xs font-bold text-slate-800 bg-transparent focus:outline-none"
                    />
                    <span className="text-[11px] text-slate-500 font-semibold">min</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="pt-3 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              id="btn-generate-exam"
              type="button"
              onClick={(e) => handleSubmit(e, false)}
              disabled={isLoading}
              className="w-full py-4 px-5 bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-700 hover:from-indigo-700 hover:to-violet-800 text-white font-extrabold rounded-2xl shadow-lg shadow-indigo-600/20 transition-all transform active:scale-[0.99] disabled:opacity-60 flex items-center justify-center gap-2.5 text-sm sm:text-base cursor-pointer"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Creando examen con IA...</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  <span>Hacer Examen Individual</span>
                </>
              )}
            </button>

            <button
              id="btn-generate-exam-multiplayer"
              type="button"
              onClick={onOpenJoinRoom}
              className="w-full py-4 px-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 hover:from-indigo-950 hover:to-slate-900 text-white font-extrabold rounded-2xl shadow-lg border border-indigo-500/40 transition-all transform active:scale-[0.99] flex items-center justify-center gap-2.5 text-sm sm:text-base cursor-pointer"
            >
              <Users className="w-4 h-4 text-amber-400" />
              <span>Hacer con Amigos (Poner Código PIN)</span>
            </button>
          </div>

          <div className="text-center pt-1 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-500">
            <button
              id="btn-link-host-room"
              type="button"
              onClick={(e) => handleSubmit(e, true)}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 font-semibold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>¿Quieres ser el anfitrión? Crear sala generando este temario</span>
            </button>
          </div>

          <p className="text-center text-xs text-slate-500 pt-1">
            Al terminar el examen, podrás descargar un informe PDF completo con todas las correcciones y notas finales.
          </p>
        </div>
      </form>

      {/* Camera Capture Modal */}
      <CameraModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={(material) => setMaterials((prev) => [...prev, material])}
      />
    </div>
  );
};
