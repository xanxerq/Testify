import React from 'react';
import { HeartHandshake, Check, Sparkles, HelpCircle, Info } from 'lucide-react';
import { usePdc } from '../context/PdcContext';

interface PdcAdaptationButtonProps {
  variant?: 'pill' | 'button' | 'card' | 'switch';
  className?: string;
  onToggleOverride?: (active: boolean) => void;
  overrideActive?: boolean;
  showTooltip?: boolean;
}

export const PdcAdaptationButton: React.FC<PdcAdaptationButtonProps> = ({
  variant = 'pill',
  className = '',
  onToggleOverride,
  overrideActive,
  showTooltip = true,
}) => {
  const { isPdcActive, togglePdc, setPdcActive, openPdcInfoModal } = usePdc();

  const active = overrideActive !== undefined ? overrideActive : isPdcActive;

  const handleToggle = () => {
    if (onToggleOverride) {
      onToggleOverride(!active);
    } else {
      togglePdc();
    }
  };

  if (variant === 'switch') {
    return (
      <div className={`flex items-center gap-2.5 ${className}`}>
        <button
          type="button"
          onClick={handleToggle}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            active ? 'bg-amber-500' : 'bg-slate-300'
          }`}
          role="switch"
          aria-checked={active}
          title="Alternar Adaptación PDC"
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
              active ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
        <button
          type="button"
          onClick={handleToggle}
          className="text-xs sm:text-sm font-bold text-slate-800 text-left hover:text-amber-700 transition-colors cursor-pointer"
        >
          Adaptación PDC {active ? '(Activa)' : ''}
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            openPdcInfoModal();
          }}
          className="text-slate-400 hover:text-amber-600 transition-colors p-0.5 cursor-pointer"
          title="¿Qué es la adaptación PDC?"
        >
          <Info className="w-4 h-4" />
        </button>
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <div
        className={`p-3.5 sm:p-4 rounded-2xl border transition-all ${
          active
            ? 'bg-amber-50/90 border-amber-300 ring-1 ring-amber-300 shadow-xs'
            : 'bg-white border-slate-200 hover:border-amber-200'
        } ${className}`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <span
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                active ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-500'
              }`}
            >
              <HeartHandshake className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-extrabold text-sm sm:text-base text-slate-900">
                  Adaptación PDC
                </span>
                {active ? (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-black uppercase tracking-wider">
                    PDC Activo
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-wider">
                    Opcional
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                Para estudiantes de Diversificación Curricular o con adaptación curricular: lenguaje claro, enunciados directos, lectura fácil y pistas de apoyo.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            <button
              type="button"
              onClick={openPdcInfoModal}
              className="text-xs text-slate-500 hover:text-amber-700 underline underline-offset-2 px-2 py-1 cursor-pointer"
            >
              Más info
            </button>
            <button
              type="button"
              onClick={handleToggle}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer ${
                active
                  ? 'bg-amber-600 hover:bg-amber-700 text-white'
                  : 'bg-slate-100 hover:bg-amber-50 text-slate-800 border border-slate-200 hover:border-amber-300'
              }`}
            >
              {active ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Adaptación PDC: SÍ</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>Adaptación PDC</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Default: pill / button
  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      <button
        type="button"
        id="btn-toggle-pdc-adaptation"
        onClick={handleToggle}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer ${
          active
            ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-200/50'
            : 'bg-amber-50/90 hover:bg-amber-100 text-amber-900 border border-amber-300/80 hover:border-amber-400'
        }`}
        title={
          active
            ? 'Adaptación PDC activa. Pulsa para desactivar.'
            : 'Adaptación PDC: pulsa para activar explicaciones, preguntas y temarios adaptados.'
        }
      >
        <HeartHandshake className={`w-3.5 h-3.5 ${active ? 'text-white' : 'text-amber-600'} shrink-0`} />
        <span className="whitespace-nowrap font-bold">
          {active ? 'Adaptación PDC: SÍ' : 'Adaptación PDC'}
        </span>
        {active && (
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse shrink-0" />
        )}
      </button>

      {showTooltip && (
        <button
          type="button"
          onClick={openPdcInfoModal}
          className="p-1.5 text-slate-400 hover:text-amber-600 transition-colors rounded-lg hover:bg-slate-100 cursor-pointer"
          title="Ver detalles de la Adaptación Curricular PDC"
        >
          <Info className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
