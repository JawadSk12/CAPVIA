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
          bandwidth: 0,
          latency: 0,
        },
      };

      StorageService.saveDeviceMetadata(metadata);
      console.log('Device metadata saved:', metadata);
    };

    saveMetadata();
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-6 px-4 font-sans text-slate-800 bg-white">
      <Card className="max-w-2xl w-full border border-slate-100 shadow-sm rounded-[24px]">
        <div className="space-y-8 text-center p-4">
          
          {/* Success Checkmark Circle */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-[#10B981]/10 flex items-center justify-center text-[#10B981]">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div className="absolute inset-0 rounded-full bg-[#10B981] opacity-10 animate-ping" />
            </div>
          </div>

          {/* Message */}
          <div className="space-y-2">
            <h1 className="text-3xl font-extrabold text-slate-900 font-outfit tracking-tight">
              Diagnostics Completed
            </h1>
            <p className="text-slate-500 text-sm max-w-md mx-auto font-medium">
              All endpoint telemetry checks meet CAPVIA evaluation standards. You are ready to start.
            </p>
          </div>

          {/* Session rules */}
          <div className="bg-[#F8FAFC] border border-slate-100 rounded-[20px] p-6 text-left space-y-3.5">
            <h3 className="font-bold text-slate-800 text-sm">Proctoring Ground Rules:</h3>
            <ul className="space-y-2.5">
              <li className="flex items-start gap-2.5 text-xs text-slate-650 font-medium">
                <span className="text-[#10B981] font-bold">✓</span>
                <span>Maintain browser tab focus (tab switching will register an integrity violation).</span>
              </li>
              <li className="flex items-start gap-2.5 text-xs text-slate-650 font-medium">
                <span className="text-[#10B981] font-bold">✓</span>
                <span>Answer verbally, speaking clearly directly towards your camera.</span>
              </li>
              <li className="flex items-start gap-2.5 text-xs text-slate-650 font-medium">
                <span className="text-[#10B981] font-bold">✓</span>
                <span>A single display monitor must be used; secondary displays trigger locks.</span>
              </li>
              <li className="flex items-start gap-2.5 text-xs text-slate-650 font-medium">
                <span className="text-[#10B981] font-bold">✓</span>
                <span>Do not close this browser session until the evaluation report is generated.</span>
              </li>
            </ul>
          </div>

          {/* Telemetry Indicator */}
          <div className="bg-red-50 border border-red-100 rounded-xl p-4">
            <p className="text-xs text-[#EF4444] flex items-center justify-center gap-2 font-bold uppercase tracking-wider">
              <span className="w-2 h-2 bg-[#EF4444] rounded-full animate-pulse" />
              Live video and audio telemetry logs are active
            </p>
          </div>

          {/* Action Button */}
          <Button
            onClick={onProceedToInterview}
            className="w-full sm:w-auto px-10 py-4 bg-[#0D47A1] text-white hover:bg-[#0b3c8a] hover:scale-[1.01] rounded-xl font-bold text-sm flex items-center justify-center gap-2 mx-auto transition-all shadow"
          >
            Launch Interview Terminal
            <ArrowRight className="w-4 h-4 text-white" />
          </Button>
        </div>
      </Card>
    </div>
  );
};