import { Router, Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';

export const githubRouter = Router();

const CONFIG_FILE = path.join(process.cwd(), '.github_oauth_config.json');

let runtimeClientId = '';
let runtimeClientSecret = '';

function loadRuntimeConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
      if (data.clientId) runtimeClientId = data.clientId;
      if (data.clientSecret) runtimeClientSecret = data.clientSecret;
    }
  } catch (e) {
    console.warn('[GitHub OAuth] Could not read config file:', e);
  }
}
loadRuntimeConfig();

// Lazy load Gemini AI for smart code completions
let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (geminiClient) return geminiClient;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  try {
    geminiClient = new GoogleGenAI({ apiKey });
    return geminiClient;
  } catch (err) {
    console.warn('[Gemini Client] Init failed:', err);
    return null;
  }
}

function getAppUrl(req: Request): string {
  if (process.env.APP_URL) {
    return process.env.APP_URL.replace(/\/+$/, '');
  }
  const host = req.get('x-forwarded-host') || req.get('host') || 'localhost:3000';
  const proto = req.get('x-forwarded-proto') || req.protocol || 'http';
  return `${proto}://${host}`;
}

function getGithubClientId(): string {
  return runtimeClientId || process.env.GITHUB_CLIENT_ID || process.env.CLIENT_ID || '';
}

function getGithubClientSecret(): string {
  return runtimeClientSecret || process.env.GITHUB_CLIENT_SECRET || process.env.CLIENT_SECRET || '';
}

// 1. Get GitHub OAuth Status & URL
githubRouter.get('/auth/github/url', (req: Request, res: Response) => {
  const clientId = getGithubClientId();
  const appUrl = getAppUrl(req);
  const redirectUri = (req.query.redirect_uri as string) || `${appUrl}/api/auth/github/callback`;

  if (!clientId) {
    res.json({
      configured: false,
      clientId: null,
      redirectUri,
      url: null,
      message: 'GITHUB_CLIENT_ID environment variable is not configured.',
    });
    return;
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'repo,user:email,read:user',
    allow_signup: 'true',
  });

  const url = `https://github.com/login/oauth/authorize?${params.toString()}`;
  res.json({
    configured: true,
    clientId,
    redirectUri,
    url,
  });
});

// Status endpoint for frontend to check credentials and exact callback URLs
githubRouter.get('/github/status', (req: Request, res: Response) => {
  const clientId = getGithubClientId();
  const clientSecret = getGithubClientSecret();
  const appUrl = getAppUrl(req);
  const callbackUrl = `${appUrl}/api/auth/github/callback`;

  res.json({
    configured: Boolean(clientId && clientSecret),
    hasClientId: Boolean(clientId),
    hasClientSecret: Boolean(clientSecret),
    clientId: clientId ? `${clientId.slice(0, 8)}...` : null,
    callbackUrl,
    appUrl,
  });
});

// Save OAuth credentials from Settings
githubRouter.post('/github/config', (req: Request, res: Response) => {
  const { clientId, clientSecret } = req.body || {};
  if (!clientId || !clientSecret) {
    res.status(400).json({ error: 'Both GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET are required.' });
    return;
  }

  runtimeClientId = String(clientId).trim();
  runtimeClientSecret = String(clientSecret).trim();

  try {
    fs.writeFileSync(
      CONFIG_FILE,
      JSON.stringify(
        {
          clientId: runtimeClientId,
          clientSecret: runtimeClientSecret,
          updatedAt: new Date().toISOString(),
        },
        null,
        2
      ),
      'utf-8'
    );
  } catch (e) {
    console.error('[GitHub OAuth] Error writing config file:', e);
  }

  const appUrl = getAppUrl(req);
  res.json({
    success: true,
    configured: true,
    clientId: runtimeClientId,
    callbackUrl: `${appUrl}/api/auth/github/callback`,
    message: 'GitHub OAuth App credentials saved successfully.',
  });
});

// Clear OAuth configuration
githubRouter.post('/github/config/delete', (_req: Request, res: Response) => {
  runtimeClientId = '';
  runtimeClientSecret = '';
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      fs.unlinkSync(CONFIG_FILE);
    }
  } catch (e) {
    // ignore
  }
  res.json({ success: true, message: 'GitHub OAuth configuration removed.' });
});

