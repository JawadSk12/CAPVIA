import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Play, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { testApi } from '@/services/api/test';
import { CodeExecutionResponse, TestCase } from '@/types/test.types';
import { toast } from 'react-hot-toast';

interface CodeEditorProps {
  language: string;
  starterCode: string;
  testCases: TestCase[] | null;
  onCodeChange: (code: string) => void;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  language,
  starterCode,
  testCases,
  onCodeChange,
}) => {
  const [code, setCode] = useState(starterCode);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<CodeExecutionResponse | null>(null);

  useEffect(() => {
    setCode(starterCode);
  }, [starterCode]);

  const handleCodeChange = (value: string | undefined) => {
    const newCode = value || '';
    setCode(newCode);
    onCodeChange(newCode);
  };

  const handleRunCode = async () => {
    if (!code.trim()) {
      toast.error('Please write some code first');
      return;
    }

    setIsExecuting(true);
    setExecutionResult(null);

    try {
      const result = await testApi.executeCode({
        code,
        language: language.toLowerCase(),
        test_cases: testCases || undefined,
      });

      setExecutionResult(result);

      if (result.status === 'success') {
        if (testCases && result.test_cases_total > 0) {
          if (result.test_cases_passed === result.test_cases_total) {
            toast.success(`All ${result.test_cases_total} test cases passed!`);
          } else {
            toast.error(`${result.test_cases_passed}/${result.test_cases_total} test cases passed`);
          }
        } else {
          toast.success('Code executed successfully!');
        }
      } else {
        toast.error('Code execution failed');
      }
    } catch (error) {
      toast.error('Failed to execute code');
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Editor */}
      <div className="flex-1 border border-gray-300 rounded-lg overflow-hidden">
        <Editor
          height="100%"
          language={language.toLowerCase()}
          value={code}
          onChange={handleCodeChange}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            wordWrap: 'on',
          }}
        />
      </div>

      {/* Run Button */}
      <div className="mt-4">
        <Button
          onClick={handleRunCode}
          isLoading={isExecuting}
          leftIcon={<Play className="h-4 w-4" />}
        >
          {isExecuting ? 'Running...' : 'Run Code'}
        </Button>
      </div>

      {/* Execution Results */}
      {executionResult && (
        <div className="mt-4 space-y-4">
          {/* Status */}
          <div className="flex items-center gap-2">
            {executionResult.status === 'success' ? (
              <CheckCircle className="h-5 w-5 text-success-600" />
            ) : (
              <XCircle className="h-5 w-5 text-danger-600" />
            )}
            <span className="font-medium capitalize">{executionResult.status.replace('_', ' ')}</span>
          </div>

          {/* Test Cases Results */}
          {testCases && executionResult.test_cases_results && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-gray-700">Test Cases</h4>
              {executionResult.test_cases_results.map((result: any, index: number) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border ${result.passed
                      ? 'bg-success-50 border-success-200'
                      : 'bg-danger-50 border-danger-200'
                    }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">
                      Test Case {result.test_case_number}
                    </span>
                    {result.passed ? (
                      <CheckCircle className="h-4 w-4 text-success-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-danger-600" />
                    )}
                  </div>
                  <div className="text-xs space-y-1">
                    <div>
                      <span className="text-gray-600">Input: </span>
                      <code className="bg-white px-1 py-0.5 rounded">{result.input}</code>
                    </div>
                    <div>
                      <span className="text-gray-600">Expected: </span>
                      <code className="bg-white px-1 py-0.5 rounded">{result.expected_output}</code>
                    </div>
                    <div>
                      <span className="text-gray-600">Actual: </span>
                      <code className="bg-white px-1 py-0.5 rounded">{result.actual_output}</code>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Output */}
          {executionResult.output && (
            <div>
              <h4 className="font-medium text-sm text-gray-700 mb-2">Output</h4>
              <pre className="bg-gray-900 text-green-600 p-4 rounded-lg text-sm overflow-x-auto font-mono">
                {executionResult.output}
              </pre>
            </div>
          )}

          {/* Error */}
          {executionResult.error_message && (
            <div>
              <h4 className="font-medium text-sm text-danger-700 mb-2">Error</h4>
              <pre className="bg-danger-50 text-danger-900 p-4 rounded-lg text-sm overflow-x-auto font-mono border border-danger-200">
                {executionResult.error_message}
              </pre>
            </div>
          )}

          {/* Performance Metrics */}
          {executionResult.execution_time_ms !== null && (
            <div className="flex gap-4 text-sm text-gray-600">
              <div>
                <span className="font-medium">Execution Time: </span>
                {executionResult.execution_time_ms.toFixed(2)}ms
              </div>
              {executionResult.memory_used_mb !== null && (
                <div>
                  <span className="font-medium">Memory: </span>
                  {executionResult.memory_used_mb.toFixed(2)}MB
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};