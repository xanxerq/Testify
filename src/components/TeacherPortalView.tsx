import React, { useState, useEffect, useRef } from 'react';
import Markdown from 'react-markdown';
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  Briefcase,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Copy,
  Download,
  Eye,
  FileCheck,
  FileText,
  FileUp,
  GraduationCap,
  HelpCircle,
  Layers,
  ListOrdered,
  Lock,
  Paperclip,
  Play,
  Plus,
  Printer,
  RotateCcw,
  Save,
  School,
  Share2,
  Sparkles,
  Tag,
  Trash2,
  Upload,
  User as UserIcon,
  Users,
  Wand2,
} from 'lucide-react';
import {
  ActivityType,
  ClassroomActivity,
  ClassroomExam,
  EducationalLevel,
  Exam,
  ExamDifficulty,
  SchoolHeaderConfig,
  TeacherActivityConfig,
  TeacherExamConfig,
  UploadedMaterial,
  User,
} from '../types';
import { teacherService } from '../services/teacherService';
import { usePdc } from '../context/PdcContext';
import { PdcAdaptationButton } from './PdcAdaptationButton';

interface TeacherPortalViewProps {
  user: User | null;
  onOpenAuth: () => void;
  onLaunchLiveExam?: (exam: Exam) => void;
}

const EDUCATIONAL_LEVELS: EducationalLevel[] = [
  'Secundaria (ESO)',
  'Bachillerato',
  'Preparación PAU / EBAU',
  'Primaria',
  'Formación Profesional',
  'Universidad / Grado',
  'Máster / Oposiciones',
];

const ACTIVITY_TYPES: { type: ActivityType; label: string; desc: string; icon: string }[] = [
  {
    type: 'individual_work',
    label: 'Trabajo Individual',
    desc: 'Resolución autónoma de ejercicios y problemas, autorregulación paso a paso y autoevaluación.',
    icon: '👤',
  },
  {
    type: 'cooperative_group',
    label: 'Trabajo Cooperativo',
    desc: 'Equipos con 4 roles estructurados (Coordinador, Secretario, Portavoz, Cronometrador) y fases guiadas.',
    icon: '🤝',
  },
  {
    type: 'classroom_quiz',
    label: 'Quiz / Concurso por Equipos',
    desc: 'Competición de aula proyectable por equipos con marcador oficial, rondas de preguntas y puntuaciones.',
    icon: '⚡',
  },
  {
    type: 'structured_debate',
    label: 'Debate LOMLOE',
    desc: 'Dilema de actualidad, turnos cronometrados de argumentación oral y rúbrica de expresión.',
    icon: '🗣️',
  },
  {
    type: 'case_study',
    label: 'Estudio de Caso / Reto Real',
    desc: 'Problema contextualizado para análisis crítico, investigación y propuesta de solución.',
    icon: '🔍',
  },
  {
    type: 'escape_room',
    label: 'Escape Room de Aula',
    desc: 'Desafío por 3-4 pistas y enigmas curriculares para desbloquear el código final del aula.',
    icon: '🔐',
  },
  {
    type: 'quick_experiment',
    label: 'Taller / Laboratorio de Clase',
    desc: 'Práctica guiada con materiales comunes de aula, formulación de hipótesis y registro de datos.',
    icon: '🔬',
  },
];