// Get current OAuth configuration (with safe masking for client secret)
githubRouter.get('/github/config', (req: Request, res: Response) => {
  const clientId = getGithubClientId();
  const clientSecret = getGithubClientSecret();
  const appUrl = getAppUrl(req);
  const callbackUrl = `${appUrl}/api/auth/github/callback`;

  res.json({
    configured: Boolean(clientId && clientSecret),
    clientId: clientId || '',
    hasClientSecret: Boolean(clientSecret),
    callbackUrl,
    appUrl,
  });
});

// 2. OAuth Callback Route (popup window target)
const handleOAuthCallback = async (req: Request, res: Response) => {
  const { code, error, error_description } = req.query;

  if (error || !code) {
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>GitHub Authentication Failed</title>
          <style>
            body { font-family: system-ui, sans-serif; background: #18181b; color: #fff; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .card { background: #27272a; padding: 24px; border-radius: 8px; max-width: 400px; text-align: center; border: 1px solid #ef4444; }
            h2 { color: #f87171; margin-top: 0; }
          </style>
        </head>
        <body>
          <div class="card">
            <h2>Authentication Failed</h2>
            <p>${error_description || error || 'Missing authorization code from GitHub.'}</p>
            <p>You can close this window and try again.</p>
          </div>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'GITHUB_OAUTH_ERROR', error: '${error || 'auth_failed'}' }, '*');
            }
          </script>
        </body>
      </html>
    `);
    return;
  }

  const clientId = getGithubClientId();
  const clientSecret = getGithubClientSecret();

  try {
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code: code as string,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error || !tokenData.access_token) {
      res.send(`
        <!DOCTYPE html>
        <html>
          <body style="background: #18181b; color: #fff; font-family: sans-serif; padding: 2rem; text-align: center;">
            <h3 style="color: #f87171;">Token Exchange Failed</h3>
            <p>${tokenData.error_description || tokenData.error || 'Failed to exchange authorization code'}</p>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'GITHUB_OAUTH_ERROR', error: '${tokenData.error}' }, '*');
              }
            </script>
          </body>
        </html>
      `);
      return;
    }

    const accessToken = tokenData.access_token;

    // Send token to opener via postMessage and close popup
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>GitHub Sync Connected</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .card { background: #1e293b; padding: 32px; border-radius: 12px; text-align: center; border: 1px solid #334155; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
            .success { color: #34d399; font-size: 20px; font-weight: 600; margin-bottom: 8px; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="success">✓ GitHub Connected</div>
            <p>Synchronizing account with Compillo IDE...</p>
            <p style="color: #94a3b8; font-size: 13px;">This window will close automatically.</p>
          </div>
          <script>
            try {
              if (window.opener) {
                window.opener.postMessage({
                  type: 'GITHUB_OAUTH_SUCCESS',
                  token: ${JSON.stringify(accessToken)}
                }, '*');
                setTimeout(() => window.close(), 600);
              } else {
                window.location.href = '/';
              }
            } catch (err) {
              console.error(err);
            }
          </script>
        </body>
      </html>
    `);
  } catch (err: any) {
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
        <body style="background: #18181b; color: #fff; font-family: sans-serif; padding: 2rem;">
          <h3 style="color: #f87171;">Server Error</h3>
          <p>${err.message || 'Unknown error occurred during token exchange'}</p>
        </body>
      </html>
    `);
  }
};

githubRouter.get(['/auth/github/callback', '/auth/github/callback/'], handleOAuthCallback);

// Helper for GitHub authenticated requests
async function callGitHubApi(endpoint: string, token: string, options: RequestInit = {}) {
  const headers = {
    Accept: 'application/vnd.github.v3+json',
    Authorization: `Bearer ${token}`,
    'User-Agent': 'Compillo-IDE-GitHub-Sync',
    ...(options.headers || {}),
  };

  const response = await fetch(`https://api.github.com${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    let parsed: any;
    try {
      parsed = JSON.parse(errorBody);
    } catch {
      parsed = { message: errorBody };
    }
    throw new Error(parsed.message || `GitHub API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// Safe helper that returns status and ok without throwing on 404
async function callGitHubApiSafe(
  endpoint: string,
  token: string,
  options: RequestInit = {}
): Promise<{ ok: boolean; status: number; data?: any; error?: string }> {
  const headers = {
    Accept: 'application/vnd.github.v3+json',
    Authorization: `Bearer ${token}`,
    'User-Agent': 'Compillo-IDE-GitHub-Sync',
    ...(options.headers || {}),
  };

  try {
    const response = await fetch(`https://api.github.com${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      let parsed: any;
      try {
        parsed = JSON.parse(errorBody);
      } catch {
        parsed = { message: errorBody };
      }
      return { ok: false, status: response.status, error: parsed.message || `HTTP ${response.status}` };
    }

    const data = await response.json().catch(() => ({}));
    return { ok: true, status: response.status, data };
  } catch (err: any) {
    return { ok: false, status: 500, error: err?.message || 'Network request failed' };
  }
}

