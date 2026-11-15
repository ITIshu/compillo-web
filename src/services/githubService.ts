export interface GitHubUser {
  login: string;
  id: number;
  name: string;
  avatar_url: string;
  html_url: string;
  public_repos: number;
  total_private_repos: number;
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  owner: string;
  default_branch: string;
  private: boolean;
  description: string;
  updated_at: string;
  html_url: string;
}

export interface GitHubSyncState {
  isConnected: boolean;
  user: GitHubUser | null;
  token: string | null;
  repos: GitHubRepo[];
  selectedRepo: GitHubRepo | null;
  branches: string[];
  selectedBranch: string;
  isSyncing: boolean;
  syncOperation: 'pull' | 'push' | 'idle';
  lastSyncAt: number | null;
  lastCommitSha: string | null;
  lastError: string | null;
  statusMessage: string | null;
  oauthConfigured: boolean;
  callbackUrl: string;
}

type SyncListener = (state: GitHubSyncState) => void;

class GitHubSyncService {
  private state: GitHubSyncState = {
    isConnected: false,
    user: null,
    token: null,
    repos: [],
    selectedRepo: null,
    branches: [],
    selectedBranch: 'main',
    isSyncing: false,
    syncOperation: 'idle',
    lastSyncAt: null,
    lastCommitSha: null,
    lastError: null,
    statusMessage: null,
    oauthConfigured: false,
    callbackUrl: '',
  };

  private listeners = new Set<SyncListener>();

  constructor() {
    if (typeof window !== 'undefined') {
      this.initFromStorage();
      this.setupOAuthMessageListener();
      this.checkOAuthStatus();
    }
  }

  private async checkOAuthStatus() {
    try {
      const res = await fetch('/api/github/status');
      if (res.ok) {
        const data = await res.json();
        this.state.oauthConfigured = Boolean(data.configured);
        this.state.callbackUrl = data.callbackUrl || `${window.location.origin}/api/auth/github/callback`;
        this.notify();
      }
    } catch (e) {
      // fallback
    }
  }

  public async getOAuthConfig(): Promise<{
    configured: boolean;
    clientId: string;
    hasClientSecret: boolean;
    callbackUrl: string;
  }> {
    try {
      const res = await fetch('/api/github/config');
      if (res.ok) {
        const data = await res.json();
        this.state.oauthConfigured = Boolean(data.configured);
        this.state.callbackUrl = data.callbackUrl;
        this.notify();
        return data;
      }
    } catch (e) {
      // fallback
    }
    const localClientId = localStorage.getItem('compillo_github_client_id') || '';
    return {
      configured: Boolean(localClientId),
      clientId: localClientId,
      hasClientSecret: false,
      callbackUrl: `${window.location.origin}/api/auth/github/callback`,
    };
  }

  public async saveOAuthConfig(
    clientId: string,
    clientSecret: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch('/api/github/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: clientId.trim(),
          clientSecret: clientSecret.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to save configuration' };
      }

      localStorage.setItem('compillo_github_client_id', clientId.trim());
      this.state.oauthConfigured = true;
      this.state.callbackUrl = data.callbackUrl;
      this.notify();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  public async clearOAuthConfig(): Promise<void> {
    try {
      await fetch('/api/github/config/delete', { method: 'POST' });
      localStorage.removeItem('compillo_github_client_id');
      this.state.oauthConfigured = false;
      this.notify();
    } catch {
      // ignore
    }
  }

  private async initFromStorage() {
    try {
      const savedToken = localStorage.getItem('compillo_github_token');
      const savedRepo = localStorage.getItem('compillo_github_repo');
      const savedBranch = localStorage.getItem('compillo_github_branch');

      if (savedBranch) {
        this.state.selectedBranch = savedBranch;
      }

      if (savedToken) {
        this.state.token = savedToken;
        await this.verifyAndLoadUser(savedToken, savedRepo);
      }
    } catch (e) {
      console.warn('Failed to load GitHub session:', e);
    }
  }

  private setupOAuthMessageListener() {
    window.addEventListener('message', async (event: MessageEvent) => {
      // Security check: ensure event is from our domain or popups
      if (event.data?.type === 'GITHUB_OAUTH_SUCCESS' && event.data.token) {
        const token = event.data.token;
        await this.loginWithToken(token);
      } else if (event.data?.type === 'GITHUB_OAUTH_ERROR') {
        this.state.lastError = event.data.error || 'Authentication rejected by user or server.';
        this.notify();
      }
    });
  }

  public getState(): GitHubSyncState {
    return { ...this.state };
  }

  public subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const currentState = this.getState();
    this.listeners.forEach((listener) => {
      try {
        listener(currentState);
      } catch (err) {
        console.error('Error in GitHubSync listener:', err);
      }
    });
  }

