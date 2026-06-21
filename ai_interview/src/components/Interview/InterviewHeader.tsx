// import React from 'react';
// import { Clock, AlertTriangle } from 'lucide-react';
// import { RecordingIndicator } from './RecordingIndicator';

// interface InterviewHeaderProps {
//   violationCount: number;
//   timeElapsed: string;
// }

// export const InterviewHeader: React.FC<InterviewHeaderProps> = ({
//   violationCount,
//   timeElapsed,
// }) => {
//   return (
//     <div className="bg-dark-card border-b border-dark-border p-4">
//       <div className="max-w-7xl mx-auto flex items-center justify-between">
//         <div>
//           <h1 className="text-xl font-bold">IntelliRecruit AI</h1>
//           <p className="text-xs text-gray-400">Interview in Progress</p>
//         </div>

//         <div className="flex items-center gap-6">
//           <RecordingIndicator />
          
//           <div className="flex items-center gap-2 text-gray-400">
//             <Clock className="w-4 h-4" />
//             <span className="text-sm font-mono">{timeElapsed}</span>
//           </div>

//           {violationCount > 0 && (
//             <div className="flex items-center gap-2 bg-yellow-500/20 border border-yellow-500/30 rounded-full px-3 py-1">
//               <AlertTriangle className="w-4 h-4 text-yellow-500" />
//               <span className="text-sm font-semibold text-yellow-200">
//                 {violationCount} {violationCount === 1 ? 'Violation' : 'Violations'}
//               </span>
//             </div>
//           )}
//         </div>

//         <div className="w-32" />
//       </div>
//     </div>
//   );
// };





import React from 'react';

interface InterviewHeaderProps {
  isRecording: boolean;
  isPaused: boolean;
}

export const InterviewHeader: React.FC<InterviewHeaderProps> = ({
  isRecording,
  isPaused,
}) => {
  return (
    <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold text-white">IntelliRecruit AI</h1>
          <span className="text-gray-400">|</span>
          <span className="text-gray-300">Interview Session</span>
        </div>

        <div className="flex items-center space-x-4">
          {/* Status Badge */}
          {isRecording && (
            <div className={`px-4 py-2 rounded-full text-sm font-semibold ${
              isPaused 
                ? 'bg-yellow-900 text-yellow-200 border border-yellow-700'
                : 'bg-green-900 text-green-200 border border-green-700'
            }`}>
              {isPaused ? '⏸️ Paused' : '🔴 Recording'}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};