// 3. User Profile
githubRouter.get('/github/user', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing GitHub access token' });
    return;
  }
  const token = authHeader.slice(7);

  try {
    const user = await callGitHubApi('/user', token);
    res.json({
      login: user.login,
      id: user.id,
      name: user.name || user.login,
      avatar_url: user.avatar_url,
      html_url: user.html_url,
      public_repos: user.public_repos,
      total_private_repos: user.total_private_repos || 0,
    });
  } catch (err: any) {
    res.status(401).json({ error: err.message || 'Failed to authenticate with GitHub' });
  }
});

// 4. List User Repositories
githubRouter.get('/github/repos', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).json({ error: 'Missing token' });
    return;
  }
  const token = authHeader.replace(/^Bearer\s+/, '');

  try {
    const repos = await callGitHubApi('/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member', token);
    const simplified = (repos as any[]).map((r) => ({
      id: r.id,
      name: r.name,
      full_name: r.full_name,
      owner: r.owner?.login,
      default_branch: r.default_branch || 'main',
      private: r.private,
      description: r.description || '',
      updated_at: r.updated_at,
      html_url: r.html_url,
    }));
    res.json({ repos: simplified });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch repositories' });
  }
});

// 5. List Branches for Repository
githubRouter.get('/github/branches', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const { owner, repo } = req.query;

  if (!authHeader || !owner || !repo) {
    res.status(400).json({ error: 'Missing owner, repo, or authorization' });
    return;
  }
  const token = authHeader.replace(/^Bearer\s+/, '');

  try {
    const branches = await callGitHubApi(`/repos/${owner}/${repo}/branches?per_page=100`, token);
    const branchNames = (branches as any[]).map((b) => ({
      name: b.name,
      sha: b.commit?.sha,
      protected: b.protected || false,
    }));
    res.json({ branches: branchNames });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch branches' });
  }
});

// 6. Create Branch
githubRouter.post('/github/create-branch', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const { owner, repo, branchName, baseBranch = 'main' } = req.body;

  if (!authHeader || !owner || !repo || !branchName) {
    res.status(400).json({ error: 'Missing required parameters' });
    return;
  }
  const token = authHeader.replace(/^Bearer\s+/, '');

  try {
    // Get base branch commit SHA
    const baseRef = await callGitHubApi(`/repos/${owner}/${repo}/git/ref/heads/${baseBranch}`, token);
    const sha = baseRef.object?.sha;
    if (!sha) throw new Error(`Could not locate base branch: ${baseBranch}`);

    // Create new ref
    const newRef = await callGitHubApi(`/repos/${owner}/${repo}/git/refs`, token, {
      method: 'POST',
      body: JSON.stringify({
        ref: `refs/heads/${branchName.trim()}`,
        sha,
      }),
    });

    res.json({ success: true, branch: branchName, sha: newRef.object?.sha });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create branch' });
  }
});

