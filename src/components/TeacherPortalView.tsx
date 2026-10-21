import React, { useState, useEffect } from 'react';
import Markdown from 'react-markdown';
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  Briefcase,
  Check,
  ChevronRight,
  Clock,
  Copy,
  Download,
  Eye,
  FileCheck,
  FileText,
  GraduationCap,
  HelpCircle,
  Layers,
  ListOrdered,
  Lock,
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
    type: 'cooperative_group',
    label: 'Trabajo Cooperativo',
    desc: 'Equipos con 4 roles estructurados (Coordinador, Secretario, Portavoz, Cronometrador) y fases guiadas.',
    icon: '🤝',
  },
  {
    type: 'classroom_quiz',
    label: 'Quiz / Concurso por Equipos',
    desc: 'Dinámica proyectable para competir en grupos con preguntas tipo test y puntuaciones.',
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
  const [activityType, setActivityType] = useState<ActivityType>('cooperative_group');
  const [actSubject, setActSubject] = useState('');
  const [actTopic, setActTopic] = useState('');
  const [actLevel, setActLevel] = useState<EducationalLevel>('Secundaria (ESO)');
  const [actDuration, setActDuration] = useState<number>(50);
  const [actGroupSize, setActGroupSize] = useState<number>(4);
  const [actGoal, setActGoal] = useState<string>('');

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

  // Generate Classroom Exam
  const handleGenerateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim()) {
      setGenError('Por favor, indica la asignatura del examen.');
      return;
    }
    if (!topic.trim()) {
      setGenError('Por favor, indica el tema o bloque de contenidos.');
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

      const exam = await teacherService.generateClassroomExam(config);
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
      setGenError('Por favor, indica el tema o reto a trabajar.');
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
        groupSize: actGroupSize,
        customGoal: actGoal.trim(),
        isPdcAdapted: isPdcActive,
      };

      const act = await teacherService.generateClassroomActivity(config);
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
      overview: `Examen preparado para el aula por ${currentExam.header.teacherName || 'Profesor'} • ${currentExam.header.schoolName || ''}`,
      questions: mappedQuestions,
      totalPoints: currentExam.totalPoints,
      isPdcAdapted: currentExam.isPdcAdapted,
    };

    onLaunchLiveExam(standardExam);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      {/* Toast Notification */}
      {copiedNotification && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-2xl text-xs font-semibold flex items-center gap-2 animate-slideUp">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{copiedNotification}</span>
        </div>
      )}

      {/* Hero Banner del Profesorado */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-violet-900 via-indigo-900 to-slate-900 text-white p-6 sm:p-10 mb-8 shadow-xl">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/20 border border-violet-400/30 text-violet-200 text-xs font-bold uppercase tracking-wider mb-3">
            <Briefcase className="w-3.5 h-3.5 text-violet-400" />
            <span>Zona Docente & Profesorado</span>
            <span className="text-violet-400">•</span>
            <span>Didáctica LOMLOE</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
            Herramientas para Profesores: Exámenes de Aula y Dinámicas en Clase
          </h1>
          <p className="mt-2.5 text-sm sm:text-base text-violet-100/90 leading-relaxed">
            Diseña exámenes impresos formales con <strong className="text-white font-semibold">Modelo A y B anti-copias</strong>, <strong className="text-white font-semibold">solucionarios con rúbrica</strong>, y dinámicas participativas listas para aplicar en tus sesiones lectivas.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              onClick={() => setActiveTab('exams')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'exams'
                  ? 'bg-white text-indigo-950 shadow-md scale-102'
                  : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
              }`}
            >
              <FileCheck className="w-4 h-4 text-violet-600" />
              <span>Exámenes para Imprimir (A/B)</span>
            </button>
            <button
              onClick={() => setActiveTab('activities')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'activities'
                  ? 'bg-white text-indigo-950 shadow-md scale-102'
                  : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Dinámicas y Actividades</span>
            </button>
            <button
              onClick={() => setActiveTab('saved')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'saved'
                  ? 'bg-white text-indigo-950 shadow-md scale-102'
                  : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
              }`}
            >
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>Mis Recursos Guardados ({savedExams.length + savedActivities.length})</span>
            </button>
          </div>
        </div>

        {/* Floating Background Accents */}
        <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-violet-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-0 right-1/4 w-48 h-48 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* PDC Warning Banner if active */}
      <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-300 flex items-center justify-between gap-3 text-amber-950">
        <div className="flex items-center gap-3">
          <PdcAdaptationButton variant="pill" showTooltip={false} />
          <p className="text-xs font-semibold leading-relaxed">
            {isPdcActive
              ? 'Modo PDC / DUA Activo: Las pruebas y actividades se adaptarán con pautas de accesibilidad cognitiva, apoyos visuales y enunciados directos para alumnos con adaptación curricular.'
              : '¿Tienes alumnos con adaptación curricular o PDC? Activa el botón PDC para adaptar las preguntas y actividades al currículo accesible.'}
          </p>
        </div>
      </div>

      {/* ERROR ALERT */}
      {genError && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Error en la configuración:</p>
            <p className="text-xs sm:text-sm mt-0.5">{genError}</p>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 1: GENERADOR DE EXÁMENES DE AULA                           */}
      {/* ============================================================== */}
      {activeTab === 'exams' && (
        <div className="space-y-8">
          {/* Form Card */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center font-bold">
                <FileCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                  Configurar Examen Escolar para Imprimir
                </h2>
                <p className="text-xs text-slate-500">
                  Genera la prueba oficial con membrete del centro, Modelo A y B, solucionario para el profesor y rúbrica LOMLOE.
                </p>
              </div>
            </div>

            <form onSubmit={handleGenerateExam} className="space-y-6">
              {/* Membrete del Centro Educativo */}
              <div>
                <span className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-1.5">
                  <School className="w-4 h-4 text-violet-600" />
                  <span>Membrete y Datos del Centro Escolar</span>
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Nombre del Centro / IES
                    </label>
                    <input
                      type="text"
                      value={schoolHeader.schoolName}
                      onChange={(e) =>
                        setSchoolHeader({ ...schoolHeader, schoolName: e.target.value })
                      }
                      placeholder="IES Los Rosales"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-violet-500 focus:bg-white"
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
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-violet-500 focus:bg-white"
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
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-violet-500 focus:bg-white"
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
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-violet-500 focus:bg-white"
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
                        'Examen para Word'
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors cursor-pointer"
                    title="Copiar texto para pegar en Word o Google Docs"
                  >
                    <Copy className="w-4 h-4" />
                    <span>Copiar a Word</span>
                  </button>

                  {onLaunchLiveExam && (
                    <button
                      onClick={handleLaunchAsRoom}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm shadow-indigo-200 transition-colors cursor-pointer"
                      title="Abrir sala multijugador con código PIN para que los alumnos lo hagan en clase con sus móviles"
                    >
                      <Play className="w-4 h-4" />
                      <span>Lanzar en Vivo (con PIN)</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Sub-Tabs for Exam Preview */}
              <div className="flex flex-wrap gap-2 my-5 print:hidden">
                <button
                  onClick={() => setExamActiveSubView('student_a')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    examActiveSubView === 'student_a'
                      ? 'bg-violet-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Examen Alumno (Modelo A)</span>
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
                    <FileText className="w-3.5 h-3.5" />
                    <span>Examen Alumno (Modelo B Anti-Copia)</span>
                  </button>
                )}

                <button
                  onClick={() => setExamActiveSubView('answer_key')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    examActiveSubView === 'answer_key'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/60'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
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
                  <span>Rúbrica de Evaluación LOMLOE</span>
                </button>
              </div>

              {/* CONTENIDO: MODELO A / MODELO B (FORMATO OFICIAL DE IMPRESIÓN) */}
              {(examActiveSubView === 'student_a' || examActiveSubView === 'student_b') && (
                <div className="border-2 border-slate-800 rounded-2xl p-6 sm:p-8 bg-white print:border-none print:p-0">
                  {/* Encabezado Escolar Formal */}
                  <div className="border-b-2 border-slate-800 pb-4 mb-6">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <h4 className="text-base sm:text-lg font-black uppercase tracking-tight text-slate-900">
                          {currentExam.header.schoolName || 'CENTRO EDUCATIVO'}
                        </h4>
                        <p className="text-xs font-bold text-slate-600 uppercase">
                          {currentExam.header.department || 'DEPARTAMENTO DIDÁCTICO'}
                        </p>
                        <p className="text-xs text-slate-600 font-semibold mt-0.5">
                          Asignatura: <span className="font-bold text-slate-900">{currentExam.subject}</span> • Curso: {currentExam.header.courseAndGroup}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="inline-block px-3 py-1 bg-slate-900 text-white text-xs font-black uppercase rounded">
                          {examActiveSubView === 'student_a' ? 'MODELO A' : 'MODELO B'}
                        </span>
                        <p className="text-xs text-slate-500 font-medium mt-1">
                          Fecha: {currentExam.header.examDate}
                        </p>
                        <p className="text-xs text-slate-500 font-medium">
                          {currentExam.header.evaluationPeriod}
                        </p>
                      </div>
                    </div>

                    {/* Fila de datos del estudiante */}
                    <div className="grid grid-cols-12 gap-2 mt-4 pt-3 border-t border-slate-300 text-xs">
                      <div className="col-span-7 border-b border-dotted border-slate-500 pb-1">
                        <span className="font-bold">Apellidos y Nombre:</span>
                      </div>
                      <div className="col-span-2 border-b border-dotted border-slate-500 pb-1 text-center">
                        <span className="font-bold">Grupo:</span>
                      </div>
                      <div className="col-span-3 border border-slate-400 p-1 text-center bg-slate-50 rounded">
                        <span className="font-black text-slate-700">CALIFICACIÓN / 10:</span>
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
                  Generar Dinámica o Actividad Participativa para Clase
                </h2>
                <p className="text-xs text-slate-500">
                  Crea actividades grupales, quizzes de clase, debates o escape rooms con ficha imprimible y guía docente.
                </p>
              </div>
            </div>

            <form onSubmit={handleGenerateActivity} className="space-y-6">
              {/* Selector de Tipo de Dinámica */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Tipo de Actividad de Aula
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {ACTIVITY_TYPES.map((item) => (
                    <button
                      key={item.type}
                      type="button"
                      onClick={() => setActivityType(item.type)}
                      className={`text-left p-3.5 rounded-2xl border transition-all cursor-pointer ${
                        activityType === item.type
                          ? 'border-indigo-600 bg-indigo-50/70 shadow-xs ring-1 ring-indigo-500'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{item.icon}</span>
                        <span className="font-bold text-xs sm:text-sm text-slate-900">
                          {item.label}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-snug">{item.desc}</p>
                    </button>
                  ))}
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
                    Alumnos por Grupo
                  </label>
                  <input
                    type="number"
                    min={2}
                    max={8}
                    value={actGroupSize}
                    onChange={(e) => setActGroupSize(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  />
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
                    <span>Diseñando dinámica de aula, roles y ficha fotocopiable con IA...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 text-amber-300" />
                    <span>Generar Dinámica de Clase con Ficha Fotocopiable</span>
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
                  <span className="text-xs font-black uppercase text-indigo-700 tracking-wider">
                    Actividad de Aula Preparada
                  </span>
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">
                    {currentActivity.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    {currentActivity.subtitle} • {currentActivity.estimatedMinutes} min • Grupos de {currentActivity.recommendedGroupSize} alumnos
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
                  <span>Ficha Imprimible del Alumnado</span>
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
                  <span>Guía y Soluciones del Profesor</span>
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

                  {/* Roles de grupo si existen */}
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
              <div className="space-y-6">
                {/* Exámenes */}
                {savedExams.length > 0 && (
                  <div>
                    <h4 className="text-xs font-black uppercase text-violet-700 tracking-wider mb-3">
                      Exámenes Escolares ({savedExams.length})
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {savedExams.map((exam) => (
                        <div
                          key={exam.id}
                          className="p-4 rounded-2xl border border-slate-200 hover:border-violet-300 bg-white shadow-2xs transition-all flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                              <span className="font-bold text-violet-700">{exam.subject}</span>
                              <span>{new Date(exam.createdAt).toLocaleDateString()}</span>
                            </div>
                            <h5 className="font-bold text-sm text-slate-900">{exam.title}</h5>
                            <p className="text-xs text-slate-600 mt-1">
                              {exam.level} • {exam.durationMinutes} min • {exam.questionsModelA.length} preguntas
                            </p>
                          </div>
                          <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-slate-100">
                            <button
                              onClick={() => {
                                setCurrentExam(exam);
                                setActiveTab('exams');
                              }}
                              className="text-xs font-bold text-violet-700 hover:text-violet-900 flex items-center gap-1 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Ver e Imprimir</span>
                            </button>
                            <button
                              onClick={async () => {
                                if (confirm('¿Eliminar este examen guardado?')) {
                                  await teacherService.deleteClassroomExam(exam.id);
                                  setSavedExams(teacherService.getSavedClassroomExams());
                                }
                              }}
                              className="text-xs text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                              title="Eliminar"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actividades */}
                {savedActivities.length > 0 && (
                  <div className="pt-4 border-t border-slate-100">
                    <h4 className="text-xs font-black uppercase text-indigo-700 tracking-wider mb-3">
                      Dinámicas y Actividades de Clase ({savedActivities.length})
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {savedActivities.map((act) => (
                        <div
                          key={act.id}
                          className="p-4 rounded-2xl border border-slate-200 hover:border-indigo-300 bg-white shadow-2xs transition-all flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                              <span className="font-bold text-indigo-700">{act.subject}</span>
                              <span>{new Date(act.createdAt).toLocaleDateString()}</span>
                            </div>
                            <h5 className="font-bold text-sm text-slate-900">{act.title}</h5>
                            <p className="text-xs text-slate-600 mt-1">
                              {act.level} • {act.estimatedMinutes} min • Grupos de {act.recommendedGroupSize}
                            </p>
                          </div>
                          <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-slate-100">
                            <button
                              onClick={() => {
                                setCurrentActivity(act);
                                setActiveTab('activities');
                              }}
                              className="text-xs font-bold text-indigo-700 hover:text-indigo-900 flex items-center gap-1 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Ver Ficha y Guía</span>
                            </button>
                            <button
                              onClick={async () => {
                                if (confirm('¿Eliminar esta actividad guardada?')) {
                                  await teacherService.deleteClassroomActivity(act.id);
                                  setSavedActivities(teacherService.getSavedClassroomActivities());
                                }
                              }}
                              className="text-xs text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                              title="Eliminar"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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
