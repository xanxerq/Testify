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

    // Save to Firestore
    try {
      const roomRef = doc(db, ROOMS_COLLECTION, roomId);
      await setDoc(roomRef, room);
    } catch (err) {
      console.warn('Could not write room to Firestore, using local fallback:', err);
    }

    // Always cache locally as well
    saveLocalRoom(room);

    return room;
  },

  // Get room by 6-character code
  async getRoomByCode(code: string): Promise<ExamRoom | null> {
    const upperCode = code.trim().toUpperCase();

    // 1. Try Firestore query
    try {
      const q = query(
        collection(db, ROOMS_COLLECTION),
        where('code', '==', upperCode)
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        return snapshot.docs[0].data() as ExamRoom;
      }
    } catch (err) {
      console.warn('Firestore query by code failed, falling back to local storage:', err);
    }

    // 2. Fallback to local storage
    const localRooms = getLocalRooms();
    const local = Object.values(localRooms).find(
      (r) => r.code.toUpperCase() === upperCode
    );
    return local || null;
  },

  // Get room by ID
  async getRoom(roomId: string): Promise<ExamRoom | null> {
    try {
      const roomRef = doc(db, ROOMS_COLLECTION, roomId);
      const snap = await getDoc(roomRef);
      if (snap.exists()) {
        return snap.data() as ExamRoom;
      }
    } catch (err) {
      console.warn('Firestore getRoom failed, falling back:', err);
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

    try {
      const roomRef = doc(db, ROOMS_COLLECTION, roomId);
      await updateDoc(roomRef, {
        [`participants.${participant.id}`]: newParticipant,
      });
    } catch (err) {
      console.warn('Firestore update participant failed, saving local:', err);
    }

    saveLocalRoom(updatedRoom);
    return updatedRoom;
  },

  // Start exam for everyone in the room (Host only)
  async startRoom(roomId: string): Promise<void> {
    const startedAt = new Date().toISOString();

    try {
      const roomRef = doc(db, ROOMS_COLLECTION, roomId);
      await updateDoc(roomRef, {
        status: 'in_progress',
        startedAt,
      });
    } catch (err) {
      console.warn('Firestore startRoom failed, updating local:', err);
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
      console.warn('Firestore submitParticipantResult failed, updating local:', err);
    }

    const localRooms = getLocalRooms();
    if (localRooms[roomId] && localRooms[roomId].participants[participantId]) {
      const p = localRooms[roomId].participants[participantId];
      p.status = 'finished';
      p.score = result.score;
      p.maxScore = result.maxScore;
      p.percentage = result.percentage;
      p.timeSpentSeconds = result.timeSpentSeconds;
      p.finishedAt = finishedAt;
      saveLocalRoom(localRooms[roomId]);
    }
  },

  // Real-time room subscription with Firestore
  subscribeToRoom(
    roomId: string,
    callback: (room: ExamRoom | null) => void
  ): () => void {
    try {
      const roomRef = doc(db, ROOMS_COLLECTION, roomId);
      const unsubscribe = onSnapshot(
        roomRef,
        (snap) => {
          if (snap.exists()) {
            const data = snap.data() as ExamRoom;
            saveLocalRoom(data);
            callback(data);
          } else {
            callback(null);
          }
        },
        (error) => {
          console.warn('Firestore room snapshot error:', error);
          // Fallback to local snapshot polling
          const local = getLocalRooms()[roomId] || null;
          callback(local);
        }
      );
      return unsubscribe;
    } catch (err) {
      console.warn('subscribeToRoom initialization failed:', err);
      // Fallback
      const local = getLocalRooms()[roomId] || null;
      callback(local);
      return () => {};
    }
  },
};