// 7. Pull Repository Files from Selected Branch
githubRouter.post('/github/pull', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const { owner, repo, branch = 'main' } = req.body;

  if (!authHeader || !owner || !repo) {
    res.status(400).json({ error: 'Missing owner, repo, or authorization' });
    return;
  }
  const token = authHeader.replace(/^Bearer\s+/, '');

  try {
    // 1. Get branch commit
    const refData = await callGitHubApi(`/repos/${owner}/${repo}/git/ref/heads/${branch}`, token);
    const commitSha = refData.object?.sha;

    // 2. Get tree recursively
    const treeData = await callGitHubApi(`/repos/${owner}/${repo}/git/trees/${commitSha}?recursive=1`, token);
    const items = (treeData.tree || []) as Array<{
      path: string;
      mode: string;
      type: 'blob' | 'tree';
      sha: string;
      size?: number;
    }>;

    // Filter to code/text files, skip large binaries (> 1.5MB) or .git directory
    const textBlobItems = items.filter(
      (item) => item.type === 'blob' && (!item.size || item.size < 1_500_000) && !item.path.startsWith('.git/')
    ).slice(0, 150); // limit to reasonable file set for web workspace

    // 3. Fetch file contents concurrently in chunks
    const files: Array<{ path: string; name: string; content: string; language: string }> = [];

    const fetchChunk = async (chunk: typeof textBlobItems) => {
      await Promise.all(
        chunk.map(async (item) => {
          try {
            const blobData = await callGitHubApi(`/repos/${owner}/${repo}/git/blobs/${item.sha}`, token);
            let content = '';
            if (blobData.encoding === 'base64') {
              content = Buffer.from(blobData.content, 'base64').toString('utf-8');
            } else {
              content = blobData.content || '';
            }

            const segments = item.path.split('/');
            const name = segments[segments.length - 1];

            // Helper language detection
            const ext = name.split('.').pop()?.toLowerCase() || '';
            const langMap: Record<string, string> = {
              py: 'python',
              js: 'javascript',
              jsx: 'javascript',
              ts: 'typescript',
              tsx: 'typescript',
              html: 'html',
              css: 'css',
              json: 'json',
              c: 'c',
              cpp: 'cpp',
              h: 'c',
              hpp: 'cpp',
              java: 'java',
              rs: 'rust',
              go: 'go',
              sql: 'sql',
              sh: 'shell',
              bash: 'shell',
              md: 'markdown',
              txt: 'plaintext',
            };

            files.push({
              path: `/${item.path}`,
              name,
              content,
              language: langMap[ext] || 'plaintext',
            });
          } catch (e) {
            console.warn(`Failed to fetch blob for ${item.path}:`, e);
          }
        })
      );
    };

    // Run in chunks of 15
    for (let i = 0; i < textBlobItems.length; i += 15) {
      await fetchChunk(textBlobItems.slice(i, i + 15));
    }

    res.json({
      success: true,
      commitSha,
      branch,
      filesCount: files.length,
      files,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to pull repository from GitHub' });
  }
});

// 7b. Verify GitHub Personal Access Token or credentials
githubRouter.post('/github/verify-pat', async (req: Request, res: Response) => {
  const { token, githubId } = req.body || {};
  if (!token || typeof token !== 'string' || !token.trim()) {
    res.status(400).json({ success: false, error: 'Personal Access Token is required' });
    return;
  }
  const cleanToken = token.trim();
  const userRes = await callGitHubApiSafe('/user', cleanToken);
  if (!userRes.ok) {
    res.status(401).json({
      success: false,
      error: userRes.error || 'Invalid GitHub token. Ensure token has "repo" permissions.',
    });
    return;
  }
  const user = userRes.data;
  res.json({
    success: true,
    user: {
      login: user.login,
      id: user.id,
      name: user.name || user.login,
      avatar_url: user.avatar_url,
      html_url: user.html_url,
      public_repos: user.public_repos,
    },
  });
});

// 8. Push Local Workspace Files to Selected Branch (with empty-repo fallback)
githubRouter.post('/github/push', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const { owner, repo, branch = 'main', commitMessage = 'Update files via Compillo IDE', files = [] } = req.body;

  if (!authHeader || !owner || !repo) {
    res.status(400).json({ error: 'Missing owner, repo, or authorization' });
    return;
  }
  if (!Array.isArray(files) || files.length === 0) {
    res.status(400).json({ error: 'No files provided for commit' });
    return;
  }
  const token = authHeader.replace(/^Bearer\s+/, '').trim();

  try {
    // 1. Create blobs for workspace files
    const treeItems: Array<{ path: string; mode: string; type: string; sha: string }> = [];

    for (const f of files) {
      if (!f.path || typeof f.content !== 'string') continue;
      const cleanPath = f.path.startsWith('/') ? f.path.slice(1) : f.path;
      if (!cleanPath || cleanPath.startsWith('.git/')) continue;

      const blobRes = await callGitHubApiSafe(`/repos/${owner}/${repo}/git/blobs`, token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: f.content,
          encoding: 'utf-8',
        }),
      });

      if (!blobRes.ok) {
        throw new Error(`Failed to create blob for ${cleanPath}: ${blobRes.error}`);
      }

      treeItems.push({
        path: cleanPath,
        mode: '100644',
        type: 'blob',
        sha: blobRes.data.sha,
      });
    }

    if (treeItems.length === 0) {
      res.status(400).json({ error: 'No valid files to commit' });
      return;
    }

    // 2. Check if current branch ref exists
    const refCheck = await callGitHubApiSafe(`/repos/${owner}/${repo}/git/ref/heads/${branch}`, token);
    let commitSha = '';

    if (refCheck.ok) {
      const parentCommitSha = refCheck.data?.object?.sha;
      const parentCommit = await callGitHubApi(`/repos/${owner}/${repo}/git/commits/${parentCommitSha}`, token);
      const baseTreeSha = parentCommit.tree?.sha;

      const newTree = await callGitHubApi(`/repos/${owner}/${repo}/git/trees`, token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base_tree: baseTreeSha,
          tree: treeItems,
        }),
      });

      const newCommit = await callGitHubApi(`/repos/${owner}/${repo}/git/commits`, token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: commitMessage.trim() || 'Sync workspace changes',
          tree: newTree.sha,
          parents: [parentCommitSha],
        }),
      });

      await callGitHubApi(`/repos/${owner}/${repo}/git/refs/heads/${branch}`, token, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sha: newCommit.sha,
          force: false,
        }),
      });

      commitSha = newCommit.sha;
    } else {
      // Empty repo or new branch: create root tree & root commit with no parents
      const newTree = await callGitHubApi(`/repos/${owner}/${repo}/git/trees`, token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tree: treeItems }),
      });

      const newCommit = await callGitHubApi(`/repos/${owner}/${repo}/git/commits`, token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: commitMessage.trim() || 'Initial project commit via Compillo Studio',
          tree: newTree.sha,
          parents: [],
        }),
      });

      // Create branch reference
      const createRef = await callGitHubApiSafe(`/repos/${owner}/${repo}/git/refs`, token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ref: `refs/heads/${branch}`,
          sha: newCommit.sha,
        }),
      });

      if (!createRef.ok) {
        // Fallback: update default branch if already exists
        await callGitHubApiSafe(`/repos/${owner}/${repo}/git/refs/heads/${branch}`, token, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sha: newCommit.sha, force: true }),
        });
      }

      commitSha = newCommit.sha;
    }

    res.json({
      success: true,
      commitSha,
      branch,
      filesCommitted: treeItems.length,
      htmlUrl: `https://github.com/${owner}/${repo}/commit/${commitSha}`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to push changes to GitHub' });
  }
});

