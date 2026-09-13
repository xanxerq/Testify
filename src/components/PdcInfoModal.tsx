import React from 'react';
import {
  Sparkles,
  GraduationCap,
  Bot,
  FileCheck,
  BookOpen,
  HelpCircle,
  Clock,
  Type,
  Check,
  X,
  HeartHandshake,
  CheckCircle2,
} from 'lucide-react';
import { usePdc } from '../context/PdcContext';

export const PdcInfoModal: React.FC = () => {
  const {
    isPdcActive,
    setPdcActive,
    togglePdc,
    isEasyReading,
    toggleEasyReading,
    isPdcInfoModalOpen,
    closePdcInfoModal,
  } = usePdc();

  if (!isPdcInfoModalOpen) return null;

  return (
    <div
      id="pdc-info-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn"
    >
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-amber-500 via-amber-600 to-orange-500 text-white relative shrink-0">
          <button
            type="button"
            onClick={closePdcInfoModal}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors cursor-pointer"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 mb-2">
            <span className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center shadow-inner">
              <HeartHandshake className="w-6 h-6 text-white" />
            </span>
            <div>
              <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-extrabold uppercase tracking-wider">
                Inclusión y Apoyo Pedagógico
              </span>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight mt-0.5">
                Adaptación Curricular PDC
              </h2>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-amber-100 leading-relaxed max-w-xl">
            Diseñado para estudiantes que cursan el <strong>Programa de Diversificación Curricular (PDC / PMAR)</strong> en la ESO o que necesitan explicaciones más claras, paso a paso y sin rodeos.
          </p>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 text-slate-700 text-sm">
          {/* Main Activation Card */}
          <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/80 border-2 border-amber-300/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-900 text-base">
                  Modo Adaptación PDC
                </span>
                {isPdcActive && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-600 text-white text-[10px] font-black uppercase">
                    Activo
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Aplica la adaptación curricular en todas las zonas: Chatbot, Exámenes, Flashcards, Apuntes y Deberes.
              </p>
            </div>

            <button
              type="button"
              onClick={togglePdc}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-sm transition-all flex items-center gap-2 shrink-0 ${
                isPdcActive
                  ? 'bg-amber-600 text-white hover:bg-amber-700'
                  : 'bg-white text-slate-800 border border-slate-300 hover:bg-amber-500 hover:text-white hover:border-amber-500'
              }`}
            >
              {isPdcActive ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Adaptación Activada</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span>Activar Adaptación PDC</span>
                </>
              )}
            </button>
          </div>

          {/* Lectura Fácil / Visual Accessibility Switch */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                <Type className="w-4 h-4" />
              </span>
              <div>
                <span className="font-bold text-slate-900 text-sm block">
                  Modo Lectura Fácil (Tipografía y Espaciado Ampliado)
                </span>
                <span className="text-xs text-slate-500 block leading-normal mt-0.5">
                  Aumenta el tamaño del texto y el interlineado para evitar la fatiga visual y facilitar la lectura en pantalla.
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={toggleEasyReading}
              className={`w-12 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer shrink-0 ${
                isEasyReading ? 'bg-indigo-600' : 'bg-slate-300'
              }`}
              title="Alternar Lectura Fácil"
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                  isEasyReading ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* ¿Qué cambia en cada zona? */}
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm mb-3 flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-amber-600" />
              <span>¿Cómo te ayuda la adaptación en cada parte de Testify?</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1.5 shadow-2xs">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <Bot className="w-4 h-4 text-indigo-600" />
                  <span>En el Chatbot IA</span>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  El tutor responde con frases cortas y lenguaje claro (Lectura Fácil). Desglosa dudas en pasos numerados con ejemplos de la vida real y refuerzo positivo.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1.5 shadow-2xs">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <FileCheck className="w-4 h-4 text-emerald-600" />
                  <span>En los Exámenes</span>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  Preguntas con enunciados directos sin ambigüedades. Opciones de test claras sin distractores engañosos. Pistas pedagógicas en preguntas abiertas y tiempo flexible.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1.5 shadow-2xs">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <HelpCircle className="w-4 h-4 text-amber-600" />
                  <span>En las Flashcards</span>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  Tarjetas de estudio centradas en conceptos esenciales, con definiciones concisas y trucos nemotécnicos sencillos para afianzar el aprendizaje.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1.5 shadow-2xs">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <BookOpen className="w-4 h-4 text-purple-600" />
                  <span>En Apuntes y Deberes</span>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  Resúmenes esquematizados con viñetas y términos clave en negrita. En deberes, se explican todos los cálculos intermedios sin saltarse pasos.
                </p>
              </div>
            </div>
          </div>

          {/* Official Context about PDC */}
          <div className="p-3.5 rounded-xl bg-slate-100/80 border border-slate-200 text-xs text-slate-600 leading-relaxed">
            <strong className="text-slate-900 block mb-1">
              ¿Qué es el Programa de Diversificación Curricular (PDC)?
            </strong>
            Es una medida de inclusión educativa en España (LOMLOE) para alumnos de 3º y 4º de la ESO organizada en dos grandes ámbitos: el <em>Ámbito Científico-Tecnológico</em> y el <em>Ámbito Sociolingüístico</em>. Su objetivo es que todo estudiante alcance el título de Graduado en ESO con una metodología activa, adaptada y personalizada.
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <span className="text-xs text-slate-500 hidden sm:inline">
            Puedes activar o desactivar este modo cuando quieras desde cualquier pantalla.
          </span>
          <button
            type="button"
            onClick={closePdcInfoModal}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm rounded-xl transition-colors ml-auto shadow-xs cursor-pointer"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
