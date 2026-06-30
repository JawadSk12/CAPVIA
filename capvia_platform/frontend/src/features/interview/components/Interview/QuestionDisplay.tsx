// import React from 'react';
// import { MessageSquare, Volume2, VolumeX } from 'lucide-react';
// import { InterviewQuestion } from '../../types/interview';
// import { Card } from '../UI/Card';

// interface QuestionDisplayProps {
//   question: InterviewQuestion | null;
//   questionNumber: number;
//   totalQuestions: number;
//   isAISpeaking: boolean;
//   onToggleSound?: () => void;
// }

// export const QuestionDisplay: React.FC<QuestionDisplayProps> = ({
//   question,
//   questionNumber,
//   totalQuestions,
//   isAISpeaking,
//   onToggleSound,
// }) => {
//   if (!question) {
//     return (
//       <Card className="max-w-4xl mx-auto">
//         <div className="text-center py-12">
//           <p className="text-gray-400">Loading question...</p>
//         </div>
//       </Card>
//     );
//   }

//   const getCategoryColor = (category: string) => {
//     switch (category) {
//       case 'technical':
//         return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
//       case 'behavioral':
//         return 'bg-green-500/20 text-green-400 border-green-500/30';
//       case 'situational':
//         return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
//       default:
//         return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
//     }
//   };

//   const getDifficultyColor = (difficulty: string) => {
//     switch (difficulty) {
//       case 'easy':
//         return 'text-green-400';
//       case 'medium':
//         return 'text-yellow-400';
//       case 'hard':
//         return 'text-red-400';
//       default:
//         return 'text-gray-400';
//     }
//   };

//   return (
//     <Card className="max-w-4xl mx-auto">
//       <div className="space-y-6">
//         {/* Header */}
//         <div className="flex items-center justify-between">
//           <div className="flex items-center gap-3">
//             <div className="p-3 bg-primary-500/10 rounded-lg">
//               <MessageSquare className="w-6 h-6 text-primary-500" />
//             </div>
//             <div>
//               <h3 className="font-bold text-lg">Question {questionNumber} of {totalQuestions}</h3>
//               <p className="text-sm text-gray-400">Listen carefully and answer when ready</p>
//             </div>
//           </div>

//           {/* Sound Toggle */}
//           {onToggleSound && (
//             <button
//               onClick={onToggleSound}
//               className="p-3 rounded-lg bg-dark-bg hover:bg-dark-card transition-colors"
//               title={isAISpeaking ? "AI is speaking" : "Replay question"}
//             >
//               {isAISpeaking ? (
//                 <Volume2 className="w-6 h-6 text-primary-500 animate-pulse" />
//               ) : (
//                 <VolumeX className="w-6 h-6 text-gray-500" />
//               )}
//             </button>
//           )}
//         </div>

//         {/* Question Metadata */}
//         <div className="flex items-center gap-3">
//           <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getCategoryColor(question.category)}`}>
//             {question.category.toUpperCase()}
//           </span>
//           <span className={`text-xs font-semibold ${getDifficultyColor(question.difficulty)}`}>
//             ● {question.difficulty.toUpperCase()}
//           </span>
//           <span className="text-xs text-gray-500">
//             {question.duration}s to answer
//           </span>
//         </div>

//         {/* Question Text */}
//         <div className="bg-dark-bg rounded-lg p-8">
//           <p className="text-2xl font-medium text-white leading-relaxed">
//             {question.text}
//           </p>
//         </div>

//         {/* AI Speaking Indicator */}
//         {isAISpeaking && (
//           <div className="flex items-center justify-center gap-2 text-primary-400 animate-pulse">
//             <Volume2 className="w-5 h-5" />
//             <span className="text-sm font-semibold">AI is reading the question...</span>
//           </div>
//         )}
//       </div>
//     </Card>
//   );
// };

import React from 'react';

interface QuestionDisplayProps {
  question: string;
  questionNumber: number;
  totalQuestions: number;
  timeRemaining: number;
}

export const QuestionDisplay: React.FC<QuestionDisplayProps> = ({
  question,
  questionNumber,
  totalQuestions,
  timeRemaining,
}) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 shadow-xl border border-gray-700">
      {/* Question Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-gray-400">
          Question {questionNumber} of {totalQuestions}
        </span>
        <span className={`text-sm font-mono font-semibold ${
          timeRemaining < 60 ? 'text-red-400' : 'text-green-400'
        }`}>
          {formatTime(timeRemaining)}
        </span>
      </div>

      {/* Question Text */}
      <div className="text-xl text-white font-medium">
        {question}
      </div>

      {/* Time Warning */}
      {timeRemaining < 60 && (
        <div className="mt-4 px-4 py-2 bg-red-900 text-red-200 rounded-lg text-sm border border-red-700">
          ⚠️ Less than 1 minute remaining
        </div>
      )}
    </div>
  );
};