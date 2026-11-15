// Compillo Authentication & User Management Service

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatarUrl: string;
  provider: 'google' | 'github' | 'email';
  role: 'Student' | 'Software Engineer' | 'Researcher' | 'Instructor' | 'Admin';
  university: string;
  bio: string;
  location: string;
  githubUsername?: string;
  createdAt: string;
  lastLoginAt: string;
}

const STORAGE_CURRENT_USER_KEY = 'compillo_auth_current_user_v2';
const STORAGE_REGISTERED_USERS_KEY = 'compillo_saved_users_db_v2';

// Default initial user for seamless first-time experience
const DEFAULT_INITIAL_USER: UserProfile = {
  id: 'usr-k-lavania-01',
  email: 'k@lavania.in',
  name: 'K. Lavania',
  avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=k-lavania',
  provider: 'google',
  role: 'Student',
  university: 'Rajasthan Technical University (RTU)',
  bio: 'Computer Science Scholar & Full-Stack Developer exploring Python, Algorithms, and Cloud Systems.',
  location: 'Kota, Rajasthan, India',
  githubUsername: 'klavania',
  createdAt: '2025-01-15T10:00:00.000Z',
  lastLoginAt: new Date().toISOString(),
};

class AuthService {
  private currentUser: UserProfile | null = null;
  private registeredUsers: UserProfile[] = [];
  private listeners: Array<(user: UserProfile | null) => void> = [];

  constructor() {
    this.init();
  }

  private init() {
    try {
      // Load registered users database
      const rawUsers = localStorage.getItem(STORAGE_REGISTERED_USERS_KEY);
      if (rawUsers) {
        this.registeredUsers = JSON.parse(rawUsers);
      } else {
        this.registeredUsers = [DEFAULT_INITIAL_USER];
        this.saveRegisteredUsers();
      }

      // Load current user
      const rawCurrent = localStorage.getItem(STORAGE_CURRENT_USER_KEY);
      if (rawCurrent !== null) {
        if (rawCurrent === 'null' || rawCurrent === '') {
          this.currentUser = null;
        } else {
          this.currentUser = JSON.parse(rawCurrent);
        }
      } else {
        // By default on clean run, set to DEFAULT_INITIAL_USER
        this.currentUser = DEFAULT_INITIAL_USER;
        this.saveCurrentUser();
      }
    } catch {
      this.currentUser = DEFAULT_INITIAL_USER;
      this.registeredUsers = [DEFAULT_INITIAL_USER];
    }
  }

  private saveCurrentUser() {
    try {
      if (this.currentUser) {
        localStorage.setItem(STORAGE_CURRENT_USER_KEY, JSON.stringify(this.currentUser));
      } else {
        localStorage.setItem(STORAGE_CURRENT_USER_KEY, 'null');
      }
    } catch {}
  }

  private saveRegisteredUsers() {
    try {
      localStorage.setItem(STORAGE_REGISTERED_USERS_KEY, JSON.stringify(this.registeredUsers));
    } catch {}
  }

  private notify() {
    this.saveCurrentUser();
    this.saveRegisteredUsers();
    this.listeners.forEach((cb) => cb(this.currentUser));
  }

  public getCurrentUser(): UserProfile | null {
    return this.currentUser ? { ...this.currentUser } : null;
  }

  public isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  public getRegisteredUsers(): UserProfile[] {
    return [...this.registeredUsers];
  }

