import React from 'react';
import { CheckCircle, Circle, Clock } from 'lucide-react';
import { clsx } from 'clsx';

interface ModuleCardProps {
    moduleNumber: number;
    moduleName: string;
    description: string;
    questionCount: number;
    timeAllocation: number;
    isCompleted: boolean;
    isActive: boolean;
    onClick?: () => void;
}

export const ModuleCard: React.FC<ModuleCardProps> = ({
    moduleNumber,
    moduleName,
    description,
    questionCount,
    timeAllocation,
    isCompleted,
    isActive,
    onClick,
}) => {
    return (
        <div
            onClick={onClick}
            className={clsx(
                'p-6 rounded-lg border-2 cursor-pointer transition-all',
                isActive && 'border-primary-500 bg-primary-50',
                isCompleted && !isActive && 'border-success-500 bg-success-50',
                !isActive && !isCompleted && 'border-gray-200 hover:border-gray-300'
            )}
        >
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                    <div
                        className={clsx(
                            'h-12 w-12 rounded-full flex items-center justify-center text-lg font-bold',
                            isCompleted && 'bg-success-600 text-white',
                            isActive && !isCompleted && 'bg-primary-600 text-white',
                            !isActive && !isCompleted && 'bg-gray-200 text-gray-600'
                        )}
                    >
                        {isCompleted ? (
                            <CheckCircle className="h-6 w-6" />
                        ) : (
                            <span>{moduleNumber}</span>
                        )}
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900">{moduleName}</h3>
                        <p className="text-sm text-gray-600">{description}</p>
                    </div>
                </div>
                {isActive && (
                    <span className="px-3 py-1 bg-primary-600 text-white text-xs font-medium rounded-full">
                        Active
                    </span>
                )}
            </div>

            <div className="flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                    <Circle className="h-4 w-4" />
                    <span>{questionCount} questions</span>
                </div>
                <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>{timeAllocation} min</span>
                </div>
            </div>
        </div>
    );
};