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
  Wand2,
} from 'lucide-react';
import { DEMO_PRESETS, POPULAR_SUBJECTS } from '../data/demoMaterials';
import { EducationalLevel, ExamDifficulty, ExamSetupConfig, UploadedMaterial } from '../types';
import { CameraModal } from './CameraModal';

interface ExamSetupFormProps {
  onGenerate: (config: ExamSetupConfig, materials: UploadedMaterial[]) => Promise<void>;
  isLoading: boolean;
  onOpenAuthRequired: () => void;
  isAuthenticated: boolean;
}

const EDUCATIONAL_LEVELS: { level: EducationalLevel; label: string; desc: string }[] = [
  { level: 'Primaria', label: 'Primaria', desc: '6 - 12 años' },
  { level: 'Secundaria (ESO)', label: 'Secundaria (ESO)', desc: '12 - 16 años' },
  { level: 'Bachillerato', label: 'Bachillerato', desc: '16 - 18 años / Selectividad' },
  { level: 'Formación Profesional', label: 'Formación Profesional', desc: 'Grado Medio y Superior' },
  { level: 'Universidad / Grado', label: 'Universidad', desc: 'Grado / Carrera Universitaria' },
  { level: 'Máster / Oposiciones', label: 'Máster / Oposiciones', desc: 'Exámenes competitivos' },
];

