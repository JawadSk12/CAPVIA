/**
 * Application constants
 */

export const APP_NAME = 'AI Simulation Engine';
export const APP_VERSION = '1.0.0';

export const QUESTION_TYPES = {
  PROBLEM_UNDERSTANDING: 'problem_understanding',
  CODING: 'coding',
  IMPLEMENTATION: 'implementation',
  DATA_HANDLING: 'data_handling',
  DECISION_MAKING: 'decision_making',
  EXPLANATION: 'explanation',
  DEBUGGING: 'debugging',
} as const;

export const DIFFICULTY_LEVELS = {
  EASY: 'easy',
  MEDIUM: 'medium',
  HARD: 'hard',
} as const;

export const SESSION_STATUS = {
  CREATED: 'created',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  EXPIRED: 'expired',
  TERMINATED: 'terminated',
} as const;

export const USER_ROLES = {
  ADMIN: 'admin',
  SUPER_ADMIN: 'super_admin',
  CANDIDATE: 'candidate',
} as const;

export const PROGRAMMING_LANGUAGES = {
  PYTHON: 'python',
  JAVASCRIPT: 'javascript',
  TYPESCRIPT: 'typescript',
  JAVA: 'java',
  CPP: 'cpp',
  GO: 'go',
} as const;

export const MODULE_NAMES = {
  1: 'Problem Understanding',
  2: 'Coding & Implementation',
  3: 'Decision Making',
  4: 'Technical Explanation',
  5: 'Debugging',
} as const;

export const RISK_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
} as const;

export const GRADES = ['A', 'B', 'C', 'D', 'F'] as const;

export const RECOMMENDATIONS = {
  STRONG_HIRE: 'strong_hire',
  HIRE: 'hire',
  MAYBE: 'maybe',
  REJECT: 'reject',
} as const;

// Time constants
export const ONE_SECOND = 1000;
export const ONE_MINUTE = 60 * ONE_SECOND;
export const ONE_HOUR = 60 * ONE_MINUTE;

// Auto-save interval
export const AUTO_SAVE_INTERVAL = 30 * ONE_SECOND;

// Debounce delays
export const SEARCH_DEBOUNCE = 300;
export const INPUT_DEBOUNCE = 500;

// Pagination
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// Code editor settings
export const EDITOR_THEMES = ['vs-dark', 'vs-light', 'hc-black'] as const;
export const DEFAULT_EDITOR_THEME = 'vs-dark';
export const DEFAULT_EDITOR_FONT_SIZE = 14;