// 8b. Universal Quick Push Endpoint: Auto-create repo, auto-initialize, and push all files
githubRouter.post('/github/quick-push', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const {
    githubId,
    token: bodyToken,
    repoName,
    branch = 'main',
    isPrivate = false,
    autoCreate = true,
    commitMessage = 'Sync project files via Compillo Studio',
    files = [],
  } = req.body || {};

  const token = (bodyToken || (authHeader && authHeader.replace(/^Bearer\s+/, '')) || '').trim();

  if (!token) {
    res.status(401).json({ error: 'GitHub access token (or Personal Access Token) is required' });
    return;
  }

  if (!repoName || typeof repoName !== 'string' || !repoName.trim()) {
    res.status(400).json({ error: 'Repository name is required' });
    return;
  }

  if (!Array.isArray(files) || files.length === 0) {
    res.status(400).json({ error: 'No workspace files provided for commit' });
    return;
  }

  try {
    // 1. Verify token & get authenticated user
    const userRes = await callGitHubApiSafe('/user', token);
    if (!userRes.ok) {
      res.status(401).json({ error: `Authentication failed: ${userRes.error}. Please check your token.` });
      return;
    }
    const currentUsername = userRes.data?.login;
    const owner = (githubId && typeof githubId === 'string' && githubId.trim())
      ? githubId.trim().replace(/^@/, '')
      : currentUsername;

    // Sanitize repository name
    const cleanRepoName = repoName.trim().replace(/^https?:\/\/github\.com\//, '').replace(/^.*\//, '');

    // 2. Check if repository exists
    const repoCheck = await callGitHubApiSafe(`/repos/${owner}/${cleanRepoName}`, token);
    let targetRepo = repoCheck.data;

    if (!repoCheck.ok && repoCheck.status === 404) {
      if (!autoCreate) {
        res.status(404).json({ error: `Repository "${owner}/${cleanRepoName}" does not exist on GitHub.` });
        return;
      }

      // Automatically create repository on user's GitHub account
      const createRes = await callGitHubApiSafe('/user/repos', token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cleanRepoName,
          private: Boolean(isPrivate),
          description: 'Exported from Compillo Studio Web IDE',
          auto_init: false,
        }),
      });

      if (!createRes.ok) {
        res.status(400).json({
          error: `Could not create repository "${cleanRepoName}": ${createRes.error}. (Verify token has "repo" permissions)`,
        });
        return;
      }
      targetRepo = createRes.data;
    }

    // 3. Create Git Blobs for all valid workspace files
    const treeItems: Array<{ path: string; mode: string; type: string; sha: string }> = [];

    for (const f of files) {
      if (!f.path || typeof f.content !== 'string') continue;
      const cleanPath = f.path.startsWith('/') ? f.path.slice(1) : f.path;
      if (!cleanPath || cleanPath.startsWith('.git/')) continue;

      const blobRes = await callGitHubApiSafe(`/repos/${owner}/${cleanRepoName}/git/blobs`, token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: f.content,
          encoding: 'utf-8',
        }),
      });

      if (!blobRes.ok) {
        throw new Error(`Failed to create blob for ${cleanPath}: ${blobRes.error}`);
      }

      treeItems.push({
        path: cleanPath,
        mode: '100644',
        type: 'blob',
        sha: blobRes.data.sha,
      });
    }

    if (treeItems.length === 0) {
      res.status(400).json({ error: 'No valid workspace files found to push' });
      return;
    }

    // 4. Check if target branch ref exists
    const targetBranch = branch || targetRepo?.default_branch || 'main';
    const refCheck = await callGitHubApiSafe(`/repos/${owner}/${cleanRepoName}/git/ref/heads/${targetBranch}`, token);

    let newCommitSha = '';

    if (refCheck.ok) {
      // Existing repository with branch: build on top of parent commit
      const parentCommitSha = refCheck.data?.object?.sha;
      const parentCommit = await callGitHubApi(`/repos/${owner}/${cleanRepoName}/git/commits/${parentCommitSha}`, token);
      const baseTreeSha = parentCommit.tree?.sha;

      const newTree = await callGitHubApi(`/repos/${owner}/${cleanRepoName}/git/trees`, token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base_tree: baseTreeSha,
          tree: treeItems,
        }),
      });

      const newCommit = await callGitHubApi(`/repos/${owner}/${cleanRepoName}/git/commits`, token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: commitMessage.trim() || 'Sync workspace changes via Compillo',
          tree: newTree.sha,
          parents: [parentCommitSha],
        }),
      });

      await callGitHubApi(`/repos/${owner}/${cleanRepoName}/git/refs/heads/${targetBranch}`, token, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sha: newCommit.sha,
          force: false,
        }),
      });

      newCommitSha = newCommit.sha;
    } else {
      // Empty or newly created repository: create root tree & commit with parents: []
      const newTree = await callGitHubApi(`/repos/${owner}/${cleanRepoName}/git/trees`, token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tree: treeItems,
        }),
      });

      const newCommit = await callGitHubApi(`/repos/${owner}/${cleanRepoName}/git/commits`, token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: commitMessage.trim() || 'Initial project commit via Compillo Studio',
          tree: newTree.sha,
          parents: [],
        }),
      });

      // Create branch ref: refs/heads/${targetBranch}
      const createRefRes = await callGitHubApiSafe(`/repos/${owner}/${cleanRepoName}/git/refs`, token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ref: `refs/heads/${targetBranch}`,
          sha: newCommit.sha,
        }),
      });

      if (!createRefRes.ok) {
        // Fallback: try updating default branch if auto-created
        const defaultBranch = targetRepo?.default_branch || 'main';
        await callGitHubApiSafe(`/repos/${owner}/${cleanRepoName}/git/refs/heads/${defaultBranch}`, token, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sha: newCommit.sha, force: true }),
        });
      }

      newCommitSha = newCommit.sha;
    }

    res.json({
      success: true,
      commitSha: newCommitSha,
      branch: targetBranch,
      filesCount: treeItems.length,
      repoUrl: `https://github.com/${owner}/${cleanRepoName}`,
      htmlUrl: `https://github.com/${owner}/${cleanRepoName}/commit/${newCommitSha}`,
      message: `Successfully pushed ${treeItems.length} files to ${owner}/${cleanRepoName} (${targetBranch})!`,
    });
  } catch (err: any) {
    console.error('GitHub Quick Push error:', err);
    res.status(500).json({ error: err.message || 'Failed to push files to GitHub repository' });
  }
});

