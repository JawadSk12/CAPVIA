import React, { useEffect } from 'react';
import { Shield, Video, Clock, FileCheck } from 'lucide-react';
import { Card } from '../components/UI/Card';
import { Button } from '../components/UI/Button';
import { StorageService } from '../services/storageService';

interface WelcomeProps {
  onStart: () => void;
}

export const Welcome: React.FC<WelcomeProps> = ({ onStart }) => {
  // Clear validation state when welcome page loads
  useEffect(() => {
    StorageService.clearValidationData();
    console.log('Welcome page: Cleared validation data');
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-4xl w-full">
        <div className="space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="inline-block p-4 bg-primary-500/10 rounded-2xl">
              <Video className="w-12 h-12 text-primary-500" />
            </div>
            <h1 className="text-4xl font-bold">Welcome to IntelliRecruit AI</h1>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              AI-Powered Video Interview System for Internship Hiring
            </p>
          </div>

          {/* Key Points */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="p-3 bg-primary-500/10 rounded-lg">
                  <Clock className="w-6 h-6 text-primary-500" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-white mb-1">Interview Duration</h3>
                <p className="text-sm text-gray-400">
                  Approximately 20-30 minutes of focused conversation
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="p-3 bg-primary-500/10 rounded-lg">
                  <Video className="w-6 h-6 text-primary-500" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-white mb-1">Recording Notice</h3>
                <p className="text-sm text-gray-400">
                  This interview will be recorded and reviewed by HR team
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="p-3 bg-primary-500/10 rounded-lg">
                  <Shield className="w-6 h-6 text-primary-500" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-white mb-1">Privacy & Security</h3>
                <p className="text-sm text-gray-400">
                  Your data is encrypted and used only for hiring decisions
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="p-3 bg-primary-500/10 rounded-lg">
                  <FileCheck className="w-6 h-6 text-primary-500" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-white mb-1">Decision Support</h3>
                <p className="text-sm text-gray-400">
                  AI provides analysis to assist, not replace, human review
                </p>
              </div>
            </div>
          </div>

          {/* Requirements */}
          <div className="bg-dark-bg rounded-lg p-6 space-y-4">
            <h3 className="font-semibold text-white">Before You Begin:</h3>
            <ul className="space-y-2">
              <li className="flex items-start gap-2 text-sm text-gray-300">
                <span className="text-primary-500 mt-0.5">•</span>
                <span>Ensure you have a working camera, microphone, and speakers</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-gray-300">
                <span className="text-primary-500 mt-0.5">•</span>
                <span>Find a quiet, well-lit location with minimal distractions</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-gray-300">
                <span className="text-primary-500 mt-0.5">•</span>
                <span>Use headphones to prevent echo and improve audio quality</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-gray-300">
                <span className="text-primary-500 mt-0.5">•</span>
                <span>Do not leave the interview tab or refresh the page</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-gray-300">
                <span className="text-primary-500 mt-0.5">•</span>
                <span>Have a stable internet connection (minimum 3 Mbps)</span>
              </li>
            </ul>
          </div>

          {/* Consent */}
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
            <p className="text-sm text-yellow-200">
              <strong>Privacy Notice:</strong> By proceeding, you consent to being recorded during this interview.
              The recording will be used solely for hiring evaluation and will be securely stored in accordance
              with our privacy policy. You have the right to request deletion of your data at any time.
            </p>
          </div>

          {/* Action */}
          <div className="flex justify-center">
            <Button onClick={onStart} className="px-12 py-4 text-lg">
              Start System Validation
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};