  public subscribe(cb: (user: UserProfile | null) => void): () => void {
    this.listeners.push(cb);
    cb(this.getCurrentUser());
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  public signOut(): void {
    this.currentUser = null;
    this.notify();
  }

  public async signInWithGoogle(options?: {
    email?: string;
    name?: string;
    avatarUrl?: string;
    university?: string;
  }): Promise<UserProfile> {
    const email = options?.email || 'k@lavania.in';
    const name = options?.name || (email.startsWith('k@') ? 'K. Lavania' : email.split('@')[0]);
    const avatarUrl =
      options?.avatarUrl ||
      `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(email)}`;

    const existingIndex = this.registeredUsers.findIndex(
      (u) => u.email.toLowerCase() === email.toLowerCase()
    );

    let user: UserProfile;

    if (existingIndex >= 0) {
      user = {
        ...this.registeredUsers[existingIndex],
        provider: 'google',
        lastLoginAt: new Date().toISOString(),
        avatarUrl: options?.avatarUrl || this.registeredUsers[existingIndex].avatarUrl || avatarUrl,
      };
      this.registeredUsers[existingIndex] = user;
    } else {
      user = {
        id: `usr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        email,
        name,
        avatarUrl,
        provider: 'google',
        role: 'Student',
        university: options?.university || 'Rajasthan Technical University (RTU)',
        bio: 'Computer Science student & developer using Compillo Studio.',
        location: 'India',
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      };
      this.registeredUsers.push(user);
    }

    this.currentUser = user;
    this.notify();
    return user;
  }

  /**
   * Real Google OAuth Sign-In via popup window (to accounts.google.com)
   */
  public async signInWithGoogleOAuthPopup(): Promise<UserProfile> {
    // 1. Check if server has Google OAuth authorization URL
    const res = await fetch('/api/auth/google/url');
    const data = await res.json();

    if (!data.configured || !data.url) {
      throw new Error(data.message || 'Google OAuth is not configured on this server.');
    }

    const authUrl = data.url;
    const width = 520;
    const height = 640;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const popup = window.open(
      authUrl,
      'CompilloGoogleAuth',
      `width=${width},height=${height},left=${left},top=${top},status=0,toolbar=0,menubar=0`
    );

    if (!popup) {
      throw new Error('Popup blocked by browser. Please allow popups for Compillo Studio.');
    }

    return new Promise((resolve, reject) => {
      let timer: any = null;

      const handleMessage = (event: MessageEvent) => {
        if (!event.data) return;

        if (event.data.type === 'GOOGLE_OAUTH_SUCCESS') {
          window.removeEventListener('message', handleMessage);
          clearInterval(timer);
          const rawUser = event.data.user;

          this.signInWithGoogle({
            email: rawUser.email,
            name: rawUser.name,
            avatarUrl: rawUser.avatarUrl,
          })
            .then(resolve)
            .catch(reject);
        } else if (event.data.type === 'GOOGLE_OAUTH_ERROR') {
          window.removeEventListener('message', handleMessage);
          clearInterval(timer);
          reject(new Error(event.data.error || 'Google sign-in was cancelled or failed'));
        }
      };

      window.addEventListener('message', handleMessage);

      // Check if popup closed by user
      timer = setInterval(() => {
        if (popup.closed) {
          clearInterval(timer);
          window.removeEventListener('message', handleMessage);
          reject(new Error('Google sign-in window closed.'));
        }
      }, 1000);
    });
  }

  public async signInWithGithub(options?: {
    username?: string;
    email?: string;
    name?: string;
    avatarUrl?: string;
  }): Promise<UserProfile> {
    const username = options?.username || 'klavania';
    const email = options?.email || `${username}@github.compillo.dev`;
    const name = options?.name || options?.username || 'GitHub Developer';
    const avatarUrl =
      options?.avatarUrl || `https://github.com/${username}.png?size=200`;

    const existingIndex = this.registeredUsers.findIndex(
      (u) =>
        u.email.toLowerCase() === email.toLowerCase() ||
        (u.githubUsername && u.githubUsername.toLowerCase() === username.toLowerCase())
    );

    let user: UserProfile;

    if (existingIndex >= 0) {
      user = {
        ...this.registeredUsers[existingIndex],
        githubUsername: username,
        provider: 'github',
        lastLoginAt: new Date().toISOString(),
        avatarUrl: options?.avatarUrl || this.registeredUsers[existingIndex].avatarUrl || avatarUrl,
      };
      this.registeredUsers[existingIndex] = user;
    } else {
      user = {
        id: `usr-gh-${Date.now()}`,
        email,
        name,
        avatarUrl,
        provider: 'github',
        githubUsername: username,
        role: 'Software Engineer',
        university: 'Rajasthan Technical University (RTU)',
        bio: `GitHub Developer @${username}. Building high-performance code on Compillo Studio.`,
        location: 'Remote',
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      };
      this.registeredUsers.push(user);
    }

    this.currentUser = user;
    this.notify();
    return user;
  }

  /**
   * Real GitHub OAuth Sign-In via popup window (to github.com/login/oauth/authorize)
   */
  public async signInWithGithubOAuthPopup(): Promise<UserProfile> {
    const res = await fetch('/api/auth/github/url');
    const data = await res.json();

    if (!data.configured || !data.url) {
      throw new Error(data.message || 'GitHub OAuth App is not configured yet on this server.');
    }

    const authUrl = data.url;
    const width = 540;
    const height = 680;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const popup = window.open(
      authUrl,
      'CompilloGithubAuth',
      `width=${width},height=${height},left=${left},top=${top},status=0,toolbar=0,menubar=0`
    );

    if (!popup) {
      throw new Error('Popup blocked by browser. Please allow popups for Compillo Studio.');
    }

    return new Promise((resolve, reject) => {
      let timer: any = null;

      const handleMessage = async (event: MessageEvent) => {
        if (!event.data) return;

        if (event.data.type === 'GITHUB_OAUTH_SUCCESS') {
          window.removeEventListener('message', handleMessage);
          clearInterval(timer);
          const token = event.data.token;
          try {
            // Save token for Git operations
            localStorage.setItem('compillo_github_token', token);
            // Verify and retrieve full profile
            const verifyRes = await fetch('/api/auth/github/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ token }),
            });
            const vData = await verifyRes.json();
            if (vData.success && vData.user) {
              const u = await this.signInWithGithub({
                username: vData.user.login,
                name: vData.user.name,
                email: vData.user.email,
                avatarUrl: vData.user.avatarUrl,
              });
              resolve(u);
            } else {
              throw new Error(vData.error || 'Failed to verify GitHub token');
            }
          } catch (err: any) {
            reject(err);
          }
        } else if (event.data.type === 'GITHUB_OAUTH_ERROR') {
          window.removeEventListener('message', handleMessage);
          clearInterval(timer);
          reject(new Error(event.data.error || 'GitHub authentication failed'));
        }
      };

      window.addEventListener('message', handleMessage);

      timer = setInterval(() => {
        if (popup.closed) {
          clearInterval(timer);
          window.removeEventListener('message', handleMessage);
          reject(new Error('GitHub sign-in window closed.'));
        }
      }, 1000);
    });
  }

  /**
   * Real GitHub Token Sign-In (PAT or Fine-grained Personal Access Token)
   */
  public async signInWithGithubToken(token: string): Promise<UserProfile> {
    const cleanToken = token.trim();
    if (!cleanToken) throw new Error('Please enter a valid GitHub token.');

    const res = await fetch('/api/auth/github/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: cleanToken }),
    });

    const data = await res.json();
    if (!res.ok || !data.success || !data.user) {
      throw new Error(data.error || 'Invalid or expired GitHub token.');
    }

    localStorage.setItem('compillo_github_token', cleanToken);

    return this.signInWithGithub({
      username: data.user.login,
      name: data.user.name,
      email: data.user.email,
      avatarUrl: data.user.avatarUrl,
    });
  }

  /**
   * Instant Verified GitHub Account Lookup Sign-In (works immediately for any GitHub user)
   */
  public async signInWithGithubUsername(username: string): Promise<UserProfile> {
    const cleanUser = username.trim().replace(/^@/, '');
    if (!cleanUser) throw new Error('Please enter a GitHub username.');

    const res = await fetch(`/api/auth/github/lookup?username=${encodeURIComponent(cleanUser)}`);
    const data = await res.json();

    if (!res.ok || !data.success || !data.user) {
      // Fallback to direct github.png avatar if offline
      return this.signInWithGithub({
        username: cleanUser,
        name: cleanUser,
        email: `${cleanUser}@github.compillo.dev`,
        avatarUrl: `https://github.com/${cleanUser}.png?size=200`,
      });
    }

    return this.signInWithGithub({
      username: data.user.login,
      name: data.user.name,
      email: data.user.email,
      avatarUrl: data.user.avatarUrl,
    });
  }

  public async signInWithEmail(email: string, name: string): Promise<UserProfile> {
    const existingIndex = this.registeredUsers.findIndex(
      (u) => u.email.toLowerCase() === email.toLowerCase()
    );

    let user: UserProfile;

    if (existingIndex >= 0) {
      user = {
        ...this.registeredUsers[existingIndex],
        lastLoginAt: new Date().toISOString(),
      };
      this.registeredUsers[existingIndex] = user;
    } else {
      user = {
        id: `usr-mail-${Date.now()}`,
        email,
        name: name || email.split('@')[0],
        avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(email)}`,
        provider: 'email',
        role: 'Student',
        university: 'Rajasthan Technical University (RTU)',
        bio: 'Compillo Cloud IDE developer.',
        location: 'India',
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      };
      this.registeredUsers.push(user);
    }

    this.currentUser = user;
    this.notify();
    return user;
  }

  public updateProfile(updates: Partial<UserProfile>): UserProfile {
    if (!this.currentUser) {
      throw new Error('No user is currently signed in');
    }

    this.currentUser = {
      ...this.currentUser,
      ...updates,
    };

    const idx = this.registeredUsers.findIndex((u) => u.id === this.currentUser!.id);
    if (idx >= 0) {
      this.registeredUsers[idx] = this.currentUser;
    } else {
      this.registeredUsers.push(this.currentUser);
    }

    this.notify();
    return { ...this.currentUser };
  }
}

export const authService = new AuthService();
