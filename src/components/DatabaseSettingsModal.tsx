import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Cloud,
  Copy,
  Database,
  ExternalLink,
  HelpCircle,
  Laptop,
  Play,
  RefreshCw,
  Server,
  ShieldCheck,
  Sparkles,
  Terminal,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import { dbConfigService, DatabaseTarget, DbConfig } from '../services/dbConfigService';
import { refreshSupabaseClient } from '../services/supabase';

interface DatabaseSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigSaved?: () => void;
}

export const DatabaseSettingsModal: React.FC<DatabaseSettingsModalProps> = ({
  isOpen,
  onClose,
  onConfigSaved,
}) => {
  const [config, setConfig] = useState<DbConfig>(() => dbConfigService.getConfig());
  const [activeTab, setActiveTab] = useState<DatabaseTarget>('firebase');

  // Supabase fields
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState('');

  // Homelab fields
  const [homelabUrl, setHomelabUrl] = useState('');
  const [autoFallback, setAutoFallback] = useState(true);

  // Testing states
  const [testingSupabase, setTestingSupabase] = useState(false);
  const [supabaseTestResult, setSupabaseTestResult] = useState<{
    ok: boolean;
    message: string;
    latencyMs?: number;
  } | null>(null);

  const [testingHomelab, setTestingHomelab] = useState(false);
  const [homelabTestResult, setHomelabTestResult] = useState<{
    ok: boolean;
    message: string;
    latencyMs?: number;
  } | null>(null);

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const current = dbConfigService.getConfig();
      setConfig(current);
      setActiveTab(current.activeTarget);
      setSupabaseUrl(current.supabaseUrl);
      setSupabaseAnonKey(current.supabaseAnonKey);
      setHomelabUrl(current.homelabUrl);
      setAutoFallback(current.autoFallback);
      setSupabaseTestResult(null);
      setHomelabTestResult(null);
      setSavedSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle Save
  const handleSave = (targetToSet?: DatabaseTarget) => {
    const finalTarget = targetToSet || activeTab;
    const updated = dbConfigService.saveConfig({
      activeTarget: finalTarget,
      supabaseUrl: supabaseUrl.trim(),
      supabaseAnonKey: supabaseAnonKey.trim(),
      homelabUrl: homelabUrl.trim(),
      autoFallback,
    });
    setConfig(updated);
    refreshSupabaseClient();
    setSavedSuccess(true);
    if (onConfigSaved) onConfigSaved();
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  // Test Supabase
  const handleTestSupabase = async () => {
    setTestingSupabase(true);
    setSupabaseTestResult(null);
    try {
      const result = await dbConfigService.testSupabase(supabaseUrl, supabaseAnonKey);
      setSupabaseTestResult(result);
      if (result.ok) {
        handleSave('supabase');
      }
    } finally {
      setTestingSupabase(false);
    }
  };

  // Test Homelab
  const handleTestHomelab = async () => {
    setTestingHomelab(true);
    setHomelabTestResult(null);
    try {
      const result = await dbConfigService.testHomelab(homelabUrl);
      setHomelabTestResult(result);
      if (result.ok) {
        handleSave('homelab');
      }
    } finally {
      setTestingHomelab(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fadeIn">
      <div
        id="db-settings-modal"
        className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-100 overflow-hidden relative max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Ajustes de Base de Datos y Servidor
              </h2>
              <p className="text-xs text-slate-500">
                Elige dónde guardar los usuarios y exámenes: Cloud, Supabase o tu propio Home Lab
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {savedSuccess && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>¡Configuración de base de datos guardada y activada correctamente!</span>
            </div>
          )}

          {/* Target Tabs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Firebase Cloud */}
            <button
              type="button"
              onClick={() => {
                setActiveTab('firebase');
                handleSave('firebase');
              }}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                activeTab === 'firebase'
                  ? 'border-indigo-600 bg-indigo-50/70 shadow-sm ring-1 ring-indigo-500'
                  : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
                    <Cloud className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                    Siempre Online
                  </span>
                </div>
                <h4 className="font-bold text-sm text-slate-900">Firebase Cloud</h4>
                <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                  Base de datos en Google Cloud. Activa 24/7 sin servidores que mantener.
                </p>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-xs font-bold text-indigo-700">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>{config.activeTarget === 'firebase' ? 'Activo Actualmente' : 'Seleccionar'}</span>
              </div>
            </button>

            {/* Supabase Cloud */}
            <button
              type="button"
              onClick={() => setActiveTab('supabase')}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                activeTab === 'supabase'
                  ? 'border-emerald-600 bg-emerald-50/70 shadow-sm ring-1 ring-emerald-500'
                  : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                    ⚡
                  </div>
                  <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                    PostgreSQL
                  </span>
                </div>
                <h4 className="font-bold text-sm text-slate-900">Supabase Cloud</h4>
                <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                  Conexión directa a tu proyecto de Supabase (requiere URL y Anon Key).
                </p>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                <span>{config.activeTarget === 'supabase' ? 'Activo Actualmente' : 'Configurar'}</span>
              </div>
            </button>

            {/* Home Lab / MacBook */}
            <button
              type="button"
              onClick={() => setActiveTab('homelab')}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                activeTab === 'homelab'
                  ? 'border-violet-600 bg-violet-50/70 shadow-sm ring-1 ring-violet-500'
                  : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-xl bg-violet-700 text-white flex items-center justify-center">
                    <Laptop className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-violet-100 text-violet-800">
                    Home Lab
                  </span>
                </div>
                <h4 className="font-bold text-sm text-slate-900">MacBook Ubuntu</h4>
                <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                  Tu servidor local casero con Ubuntu Server expuesto mediante túnel HTTPS.
                </p>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-xs font-bold text-violet-700">
                <span>{config.activeTarget === 'homelab' ? 'Activo Actualmente' : 'Configurar'}</span>
              </div>
            </button>
          </div>

          {/* TAB 1: FIREBASE CLOUD DETAILS */}
          {activeTab === 'firebase' && (
            <div className="p-5 rounded-2xl bg-indigo-50/40 border border-indigo-200/80 space-y-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-sm text-slate-900">
                  Firebase Firestore & Authentication (Recomendado y Operativo)
                </h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Esta es la opción más estable y libre de problemas. La base de datos está aprovisionada en la infraestructura oficial de Google Cloud, por lo que:
              </p>
              <ul className="text-xs text-slate-700 space-y-1.5 list-disc list-inside pl-1">
                <li>
                  <strong>No depende de que tu ordenador esté encendido</strong>: La app sigue funcionando 24/7 aunque apagues el MacBook o salgas de casa.
                </li>
                <li>
                  <strong>No se pausa nunca por inactividad</strong> (a diferencia de las cuentas gratuitas de Supabase).
                </li>
                <li>
                  <strong>Soporta Google Sign-In</strong> y registro por correo/contraseña sin errores de red.
                </li>
                <li>
                  <strong>Base de datos activa:</strong> <code className="bg-white px-1.5 py-0.5 rounded border border-indigo-200 text-indigo-900 font-mono text-[11px]">ai-studio-generadordeexmen-08bbcb78-814d-4fde-8d8d-a195d4833fe7</code>
                </li>
              </ul>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => handleSave('firebase')}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  Confirmar Firebase como Base Principal
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: SUPABASE CLOUD DETAILS */}
          {activeTab === 'supabase' && (
            <div className="p-5 rounded-2xl bg-emerald-50/40 border border-emerald-200/80 space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-lg">⚡</span>
                <h3 className="font-bold text-sm text-slate-900">
                  Configurar tu Proyecto de Supabase
                </h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Si prefieres utilizar Supabase, introduce las credenciales de tu proyecto. Las encontrarás en tu panel de Supabase en <em>Project Settings &gt; API</em>:
              </p>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Project URL de Supabase
                  </label>
                  <input
                    type="url"
                    value={supabaseUrl}
                    onChange={(e) => setSupabaseUrl(e.target.value)}
                    placeholder="https://xyzabcdefghijklm.supabase.co"
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Project API Key (Anon / Public)
                  </label>
                  <input
                    type="password"
                    value={supabaseAnonKey}
                    onChange={(e) => setSupabaseAnonKey(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
              </div>

              {/* Test Result Message */}
              {supabaseTestResult && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                    supabaseTestResult.ok
                      ? 'bg-emerald-100/70 border-emerald-300 text-emerald-900'
                      : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}
                >
                  {supabaseTestResult.ok ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className="font-bold">{supabaseTestResult.ok ? '¡Conexión Correcta!' : 'Fallo de conexión:'}</p>
                    <p className="mt-0.5">{supabaseTestResult.message}</p>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2 pt-2">
                <button
                  type="button"
                  disabled={testingSupabase || !supabaseUrl || !supabaseAnonKey}
                  onClick={handleTestSupabase}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {testingSupabase ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Play className="w-3.5 h-3.5" />
                  )}
                  <span>Probar Conexión y Activar</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSave('supabase')}
                  className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Guardar Cambios
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: HOMELAB UBUNTU SERVER (MACBOOK) */}
          {activeTab === 'homelab' && (
            <div className="p-5 rounded-2xl bg-violet-50/40 border border-violet-200/80 space-y-4">
              <div className="flex items-center gap-2">
                <Laptop className="w-5 h-5 text-violet-700" />
                <h3 className="font-bold text-sm text-slate-900">
                  Conectar a tu Home Lab (Ubuntu Server en MacBook)
                </h3>
              </div>

              {/* Explicación de la arquitectura de red */}
              <div className="p-3 bg-white rounded-xl border border-violet-100 text-xs text-slate-700 space-y-2">
                <p className="font-bold text-violet-950 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-violet-600 shrink-0" />
                  <span>¿Cómo conectar la web a tu MacBook sin abrir puertos en el router?</span>
                </p>
                <p className="leading-relaxed">
                  Como la web se ejecuta en la nube en HTTPS, los navegadores no pueden conectar directamente a una IP local como <code className="bg-slate-100 px-1 py-0.5 rounded text-[11px] font-mono">192.168.x.x</code> ni <code className="bg-slate-100 px-1 py-0.5 rounded text-[11px] font-mono">localhost</code>.
                  Para que tu Ubuntu Server del MacBook sea accesible de forma segura y permanente desde la web, se utiliza un <strong>túnel HTTPS gratuito con Cloudflare Tunnel</strong>.
                </p>
              </div>

              {/* Formulario URL de Home Lab */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    URL de tu Servidor Ubuntu (con Túnel HTTPS)
                  </label>
                  <input
                    type="url"
                    value={homelabUrl}
                    onChange={(e) => setHomelabUrl(e.target.value)}
                    placeholder="https://mi-macbook.trycloudflare.com  o  https://api.tu-dominio.com"
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-violet-500 font-mono"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    id="chk-auto-fallback"
                    type="checkbox"
                    checked={autoFallback}
                    onChange={(e) => setAutoFallback(e.target.checked)}
                    className="w-4 h-4 text-violet-600 rounded border-slate-300 focus:ring-violet-500 cursor-pointer"
                  />
                  <label htmlFor="chk-auto-fallback" className="text-xs font-semibold text-slate-800 cursor-pointer">
                    Activar Respaldo Automático en la Nube (si el MacBook se apaga o se duerme, usar Firebase Cloud para no perder servicio)
                  </label>
                </div>
              </div>

              {/* Test Result Message */}
              {homelabTestResult && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                    homelabTestResult.ok
                      ? 'bg-emerald-100/70 border-emerald-300 text-emerald-900'
                      : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}
                >
                  {homelabTestResult.ok ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className="font-bold">{homelabTestResult.ok ? '¡MacBook Conectado!' : 'No se pudo contactar con tu MacBook:'}</p>
                    <p className="mt-0.5">{homelabTestResult.message}</p>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={testingHomelab || !homelabUrl}
                  onClick={handleTestHomelab}
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {testingHomelab ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Wifi className="w-3.5 h-3.5" />
                  )}
                  <span>Comprobar Ping a mi MacBook</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSave('homelab')}
                  className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Guardar Ajustes
                </button>
              </div>

              {/* Guía para Cualquier Distribución Linux (Escritorio o Servidor) */}
              <div className="mt-4 pt-3 border-t border-violet-200/80">
                <span className="block text-[11px] font-black uppercase tracking-wider text-violet-900 mb-2">
                  Guía: Conectar cualquier distribución Linux (Ubuntu, Mint, Debian, Arch, Nexora OS...)
                </span>
                <div className="p-3 bg-slate-900 rounded-xl text-slate-100 font-mono text-[11px] space-y-2">
                  <p className="text-slate-400"># 1. Instalar Cloudflare Tunnel según tu gestor de paquetes:</p>
                  <p className="text-cyan-300"># En Ubuntu / Debian / Mint / Nexora OS:</p>
                  <p className="text-white">sudo apt update && sudo apt install -y cloudflared</p>
                  <p className="text-cyan-300 mt-1"># En Arch / Manjaro: <span className="text-white">sudo pacman -S cloudflared</span></p>
                  <p className="text-cyan-300 mt-1"># En Fedora: <span className="text-white">sudo dnf install -y cloudflared</span></p>

                  <p className="text-slate-400 mt-3"># 2. Iniciar túnel seguro hacia el puerto de tu base de datos o API (ej: 8080 o 5432):</p>
                  <p className="text-emerald-300">cloudflared tunnel --url http://localhost:8080</p>
                  <p className="text-slate-400 text-[10px] italic">
                    (Copia la URL pública tipo https://xxxx.trycloudflare.com que aparece en pantalla y pégala arriba).
                  </p>

                  <p className="text-amber-400 mt-3 font-sans font-bold text-[11px]">
                    ⚡ Consejo importante para Linux de escritorio en portátil:
                  </p>
                  <p className="text-slate-300 font-sans text-[11px] leading-relaxed">
                    Para que no se apague al bajar la pantalla: en <em>Ajustes &gt; Energía</em> desmarca &quot;Suspender al cerrar la tapa&quot; (o en <code className="text-amber-300 font-mono">/etc/systemd/logind.conf</code> añade <code className="text-amber-300 font-mono">HandleLidSwitch=ignore</code>).
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Comparativa Resumen */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600 space-y-2">
            <p className="font-bold text-slate-800">💡 ¿Cuál es la mejor opción para ahorrarte problemas?</p>
            <p>
              1. <strong>Para el día a día y que nunca falle</strong>: Mantener <strong>Firebase Cloud</strong> activo como base de datos principal o como respaldo. Funciona siempre, no requiere tener el portátil encendido y es gratis.
            </p>
            <p>
              2. <strong>Para tu Home Lab en el MacBook</strong>: Es un proyecto excelente para aprender y tener soberanía de tus datos. Al configurar el túnel Cloudflare y marcar el <em>respaldo automático</em>, disfrutas de tu servidor propio en casa con la tranquilidad de que si cierras el portátil, la app sigue funcionando.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500">Destino activo:</span>
            <span className="font-bold text-indigo-700 capitalize">{config.activeTarget}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
