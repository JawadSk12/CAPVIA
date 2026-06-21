import { DeviceQualityMetadata } from '../types/devices';
import { ValidationState } from '../types/validation';
import { STORAGE_KEYS } from '../utils/constants';

export class StorageService {
  
  /**
   * Save validation state to localStorage
   */
  static saveValidationState(state: ValidationState): void {
    try {
      localStorage.setItem(
        STORAGE_KEYS.VALIDATION_STATE,
        JSON.stringify(state)
      );
    } catch (error) {
      console.error('Failed to save validation state:', error);
    }
  }

  /**
   * Load validation state from localStorage
   */
  static loadValidationState(): ValidationState | null {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.VALIDATION_STATE);
      return saved ? JSON.parse(saved) : null;
    } catch (error) {
      console.error('Failed to load validation state:', error);
      return null;
    }
  }

  /**
   * Save device quality metadata
   */
  static saveDeviceMetadata(metadata: DeviceQualityMetadata): void {
    try {
      localStorage.setItem(
        STORAGE_KEYS.DEVICE_METADATA,
        JSON.stringify(metadata)
      );
    } catch (error) {
      console.error('Failed to save device metadata:', error);
    }
  }

  /**
   * Load device quality metadata
   */
  static loadDeviceMetadata(): DeviceQualityMetadata | null {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.DEVICE_METADATA);
      return saved ? JSON.parse(saved) : null;
    } catch (error) {
      console.error('Failed to load device metadata:', error);
      return null;
    }
  }

  /**
   * Save session ID
   */
  static saveSessionId(sessionId: string): void {
    localStorage.setItem(STORAGE_KEYS.SESSION_ID, sessionId);
  }

  /**
   * Get session ID
   */
  static getSessionId(): string | null {
    return localStorage.getItem(STORAGE_KEYS.SESSION_ID);
  }

  /**
   * Clear all validation data
   */
  static clearValidationData(): void {
    localStorage.removeItem(STORAGE_KEYS.VALIDATION_STATE);
    localStorage.removeItem(STORAGE_KEYS.DEVICE_METADATA);
  }
}