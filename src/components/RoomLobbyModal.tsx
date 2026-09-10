import React, { useEffect, useState } from 'react';
import {
  Check,
  Clock,
  Copy,
  Crown,
  FileText,
  Hourglass,
  Play,
  Share2,
  Sparkles,
  Users,
  X,
  ArrowRight,
  LogIn,
} from 'lucide-react';
import { Exam, ExamRoom, RoomParticipant, User } from '../types';
import { examRoomService } from '../services/examRoomService';
import { isSupabaseConfigured } from '../services/supabase';

interface RoomLobbyModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  examToHost?: Exam | null;
  initialRoomCode?: string | null;
  onStartExamInRoom: (exam: Exam, roomId: string, participantId: string) => void;
}

export const RoomLobbyModal: React.FC<RoomLobbyModalProps> = ({
  isOpen,
  onClose,
  user,
  examToHost,
  initialRoomCode,
  onStartExamInRoom,
}) => {
  const [mode, setMode] = useState<'create' | 'join'>(
    initialRoomCode ? 'join' : examToHost ? 'create' : 'join'
  );
  const [roomCodeInput, setRoomCodeInput] = useState<string>(initialRoomCode || '');
  const [participantName, setParticipantName] = useState<string>(
    user?.name || localStorage.getItem('testify_guest_name') || ''
  );
  const [currentRoom, setCurrentRoom] = useState<ExamRoom | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Persistent local participant ID for this browser session
  const [myParticipantId] = useState<string>(() => {
    return user?.id || `guest_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  });

  // Keep participantName in sync with user
  useEffect(() => {
    if (user?.name) {
      setParticipantName(user.name);
    }
  }, [user]);

  // If initialRoomCode changed, prefill
  useEffect(() => {
    if (initialRoomCode) {
      setRoomCodeInput(initialRoomCode.toUpperCase());
      setMode('join');
    }
  }, [initialRoomCode]);

  // Subscribe to room updates once joined or created
  useEffect(() => {
    if (!currentRoom?.id) return;

    const unsubscribe = examRoomService.subscribeToRoom(currentRoom.id, (updatedRoom) => {
      if (!updatedRoom) return;
      setCurrentRoom(updatedRoom);

      // If room status changed to 'in_progress', automatically launch the exam!
      if (updatedRoom.status === 'in_progress') {
        onStartExamInRoom(updatedRoom.exam, updatedRoom.id, myParticipantId);
        onClose();
      }
    });

    return () => unsubscribe();
  }, [currentRoom?.id, myParticipantId, onStartExamInRoom, onClose]);

  if (!isOpen) return null;

  // Handle Host creating a room
  const handleCreateRoom = async () => {
    if (!examToHost) {
      setErrorMsg('No hay ningún examen seleccionado para la sala. Genera uno primero.');
      return;
    }
    const name = participantName.trim() || 'Anfitrión';
    localStorage.setItem('testify_guest_name', name);

    try {
      setIsLoading(true);
      setErrorMsg(null);
      const room = await examRoomService.createRoom(examToHost, {
        id: myParticipantId,
        name,
        avatar: user?.avatar,
      });
      setCurrentRoom(room);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al crear la sala multijugador.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Join by Code
  const handleJoinRoom = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const code = roomCodeInput.trim().toUpperCase();
    if (!code || code.length < 4) {
      setErrorMsg('Introduce un código de sala válido.');
      return;
    }

    const name = participantName.trim() || 'Estudiante';
    localStorage.setItem('testify_guest_name', name);

    try {
      setIsLoading(true);
      setErrorMsg(null);
      const room = await examRoomService.getRoomByCode(code);
      if (!room) {
        setErrorMsg(`No se encontró ninguna sala con el código #${code}.`);
        setIsLoading(false);
        return;
      }

      // Join participant
      const updated = await examRoomService.joinRoom(room.id, {
        id: myParticipantId,
        name,
        avatar: user?.avatar,
      });

      if (updated) {
        setCurrentRoom(updated);
        // If already in progress, start immediately
        if (updated.status === 'in_progress') {
          onStartExamInRoom(updated.exam, updated.id, myParticipantId);
          onClose();
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'No se pudo conectar a la sala.');
    } finally {
      setIsLoading(false);
    }
  };

  // Host starts the exam
  const handleHostStartExam = async () => {
    if (!currentRoom) return;
    try {
      setIsLoading(true);
      await examRoomService.startRoom(currentRoom.id);
      onStartExamInRoom(currentRoom.exam, currentRoom.id, myParticipantId);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al iniciar el examen.');
      setIsLoading(false);
    }
  };

  const getShareLink = () => {
    if (!currentRoom) return '';
    const origin = window.location.origin;
    return `${origin}?room=${currentRoom.code}`;
  };

  const handleCopyLink = () => {
    const link = getShareLink();
    if (navigator.clipboard && link) {
      navigator.clipboard.writeText(link);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleCopyCode = () => {
    if (navigator.clipboard && currentRoom) {
      navigator.clipboard.writeText(currentRoom.code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    }
  };

  const isHost = currentRoom && currentRoom.hostId === myParticipantId;
  const participants = currentRoom ? Object.values(currentRoom.participants || {}) : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-fadeIn">
      <div
        id="room-lobby-modal"
        className="bg-white w-full max-w-xl rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-indigo-900 to-indigo-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-700/80 border border-indigo-400/30 flex items-center justify-center text-amber-300">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base sm:text-lg">
                  {currentRoom ? `Sala de Reto #${currentRoom.code}` : 'Hacer Examen con Amigos'}
                </h3>
                {isSupabaseConfigured() && (
                  <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-200 text-[10px] font-medium border border-emerald-400/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    Supabase Realtime
                  </span>
                )}
              </div>
              <p className="text-xs text-indigo-200">
                {currentRoom
                  ? 'Conecta a tus amigos y competid para ver quién saca mejor nota'
                  : 'Compite en tiempo real y comparte la clasificación'}
              </p>
            </div>
          </div>
          <button
            id="btn-close-room-modal"
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl font-medium">
              {errorMsg}
            </div>
          )}

          {/* If not in a room yet: Select Mode (Create or Join) */}
          {!currentRoom && (
            <div className="space-y-5">
              {/* Tab Switcher */}
              <div className="flex p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setMode('create')}
                  disabled={!examToHost}
                  className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all ${
                    mode === 'create'
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  } ${!examToHost ? 'opacity-40 cursor-not-allowed' : ''}`}
                >
                  Crear Nueva Sala
                </button>
                <button
                  type="button"
                  onClick={() => setMode('join')}
                  className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all ${
                    mode === 'join'
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Unirse con Código PIN
                </button>
              </div>

              {/* Participant Name Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tu nombre o apodo para la sala:
                </label>
                <input
                  type="text"
                  maxLength={30}
                  value={participantName}
                  onChange={(e) => setParticipantName(e.target.value)}
                  placeholder="Ej: Carlos Gómez"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {mode === 'create' && (
                <div className="space-y-4">
                  {examToHost ? (
                    <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100">
                      <p className="text-xs font-bold text-indigo-950 flex items-center gap-1.5 mb-1">
                        <FileText className="w-4 h-4 text-indigo-600" />
                        <span>Examen a compartir con tus amigos:</span>
                      </p>
                      <p className="text-sm font-extrabold text-slate-900">{examToHost.title}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {examToHost.subject} • {examToHost.level} • {examToHost.questions.length} preguntas • {examToHost.timeLimitMinutes || 20} min
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic">
                      Debes generar un examen primero para poder ser anfitrión de una sala.
                    </p>
                  )}

                  <button
                    id="btn-confirm-create-room"
                    type="button"
                    disabled={isLoading || !examToHost}
                    onClick={handleCreateRoom}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isLoading ? (
                      <Hourglass className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-amber-300" />
                        <span>Crear Sala e Invitar Amigos</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {mode === 'join' && (
                <form onSubmit={handleJoinRoom} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Código PIN de la sala (6 caracteres):
                    </label>
                    <input
                      type="text"
                      maxLength={8}
                      value={roomCodeInput}
                      onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                      placeholder="Ej: ABC742"
                      className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-center text-lg font-black tracking-widest text-indigo-950 uppercase font-mono focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <button
                    id="btn-confirm-join-room"
                    type="submit"
                    disabled={isLoading || !roomCodeInput.trim()}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isLoading ? (
                      <Hourglass className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <span>Unirse a la Sala</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* If already IN a room (Lobby state) */}
          {currentRoom && (
            <div className="space-y-6">
              {/* Room Code Showcase Box */}
              <div className="bg-slate-50 border border-indigo-100 rounded-2xl p-5 text-center">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Código de Acceso a la Sala
                </p>
                <div className="flex items-center justify-center gap-3 my-2">
                  <span className="text-3xl sm:text-4xl font-black font-mono tracking-widest text-indigo-950">
                    {currentRoom.code}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors"
                    title="Copiar código"
                  >
                    {copiedCode ? <Check className="w-5 h-5 text-emerald-600" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>

                <div className="pt-3 border-t border-slate-200/80 flex flex-wrap items-center justify-center gap-2">
                  <button
                    id="btn-copy-invite-link"
                    type="button"
                    onClick={handleCopyLink}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs rounded-xl border border-indigo-200 transition-colors"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>{copiedLink ? '¡Enlace copiado!' : 'Copiar enlace directo de invitación'}</span>
                  </button>
                </div>
              </div>

              {/* Exam Info */}
              <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs space-y-1">
                <div className="font-bold text-slate-800 text-sm">
                  {currentRoom.exam.title}
                </div>
                <div className="text-slate-500">
                  {currentRoom.exam.subject} • {currentRoom.exam.level} • {currentRoom.exam.questions.length} preguntas ({currentRoom.exam.timeLimitMinutes || 20} minutos)
                </div>
              </div>

              {/* Participants Live List */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-indigo-600" />
                    <span>Amigos en la Sala ({participants.length})</span>
                  </h4>
                  <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    <span>En vivo</span>
                  </span>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {participants.map((p) => {
                    const isMe = p.id === myParticipantId;
                    return (
                      <div
                        key={p.id}
                        className={`px-3.5 py-2.5 rounded-xl border flex items-center justify-between gap-3 text-xs ${
                          isMe
                            ? 'bg-indigo-50/80 border-indigo-200 font-semibold'
                            : 'bg-white border-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={p.avatar}
                            alt={p.name}
                            className="w-7 h-7 rounded-full bg-slate-200 object-cover"
                            referrerPolicy="no-referrer"
                          />
                          <div className="truncate">
                            <span className="text-slate-900 font-bold">{p.name}</span>
                            {isMe && <span className="ml-1.5 text-indigo-600 font-normal">(Tú)</span>}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {p.isHost && (
                            <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-bold border border-amber-200 flex items-center gap-1">
                              <Crown className="w-3 h-3 text-amber-600" />
                              <span>Anfitrión</span>
                            </span>
                          )}
                          <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-medium border border-emerald-100">
                            Listo
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons: Host vs Guest */}
              <div className="pt-2">
                {isHost ? (
                  <button
                    id="btn-host-start-room-exam"
                    type="button"
                    disabled={isLoading}
                    onClick={handleHostStartExam}
                    className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span>¡Comenzar Examen para Todos ({participants.length})!</span>
                  </button>
                ) : (
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-center">
                    <p className="text-xs font-bold text-amber-900 flex items-center justify-center gap-1.5">
                      <Hourglass className="w-4 h-4 animate-spin text-amber-600" />
                      <span>Esperando a que el anfitrión inicie el examen...</span>
                    </p>
                    <p className="text-[11px] text-amber-700 mt-1">
                      En cuanto el anfitrión comience, el examen se abrirá automáticamente para ti.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
