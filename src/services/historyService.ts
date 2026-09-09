import {
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  query,
  where,
} from 'firebase/firestore';
import { db } from './firebase';
import { handleFirestoreError, OperationType } from './firebaseErrors';
import { ExamResult } from '../types';

const STORAGE_KEY_EXAM_HISTORY = 'exam_ai_history';

export const historyService = {
  // Synchronous cached results
  getResults(userId?: string): ExamResult[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_EXAM_HISTORY);
      const all: ExamResult[] = raw ? JSON.parse(raw) : [];
      if (!userId) return all;
      return all.filter((r) => r.userId === userId);
    } catch {
      return [];
    }
  },

  // Asynchronous fetch from Firestore database with fallback to cache
  async fetchResultsFromDb(userId?: string): Promise<ExamResult[]> {
    const path = 'exam_results';
    try {
      let q;
      if (userId) {
        q = query(collection(db, path), where('userId', '==', userId));
      } else {
        q = collection(db, path);
      }

      const snap = await getDocs(q);
      const results: ExamResult[] = [];
      snap.forEach((d) => {
        results.push(d.data() as ExamResult);
      });

      if (results.length > 0) {
        // Merge into local storage
        const current = this.getResults();
        const map = new Map<string, ExamResult>();
        current.forEach((r) => map.set(r.id, r));
        results.forEach((r) => map.set(r.id, r));
        const merged = Array.from(map.values()).sort(
          (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
        );
        localStorage.setItem(STORAGE_KEY_EXAM_HISTORY, JSON.stringify(merged));
        return userId ? merged.filter((r) => r.userId === userId) : merged;
      }

      return this.getResults(userId);
    } catch (err) {
      console.warn('Could not fetch from Firestore, using local cached history:', err);
      return this.getResults(userId);
    }
  },

  // Save result locally and to Firestore
  async saveResult(result: ExamResult): Promise<void> {
    // 1. Save locally
    try {
      const all = this.getResults();
      const updated = [result, ...all.filter((r) => r.id !== result.id)];
      localStorage.setItem(STORAGE_KEY_EXAM_HISTORY, JSON.stringify(updated));
    } catch (err) {
      console.error('Error saving exam result locally', err);
    }

    // 2. Persist to Firestore: /exam_results/{resultId}
    const path = `exam_results/${result.id}`;
    try {
      await setDoc(doc(db, 'exam_results', result.id), result, { merge: true });
    } catch (err) {
      console.warn('Could not persist exam result to Firestore:', err);
      // Don't block user experience if offline
    }
  },

  // Delete result
  async deleteResult(id: string): Promise<void> {
    try {
      const all = this.getResults();
      const filtered = all.filter((r) => r.id !== id);
      localStorage.setItem(STORAGE_KEY_EXAM_HISTORY, JSON.stringify(filtered));
    } catch (err) {
      console.error('Error deleting exam result locally', err);
    }

    try {
      await deleteDoc(doc(db, 'exam_results', id));
    } catch (err) {
      console.warn('Could not delete from Firestore:', err);
    }
  },

  // Admin method to get all exam results across all users
  async getAllExamResultsFromDatabase(): Promise<ExamResult[]> {
    const path = 'exam_results';
    try {
      const snap = await getDocs(collection(db, path));
      const list: ExamResult[] = [];
      snap.forEach((d) => {
        list.push(d.data() as ExamResult);
      });
      return list.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, path);
    }
  },

  getUserStats(userId?: string) {
    const results = this.getResults(userId);
    const totalExams = results.length;
    if (totalExams === 0) {
      return {
        totalExams: 0,
        averagePercentage: 0,
        passedCount: 0,
        topSubject: '-',
      };
    }

    const sumPercentage = results.reduce((acc, r) => acc + r.percentage, 0);
    const avgPercentage = Math.round(sumPercentage / totalExams);
    const passed = results.filter((r) => r.percentage >= 50).length;

    // Count by subject
    const subjectCounts: Record<string, number> = {};
    results.forEach((r) => {
      subjectCounts[r.subject] = (subjectCounts[r.subject] || 0) + 1;
    });

    let topSubject = '-';
    let maxCount = 0;
    Object.entries(subjectCounts).forEach(([sub, count]) => {
      if (count > maxCount) {
        maxCount = count;
        topSubject = sub;
      }
    });

    return {
      totalExams,
      averagePercentage: avgPercentage,
      passedCount: passed,
      topSubject,
    };
  },
};
