import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Clock, AlertTriangle, Code } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { useTestStore } from '@/store/testStore';

export const TestInstructions: React.FC = () => {
    const navigate = useNavigate();
    const session = useTestStore((state) => state.session);

    if (!session) {
        navigate('/test/access');
        return null;
    }

    const handleStartTest = () => {
        navigate('/test/interface');
    };

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-4xl mx-auto px-4">
                {/* Header */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-6">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">{session.test_name}</h1>
                    <p className="text-gray-600">{session.test_description}</p>

                    <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
                            <Clock className="h-8 w-8 text-blue-600" />
                            <div>
                                <p className="text-sm text-gray-600">Duration</p>
                                <p className="font-semibold text-gray-900">{session.duration_minutes} minutes</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
                            <CheckCircle className="h-8 w-8 text-green-600" />
                            <div>
                                <p className="text-sm text-gray-600">Questions</p>
                                <p className="font-semibold text-gray-900">{session.question_ids.length} total</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-lg">
                            <Code className="h-8 w-8 text-purple-600" />
                            <div>
                                <p className="text-sm text-gray-600">Format</p>
                                <p className="font-semibold text-gray-900">Multi-format</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Instructions */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Test Instructions</h2>

                    <div className="space-y-6">
                        {/* General Instructions */}
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                <CheckCircle className="h-5 w-5 text-green-600" />
                                General Guidelines
                            </h3>
                            <ul className="space-y-2 text-gray-700 ml-7">
                                <li>• Read each question carefully before answering</li>
                                <li>• You can navigate between questions freely</li>
                                <li>• Your progress is automatically saved</li>
                                <li>• Submit your answers before time runs out</li>
                                <li>• Once submitted, you cannot modify your answers</li>
                            </ul>
                        </div>

                        {/* Test Modules */}
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                <Code className="h-5 w-5 text-blue-600" />
                                Test Modules
                            </h3>
                            <div className="space-y-3 ml-7">
                                <div className="p-3 bg-gray-50 rounded-lg">
                                    <p className="font-medium text-gray-900">Module 1: Problem Understanding</p>
                                    <p className="text-sm text-gray-600">Analyze and interpret technical requirements</p>
                                </div>
                                <div className="p-3 bg-gray-50 rounded-lg">
                                    <p className="font-medium text-gray-900">Module 2: Coding & Implementation</p>
                                    <p className="text-sm text-gray-600">Write code to solve practical problems</p>
                                </div>
                                <div className="p-3 bg-gray-50 rounded-lg">
                                    <p className="font-medium text-gray-900">Module 3: Decision Making</p>
                                    <p className="text-sm text-gray-600">Choose optimal technical approaches</p>
                                </div>
                                <div className="p-3 bg-gray-50 rounded-lg">
                                    <p className="font-medium text-gray-900">Module 4: Technical Explanation</p>
                                    <p className="text-sm text-gray-600">Explain complex concepts clearly</p>
                                </div>
                                <div className="p-3 bg-gray-50 rounded-lg">
                                    <p className="font-medium text-gray-900">Module 5: Debugging</p>
                                    <p className="text-sm text-gray-600">Identify and fix code issues</p>
                                </div>
                            </div>
                        </div>

                        {/* Important Notes */}
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-warning-600" />
                                Important Notes
                            </h3>
                            <div className="ml-7 p-4 bg-warning-50 border border-warning-200 rounded-lg">
                                <ul className="space-y-2 text-sm text-warning-900">
                                    <li>• This test is monitored for suspicious activity</li>
                                    <li>• Do not switch tabs or leave the test window</li>
                                    <li>• Copy-paste is tracked and may affect your score</li>
                                    <li>• Excessive tab switching will be flagged</li>
                                    <li>• Work independently - collaboration is not permitted</li>
                                </ul>
                            </div>
                        </div>

                        {/* Code Execution */}
                        {session.allow_code_execution === 'true' && (
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-3">Code Execution</h3>
                                <p className="text-gray-700 ml-7">
                                    You can test your code using the "Run Code" button. Your code will be executed against hidden test cases.
                                    Ensure your code passes all test cases before submitting.
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Agreement & Start */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
                    <div className="flex items-start gap-3 mb-6">
                        <input
                            type="checkbox"
                            id="agreement"
                            className="mt-1 h-5 w-5 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                            required
                        />
                        <label htmlFor="agreement" className="text-sm text-gray-700">
                            I have read and understood all instructions. I agree to work independently and follow
                            all test guidelines. I understand that my session will be monitored for integrity.
                        </label>
                    </div>

                    <div className="flex gap-4 justify-end">
                        <Button
                            variant="outline"
                            onClick={() => navigate('/test/access')}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleStartTest}
                            size="lg"
                        >
                            Start Test
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};