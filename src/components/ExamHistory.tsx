import React, { useState } from 'react';
import {
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronRight,
  GraduationCap,
  PlusCircle,
  Search,
  Trash2,
} from 'lucide-react';
import { historyService } from '../services/historyService';
import { ExamResult } from '../types';

interface ExamHistoryProps {
  userId?: string;
  onSelectResult: (result: ExamResult) => void;
  onNewExam: () => void;
}

export const ExamHistory: React.FC<ExamHistoryProps> = ({
  userId,
  onSelectResult,
  onNewExam,
}) => {
  const [results, setResults] = useState<ExamResult[]>(() => historyService.getResults(userId));
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('¿Deseas eliminar este examen de tu historial?')) {
      historyService.deleteResult(id);
      setResults(historyService.getResults(userId));
    }
  };

  const stats = historyService.getUserStats(userId);

  // Filtered results
  const filteredResults = results.filter((r) => {
    const matchesSearch =
      r.examTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.topic.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSubject = selectedSubject === 'all' || r.subject === selectedSubject;
    return matchesSearch && matchesSubject;
  });

  const subjects = Array.from(new Set(results.map((r) => r.subject)));

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10 animate-fadeIn">
      {/* Header & Overall Stats */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Historial de Exámenes Realizados
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Consulta tus calificaciones, progreso de estudio y repasos anteriores
          </p>
        </div>

        <button
          id="btn-history-new-exam"
          type="button"
          onClick={onNewExam}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-sm transition-all"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Hacer Nuevo Examen</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mb-8">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-semibold">Exámenes Hechos</span>
          <div className="text-2xl font-extrabold text-slate-900 mt-1 font-mono">
            {stats.totalExams}
          </div>
          <span className="text-[11px] text-slate-400">Total en cuenta</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-semibold">Nota Media</span>
          <div className="text-2xl font-extrabold text-indigo-600 mt-1 font-mono">
            {stats.averagePercentage}%
          </div>
          <span className="text-[11px] text-slate-400">Promedio global</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-semibold">Aprobados</span>
          <div className="text-2xl font-extrabold text-emerald-600 mt-1 font-mono">
            {stats.passedCount}
          </div>
          <span className="text-[11px] text-slate-400">Exámenes &gt; 50%</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-semibold">Materia más vista</span>
          <div className="text-base font-bold text-slate-800 mt-2 truncate" title={stats.topSubject}>
            {stats.topSubject}
          </div>
          <span className="text-[11px] text-slate-400">Frecuencia de estudio</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 mb-6">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            id="input-history-search"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por tema, materia o título de examen..."
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
          />
        </div>

        {subjects.length > 0 && (
          <select
            id="select-history-subject"
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="w-full sm:w-auto px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">Todas las materias ({subjects.length})</option>
            {subjects.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Exam List */}
      {filteredResults.length === 0 ? (
        <div className="text-center py-16 px-4 bg-white rounded-3xl border border-slate-200">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-800">
            {searchTerm ? 'No se encontraron exámenes con esa búsqueda' : 'Aún no has completado ningún examen'}
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-sm mx-auto">
            {searchTerm
              ? 'Prueba con otros términos o limpia el filtro.'
              : 'Sube tus apuntes o fotos para que la IA genere tu primer examen.'}
          </p>
          <button
            type="button"
            onClick={onNewExam}
            className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-sm transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Crear primer examen</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredResults.map((r) => {
            const scoreOutOfTen = (r.totalScore / r.maxPossibleScore) * 10;
            const isPassed = r.percentage >= 50;

            return (
              <div
                key={r.id}
                onClick={() => onSelectResult(r)}
                className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      {r.subject}
                    </span>
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      {r.level}
                    </span>
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(r.completedAt).toLocaleDateString('es-ES', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>

                  <h3 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                    {r.examTitle}
                  </h3>
                  <p className="text-xs text-slate-500 truncate mt-0.5">
                    Tema: {r.topic} • {r.examData.questions.length} preguntas
                  </p>
                </div>

                {/* Score & Actions */}
                <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
                  <div className="text-right">
                    <div
                      className={`text-lg sm:text-xl font-extrabold font-mono ${
                        isPassed ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {scoreOutOfTen.toFixed(1)}
                      <span className="text-xs text-slate-400 font-normal"> / 10</span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-medium">
                      {r.percentage}% aciertos
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => handleDelete(r.id, e)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                      title="Eliminar del historial"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <div className="p-2 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all">
                      <ChevronRight className="w-5 h-5" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
