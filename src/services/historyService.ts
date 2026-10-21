import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
} from 'firebase/firestore';
import { db } from './firebase';
import { ExamResult } from '../types';

const STORAGE_KEY_EXAM_HISTORY = 'testify_exam_history';
const EXAM_RESULTS_COLLECTION = 'exam_results';

export const historyService = {
  // Synchronous cached results from localStorage
  getResults(userId?: string): ExamResult[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_EXAM_HISTORY);
      const all: ExamResult[] = raw ? JSON.parse(raw) : [];
      if (!userId || userId === 'all') return all;
      return all.filter((r) => r.userId === userId);
    } catch {
      return [];
    }
  },

  // Asynchronous fetch from Firestore 'exam_results' collection
  async fetchResultsFromDb(userId?: string): Promise<ExamResult[]> {
    const cached = this.getResults(userId);

    try {
      let q = collection(db, EXAM_RESULTS_COLLECTION);
      let snap;

      if (userId && userId !== 'guest' && userId !== 'all' && !userId.startsWith('guest_')) {
        const userQuery = query(q, where('userId', '==', userId));
        snap = await getDocs(userQuery);
      } else {
        snap = await getDocs(q);
      }

      if (snap && !snap.empty) {
        const fetchedList: ExamResult[] = [];
        snap.forEach((docSnap) => {
          const data = docSnap.data() as ExamResult;
          fetchedList.push({
            ...data,
            id: data.id || docSnap.id,
          });
        });

        // Merge with local storage cache to ensure resilience
        const map = new Map<string, ExamResult>();
        cached.forEach((r) => map.set(r.id, r));
        fetchedList.forEach((r) => map.set(r.id, r));

        const merged = Array.from(map.values()).sort(
          (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
        );

        localStorage.setItem(STORAGE_KEY_EXAM_HISTORY, JSON.stringify(merged));
        return userId && userId !== 'all' ? merged.filter((r) => r.userId === userId) : merged;
      }
    } catch (err) {
      console.warn('Could not fetch from Firestore collection "exam_results", using cached data:', err);
    }

    return cached;
  },

  // Save result locally and persist to Firestore 'exam_results'
  async saveResult(result: ExamResult): Promise<void> {
    // 1. Always update local storage first for instantaneous UI update
    try {
      const all = this.getResults();
      const updated = [result, ...all.filter((r) => r.id !== result.id)];
      localStorage.setItem(STORAGE_KEY_EXAM_HISTORY, JSON.stringify(updated));
    } catch (err) {
      console.error('Error saving exam result locally:', err);
    }

    // 2. Persist to Firestore if online
    try {
      const resultDocRef = doc(db, EXAM_RESULTS_COLLECTION, result.id);
      await setDoc(resultDocRef, {
        id: result.id,
        examId: result.examId,
        userId: result.userId,
        userEmail: result.userEmail || '',
        userName: result.userName || '',
        examTitle: result.examTitle,
        subject: result.subject,
        topic: result.topic,
        level: result.level,
        completedAt: result.completedAt || new Date().toISOString(),
        totalScore: Number(result.totalScore ?? 0),
        maxPossibleScore: Number(result.maxPossibleScore ?? 10),
        percentage: Number(result.percentage ?? 0),
        testScore: Number(result.testScore ?? 0),
        maxTestScore: Number(result.maxTestScore ?? 0),
        openScore: Number(result.openScore ?? 0),
        maxOpenScore: Number(result.maxOpenScore ?? 0),
        feedbackByQuestion: result.feedbackByQuestion || {},
        generalFeedback: result.generalFeedback || 'Examen completado.',
        examData: result.examData,
        userAnswers: result.userAnswers || {},
      });
    } catch (err) {
      console.warn('Notice saving to Firestore "exam_results":', err);
    }
  },

  // Delete result locally and from Firestore
  async deleteResult(id: string): Promise<void> {
    try {
      const all = this.getResults();
      const filtered = all.filter((r) => r.id !== id);
      localStorage.setItem(STORAGE_KEY_EXAM_HISTORY, JSON.stringify(filtered));
    } catch (err) {
      console.error('Error deleting exam result locally:', err);
    }

    try {
      await deleteDoc(doc(db, EXAM_RESULTS_COLLECTION, id));
    } catch (err) {
      console.warn('Notice deleting from Firestore:', err);
    }
  },

  // Get all exam results across all users (for Admin view)
  async getAllExamResultsFromDatabase(): Promise<ExamResult[]> {
    try {
      const snap = await getDocs(collection(db, EXAM_RESULTS_COLLECTION));
      if (!snap.empty) {
        const list: ExamResult[] = [];
        snap.forEach((docSnap) => {
          list.push(docSnap.data() as ExamResult);
        });
        return list.sort(
          (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
        );
      }
    } catch (err) {
      console.warn('Error loading all exams from Firestore:', err);
    }
    return this.getResults();
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
