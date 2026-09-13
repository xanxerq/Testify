import React, { useState, useRef } from 'react';
import Markdown from 'react-markdown';
import {
  BookOpen,
  Sparkles,
  FileText,
  Copy,
  Check,
  Download,
  Trash2,
  Search,
  ArrowLeft,
  GraduationCap,
  Layers,
  BookMarked,
  Tag,
  HelpCircle,
  Lightbulb,
  Printer,
  ChevronDown,
  ChevronUp,
  PlusCircle,
  FileUp,
  Upload,
  Camera,
  X,
  Eye,
  Globe,
  Share2,
  Heart,
  BookmarkPlus,
  UserCheck,
  RefreshCw,
} from 'lucide-react';
import {
  EducationalLevel,
  NotesStyle,
  StudyNote,
  StudyNotesSetupConfig,
  UploadedMaterial,
  User,
} from '../types';
import { notesService } from '../services/notesService';
import { geminiService } from '../services/geminiService';
import { CameraModal } from './CameraModal';
import { usePdc } from '../context/PdcContext';
import { PdcAdaptationButton } from './PdcAdaptationButton';

interface StudyNotesViewProps {
  user: User | null;
  onOpenAuthRequired: () => void;
  onGenerateExamFromNote: (note: StudyNote) => void;
}

const EDUCATIONAL_LEVELS: EducationalLevel[] = [
  'Primaria',
  'Secundaria (ESO)',
  'Bachillerato',
  'Formación Profesional',
  'Universidad / Grado',
  'Máster / Oposiciones',
];

const NOTES_STYLES: { id: NotesStyle; name: string; desc: string; icon: React.ReactNode }[] = [
  {
    id: 'comprehensive',
    name: 'Resumen Completo',
    desc: 'Explicación profunda paso a paso con contexto, ejemplos prácticos y errores comunes.',
    icon: <BookOpen className="w-4 h-4 text-indigo-600" />,
  },
  {
    id: 'outline',
    name: 'Esquema Conceptual',
    desc: 'Estructura visual con viñetas jerárquicas, relaciones clave y términos destacados.',
    icon: <Layers className="w-4 h-4 text-indigo-600" />,
  },
  {
    id: 'flashcards',
    name: 'Tarjetas de Repaso',
    desc: 'Metodología Active Recall con preguntas fundamentales y respuestas concisas.',
    icon: <HelpCircle className="w-4 h-4 text-indigo-600" />,
  },
  {
    id: 'glossary',
    name: 'Glosario y Fórmulas',
    desc: 'Definiciones técnicas rigurosas, fórmulas científicas/matemáticas y principios clave.',
    icon: <FileText className="w-4 h-4 text-indigo-600" />,
  },
];

const SAMPLE_NOTE_PRESETS = [
  {
    name: 'Historia Contemporánea',
    topic: 'La Guerra Fría y la Crisis de los Misiles en Cuba (1962)',
    level: 'Bachillerato' as EducationalLevel,
    style: 'comprehensive' as NotesStyle,
    instructions: 'Destacar las causas geopolíticas, la doctrina MAD y los acuerdos Kennedy-Jrushchov.',
  },
  {
    name: 'Filosofía',
    topic: 'La Teoría de las Ideas y el Mito de la Caverna de Platón',
    level: 'Bachillerato' as EducationalLevel,
    style: 'outline' as NotesStyle,
    instructions: 'Comparar el Mundo Sensible y el Mundo Inteligible, y la Alegoría de la Línea.',
  },
  {
    name: 'Química',
    topic: 'Termoquímica: Entalpía, Ley de Hess y Espontaneidad de Gibbs',
    level: 'Universidad / Grado' as EducationalLevel,
    style: 'glossary' as NotesStyle,
    instructions: 'Incluir fórmulas termodinámicas, criterios de espontaneidad (ΔG = ΔH - TΔS) y unidades.',
  },
];

