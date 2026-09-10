import { supabase, isSupabaseConfigured } from './supabase';
import {
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  onSnapshot,
} from 'firebase/firestore';
import { db } from './firebase';
import { Exam, ExamRoom, RoomParticipant } from '../types';

const ROOMS_COLLECTION = 'exam_rooms';
const LOCAL_STORAGE_KEY_ROOMS = 'testify_local_exam_rooms';

// Active Realtime channels cache for Supabase
const activeSupabaseChannels = new Map<string, any>();

// Generate a random 6-character alphanumeric room PIN (no ambiguous chars like 0/O, 1/I)
function generateRoomCode(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Local storage fallback helper
function getLocalRooms(): Record<string, ExamRoom> {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY_ROOMS);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveLocalRoom(room: ExamRoom) {
  try {
    const rooms = getLocalRooms();
    rooms[room.id] = room;
    rooms[room.code] = room;
    localStorage.setItem(LOCAL_STORAGE_KEY_ROOMS, JSON.stringify(rooms));
  } catch (e) {
    console.error('Error saving local room fallback:', e);
  }
}

function mapSupabaseRowToRoom(row: any): ExamRoom {
  return {
    id: row.id,
    code: (row.code || '').toUpperCase(),
    hostId: row.host_id || row.hostId,
    hostName: row.host_name || row.hostName,
    status: row.status || 'waiting',
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
    startedAt: row.started_at || row.startedAt,
    exam: typeof row.exam === 'string' ? JSON.parse(row.exam) : row.exam,
    participants:
      typeof row.participants === 'string'
        ? JSON.parse(row.participants)
        : row.participants || {},
  };
}

// Broadcast room state via Supabase Realtime channel
function broadcastSupabaseRoom(room: ExamRoom) {
  if (!isSupabaseConfigured()) return;
  try {
    const channelName = `exam_room_${room.code.toUpperCase()}`;
    let ch = activeSupabaseChannels.get(channelName);
    if (!ch) {
      ch = supabase.channel(channelName, {
        config: { broadcast: { self: true } },
      });
      ch.subscribe();
      activeSupabaseChannels.set(channelName, ch);
    }
    ch.send({
      type: 'broadcast',
      event: 'room_sync',
      payload: room,
    });
  } catch (e) {
    console.warn('Could not broadcast room state to Supabase channel:', e);
  }
}

export const examRoomService = {
  // Create a new multiplayer exam room
  async createRoom(
    exam: Exam,
    host: { id: string; name: string; avatar?: string }
  ): Promise<ExamRoom> {
    const code = generateRoomCode();
    const roomId = `room_${code.toLowerCase()}_${Date.now()}`;

    const hostParticipant: RoomParticipant = {
      id: host.id,
      name: host.name,
      avatar:
        host.avatar ||
        `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(host.name)}`,
      isHost: true,
      joinedAt: new Date().toISOString(),
      status: 'waiting',
    };

    const room: ExamRoom = {
      id: roomId,
      code,
      hostId: host.id,
      hostName: host.name,
      status: 'waiting',
      createdAt: new Date().toISOString(),
      exam,
      participants: {
        [host.id]: hostParticipant,
      },
    };

    // 1. Try Supabase first (primary database & realtime engine)
    if (isSupabaseConfigured()) {
      try {
        await supabase.from('exam_rooms').upsert({
          id: roomId,
          code: code.toUpperCase(),
          host_id: host.id,
          host_name: host.name,
          status: 'waiting',
          created_at: room.createdAt,
          exam: room.exam,
          participants: room.participants,
        });
      } catch (sbErr) {
        console.warn('Supabase upsert room error (will use Realtime & Local):', sbErr);
      }
    }

    // 2. Broadcast via Supabase Realtime channel
    broadcastSupabaseRoom(room);

    // 3. Fallback / replica to Firestore if available
    try {
      const roomRef = doc(db, ROOMS_COLLECTION, roomId);
      await setDoc(roomRef, room);
    } catch (err) {
      // Ignored if Firestore is not in use
    }

    // Always cache locally as well
    saveLocalRoom(room);

    return room;
  },

  // Get room by 6-character code
  async getRoomByCode(code: string): Promise<ExamRoom | null> {
    const upperCode = code.trim().toUpperCase();

    // 1. Try Supabase first
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('exam_rooms')
          .select('*')
          .eq('code', upperCode)
          .maybeSingle();

        if (data && !error) {
          const room = mapSupabaseRowToRoom(data);
          saveLocalRoom(room);
          return room;
        }
      } catch (sbErr) {
        console.warn('Supabase getRoomByCode notice:', sbErr);
      }
    }

    // 2. Try Firestore query
    try {
      const q = query(
        collection(db, ROOMS_COLLECTION),
        where('code', '==', upperCode)
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const room = snapshot.docs[0].data() as ExamRoom;
        saveLocalRoom(room);
        return room;
      }
    } catch (err) {
      // Firestore fallback
    }

    // 3. Fallback to local storage
    const localRooms = getLocalRooms();
    const local = Object.values(localRooms).find(
      (r) => r.code.toUpperCase() === upperCode
    );
    return local || null;
  },

  // Get room by ID
  async getRoom(roomId: string): Promise<ExamRoom | null> {
    // 1. Try Supabase first
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('exam_rooms')
          .select('*')
          .eq('id', roomId)
          .maybeSingle();

        if (data && !error) {
          const room = mapSupabaseRowToRoom(data);
          saveLocalRoom(room);
          return room;
        }
      } catch (sbErr) {
        console.warn('Supabase getRoom notice:', sbErr);
      }
    }

    // 2. Try Firestore
    try {
      const roomRef = doc(db, ROOMS_COLLECTION, roomId);
      const snap = await getDoc(roomRef);
      if (snap.exists()) {
        const room = snap.data() as ExamRoom;
        saveLocalRoom(room);
        return room;
      }
    } catch (err) {
      // Firestore fallback
    }

    const localRooms = getLocalRooms();
    return localRooms[roomId] || null;
  },

  async getRoomById(roomId: string): Promise<ExamRoom | null> {
    return this.getRoom(roomId);
  },

  // Join a room with participant details
  async joinRoom(
    roomId: string,
    participant: { id: string; name: string; avatar?: string }
  ): Promise<ExamRoom | null> {
    let currentRoom = await this.getRoom(roomId);
    if (!currentRoom) return null;

    const newParticipant: RoomParticipant = {
      id: participant.id,
      name: participant.name,
      avatar:
        participant.avatar ||
        `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(participant.name)}`,
      isHost: currentRoom.hostId === participant.id,
      joinedAt: new Date().toISOString(),
      status: currentRoom.status === 'in_progress' ? 'in_exam' : 'waiting',
    };

    const updatedParticipants = {
      ...currentRoom.participants,
      [participant.id]: {
        ...(currentRoom.participants[participant.id] || {}),
        ...newParticipant,
      },
    };

    const updatedRoom: ExamRoom = {
      ...currentRoom,
      participants: updatedParticipants,
    };

    // 1. Update Supabase
    if (isSupabaseConfigured()) {
      try {
        await supabase
          .from('exam_rooms')
          .update({
            participants: updatedParticipants,
          })
          .eq('id', roomId);
      } catch (sbErr) {
        console.warn('Supabase update room participants notice:', sbErr);
      }
    }

    // 2. Broadcast via Supabase Realtime channel
    broadcastSupabaseRoom(updatedRoom);

    // 3. Update Firestore if active
    try {
      const roomRef = doc(db, ROOMS_COLLECTION, roomId);
      await updateDoc(roomRef, {
        [`participants.${participant.id}`]: newParticipant,
      });
    } catch (err) {
      // Firestore fallback
    }

    saveLocalRoom(updatedRoom);
    return updatedRoom;
  },

  // Start exam for everyone in the room (Host only)
  async startRoom(roomId: string): Promise<void> {
    const startedAt = new Date().toISOString();
    const currentRoom = await this.getRoom(roomId);

    if (currentRoom) {
      currentRoom.status = 'in_progress';
      currentRoom.startedAt = startedAt;

      // 1. Update Supabase
      if (isSupabaseConfigured()) {
        try {
          await supabase
            .from('exam_rooms')
            .update({
              status: 'in_progress',
              started_at: startedAt,
            })
            .eq('id', roomId);
        } catch (sbErr) {
          console.warn('Supabase startRoom notice:', sbErr);
        }
      }

      // 2. Broadcast immediately via Supabase Realtime
      broadcastSupabaseRoom(currentRoom);
    }

    // 3. Update Firestore
    try {
      const roomRef = doc(db, ROOMS_COLLECTION, roomId);
      await updateDoc(roomRef, {
        status: 'in_progress',
        startedAt,
      });
    } catch (err) {
      // Ignored if Firestore not in use
    }

    const localRooms = getLocalRooms();
    if (localRooms[roomId]) {
      localRooms[roomId].status = 'in_progress';
      localRooms[roomId].startedAt = startedAt;
      saveLocalRoom(localRooms[roomId]);
    }
  },

  // Submit participant results and update leaderboard
  async submitParticipantResult(
    roomId: string,
    participantId: string,
    result: {
      score: number;
      maxScore: number;
      percentage: number;
      timeSpentSeconds: number;
    }
  ): Promise<void> {
    const finishedAt = new Date().toISOString();
    const currentRoom = await this.getRoom(roomId);

    if (currentRoom && currentRoom.participants[participantId]) {
      currentRoom.participants[participantId] = {
        ...currentRoom.participants[participantId],
        status: 'finished',
        score: result.score,
        maxScore: result.maxScore,
        percentage: result.percentage,
        timeSpentSeconds: result.timeSpentSeconds,
        finishedAt,
      };

      // 1. Update Supabase
      if (isSupabaseConfigured()) {
        try {
          await supabase
            .from('exam_rooms')
            .update({
              participants: currentRoom.participants,
            })
            .eq('id', roomId);
        } catch (sbErr) {
          console.warn('Supabase submit result notice:', sbErr);
        }
      }

      // 2. Broadcast via Supabase Realtime
      broadcastSupabaseRoom(currentRoom);
      saveLocalRoom(currentRoom);
    }

    // 3. Update Firestore
    try {
      const roomRef = doc(db, ROOMS_COLLECTION, roomId);
      await updateDoc(roomRef, {
        [`participants.${participantId}.status`]: 'finished',
        [`participants.${participantId}.score`]: result.score,
        [`participants.${participantId}.maxScore`]: result.maxScore,
        [`participants.${participantId}.percentage`]: result.percentage,
        [`participants.${participantId}.timeSpentSeconds`]: result.timeSpentSeconds,
        [`participants.${participantId}.finishedAt`]: finishedAt,
      });
    } catch (err) {
      // Ignored
    }
  },

  // Real-time room subscription with Supabase Realtime + polling backup
  subscribeToRoom(
    roomId: string,
    callback: (room: ExamRoom | null) => void
  ): () => void {
    let isSubscribed = true;
    let firestoreUnsub: (() => void) | null = null;
    let pollInterval: any = null;

    // Send initial cached state
    this.getRoom(roomId).then((initialRoom) => {
      if (isSubscribed && initialRoom) {
        callback(initialRoom);
      }
    });

    // 1. Supabase Realtime Channel Subscription
    let supabaseChannel: any = null;
    if (isSupabaseConfigured()) {
      try {
        // Room code can be extracted or derived from getRoom
        this.getRoom(roomId).then((room) => {
          if (!isSubscribed || !room) return;
          const channelName = `exam_room_${room.code.toUpperCase()}`;
          supabaseChannel = supabase.channel(channelName, {
            config: { broadcast: { self: true } },
          });

          supabaseChannel
            .on('broadcast', { event: 'room_sync' }, (payload: any) => {
              if (isSubscribed && payload?.payload) {
                const updated = payload.payload as ExamRoom;
                saveLocalRoom(updated);
                callback(updated);
              }
            })
            .on(
              'postgres_changes',
              {
                event: '*',
                schema: 'public',
                table: 'exam_rooms',
                filter: `id=eq.${roomId}`,
              },
              (payload: any) => {
                if (isSubscribed && payload?.new) {
                  const updated = mapSupabaseRowToRoom(payload.new);
                  saveLocalRoom(updated);
                  callback(updated);
                }
              }
            )
            .subscribe();
        });
      } catch (sbErr) {
        console.warn('Supabase subscribe error:', sbErr);
      }
    }

    // 2. Setup periodic synchronization to guarantee sync across tabs/devices
    pollInterval = setInterval(async () => {
      if (!isSubscribed) return;
      try {
        const latest = await this.getRoom(roomId);
        if (isSubscribed && latest) {
          callback(latest);
        }
      } catch (e) {
        // Ignore poll errors
      }
    }, 2500);

    // 3. Fallback Firestore onSnapshot if available
    try {
      const roomRef = doc(db, ROOMS_COLLECTION, roomId);
      firestoreUnsub = onSnapshot(
        roomRef,
        (snap) => {
          if (isSubscribed && snap.exists()) {
            const data = snap.data() as ExamRoom;
            saveLocalRoom(data);
            callback(data);
          }
        },
        () => {
          // Firestore subscription silent fallback
        }
      );
    } catch {
      // Ignored
    }

    return () => {
      isSubscribed = false;
      if (pollInterval) clearInterval(pollInterval);
      if (supabaseChannel) {
        try {
          supabase.removeChannel(supabaseChannel);
        } catch {}
      }
      if (firestoreUnsub) {
        try {
          firestoreUnsub();
        } catch {}
      }
    };
  },
};

