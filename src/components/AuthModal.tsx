import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Database,
  Lock,
  Mail,
  Sparkles,
  User as UserIcon,
  X,
} from 'lucide-react';
import { authService } from '../services/authService';
import { isSupabaseConfigured } from '../services/supabase';
import { User } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: User) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [tab, setTab] = useState<'login' | 'register'>('login');

  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const configured = isSupabaseConfigured();

  // Google Sign-In with Supabase
  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);
      await authService.signInWithGoogle();
      // Supabase OAuth redirects or updates state
    } catch (err: any) {
      setError(err.message || 'Error al conectar con Google a través de Supabase.');
      setLoading(false);
    }
  };

  // Register with Supabase
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
      const res = await authService.registerWithEmail(name, email, password);
      if (res.sessionActive) {
        onSuccess(res.user);
        onClose();
      } else {
        setSuccessMsg(
          res.message ||
            '¡Cuenta registrada con éxito! Si tienes activada la confirmación de correo en Supabase, revisa tu buzón para activarla.'
        );
      }
    } catch (err: any) {
      setError(err.message || 'Error al registrar tu cuenta en Supabase.');
    } finally {
      setLoading(false);
    }
  };

  // Login with Supabase
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
      setError(err.message || 'Error al iniciar sesión en Supabase.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div
        id="auth-modal-card"
        className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden relative"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 sm:p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 mb-3 border border-emerald-100 shadow-xs">
              <Lock className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">
              {tab === 'login' ? 'Iniciar Sesión' : 'Crear tu Cuenta'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              {tab === 'login'
                ? 'Accede para guardar y sincronizar tus exámenes con Supabase'
                : 'Regístrate para guardar tu historial de exámenes en Supabase'}
            </p>
          </div>

          {!configured && (
            <div className="mb-5 p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs">
              <div className="flex items-center gap-1.5 font-bold mb-1 text-amber-950">
                <Database className="w-4 h-4 text-amber-700" />
                <span>Configuración de Supabase requerida</span>
              </div>
              <p className="leading-relaxed">
                Define las variables de entorno <code className="bg-amber-100 px-1 py-0.5 rounded font-mono font-bold">VITE_SUPABASE_URL</code> y <code className="bg-amber-100 px-1 py-0.5 rounded font-mono font-bold">VITE_SUPABASE_ANON_KEY</code> en los ajustes del proyecto para conectar tu proyecto de Supabase.
              </p>
            </div>
          )}

          {/* Google Sign-In Button */}
          <button
            id="btn-auth-google"
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-slate-200 rounded-xl font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm active:scale-[0.99] disabled:opacity-60"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continuar con Google</span>
          </button>

          {/* Divider */}
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-3 text-slate-400 font-medium tracking-wider">
                o con correo electrónico
              </span>
            </div>
          </div>

          {/* Switch Tabs */}
          <div className="grid grid-cols-2 p-1 mb-5 bg-slate-100 rounded-xl text-sm font-semibold">
            <button
              type="button"
              onClick={() => {
                setTab('login');
                setError(null);
                setSuccessMsg(null);
              }}
              className={`py-2 rounded-lg transition-all ${
                tab === 'login'
                  ? 'bg-white text-emerald-700 shadow-sm'
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
              className={`py-2 rounded-lg transition-all ${
                tab === 'register'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Registrarse
            </button>
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
            className="space-y-4"
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
                    placeholder="Ej. Alexander Martín"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
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
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
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
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            <button
              id="btn-auth-submit"
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-semibold rounded-xl text-sm shadow-md shadow-emerald-200 transition-all disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : tab === 'login' ? (
                'Iniciar Sesión con Supabase'
              ) : (
                'Crear Cuenta en Supabase'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
