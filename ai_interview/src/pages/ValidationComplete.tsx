import React, { useEffect } from 'react';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import { Card } from '../components/UI/Card';
import { Button } from '../components/UI/Button';
import { generateDeviceFingerprint, generateSessionId } from '../utils/deviceFingerprint';
import { StorageService } from '../services/storageService';
import { DeviceQualityMetadata } from '../types/devices';

interface ValidationCompleteProps {
  onProceedToInterview: () => void;
}

export const ValidationComplete: React.FC<ValidationCompleteProps> = ({ onProceedToInterview }) => {
  useEffect(() => {
    // Generate and save metadata
    const saveMetadata = async () => {
      const fingerprint = await generateDeviceFingerprint();
      const sessionId = generateSessionId();
      
      StorageService.saveSessionId(sessionId);

      const validationState = StorageService.loadValidationState();

      const metadata: DeviceQualityMetadata = {
        timestamp: new Date().toISOString(),
        sessionId,
        deviceFingerprint: fingerprint,
        camera: {
          resolution: validationState?.camera.metadata?.resolution || 'unknown',
          frameRate: validationState?.camera.metadata?.frameRate || 0,
          facing: validationState?.camera.metadata?.facing,
        },
        microphone: {
          snr: (validationState?.clarity as any)?.metrics?.snr || 0,
          clarity: (validationState?.clarity as any)?.metrics?.clarity || 'unknown',
          backgroundNoise: (validationState?.clarity as any)?.metrics?.noiseFloor || 0,
        },
        speaker: {
          confirmed: validationState?.speaker.passed || false,
        },
        echo: (validationState?.echo as any)?.result || {
          echoDetected: false,
          echoCancellationActive: false,
          latency: 0,
        },
        network: {
          bandwidth: 0, // Placeholder
          latency: 0, // Placeholder
        },
      };

      StorageService.saveDeviceMetadata(metadata);
      console.log('Device metadata saved:', metadata);
    };

    saveMetadata();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full">
        <div className="space-y-8 text-center">
          {/* Success Icon */}
          <div className="flex justify-center">
            <div className="p-6 bg-green-500/20 rounded-full">
              <CheckCircle2 className="w-20 h-20 text-green-500" />
            </div>
          </div>

          {/* Message */}
          <div className="space-y-4">
            <h1 className="text-3xl font-bold text-white">
              All Systems Ready!
            </h1>
            <p className="text-lg text-gray-400 max-w-xl mx-auto">
              Your devices have been validated and meet all requirements.
              You're all set to begin your interview.
            </p>
          </div>

          {/* Final Reminders */}
          <div className="bg-dark-bg rounded-lg p-6 text-left space-y-3">
            <h3 className="font-semibold text-white mb-3">Final Reminders:</h3>
            <ul className="space-y-2">
              <li className="flex items-start gap-2 text-sm text-gray-300">
                <span className="text-green-500 mt-0.5">✓</span>
                <span>Stay on this tab for the entire interview duration</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-gray-300">
                <span className="text-green-500 mt-0.5">✓</span>
                <span>Speak clearly and naturally to the AI interviewer</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-gray-300">
                <span className="text-green-500 mt-0.5">✓</span>
                <span>Take your time - there's no rush to answer</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-gray-300">
                <span className="text-green-500 mt-0.5">✓</span>
                <span>If you need to exit, use the "Exit Interview" button only</span>
              </li>
            </ul>
          </div>

          {/* Recording Notice */}
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
            <p className="text-sm text-red-200 flex items-center justify-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              <strong>You will be recorded</strong> during the interview
            </p>
          </div>

          {/* Action */}
          <Button
            onClick={onProceedToInterview}
            className="px-12 py-4 text-lg flex items-center gap-2 mx-auto"
          >
            Proceed to Interview
            <ArrowRight className="w-5 h-5" />
          </Button>
        </div>
      </Card>
    </div>
  );
};