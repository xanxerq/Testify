import { HomeworkSolution } from '../types';

const STORAGE_KEY_HOMEWORK = 'testify_solved_homeworks';

export const homeworkService = {
  // Get all solved homework items from local storage
  getHomeworkList(userId?: string): HomeworkSolution[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_HOMEWORK);
      if (!raw) return [];
      const list: HomeworkSolution[] = JSON.parse(raw);

      if (!userId || userId === 'guest' || userId === 'all') {
        return list;
      }

      return list.filter((item) => !item.userId || item.userId === userId || item.userId === 'guest');
    } catch (err) {
      console.warn('Error loading homework history from localStorage:', err);
      return [];
    }
  },

  // Save or prepend solved homework
  saveHomework(homework: HomeworkSolution, userId?: string): HomeworkSolution {
    const itemToSave: HomeworkSolution = {
      ...homework,
      userId: userId || homework.userId || 'guest',
      createdAt: homework.createdAt || new Date().toISOString(),
    };

    try {
      const currentList = this.getHomeworkList();
      const existingIndex = currentList.findIndex((h) => h.id === itemToSave.id);

      let updatedList: HomeworkSolution[];
      if (existingIndex >= 0) {
        updatedList = [...currentList];
        updatedList[existingIndex] = itemToSave;
      } else {
        updatedList = [itemToSave, ...currentList];
      }

      // Limit storage to recent 50 solved homeworks
      if (updatedList.length > 50) {
        updatedList = updatedList.slice(0, 50);
      }

      localStorage.setItem(STORAGE_KEY_HOMEWORK, JSON.stringify(updatedList));
    } catch (err) {
      console.warn('Error saving homework to localStorage:', err);
    }

    return itemToSave;
  },

  // Delete single homework
  deleteHomework(id: string): void {
    try {
      const currentList = this.getHomeworkList();
      const filtered = currentList.filter((h) => h.id !== id);
      localStorage.setItem(STORAGE_KEY_HOMEWORK, JSON.stringify(filtered));
    } catch (err) {
      console.warn('Error deleting homework from localStorage:', err);
    }
  },

  // Clear all homeworks
  clearAllHomework(): void {
    try {
      localStorage.removeItem(STORAGE_KEY_HOMEWORK);
    } catch (err) {
      console.warn('Error clearing homework from localStorage:', err);
    }
  },
};
