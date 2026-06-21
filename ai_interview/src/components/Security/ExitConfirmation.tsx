import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Card } from '../UI/Card';
import { Button } from '../UI/Button';

interface ExitConfirmationProps {
  onConfirmExit: () => void;
  onCancel: () => void;
}

export const ExitConfirmation: React.FC<ExitConfirmationProps> = ({
  onConfirmExit,
  onCancel,
}) => {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <Card className="max-w-md w-full">
        <div className="space-y-6">
          <div className="flex justify-center">
            <div className="p-4 bg-red-500/20 rounded-full">
              <AlertTriangle className="w-12 h-12 text-red-500" />
            </div>
          </div>

          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-white">Exit Interview?</h2>
            <p className="text-gray-400">
              Are you sure you want to exit the interview? This action will:
            </p>
          </div>

          <div className="bg-dark-bg rounded-lg p-4 space-y-2">
            <div className="flex items-start gap-2 text-red-300">
              <span className="text-red-500 mt-0.5">•</span>
              <span className="text-sm">Mark your interview as incomplete</span>
            </div>
            <div className="flex items-start gap-2 text-red-300">
              <span className="text-red-500 mt-0.5">•</span>
              <span className="text-sm">Log this as a critical violation</span>
            </div>
            <div className="flex items-start gap-2 text-red-300">
              <span className="text-red-500 mt-0.5">•</span>
              <span className="text-sm">Notify the HR team immediately</span>
            </div>
            <div className="flex items-start gap-2 text-red-300">
              <span className="text-red-500 mt-0.5">•</span>
              <span className="text-sm">You will NOT be able to resume</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button onClick={onCancel} variant="secondary" className="w-full">
              Stay in Interview
            </Button>
            <Button onClick={onConfirmExit} className="w-full bg-red-600 hover:bg-red-700">
              Exit Anyway
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};