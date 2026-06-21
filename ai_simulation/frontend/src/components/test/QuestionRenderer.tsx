import React, { useState } from 'react';
import { Question } from '@/types/test.types';
import { CodeEditor } from './CodeEditor';
import { Input } from '@/components/common/Input';
import { CheckCircle } from 'lucide-react';

interface QuestionRendererProps {
  question: Question;
  onAnswerChange: (answer: any) => void;
}

export const QuestionRenderer: React.FC<QuestionRendererProps> = ({
  question,
  onAnswerChange,
}) => {
  const [textAnswer, setTextAnswer] = useState('');
  const [codeAnswer, setCodeAnswer] = useState(question.starter_code || '');
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [explanation, setExplanation] = useState('');

  const handleTextChange = (value: string) => {
    setTextAnswer(value);
    onAnswerChange({ answer_text: value });
  };

  const handleCodeChange = (code: string) => {
    setCodeAnswer(code);
    onAnswerChange({ code_answer: code });
  };

  const handleOptionSelect = (optionId: string) => {
    setSelectedOption(optionId);
    onAnswerChange({ selected_option: optionId, explanation });
  };

  const handleExplanationChange = (value: string) => {
    setExplanation(value);
    onAnswerChange({ selected_option: selectedOption, explanation: value });
  };

  // Render based on question type
  if (question.question_type === 'coding' || question.question_type === 'debugging') {
    return (
      <div className="space-y-6">
        {/* Problem Statement */}
        <div className="prose max-w-none">
          <h3 className="text-lg font-semibold mb-2">{question.title}</h3>
          <p className="text-gray-700">{question.problem_statement}</p>

          {question.requirements && question.requirements.length > 0 && (
            <div className="mt-4">
              <h4 className="font-medium text-sm text-gray-700">Requirements:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                {question.requirements.map((req, idx) => (
                  <li key={idx}>{req}</li>
                ))}
              </ul>
            </div>
          )}

          {question.constraints && question.constraints.length > 0 && (
            <div className="mt-4">
              <h4 className="font-medium text-sm text-gray-700">Constraints:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                {question.constraints.map((constraint, idx) => (
                  <li key={idx}>{constraint}</li>
                ))}
              </ul>
            </div>
          )}

          {question.question_type === 'debugging' && question.buggy_code && (
            <div className="mt-4">
              <h4 className="font-medium text-sm text-gray-700">Buggy Code:</h4>
              <pre className="bg-gray-100 p-4 rounded-lg mt-2 text-sm overflow-x-auto">
                <code>{question.buggy_code}</code>
              </pre>
            </div>
          )}
        </div>

        {/* Code Editor */}
        <div className="h-[500px]">
          <CodeEditor
            language={question.language || 'python'}
            starterCode={question.starter_code || question.buggy_code || ''}
            testCases={question.test_cases}
            onCodeChange={handleCodeChange}
          />
        </div>
      </div>
    );
  }

  if (question.question_type === 'decision_making') {
    return (
      <div className="space-y-6">
        {/* Problem Statement */}
        <div className="prose max-w-none">
          <h3 className="text-lg font-semibold mb-2">{question.title}</h3>
          <p className="text-gray-700">{question.problem_statement}</p>
          {question.context && (
            <p className="text-sm text-gray-600 mt-2">{question.context}</p>
          )}
        </div>

        {/* Options */}
        <div className="space-y-4">
          {question.options?.map((option) => (
            <div
              key={option.id}
              onClick={() => handleOptionSelect(option.id)}
              className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${selectedOption === option.id
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-200 hover:border-gray-300'
                }`}
            >
              <div className="flex items-start gap-3">
                <div className={`mt-1 h-5 w-5 rounded-full border-2 flex items-center justify-center ${selectedOption === option.id
                  ? 'border-primary-500 bg-primary-500'
                  : 'border-gray-300'
                  }`}>
                  {selectedOption === option.id && (
                    <CheckCircle className="h-3 w-3 text-white" />
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{option.title}</h4>
                  <p className="text-sm text-gray-600 mt-1">{option.description}</p>

                  {option.pros && option.pros.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs font-medium text-success-700">Pros:</p>
                      <ul className="text-xs text-gray-600 list-disc list-inside">
                        {option.pros.map((pro, idx) => (
                          <li key={idx}>{pro}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {option.cons && option.cons.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs font-medium text-danger-700">Cons:</p>
                      <ul className="text-xs text-gray-600 list-disc list-inside">
                        {option.cons.map((con, idx) => (
                          <li key={idx}>{con}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Justification */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Justify your choice *
          </label>
          <textarea
            value={explanation}
            onChange={(e) => handleExplanationChange(e.target.value)}
            placeholder="Explain why you chose this option..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 min-h-[120px]"
          />
        </div>
      </div>
    );
  }

  // Text-based questions (problem_understanding, explanation)
  return (
    <div className="space-y-6">
      {/* Problem Statement */}
      <div className="prose max-w-none">
        <h3 className="text-lg font-semibold mb-2">{question.title}</h3>
        <p className="text-gray-700">{question.description}</p>

        {question.scenario && (
          <div className="mt-4 p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
            <p className="text-sm text-gray-700">{question.scenario}</p>
          </div>
        )}

        {question.key_points && question.key_points.length > 0 && (
          <div className="mt-4">
            <h4 className="font-medium text-sm text-gray-700">Key Points to Address:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
              {question.key_points.map((point, idx) => (
                <li key={idx}>{point}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Answer Input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Your Answer *
        </label>
        <textarea
          value={textAnswer}
          onChange={(e) => handleTextChange(e.target.value)}
          placeholder="Type your answer here..."
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 min-h-[200px]"
        />
        <p className="text-xs text-gray-500 mt-1">
          Minimum 50 words recommended
        </p>
      </div>
    </div>
  );
};