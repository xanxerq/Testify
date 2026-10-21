import { getPocketBaseUrl, getPocketBaseToken } from './pocketbase';
import { ExamResult } from '../types';

const STORAGE_KEY_EXAM_HISTORY = 'testify_exam_history';

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

  // Fetch results from PocketBase 'exams' collection
  async fetchResultsFromDb(userId?: string): Promise<ExamResult[]> {
    const cached = this.getResults(userId);
    const pbUrl = getPocketBaseUrl();

    if (!pbUrl) {
      return cached;
    }

    try {
      const token = getPocketBaseToken();
      let endpoint = `${pbUrl}/api/collections/exams/records?perPage=100&sort=-created`;
      if (userId && userId !== 'guest' && userId !== 'all' && !userId.startsWith('guest_')) {
        endpoint += `&filter=(userId='${userId}')`;
      }

      const res = await fetch(endpoint, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          ...(token ? { Authorization: token } : {}),
        },
      });

      if (res.ok) {
        const data = await res.json();
        const items = data.items || [];
        const fetchedList: ExamResult[] = items.map((rec: any) => ({
          id: rec.id,
          examId: rec.examId || rec.id,
          userId: rec.userId || 'usuario',
          userEmail: rec.userEmail,
          userName: rec.userName,
          examTitle: rec.examTitle || 'Examen',
          subject: rec.subject || 'General',
          topic: rec.topic || 'Temario',
          level: rec.level || 'Secundaria (ESO)',
          completedAt: rec.completedAt || rec.created || new Date().toISOString(),
          totalScore: Number(rec.totalScore ?? 0),
          maxPossibleScore: Number(rec.maxPossibleScore ?? 10),
          percentage: Number(rec.percentage ?? 0),
          testScore: Number(rec.testScore ?? 0),
          maxTestScore: Number(rec.maxTestScore ?? 0),
          openScore: Number(rec.openScore ?? 0),
          maxOpenScore: Number(rec.maxOpenScore ?? 0),
          feedbackByQuestion: rec.feedbackByQuestion || {},
          generalFeedback: rec.generalFeedback || 'Examen completado.',
          examData: rec.examData || {
            id: rec.examId || rec.id,
            title: rec.examTitle || 'Examen',
            subject: rec.subject || 'General',
            topic: rec.topic || 'Temario',
            level: rec.level || 'Secundaria (ESO)',
            difficulty: 'Media',
            createdAt: rec.created || new Date().toISOString(),
            overview: '',
            questions: [],
            totalPoints: 10,
          },
          userAnswers: rec.userAnswers || {},
        }));

        // Merge with local storage cache
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
      console.warn('Could not fetch exams from PocketBase, using local cache:', err);
    }

    return cached;
  },

  // Save result locally and persist to PocketBase
  async saveResult(result: ExamResult): Promise<void> {
    // 1. Always update local storage first
    try {
      const all = this.getResults();
      const updated = [result, ...all.filter((r) => r.id !== result.id)];
      localStorage.setItem(STORAGE_KEY_EXAM_HISTORY, JSON.stringify(updated));
    } catch (err) {
      console.error('Error saving exam result locally:', err);
    }

    // 2. Persist to PocketBase 'exams' collection
    const pbUrl = getPocketBaseUrl();
    if (!pbUrl) return;

    try {
      const token = getPocketBaseToken();
      await fetch(`${pbUrl}/api/collections/exams/records`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: token } : {}),
        },
        body: JSON.stringify({
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
        }),
      });
    } catch (err) {
      console.warn('Notice saving exam to PocketBase:', err);
    }
  },

  // Delete result locally and from PocketBase
  async deleteResult(id: string): Promise<void> {
    try {
      const all = this.getResults();
      const filtered = all.filter((r) => r.id !== id);
      localStorage.setItem(STORAGE_KEY_EXAM_HISTORY, JSON.stringify(filtered));
    } catch (err) {
      console.error('Error deleting exam result locally:', err);
    }

    const pbUrl = getPocketBaseUrl();
    if (!pbUrl) return;

    try {
      const token = getPocketBaseToken();
      await fetch(`${pbUrl}/api/collections/exams/records/${id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: token } : {},
      });
    } catch (err) {
      console.warn('Notice deleting from PocketBase:', err);
    }
  },

  // Get all exam results (for Admin view)
  async getAllExamResultsFromDatabase(): Promise<ExamResult[]> {
    const pbUrl = getPocketBaseUrl();
    if (pbUrl) {
      try {
        const token = getPocketBaseToken();
        const res = await fetch(`${pbUrl}/api/collections/exams/records?perPage=200&sort=-created`, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            ...(token ? { Authorization: token } : {}),
          },
        });
        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.items) && data.items.length > 0) {
            return data.items.map((rec: any) => ({
              id: rec.id,
              examId: rec.examId || rec.id,
              userId: rec.userId || 'usuario',
              userEmail: rec.userEmail,
              userName: rec.userName,
              examTitle: rec.examTitle || 'Examen',
              subject: rec.subject || 'General',
              topic: rec.topic || 'Temario',
              level: rec.level || 'Secundaria (ESO)',
              completedAt: rec.completedAt || rec.created || new Date().toISOString(),
              totalScore: Number(rec.totalScore ?? 0),
              maxPossibleScore: Number(rec.maxPossibleScore ?? 10),
              percentage: Number(rec.percentage ?? 0),
              testScore: Number(rec.testScore ?? 0),
              maxTestScore: Number(rec.maxTestScore ?? 0),
              openScore: Number(rec.openScore ?? 0),
              maxOpenScore: Number(rec.maxOpenScore ?? 0),
              feedbackByQuestion: rec.feedbackByQuestion || {},
              generalFeedback: rec.generalFeedback || 'Examen completado.',
              examData: rec.examData,
              userAnswers: rec.userAnswers || {},
            }));
          }
        }
      } catch (err) {
        console.warn('Notice loading all exams from PocketBase:', err);
      }
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
