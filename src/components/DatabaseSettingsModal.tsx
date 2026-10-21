import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  ExternalLink,
  Laptop,
  RefreshCw,
  Server,
  Terminal,
  Wifi,
  X,
} from 'lucide-react';
import {
  getPocketBaseUrl,
  setPocketBaseUrl,
  testPocketBase,
} from '../services/pocketbase';

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
  const [serverUrl, setServerUrl] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    message: string;
    latencyMs?: number;
    status?: number;
  } | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setServerUrl(getPocketBaseUrl());
      setTestResult(null);
      setSavedSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Save PocketBase URL
  const handleSave = () => {
    const cleaned = serverUrl.trim();
    setPocketBaseUrl(cleaned);
    setSavedSuccess(true);
    if (onConfigSaved) onConfigSaved();
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  // Test Ping to PocketBase
  const handleTest = async () => {
    if (!serverUrl.trim()) {
      setTestResult({
        ok: false,
        message: 'Por favor, introduce la URL del túnel de PocketBase antes de probar.',
      });
      return;
    }

    setTesting(true);
    setTestResult(null);
    try {
      const result = await testPocketBase(serverUrl.trim());
      setTestResult(result);
      if (result.ok) {
        handleSave();
      }
    } finally {
      setTesting(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(label);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fadeIn">
      <div
        id="pocketbase-settings-modal"
        className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-100 overflow-hidden relative max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-violet-100 text-violet-700 flex items-center justify-center font-bold">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Ajustes del Servidor PocketBase
              </h2>
              <p className="text-xs text-slate-500">
                Conexión a tu base de datos Linux en el MacBook mediante túnel HTTPS
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
        <div className="p-6 overflow-y-auto space-y-5">
          {savedSuccess && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>¡URL de PocketBase guardada y activada correctamente!</span>
            </div>
          )}

          {/* Active Server Card */}
          <div className="p-5 rounded-2xl bg-violet-50/50 border border-violet-200 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Laptop className="w-5 h-5 text-violet-700" />
                <h3 className="font-bold text-sm text-slate-900">
                  URL del Túnel Cloudflare a PocketBase
                </h3>
              </div>
              {serverUrl && (
                <a
                  href={`${serverUrl.replace(/\/$/, '')}/_/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-violet-700 hover:text-violet-900 bg-white px-2.5 py-1 rounded-lg border border-violet-200 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Abrir Web Admin (/_/)</span>
                </a>
              )}
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Introduce el enlace HTTPS generado por <code>cloudflared</code> en tu Linux (o tu dominio propio). Todos los inicios de sesión, registros y notas de exámenes se sincronizarán directamente con tu base de datos.
            </p>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                URL Pública del Túnel (HTTPS)
              </label>
              <div className="flex gap-2">
                <input
                  id="input-pocketbase-url"
                  type="url"
                  value={serverUrl}
                  onChange={(e) => setServerUrl(e.target.value)}
                  placeholder="https://xxxx-xxxx.trycloudflare.com"
                  className="flex-1 px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0"
                >
                  Guardar
                </button>
              </div>
            </div>

            {/* Test result message */}
            {testResult && (
              <div
                className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                  testResult.ok
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}
              >
                {testResult.ok ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div className="space-y-1">
                  <p className="font-bold">
                    {testResult.ok ? '¡Conexión Exitosa con PocketBase!' : 'No se pudo contactar con PocketBase:'}
                  </p>
                  <p>{testResult.message}</p>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                disabled={testing || !serverUrl.trim()}
                onClick={handleTest}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {testing ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Wifi className="w-3.5 h-3.5" />
                )}
                <span>Comprobar Ping y Guardar</span>
              </button>
            </div>
          </div>

          {/* Quick Guide to Run PocketBase */}
          <div className="p-4 bg-slate-900 rounded-2xl text-slate-100 font-mono text-xs space-y-3">
            <div className="flex items-center justify-between text-slate-300 font-sans font-bold">
              <div className="flex items-center gap-1.5">
                <Terminal className="w-4 h-4 text-cyan-400" />
                <span>Cómo arrancar PocketBase y el túnel en tu Linux:</span>
              </div>
            </div>

            <div className="space-y-2">
              <div>
                <p className="text-slate-400 text-[11px]"># 1. En la primera terminal (iniciar PocketBase en puerto 8090):</p>
                <div className="flex items-center justify-between bg-slate-950 p-2 rounded-lg mt-1 border border-slate-800">
                  <code className="text-cyan-300 text-[11px]">./pocketbase serve --http=&quot;0.0.0.0:8090&quot;</code>
                  <button
                    onClick={() => copyToClipboard('./pocketbase serve --http="0.0.0.0:8090"', 'cmd1')}
                    className="text-[10px] text-slate-400 hover:text-white px-2 py-0.5 rounded bg-slate-800 font-sans cursor-pointer"
                  >
                    {copiedCmd === 'cmd1' ? '¡Copiado!' : 'Copiar'}
                  </button>
                </div>
              </div>

              <div>
                <p className="text-slate-400 text-[11px]"># 2. En una segunda terminal (abrir túnel Cloudflare hacia el puerto 8090):</p>
                <div className="flex items-center justify-between bg-slate-950 p-2 rounded-lg mt-1 border border-slate-800">
                  <code className="text-emerald-300 text-[11px]">cloudflared tunnel --url http://localhost:8090</code>
                  <button
                    onClick={() => copyToClipboard('cloudflared tunnel --url http://localhost:8090', 'cmd2')}
                    className="text-[10px] text-slate-400 hover:text-white px-2 py-0.5 rounded bg-slate-800 font-sans cursor-pointer"
                  >
                    {copiedCmd === 'cmd2' ? '¡Copiado!' : 'Copiar'}
                  </button>
                </div>
              </div>
            </div>

            <p className="text-slate-400 font-sans text-[11px] leading-relaxed pt-1">
              Copia la URL pública <code>https://xxxx.trycloudflare.com</code> que te da Cloudflare y pégala arriba. Tu MacBook se encargará de gestionar todos los usuarios y exámenes.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs">
            <span className="w-2 h-2 rounded-full bg-violet-600" />
            <span className="text-slate-600 font-medium">Motor de Datos:</span>
            <span className="font-bold text-violet-700">PocketBase (Linux Home Lab)</span>
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
