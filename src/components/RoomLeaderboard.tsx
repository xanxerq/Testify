import React, { useEffect, useState } from 'react';
import {
  Award,
  Clock,
  Crown,
  Medal,
  RefreshCw,
  Share2,
  Trophy,
  Users,
  CheckCircle2,
  Hourglass,
  Sparkles,
} from 'lucide-react';
import { ExamRoom, RoomParticipant } from '../types';
import { examRoomService } from '../services/examRoomService';

interface RoomLeaderboardProps {
  roomId: string;
  currentUserId: string;
  onRefresh?: () => void;
}

export const RoomLeaderboard: React.FC<RoomLeaderboardProps> = ({
  roomId,
  currentUserId,
}) => {
  const [room, setRoom] = useState<ExamRoom | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  // Subscribe to real-time updates of this room
  useEffect(() => {
    if (!roomId) return;
    const unsubscribe = examRoomService.subscribeToRoom(roomId, (updatedRoom) => {
      if (updatedRoom) {
        setRoom(updatedRoom);
      }
    });
    return () => unsubscribe();
  }, [roomId]);

  if (!room) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 text-center text-slate-500">
        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-600" />
        <p className="text-xs font-semibold">Cargando clasificación de la sala...</p>
      </div>
    );
  }

  const participantsList = Object.values(room.participants || {});

  // Sort participants:
  // 1. Finished first, sorted by score descending, then by time ascending
  // 2. Not finished at the bottom
  const sortedParticipants = [...participantsList].sort((a, b) => {
    const aFinished = a.status === 'finished';
    const bFinished = b.status === 'finished';

    if (aFinished && !bFinished) return -1;
    if (!aFinished && bFinished) return 1;

    if (aFinished && bFinished) {
      const aScore = a.score ?? 0;
      const bScore = b.score ?? 0;
      if (bScore !== aScore) return bScore - aScore;
      // tiebreaker: less time is better
      return (a.timeSpentSeconds ?? 99999) - (b.timeSpentSeconds ?? 99999);
    }

    return 0;
  });

  const currentUserParticipant = participantsList.find((p) => p.id === currentUserId);
  const userRankIndex = sortedParticipants.findIndex((p) => p.id === currentUserId);
  const userPosition = userRankIndex >= 0 ? userRankIndex + 1 : null;

  const top3 = sortedParticipants.filter((p) => p.status === 'finished').slice(0, 3);
  const remaining = sortedParticipants.slice(3);

  const formatTime = (secs?: number) => {
    if (secs === undefined || secs === null) return '--:--';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s}s`;
  };

  const handleShareRanking = () => {
    const text = `🏆 Ranking de la Sala de Examen #${room.code} (${room.exam.subject} - ${room.exam.topic}):\n` +
      sortedParticipants
        .filter((p) => p.status === 'finished')
        .map((p, i) => `${i + 1}º ${p.name}: ${((p.score || 0) / (p.maxScore || 1) * 10).toFixed(1)}/10 (${p.percentage}%)`)
        .join('\n');

    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-indigo-500/20 mb-8 overflow-hidden relative">
      {/* Decorative background glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header bar */}
      <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-indigo-800/60">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-800/60 border border-indigo-700/50 text-indigo-200 text-xs font-semibold mb-2">
            <Users className="w-3.5 h-3.5 text-amber-400" />
            <span>Reto con Amigos</span>
            <span>•</span>
            <span className="font-mono tracking-wider font-bold text-amber-300">
              Código: #{room.code}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight flex items-center gap-2.5">
            <Trophy className="w-6 h-6 text-amber-400" />
            <span>Clasificación y Podio en Vivo</span>
          </h2>
          <p className="text-xs sm:text-sm text-indigo-200/80 mt-1">
            {participantsList.filter((p) => p.status === 'finished').length} de {participantsList.length} amigos han completado el examen
          </p>
        </div>

        <button
          id="btn-share-ranking"
          type="button"
          onClick={handleShareRanking}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-indigo-600/80 hover:bg-indigo-600 text-white text-xs font-semibold rounded-xl border border-indigo-400/30 transition-all cursor-pointer shadow-sm"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>{copied ? '¡Copiado al portapapeles!' : 'Compartir Ranking'}</span>
        </button>
      </div>

      {/* User Status Highlight Banner */}
      {userPosition && (
        <div className="relative z-10 mt-5 p-3.5 sm:p-4 rounded-2xl bg-indigo-800/40 border border-indigo-700/60 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center font-bold text-base border border-amber-400/40">
              #{userPosition}
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                <span>Tu Posición en el Reto</span>
                {userPosition === 1 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-400 text-amber-950 font-black uppercase tracking-wider">
                    ¡Líder de la Sala! 👑
                  </span>
                )}
              </p>
              <p className="text-xs text-indigo-200">
                Puesto {userPosition} de {participantsList.length} participantes
              </p>
            </div>
          </div>

          {currentUserParticipant?.score !== undefined && (
            <div className="text-right">
              <div className="text-lg font-black text-amber-300 font-mono">
                {((currentUserParticipant.score / (currentUserParticipant.maxScore || 1)) * 10).toFixed(1)}
                <span className="text-xs text-indigo-300 font-normal"> / 10</span>
              </div>
              <div className="text-[11px] text-indigo-300">
                {currentUserParticipant.percentage}% aciertos
              </div>
            </div>
          )}
        </div>
      )}

      {/* Top 3 Visual Podium */}
      {top3.length > 0 && (
        <div className="relative z-10 mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          {/* 1st Place (Center on mobile or left-center layout) */}
          {top3.map((participant, index) => {
            const place = index + 1;
            const isUser = participant.id === currentUserId;
            const score10 = ((participant.score || 0) / (participant.maxScore || 1)) * 10;

            const podiumConfig = [
              {
                medal: '🥇',
                border: 'border-amber-400/60 bg-amber-950/30',
                badge: 'bg-amber-400 text-amber-950',
                title: '1º Lugar - Campeón/a',
                glow: 'shadow-amber-500/20',
              },
              {
                medal: '🥈',
                border: 'border-slate-300/50 bg-slate-800/30',
                badge: 'bg-slate-300 text-slate-900',
                title: '2º Lugar - Plata',
                glow: 'shadow-slate-400/10',
              },
              {
                medal: '🥉',
                border: 'border-amber-700/50 bg-amber-950/20',
                badge: 'bg-amber-700 text-amber-100',
                title: '3º Lugar - Bronce',
                glow: 'shadow-amber-700/10',
              },
            ][index];

            return (
              <div
                key={participant.id}
                className={`relative rounded-2xl p-4 border transition-all ${podiumConfig.border} ${
                  isUser ? 'ring-2 ring-indigo-400 bg-indigo-900/50' : ''
                } flex flex-col justify-between`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-2xl">{podiumConfig.medal}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${podiumConfig.badge}`}
                  >
                    {podiumConfig.title}
                  </span>
                </div>

                <div className="flex items-center gap-2.5 my-2">
                  <img
                    src={participant.avatar}
                    alt={participant.name}
                    className="w-10 h-10 rounded-full bg-slate-800 object-cover border border-white/20"
                    referrerPolicy="no-referrer"
                  />
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-white truncate flex items-center gap-1.5">
                      <span>{participant.name}</span>
                      {isUser && (
                        <span className="text-[10px] px-1.5 py-0.2 bg-indigo-500 text-white rounded font-semibold">
                          Tú
                        </span>
                      )}
                    </p>
                    <p className="text-[11px] text-indigo-300 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-indigo-400" />
                      <span>{formatTime(participant.timeSpentSeconds)}</span>
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/10 flex items-baseline justify-between mt-2">
                  <span className="text-xs text-indigo-200">Nota Final</span>
                  <div className="text-right">
                    <span className="text-lg font-black text-white font-mono">
                      {score10.toFixed(1)}
                    </span>
                    <span className="text-xs text-indigo-300"> / 10</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Full Participants List Table */}
      <div className="relative z-10 mt-6 bg-slate-900/60 rounded-2xl border border-indigo-900/80 overflow-hidden">
        <div className="px-4 py-3 bg-indigo-950/60 border-b border-indigo-900/60 text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center justify-between">
          <span>Participantes ({participantsList.length})</span>
          <span>Puntuación / Estado</span>
        </div>

        <div className="divide-y divide-indigo-950/50">
          {sortedParticipants.map((p, idx) => {
            const isFinished = p.status === 'finished';
            const isUser = p.id === currentUserId;
            const score10 = isFinished && p.score !== undefined
              ? ((p.score / (p.maxScore || 1)) * 10).toFixed(1)
              : null;

            return (
              <div
                key={p.id}
                className={`px-4 py-3 flex items-center justify-between gap-3 text-xs sm:text-sm ${
                  isUser ? 'bg-indigo-900/30 font-semibold' : ''
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-6 text-center font-bold text-indigo-400">
                    #{idx + 1}
                  </span>
                  <img
                    src={p.avatar}
                    alt={p.name}
                    className="w-8 h-8 rounded-full bg-slate-800 object-cover border border-indigo-700/50"
                    referrerPolicy="no-referrer"
                  />
                  <div className="min-w-0">
                    <div className="font-bold text-white truncate flex items-center gap-1.5">
                      <span>{p.name}</span>
                      {p.isHost && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          Host
                        </span>
                      )}
                      {isUser && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-600 text-white">
                          Tú
                        </span>
                      )}
                    </div>
                    {isFinished ? (
                      <p className="text-[11px] text-indigo-300">
                        Tiempo: {formatTime(p.timeSpentSeconds)}
                      </p>
                    ) : (
                      <p className="text-[11px] text-amber-300 flex items-center gap-1 animate-pulse">
                        <Hourglass className="w-3 h-3" />
                        <span>Haciendo examen...</span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  {isFinished ? (
                    <div>
                      <div className="font-mono font-bold text-base text-amber-300">
                        {score10} <span className="text-xs text-indigo-300">/10</span>
                      </div>
                      <div className="text-[11px] text-emerald-400 flex items-center justify-end gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>{p.percentage}% acierto</span>
                      </div>
                    </div>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-semibold border border-amber-500/30">
                      <Hourglass className="w-3 h-3 animate-spin" />
                      <span>En progreso</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