  /**
   * Verify token and fetch user details & repositories
   */
  public async loginWithToken(token: string): Promise<boolean> {
    const cleanToken = token.trim();
    if (!cleanToken) return false;

    this.state.isSyncing = true;
    this.state.statusMessage = 'Verifying GitHub credentials...';
    this.state.lastError = null;
    this.notify();

    try {
      const userRes = await fetch('/api/github/user', {
        headers: { Authorization: `Bearer ${cleanToken}` },
      });

      if (!userRes.ok) {
        const err = await userRes.json();
        throw new Error(err.error || 'Invalid GitHub token');
      }

      const userData: GitHubUser = await userRes.json();

      this.state.token = cleanToken;
      this.state.user = userData;
      this.state.isConnected = true;
      localStorage.setItem('compillo_github_token', cleanToken);

      // Fetch repos
      await this.refreshRepositories();

      this.state.isSyncing = false;
      this.state.statusMessage = `Connected as @${userData.login}`;
      this.notify();
      return true;
    } catch (err: any) {
      this.state.isSyncing = false;
      this.state.lastError = err.message || 'Authentication failed';
      this.state.statusMessage = null;
      this.notify();
      return false;
    }
  }

  /**
   * Initiate popup-based OAuth authorization flow
   */
  public async initiateOAuthPopup(): Promise<void> {
    this.state.lastError = null;
    this.state.statusMessage = 'Opening GitHub OAuth window...';
    this.notify();

    try {
      const res = await fetch('/api/auth/github/url');
      const data = await res.json();

      if (!data.configured || !data.url) {
        const pat = window.prompt(
          'GitHub OAuth App server credentials not configured.\n\nEnter your GitHub Personal Access Token (PAT) to connect:'
        );
        if (pat && pat.trim()) {
          await this.loginWithToken(pat.trim());
        } else {
          this.state.statusMessage = null;
          this.notify();
        }
        return;
      }

      const width = 600;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;

      const popup = window.open(
        data.url,
        'github_oauth_popup',
        `width=${width},height=${height},top=${top},left=${left},scrollbars=yes,status=yes`
      );

      if (!popup) {
        this.state.lastError = 'Browser popup was blocked. Please enable popups for this site.';
        this.state.statusMessage = null;
        this.notify();
      }
    } catch (err: any) {
      this.state.lastError = err.message || 'Failed to initialize OAuth window';
      this.state.statusMessage = null;
      this.notify();
    }
  }

  public async refreshRepositories(): Promise<void> {
    if (!this.state.token) return;

    try {
      const res = await fetch('/api/github/repos', {
        headers: { Authorization: `Bearer ${this.state.token}` },
      });

      if (res.ok) {
        const data = await res.json();
        this.state.repos = data.repos || [];

        // Restore selected repo if valid
        const savedRepoName = localStorage.getItem('compillo_github_repo');
        if (savedRepoName) {
          const match = this.state.repos.find((r) => r.full_name === savedRepoName);
          if (match) {
            await this.selectRepository(match);
          }
        }
        this.notify();
      }
    } catch (e) {
      console.warn('Failed to load repositories:', e);
    }
  }

  public async selectRepository(repo: GitHubRepo | null): Promise<void> {
    this.state.selectedRepo = repo;
    if (repo) {
      localStorage.setItem('compillo_github_repo', repo.full_name);
      await this.refreshBranches(repo.owner, repo.name, repo.default_branch);
    } else {
      localStorage.removeItem('compillo_github_repo');
      this.state.branches = [];
    }
    this.notify();
  }

