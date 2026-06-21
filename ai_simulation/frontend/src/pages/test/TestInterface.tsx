import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    ChevronRight, 
    ChevronLeft, 
    Send, 
    AlertCircle, 
    Clock, 
    Play, 
    CheckCircle2,
    Save,
    Maximize2
} from 'lucide-react';
import { testApi } from '@/services/api/test';
import { CodeEditor } from '@/components/test/CodeEditor';
import { QuestionRenderer } from '@/components/test/QuestionRenderer';
import { TimerDisplay } from '@/components/test/TimerDisplay';
import { ProgressTracker } from '@/components/test/ProgressTracker';
import { Button } from '@/components/common/Button';
import { Loader } from '@/components/common/Loader';
import { useBehaviorTracker } from '@/hooks/useBehaviorTracker';
import { useAutoSave } from '@/hooks/useAutoSave';
import { toast } from 'react-hot-toast';
import { Question, Session, QuestionType } from '@/types/test.types';

export const TestInterface: React.FC = () => {
    const { sessionId } = useParams<{ sessionId: string }>();
    const navigate = useNavigate();
    
    const [session, setSession] = useState<Session | null>(null);
    const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
    const [answers, setAnswers] = useState<Record<number, any>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [timeRemaining, setTimeRemaining] = useState<number>(0);
    const [currentModuleIndex, setCurrentModuleIndex] = useState(0);

    // Initialize session
    useEffect(() => {
        const initSession = async () => {
            if (!sessionId) return;
            try {
                const sessionData = await testApi.getSession(parseInt(sessionId));
                setSession(sessionData);
                
                // Fetch first question or current active question
                if (sessionData.questions && sessionData.questions.length > 0) {
                    const firstQuestion = sessionData.questions[0];
                    setCurrentQuestion(firstQuestion);
                    setTimeRemaining(sessionData.time_remaining || 3600);
                }
            } catch (error) {
                toast.error('Failed to load assessment session');
                navigate('/dashboard');
            } finally {
                setIsLoading(false);
            }
        };

        initSession();
    }, [sessionId, navigate]);

    // Behavior Tracking
    useBehaviorTracker(parseInt(sessionId || '0'), currentQuestion?.id || 0);

    // Auto-save logic
    const handleSave = useCallback(async (content: any) => {
        if (!sessionId || !currentQuestion) return;
        try {
            await testApi.submitAnswer(parseInt(sessionId), {
                question_id: currentQuestion.id,
                content: content,
                is_final: false
            });
        } catch (error) {
            console.error('Auto-save failed', error);
        }
    }, [sessionId, currentQuestion]);

    useAutoSave(answers[currentQuestion?.id || 0], handleSave);

    const handleAnswerChange = (content: any) => {
        if (!currentQuestion) return;
        setAnswers(prev => ({
            ...prev,
            [currentQuestion.id]: content
        }));
    };

    const handleNext = async () => {
        if (!session || !currentQuestion) return;
        
        const nextIndex = currentModuleIndex + 1;
        if (nextIndex < session.questions.length) {
            // Save current answer as final before moving
            setIsSubmitting(true);
            try {
                await testApi.submitAnswer(session.id, {
                    question_id: currentQuestion.id,
                    content: answers[currentQuestion.id],
                    is_final: true
                });
                
                setCurrentModuleIndex(nextIndex);
                setCurrentQuestion(session.questions[nextIndex]);
                window.scrollTo(0, 0);
            } catch (error) {
                toast.error('Failed to save answer');
            } finally {
                setIsSubmitting(false);
            }
        } else {
            // Submit entire assessment
            handleSubmitAssessment();
        }
    };

    const handleSubmitAssessment = async () => {
        if (!session) return;
        
        const confirmed = window.confirm('Are you sure you want to submit your assessment? You won\'t be able to change your answers.');
        if (!confirmed) return;

        setIsSubmitting(true);
        try {
            await testApi.completeSession(session.id);
            toast.success('Assessment submitted successfully!');
            navigate('/test/completed');
        } catch (error) {
            toast.error('Failed to submit assessment');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) return <Loader fullScreen text="Preparing your environment..." />;
    if (!session || !currentQuestion) return <div>Session not found</div>;

    const isCodingModule = currentQuestion.question_type === QuestionType.CODING || currentQuestion.question_type === QuestionType.DEBUGGING;

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-30 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="bg-primary-600 text-white p-2 rounded-lg">
                        <Maximize2 className="h-5 w-5" />
                    </div>
                    <div>
                        <h2 className="font-bold text-gray-900">{session.test_name}</h2>
                        <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold">
                            Module {currentModuleIndex + 1}: {currentQuestion.question_type.replace('_', ' ')}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <TimerDisplay 
                        seconds={timeRemaining} 
                        onExpire={handleSubmitAssessment} 
                    />
                    <div className="h-8 w-px bg-gray-200 hidden md:block"></div>
                    <Button 
                        variant="primary" 
                        onClick={handleNext} 
                        isLoading={isSubmitting}
                        rightIcon={currentModuleIndex === session.questions.length - 1 ? <CheckCircle2 className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    >
                        {currentModuleIndex === session.questions.length - 1 ? 'Submit Assessment' : 'Next Module'}
                    </Button>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex flex-col md:flex-row overflow-hidden">
                {/* Left Panel: Progress & Instructions */}
                <aside className="w-full md:w-80 bg-white border-r border-gray-200 overflow-y-auto hidden lg:block">
                    <div className="p-6">
                        <ProgressTracker 
                            currentStep={currentModuleIndex} 
                            totalSteps={session.questions.length} 
                            modules={session.questions.map(q => q.question_type)}
                        />
                        
                        <div className="mt-10 pt-10 border-t border-gray-100">
                            <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <AlertCircle className="h-4 w-4 text-blue-500" />
                                Instructions
                            </h4>
                            <ul className="space-y-3 text-sm text-gray-600">
                                <li className="flex gap-2">
                                    <div className="h-1.5 w-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0"></div>
                                    Read the problem statement carefully.
                                </li>
                                <li className="flex gap-2">
                                    <div className="h-1.5 w-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0"></div>
                                    Your progress is automatically saved every 30 seconds.
                                </li>
                                <li className="flex gap-2">
                                    <div className="h-1.5 w-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0"></div>
                                    Do not switch tabs or leave the browser window.
                                </li>
                            </ul>
                        </div>
                    </div>
                </aside>

                {/* Center Panel: Content Area */}
                <section className={`flex-1 flex flex-col ${isCodingModule ? '' : 'max-w-5xl mx-auto w-full p-6'}`}>
                    {isCodingModule ? (
                        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                            {/* Question Section */}
                            <div className="w-full lg:w-1/2 p-6 overflow-y-auto bg-white border-r border-gray-200">
                                <QuestionRenderer 
                                    question={currentQuestion} 
                                />
                            </div>
                            
                            {/* Editor Section */}
                            <div className="w-full lg:w-1/2 flex flex-col bg-[#1e1e1e]">
                                <div className="bg-[#252526] px-4 py-2 flex items-center justify-between border-b border-[#333]">
                                    <div className="text-xs text-gray-400 font-mono flex items-center gap-2">
                                        <Play className="h-3 w-3 text-green-500" />
                                        solution.py
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-[#333] transition-colors flex items-center gap-1">
                                            <Save className="h-3 w-3" /> Save
                                        </button>
                                    </div>
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <CodeEditor 
                                        value={answers[currentQuestion.id] || currentQuestion.starter_code || ''} 
                                        onChange={handleAnswerChange}
                                        language={currentQuestion.language || 'python'}
                                    />
                                </div>
                                <div className="h-40 bg-[#1e1e1e] border-t border-[#333] p-4 font-mono text-sm">
                                    <div className="text-gray-500 mb-2 uppercase text-[10px] tracking-wider font-bold">Console Output</div>
                                    <div className="text-gray-400">Run your code to see output here...</div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 flex-1 overflow-y-auto">
                            <QuestionRenderer 
                                question={currentQuestion} 
                                value={answers[currentQuestion.id]}
                                onChange={handleAnswerChange}
                            />
                        </div>
                    )}
                    
                    {/* Mobile Navigation */}
                    <div className="lg:hidden p-4 bg-white border-t border-gray-200 flex items-center justify-between">
                        <p className="text-xs font-bold text-gray-400 uppercase">Module {currentModuleIndex + 1}/{session.questions.length}</p>
                        <Button variant="primary" size="sm" onClick={handleNext}>Next</Button>
                    </div>
                </section>
            </main>
        </div>
    );
};