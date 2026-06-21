import { useState, useCallback } from 'react';
import { ValidationState, ValidationStep } from '../types/validation';
import { StorageService } from '../services/storageService';

const getInitialState = (): ValidationState => ({
  currentStep: 'camera', // Always start at camera
  completedSteps: [],
  camera: { passed: false },
  microphone: { passed: false },
  speaker: { passed: false },
  echo: { passed: false },
  clarity: { passed: false },
  overallPassed: false,
});

export const useDeviceValidation = () => {
  const [validationState, setValidationState] = useState<ValidationState>(getInitialState());

  const updateValidation = useCallback((
    step: Exclude<ValidationStep, 'welcome' | 'complete'>,
    passed: boolean,
    data?: any
  ) => {
    console.log(`✓ Updating validation for ${step}:`, { passed, data });
    
    setValidationState(prev => {
      const newState = {
        ...prev,
        [step]: {
          passed,
          ...(data && { metadata: data }),
          ...(data?.error && { error: data.error }),
        },
        completedSteps: [...new Set([...prev.completedSteps, step])],
      };

      newState.overallPassed = 
        newState.camera.passed &&
        newState.microphone.passed &&
        newState.speaker.passed &&
        newState.echo.passed &&
        newState.clarity.passed;

      StorageService.saveValidationState(newState);

      return newState;
    });
  }, []);

  const setCurrentStep = useCallback((step: ValidationStep) => {
    console.log(`→ Setting current step to: ${step}`);
    setValidationState(prev => ({
      ...prev,
      currentStep: step,
    }));
  }, []);

  const resetValidation = useCallback(() => {
    console.log('🔄 Resetting validation state');
    const freshState = getInitialState();
    setValidationState(freshState);
    StorageService.clearValidationData();
  }, []);

  return {
    validationState,
    updateValidation,
    setCurrentStep,
    resetValidation,
  };
};