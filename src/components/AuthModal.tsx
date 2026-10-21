import React, { useState } from 'react';
import {
  AlertCircle,
  Briefcase,
  CheckCircle2,
  GraduationCap,
  Lock,
  Mail,
  Server,
  Sparkles,
  User as UserIcon,
  X,
} from 'lucide-react';
import { authService } from '../services/authService';
import {
  getPocketBaseUrl,
  setPocketBaseUrl,
  isPocketBaseConfigured,
  testPocketBase,
} from '../services/pocketbase';
import { User } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: User) => void;
  onOpenDbSettings?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onOpenDbSettings,
}) => {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [selectedRole, setSelectedRole] = useState<'user' | 'teacher'>('user');

  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [institution, setInstitution] = useState('');
  const [subjectArea, setSubjectArea] = useState('');

  // PocketBase URL inline configuration if needed
  const [serverUrlInput, setServerUrlInput] = useState(getPocketBaseUrl());
  const [showServerConfig, setShowServerConfig] = useState(!isPocketBaseConfigured());

  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const isServerConfigured = isPocketBaseConfigured();

  // Save server URL
  const handleSaveServerUrl = async () => {
    if (!serverUrlInput.trim()) {
      setError('Por favor, introduce la URL de tu túnel de Cloudflare hacia PocketBase.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const ping = await testPocketBase(serverUrlInput.trim());
      if (ping.ok) {
        setPocketBaseUrl(serverUrlInput.trim());
        setShowServerConfig(false);
        setSuccessMsg('¡Servidor PocketBase verificado y conectado!');
        setTimeout(() => setSuccessMsg(null), 3000);
      } else {
        setError(ping.message || 'No se pudo conectar con PocketBase.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Register with PocketBase
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Por favor, escribe tu nombre completo.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Por favor, introduce un correo electrónico válido.');
      return;
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccessMsg(null);
      const res = await authService.registerWithEmail(
        name,
        email,
        password,
        selectedRole,
        institution,
        subjectArea
      );
      if (res.sessionActive) {
        onSuccess(res.user);
        onClose();
      } else {
        setSuccessMsg(res.message || '¡Cuenta registrada con éxito en PocketBase!');
      }
    } catch (err: any) {
      setError(err.message || 'Error al crear la cuenta en PocketBase.');
    } finally {
      setLoading(false);
    }
  };

  // Login with PocketBase
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Introduce tu correo electrónico.');
      return;
    }
    if (!password) {
      setError('Introduce tu contraseña.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccessMsg(null);
      const user = await authService.signInWithEmail(email, password);
      onSuccess(user);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión en PocketBase.');
    } finally {
      setLoading(false);
    }
  };

  // Quick Demo Access
  const handleQuickDemo = (role: 'user' | 'teacher') => {
    const demoUser = authService.signInAsGuest(
      role,
      role === 'teacher' ? 'Prof. Martínez' : 'Estudiante Demo'
    );
    onSuccess(demoUser);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div
        id="auth-modal-card"
        className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden relative max-h-[90vh] flex flex-col"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors z-10 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 sm:p-8 overflow-y-auto">
          {/* Header */}
          <div className="text-center mb-5">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 mb-3 border border-indigo-100 shadow-xs">
              <GraduationCap className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              {tab === 'login' ? 'Iniciar Sesión' : 'Crear tu Cuenta'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              {tab === 'login'
                ? 'Accede con tu cuenta almacenada en PocketBase'
                : 'Regístrate para guardar tus exámenes en tu base de datos'}
            </p>
          </div>

          {/* PocketBase Server Indicator / Inline Config */}
          <div className="mb-4">
            {isServerConfigured && !showServerConfig ? (
              <div className="flex items-center justify-between p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs text-emerald-900">
                <div className="flex items-center gap-1.5 font-medium truncate">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <span className="font-bold">PocketBase:</span>
                  <span className="truncate font-mono text-[11px] text-emerald-800">
                    {getPocketBaseUrl().replace('https://', '')}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowServerConfig(true)}
                  className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 underline shrink-0 cursor-pointer ml-2"
                >
                  Cambiar
                </button>
              </div>
            ) : (
              <div className="p-3 bg-violet-50/80 border border-violet-200 rounded-xl text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-violet-950 flex items-center gap-1">
                    <Server className="w-3.5 h-3.5 text-violet-600" />
                    <span>URL de tu PocketBase:</span>
                  </span>
                  {isServerConfigured && (
                    <button
                      type="button"
                      onClick={() => setShowServerConfig(false)}
                      className="text-[11px] text-slate-500 hover:text-slate-800 cursor-pointer"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={serverUrlInput}
                    onChange={(e) => setServerUrlInput(e.target.value)}
                    placeholder="https://xxxx.trycloudflare.com"
                    className="flex-1 px-3 py-1.5 bg-white border border-violet-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                  <button
                    type="button"
                    onClick={handleSaveServerUrl}
                    disabled={loading}
                    className="px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-bold shrink-0 cursor-pointer"
                  >
                    Guardar
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Switch Tabs */}
          <div className="grid grid-cols-2 p-1 mb-4 bg-slate-100 rounded-xl text-xs sm:text-sm font-semibold">
            <button
              type="button"
              onClick={() => {
                setTab('login');
                setError(null);
                setSuccessMsg(null);
              }}
              className={`py-2 rounded-lg transition-all cursor-pointer ${
                tab === 'login'
                  ? 'bg-white text-indigo-700 shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Iniciar Sesión
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('register');
                setError(null);
                setSuccessMsg(null);
              }}
              className={`py-2 rounded-lg transition-all cursor-pointer ${
                tab === 'register'
                  ? 'bg-white text-indigo-700 shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Registrarse
            </button>
          </div>

          {/* Role selector (Alumno vs Profesor) */}
          <div className="mb-4">
            <span className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
              Tipo de Perfil:
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSelectedRole('user')}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                  selectedRole === 'user'
                    ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 shadow-xs ring-1 ring-indigo-500'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <GraduationCap className="w-4 h-4 text-indigo-600" />
                <span>Estudiante</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedRole('teacher')}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                  selectedRole === 'teacher'
                    ? 'border-violet-600 bg-violet-50/70 text-violet-900 shadow-xs ring-1 ring-violet-500'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Briefcase className="w-4 h-4 text-violet-600" />
                <span className="font-bold">Profesor / Docente</span>
              </button>
            </div>
          </div>

          {/* Status Messages */}
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Form */}
          <form
            onSubmit={tab === 'login' ? handleLoginSubmit : handleRegisterSubmit}
            className="space-y-3.5"
          >
            {tab === 'register' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nombre completo
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    id="input-auth-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={selectedRole === 'teacher' ? 'Ej. Prof. Carmen Delgado' : 'Ej. Alexander Martín'}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Correo electrónico
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                <input
                  id="input-auth-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ejemplo@correo.com"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                <input
                  id="input-auth-password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            {tab === 'register' && selectedRole === 'teacher' && (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Centro / IES (opcional)
                  </label>
                  <input
                    type="text"
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value)}
                    placeholder="Ej. IES Cervantes"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-violet-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Especialidad (opcional)
                  </label>
                  <input
                    type="text"
                    value={subjectArea}
                    onChange={(e) => setSubjectArea(e.target.value)}
                    placeholder="Ej. Matemáticas"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-violet-500 focus:bg-white"
                  />
                </div>
              </div>
            )}

            <button
              id="btn-auth-submit"
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-bold rounded-xl text-sm shadow-md shadow-indigo-200 transition-all disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : tab === 'login' ? (
                'Iniciar Sesión en PocketBase'
              ) : (
                selectedRole === 'teacher' ? 'Crear Cuenta Docente en PocketBase' : 'Crear Cuenta en PocketBase'
              )}
            </button>
          </form>

          {/* Quick Demo Access Bar */}
          <div className="mt-5 pt-4 border-t border-slate-100 text-center">
            <p className="text-[11px] text-slate-500 mb-2 font-medium">
              ¿Quieres probar sin registrarte todavía?
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickDemo('teacher')}
                className="py-1.5 px-2 bg-violet-50 hover:bg-violet-100 text-violet-800 border border-violet-200/80 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                title="Accede instantáneamente con perfil de profesor"
              >
                <Briefcase className="w-3.5 h-3.5 text-violet-600" />
                <span>Entrar como Profesor (Demo)</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemo('user')}
                className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                title="Accede instantáneamente con perfil de alumno"
              >
                <GraduationCap className="w-3.5 h-3.5 text-slate-600" />
                <span>Entrar como Alumno (Demo)</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
