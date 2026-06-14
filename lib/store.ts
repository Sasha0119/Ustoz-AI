import { create } from 'zustand';
import type { User, PathData, Certificate, Exercise, SavedProgress } from './types';

interface AppState {
  user: User | null;
  goal: string;
  level: string;
  pathData: PathData | null;
  currentLesson: number;
  lessonStates: Record<string, 'done'>;
  certificates: Certificate[];
  xp: number;
  streak: number;
  exercises: Record<string, Exercise>;
  explanations: Record<string, string>;
  notification: { message: string; color?: string } | null;
  isLoaded: boolean;
}

interface AppActions {
  setUser: (user: User | null) => void;
  setGoal: (goal: string) => void;
  setLevel: (level: string) => void;
  setPathData: (data: PathData | null) => void;
  setCurrentLesson: (idx: number) => void;
  markLessonDone: (idx: string) => void;
  addCertificate: (cert: Certificate) => void;
  addXp: (amount: number) => void;
  setExercise: (idx: string, ex: Exercise) => void;
  setExplanation: (idx: string, text: string) => void;
  showNotification: (message: string, color?: string) => void;
  loadProgress: (data: Partial<SavedProgress>) => void;
  resetProgress: () => void;
  resetCourse: () => void;
  setIsLoaded: (v: boolean) => void;
}

const useAppStore = create<AppState & AppActions>((set) => ({
  user: null,
  goal: '',
  level: '',
  pathData: null,
  currentLesson: 0,
  lessonStates: {},
  certificates: [],
  xp: 0,
  streak: 0,
  exercises: {},
  explanations: {},
  notification: null,
  isLoaded: false,

  setUser: (user) => set({ user }),
  setGoal: (goal) => set({ goal }),
  setLevel: (level) => set({ level }),
  // Clears per-lesson caches so stale exercises/explanations from a previous
  // course are never shown after a new learning path is generated.
  setPathData: (pathData) =>
    set({ pathData, exercises: {}, explanations: {}, lessonStates: {}, currentLesson: 0 }),
  setCurrentLesson: (currentLesson) => set({ currentLesson }),
  markLessonDone: (idx) =>
    set((s) => ({ lessonStates: { ...s.lessonStates, [idx]: 'done' } })),
  addCertificate: (cert) =>
    set((s) => ({ certificates: [...s.certificates, cert] })),
  addXp: (amount) => set((s) => ({ xp: s.xp + amount })),
  setExercise: (idx, ex) =>
    set((s) => ({ exercises: { ...s.exercises, [idx]: ex } })),
  setExplanation: (idx, text) =>
    set((s) => ({ explanations: { ...s.explanations, [idx]: text } })),
  showNotification: (message, color) => {
    set({ notification: { message, color } });
    setTimeout(() => set({ notification: null }), 3500);
  },
  loadProgress: (data) => set(data),
  resetProgress: () =>
    set({
      pathData: null,
      goal: '',
      level: '',
      lessonStates: {},
      certificates: [],
      xp: 0,
      streak: 0,
      exercises: {},
      explanations: {},
    }),
  resetCourse: () =>
    set({
      pathData: null,
      goal: '',
      level: '',
      lessonStates: {},
      exercises: {},
      explanations: {},
      currentLesson: 0,
    }),
  setIsLoaded: (isLoaded) => set({ isLoaded }),
}));

export default useAppStore;
