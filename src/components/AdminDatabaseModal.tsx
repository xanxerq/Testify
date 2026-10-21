import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  Award,
  CheckCircle2,
  Database,
  Download,
  ExternalLink,
  GraduationCap,
  Laptop,
  Mail,
  RefreshCw,
  Search,
  Server,
  ShieldCheck,
  User as UserIcon,
  Users,
  Wifi,
  X,
} from 'lucide-react';
import { authService } from '../services/authService';
import { historyService } from '../services/historyService';
import {
  getPocketBaseUrl,
  testPocketBase,
  isPocketBaseConfigured,
} from '../services/pocketbase';
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
  const [activeTab, setActiveTab] = useState<'users' | 'exams' | 'server'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [examResults, setExamResults] = useState<ExamResult[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'user' | 'teacher' | 'admin'>('all');
  const [loading, setLoading] = useState(false);
  const [serverPing, setServerPing] = useState<{
    ok: boolean;
    message: string;
    latencyMs?: number;
  } | null>(null);
  const [pinging, setPinging] = useState(false);
  const [roleUpdateToast, setRoleUpdateToast] = useState<string | null>(null);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  const pbUrl = getPocketBaseUrl();

  // Load database items from PocketBase
  const loadDatabase = async () => {
    setLoading(true);
    try {
      // 1. Fetch users from PocketBase collection 'users'
      const fetchedUsers = await authService.getAllUsersFromDatabase();
      setUsers(fetchedUsers);

      // 2. Fetch exam results from PocketBase collection 'exams'
      const fetchedResults = await historyService.getAllExamResultsFromDatabase();
      setExamResults(fetchedResults);
    } catch (err: any) {
      console.error('Error fetching PocketBase records:', err);
    } finally {
      setLoading(false);
    }
  };

  // Change user role from admin panel
  const handleRoleChange = async (
    userId: string,
    newRole: 'user' | 'teacher' | 'admin',
    userName: string
  ) => {
    setUpdatingUserId(userId);
    try {
      await authService.updateUserRole(userId, newRole);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
      const roleName =
        newRole === 'admin'
          ? 'Administrador'
          : newRole === 'teacher'
          ? 'Profesor / Docente'
          : 'Estudiante';
      setRoleUpdateToast(`¡Rol de "${userName}" actualizado a ${roleName}!`);
      setTimeout(() => setRoleUpdateToast(null), 3000);
    } catch (err: any) {
      console.error('Error updating user role:', err);
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleTestServer = async () => {
    setPinging(true);
    try {
      const res = await testPocketBase();
      setServerPing(res);
    } finally {
      setPinging(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadDatabase();
      handleTestServer();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Filter users
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.institution && u.institution.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesRole =
      roleFilter === 'all' ||
      (roleFilter === 'admin' && (u.role === 'admin' || authService.isAdminEmail(u.email))) ||
      (roleFilter === 'teacher' && u.role === 'teacher') ||
      (roleFilter === 'user' && (u.role === 'user' || !u.role));

    return matchesSearch && matchesRole;
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
      pocketBaseUrl: pbUrl,
      users,
      examResults,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_pocketbase_${Date.now()}.json`;
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
            <div className="w-10 h-10 rounded-xl bg-violet-600 text-white flex items-center justify-center shadow-md shadow-violet-200">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">
                  Panel de Base de Datos y Usuarios
                </h2>
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Acceso Administrador
                </span>
              </div>
              <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                <span>Servidor:</span>
                <strong className="text-slate-800 font-mono text-[11px] truncate max-w-[260px] sm:max-w-md">
                  {pbUrl || 'Sin configurar'}
                </strong>
                {pbUrl && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Enlace Activo
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {pbUrl && (
              <a
                href={`${pbUrl}/_/`}
                target="_blank"
                rel="noopener noreferrer"
                title="Abrir Panel Web Admin de PocketBase en tu Mac"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-xl bg-violet-50 hover:bg-violet-100 text-violet-800 border border-violet-200 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Admin UI (/_/)</span>
              </a>
            )}
            <button
              id="admin-btn-refresh"
              onClick={loadDatabase}
              disabled={loading}
              title="Refrescar datos desde PocketBase"
              className="p-2 text-slate-600 hover:text-violet-600 hover:bg-slate-200/60 rounded-xl transition-all disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              id="admin-btn-export"
              onClick={handleExportJson}
              title="Descargar copia de la base de datos en JSON"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-200/80 hover:bg-slate-300/80 text-slate-700 transition-colors cursor-pointer"
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
                title="Configurar servidor PocketBase o cambiar túnel"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors cursor-pointer"
              >
                <Server className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Ajustes Servidor</span>
              </button>
            )}
            <button
              id="admin-btn-close"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-full transition-colors cursor-pointer"
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
              <span className="text-xs text-slate-500 font-medium block">Cuentas Activas</span>
              <span className="text-lg font-bold text-emerald-700">{verifiedCount || totalUsers}</span>
            </div>
          </div>

          <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
              <GraduationCap className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs text-slate-500 font-medium block">Exámenes Guardados</span>
              <span className="text-lg font-bold text-slate-900">{totalExams}</span>
            </div>
          </div>

          <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs text-slate-500 font-medium block">Nota Media</span>
              <span className="text-lg font-bold text-amber-700">{avgScore}%</span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 pt-3 flex items-center gap-2 border-b border-slate-200 bg-white shrink-0">
          <button
            id="admin-tab-users"
            onClick={() => setActiveTab('users')}
            className={`pb-3 px-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'users'
                ? 'border-indigo-600 text-indigo-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Usuarios ({users.length})</span>
          </button>
          <button
            id="admin-tab-exams"
            onClick={() => setActiveTab('exams')}
            className={`pb-3 px-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'exams'
                ? 'border-indigo-600 text-indigo-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>Evaluaciones Guardadas ({examResults.length})</span>
          </button>
          <button
            id="admin-tab-server"
            onClick={() => setActiveTab('server')}
            className={`pb-3 px-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'server'
                ? 'border-indigo-600 text-indigo-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Server className="w-4 h-4" />
            <span>Servidor y Conexión</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-white">
          {/* TAB 1: USERS */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              {/* Search & Role Filter */}
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    id="admin-search-users"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar por correo, nombre o centro..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>

                <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl text-xs font-semibold self-stretch sm:self-auto">
                  <button
                    onClick={() => setRoleFilter('all')}
                    className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                      roleFilter === 'all'
                        ? 'bg-white text-slate-900 shadow-xs font-bold'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Todos
                  </button>
                  <button
                    onClick={() => setRoleFilter('user')}
                    className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                      roleFilter === 'user'
                        ? 'bg-white text-slate-900 shadow-xs font-bold'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Alumnos
                  </button>
                  <button
                    onClick={() => setRoleFilter('teacher')}
                    className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                      roleFilter === 'teacher'
                        ? 'bg-white text-slate-900 shadow-xs font-bold'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Docentes
                  </button>
                  <button
                    onClick={() => setRoleFilter('admin')}
                    className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                      roleFilter === 'admin'
                        ? 'bg-white text-slate-900 shadow-xs font-bold'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Admin
                  </button>
                </div>
              </div>

              {/* Success Toast when changing roles */}
              {roleUpdateToast && (
                <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-bold flex items-center gap-2 animate-fadeIn shadow-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{roleUpdateToast}</span>
                </div>
              )}

              {/* Users Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Usuario</th>
                        <th className="py-3 px-4">Correo Electrónico</th>
                        <th className="py-3 px-4">Rol / Permisos (Editar)</th>
                        <th className="py-3 px-4">Centro / Especialidad</th>
                        <th className="py-3 px-4">Estado</th>
                        <th className="py-3 px-4">Fecha Alta</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-10 text-center text-slate-400">
                            {users.length === 0 ? (
                              <div className="space-y-2">
                                <p className="font-semibold text-slate-600">No se han encontrado usuarios registrados en PocketBase.</p>
                                <p className="text-xs text-slate-400">
                                  Crea una cuenta en &quot;Registrarse&quot; o comprueba que la colección <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">users</code> de PocketBase tenga permisos de lectura.
                                </p>
                              </div>
                            ) : (
                              'No hay usuarios que coincidan con el filtro de búsqueda.'
                            )}
                          </td>
                        </tr>
                      ) : (
                        filteredUsers.map((u) => {
                          const isSuperAdmin = authService.isAdminEmail(u.email) && u.email.toLowerCase() === 'maruyalexander1@gmail.com';
                          const isAdmin = isSuperAdmin || u.role === 'admin';
                          const isTeacher = u.role === 'teacher';
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
                                    <div className="w-7 h-7 rounded-full bg-violet-600 text-white flex items-center justify-center text-xs font-bold">
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
                                {isSuperAdmin ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 border border-amber-300 text-xs font-black shadow-2xs">
                                    <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
                                    <span>Superadmin</span>
                                  </span>
                                ) : (
                                  <div className="flex items-center gap-1.5">
                                    <select
                                      value={u.role || 'user'}
                                      disabled={updatingUserId === u.id}
                                      onChange={(e) =>
                                        handleRoleChange(
                                          u.id,
                                          e.target.value as 'user' | 'teacher' | 'admin',
                                          u.name
                                        )
                                      }
                                      className={`text-xs font-bold px-2 py-1 rounded-lg border transition-all cursor-pointer ${
                                        u.role === 'admin'
                                          ? 'bg-amber-100 border-amber-300 text-amber-900 hover:bg-amber-200'
                                          : u.role === 'teacher'
                                          ? 'bg-violet-100 border-violet-300 text-violet-900 hover:bg-violet-200'
                                          : 'bg-slate-100 border-slate-300 text-slate-800 hover:bg-slate-200'
                                      }`}
                                      title="Cambiar rol de este usuario"
                                    >
                                      <option value="user">👤 Estudiante</option>
                                      <option value="teacher">🎓 Profesor / Docente</option>
                                      <option value="admin">⭐ Administrador</option>
                                    </select>
                                    {updatingUserId === u.id && (
                                      <div className="w-3.5 h-3.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin shrink-0" />
                                    )}
                                  </div>
                                )}
                              </td>
                              <td className="py-3 px-4 text-xs text-slate-600">
                                {u.institution || u.department || u.subjectArea ? (
                                  <span>
                                    {u.institution || ''}
                                    {u.institution && (u.department || u.subjectArea) ? ' • ' : ''}
                                    <span className="text-violet-700 font-medium">{u.department || u.subjectArea || ''}</span>
                                  </span>
                                ) : (
                                  <span className="text-slate-400 italic">No especificado</span>
                                )}
                              </td>
                              <td className="py-3 px-4">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
                                  Activo
                                </span>
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
                Listado en tiempo real de todos los exámenes realizados y almacenados en la colección <code className="bg-slate-100 px-1 py-0.5 rounded font-mono font-bold text-violet-800">exams</code> de PocketBase.
              </p>

              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Título del Examen</th>
                        <th className="py-3 px-4">Usuario</th>
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
                          <td colSpan={7} className="py-8 text-center text-slate-400">
                            Aún no hay exámenes guardados en PocketBase. Realiza un examen en la app para registrar la primera evaluación.
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
                              <td className="py-3 px-4 text-xs font-mono text-slate-600">
                                {res.userEmail || res.userName || res.userId}
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

          {/* TAB 3: POCKETBASE SERVER INFORMATION */}
          {activeTab === 'server' && (
            <div className="space-y-5">
              {/* Server Status Box */}
              <div className="p-4 rounded-2xl bg-violet-50/70 border border-violet-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-violet-600 text-white flex items-center justify-center shrink-0">
                    <Laptop className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-violet-950">
                      Servidor PocketBase en tu Máquina Linux
                    </h4>
                    <p className="text-xs text-violet-800 mt-0.5">
                      URL del Túnel Cloudflare: <code className="bg-white px-1.5 py-0.5 rounded font-mono text-[11px] font-bold text-violet-900 border border-violet-200">{pbUrl || 'No configurada'}</code>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={handleTestServer}
                    disabled={pinging}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Wifi className="w-3.5 h-3.5" />
                    <span>{pinging ? 'Comprobando...' : 'Comprobar Ping'}</span>
                  </button>
                  {pbUrl && (
                    <a
                      href={`${pbUrl}/_/`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-xl text-xs font-semibold transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Abrir Panel /_/</span>
                    </a>
                  )}
                </div>
              </div>

              {serverPing && (
                <div
                  className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                    serverPing.ok
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}
                >
                  {serverPing.ok ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className="font-bold">{serverPing.ok ? '¡Servidor En Línea!' : 'Fallo de Conexión:'}</p>
                    <p className="mt-0.5">{serverPing.message}</p>
                  </div>
                </div>
              )}

              {/* Collections & Architecture */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Colección 1: &apos;users&apos; (Autenticación)
                  </h5>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Es la colección de tipo <strong>Auth</strong> nativa de PocketBase. Guarda los inicios de sesión, contraseñas cifradas y los siguientes campos personalizados:
                  </p>
                  <ul className="text-xs text-slate-700 space-y-1 list-disc list-inside">
                    <li><code className="font-mono text-[11px] bg-slate-200/70 px-1 rounded">name</code> (Texto)</li>
                    <li><code className="font-mono text-[11px] bg-slate-200/70 px-1 rounded">role</code> (Texto: &apos;user&apos; o &apos;teacher&apos;)</li>
                    <li><code className="font-mono text-[11px] bg-slate-200/70 px-1 rounded">institution</code> (Texto: Centro o IES)</li>
                    <li><code className="font-mono text-[11px] bg-slate-200/70 px-1 rounded">subjectArea</code> (Texto: Materia docente)</li>
                  </ul>
                  <div className="pt-1 text-[11px] text-emerald-700 font-semibold">
                    ✓ Regla API: <code className="bg-emerald-50 px-1 py-0.5 rounded border border-emerald-200 font-mono">List/Search Rule = &apos;&apos;</code> para que el panel pueda listar usuarios.
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Colección 2: &apos;exams&apos; (Evaluaciones)
                  </h5>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Colección de tipo <strong>Base</strong> donde se guardan automáticamente las notas de cada examen corregido por la IA:
                  </p>
                  <ul className="text-xs text-slate-700 space-y-1 list-disc list-inside">
                    <li><code className="font-mono text-[11px] bg-slate-200/70 px-1 rounded">examTitle</code>, <code className="font-mono text-[11px] bg-slate-200/70 px-1 rounded">subject</code>, <code className="font-mono text-[11px] bg-slate-200/70 px-1 rounded">topic</code></li>
                    <li><code className="font-mono text-[11px] bg-slate-200/70 px-1 rounded">totalScore</code>, <code className="font-mono text-[11px] bg-slate-200/70 px-1 rounded">maxPossibleScore</code>, <code className="font-mono text-[11px] bg-slate-200/70 px-1 rounded">percentage</code></li>
                    <li><code className="font-mono text-[11px] bg-slate-200/70 px-1 rounded">userId</code>, <code className="font-mono text-[11px] bg-slate-200/70 px-1 rounded">userEmail</code></li>
                    <li><code className="font-mono text-[11px] bg-slate-200/70 px-1 rounded">examData</code> (JSON) y <code className="font-mono text-[11px] bg-slate-200/70 px-1 rounded">feedbackByQuestion</code> (JSON)</li>
                  </ul>
                </div>
              </div>

              {/* Startup Reference */}
              <div className="p-4 bg-slate-900 rounded-2xl text-slate-100 font-mono text-xs space-y-2">
                <p className="text-slate-400 font-sans font-bold">
                  Comandos para mantener activo PocketBase en tu Linux:
                </p>
                <div className="space-y-1">
                  <p className="text-cyan-300"># 1. Iniciar PocketBase:</p>
                  <p className="text-white">./pocketbase serve --http=&quot;0.0.0.0:8090&quot;</p>
                  <p className="text-cyan-300 mt-2"># 2. Iniciar el túnel de Cloudflare en otra terminal:</p>
                  <p className="text-emerald-300">cloudflared tunnel --url http://localhost:8090</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
