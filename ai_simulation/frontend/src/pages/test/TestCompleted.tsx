import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Home } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { useTestStore } from '@/store/testStore';
import { useAuthStore } from '@/store/authStore';

export const TestCompleted: React.FC = () => {
    const navigate = useNavigate();
    const session = useTestStore((state) => state.session);
    const logout = useAuthStore((state) => state.logout);
    const reset = useTestStore((state) => state.reset);

    const handleExit = () => {
        reset();
        logout();
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center px-4">
            <div className="max-w-2xl w-full">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-full mb-6">
                        <CheckCircle className="h-12 w-12 text-green-600" />
                    </div>
                    <h1 className="text-4xl font-bold text-white mb-4">Test Completed!</h1>
                    <p className="text-xl text-green-100">
                        Thank you for completing the assessment
                    </p>
                </div>

                <div className="bg-white rounded-lg shadow-xl p-8 space-y-6">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">What happens next?</h2>
                        <div className="space-y-4 text-gray-700">
                            <div className="flex items-start gap-3">
                                <div className="h-6 w-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <span className="text-green-600 font-semibold text-sm">1</span>
                                </div>
                                <div>
                                    <p className="font-medium">Evaluation in Progress</p>
                                    <p className="text-sm text-gray-600">
                                        Your answers are being evaluated by our AI-powered system. This process typically takes a few minutes.
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <div className="h-6 w-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <span className="text-green-600 font-semibold text-sm">2</span>
                                </div>
                                <div>
                                    <p className="font-medium">Results Review</p>
                                    <p className="text-sm text-gray-600">
                                        The hiring team will review your results along with our detailed evaluation report.
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <div className="h-6 w-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <span className="text-green-600 font-semibold text-sm">3</span>
                                </div>
                                <div>
                                    <p className="font-medium">Follow-up Communication</p>
                                    <p className="text-sm text-gray-600">
                                        You will receive an email with next steps within 3-5 business days.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {session && (
                        <div className="pt-6 border-t border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-900 mb-3">Session Summary</h3>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-gray-600">Test Name</p>
                                    <p className="font-medium text-gray-900">{session.test_name}</p>
                                </div>
                                <div>
                                    <p className="text-gray-600">Questions Completed</p>
                                    <p className="font-medium text-gray-900">{session.completed_questions.length}</p>
                                </div>
                                <div>
                                    <p className="text-gray-600">Session ID</p>
                                    <p className="font-medium text-gray-900 font-mono">{session.session_token.slice(0, 12)}...</p>
                                </div>
                                <div>
                                    <p className="text-gray-600">Duration</p>
                                    <p className="font-medium text-gray-900">{session.duration_minutes} minutes</p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="pt-6 border-t border-gray-200">
                        <Button
                            onClick={handleExit}
                            className="w-full"
                            leftIcon={<Home className="h-5 w-5" />}
                        >
                            Exit to Homepage
                        </Button>
                    </div>

                    <div className="text-center text-sm text-gray-500">
                        <p>
                            Questions or concerns? Contact us at{' '}
                            <a href="mailto:support@aisimulation.com" className="text-primary-600 hover:text-primary-700">
                                support@aisimulation.com
                            </a>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};