import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Award,
  CheckCircle2,
  Database,
  Download,
  ExternalLink,
  GraduationCap,
  KeyRound,
  Mail,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  User as UserIcon,
  Users,
  X,
} from 'lucide-react';
import { authService } from '../services/authService';
import { historyService } from '../services/historyService';
import { User, ExamResult } from '../types';

interface AdminDatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onOpenDbSettings?: () => void;
}

export const AdminDatabaseModal: React.FC<AdminDatabaseModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onOpenDbSettings,
}) => {
  const [activeTab, setActiveTab] = useState<'users' | 'exams' | 'rules'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [examResults, setExamResults] = useState<ExamResult[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [providerFilter, setProviderFilter] = useState<'all' | 'google' | 'email'>('all');
  const [loading, setLoading] = useState(false);
  const [selectedResult, setSelectedResult] = useState<ExamResult | null>(null);

  // Load database items
  const loadDatabase = async () => {
    setLoading(true);
    try {
      // 1. Fetch users from Firestore
      const fetchedUsers = await authService.getAllUsersFromDatabase();
      setUsers(fetchedUsers);

      // 2. Fetch exam results from Firestore
      const fetchedResults = await historyService.getAllExamResultsFromDatabase();
      setExamResults(fetchedResults);
    } catch (err: any) {
      console.error('Error fetching database records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadDatabase();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Filter users
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesProvider =
      providerFilter === 'all' || u.provider === providerFilter;
    return matchesSearch && matchesProvider;
  });

  // Calculate statistics
  const totalUsers = users.length;
  const verifiedCount = users.filter((u) => u.emailVerified).length;
  const totalExams = examResults.length;
  const avgScore =
    totalExams > 0
      ? Math.round(
          examResults.reduce((acc, r) => acc + (r.percentage || 0), 0) /
            totalExams
        )
      : 0;

  // Export JSON backup
  const handleExportJson = () => {
    const data = {
      exportDate: new Date().toISOString(),
      adminEmail: currentUser?.email,
      users,
      examResults,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_database_examen_ai_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-md animate-fadeIn">
      <div
        id="admin-database-modal"
        className="bg-white rounded-2xl sm:rounded-3xl max-w-5xl w-full h-[90vh] max-h-[850px] shadow-2xl border border-slate-200 flex flex-col overflow-hidden relative"
      >
        {/* Modal Top Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-200">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">
                  Panel de Base de Datos y Usuarios
                </h2>
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Acceso Administrador
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Conectado como <strong className="text-slate-800 font-semibold">{currentUser?.email || 'Administrador'}</strong> • Supabase / Tabla &apos;exams&apos;
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="admin-btn-refresh"
              onClick={loadDatabase}
              disabled={loading}
              title="Refrescar datos de la base de datos"
              className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-slate-200/60 rounded-xl transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              id="admin-btn-export"
              onClick={handleExportJson}
              title="Descargar copia de la base de datos en JSON"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-200/80 hover:bg-slate-300/80 text-slate-700 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Exportar JSON</span>
            </button>
            {onOpenDbSettings && (
              <button
                id="admin-btn-db-settings"
                onClick={() => {
                  onClose();
                  onOpenDbSettings();
                }}
                title="Configurar servidor, Supabase o Home Lab"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors"
              >
                <Database className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Ajustes / Home Lab</span>
              </button>
            )}
            <button
              id="admin-btn-close"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Global KPI Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 sm:p-6 bg-slate-50 border-b border-slate-200 shrink-0">
          <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs text-slate-500 font-medium block">Total Usuarios</span>
              <span className="text-lg font-bold text-slate-900">{totalUsers}</span>
            </div>
          </div>

          <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs text-slate-500 font-medium block">Verificados</span>
              <span className="text-lg font-bold text-emerald-700">{verifiedCount}</span>
            </div>
          </div>

          <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
              <GraduationCap className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs text-slate-500 font-medium block">Exámenes Realizados</span>
              <span className="text-lg font-bold text-slate-900">{totalExams}</span>
            </div>
          </div>

          <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs text-slate-500 font-medium block">Nota Media Global</span>
              <span className="text-lg font-bold text-amber-700">{avgScore}%</span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 pt-3 flex items-center gap-2 border-b border-slate-200 bg-white shrink-0">
          <button
            id="admin-tab-users"
            onClick={() => setActiveTab('users')}
            className={`pb-3 px-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'users'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Usuarios de la BD ({users.length})</span>
          </button>
          <button
            id="admin-tab-exams"
            onClick={() => setActiveTab('exams')}
            className={`pb-3 px-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'exams'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>Evaluaciones Guardadas ({examResults.length})</span>
          </button>
          <button
            id="admin-tab-rules"
            onClick={() => setActiveTab('rules')}
            className={`pb-3 px-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'rules'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Seguridad y Reglas Firestore</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-white">
          {/* TAB 1: USERS */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              {/* Search & Provider Filter */}
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    id="admin-search-users"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar por correo o nombre..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl text-xs font-semibold self-stretch sm:self-auto">
                  <button
                    onClick={() => setProviderFilter('all')}
                    className={`px-3 py-1.5 rounded-lg transition-colors ${
                      providerFilter === 'all'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Todos
                  </button>
                  <button
                    onClick={() => setProviderFilter('google')}
                    className={`px-3 py-1.5 rounded-lg transition-colors ${
                      providerFilter === 'google'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Google
                  </button>
                  <button
                    onClick={() => setProviderFilter('email')}
                    className={`px-3 py-1.5 rounded-lg transition-colors ${
                      providerFilter === 'email'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Email + Código
                  </button>
                </div>
              </div>

              {/* Users Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Usuario</th>
                        <th className="py-3 px-4">Correo Electrónico</th>
                        <th className="py-3 px-4">Proveedor</th>
                        <th className="py-3 px-4">Verificación</th>
                        <th className="py-3 px-4">Rol</th>
                        <th className="py-3 px-4">Fecha Registro</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-400">
                            No se han encontrado usuarios registrados con ese criterio.
                          </td>
                        </tr>
                      ) : (
                        filteredUsers.map((u) => {
                          const isAdmin = u.email.toLowerCase() === 'maruyalexander1@gmail.com' || u.role === 'admin';
                          return (
                            <tr
                              key={u.id}
                              className={`hover:bg-slate-50/80 transition-colors ${
                                isAdmin ? 'bg-amber-50/30 font-medium' : ''
                              }`}
                            >
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2.5">
                                  {u.avatar ? (
                                    <img
                                      src={u.avatar}
                                      alt={u.name}
                                      className="w-7 h-7 rounded-full bg-slate-100 object-cover"
                                      referrerPolicy="no-referrer"
                                    />
                                  ) : (
                                    <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
                                      {u.name.charAt(0).toUpperCase()}
                                    </div>
                                  )}
                                  <span className="font-semibold text-slate-900">
                                    {u.name}
                                  </span>
                                </div>
                              </td>
                              <td className="py-3 px-4 font-mono text-xs text-slate-600">
                                {u.email}
                              </td>
                              <td className="py-3 px-4">
                                {u.provider === 'google' ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
                                    Google Auth
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold">
                                    Email + Código
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-4">
                                {u.emailVerified ? (
                                  <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold text-xs">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    Verificado
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-slate-400 text-xs">
                                    Pendiente
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-4">
                                {isAdmin ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-300 text-xs font-bold">
                                    <ShieldCheck className="w-3.5 h-3.5" />
                                    Administrador
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-xs">
                                    Estudiante
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-xs text-slate-500">
                                {new Date(u.createdAt).toLocaleDateString('es-ES', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: EXAM EVALUATIONS */}
          {activeTab === 'exams' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-500">
                Listado en tiempo real de todos los exámenes realizados y calificados con IA en la base de datos.
              </p>

              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Título del Examen</th>
                        <th className="py-3 px-4">Materia / Tema</th>
                        <th className="py-3 px-4">Nivel</th>
                        <th className="py-3 px-4">Puntuación</th>
                        <th className="py-3 px-4">Porcentaje</th>
                        <th className="py-3 px-4">Fecha</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {examResults.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-400">
                            Aún no hay exámenes guardados en la base de datos. Genera un examen para registrar la primera evaluación.
                          </td>
                        </tr>
                      ) : (
                        examResults.map((res) => {
                          const passed = res.percentage >= 50;
                          return (
                            <tr key={res.id} className="hover:bg-slate-50 transition-colors">
                              <td className="py-3 px-4 font-semibold text-slate-900">
                                {res.examTitle}
                              </td>
                              <td className="py-3 px-4 text-slate-600">
                                {res.subject} • <span className="text-slate-500">{res.topic}</span>
                              </td>
                              <td className="py-3 px-4 text-slate-500">
                                {res.level}
                              </td>
                              <td className="py-3 px-4 font-semibold">
                                {res.totalScore} / {res.maxPossibleScore} pts
                              </td>
                              <td className="py-3 px-4">
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                                    passed
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                                  }`}
                                >
                                  {res.percentage}%
                                </span>
                              </td>
                              <td className="py-3 px-4 text-xs text-slate-500">
                                {new Date(res.completedAt).toLocaleDateString('es-ES', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: FIRESTORE RULES & SECURITY */}
          {activeTab === 'rules' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-amber-900">
                      Reglas de Control de Acceso Basadas en Atributos (ABAC)
                    </h4>
                    <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                      Tu cuenta <strong className="font-semibold">{currentUser?.email || 'Administrador'}</strong> está configurada con privilegios de Administrador Supremo en las reglas desplegadas de Firestore. Puedes leer todas las colecciones (<code className="bg-amber-100 px-1 py-0.5 rounded">/users</code> y <code className="bg-amber-100 px-1 py-0.5 rounded">/exam_results</code>), mientras que cada estudiante únicamente tiene acceso a sus propios datos.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                    Detalles de Supabase & Exámenes
                  </h5>
                  <ul className="text-xs space-y-2 text-slate-600">
                    <li><strong>Motor:</strong> Supabase (PostgreSQL + Auth)</li>
                    <li><strong>Tabla de exámenes:</strong> <code className="bg-slate-200/70 px-1 py-0.5 rounded text-[11px] font-bold text-emerald-700">exams</code></li>
                    <li><strong>Variables de entorno:</strong> <code className="bg-slate-200/70 px-1 py-0.5 rounded text-[11px]">VITE_SUPABASE_URL</code> y <code className="bg-slate-200/70 px-1 py-0.5 rounded text-[11px]">VITE_SUPABASE_ANON_KEY</code></li>
                    <li><strong>Administrador asignado:</strong> <code className="bg-slate-200/70 px-1 py-0.5 rounded text-[11px]">{currentUser?.email || 'Cuenta autorizada'}</code></li>
                  </ul>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                    Esquema SQL de la tabla &apos;exams&apos;
                  </h5>
                  <p className="text-[11px] text-slate-500 mb-2 leading-relaxed">
                    Si creas la tabla en el SQL Editor de tu Supabase Dashboard:
                  </p>
                  <pre className="text-[10px] bg-slate-900 text-emerald-300 p-2.5 rounded-lg overflow-x-auto font-mono">
{`create table if not exists exams (
  id text primary key,
  user_id text not null,
  title text,
  subject text,
  topic text,
  level text,
  score numeric,
  max_score numeric,
  percentage numeric,
  data jsonb,
  created_at timestamptz default now()
);`}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