  public async refreshBranches(owner: string, repo: string, defaultBranch?: string): Promise<void> {
    if (!this.state.token) return;

    try {
      const res = await fetch(
        `/api/github/branches?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}`,
        {
          headers: { Authorization: `Bearer ${this.state.token}` },
        }
      );

      if (res.ok) {
        const data = await res.json();
        const branchNames = (data.branches || []).map((b: any) => b.name);
        this.state.branches = branchNames;

        if (defaultBranch && branchNames.includes(defaultBranch)) {
          this.state.selectedBranch = defaultBranch;
        } else if (branchNames.length > 0 && !branchNames.includes(this.state.selectedBranch)) {
          this.state.selectedBranch = branchNames[0];
        }
        localStorage.setItem('compillo_github_branch', this.state.selectedBranch);
        this.notify();
      }
    } catch (e) {
      console.warn('Failed to fetch branches:', e);
    }
  }

  public selectBranch(branch: string) {
    this.state.selectedBranch = branch;
    localStorage.setItem('compillo_github_branch', branch);
    this.notify();
  }

  public async createNewBranch(branchName: string): Promise<boolean> {
    if (!this.state.token || !this.state.selectedRepo) return false;

    const trimmed = branchName.trim();
    if (!trimmed) return false;

    this.state.isSyncing = true;
    this.state.statusMessage = `Creating branch "${trimmed}" on GitHub...`;
    this.notify();

    try {
      const res = await fetch('/api/github/create-branch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.state.token}`,
        },
        body: JSON.stringify({
          owner: this.state.selectedRepo.owner,
          repo: this.state.selectedRepo.name,
          branchName: trimmed,
          baseBranch: this.state.selectedBranch || 'main',
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create branch');
      }

      await this.refreshBranches(this.state.selectedRepo.owner, this.state.selectedRepo.name, trimmed);
      this.state.selectedBranch = trimmed;
      this.state.isSyncing = false;
      this.state.statusMessage = `Branch "${trimmed}" created successfully!`;
      this.notify();
      return true;
    } catch (err: any) {
      this.state.isSyncing = false;
      this.state.lastError = err.message || 'Branch creation failed';
      this.notify();
      return false;
    }
  }

  /**
   * Pull files from the selected repository branch
   */
  public async pullRepositoryFiles(): Promise<{
    success: boolean;
    files?: Array<{ path: string; name: string; content: string; language: string }>;
    commitSha?: string;
    error?: string;
  }> {
    if (!this.state.token || !this.state.selectedRepo) {
      return { success: false, error: 'Select a repository first' };
    }

    this.state.isSyncing = true;
    this.state.syncOperation = 'pull';
    this.state.statusMessage = `Pulling files from ${this.state.selectedRepo.name} (${this.state.selectedBranch})...`;
    this.state.lastError = null;
    this.notify();

    try {
      const res = await fetch('/api/github/pull', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.state.token}`,
        },
        body: JSON.stringify({
          owner: this.state.selectedRepo.owner,
          repo: this.state.selectedRepo.name,
          branch: this.state.selectedBranch,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to pull repository');
      }

      const data = await res.json();
      this.state.isSyncing = false;
      this.state.syncOperation = 'idle';
      this.state.lastSyncAt = Date.now();
      this.state.lastCommitSha = data.commitSha;
      this.state.statusMessage = `Successfully pulled ${data.filesCount} files from GitHub!`;
      this.notify();

      return {
        success: true,
        files: data.files,
        commitSha: data.commitSha,
      };
    } catch (err: any) {
      this.state.isSyncing = false;
      this.state.syncOperation = 'idle';
      this.state.lastError = err.message || 'Pull operation failed';
      this.state.statusMessage = null;
      this.notify();
      return { success: false, error: err.message };
    }
  }

  /**
   * Push local workspace changes to the selected repository branch
   */
  public async pushWorkspaceChanges(
    files: Array<{ path: string; name: string; content: string }>,
    commitMessage: string
  ): Promise<{ success: boolean; commitSha?: string; htmlUrl?: string; error?: string }> {
    if (!this.state.token || !this.state.selectedRepo) {
      return { success: false, error: 'Select a repository first' };
    }

    if (!files || files.length === 0) {
      return { success: false, error: 'No files to commit' };
    }

    this.state.isSyncing = true;
    this.state.syncOperation = 'push';
    this.state.statusMessage = `Pushing ${files.length} files to ${this.state.selectedRepo.name} (${this.state.selectedBranch})...`;
    this.state.lastError = null;
    this.notify();

    try {
      const res = await fetch('/api/github/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.state.token}`,
        },
        body: JSON.stringify({
          owner: this.state.selectedRepo.owner,
          repo: this.state.selectedRepo.name,
          branch: this.state.selectedBranch,
          commitMessage: commitMessage || 'Update files via Compillo Studio',
          files,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to push changes');
      }

      const data = await res.json();
      this.state.isSyncing = false;
      this.state.syncOperation = 'idle';
      this.state.lastSyncAt = Date.now();
      this.state.lastCommitSha = data.commitSha;
      this.state.statusMessage = `Successfully pushed ${data.filesCommitted} files to branch ${this.state.selectedBranch}!`;
      this.notify();

      return {
        success: true,
        commitSha: data.commitSha,
        htmlUrl: data.htmlUrl,
      };
    } catch (err: any) {
      this.state.isSyncing = false;
      this.state.syncOperation = 'idle';
      this.state.lastError = err.message || 'Push operation failed';
      this.state.statusMessage = null;
      this.notify();
      return { success: false, error: err.message };
    }
  }

  public disconnect() {
    localStorage.removeItem('compillo_github_token');
    localStorage.removeItem('compillo_github_repo');
    localStorage.removeItem('compillo_github_branch');
    this.state = {
      ...this.state,
      isConnected: false,
      user: null,
      token: null,
      repos: [],
      selectedRepo: null,
      branches: [],
      selectedBranch: 'main',
      lastSyncAt: null,
      lastCommitSha: null,
      lastError: null,
      statusMessage: 'Disconnected from GitHub',
    };
    this.notify();
  }

  private async verifyAndLoadUser(token: string, savedRepo: string | null) {
    try {
      const userRes = await fetch('/api/github/user', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (userRes.ok) {
        const userData: GitHubUser = await userRes.json();
        this.state.user = userData;
        this.state.isConnected = true;
        await this.refreshRepositories();
        this.notify();
      } else {
        this.disconnect();
      }
    } catch (e) {
      console.warn('Could not verify GitHub session:', e);
    }
  }

  public async quickPushWorkspaceFiles(options: {
    githubId?: string;
    token?: string;
    repoName: string;
    branch?: string;
    isPrivate?: boolean;
    autoCreate?: boolean;
    commitMessage?: string;
    files: Array<{ path: string; name?: string; content: string }>;
  }): Promise<{
    success: boolean;
    commitSha?: string;
    repoUrl?: string;
    htmlUrl?: string;
    filesCount?: number;
    error?: string;
  }> {
    const effectiveToken = (options.token || this.state.token || '').trim();
    if (!effectiveToken) {
      return { success: false, error: 'GitHub token or Personal Access Token is required.' };
    }

    try {
      const res = await fetch('/api/github/quick-push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${effectiveToken}`,
        },
        body: JSON.stringify({
          githubId: options.githubId,
          token: effectiveToken,
          repoName: options.repoName,
          branch: options.branch || 'main',
          isPrivate: options.isPrivate ?? false,
          autoCreate: options.autoCreate ?? true,
          commitMessage: options.commitMessage || 'Push project files via Compillo Studio',
          files: options.files,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to push files to GitHub');
      }

      // Save token & username if successful
      if (options.token) {
        localStorage.setItem('compillo_github_token', options.token.trim());
        this.state.token = options.token.trim();
        this.state.isConnected = true;
      }
      if (options.githubId) {
        localStorage.setItem('compillo_github_id', options.githubId.trim());
      }
      if (options.repoName) {
        localStorage.setItem('compillo_github_repo', options.repoName.trim());
      }

      this.state.lastSyncAt = Date.now();
      this.state.lastCommitSha = data.commitSha;
      this.notify();

      return {
        success: true,
        commitSha: data.commitSha,
        repoUrl: data.repoUrl,
        htmlUrl: data.htmlUrl,
        filesCount: data.filesCount,
      };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Quick push operation failed' };
    }
  }

  public async verifyPersonalAccessToken(
    token: string,
    githubId?: string
  ): Promise<{ success: boolean; user?: GitHubUser; error?: string }> {
    try {
      const res = await fetch('/api/github/verify-pat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token.trim(), githubId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return { success: true, user: data.user };
      }
      return { success: false, error: data.error || 'Invalid token or insufficient scope' };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to verify token' };
    }
  }
}

export const githubSyncService = new GitHubSyncService();
