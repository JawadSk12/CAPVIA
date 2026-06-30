// import React, { useState } from 'react';
// import { LogOut } from 'lucide-react';
// import { Button } from '../UI/Button';
// import { ExitConfirmation } from '../Security/ExitConfirmation';

// interface InterviewControlsProps {
//   onExit: () => void;
// }

// export const InterviewControls: React.FC<InterviewControlsProps> = ({ onExit }) => {
//   const [showExitConfirm, setShowExitConfirm] = useState(false);

//   const handleExitClick = () => {
//     setShowExitConfirm(true);
//   };

//   const handleConfirmExit = () => {
//     setShowExitConfirm(false);
//     onExit();
//   };

//   const handleCancelExit = () => {
//     setShowExitConfirm(false);
//   };

//   return (
//     <>
//       <div className="fixed bottom-8 right-8 z-10">
//         <Button
//           onClick={handleExitClick}
//           className="flex items-center gap-2 shadow-lg bg-red-600 hover:bg-red-700"
//         >
//           <LogOut className="w-5 h-5" />
//           Exit Interview
//         </Button>
//       </div>

//       {showExitConfirm && (
//         <ExitConfirmation
//           onConfirmExit={handleConfirmExit}
//           onCancel={handleCancelExit}
//         />
//       )}
//     </>
//   );
// };



import React from 'react';

interface InterviewControlsProps {
  isRecording: boolean;
  isPaused: boolean;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onEnd: () => void;
  canGoPrevious: boolean;
  canGoNext: boolean;
}

export const InterviewControls: React.FC<InterviewControlsProps> = ({
  isRecording,
  isPaused,
  onStart,
  onPause,
  onResume,
  onNext,
  onPrevious,
  onEnd,
  canGoPrevious,
  canGoNext,
}) => {
  return (
    <div className="bg-gray-800 rounded-lg p-6 shadow-xl border border-gray-700">
      <div className="flex items-center justify-between space-x-4">

        {/* Start Button */}
        {!isRecording && (
          <button
            onClick={onStart}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Start Interview
          </button>
        )}

        {/* Pause/Resume Buttons */}
        {isRecording && (
          <>
            {!isPaused ? (
              <button
                onClick={onPause}
                className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                Pause
              </button>
            ) : (
              <button
                onClick={onResume}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                Resume
              </button>
            )}

            {/* Navigation Buttons */}
            <button
              onClick={onPrevious}
              disabled={!canGoPrevious}
              className={`px-4 py-3 rounded-lg font-semibold transition-colors ${canGoPrevious
                  ? 'bg-gray-700 hover:bg-gray-600 text-white'
                  : 'bg-gray-900 text-gray-600 cursor-not-allowed'
                }`}
            >
              ← Previous
            </button>

            <button
              onClick={onNext}
              disabled={!canGoNext}
              className={`px-4 py-3 rounded-lg font-semibold transition-colors ${canGoNext
                  ? 'bg-gray-700 hover:bg-gray-600 text-white'
                  : 'bg-gray-900 text-gray-600 cursor-not-allowed'
                }`}
            >
              Next →
            </button>

            {/* End Button */}
            <button
              onClick={onEnd}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              End Interview
            </button>
          </>
        )}
      </div>
    </div>
  );
};