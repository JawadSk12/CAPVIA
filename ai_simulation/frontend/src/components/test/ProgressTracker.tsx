import React from 'react';
import { CheckCircle, Circle } from 'lucide-react';
import { clsx } from 'clsx';

interface ProgressTrackerProps {
    totalQuestions: number;
    currentQuestionIndex: number;
    completedQuestions: number[];
    onQuestionClick?: (index: number) => void;
}

export const ProgressTracker: React.FC<ProgressTrackerProps> = ({
    totalQuestions,
    currentQuestionIndex,
    completedQuestions,
    onQuestionClick,
}) => {
    return (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Progress</h3>

            {/* Progress Bar */}
            <div className="mb-4">
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                    <span>Completed</span>
                    <span>{completedQuestions.length} / {totalQuestions}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                        className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(completedQuestions.length / totalQuestions) * 100}%` }}
                    />
                </div>
            </div>

            {/* Question Grid */}
            <div className="grid grid-cols-5 gap-2">
                {Array.from({ length: totalQuestions }, (_, index) => {
                    const questionNumber = index + 1;
                    const isCompleted = completedQuestions.includes(questionNumber);
                    const isCurrent = index === currentQuestionIndex;

                    return (
                        <button
                            key={index}
                            onClick={() => onQuestionClick?.(index)}
                            className={clsx(
                                'aspect-square rounded-lg flex items-center justify-center text-sm font-medium transition-all',
                                isCurrent && 'ring-2 ring-primary-500 ring-offset-2',
                                isCompleted
                                    ? 'bg-success-100 text-success-700 hover:bg-success-200'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            )}
                            title={`Question ${questionNumber} ${isCompleted ? '(Completed)' : ''}`}
                        >
                            {isCompleted ? (
                                <CheckCircle className="h-4 w-4" />
                            ) : (
                                <span>{questionNumber}</span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Legend */}
            <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
                <div className="flex items-center gap-2 text-xs text-gray-600">
                    <div className="h-4 w-4 bg-success-100 rounded flex items-center justify-center">
                        <CheckCircle className="h-3 w-3 text-success-700" />
                    </div>
                    <span>Completed</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-600">
                    <div className="h-4 w-4 bg-gray-100 rounded flex items-center justify-center">
                        <Circle className="h-3 w-3" />
                    </div>
                    <span>Not attempted</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-600">
                    <div className="h-4 w-4 bg-gray-100 rounded ring-2 ring-primary-500 flex items-center justify-center">
                        <Circle className="h-3 w-3" />
                    </div>
                    <span>Current question</span>
                </div>
            </div>
        </div>
    );
};