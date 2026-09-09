import { supabase, isSupabaseConfigured } from './supabase';
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

  // Helper to map a row from Supabase 'exams' table to an ExamResult
  mapRowToResult(row: any): ExamResult {
    if (row.data) {
      const parsed = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
      if (parsed && parsed.id && parsed.examTitle) {
        return {
          ...parsed,
          id: row.id || parsed.id,
          userId: row.user_id || parsed.userId,
        };
      }
    }

    // Fallback reconstruction if table stores columns directly
    return {
      id: row.id,
      examId: row.exam_id || `exam_${row.id}`,
      userId: row.user_id || 'guest',
      userEmail: row.user_email || undefined,
      userName: row.user_name || undefined,
      examTitle: row.title || row.exam_title || 'Examen',
      subject: row.subject || 'General',
      topic: row.topic || 'Temario',
      level: row.level || 'Bachillerato',
      completedAt: row.completed_at || row.created_at || new Date().toISOString(),
      totalScore: Number(row.score ?? row.total_score ?? 0),
      maxPossibleScore: Number(row.max_score ?? row.max_possible_score ?? 10),
      percentage: Number(row.percentage ?? 0),
      testScore: Number(row.test_score ?? 0),
      maxTestScore: Number(row.max_test_score ?? 0),
      openScore: Number(row.open_score ?? 0),
      maxOpenScore: Number(row.max_open_score ?? 0),
      feedbackByQuestion: row.feedback_by_question || {},
      generalFeedback: row.general_feedback || 'Examen completado.',
      examData: row.exam_data || {
        id: row.exam_id || row.id,
        title: row.title || 'Examen',
        subject: row.subject || 'General',
        topic: row.topic || 'Temario',
        level: row.level || 'Bachillerato',
        difficulty: 'Media',
        createdAt: row.created_at || new Date().toISOString(),
        overview: '',
        questions: [],
        totalPoints: row.max_score || 10,
      },
      userAnswers: row.user_answers || {},
    };
  },

  // Asynchronous fetch from Supabase 'exams' table for a specific user
  async fetchResultsFromDb(userId?: string): Promise<ExamResult[]> {
    if (!isSupabaseConfigured()) {
      return this.getResults(userId);
    }

    try {
      let query = supabase.from('exams').select('*');

      if (userId && userId !== 'guest' && userId !== 'all') {
        query = query.eq('user_id', userId);
      }

      // Order newest first
      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.warn('Error querying Supabase table "exams":', error.message);
        return this.getResults(userId);
      }

      if (data && Array.isArray(data)) {
        const fetchedList: ExamResult[] = data.map((row) => this.mapRowToResult(row));

        // Merge with local storage cache to ensure offline resilience
        const currentCached = this.getResults();
        const map = new Map<string, ExamResult>();
        currentCached.forEach((r) => map.set(r.id, r));
        fetchedList.forEach((r) => map.set(r.id, r));

        const merged = Array.from(map.values()).sort(
          (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
        );

        localStorage.setItem(STORAGE_KEY_EXAM_HISTORY, JSON.stringify(merged));
        return userId && userId !== 'all' ? merged.filter((r) => r.userId === userId) : merged;
      }

      return this.getResults(userId);
    } catch (err) {
      console.warn('Could not fetch from Supabase table "exams", using cached data:', err);
      return this.getResults(userId);
    }
  },

  // Save result locally and persist to Supabase 'exams' table
  async saveResult(result: ExamResult): Promise<void> {
    // 1. Always update local storage first for instantaneous UI update
    try {
      const all = this.getResults();
      const updated = [result, ...all.filter((r) => r.id !== result.id)];
      localStorage.setItem(STORAGE_KEY_EXAM_HISTORY, JSON.stringify(updated));
    } catch (err) {
      console.error('Error saving exam result locally:', err);
    }

    // 2. Persist to Supabase table 'exams' if configured
    if (!isSupabaseConfigured()) {
      return;
    }

    try {
      const fullRow = {
        id: result.id,
        user_id: result.userId,
        title: result.examTitle,
        subject: result.subject,
        topic: result.topic,
        level: result.level,
        score: result.totalScore,
        max_score: result.maxPossibleScore,
        percentage: result.percentage,
        data: result,
        created_at: result.completedAt || new Date().toISOString(),
      };

      const { error } = await supabase.from('exams').upsert(fullRow);

      if (error) {
        console.warn('Full upsert to "exams" had an issue, trying minimal payload:', error.message);
        // Fallback for custom schemas that only have { id, user_id, data }
        const minimalRow = {
          id: result.id,
          user_id: result.userId,
          data: result,
        };
        const { error: minError } = await supabase.from('exams').upsert(minimalRow);
        if (minError) {
          console.warn('Fallback upsert also returned error:', minError.message);
        }
      }
    } catch (err) {
      console.warn('Could not persist exam to Supabase table "exams":', err);
    }
  },

  // Delete result locally and from Supabase 'exams' table
  async deleteResult(id: string): Promise<void> {
    try {
      const all = this.getResults();
      const filtered = all.filter((r) => r.id !== id);
      localStorage.setItem(STORAGE_KEY_EXAM_HISTORY, JSON.stringify(filtered));
    } catch (err) {
      console.error('Error deleting exam result locally:', err);
    }

    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase.from('exams').delete().eq('id', id);
        if (error) {
          console.warn('Error deleting record from "exams" table:', error.message);
        }
      } catch (err) {
        console.warn('Could not delete from Supabase:', err);
      }
    }
  },

  // Get all exam results across all users (for Admin view)
  async getAllExamResultsFromDatabase(): Promise<ExamResult[]> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('exams')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data && Array.isArray(data)) {
          return data.map((row) => this.mapRowToResult(row));
        }
      } catch (err) {
        console.warn('Error loading all exams from Supabase:', err);
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