export const ExamSetupForm: React.FC<ExamSetupFormProps> = ({
  onGenerate,
  isLoading,
  onOpenAuthRequired,
  isAuthenticated,
}) => {
  // Form state
  const [subject, setSubject] = useState('Biología Celular');
  const [topic, setTopic] = useState('La Fotosíntesis y la Respiración Celular');
  const [level, setLevel] = useState<EducationalLevel>('Bachillerato');
  const [difficulty, setDifficulty] = useState<ExamDifficulty>('Media');
  const [testCount, setTestCount] = useState<number>(5);
  const [openCount, setOpenCount] = useState<number>(2);
  const [timed, setTimed] = useState<boolean>(true);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState<number>(20);
  const [additionalNotes, setAdditionalNotes] = useState<string>('');

  // Uploaded materials
  const [materials, setMaterials] = useState<UploadedMaterial[]>([]);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isCameraOpen, setIsCameraOpen] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Handle file input (Photos / PDF)
  const processFiles = (files: FileList | File[]) => {
    setValidationError(null);
    const fileArray = Array.from(files);

    fileArray.forEach((file) => {
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      const isImage = file.type.startsWith('image/');

      if (!isPdf && !isImage) {
        setValidationError(`El archivo "${file.name}" no es una foto ni un PDF válido.`);
        return;
      }

      if (file.size > 20 * 1024 * 1024) {
        setValidationError(`El archivo "${file.name}" excede el límite máximo de 20 MB.`);
        return;
      }

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

    // Create a simulated PDF material from the demo notes
    const encoder = new TextEncoder();
    const bytes = encoder.encode(preset.sampleNotesText);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64Notes = btoa(binary);

    const demoDoc: UploadedMaterial = {
      id: `demo_${Date.now()}`,
      name: `Temario_${preset.name.replace(/\s+/g, '_')}.pdf`,
      type: 'pdf',
      mimeType: 'application/pdf',
      base64Data: base64Notes,
      sizeBytes: bytes.byteLength,
    };

    setMaterials([demoDoc]);
    setValidationError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!subject.trim()) {
      setValidationError('Por favor, indica de qué materia es el examen.');
      return;
    }
    if (!topic.trim()) {
      setValidationError('Por favor, escribe qué tema estás estudiando.');
      return;
    }
    if (materials.length === 0 && !additionalNotes.trim()) {
      setValidationError(
        'Debes adjuntar al menos una foto o un PDF de tu temario (o cargar un temario de ejemplo) para que la IA elabore el examen.'
      );
      return;
    }

    const config: ExamSetupConfig = {
      subject: subject.trim(),
      topic: topic.trim(),
      level,
      difficulty,
      testCount,
      openCount,
      timed,
      timeLimitMinutes: timed ? timeLimitMinutes : 0,
      additionalNotes: additionalNotes.trim(),
    };

    try {
      await onGenerate(config, materials);
    } catch (err: any) {
      setValidationError(err.message || 'Error al generar el examen con IA. Inténtalo de nuevo.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      {/* Intro Header */}
      <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200/60 text-indigo-700 text-xs font-semibold mb-3">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          <span>Inteligencia Artificial Multimodal</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Crea tu Examen a Medida con tu Temario
        </h1>
        <p className="mt-2.5 text-sm sm:text-base text-slate-600 leading-relaxed">
          Sube <strong className="font-semibold text-slate-900">fotos de tus apuntes</strong> o un{' '}
          <strong className="font-semibold text-slate-900">PDF</strong>, indica la materia, tema y
          nivel, y la IA generará un examen con preguntas tipo test y de desarrollo.
        </p>
      </div>

      {/* Error alert */}
      {validationError && (
        <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-3 animate-fadeIn">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Revisa los datos del examen:</p>
            <p className="text-xs sm:text-sm mt-0.5">{validationError}</p>
          </div>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-8">
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
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Materia / Asignatura
              </label>
              <div className="relative">
                <BookMarked className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                <input
                  id="input-subject"
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Ej. Biología Celular, Historia de España, Matemáticas..."
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                />
              </div>

              {/* Suggestions chips */}
              <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] text-slate-400 font-medium">Sugerencias:</span>
                {POPULAR_SUBJECTS.slice(0, 4).map((sub) => (
                  <button
                    key={sub}
                    type="button"
                    onClick={() => setSubject(sub)}
                    className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 transition-colors"
                  >
                    {sub}
                  </button>
                ))}
              </div>
            </div>

            {/* Tema */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Tema específico
              </label>
              <div className="relative">
                <Layers className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                <input
                  id="input-topic"
                  type="text"
                  required
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Ej. La Fotosíntesis y la Respiración Celular, Guerra Fría..."
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
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
            <input
              id="file-upload-input"
              type="file"
              multiple
              accept="image/*,.pdf"
              onChange={handleFileInputChange}
              className="hidden"
            />

            <div className="max-w-md mx-auto flex flex-col items-center">
              <div className="w-14 h-14 rounded-2xl bg-indigo-100/70 text-indigo-600 flex items-center justify-center mb-3 shadow-inner">
                <UploadCloud className="w-7 h-7" />
              </div>
              <h3 className="text-sm sm:text-base font-bold text-slate-800">
                Arrastra aquí tus fotos o PDF del temario
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                Acepta imágenes (JPG, PNG, WEBP) o documentos PDF de hasta 20 MB cada uno.
              </p>

              {/* Action buttons inside dropzone */}
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
                <label
                  htmlFor="file-upload-input"
                  className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-sm transition-all active:scale-95"
                >
                  <FileUp className="w-4 h-4" />
                  <span>Explorar archivos</span>
                </label>

                <button
                  type="button"
                  onClick={() => setIsCameraOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs sm:text-sm font-semibold rounded-xl shadow-sm transition-all active:scale-95"
                >
                  <Camera className="w-4 h-4 text-indigo-600" />
                  <span>Tomar foto con cámara</span>
                </button>
              </div>
            </div>
          </div>

          {/* Uploaded Materials Preview Grid */}
          {materials.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                <span>Materiales adjuntados ({materials.length}):</span>
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
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                        <FileText className="w-6 h-6" />
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-800 truncate" title={m.name}>
                        {m.name}
                      </p>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">
                        {m.type === 'pdf' ? 'Documento PDF' : 'Fotografía'} •{' '}
                        {Math.round(m.sizeBytes / 1024)} KB
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
                min={2}
                max={15}
                value={testCount}
                onChange={(e) => setTestCount(Number(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                <span>2 preguntas</span>
                <span>8 recomendadas</span>
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
                min={1}
                max={5}
                value={openCount}
                onChange={(e) => setOpenCount(Number(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                <span>1 pregunta</span>
                <span>2 recomendadas</span>
                <span>5 preguntas</span>
              </div>
            </div>
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

        {/* Submit Button */}
        <div className="pt-2">
          <button
            id="btn-generate-exam"
            type="submit"
            disabled={isLoading}
            className="w-full py-4 px-6 bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-700 hover:from-indigo-700 hover:to-violet-800 text-white font-extrabold rounded-2xl shadow-xl shadow-indigo-600/25 transition-all transform active:scale-[0.99] disabled:opacity-60 flex items-center justify-center gap-3 text-base sm:text-lg"
          >
            {isLoading ? (
              <>
                <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                <span>La IA está leyendo tu temario y creando el examen...</span>
              </>
            ) : (
              <>
                <Wand2 className="w-5 h-5" />
                <span>Generar Examen con IA ({testCount + openCount} preguntas)</span>
              </>
            )}
          </button>
          <p className="text-center text-xs text-slate-500 mt-2.5">
            Las preguntas tipo test se corregirán al instante y las preguntas de desarrollo serán
            evaluadas con retroalimentación detallada por la IA.
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
