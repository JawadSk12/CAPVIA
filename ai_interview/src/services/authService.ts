/**
 * authService.ts
 * Simple client-side role-based auth.
 * Credentials: intern / intern123   |   hr / hr123
 */

const SESSION_KEY = 'ir_auth_session';

const USERS: Record<string, { password: string; role: 'intern' | 'hr'; name: string }> = {
  intern: { password: 'intern123', role: 'intern', name: 'Candidate' },
  hr:     { password: 'hr123',     role: 'hr',     name: 'HR Manager' },
};

export interface AuthSession {
  username: string;
  name:     string;
  role:     'intern' | 'hr';
  loginAt:  string;
}

export class AuthService {
  /** Returns session on success, null on wrong credentials */
  static login(username: string, password: string): AuthSession | null {
    const cred = USERS[username.trim().toLowerCase()];
    if (!cred || cred.password !== password.trim()) return null;
    const session: AuthSession = {
      username: username.trim().toLowerCase(),
      name:     cred.name,
      role:     cred.role,
      loginAt:  new Date().toISOString(),
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session;
  }

  static getSession(): AuthSession | null {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      return raw ? (JSON.parse(raw) as AuthSession) : null;
    } catch {
      return null;
    }
  }

  static logout(): void {
    sessionStorage.removeItem(SESSION_KEY);
  }

  static isLoggedIn(): boolean {
    return !!this.getSession();
  }

  static getRole(): 'intern' | 'hr' | null {
    return this.getSession()?.role ?? null;
  }

  static requireRole(role: 'intern' | 'hr'): boolean {
    return this.getSession()?.role === role;
  }
}