export const TeacherPortalView: React.FC<TeacherPortalViewProps> = ({
  user,
  onOpenAuth,
  onLaunchLiveExam,
}) => {
  const { isPdcActive } = usePdc();

  // Top Section Mode
  const [activeTab, setActiveTab] = useState<'exams' | 'activities' | 'saved'>('exams');

  // Exam Form State
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [level, setLevel] = useState<EducationalLevel>('Secundaria (ESO)');
  const [difficulty, setDifficulty] = useState<ExamDifficulty>('Media');
  const [testCount, setTestCount] = useState<number>(5);
  const [openCount, setOpenCount] = useState<number>(3);
  const [timeMinutes, setTimeMinutes] = useState<number>(50);
  const [generateModelB, setGenerateModelB] = useState<boolean>(true);
  const [includeRubric, setIncludeRubric] = useState<boolean>(true);
  const [customRequirements, setCustomRequirements] = useState<string>('');

  // Uploaded Materials (PDFs / Photos / Notes)
  const [examMaterials, setExamMaterials] = useState<UploadedMaterial[]>([]);
  const [actMaterials, setActMaterials] = useState<UploadedMaterial[]>([]);
  const [isDraggingExam, setIsDraggingExam] = useState(false);
  const [isDraggingAct, setIsDraggingAct] = useState(false);

  const examFileInputRef = useRef<HTMLInputElement>(null);
  const actFileInputRef = useRef<HTMLInputElement>(null);

  // School Header
  const [schoolHeader, setSchoolHeader] = useState<SchoolHeaderConfig>({
    schoolName: user?.institution || 'IES Tecnológico',
    department: user?.subjectArea ? `Departamento de ${user.subjectArea}` : 'Departamento Didáctico',
    courseAndGroup: '3º ESO - Grupo A',
    teacherName: user?.name || 'Prof. Docente',
    examDate: new Date().toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
    evaluationPeriod: '1ª Evaluación',
    instructions:
      'Lee atentamente cada enunciado. Escribe con letra clara en bolígrafo azul o negro. Justifica tus respuestas en las preguntas de desarrollo.',
  });

  // Activity Form State
  const [activityType, setActivityType] = useState<ActivityType>('individual_work');
  const [actSubject, setActSubject] = useState('');
  const [actTopic, setActTopic] = useState('');
  const [actLevel, setActLevel] = useState<EducationalLevel>('Secundaria (ESO)');
  const [actDuration, setActDuration] = useState<number>(50);
  const [actGroupSize, setActGroupSize] = useState<number>(4);
  const [actGoal, setActGoal] = useState<string>('');

  // Team Quiz Settings
  const [quizTotalStudents, setQuizTotalStudents] = useState<number>(25);
  const [quizTeamCount, setQuizTeamCount] = useState<number>(5);
  const [quizStudentsPerTeam, setQuizStudentsPerTeam] = useState<number>(5);

  // Generation Loading & Errors
  const [isGenerating, setIsGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  // Active Results
  const [currentExam, setCurrentExam] = useState<ClassroomExam | null>(null);
  const [examActiveSubView, setExamActiveSubView] = useState<'student_a' | 'student_b' | 'answer_key' | 'rubric'>('student_a');

  const [currentActivity, setCurrentActivity] = useState<ClassroomActivity | null>(null);
  const [actActiveSubView, setActActiveSubView] = useState<'worksheet' | 'teacher_guide' | 'phases' | 'rubric'>('worksheet');

  // Saved resources list
  const [savedExams, setSavedExams] = useState<ClassroomExam[]>([]);
  const [savedActivities, setSavedActivities] = useState<ClassroomActivity[]>([]);
  const [copiedNotification, setCopiedNotification] = useState<string | null>(null);

  // Reload saved resources on mount
  useEffect(() => {
    setSavedExams(teacherService.getSavedClassroomExams());
    setSavedActivities(teacherService.getSavedClassroomActivities());
  }, []);

  const showCopyToast = (msg: string) => {
    setCopiedNotification(msg);
    setTimeout(() => setCopiedNotification(null), 2500);
  };

  // Helper to format bytes
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // File Processor for PDF / Images / Text
  const processFiles = (files: FileList | File[], target: 'exam' | 'act') => {
    setGenError(null);
    const fileArray = Array.from(files);

    fileArray.forEach((file) => {
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      const isImage = file.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|bmp)$/i.test(file.name);
      const isText = file.type === 'text/plain' || /\.(txt|md|markdown)$/i.test(file.name);

      if (!isPdf && !isImage && !isText) {
        setGenError(`El archivo "${file.name}" no es compatible. Sube documentos PDF de teoría, fotos o archivos de texto.`);
        return;
      }

      if (file.size > 25 * 1024 * 1024) {
        setGenError(`El archivo "${file.name}" excede el límite máximo de 25 MB.`);
        return;
      }

      // Auto-suggest topic name if empty
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      if (target === 'exam' && !topic.trim()) {
        setTopic(cleanName);
      } else if (target === 'act' && !actTopic.trim()) {
        setActTopic(cleanName);
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
          if (target === 'exam') {
            setExamMaterials((prev) => [...prev, newMaterial]);
          } else {
            setActMaterials((prev) => [...prev, newMaterial]);
          }
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
          if (target === 'exam') {
            setExamMaterials((prev) => [...prev, newMaterial]);
          } else {
            setActMaterials((prev) => [...prev, newMaterial]);
          }
        };
        reader.readAsDataURL(file);
      }
    });
  };

  // Team Quiz dynamic recalculations
  const handleQuizTotalStudentsChange = (total: number) => {
    const validTotal = Math.max(2, total);
    setQuizTotalStudents(validTotal);
    const calculatedPerTeam = Math.max(1, Math.ceil(validTotal / quizTeamCount));
    setQuizStudentsPerTeam(calculatedPerTeam);
  };

  const handleQuizTeamCountChange = (teams: number) => {
    const validTeams = Math.max(2, teams);
    setQuizTeamCount(validTeams);
    const calculatedPerTeam = Math.max(1, Math.ceil(quizTotalStudents / validTeams));
    setQuizStudentsPerTeam(calculatedPerTeam);
  };

  const handleQuizStudentsPerTeamChange = (perTeam: number) => {
    const validPerTeam = Math.max(1, perTeam);
    setQuizStudentsPerTeam(validPerTeam);
  };

  // Generate Classroom Exam
  const handleGenerateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim()) {
      setGenError('Por favor, indica la asignatura del examen.');
      return;
    }
    if (!topic.trim()) {
      setGenError('Por favor, indica el tema o sube un PDF de teoría / actividades.');
      return;
    }

    try {
      setIsGenerating(true);
      setGenError(null);
      const config: TeacherExamConfig = {
        subject: subject.trim(),
        topic: topic.trim(),
        level: isPdcActive ? 'Secundaria (ESO)' : level,
        difficulty,
        header: schoolHeader,
        testCount,
        openCount,
        generateModelB,
        includeAnswerKey: true,
        includeRubric,
        timeMinutes,
        customRequirements: customRequirements.trim(),
        isPdcAdapted: isPdcActive,
      };

      const exam = await teacherService.generateClassroomExam(config, examMaterials);
      setCurrentExam(exam);
      setSavedExams(teacherService.getSavedClassroomExams());
      setExamActiveSubView('student_a');
      window.scrollTo({ top: 350, behavior: 'smooth' });
    } catch (err: any) {
      setGenError(err.message || 'Error al generar el examen con IA.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Generate Classroom Activity
  const handleGenerateActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actSubject.trim()) {
      setGenError('Por favor, indica la asignatura para la dinámica.');
      return;
    }
    if (!actTopic.trim()) {
      setGenError('Por favor, indica el tema o sube un PDF de teoría / actividades.');
      return;
    }

    try {
      setIsGenerating(true);
      setGenError(null);
      const config: TeacherActivityConfig = {
        type: activityType,
        subject: actSubject.trim(),
        topic: actTopic.trim(),
        level: isPdcActive ? 'Secundaria (ESO)' : actLevel,
        durationMinutes: actDuration,
        groupSize: activityType === 'individual_work' ? 1 : actGroupSize,
        customGoal: actGoal.trim(),
        isPdcAdapted: isPdcActive,
        totalStudents: activityType === 'classroom_quiz' ? quizTotalStudents : undefined,
        teamCount: activityType === 'classroom_quiz' ? quizTeamCount : undefined,
        studentsPerTeam: activityType === 'classroom_quiz' ? quizStudentsPerTeam : undefined,
      };

      const act = await teacherService.generateClassroomActivity(config, actMaterials);
      setCurrentActivity(act);
      setSavedActivities(teacherService.getSavedClassroomActivities());
      setActActiveSubView('worksheet');
      window.scrollTo({ top: 350, behavior: 'smooth' });
    } catch (err: any) {
      setGenError(err.message || 'Error al generar la actividad con IA.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Print current view using print dialog
  const handlePrint = () => {
    window.print();
  };

  // Copy plain text to clipboard
  const handleCopyText = (content: string, label: string) => {
    navigator.clipboard.writeText(content);
    showCopyToast(`¡${label} copiado al portapapeles!`);
  };

  // Convert ClassroomExam to regular Exam and launch in multiplayer room
  const handleLaunchAsRoom = () => {
    if (!currentExam || !onLaunchLiveExam) return;
    const mappedQuestions = currentExam.questionsModelA.map((q, idx) => {
      if (q.type === 'multiple_choice') {
        return {
          id: `q_class_${idx + 1}`,
          type: 'multiple_choice' as const,
          questionText: q.questionText,
          points: q.points || 1,
          options: q.options || ['Opción A', 'Opción B', 'Opción C', 'Opción D'],
          correctOptionIndex: q.correctOptionIndex ?? 0,
          explanation: q.expectedAnswer || 'Respuesta oficial del examen.',
        };
      } else {
        return {
          id: `q_class_${idx + 1}`,
          type: 'open' as const,
          questionText: q.questionText,
          points: q.points || 2,
          sampleAnswer: q.expectedAnswer || 'Respuesta desarrollada oficial.',
          gradingCriteria: q.gradingCriteria || ['Claridad conceptual', 'Justificación'],
        };
      }
    });

    const standardExam: Exam = {
      id: currentExam.id,
      title: currentExam.title,
      subject: currentExam.subject,
      topic: currentExam.topic,
      level: currentExam.level,
      difficulty: currentExam.difficulty,
      createdAt: currentExam.createdAt,
      timeLimitMinutes: currentExam.durationMinutes,
      totalPoints: currentExam.totalPoints,
      overview: currentExam.pedagogicalNotes || currentExam.title,
      questions: mappedQuestions,
      isPdcAdapted: currentExam.isPdcAdapted,
    };

    onLaunchLiveExam(standardExam);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">
      {/* Toast Notification */}
      {copiedNotification && (
        <div className="fixed top-20 right-6 z-50 p-3 bg-slate-900 text-white rounded-xl shadow-xl text-xs font-semibold flex items-center gap-2 animate-bounce">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{copiedNotification}</span>
        </div>
      )}

      {/* Main Teacher Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-violet-900 via-indigo-900 to-slate-900 text-white p-6 sm:p-10 mb-8 shadow-xl border border-violet-800/40">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/20 text-violet-200 border border-violet-400/30 text-xs font-bold mb-4">
            <School className="w-4 h-4 text-violet-300" />
            <span>Portal Oficial del Profesorado • LOMLOE &amp; DUA</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
            Diseña Exámenes de Aula y Dinámicas Pedagógicas con IA
          </h1>
          <p className="mt-3 text-sm sm:text-base text-slate-300 leading-relaxed">
            Sube el PDF de teoría o actividades de tu temario. Genera exámenes escolares listos para fotocopiar (Modelo A y B anti-copia), ejercicios autónomos, dinámicas cooperativas o concursos con marcador por equipos.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              onClick={() => setActiveTab('exams')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'exams'
                  ? 'bg-white text-slate-900 shadow-md scale-105'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <FileCheck className="w-4 h-4 text-violet-600" />
              <span>Exámenes Imprimibles (A / B)</span>
            </button>
            <button
              onClick={() => setActiveTab('activities')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'activities'
                  ? 'bg-white text-slate-900 shadow-md scale-105'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <Users className="w-4 h-4 text-indigo-600" />
              <span>Dinámicas y Actividades</span>
            </button>
            <button
              onClick={() => setActiveTab('saved')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'saved'
                  ? 'bg-white text-slate-900 shadow-md scale-105'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <Briefcase className="w-4 h-4 text-amber-400" />
              <span>Mis Recursos Guardados ({savedExams.length + savedActivities.length})</span>
            </button>
          </div>
        </div>

        {/* Decorative background badges */}
        <div className="absolute -right-10 -bottom-10 w-64 h-64 rounded-full bg-violet-600/10 blur-3xl pointer-events-none" />
      </div>

      {/* Global Error Banner */}
      {genError && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-start gap-3 animate-fadeIn">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Atención</p>
            <p>{genError}</p>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 1: GENERADOR DE EXÁMENES ESCOLARES (MODELO A / B)         */}
      {/* ============================================================== */}
      {activeTab === 'exams' && (
        <div className="space-y-8">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center font-bold">
                <FileCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                  Configuración del Examen Escolar para Impresión
                </h2>
                <p className="text-xs text-slate-500">
                  Genera la prueba oficial lista para fotocopiar con membrete institucional, solucionario y rúbrica.
                </p>
              </div>
            </div>

            <form onSubmit={handleGenerateExam} className="space-y-6">
              {/* UPLOAD PDF / MATERIALES PARA EL EXAMEN */}
              <div className="p-4 sm:p-5 rounded-2xl bg-violet-50/60 border border-violet-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileUp className="w-4 h-4 text-violet-700" />
                    <span className="text-xs font-bold uppercase tracking-wider text-violet-950">
                      Subir PDF de Teoría o Actividades (Opcional pero Recomendado)
                    </span>
                  </div>
                  {examMaterials.length > 0 && (
                    <span className="text-[11px] font-bold text-violet-800 bg-violet-100 px-2 py-0.5 rounded-full">
                      {examMaterials.length} archivo(s) cargado(s)
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  Si tienes un PDF con el temario, apuntes, ejercicios o libro de texto, súbelo aquí. La IA redactará las preguntas y problemas basándose con exactitud en ese documento.
                </p>

                {/* Dropzone */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDraggingExam(true);
                  }}
                  onDragLeave={() => setIsDraggingExam(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDraggingExam(false);
                    if (e.dataTransfer.files) processFiles(e.dataTransfer.files, 'exam');
                  }}
                  onClick={() => examFileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all ${
                    isDraggingExam
                      ? 'border-violet-600 bg-violet-100/70 scale-[1.01]'
                      : 'border-violet-300 hover:border-violet-500 bg-white hover:bg-violet-50/40'
                  }`}
                >
                  <input
                    ref={examFileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,application/pdf,image/*,.txt,.md"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files) processFiles(e.target.files, 'exam');
                    }}
                  />
                  <div className="w-10 h-10 mx-auto rounded-full bg-violet-100 text-violet-700 flex items-center justify-center mb-2">
                    <Upload className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-slate-800">
                    Haz clic para subir o arrastra tu PDF de teoría / actividades aquí
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Admite PDF, imágenes de apuntes (JPG, PNG) y texto • Máximo 25 MB
                  </p>
                </div>

                {/* Material list */}
                {examMaterials.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {examMaterials.map((mat) => (
                      <div
                        key={mat.id}
                        className="flex items-center justify-between p-2.5 bg-white border border-violet-200 rounded-xl text-xs shadow-2xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-black uppercase bg-violet-100 text-violet-800">
                            {mat.type === 'pdf' ? 'PDF' : mat.type === 'image' ? 'IMG' : 'DOC'}
                          </span>
                          <span className="font-semibold text-slate-800 truncate text-[11px]">
                            {mat.name}
                          </span>
                          <span className="text-[10px] text-slate-400 shrink-0">
                            ({formatFileSize(mat.sizeBytes)})
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setExamMaterials((prev) => prev.filter((m) => m.id !== mat.id))}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors shrink-0 ml-1 cursor-pointer"
                          title="Eliminar documento"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Membrete Oficial del Centro */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                  Membrete del Examen Escolar
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Nombre del Centro / Colegio / IES
                    </label>
                    <input
                      type="text"
                      value={schoolHeader.schoolName}
                      onChange={(e) =>
                        setSchoolHeader({ ...schoolHeader, schoolName: e.target.value })
                      }
                      placeholder="IES Cervantes"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-violet-500 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Departamento
                    </label>
                    <input
                      type="text"
                      value={schoolHeader.department}
                      onChange={(e) =>
                        setSchoolHeader({ ...schoolHeader, department: e.target.value })
                      }
                      placeholder="Dpto. Ciencias de la Naturaleza"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Curso y Grupo
                    </label>
                    <input
                      type="text"
                      value={schoolHeader.courseAndGroup}
                      onChange={(e) =>
                        setSchoolHeader({ ...schoolHeader, courseAndGroup: e.target.value })
                      }
                      placeholder="3º ESO - Grupo B"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Fecha del Examen
                    </label>
                    <input
                      type="text"
                      value={schoolHeader.examDate}
                      onChange={(e) =>
                        setSchoolHeader({ ...schoolHeader, examDate: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Profesor / Docente
                    </label>
                    <input
                      type="text"
                      value={schoolHeader.teacherName}
                      onChange={(e) =>
                        setSchoolHeader({ ...schoolHeader, teacherName: e.target.value })
                      }
                      placeholder="Prof. Juan García"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Evaluación / Convocatoria
                    </label>
                    <input
                      type="text"
                      value={schoolHeader.evaluationPeriod}
                      onChange={(e) =>
                        setSchoolHeader({ ...schoolHeader, evaluationPeriod: e.target.value })
                      }
                      placeholder="1ª Evaluación"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                </div>
              </div>

              {/* Materia y Contenido */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Materia o Asignatura *
                  </label>
                  <input
                    type="text"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Ej. Biología y Geología, Matemáticas, Historia de España..."
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-violet-500 focus:bg-white font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tema o Bloque de Contenidos *
                  </label>
                  <input
                    type="text"
                    required
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="Ej. Tectónica de placas, Ecuaciones de 2º grado, Revolución Francesa..."
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-violet-500 focus:bg-white font-medium"
                  />
                </div>
              </div>

              {/* Opciones Didácticas */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Etapa Educativa
                  </label>
                  <select
                    value={isPdcActive ? 'Secundaria (ESO)' : level}
                    disabled={isPdcActive}
                    onChange={(e) => setLevel(e.target.value as EducationalLevel)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-violet-500 focus:bg-white disabled:opacity-60"
                  >
                    {EDUCATIONAL_LEVELS.map((lvl) => (
                      <option key={lvl} value={lvl}>
                        {lvl}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Dificultad
                  </label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as ExamDifficulty)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-violet-500 focus:bg-white"
                  >
                    <option value="Fácil">Fácil (Iniciación y refuerzo)</option>
                    <option value="Media">Media (Nivel oficial de curso)</option>
                    <option value="Difícil">Difícil (Avanzado / Exigente)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Duración Estimada (min)
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={180}
                    value={timeMinutes}
                    onChange={(e) => setTimeMinutes(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-violet-500 focus:bg-white"
                  />
                </div>
              </div>

              {/* Preguntas y Formato Anti-Copia */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Preguntas Test (4 opciones)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={20}
                    value={testCount}
                    onChange={(e) => setTestCount(Number(e.target.value))}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Preguntas Abiertas / Problemas
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    value={openCount}
                    onChange={(e) => setOpenCount(Number(e.target.value))}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                  />
                </div>
                <div className="flex items-center gap-2 pt-4">
                  <input
                    id="chk-model-b"
                    type="checkbox"
                    checked={generateModelB}
                    onChange={(e) => setGenerateModelB(e.target.checked)}
                    className="w-4 h-4 text-violet-600 rounded border-slate-300 focus:ring-violet-500 cursor-pointer"
                  />
                  <label htmlFor="chk-model-b" className="text-xs font-semibold text-slate-800 cursor-pointer select-none">
                    Generar Modelo A y B (Anti-copia)
                  </label>
                </div>
                <div className="flex items-center gap-2 pt-4">
                  <input
                    id="chk-rubric"
                    type="checkbox"
                    checked={includeRubric}
                    onChange={(e) => setIncludeRubric(e.target.checked)}
                    className="w-4 h-4 text-violet-600 rounded border-slate-300 focus:ring-violet-500 cursor-pointer"
                  />
                  <label htmlFor="chk-rubric" className="text-xs font-semibold text-slate-800 cursor-pointer select-none">
                    Incluir Rúbrica LOMLOE
                  </label>
                </div>
              </div>

              {/* Botón de Generación */}
              <button
                type="submit"
                disabled={isGenerating}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold text-sm sm:text-base shadow-lg shadow-violet-200 transition-all active:scale-[0.99] disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isGenerating ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Redactando examen escolar, solucionario y rúbrica con IA...</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="w-5 h-5" />
                    <span>Generar Examen Completo de Aula con IA</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Result Display Card for Exam */}
          {currentExam && (
            <div id="classroom-exam-preview" className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-md">
              {/* Header Actions */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
                <div>
                  <span className="text-xs font-black uppercase text-violet-700 tracking-wider">
                    Examen Preparado
                  </span>
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">
                    {currentExam.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    {currentExam.subject} • {currentExam.level} • {currentExam.durationMinutes} min • {currentExam.totalPoints} puntos totales
                  </p>
                </div>

                {/* Main Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 print:hidden">
                  <button
                    onClick={handlePrint}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                    title="Imprimir examen en papel o guardar como PDF oficial"
                  >
                    <Printer className="w-4 h-4 text-cyan-400" />
                    <span>Imprimir / PDF</span>
                  </button>

                  <button
                    onClick={() =>
                      handleCopyText(
                        currentExam.questionsModelA
                          .map((q) => `${q.number}. ${q.questionText} (${q.points} ptos)`)
                          .join('\n\n'),
                        'Preguntas del Examen'
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors cursor-pointer"
                  >
                    <Copy className="w-4 h-4" />
                    <span>Copiar Texto</span>
                  </button>

                  {onLaunchLiveExam && (
                    <button
                      onClick={handleLaunchAsRoom}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                      title="Lanzar este examen en directo en una Sala con Código para que tus alumnos lo hagan con sus móviles/ordenadores"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>Lanzar en Vivo (Sala)</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Sub-tabs for Exam Views */}
              <div className="flex flex-wrap gap-2 my-5 print:hidden">
                <button
                  onClick={() => setExamActiveSubView('student_a')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    examActiveSubView === 'student_a'
                      ? 'bg-violet-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Modelo A (Ficha del Alumno)</span>
                </button>

                {currentExam.questionsModelB && (
                  <button
                    onClick={() => setExamActiveSubView('student_b')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      examActiveSubView === 'student_b'
                        ? 'bg-violet-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Modelo B (Anti-copia)</span>
                  </button>
                )}

                <button
                  onClick={() => setExamActiveSubView('answer_key')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    examActiveSubView === 'answer_key'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/60'
                  }`}
                >
                  <FileCheck className="w-3.5 h-3.5" />
                  <span>Solucionario Oficial del Docente</span>
                </button>

                <button
                  onClick={() => setExamActiveSubView('rubric')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    examActiveSubView === 'rubric'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200/60'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Rúbrica de Corrección LOMLOE</span>
                </button>
              </div>

              {/* CONTENIDO: MODELO A O MODELO B (FORMATO PAPEL IMPRIMIBLE) */}
              {(examActiveSubView === 'student_a' || examActiveSubView === 'student_b') && (
                <div className="border-2 border-slate-900 rounded-2xl p-6 sm:p-8 bg-white print:border-none print:p-0">
                  {/* Encabezado escolar formal */}
                  <div className="border-b-2 border-slate-900 pb-4 mb-6">
                    <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-800 mb-2">
                      <span>{currentExam.header.schoolName || 'CENTRO EDUCATIVO'}</span>
                      <span>{currentExam.header.department || 'DEPARTAMENTO'}</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs py-2 border-y border-slate-300">
                      <div>
                        <span className="text-slate-500 block text-[10px]">Asignatura:</span>
                        <strong className="text-slate-900">{currentExam.subject}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Curso y Grupo:</span>
                        <strong className="text-slate-900">{currentExam.header.courseAndGroup}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Fecha:</span>
                        <strong className="text-slate-900">{currentExam.header.examDate}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Variante:</span>
                        <strong className="text-violet-700">
                          {examActiveSubView === 'student_a' ? 'MODELO A' : 'MODELO B (Anti-copia)'}
                        </strong>
                      </div>
                    </div>

                    {/* Espacio para nombre y apellidos del alumno */}
                    <div className="mt-4 pt-2 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center text-xs font-bold">
                      <div className="w-full sm:w-2/3 border-b border-dotted border-slate-600 pb-1">
                        <span className="text-slate-500 mr-2 font-normal">Nombre y Apellidos:</span>
                      </div>
                      <div className="w-32 border-b border-dotted border-slate-600 pb-1 text-right">
                        <span className="text-slate-500 mr-1 font-normal">Calificación:</span>
                        <span>___ / 10</span>
                      </div>
                    </div>

                    {/* Instrucciones al alumno */}
                    {currentExam.header.instructions && (
                      <p className="text-[11px] text-slate-600 italic mt-3 bg-slate-50 p-2 rounded border border-slate-200">
                        <strong>Instrucciones:</strong> {currentExam.header.instructions} (Tiempo: {currentExam.durationMinutes} minutos).
                      </p>
                    )}
                  </div>

                  {/* Preguntas del Examen */}
                  <div className="space-y-6">
                    {(examActiveSubView === 'student_a'
                      ? currentExam.questionsModelA
                      : (currentExam.questionsModelB || currentExam.questionsModelA)
                    ).map((q, idx) => (
                      <div key={idx} className="pb-4 border-b border-slate-100 last:border-none">
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm font-bold text-slate-900 leading-snug">
                            <span className="font-black mr-1">{idx + 1}.</span> {q.questionText}
                          </p>
                          <span className="text-xs font-extrabold text-slate-700 bg-slate-100 px-2 py-0.5 rounded shrink-0">
                            [{q.points} ptos]
                          </span>
                        </div>

                        {/* Opciones Tipo Test */}
                        {q.type === 'multiple_choice' && q.options && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3 pl-4">
                            {q.options.map((opt, optIdx) => (
                              <div
                                key={optIdx}
                                className="flex items-center gap-2 text-xs font-medium text-slate-800"
                              >
                                <span className="w-5 h-5 rounded-full border border-slate-400 flex items-center justify-center font-bold text-[11px] shrink-0">
                                  {String.fromCharCode(65 + optIdx)}
                                </span>
                                <span>{opt}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Espacio para desarrollo si es abierta */}
                        {q.type === 'open' && (
                          <div className="mt-4 space-y-3">
                            {Array.from({ length: Math.min(q.blankSpaceLines || 6, 12) }).map((_, lineIdx) => (
                              <div
                                key={lineIdx}
                                className="border-b border-dotted border-slate-300 h-5 w-full"
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* CONTENIDO: SOLUCIONARIO DEL PROFESOR */}
              {examActiveSubView === 'answer_key' && (
                <div className="bg-emerald-50/40 border border-emerald-200 rounded-2xl p-6 sm:p-8">
                  <div className="flex items-center justify-between pb-3 mb-4 border-b border-emerald-200">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">📋</span>
                      <h4 className="text-base font-bold text-emerald-950 uppercase tracking-wide">
                        Solucionario Oficial y Criterios de Puntuación
                      </h4>
                    </div>
                    <button
                      onClick={() => handleCopyText(currentExam.answerKeyMarkdown, 'Solucionario')}
                      className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar Solucionario</span>
                    </button>
                  </div>
                  <div className="prose prose-sm prose-emerald max-w-none text-slate-800">
                    <Markdown>{currentExam.answerKeyMarkdown}</Markdown>
                  </div>
                </div>
              )}

              {/* CONTENIDO: RÚBRICA LOMLOE */}
              {examActiveSubView === 'rubric' && (
                <div className="bg-amber-50/40 border border-amber-200 rounded-2xl p-6 sm:p-8">
                  <div className="flex items-center justify-between pb-3 mb-4 border-b border-amber-200">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">⭐</span>
                      <h4 className="text-base font-bold text-amber-950 uppercase tracking-wide">
                        Rúbrica de Calificación por Competencias LOMLOE
                      </h4>
                    </div>
                    <button
                      onClick={() => handleCopyText(currentExam.rubricMarkdown, 'Rúbrica')}
                      className="px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar Rúbrica</span>
                    </button>
                  </div>
                  <div className="prose prose-sm prose-amber max-w-none text-slate-800">
                    <Markdown>{currentExam.rubricMarkdown}</Markdown>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: GENERADOR DE DINÁMICAS Y ACTIVIDADES DE CLASE           */}
      {/* ============================================================== */}
      {activeTab === 'activities' && (
        <div className="space-y-8">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                  Generar Dinámica o Actividad para Clase
                </h2>
                <p className="text-xs text-slate-500">
                  Crea fichas de ejercicios individuales, trabajo cooperativo, quizzes de aula o debates con guía docente y rúbrica.
                </p>
              </div>
            </div>

            <form onSubmit={handleGenerateActivity} className="space-y-6">
              {/* UPLOAD PDF / MATERIALES PARA LA ACTIVIDAD */}
              <div className="p-4 sm:p-5 rounded-2xl bg-indigo-50/60 border border-indigo-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileUp className="w-4 h-4 text-indigo-700" />
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-950">
                      Subir PDF de Teoría o Actividades (Opcional pero Recomendado)
                    </span>
                  </div>
                  {actMaterials.length > 0 && (
                    <span className="text-[11px] font-bold text-indigo-800 bg-indigo-100 px-2 py-0.5 rounded-full">
                      {actMaterials.length} archivo(s) cargado(s)
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  Sube aquí el PDF con la teoría, enunciados de ejercicios o problemas de tu clase. La IA creará la ficha individual, la dinámica cooperativa o el concurso basándose en este material.
                </p>

                {/* Dropzone */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDraggingAct(true);
                  }}
                  onDragLeave={() => setIsDraggingAct(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDraggingAct(false);
                    if (e.dataTransfer.files) processFiles(e.dataTransfer.files, 'act');
                  }}
                  onClick={() => actFileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all ${
                    isDraggingAct
                      ? 'border-indigo-600 bg-indigo-100/70 scale-[1.01]'
                      : 'border-indigo-300 hover:border-indigo-500 bg-white hover:bg-indigo-50/40'
                  }`}
                >
                  <input
                    ref={actFileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,application/pdf,image/*,.txt,.md"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files) processFiles(e.target.files, 'act');
                    }}
                  />
                  <div className="w-10 h-10 mx-auto rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center mb-2">
                    <Upload className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-slate-800">
                    Haz clic para subir o arrastra tu PDF de teoría / actividades aquí
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Admite PDF, imágenes de apuntes (JPG, PNG) y texto • Máximo 25 MB
                  </p>
                </div>

                {/* Material list */}
                {actMaterials.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {actMaterials.map((mat) => (
                      <div
                        key={mat.id}
                        className="flex items-center justify-between p-2.5 bg-white border border-indigo-200 rounded-xl text-xs shadow-2xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-black uppercase bg-indigo-100 text-indigo-800">
                            {mat.type === 'pdf' ? 'PDF' : mat.type === 'image' ? 'IMG' : 'DOC'}
                          </span>
                          <span className="font-semibold text-slate-800 truncate text-[11px]">
                            {mat.name}
                          </span>
                          <span className="text-[10px] text-slate-400 shrink-0">
                            ({formatFileSize(mat.sizeBytes)})
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActMaterials((prev) => prev.filter((m) => m.id !== mat.id))}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors shrink-0 ml-1 cursor-pointer"
                          title="Eliminar documento"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Selector de Tipo de Dinámica */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Tipo de Actividad de Aula
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {ACTIVITY_TYPES.map((item) => {
                    const isIndividualMode = activityType === 'individual_work';
                    const isCoopDisabled = isIndividualMode && item.type === 'cooperative_group';

                    return (
                      <button
                        key={item.type}
                        type="button"
                        disabled={isCoopDisabled}
                        onClick={() => {
                          if (!isCoopDisabled) {
                            setActivityType(item.type);
                          }
                        }}
                        className={`text-left p-3.5 rounded-2xl border transition-all relative ${
                          activityType === item.type
                            ? 'border-indigo-600 bg-indigo-50/70 shadow-xs ring-1 ring-indigo-500'
                            : isCoopDisabled
                            ? 'border-slate-200 bg-slate-100/70 opacity-40 cursor-not-allowed'
                            : 'border-slate-200 hover:bg-slate-50 cursor-pointer'
                        }`}
                      >
                        {isCoopDisabled && (
                          <span className="absolute top-2 right-2 text-[10px] font-bold bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded">
                            Deshabilitado
                          </span>
                        )}
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">{item.icon}</span>
                          <span className="font-bold text-xs sm:text-sm text-slate-900">
                            {item.label}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-snug">
                          {isCoopDisabled
                            ? 'Deshabilitado porque has seleccionado el modo Trabajo Individual.'
                            : item.desc}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Banner informativo de Trabajo Individual */}
              {activityType === 'individual_work' && (
                <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-2xl text-xs text-blue-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 animate-fadeIn">
                  <div className="flex items-center gap-2">
                    <UserIcon className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>
                      <strong>Modo Trabajo Individual activo:</strong> La opción de <em>Trabajo Cooperativo</em> se desactiva para enfocar la sesión en la resolución autónoma del alumno.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActivityType('cooperative_group')}
                    className="text-xs text-blue-700 underline font-bold cursor-pointer shrink-0"
                  >
                    Habilitar Trabajo Cooperativo
                  </button>
                </div>
              )}

              {/* Panel de Ajustes para Quiz / Concurso por Equipos */}
              {activityType === 'classroom_quiz' && (
                <div className="p-5 rounded-2xl bg-amber-50/70 border border-amber-300 space-y-4 animate-fadeIn">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">⚡</span>
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-amber-950">
                        Configuración de Equipos para el Concurso / Quiz de Aula
                      </h4>
                      <p className="text-[11px] text-amber-800">
                        Ajusta los grupos de tu clase. La IA creará el marcador de puntuación por rondas adaptado a estos equipos.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-amber-950 mb-1">
                        Alumnos en Clase
                      </label>
                      <input
                        type="number"
                        min={2}
                        max={100}
                        value={quizTotalStudents}
                        onChange={(e) => handleQuizTotalStudentsChange(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-amber-950 mb-1">
                        Número de Equipos
                      </label>
                      <input
                        type="number"
                        min={2}
                        max={20}
                        value={quizTeamCount}
                        onChange={(e) => handleQuizTeamCountChange(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-amber-950 mb-1">
                        Personas por Equipo
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={50}
                        value={quizStudentsPerTeam}
                        onChange={(e) => handleQuizStudentsPerTeamChange(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>

                  <div className="p-3 bg-white/90 rounded-xl border border-amber-200 text-xs text-amber-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>
                        Se organizará la clase en <strong>{quizTeamCount} equipos</strong> de aprox. <strong>{quizStudentsPerTeam} personas</strong> cada uno (total {quizTotalStudents} alumnos).
                      </span>
                    </div>
                    <span className="text-[10px] bg-amber-100 font-bold px-2 py-0.5 rounded-full text-amber-900 border border-amber-300 shrink-0">
                      Marcador de Equipos incluido
                    </span>
                  </div>
                </div>
              )}

              {/* Materia y Contenido */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Materia o Asignatura *
                  </label>
                  <input
                    type="text"
                    required
                    value={actSubject}
                    onChange={(e) => setActSubject(e.target.value)}
                    placeholder="Ej. Lengua y Literatura, Física y Química, Geografía..."
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tema o Reto de la Actividad *
                  </label>
                  <input
                    type="text"
                    required
                    value={actTopic}
                    onChange={(e) => setActTopic(e.target.value)}
                    placeholder="Ej. Figuras retóricas, Tabla periódica, Climas de España..."
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white font-medium"
                  />
                </div>
              </div>

              {/* Opciones de la Sesión */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nivel Educativo
                  </label>
                  <select
                    value={isPdcActive ? 'Secundaria (ESO)' : actLevel}
                    disabled={isPdcActive}
                    onChange={(e) => setActLevel(e.target.value as EducationalLevel)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:bg-white disabled:opacity-60"
                  >
                    {EDUCATIONAL_LEVELS.map((lvl) => (
                      <option key={lvl} value={lvl}>
                        {lvl}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Duración de la Clase (min)
                  </label>
                  <input
                    type="number"
                    min={20}
                    max={120}
                    value={actDuration}
                    onChange={(e) => setActDuration(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {activityType === 'individual_work'
                      ? 'Modalidad'
                      : activityType === 'classroom_quiz'
                      ? 'Personas por Equipo'
                      : 'Alumnos por Grupo'}
                  </label>
                  {activityType === 'individual_work' ? (
                    <div className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700">
                      1 alumno (Individual)
                    </div>
                  ) : activityType === 'classroom_quiz' ? (
                    <div className="w-full px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-xs font-bold text-amber-900">
                      {quizStudentsPerTeam} alumnos/equipo
                    </div>
                  ) : (
                    <input
                      type="number"
                      min={2}
                      max={8}
                      value={actGroupSize}
                      onChange={(e) => setActGroupSize(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                    />
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Objetivo o Enfoque Específico (opcional)
                </label>
                <input
                  type="text"
                  value={actGoal}
                  onChange={(e) => setActGoal(e.target.value)}
                  placeholder="Ej. Fomentar la argumentación crítica, preparar el examen final, trabajar la expresión oral..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>

              <button
                type="submit"
                disabled={isGenerating}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold text-sm sm:text-base shadow-lg shadow-indigo-200 transition-all active:scale-[0.99] disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isGenerating ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Diseñando actividad de clase, ejercicios y ficha imprimible con IA...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 text-amber-300" />
                    <span>Generar Actividad de Clase con Ficha Imprimible</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Activity Preview Card */}
          {currentActivity && (
            <div id="classroom-activity-preview" className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-md">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase text-indigo-700 tracking-wider">
                      Actividad de Aula Preparada
                    </span>
                    {currentActivity.type === 'individual_work' && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                        <UserIcon className="w-3 h-3" />
                        Trabajo Individual Autónomo
                      </span>
                    )}
                    {currentActivity.type === 'classroom_quiz' && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300">
                        ⚡ Concurso • {currentActivity.teamCount || 5} Equipos
                      </span>
                    )}
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                    {currentActivity.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    {currentActivity.subtitle} • {currentActivity.estimatedMinutes} min • {currentActivity.type === 'individual_work' ? 'Modalidad individual' : currentActivity.type === 'classroom_quiz' ? `${currentActivity.teamCount || 5} Equipos (${currentActivity.studentsPerTeam || 5} alumnos/equipo)` : `Grupos de ${currentActivity.recommendedGroupSize} alumnos`}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 print:hidden">
                  <button
                    onClick={handlePrint}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                  >
                    <Printer className="w-4 h-4 text-cyan-400" />
                    <span>Imprimir Ficha</span>
                  </button>
                  <button
                    onClick={() =>
                      handleCopyText(currentActivity.printableStudentWorksheet, 'Ficha del Alumno')
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors cursor-pointer"
                  >
                    <Copy className="w-4 h-4" />
                    <span>Copiar Ficha</span>
                  </button>
                </div>
              </div>

              {/* Sub-tabs for Activity */}
              <div className="flex flex-wrap gap-2 my-5 print:hidden">
                <button
                  onClick={() => setActActiveSubView('worksheet')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    actActiveSubView === 'worksheet'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>
                    {currentActivity.type === 'individual_work'
                      ? 'Ficha de Ejercicios del Alumno'
                      : 'Ficha Imprimible de Clase'}
                  </span>
                </button>
                <button
                  onClick={() => setActActiveSubView('teacher_guide')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    actActiveSubView === 'teacher_guide'
                      ? 'bg-violet-600 text-white shadow-xs'
                      : 'bg-violet-50 text-violet-800 hover:bg-violet-100 border border-violet-200/60'
                  }`}
                >
                  <Briefcase className="w-3.5 h-3.5" />
                  <span>Guía y Soluciones del Docente</span>
                </button>
                <button
                  onClick={() => setActActiveSubView('phases')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    actActiveSubView === 'phases'
                      ? 'bg-slate-800 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Fases Cronometradas ({currentActivity.phases.length})</span>
                </button>
                <button
                  onClick={() => setActActiveSubView('rubric')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    actActiveSubView === 'rubric'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200/60'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Rúbrica de la Actividad</span>
                </button>
              </div>

              {/* Ficha Imprimible */}
              {actActiveSubView === 'worksheet' && (
                <div className="border-2 border-slate-800 rounded-2xl p-6 sm:p-8 bg-white print:border-none print:p-0">
                  <div className="prose prose-sm max-w-none text-slate-900">
                    <Markdown>{currentActivity.printableStudentWorksheet}</Markdown>
                  </div>
                </div>
              )}

              {/* Guía del Docente */}
              {actActiveSubView === 'teacher_guide' && (
                <div className="bg-violet-50/50 border border-violet-200 rounded-2xl p-6 sm:p-8">
                  <div className="prose prose-sm prose-violet max-w-none text-slate-800">
                    <Markdown>{currentActivity.teacherAnswerKeyOrGuide}</Markdown>
                  </div>
                </div>
              )}

              {/* Fases Cronometradas */}
              {actActiveSubView === 'phases' && (
                <div className="space-y-4">
                  {currentActivity.phases.map((ph, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl border border-slate-200 bg-slate-50 flex items-start gap-4"
                    >
                      <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm shrink-0">
                        {ph.durationMinutes}'
                      </div>
                      <div className="space-y-1">
                        <h5 className="font-bold text-sm text-slate-900">{ph.title}</h5>
                        <p className="text-xs text-slate-600">
                          <strong>Profesor:</strong> {ph.teacherAction}
                        </p>
                        <p className="text-xs text-slate-700">
                          <strong>Alumnos:</strong> {ph.studentAction}
                        </p>
                      </div>
                    </div>
                  ))}

                  {/* Roles de grupo si existen (no para individual) */}
                  {currentActivity.groupRoles && currentActivity.groupRoles.length > 0 && (
                    <div className="mt-6 pt-4 border-t border-slate-200">
                      <h5 className="font-bold text-xs uppercase tracking-wider text-slate-700 mb-3">
                        Roles Cooperativos Asignados:
                      </h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {currentActivity.groupRoles.map((r, rIdx) => (
                          <div key={rIdx} className="p-3 bg-white rounded-xl border border-slate-200 text-xs">
                            <span className="font-bold text-indigo-700">{r.roleName}:</span>
                            <ul className="list-disc list-inside mt-1 text-slate-600 space-y-0.5">
                              {r.responsibilities.map((resp, respIdx) => (
                                <li key={respIdx}>{resp}</li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Rúbrica */}
              {actActiveSubView === 'rubric' && (
                <div className="bg-amber-50/50 border border-amber-200 rounded-2xl p-6 sm:p-8">
                  <div className="prose prose-sm prose-amber max-w-none text-slate-800">
                    <Markdown>{currentActivity.evaluationRubric}</Markdown>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: BANCO DE RECURSOS GUARDADOS DEL DOCENTE                 */}
      {/* ============================================================== */}
      {activeTab === 'saved' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 mb-1">
              Tus Exámenes y Actividades Guardadas
            </h3>
            <p className="text-xs text-slate-500 mb-6">
              Vuelve a consultar, imprimir o proyectar cualquier examen escolar o dinámica generada.
            </p>

            {savedExams.length === 0 && savedActivities.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Briefcase className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                <p className="font-bold text-sm text-slate-600">Aún no has generado recursos didácticos</p>
                <p className="text-xs text-slate-400 mt-1">
                  Crea tu primer examen imprimible o dinámica de aula para guardarla aquí.
                </p>
              </div>
            ) : (
              <div className="space-y-8">
                {savedExams.length > 0 && (
                  <div>
                    <h4 className="text-sm font-bold uppercase tracking-wider text-violet-900 mb-3 flex items-center gap-2">
                      <FileCheck className="w-4 h-4 text-violet-600" />
                      <span>Exámenes de Aula ({savedExams.length})</span>
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {savedExams.map((ex) => (
                        <div
                          key={ex.id}
                          className="p-5 rounded-2xl border border-slate-200 hover:border-violet-300 bg-white shadow-xs transition-all flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <h5 className="font-bold text-sm text-slate-900 leading-snug">
                                {ex.title}
                              </h5>
                              <button
                                onClick={async () => {
                                  await teacherService.deleteClassroomExam(ex.id);
                                  setSavedExams(teacherService.getSavedClassroomExams());
                                  if (currentExam?.id === ex.id) setCurrentExam(null);
                                }}
                                className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                                title="Eliminar examen"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <p className="text-xs text-slate-500 mt-1">
                              {ex.subject} • {ex.level} • {ex.durationMinutes} min
                            </p>
                          </div>
                          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                            <span className="text-[11px] text-slate-400">
                              {new Date(ex.createdAt).toLocaleDateString('es-ES')}
                            </span>
                            <button
                              onClick={() => {
                                setCurrentExam(ex);
                                setActiveTab('exams');
                                window.scrollTo({ top: 350, behavior: 'smooth' });
                              }}
                              className="text-xs font-bold text-violet-700 hover:text-violet-900 flex items-center gap-1 cursor-pointer"
                            >
                              <span>Ver y reimprimir</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {savedActivities.length > 0 && (
                  <div>
                    <h4 className="text-sm font-bold uppercase tracking-wider text-indigo-900 mb-3 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-indigo-600" />
                      <span>Dinámicas y Actividades de Clase ({savedActivities.length})</span>
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {savedActivities.map((ac) => (
                        <div
                          key={ac.id}
                          className="p-5 rounded-2xl border border-slate-200 hover:border-indigo-300 bg-white shadow-xs transition-all flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <h5 className="font-bold text-sm text-slate-900 leading-snug">
                                {ac.title}
                              </h5>
                              <button
                                onClick={async () => {
                                  await teacherService.deleteClassroomActivity(ac.id);
                                  setSavedActivities(teacherService.getSavedClassroomActivities());
                                  if (currentActivity?.id === ac.id) setCurrentActivity(null);
                                }}
                                className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                                title="Eliminar actividad"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <p className="text-xs text-slate-500 mt-1">
                              {ac.subject} • {ac.level} • {ac.estimatedMinutes} min
                            </p>
                          </div>
                          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                            <span className="text-[11px] text-slate-400">
                              {new Date(ac.createdAt).toLocaleDateString('es-ES')}
                            </span>
                            <button
                              onClick={() => {
                                setCurrentActivity(ac);
                                setActiveTab('activities');
                                window.scrollTo({ top: 350, behavior: 'smooth' });
                              }}
                              className="text-xs font-bold text-indigo-700 hover:text-indigo-900 flex items-center gap-1 cursor-pointer"
                            >
                              <span>Ver ficha</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
