import { useState, useEffect } from 'react';
import { DeviceCapabilities } from '../types/devices';
import { DeviceDetectionService } from '../services/deviceDetection';

export const useMediaDevices = () => {
  const [devices, setDevices] = useState<DeviceCapabilities | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const detectDevices = async () => {
    setLoading(true);
    setError(null);

    try {
      const detectedDevices = await DeviceDetectionService.detectDevices();
      setDevices(detectedDevices);
    } catch (err: any) {
      setError(err.message || 'Failed to detect devices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    detectDevices();

    // Listen for device changes
    const handleDeviceChange = () => {
      detectDevices();
    };

    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);

    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
    };
  }, []);

  return { devices, loading, error, refetch: detectDevices };
};