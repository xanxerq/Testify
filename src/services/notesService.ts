import { StudyNote } from '../types';
import { supabase, isSupabaseConfigured } from './supabase';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  query,
  orderBy,
  updateDoc,
  increment,
} from 'firebase/firestore';
import { db } from './firebase';

const STORAGE_KEY_STUDY_NOTES = 'testify_study_notes';
const STORAGE_KEY_PUBLISHED_CACHE = 'testify_published_notes_cache';
const PUBLISHED_COLLECTION = 'published_notes';

export const notesService = {
  // Synchronous read from localStorage (clean, no automatic biology seeding)
  getNotes(userId?: string): StudyNote[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_STUDY_NOTES);
      let list: StudyNote[] = raw ? JSON.parse(raw) : [];

      // Clean up any legacy starter biology note so it never forces itself onto the user
      const hadStarter = list.some((n) => n.id === 'starter_note_fotosintesis');
      if (hadStarter) {
        list = list.filter((n) => n.id !== 'starter_note_fotosintesis');
        localStorage.setItem(STORAGE_KEY_STUDY_NOTES, JSON.stringify(list));
      }

      if (!userId || userId === 'guest' || userId === 'all') {
        return list;
      }

      return list.filter((n) => !n.userId || n.userId === userId || n.userId === 'guest');
    } catch (e) {
      console.warn('Error reading notes from localStorage:', e);
      return [];
    }
  },

  // Save or update a note in user's personal collection
  async saveNote(note: StudyNote, userId?: string): Promise<StudyNote> {
    const updatedNote: StudyNote = {
      ...note,
      userId: userId || note.userId || 'guest',
      createdAt: note.createdAt || new Date().toISOString(),
    };

    try {
      const currentNotes = this.getNotes();
      const existingIdx = currentNotes.findIndex((n) => n.id === updatedNote.id);

      let newList: StudyNote[];
      if (existingIdx >= 0) {
        newList = [...currentNotes];
        newList[existingIdx] = updatedNote;
      } else {
        newList = [updatedNote, ...currentNotes];
      }

      localStorage.setItem(STORAGE_KEY_STUDY_NOTES, JSON.stringify(newList));

      // If this note was previously published, update the published version in Firestore too
      if (updatedNote.isPublished) {
        try {
          const docRef = doc(db, PUBLISHED_COLLECTION, updatedNote.id);
          await setDoc(docRef, updatedNote, { merge: true });
        } catch (fErr) {
          console.warn('Error updating published note in Firestore:', fErr);
        }
      }

      // Attempt background save to Supabase if configured
      if (isSupabaseConfigured() && userId && userId !== 'guest') {
        try {
          await supabase.from('study_notes').upsert({
            id: updatedNote.id,
            user_id: userId,
            title: updatedNote.title,
            subject: updatedNote.subject,
            topic: updatedNote.topic,
            level: updatedNote.level,
            style: updatedNote.style,
            data: updatedNote,
            created_at: updatedNote.createdAt,
          });
        } catch (dbErr) {
          console.debug('Supabase notes sync note:', dbErr);
        }
      }

      return updatedNote;
    } catch (e) {
      console.error('Error saving note:', e);
      return updatedNote;
    }
  },

  // Delete a note from user collection (and unpublish from community if it was published)
  async deleteNote(id: string): Promise<boolean> {
    try {
      const currentNotes = this.getNotes();
      const targetNote = currentNotes.find((n) => n.id === id);
      const filtered = currentNotes.filter((n) => n.id !== id);
      localStorage.setItem(STORAGE_KEY_STUDY_NOTES, JSON.stringify(filtered));

      // Remove from published collection if it was public
      if (targetNote?.isPublished) {
        try {
          await deleteDoc(doc(db, PUBLISHED_COLLECTION, id));
        } catch (fErr) {
          console.warn('Error removing published note from Firestore:', fErr);
        }
      }

      if (isSupabaseConfigured()) {
        try {
          await supabase.from('study_notes').delete().eq('id', id);
        } catch (dbErr) {
          console.debug('Supabase notes delete note:', dbErr);
        }
      }

      return true;
    } catch (e) {
      console.error('Error deleting note:', e);
      return false;
    }
  },

  // Fetch single note by ID
  getNoteById(id: string): StudyNote | undefined {
    const all = this.getNotes();
    return all.find((n) => n.id === id);
  },

  // Publicar un apunte en la comunidad (Firestore)
  async publishNote(
    note: StudyNote,
    authorName: string,
    authorEmail?: string
  ): Promise<StudyNote> {
    const publishedNote: StudyNote = {
      ...note,
      isPublished: true,
      publishedAt: note.publishedAt || new Date().toISOString(),
      authorName: authorName.trim() || note.authorName || 'Estudiante',
      authorEmail: authorEmail || note.authorEmail,
      likesCount: note.likesCount ?? 0,
      downloadsCount: note.downloadsCount ?? 0,
    };

    // 1. Guardar en Firestore para que sea visible por toda la comunidad
    try {
      const docRef = doc(db, PUBLISHED_COLLECTION, publishedNote.id);
      await setDoc(docRef, publishedNote);
    } catch (err) {
      console.warn('Firestore publish error, caching locally:', err);
    }

    // 2. Actualizar estado local
    await this.saveNote(publishedNote);

    // 3. Actualizar caché de notas públicas locales
    try {
      const cached = this.getCachedPublishedNotes();
      const updatedCache = [
        publishedNote,
        ...cached.filter((n) => n.id !== publishedNote.id),
      ];
      localStorage.setItem(STORAGE_KEY_PUBLISHED_CACHE, JSON.stringify(updatedCache));
    } catch (e) {
      console.warn('Cache update error:', e);
    }

    return publishedNote;
  },

  // Despublicar un apunte (retirarlo de la comunidad)
  async unpublishNote(noteId: string): Promise<StudyNote | null> {
    const currentNotes = this.getNotes();
    const target = currentNotes.find((n) => n.id === noteId);
    if (!target) return null;

    const unpublishedNote: StudyNote = {
      ...target,
      isPublished: false,
    };

    // 1. Eliminar de Firestore
    try {
      const docRef = doc(db, PUBLISHED_COLLECTION, noteId);
      await deleteDoc(docRef);
    } catch (err) {
      console.warn('Firestore unpublish error:', err);
    }

    // 2. Actualizar en colección personal
    await this.saveNote(unpublishedNote);

    // 3. Retirar de caché pública
    try {
      const cached = this.getCachedPublishedNotes();
      const updatedCache = cached.filter((n) => n.id !== noteId);
      localStorage.setItem(STORAGE_KEY_PUBLISHED_CACHE, JSON.stringify(updatedCache));
    } catch (e) {
      console.warn('Cache update error:', e);
    }

    return unpublishedNote;
  },

  // Leer notas públicas de la caché local para renderizado instantáneo
  getCachedPublishedNotes(): StudyNote[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_PUBLISHED_CACHE);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  // Obtener todos los apuntes publicados en la comunidad desde Firestore
  async getPublishedNotes(): Promise<StudyNote[]> {
    try {
      const q = query(
        collection(db, PUBLISHED_COLLECTION),
        orderBy('publishedAt', 'desc')
      );
      const snapshot = await getDocs(q);

      const notes: StudyNote[] = [];
      snapshot.forEach((d) => {
        notes.push(d.data() as StudyNote);
      });

      // Guardar en caché local para acceso offline y mayor velocidad
      localStorage.setItem(STORAGE_KEY_PUBLISHED_CACHE, JSON.stringify(notes));
      return notes;
    } catch (err) {
      console.warn('Error fetching published notes from Firestore, using cache:', err);
      return this.getCachedPublishedNotes();
    }
  },

  // Dar 'Like' o recomendar un apunte publicado
  async likePublishedNote(noteId: string): Promise<number> {
    try {
      const docRef = doc(db, PUBLISHED_COLLECTION, noteId);
      await updateDoc(docRef, {
        likesCount: increment(1),
      });
    } catch (err) {
      console.warn('Error incrementing likes in Firestore:', err);
    }

    // Actualizar en caché local
    const cached = this.getCachedPublishedNotes();
    let newLikes = 1;
    const updated = cached.map((n) => {
      if (n.id === noteId) {
        newLikes = (n.likesCount || 0) + 1;
        return { ...n, likesCount: newLikes };
      }
      return n;
    });
    localStorage.setItem(STORAGE_KEY_PUBLISHED_CACHE, JSON.stringify(updated));

    return newLikes;
  },

  // Guardar una copia de un apunte de la comunidad en "Mis Apuntes"
  async copyPublishedNoteToMyNotes(publishedNote: StudyNote, userId?: string): Promise<StudyNote> {
    const clonedNote: StudyNote = {
      ...publishedNote,
      id: `note_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId: userId || 'guest',
      title: `${publishedNote.title} (Copia)`,
      createdAt: new Date().toISOString(),
      isPublished: false,
    };
    return await this.saveNote(clonedNote, userId);
  },
};