export const StudyNotesView: React.FC<StudyNotesViewProps> = ({
  user,
  onOpenAuthRequired,
  onGenerateExamFromNote,
}) => {
  // View mode: 'create' form, 'library' list, 'community' shared notes, or 'read' view
  const [subView, setSubView] = useState<'create' | 'library' | 'community' | 'read'>('create');
  const [savedNotes, setSavedNotes] = useState<StudyNote[]>(() =>
    notesService.getNotes(user?.id)
  );
  // Default to null so no unwanted preloaded notes are shown
  const [activeNote, setActiveNote] = useState<StudyNote | null>(null);

  // Community published notes state
  const [publishedNotes, setPublishedNotes] = useState<StudyNote[]>(() =>
    notesService.getCachedPublishedNotes()
  );
  const [isLoadingCommunity, setIsLoadingCommunity] = useState<boolean>(false);
  const [communitySearchQuery, setCommunitySearchQuery] = useState<string>('');
  const [communitySubjectFilter, setCommunitySubjectFilter] = useState<string>('all');
  const [publishModalNote, setPublishModalNote] = useState<StudyNote | null>(null);
  const [authorDisplayName, setAuthorDisplayName] = useState<string>(user?.name || 'Estudiante');
  const [isSubmittingPublish, setIsSubmittingPublish] = useState<boolean>(false);
  const [copiedPublicId, setCopiedPublicId] = useState<string | null>(null);
  const [likedNoteIds, setLikedNoteIds] = useState<Record<string, boolean>>({});

  const { isPdcActive } = usePdc();

  // Form states (completely empty by default, no prefilled text)
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [level, setLevel] = useState<EducationalLevel>('Bachillerato');
  const [style, setStyle] = useState<NotesStyle>('comprehensive');
  const [focusKeywords, setFocusKeywords] = useState('');
  const [additionalInstructions, setAdditionalInstructions] = useState('');
  const [materials, setMaterials] = useState<UploadedMaterial[]>([]);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generation status
  const [isGenerating, setIsGenerating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  // Library search & filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('all');

  // Active recall toggle states for reader view
  const [revealedAnswers, setRevealedAnswers] = useState<Record<number, boolean>>({});

  // Reload notes when user changes
  const reloadNotes = () => {
    const fresh = notesService.getNotes(user?.id);
    setSavedNotes(fresh);
  };

  // Upload handler
  const processFiles = (fileList: FileList) => {
    Array.from(fileList).forEach((file) => {
      const isPdf = file.type === 'application/pdf';
      const isImage = file.type.startsWith('image/');
      const isText = file.type.startsWith('text/') || file.name.endsWith('.txt');

      if (!isPdf && !isImage && !isText) {
        alert(`Formato no soportado: ${file.name}. Solo fotos, PDF o archivos de texto.`);
        return;
      }

      if (file.size > 15 * 1024 * 1024) {
        alert(`El archivo ${file.name} supera el límite de 15 MB.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const base64String = reader.result as string;
        const newMaterial: UploadedMaterial = {
          id: `mat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          name: file.name,
          type: isPdf ? 'pdf' : isImage ? 'image' : 'text',
          mimeType: file.type || (isPdf ? 'application/pdf' : 'text/plain'),
          base64Data: base64String,
          previewUrl: isImage ? base64String : undefined,
          sizeBytes: file.size,
        };
        setMaterials((prev) => [...prev, newMaterial]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleCaptureCamera = (material: UploadedMaterial) => {
    setMaterials((prev) => [...prev, material]);
  };

  // Preset loader
  const handleLoadPreset = (preset: typeof SAMPLE_NOTE_PRESETS[0]) => {
    setSubject(preset.name);
    setTopic(preset.topic);
    setLevel(preset.level);
    setStyle(preset.style);
    setAdditionalInstructions(preset.instructions);
    setValidationError(null);
  };

  // Handle generation
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanSubject = subject.trim();
    if (!cleanSubject) {
      setValidationError('Por favor, indica la materia o asignatura.');
      return;
    }

    const cleanTopic = topic.trim();
    if (!cleanTopic) {
      setValidationError('Por favor, indica el tema específico para los apuntes.');
      return;
    }

    setValidationError(null);
    setIsGenerating(true);

    try {
      const config: StudyNotesSetupConfig = {
        subject: cleanSubject,
        topic: cleanTopic,
        level,
        style,
        focusKeywords: focusKeywords.trim() || undefined,
        additionalInstructions: additionalInstructions.trim() || undefined,
        isPdcAdapted: isPdcActive,
      };

      const generatedNote = await geminiService.generateStudyNotes(config, materials);

      // Save to storage
      const saved = await notesService.saveNote(generatedNote, user?.id);
      reloadNotes();
      setActiveNote(saved);
      setSubView('read');
      setRevealedAnswers({});
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      console.error('Error generating notes:', err);
      setValidationError(err.message || 'Error al generar los apuntes con IA.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Copy markdown to clipboard
  const handleCopy = () => {
    if (!activeNote) return;
    const textToCopy = `${activeNote.title}\n\nMateria: ${activeNote.subject} | Nivel: ${activeNote.level}\n\n${activeNote.summary}\n\n${activeNote.contentMarkdown}\n\nConceptos Clave:\n${activeNote.keyConcepts.map((k) => `- ${k.term}: ${k.definition}`).join('\n')}`;
    navigator.clipboard.writeText(textToCopy);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2500);
  };

  // Download markdown
  const handleDownload = () => {
    if (!activeNote) return;
    const blob = new Blob([activeNote.contentMarkdown], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeNote.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Print
  const handlePrint = () => {
    window.print();
  };

  // Delete note
  const handleDeleteNote = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm('¿Seguro que deseas eliminar estos apuntes?')) return;

    await notesService.deleteNote(id);
    reloadNotes();
    if (activeNote?.id === id) {
      const remaining = savedNotes.filter((n) => n.id !== id);
      if (remaining.length > 0) {
        setActiveNote(remaining[0]);
      } else {
        setActiveNote(null);
        setSubView('create');
      }
    }
  };

  // Fetch community notes from Firestore on mount
  React.useEffect(() => {
    const fetchCommunity = async () => {
      setIsLoadingCommunity(true);
      try {
        const notes = await notesService.getPublishedNotes();
        setPublishedNotes(notes);
      } catch (e) {
        console.warn('Error loading public notes:', e);
      } finally {
        setIsLoadingCommunity(false);
      }
    };
    fetchCommunity();
  }, []);

  // Open Publish Modal
  const handleOpenPublishModal = (note: StudyNote, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setPublishModalNote(note);
    setAuthorDisplayName(note.authorName || user?.name || 'Estudiante');
  };

  // Confirm and save to public Firestore collection
  const handleConfirmPublish = async () => {
    if (!publishModalNote) return;
    setIsSubmittingPublish(true);
    try {
      const published = await notesService.publishNote(
        publishModalNote,
        authorDisplayName.trim() || user?.name || 'Estudiante',
        user?.email
      );
      reloadNotes();
      if (activeNote?.id === published.id) {
        setActiveNote(published);
      }
      const publicList = await notesService.getPublishedNotes();
      setPublishedNotes(publicList);
      setPublishModalNote(null);
    } catch (err) {
      console.error('Error publishing note:', err);
      alert('Hubo un error al publicar el apunte. Por favor inténtalo de nuevo.');
    } finally {
      setIsSubmittingPublish(false);
    }
  };

  // Unpublish / withdraw from public Firestore collection
  const handleUnpublish = async (noteId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (
      !confirm(
        '¿Deseas retirar estos apuntes de la comunidad pública? Dejarán de ser visibles para otros estudiantes.'
      )
    )
      return;
    try {
      const unpublished = await notesService.unpublishNote(noteId);
      reloadNotes();
      if (activeNote?.id === noteId && unpublished) {
        setActiveNote(unpublished);
      }
      const publicList = await notesService.getPublishedNotes();
      setPublishedNotes(publicList);
    } catch (err) {
      console.error('Error unpublishing note:', err);
    }
  };

  // Like a community note
  const handleLikeNote = async (noteId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (likedNoteIds[noteId]) return;
    setLikedNoteIds((prev) => ({ ...prev, [noteId]: true }));
    try {
      const updatedCount = await notesService.likePublishedNote(noteId);
      setPublishedNotes((prev) =>
        prev.map((n) => (n.id === noteId ? { ...n, likesCount: updatedCount } : n))
      );
      if (activeNote?.id === noteId) {
        setActiveNote((prev) => (prev ? { ...prev, likesCount: updatedCount } : null));
      }
    } catch (err) {
      console.warn('Like error:', err);
    }
  };

  // Save copy of published note to user's personal notes
  const handleCopyPublicNote = async (note: StudyNote, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await notesService.copyPublishedNoteToMyNotes(note, user?.id);
      reloadNotes();
      setCopiedPublicId(note.id);
      setTimeout(() => setCopiedPublicId(null), 2500);
    } catch (err) {
      console.error('Error copying note:', err);
    }
  };

  // Filtered notes in personal library
  const filteredNotes = savedNotes.filter((note) => {
    const matchesSearch =
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesSubject =
      selectedSubjectFilter === 'all' ||
      note.subject.toLowerCase() === selectedSubjectFilter.toLowerCase();

    return matchesSearch && matchesSubject;
  });

  const uniqueSubjects = Array.from(new Set(savedNotes.map((n) => n.subject)));

  // Filtered community notes
  const filteredCommunityNotes = publishedNotes.filter((note) => {
    const q = communitySearchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      note.title.toLowerCase().includes(q) ||
      note.subject.toLowerCase().includes(q) ||
      note.topic.toLowerCase().includes(q) ||
      (note.authorName && note.authorName.toLowerCase().includes(q)) ||
      note.tags.some((t) => t.toLowerCase().includes(q));

    const matchesSubject =
      communitySubjectFilter === 'all' ||
      note.subject.toLowerCase() === communitySubjectFilter.toLowerCase();

    return matchesSearch && matchesSubject;
  });

  const uniqueCommunitySubjects = Array.from(
    new Set(publishedNotes.map((n) => n.subject))
  );

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
      {/* Top Header & Sub-Navigation */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
              <BookOpen className="w-4 h-4" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Crear y Estudiar Apuntes con IA
            </h1>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              Nuevo
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Genera esquemas, resúmenes didácticos y guías de estudio personalizadas a partir de tu temario o fotos de clase.
          </p>
        </div>

        {/* Actions & View Switcher */}
        <div className="flex items-center gap-2.5 flex-wrap self-start md:self-auto">
          <PdcAdaptationButton variant="pill" showTooltip={true} />

          {/* View Switcher Pills */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80">
          <button
            id="notes-tab-create"
            onClick={() => setSubView('create')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              subView === 'create'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Crear Apuntes</span>
          </button>

          <button
            id="notes-tab-library"
            onClick={() => setSubView('library')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              subView === 'library'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookMarked className="w-3.5 h-3.5" />
            <span>Mis Apuntes ({savedNotes.length})</span>
          </button>

          <button
            id="notes-tab-community"
            onClick={() => {
              setSubView('community');
              notesService.getPublishedNotes().then((list) => setPublishedNotes(list)).catch(() => {});
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              subView === 'community'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-indigo-500" />
            <span>Comunidad 🌍 ({publishedNotes.length})</span>
          </button>

          {activeNote && (
            <button
              id="notes-tab-read"
              onClick={() => setSubView('read')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                subView === 'read'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span className="max-w-[110px] truncate">{activeNote.title}</span>
            </button>
          )}
        </div>
      </div>
    </div>

      {/* ================= VIEW 1: CREATE NOTES FORM ================= */}
      {subView === 'create' && (
        <div className="space-y-6">
          {/* Quick Presets Banner */}
          <div className="bg-gradient-to-r from-indigo-50/70 to-slate-50 border border-indigo-100 rounded-2xl p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-950">
                Ejemplos Didácticos Rápidos (1 Clic)
              </span>
            </div>
            <p className="text-xs text-slate-600 mb-3">
              ¿Quieres ver cómo la IA redacta los apuntes? Prueba uno de estos temarios de muestra:
            </p>
            <div className="flex flex-wrap gap-2">
              {SAMPLE_NOTE_PRESETS.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => handleLoadPreset(p)}
                  className="px-3 py-1.5 rounded-xl bg-white border border-indigo-200 text-slate-700 hover:text-indigo-600 hover:border-indigo-400 text-xs font-semibold shadow-2xs hover:shadow-xs transition-all flex items-center gap-1.5"
                >
                  <span>{p.name}:</span>
                  <span className="text-slate-500 font-normal">{p.topic.slice(0, 32)}...</span>
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleGenerate} className="space-y-6">
            {/* Subject and Topic Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-5">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <BookMarked className="w-4 h-4 text-indigo-600" />
                <span>1. Materia y Tema de Estudio</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Asignatura */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span>
                      Asignatura / Materia <span className="text-rose-500">*</span>
                    </span>
                    {!subject.trim() && (
                      <span className="text-[10px] text-rose-500 font-semibold lowercase">
                        obligatorio
                      </span>
                    )}
                  </label>
                  <input
                    id="input-notes-subject"
                    type="text"
                    required
                    value={subject}
                    onChange={(e) => {
                      setSubject(e.target.value);
                      if (validationError) setValidationError(null);
                    }}
                    placeholder="Ej. Historia Contemporánea, Filosofía, Química, Literatura..."
                    className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-sm text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all ${
                      !subject.trim() && validationError
                        ? 'border-rose-400 ring-1 ring-rose-300'
                        : 'border-slate-200'
                    }`}
                  />
                </div>

                {/* Tema */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span>
                      Tema Específico <span className="text-rose-500">*</span>
                    </span>
                    {!topic.trim() && (
                      <span className="text-[10px] text-rose-500 font-semibold lowercase">
                        obligatorio
                      </span>
                    )}
                  </label>
                  <input
                    id="input-notes-topic"
                    type="text"
                    required
                    value={topic}
                    onChange={(e) => {
                      setTopic(e.target.value);
                      if (validationError) setValidationError(null);
                    }}
                    placeholder="Ej. La Fotosíntesis, Revolución Francesa, Leyes de Newton..."
                    className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-sm text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all ${
                      !topic.trim() && validationError
                        ? 'border-rose-400 ring-1 ring-rose-300'
                        : 'border-slate-200'
                    }`}
                  />
                </div>
              </div>

              {/* Nivel Académico */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Nivel Académico del Alumno</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                  {EDUCATIONAL_LEVELS.map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setLevel(lvl)}
                      className={`p-2 rounded-xl text-xs font-semibold text-center border transition-all ${
                        level === lvl
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Note Style Selection */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                <span>2. Estilo y Formato Pedagógico</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {NOTES_STYLES.map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setStyle(st.id)}
                    className={`p-4 rounded-xl border text-left flex flex-col justify-between transition-all ${
                      style === st.id
                        ? 'bg-indigo-50/80 border-indigo-400 ring-2 ring-indigo-500/20 shadow-xs'
                        : 'bg-slate-50/50 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="p-1.5 rounded-lg bg-white shadow-2xs border border-slate-100">
                          {st.icon}
                        </div>
                        <span className="text-xs font-extrabold text-slate-900">
                          {st.name}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-snug">
                        {st.desc}
                      </p>
                    </div>
                    {style === st.id && (
                      <div className="mt-3 flex items-center gap-1 text-[10px] font-bold text-indigo-600 uppercase tracking-wider">
                        <Check className="w-3 h-3" />
                        <span>Seleccionado</span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Optional Attachments / Syllabus Photos & PDFs */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <FileUp className="w-4 h-4 text-indigo-600" />
                    <span>3. Adjuntar Fotos o PDFs de tu Temario (Opcional)</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Si tienes diapositivas, apuntes manuscritos o libros en PDF, súbelos para que la IA extraiga los conceptos exactos.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCameraOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 rounded-xl text-xs font-semibold border border-slate-200 transition-colors"
                  >
                    <Camera className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Hacer Foto</span>
                  </button>
                </div>
              </div>

              {/* Drag and Drop Zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  if (e.dataTransfer.files) processFiles(e.dataTransfer.files);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-indigo-500 bg-indigo-50/50'
                    : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => e.target.files && processFiles(e.target.files)}
                  multiple
                  accept="image/*,application/pdf,.txt"
                  className="hidden"
                />
                <div className="w-10 h-10 rounded-full bg-white shadow-2xs border border-slate-200 text-indigo-600 flex items-center justify-center mx-auto mb-2">
                  <Upload className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-slate-800">
                  Haz clic para examinar o arrastra tus archivos aquí
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Formatos soportados: PDF, JPG, PNG, WEBP, TXT (Hasta 15 MB)
                </p>
              </div>

              {/* Uploaded Materials Preview Chips */}
              {materials.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {materials.map((mat) => (
                    <div
                      key={mat.id}
                      className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 text-indigo-950 px-3 py-1.5 rounded-xl text-xs font-medium"
                    >
                      <FileText className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <span className="max-w-[200px] truncate">{mat.name}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMaterials((prev) => prev.filter((m) => m.id !== mat.id));
                        }}
                        className="text-indigo-400 hover:text-rose-600 ml-1"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Additional Custom Instructions */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-indigo-600" />
                <span>4. Instrucciones y Foco (Opcional)</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Conceptos clave prioritarios
                  </label>
                  <input
                    type="text"
                    value={focusKeywords}
                    onChange={(e) => setFocusKeywords(e.target.value)}
                    placeholder="Ej. Causas geopolíticas, tratados, fórmulas, conceptos clave..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    La IA hará especial énfasis en explicar estos términos en detalle.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Instrucciones didácticas específicas
                  </label>
                  <input
                    type="text"
                    value={additionalInstructions}
                    onChange={(e) => setAdditionalInstructions(e.target.value)}
                    placeholder="Ej. Incluir mnemotecnias, tablas comparativas, ejemplos reales..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  />
                </div>
              </div>
            </div>

            {/* PDC Curricular Adaptation Option Card */}
            <PdcAdaptationButton variant="card" showTooltip={true} />

            {/* Validation Notice */}
            {validationError && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-semibold flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-base">⚠️</span>
                  <span>{validationError}</span>
                </div>
                {(validationError.includes('503') || validationError.includes('demanda') || validationError.includes('segundos')) && (
                  <button
                    type="button"
                    onClick={(e) => handleGenerate(e as any)}
                    className="self-start sm:self-center px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors"
                  >
                    Reintentar
                  </button>
                )}
              </div>
            )}

            {/* Generate Action Button */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
              <p className="text-xs text-slate-500">
                La IA procesará tu temario y creará apuntes didácticos con preguntas de autoevaluación.
              </p>

              <button
                id="btn-generate-notes"
                type="submit"
                disabled={isGenerating}
                className="w-full sm:w-auto px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold text-sm shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Generando Apuntes con IA...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-indigo-200" />
                    <span>Generar Apuntes Ahora</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ================= VIEW 2: SAVED NOTES LIBRARY ================= */}
      {subView === 'library' && (
        <div className="space-y-6">
          {/* Search and Filters Bar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                id="input-notes-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por tema, asignatura o palabra clave..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
            </div>

            {/* Subject filter */}
            {uniqueSubjects.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 sm:pb-0">
                <button
                  type="button"
                  onClick={() => setSelectedSubjectFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                    selectedSubjectFilter === 'all'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Todas ({savedNotes.length})
                </button>
                {uniqueSubjects.map((sub) => (
                  <button
                    key={sub}
                    type="button"
                    onClick={() => setSelectedSubjectFilter(sub)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                      selectedSubjectFilter === sub
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {sub}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Notes Grid */}
          {filteredNotes.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center max-w-md mx-auto space-y-4 shadow-xs">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                <BookOpen className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                {searchQuery ? 'No se encontraron apuntes' : 'Aún no tienes apuntes guardados'}
              </h3>
              <p className="text-xs text-slate-500">
                {searchQuery
                  ? 'Prueba con otro término de búsqueda o limpia los filtros.'
                  : 'Crea tus primeros apuntes introduciendo una materia y tema en el generador.'}
              </p>
              <button
                type="button"
                onClick={() => setSubView('create')}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
              >
                Crear Nuevos Apuntes
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredNotes.map((note) => (
                <div
                  key={note.id}
                  onClick={() => {
                    setActiveNote(note);
                    setSubView('read');
                    setRevealedAnswers({});
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer flex flex-col justify-between group"
                >
                  <div>
                    {/* Header badges */}
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100 uppercase tracking-wider">
                          {note.subject}
                        </span>
                        {note.isPublished ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <Globe className="w-2.5 h-2.5" />
                            <span>Público</span>
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-slate-400 px-1.5 py-0.5 bg-slate-100 rounded-md">
                            Privado
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-medium text-slate-400">
                        {new Date(note.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2 mb-2">
                      {note.title}
                    </h3>

                    <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed mb-4">
                      {note.summary}
                    </p>

                    {/* Key Concepts Count & Questions Count */}
                    <div className="flex items-center gap-3 text-[11px] text-slate-500 font-medium pt-3 border-t border-slate-100">
                      <span className="flex items-center gap-1">
                        <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                        {note.keyConcepts.length} conceptos clave
                      </span>
                      <span className="flex items-center gap-1">
                        <HelpCircle className="w-3.5 h-3.5 text-indigo-500" />
                        {note.quickReviewQuestions.length} preguntas
                      </span>
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onGenerateExamFromNote(note);
                      }}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Examen IA</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                      {note.isPublished ? (
                        <button
                          type="button"
                          onClick={(e) => handleUnpublish(note.id, e)}
                          className="text-[11px] font-semibold text-slate-500 hover:text-rose-600 px-2 py-1 rounded-lg hover:bg-rose-50 transition-colors"
                          title="Retirar de la comunidad de apuntes"
                        >
                          Despublicar
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => handleOpenPublishModal(note, e)}
                          className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg border border-indigo-200 transition-colors flex items-center gap-1"
                          title="Compartir estos apuntes con la comunidad pública"
                        >
                          <Globe className="w-3 h-3 text-indigo-500" />
                          <span>Publicar</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={(e) => handleDeleteNote(note.id, e)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                        title="Eliminar apuntes"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================= VIEW 3: READ ACTIVE NOTE ================= */}
      {subView === 'read' && activeNote && (
        <div className="space-y-6">
          {/* Note Reader Header Banner */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setSubView('library')}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-indigo-600 self-start"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Volver a la biblioteca</span>
              </button>

              {/* Action Toolbar */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  id="btn-exam-from-notes"
                  type="button"
                  onClick={() => onGenerateExamFromNote(activeNote)}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5"
                  title="Crea un examen tipo test y desarrollo basado en estos apuntes"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-200" />
                  <span>Generar Examen de estos Apuntes</span>
                </button>

                {/* Publish to community button */}
                {activeNote.isPublished ? (
                  <button
                    id="btn-unpublish-notes"
                    type="button"
                    onClick={() => handleUnpublish(activeNote.id)}
                    className="px-3 py-1.5 bg-emerald-50 hover:bg-rose-50 text-emerald-700 hover:text-rose-700 rounded-xl text-xs font-bold border border-emerald-200 hover:border-rose-200 transition-colors flex items-center gap-1.5"
                    title="Hacer clic para retirar de la comunidad pública"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>Publicado en Comunidad 🌍</span>
                  </button>
                ) : (
                  <button
                    id="btn-publish-notes"
                    type="button"
                    onClick={() => handleOpenPublishModal(activeNote)}
                    className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold border border-indigo-200 transition-colors flex items-center gap-1.5 shadow-2xs"
                    title="Compartir estos apuntes con toda la comunidad de estudiantes"
                  >
                    <Globe className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Publicar en Comunidad 🌍</span>
                  </button>
                )}

                <button
                  id="btn-copy-notes"
                  type="button"
                  onClick={handleCopy}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 transition-colors flex items-center gap-1.5"
                >
                  {copySuccess ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">¡Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar</span>
                    </>
                  )}
                </button>

                <button
                  id="btn-download-notes"
                  type="button"
                  onClick={handleDownload}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 transition-colors flex items-center gap-1.5"
                  title="Descargar en formato Markdown (.md)"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Descargar .md</span>
                </button>

                <button
                  id="btn-print-notes"
                  type="button"
                  onClick={handlePrint}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 transition-colors flex items-center gap-1.5"
                  title="Imprimir o guardar en PDF"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Imprimir</span>
                </button>

                <button
                  id="btn-delete-active-note"
                  type="button"
                  onClick={() => handleDeleteNote(activeNote.id)}
                  className="p-1.5 bg-slate-100 hover:bg-rose-100 text-slate-400 hover:text-rose-600 rounded-xl border border-slate-200 transition-colors"
                  title="Eliminar apuntes"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <span className="text-xs font-extrabold px-3 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200">
                {activeNote.subject}
              </span>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
                {activeNote.level}
              </span>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-violet-50 text-violet-700 border border-violet-200">
                {NOTES_STYLES.find((s) => s.id === activeNote.style)?.name || 'Resumen'}
              </span>
              {activeNote.isPublished && (
                <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <Globe className="w-3 h-3" />
                  <span>Público en Comunidad</span>
                </span>
              )}
              {activeNote.authorName && (
                <span className="text-xs font-medium text-slate-500 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200">
                  Por @{activeNote.authorName}
                </span>
              )}
              {activeNote.likesCount !== undefined && activeNote.likesCount > 0 && (
                <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg bg-rose-50 text-rose-600 border border-rose-200">
                  <Heart className="w-3 h-3 fill-rose-500 text-rose-500" />
                  <span>{activeNote.likesCount} me gusta</span>
                </span>
              )}
              <span className="text-xs text-slate-400 ml-auto">
                Creado el {new Date(activeNote.createdAt).toLocaleDateString()}
              </span>
            </div>

            {/* Title & Summary */}
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
                {activeNote.title}
              </h1>
              <div className="mt-3 p-4 bg-slate-50 border border-slate-200/80 rounded-2xl">
                <p className="text-xs sm:text-sm text-slate-700 font-medium leading-relaxed">
                  {activeNote.summary}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Review Active Recall Questions */}
          {activeNote.quickReviewQuestions && activeNote.quickReviewQuestions.length > 0 && (
            <div className="bg-amber-50/60 border border-amber-200/70 rounded-3xl p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                  <HelpCircle className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-extrabold text-amber-950 uppercase tracking-wider">
                    Autoevaluación Rápida (Active Recall)
                  </h2>
                  <p className="text-xs text-amber-900/80">
                    Ponte a prueba antes del examen respondiendo mentalmente a estas preguntas clave:
                  </p>
                </div>
              </div>

              <div className="space-y-3 pt-1">
                {activeNote.quickReviewQuestions.map((qa, idx) => {
                  const isRevealed = Boolean(revealedAnswers[idx]);
                  return (
                    <div
                      key={idx}
                      className="bg-white rounded-2xl border border-amber-200/80 p-4 shadow-2xs space-y-2 transition-all"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-xs sm:text-sm font-bold text-slate-900">
                          {idx + 1}. {qa.question}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setRevealedAnswers((prev) => ({
                              ...prev,
                              [idx]: !prev[idx],
                            }))
                          }
                          className="shrink-0 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-100/80 hover:bg-amber-200 text-amber-900 transition-colors flex items-center gap-1"
                        >
                          {isRevealed ? (
                            <>
                              <span>Ocultar</span>
                              <ChevronUp className="w-3 h-3" />
                            </>
                          ) : (
                            <>
                              <span>Ver respuesta</span>
                              <ChevronDown className="w-3 h-3" />
                            </>
                          )}
                        </button>
                      </div>

                      {isRevealed && (
                        <div className="pt-2 border-t border-amber-100 text-xs text-slate-700 leading-relaxed font-medium bg-amber-50/40 p-3 rounded-xl">
                          <strong className="text-amber-900">Respuesta: </strong>
                          {qa.answer}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Main Markdown Study Content */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-10 shadow-xs">
            {/* Framework requirement: The className prop has been removed from react-markdown, wrap in div with markdown-body */}
            <div className="markdown-body prose prose-slate max-w-none prose-headings:font-extrabold prose-headings:text-slate-900 prose-h2:text-xl prose-h2:border-b prose-h2:border-slate-100 prose-h2:pb-2 prose-h3:text-base prose-p:text-slate-700 prose-p:leading-relaxed prose-li:text-slate-700 prose-strong:text-slate-900 prose-blockquote:border-l-4 prose-blockquote:border-indigo-500 prose-blockquote:bg-indigo-50/50 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:rounded-r-xl">
              <Markdown>{activeNote.contentMarkdown}</Markdown>
            </div>
          </div>

          {/* Key Concepts Cards Section */}
          {activeNote.keyConcepts && activeNote.keyConcepts.length > 0 && (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Lightbulb className="w-4 h-4" />
                </div>
                <h2 className="text-base font-bold text-slate-900">
                  Conceptos Clave y Definiciones Esenciales
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                {activeNote.keyConcepts.map((item, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-50 border border-slate-200 rounded-2xl p-4.5 space-y-2 hover:border-indigo-300 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Tag className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <h3 className="text-sm font-extrabold text-slate-900">
                        {item.term}
                      </h3>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed font-medium">
                      {item.definition}
                    </p>
                    {item.exampleOrNote && (
                      <p className="text-[11px] text-slate-500 italic bg-white p-2.5 rounded-xl border border-slate-200/70">
                        💡 {item.exampleOrNote}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bottom Action Footer */}
          <div className="bg-indigo-900 text-white rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-5 shadow-lg shadow-indigo-950/20">
            <div>
              <h3 className="text-lg font-black tracking-tight">
                ¿Listo para poner a prueba lo aprendido?
              </h3>
              <p className="text-xs sm:text-sm text-indigo-200 mt-1 max-w-xl">
                Crea un examen automático tipo test y preguntas de desarrollo basado exactamente en estos apuntes con corrección instantánea por IA.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onGenerateExamFromNote(activeNote)}
              className="px-6 py-3.5 bg-white text-indigo-950 hover:bg-indigo-50 rounded-2xl font-black text-sm transition-all shadow-md shrink-0 flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>Generar Examen Ahora</span>
            </button>
          </div>
        </div>
      )}

      {/* ================= VIEW 4: COMMUNITY PUBLISHED NOTES ================= */}
      {subView === 'community' && (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/30 border border-indigo-400/40 text-indigo-300 flex items-center justify-center font-bold">
                  <Globe className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                  Comunidad de Apuntes Abierta
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                Apuntes Públicos Compartidos por Estudiantes
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
                Explora apuntes didácticos compartidos libremente. Puedes estudiarlos, guardarlos en tu biblioteca personal, darles me gusta o generar exámenes interactivos en 1 clic.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setSubView('create')}
              className="px-5 py-3 bg-indigo-500 hover:bg-indigo-400 text-white rounded-2xl text-xs font-bold transition-all shadow-md shrink-0 flex items-center gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Crear y Publicar Mis Apuntes</span>
            </button>
          </div>

          {/* Search, Filter & Refresh Bar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                id="input-community-search"
                type="text"
                value={communitySearchQuery}
                onChange={(e) => setCommunitySearchQuery(e.target.value)}
                placeholder="Buscar por tema, materia, autor (@...) o concepto..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
              {/* Subject filter */}
              {uniqueCommunitySubjects.length > 0 && (
                <div className="flex items-center gap-1.5 overflow-x-auto max-w-[280px] pb-1 sm:pb-0">
                  <button
                    type="button"
                    onClick={() => setCommunitySubjectFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                      communitySubjectFilter === 'all'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Todas ({publishedNotes.length})
                  </button>
                  {uniqueCommunitySubjects.map((sub) => (
                    <button
                      key={sub}
                      type="button"
                      onClick={() => setCommunitySubjectFilter(sub)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                        communitySubjectFilter === sub
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {sub}
                    </button>
                  ))}
                </div>
              )}

              {/* Refresh Button */}
              <button
                type="button"
                onClick={async () => {
                  setIsLoadingCommunity(true);
                  try {
                    const list = await notesService.getPublishedNotes();
                    setPublishedNotes(list);
                  } finally {
                    setIsLoadingCommunity(false);
                  }
                }}
                disabled={isLoadingCommunity}
                className="p-2 text-slate-500 hover:text-indigo-600 rounded-xl hover:bg-slate-100 border border-slate-200 transition-colors shrink-0"
                title="Actualizar lista de la comunidad"
              >
                <RefreshCw
                  className={`w-4 h-4 ${isLoadingCommunity ? 'animate-spin text-indigo-600' : ''}`}
                />
              </button>
            </div>
          </div>

          {/* Community Notes Content */}
          {isLoadingCommunity && publishedNotes.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center max-w-md mx-auto space-y-3 shadow-xs">
              <div className="w-10 h-10 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-500 font-medium">
                Cargando apuntes compartidos por la comunidad...
              </p>
            </div>
          ) : filteredCommunityNotes.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center max-w-md mx-auto space-y-4 shadow-xs">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                <Globe className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                {communitySearchQuery
                  ? 'No se encontraron apuntes con ese filtro'
                  : 'Aún no hay apuntes compartidos en la comunidad'}
              </h3>
              <p className="text-xs text-slate-500">
                {communitySearchQuery
                  ? 'Prueba a buscar con otras palabras clave o restablece los filtros.'
                  : '¡Sé el primero en compartir tus apuntes! Crea un temario en el generador y pulsa "Publicar en Comunidad".'}
              </p>
              <button
                type="button"
                onClick={() => setSubView('create')}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
              >
                Crear y Publicar Apuntes
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredCommunityNotes.map((note) => (
                <div
                  key={note.id}
                  onClick={() => {
                    setActiveNote(note);
                    setSubView('read');
                    setRevealedAnswers({});
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer flex flex-col justify-between group"
                >
                  <div>
                    {/* Header badges */}
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100 uppercase tracking-wider">
                          {note.subject}
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                          {note.level}
                        </span>
                      </div>
                      <span className="text-[10px] font-medium text-slate-400">
                        {note.publishedAt
                          ? new Date(note.publishedAt).toLocaleDateString()
                          : new Date(note.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2 mb-1.5">
                      {note.title}
                    </h3>

                    <p className="text-[11px] font-semibold text-indigo-600 mb-2.5">
                      Por @{note.authorName || 'Estudiante'}
                    </p>

                    <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed mb-4">
                      {note.summary}
                    </p>

                    {/* Key Concepts Count & Questions Count */}
                    <div className="flex items-center gap-3 text-[11px] text-slate-500 font-medium pt-3 border-t border-slate-100">
                      <span className="flex items-center gap-1">
                        <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                        {note.keyConcepts.length} conceptos
                      </span>
                      <span className="flex items-center gap-1">
                        <HelpCircle className="w-3.5 h-3.5 text-indigo-500" />
                        {note.quickReviewQuestions.length} preguntas
                      </span>
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100">
                    {/* Like button */}
                    <button
                      type="button"
                      onClick={(e) => handleLikeNote(note.id, e)}
                      className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg border transition-all ${
                        likedNoteIds[note.id]
                          ? 'bg-rose-50 text-rose-600 border-rose-200 shadow-2xs'
                          : 'bg-slate-50 hover:bg-rose-50 text-slate-600 hover:text-rose-600 border-slate-200'
                      }`}
                      title="Dar Me Gusta a estos apuntes"
                    >
                      <Heart
                        className={`w-3.5 h-3.5 ${
                          likedNoteIds[note.id]
                            ? 'fill-rose-500 text-rose-500'
                            : 'text-slate-400 group-hover:text-rose-400'
                        }`}
                      />
                      <span>{note.likesCount || 0}</span>
                    </button>

                    <div className="flex items-center gap-2">
                      {/* Copy to my notes button */}
                      <button
                        type="button"
                        onClick={(e) => handleCopyPublicNote(note, e)}
                        className="text-xs font-semibold text-slate-600 hover:text-indigo-600 p-1.5 rounded-lg hover:bg-indigo-50 border border-slate-200 transition-colors flex items-center gap-1"
                        title="Guardar una copia en Mis Apuntes"
                      >
                        {copiedPublicId === note.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-700 text-[11px] font-bold">Guardado</span>
                          </>
                        ) : (
                          <>
                            <BookmarkPlus className="w-3.5 h-3.5" />
                            <span className="text-[11px]">Guardar</span>
                          </>
                        )}
                      </button>

                      {/* Exam from Note */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onGenerateExamFromNote(note);
                        }}
                        className="text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white px-2.5 py-1 rounded-lg shadow-2xs transition-all flex items-center gap-1"
                        title="Generar examen basado en estos apuntes"
                      >
                        <Sparkles className="w-3 h-3 text-indigo-200" />
                        <span>Examen</span>
                      </button>

                      {/* Author unpublish option */}
                      {(note.userId === user?.id || note.authorEmail === user?.email) && (
                        <button
                          type="button"
                          onClick={(e) => handleUnpublish(note.id, e)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                          title="Retirar de la comunidad"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================= PUBLISH MODAL ================= */}
      {publishModalNote && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <Globe className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  Publicar en la Comunidad
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPublishModalNote(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-slate-600 leading-relaxed">
                Tus apuntes <strong className="text-slate-900">"{publishModalNote.title}"</strong> serán publicados de forma abierta en la pestaña de <strong>Comunidad 🌍</strong>. Otros estudiantes podrán leerlos, guardarlos y generar exámenes interactivos.
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Nombre o alias del autor
                </label>
                <input
                  type="text"
                  value={authorDisplayName}
                  onChange={(e) => setAuthorDisplayName(e.target.value)}
                  placeholder="Ej. Alex M., Laura G., o tu alias..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Se mostrará en la tarjeta de los apuntes para que reconozcan tu autoría.
                </p>
              </div>

              <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl text-[11px] text-indigo-900 space-y-1">
                <span className="font-bold flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-indigo-600" />
                  Privacidad y control
                </span>
                <p className="text-indigo-800">
                  Podrás retirar tus apuntes de la comunidad en cualquier momento haciendo clic en "Despublicar".
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setPublishModalNote(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmPublish}
                disabled={isSubmittingPublish}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5"
              >
                {isSubmittingPublish ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Publicando...</span>
                  </>
                ) : (
                  <>
                    <Globe className="w-3.5 h-3.5" />
                    <span>Confirmar y Publicar 🌍</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Camera Capture Modal */}
      <CameraModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={handleCaptureCamera}
      />
    </div>
  );
};
