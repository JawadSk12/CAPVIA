/**
 * Form validation utilities
 */

export interface ValidationResult {
    isValid: boolean;
    errors: Record<string, string>;
}

/**
 * Validate email
 */
export function validateEmail(email: string): string | null {
    if (!email) return 'Email is required';

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return 'Invalid email format';
    }

    return null;
}

/**
 * Validate password
 */
export function validatePassword(password: string): string | null {
    if (!password) return 'Password is required';

    if (password.length < 6) {
        return 'Password must be at least 6 characters';
    }

    return null;
}

/**
 * Validate required field
 */
export function validateRequired(value: string, fieldName: string): string | null {
    if (!value || value.trim() === '') {
        return `${fieldName} is required`;
    }
    return null;
}

/**
 * Validate access code format
 */
export function validateAccessCode(code: string): string | null {
    if (!code) return 'Access code is required';

    if (code.length !== 8) {
        return 'Access code must be 8 characters';
    }

    if (!/^[A-Z0-9]+$/.test(code)) {
        return 'Access code must contain only letters and numbers';
    }

    return null;
}

/**
 * Validate code answer
 */
export function validateCodeAnswer(code: string): string | null {
    if (!code || code.trim() === '') {
        return 'Please write some code';
    }

    if (code.trim().length < 10) {
        return 'Code answer is too short';
    }

    return null;
}

/**
 * Validate text answer
 */
export function validateTextAnswer(text: string, minWords: number = 10): string | null {
    if (!text || text.trim() === '') {
        return 'Please provide an answer';
    }

    const wordCount = text.trim().split(/\s+/).length;
    if (wordCount < minWords) {
        return `Answer should be at least ${minWords} words (current: ${wordCount})`;
    }

    return null;
}

/**
 * Validate login form
 */
export function validateLoginForm(email: string, password: string): ValidationResult {
    const errors: Record<string, string> = {};

    const emailError = validateEmail(email);
    if (emailError) errors.email = emailError;

    const passwordError = validatePassword(password);
    if (passwordError) errors.password = passwordError;

    return {
        isValid: Object.keys(errors).length === 0,
        errors,
    };
}

/**
 * Validate registration form
 */
export function validateRegistrationForm(
    email: string,
    password: string,
    confirmPassword: string,
    fullName?: string
): ValidationResult {
    const errors: Record<string, string> = {};

    const emailError = validateEmail(email);
    if (emailError) errors.email = emailError;

    const passwordError = validatePassword(password);
    if (passwordError) errors.password = passwordError;

    if (password !== confirmPassword) {
        errors.confirmPassword = 'Passwords do not match';
    }

    if (fullName !== undefined) {
        const nameError = validateRequired(fullName, 'Full name');
        if (nameError) errors.fullName = nameError;
    }

    return {
        isValid: Object.keys(errors).length === 0,
        errors,
    };
}