// 9. Smart Code Completion Endpoint (powered by Gemini)
githubRouter.post('/completion/smart', async (req: Request, res: Response) => {
  const { prefix, suffix = '', language = 'python', filename = 'file.py' } = req.body;

  if (!prefix || typeof prefix !== 'string') {
    res.json({ suggestions: [] });
    return;
  }

  const ai = getGeminiClient();
  if (!ai) {
    res.json({
      suggestions: [],
      reason: 'AI service not configured or key absent',
    });
    return;
  }

  try {
    const prompt = `You are a high-speed smart code completion engine for a code editor.
Language: ${language}
File: ${filename}

The user is currently writing code. Here is the code BEFORE the cursor:
\`\`\`${language}
${prefix.slice(-1500)}
\`\`\`

Here is the code AFTER the cursor:
\`\`\`${language}
${suffix.slice(0, 500)}
\`\`\`

TASK:
Provide up to 4 high-probability, helpful code completion continuations for the cursor position.
Keep completions concise (1 to 5 lines maximum). Do NOT include markdown code blocks or explanations.
Format output as a raw JSON array of strings:
["suggestion 1", "suggestion 2"]`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    });

    const text = response.text || '[]';
    let suggestions: string[] = [];
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        suggestions = parsed.filter((s) => typeof s === 'string' && s.trim().length > 0);
      }
    } catch {
      suggestions = [];
    }

    res.json({ suggestions: suggestions.slice(0, 4) });
  } catch (err: any) {
    console.warn('[Smart Completion Error]:', err.message);
    res.json({ suggestions: [] });
  }
});

