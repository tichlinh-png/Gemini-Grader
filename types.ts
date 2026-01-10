
export interface ErrorDetail {
  wrong: string;
  correct: string;
  type: 'Grammar' | 'Spelling' | 'Punctuation' | 'Vocabulary' | 'Style';
  explanation: string;
}

export interface SentenceAnalysis {
  original: string;
  corrected: string;
  isCorrect: boolean;
  feedback: string;
}

export interface Assessment {
  strength: string;
  weakness: string;
  improvement: string;
}

export interface GradingResult {
  isReadable: boolean;
  unreadableReason?: string;
  recognizedText: string;
  errorCount: number;
  errors: ErrorDetail[];
  sentenceAnalysis: SentenceAnalysis[];
  score: number;
  assessment: Assessment;
}

export interface HistoryEntry {
  id: string;
  timestamp: number;
  result: GradingResult;
  title: string;
}

export type InputMode = 'upload' | 'draw';

export interface Point {
  x: number;
  y: number;
}
