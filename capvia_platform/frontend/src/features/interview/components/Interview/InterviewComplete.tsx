import React from 'react';
import { CheckCircle2, Clock, BarChart3 } from 'lucide-react';
import { Button } from '../UI/Button';
import { Card } from '../UI/Card';

interface InterviewCompleteProps {
  totalQuestions: number;
  totalDuration: number;
  onViewResults: () => void;
  onReturnHome: () => void;
}

export const InterviewComplete: React.FC<InterviewCompleteProps> = ({
  totalQuestions,
  totalDuration,
  onViewResults,
  onReturnHome,
}) => {
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const handleViewResults = () => {
    console.log('🔍 View Results clicked');
    console.log('📊 Total Questions:', totalQuestions);
    console.log('⏱️ Total Duration:', totalDuration);
    
    // Check localStorage
    const responses = localStorage.getItem('interview_responses');
    console.log('💾 Stored responses:', responses);
    
    if (!responses || JSON.parse(responses).length === 0) {
      alert('No interview data found! Please complete the interview first.');
      return;
    }
    
    onViewResults();
  };

  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full">
        <div className="p-12 text-center space-y-8">
          {/* Success Icon */}
          <div className="flex justify-center">
            <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-16 h-16 text-green-500" />
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <h1 className="text-4xl font-bold text-white">Interview Complete! 🎉</h1>
            <p className="text-gray-400 text-lg">
              Thank you for completing the interview. Your responses have been recorded.
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-6 max-w-md mx-auto">
            <div className="bg-dark-bg rounded-lg p-6 border border-dark-border">
              <div className="flex items-center justify-center gap-2 text-primary-500 mb-2">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div className="text-3xl font-bold text-white">{totalQuestions}</div>
              <div className="text-sm text-gray-400">Questions Answered</div>
            </div>

            <div className="bg-dark-bg rounded-lg p-6 border border-dark-border">
              <div className="flex items-center justify-center gap-2 text-primary-500 mb-2">
                <Clock className="w-5 h-5" />
              </div>
              <div className="text-3xl font-bold text-white">
                {formatDuration(totalDuration)}
              </div>
              <div className="text-sm text-gray-400">Total Duration</div>
            </div>
          </div>

          {/* Next Steps */}
          <div className="bg-primary-500/10 border border-primary-500/30 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-primary-400 mb-2">What's Next?</h3>
            <p className="text-gray-300 text-sm">
              Our AI is analyzing your responses. Click below to view your detailed evaluation
              including scores, transcripts, and personalized feedback.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={handleViewResults}
              className="px-8 py-4 text-lg"
            >
              View My Results
            </Button>
            <Button
              onClick={onReturnHome}
              variant="secondary"
              className="px-8 py-4 text-lg"
            >
              Return Home
            </Button>
          </div>

          {/* Footer Note */}
          <p className="text-xs text-gray-500 max-w-md mx-auto">
            Your interview data is securely stored and will be reviewed by our team.
            You'll receive an email notification once the hiring manager reviews your results.
          </p>
        </div>
      </Card>
    </div>
  );
};