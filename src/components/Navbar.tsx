import React from 'react';
import { BookOpen, Bot, Database, GraduationCap, History, LogIn, LogOut, PlusCircle, ShieldCheck, Sparkles, User as UserIcon, Users } from 'lucide-react';
import { User } from '../types';
import { PdcAdaptationButton } from './PdcAdaptationButton';

interface NavbarProps {
  user: User | null;
  activeView: 'create' | 'exam' | 'results' | 'history' | 'notes' | 'homework' | 'flashcards' | 'chat';
  onNavigate: (view: 'create' | 'history' | 'notes' | 'homework' | 'flashcards' | 'chat') => void;
  onOpenAuth: () => void;
  onOpenAdmin: () => void;
  onOpenRoomsModal: () => void;
  onSignOut: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  activeView,
  onNavigate,
  onOpenAuth,
  onOpenAdmin,
  onOpenRoomsModal,
  onSignOut,
}) => {
  const isAdmin = user?.role === 'admin' || user?.email.toLowerCase() === 'maruyalexander1@gmail.com';
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo & Title */}
        <div
          id="nav-logo"
          onClick={() => onNavigate('create')}
          className="flex items-center gap-2.5 cursor-pointer select-none group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-sm shadow-indigo-200 transition-transform group-hover:scale-105">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-slate-900 text-lg tracking-tight">
                Testify
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200/50">
                IA
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">
              Genera exámenes y apuntes con IA a partir de tus fotos y temarios
            </p>
          </div>
        </div>

        {/* Center / Actions Navigation */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            id="nav-btn-new-exam"
            onClick={() => onNavigate('create')}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeView === 'create'
                ? 'bg-indigo-50 text-indigo-700 font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span className="hidden xs:inline">Nuevo Examen</span>
          </button>

          <button
            id="nav-btn-notes"
            onClick={() => onNavigate('notes')}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeView === 'notes'
                ? 'bg-indigo-50 text-indigo-700 font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span className="hidden xs:inline">Crear Apuntes</span>
          </button>

          <button
            id="nav-btn-flashcards"
            onClick={() => onNavigate('flashcards')}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeView === 'flashcards'
                ? 'bg-amber-50 text-amber-900 font-semibold border border-amber-200'
                : 'text-slate-600 hover:text-amber-800 hover:bg-amber-50/50'
            }`}
            title="Estudia conceptos con tarjetas de memoria interactivas"
          >
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span className="hidden xs:inline">Flashcards</span>
          </button>

          <button
            id="nav-btn-chat"
            onClick={() => onNavigate('chat')}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeView === 'chat'
                ? 'bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200'
                : 'text-slate-600 hover:text-indigo-700 hover:bg-indigo-50/60'
            }`}
            title="Chatbot IA para responder dudas y preguntas directamente sin subir fotos"
          >
            <Bot className="w-4 h-4 text-indigo-600" />
            <span className="hidden xs:inline">Chatbot IA</span>
          </button>

          <button
            id="nav-btn-homework"
            onClick={() => onNavigate('homework')}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeView === 'homework'
                ? 'bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200/50'
                : 'text-slate-600 hover:text-emerald-700 hover:bg-emerald-50/50'
            }`}
            title="Sube una foto de tu ejercicio y la IA te lo resuelve explicando el paso a paso"
          >
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span className="hidden xs:inline">Resolver Deberes</span>
          </button>

          <button
            id="nav-btn-history"
            onClick={() => onNavigate('history')}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeView === 'history'
                ? 'bg-indigo-50 text-indigo-700 font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <History className="w-4 h-4" />
            <span className="hidden xs:inline">Historial</span>
          </button>

          <button
            id="nav-btn-multiplayer"
            onClick={onOpenRoomsModal}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 transition-colors"
            title="Hacer examen con amigos o unirse a sala con código"
          >
            <Users className="w-4 h-4 text-indigo-600" />
            <span className="hidden sm:inline">Con Amigos</span>
          </button>

          {/* Admin Database Viewer Button (shown for maruyalexander1@gmail.com / role === admin) */}
          {isAdmin && (
            <button
              id="nav-btn-admin-db"
              onClick={onOpenAdmin}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-lg bg-amber-100 text-amber-900 hover:bg-amber-200 border border-amber-300 transition-all shadow-xs"
              title="Panel de Base de Datos y Usuarios (Administrador)"
            >
              <Database className="w-4 h-4 text-amber-700" />
              <span className="hidden sm:inline">Base de Datos</span>
              <span className="text-[10px] bg-amber-600 text-white px-1.5 py-0.2 rounded font-bold uppercase tracking-wider">
                Admin
              </span>
            </button>
          )}

          {/* PDC Adaptation Button (accessible across entire platform) */}
          <div className="flex items-center">
            <PdcAdaptationButton variant="pill" />
          </div>

          {/* User Auth Section */}
          {user ? (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-slate-100 border border-slate-200">
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-6 h-6 rounded-full bg-white object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="text-xs font-medium text-slate-800 max-w-[110px] truncate hidden md:inline">
                  {user.name}
                </span>
                {isAdmin ? (
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1 py-0.5 rounded border border-amber-300 hidden sm:inline">
                    Admin
                  </span>
                ) : user.provider === 'google' ? (
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded border border-emerald-200/60 hidden sm:inline">
                    Google
                  </span>
                ) : null}
              </div>

              <button
                id="nav-btn-logout"
                onClick={onSignOut}
                title="Cerrar sesión"
                className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              id="nav-btn-login"
              onClick={onOpenAuth}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-200 transition-all hover:shadow"
            >
              <LogIn className="w-4 h-4" />
              <span>Iniciar Sesión</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
