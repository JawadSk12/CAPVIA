export { QuestionType, DifficultyLevel, SessionStatus } from './common.types';

export interface Question {
  id: number;
  title: string;
  description: string;
  question_type: QuestionType;
  difficulty: DifficultyLevel;
  module_number: number;
  category: string | null;
  tags: string[];

  // Content
  problem_statement: string | null;
  context: string | null;
  requirements: string[] | null;
  constraints: string[] | null;

  // Coding questions
  language: string | null;
  starter_code: string | null;
  test_cases: TestCase[] | null;

  // Debugging questions
  buggy_code: string | null;
  expected_output: string | null;

  // Decision making
  options: Option[] | null;

  // Explanation
  scenario: string | null;
  key_points: string[] | null;

  evaluation_criteria: any;
  max_score: number;
  time_limit_seconds: number | null;
  hints: string[] | null;

  is_active: string;
  usage_count: number;
  average_score: number | null;
  created_at: string;
  updated_at: string;
}

export interface TestCase {
  input: string;
  expected_output: string;
  explanation: string;
  type?: string;
}

export interface Option {
  id: string;
  title: string;
  description: string;
  pros?: string[];
  cons?: string[];
}

export interface Session {
  id: number;
  session_token: string;
  access_code: string;
  candidate_id: number;
  candidate_email: string;
  candidate_name: string | null;

  test_name: string;
  test_description: string | null;
  role_being_tested: string | null;

  duration_minutes: number;
  start_time: string | null;
  end_time: string | null;
  actual_end: string | null;

  status: SessionStatus;

  question_ids: number[];
  current_question_index: number;
  completed_questions: number[];
  module_status: Record<string, any>;

  total_score: string | null;
  module_scores: Record<string, number> | null;
  behavior_score: string | null;
  cheating_risk_level: string | null;

  has_suspicious_activity: string;
  is_proctored: string;
  allow_code_execution: string;

  created_at: string;
  updated_at: string;
}

export interface Submission {
  question_id: number;
  answer_text?: string;
  code_answer?: string;
  selected_option?: string;
  explanation?: string;
  time_spent_seconds?: number;
}

export interface CodeExecutionRequest {
  code: string;
  language: string;
  test_cases?: TestCase[];
  input_data?: string;
}

export interface CodeExecutionResponse {
  status: string;
  output: string | null;
  error_message: string | null;
  execution_time_ms: number | null;
  memory_used_mb: number | null;
  test_cases_passed: number;
  test_cases_total: number;
  test_cases_results: any[] | null;
}

export interface BehaviorEvent {
  session_id: number;
  question_id?: number;
  event_type: string;
  event_data?: any;
  severity?: string;
  description?: string;
}

export interface Evaluation {
  id: number;
  session_id: number;

  accuracy_score: number | null;
  logic_score: number | null;
  speed_score: number | null;
  explanation_score: number | null;
  behavior_score: number | null;

  total_score: number | null;
  max_possible_score: number;

  cheating_risk_level: string | null;

  passed: string | null;
  grade: string | null;
  recommendation: string | null;

  created_at: string;
}