// Verify GitHub Personal Access Token or OAuth token and return verified user details
githubRouter.post('/auth/github/verify', async (req: Request, res: Response) => {
  const { token } = req.body || {};
  if (!token) {
    res.status(400).json({ error: 'Token is required' });
    return;
  }

  try {
    const user = await callGitHubApi('/user', token);
    let email = user.email;
    if (!email) {
      try {
        const emails = await callGitHubApi('/user/emails', token);
        if (Array.isArray(emails) && emails.length > 0) {
          const primary = emails.find((e: any) => e.primary) || emails[0];
          email = primary.email;
        }
      } catch {
        // ignore email fetch failure
      }
    }

    res.json({
      success: true,
      user: {
        id: `gh-${user.id}`,
        login: user.login,
        name: user.name || user.login,
        email: email || `${user.login}@github.com`,
        avatarUrl: user.avatar_url,
        bio: user.bio || `GitHub developer @${user.login}`,
        location: user.location || 'Remote',
        company: user.company || '',
        htmlUrl: user.html_url,
        publicRepos: user.public_repos || 0,
        provider: 'github',
      },
    });
  } catch (err: any) {
    res.status(401).json({ error: err.message || 'Invalid or expired GitHub token' });
  }
});

// Lookup public GitHub profile by username
githubRouter.get('/auth/github/lookup', async (req: Request, res: Response) => {
  const username = (req.query.username as string || '').trim();
  if (!username) {
    res.status(400).json({ error: 'Username is required' });
    return;
  }

  try {
    const response = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}`, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'Compillo-Studio-Auth',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        res.status(404).json({ error: `GitHub user "${username}" not found` });
        return;
      }
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const user = await response.json();
    res.json({
      success: true,
      user: {
        id: `gh-${user.id}`,
        login: user.login,
        name: user.name || user.login,
        email: user.email || `${user.login}@users.noreply.github.com`,
        avatarUrl: user.avatar_url,
        bio: user.bio || `Developer on GitHub @${user.login}`,
        location: user.location || 'Remote',
        company: user.company || '',
        htmlUrl: user.html_url,
        publicRepos: user.public_repos || 0,
        provider: 'github',
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to lookup GitHub user' });
  }
});

