export interface User {
  id: string;
  name: string;
  isAdmin: boolean;
}

export interface StoredUser {
  id: string;
  name: string;
  passHash: string;
  isAdmin: boolean;
  xp: number;
  streak: number;
  joined: string;
}

export interface Lesson {
  title: string;
  subtitle: string;
  xp: number;
}

export interface PathData {
  courseName: string;
  lessons: Lesson[];
}

export interface Certificate {
  id: string;
  name: string;
  course: string;
  level: string;
  date: string;
  xpEarned: number;
}

export interface Exercise {
  question: string;
  hint: string;
  sampleAnswer: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface SavedProgress {
  pathData: PathData | null;
  goal: string;
  level: string;
  lessonStates: Record<string, 'done'>;
  certificates: Certificate[];
  xp: number;
  streak: number;
  exercises: Record<string, Exercise>;
}
