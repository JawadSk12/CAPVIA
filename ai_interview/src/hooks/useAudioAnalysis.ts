import { useEffect, useRef, useState } from 'react';

interface AudioMetrics {
  frequency: number[];
  rms: number;
  peakLevel: number;
}

export const useAudioAnalysis = (stream: MediaStream | null) => {
  const [metrics, setMetrics] = useState<AudioMetrics | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    if (!stream) return;

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const source = audioContext.createMediaStreamSource(stream);
    const analyzer = audioContext.createAnalyser();
    
    source.connect(analyzer);
    analyzerRef.current = analyzer;

    const dataArray = new Uint8Array(analyzer.frequencyBinCount);

    const analyze = () => {
      analyzer.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
      
      setMetrics({
        frequency: Array.from(dataArray),
        rms: average / 255,
        peakLevel: Math.max(...dataArray) / 255,
      });

      animationFrameRef.current = requestAnimationFrame(analyze);
    };

    analyze();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      audioContext.close();
    };
  }, [stream]);

  return metrics;
};
