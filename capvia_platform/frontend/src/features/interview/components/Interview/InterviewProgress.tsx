// import React from 'react';
// import { CheckCircle2, Circle } from 'lucide-react';

// interface InterviewProgressProps {
//   currentQuestion: number;
//   totalQuestions: number;
// }

// export const InterviewProgress: React.FC<InterviewProgressProps> = ({
//   currentQuestion,
//   totalQuestions,
// }) => {
//   const progress = ((currentQuestion + 1) / totalQuestions) * 100;

//   return (
//     <div className="max-w-4xl mx-auto mb-6">
//       <div className="bg-dark-card rounded-lg p-6 border border-dark-border">
//         {/* Progress Bar */}
//         <div className="mb-4">
//           <div className="flex justify-between text-sm mb-2">
//             <span className="text-gray-400">Interview Progress</span>
//             <span className="text-primary-400 font-semibold">
//               {currentQuestion + 1} / {totalQuestions} Questions
//             </span>
//           </div>
//           <div className="w-full bg-dark-bg rounded-full h-2">
//             <div
//               className="bg-primary-600 h-full transition-all duration-500 rounded-full"
//               style={{ width: `${progress}%` }}
//             />
//           </div>
//         </div>

//         {/* Question Dots */}
//         <div className="flex items-center gap-2 justify-center flex-wrap">
//           {Array.from({ length: totalQuestions }).map((_, index) => (
//             <div
//               key={index}
//               className="flex flex-col items-center gap-1"
//             >
//               {index < currentQuestion ? (
//                 <CheckCircle2 className="w-6 h-6 text-green-500" />
//               ) : index === currentQuestion ? (
//                 <Circle className="w-6 h-6 text-primary-500 fill-primary-500" />
//               ) : (
//                 <Circle className="w-6 h-6 text-gray-600" />
//               )}
//               <span className="text-xs text-gray-500">{index + 1}</span>
//             </div>
//           ))}
//         </div>
//       </div>
//     </div>
//   );
// };




import React from 'react';

interface InterviewProgressProps {
  currentQuestion: number;
  totalQuestions: number;
  progress: number;
}

export const InterviewProgress: React.FC<InterviewProgressProps> = ({
  currentQuestion,
  totalQuestions,
  progress,
}) => {
  return (
    <div className="bg-gray-800 rounded-lg p-4 shadow-xl border border-gray-700">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-400">Progress</span>
        <span className="text-sm text-white font-semibold">
          {currentQuestion} / {totalQuestions} Questions
        </span>
      </div>
      
      {/* Progress Bar */}
      <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
        <div
          className="bg-gradient-to-r from-blue-500 to-purple-500 h-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      
      <div className="mt-2 text-right text-xs text-gray-500">
        {Math.round(progress)}% Complete
      </div>
    </div>
  );
};