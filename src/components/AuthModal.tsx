import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  KeyRound,
  Lock,
  Mail,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  User as UserIcon,
  X,
} from 'lucide-react';
import { authService } from '../services/authService';
import { User } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: User) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [step, setStep] = useState<'form' | 'verify_code'>('form');

  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [devCodeReceived, setDevCodeReceived] = useState<string | null>(null);

  const [resendCooldown, setResendCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Countdown timer for resending code
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  if (!isOpen) return null;

  // Real Google Sign-In with popup
  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);
      const user = await authService.signInWithGoogle();
      onSuccess(user);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al conectar con Google.');
    } finally {
      setLoading(false);
    }
  };

  // Step 1: Request verification code for registration
  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Por favor, escribe tu nombre completo.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Por favor, escribe un correo electrónico válido.');
      return;
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await authService.requestVerificationCode(email, name);
      if (res.code) {
        setDevCodeReceived(res.code);
      }
      setSuccessMsg(`Código de verificación enviado a ${email.trim()}`);
      setStep('verify_code');
      setResendCooldown(60);
    } catch (err: any) {
      setError(err.message || 'Error al enviar código.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify code and finish registration
  const handleConfirmCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (verificationCode.trim().length !== 6) {
      setError('El código debe tener exactamente 6 dígitos.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const user = await authService.verifyCodeAndRegister(name, email, verificationCode.trim());
      onSuccess(user);
      onClose();
    } catch (err: any) {
      setError(err.message || 'El código introducido no es válido.');
    } finally {
      setLoading(false);
    }
  };

  // Resend verification code
  const handleResendCode = async () => {
    if (resendCooldown > 0) return;
    try {
      setLoading(true);
      setError(null);
      const res = await authService.requestVerificationCode(email, name);
      if (res.code) {
        setDevCodeReceived(res.code);
      }
      setSuccessMsg('Se ha generado un nuevo código de verificación.');
      setResendCooldown(60);
    } catch (err: any) {
      setError(err.message || 'Error al reenviar código.');
    } finally {
      setLoading(false);
    }
  };

  // Login handler
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      const user = await authService.signInWithEmail(email);
      onSuccess(user);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión.');
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
          {/* STEP 2: VERIFY 6-DIGIT CODE */}
          {step === 'verify_code' ? (
            <div>
              <button
                type="button"
                onClick={() => {
                  setStep('form');
                  setError(null);
                }}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-4 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Volver a datos de registro
              </button>

              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 mb-3 border border-indigo-100">
                  <KeyRound className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-bold text-slate-900">
                  Código de Verificación
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Hemos generado un código de 6 dígitos para verificar tu correo:
                </p>
                <p className="text-xs font-semibold text-indigo-600 mt-0.5">
                  {email}
                </p>
              </div>

              {/* Dev preview banner showing code */}
              {devCodeReceived && (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Código de verificación para pruebas:</span>
                    <button
                      type="button"
                      onClick={() => setVerificationCode(devCodeReceived)}
                      className="text-amber-900 underline font-bold ml-2"
                    >
                      Autocompletar
                    </button>
                  </div>
                  <div className="text-center font-mono text-lg font-extrabold tracking-widest mt-1 text-amber-900">
                    {devCodeReceived}
                  </div>
                </div>
              )}

              {error && (
                <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleConfirmCode} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 text-center">
                    Introduce los 6 dígitos recibidos
                  </label>
                  <input
                    id="input-verification-code"
                    type="text"
                    required
                    maxLength={6}
                    autoFocus
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="Ej. 123456"
                    className="w-full text-center tracking-[0.4em] font-mono text-xl py-3 px-4 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-bold text-slate-900"
                  />
                </div>

                <button
                  id="btn-confirm-code"
                  type="submit"
                  disabled={loading || verificationCode.length !== 6}
                  className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-semibold rounded-xl text-sm shadow-md shadow-indigo-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Verificar y Activar Cuenta</span>
                    </>
                  )}
                </button>
              </form>

              <div className="mt-4 pt-4 border-t border-slate-100 text-center">
                <button
                  type="button"
                  disabled={resendCooldown > 0 || loading}
                  onClick={handleResendCode}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600 disabled:text-slate-400 transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  {resendCooldown > 0
                    ? `Reenviar código en ${resendCooldown}s`
                    : '¿No te ha llegado? Reenviar código'}
                </button>
              </div>
            </div>
          ) : (
            /* STEP 1: LOGIN OR REGISTER FORM */
            <div>
              {/* Header */}
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 mb-3 border border-indigo-100">
                  <Lock className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">
                  {tab === 'login' ? 'Iniciar Sesión' : 'Crear tu Cuenta'}
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Accede a tus exámenes, calificaciones y base de datos
                </p>
              </div>

              {/* Real Google Sign-In Button */}
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
                  }}
                  className={`py-2 rounded-lg transition-all ${
                    tab === 'login'
                      ? 'bg-white text-indigo-600 shadow-sm'
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
                  }}
                  className={`py-2 rounded-lg transition-all ${
                    tab === 'register'
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Registrarse
                </button>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Form */}
              <form
                onSubmit={tab === 'login' ? handleLoginSubmit : handleRequestCode}
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

                <button
                  id="btn-auth-submit"
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-semibold rounded-xl text-sm shadow-md shadow-indigo-200 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : tab === 'login' ? (
                    'Iniciar Sesión'
                  ) : (
                    'Enviar Código de Verificación'
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
