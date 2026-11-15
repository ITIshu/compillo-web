import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

export const googleAuthRouter = Router();

const GOOGLE_CONFIG_FILE = path.join(process.cwd(), '.google_oauth_config.json');

let runtimeGoogleClientId = '';
let runtimeGoogleClientSecret = '';

function loadGoogleRuntimeConfig() {
  try {
    if (fs.existsSync(GOOGLE_CONFIG_FILE)) {
      const data = JSON.parse(fs.readFileSync(GOOGLE_CONFIG_FILE, 'utf-8'));
      if (data.clientId) runtimeGoogleClientId = data.clientId;
      if (data.clientSecret) runtimeGoogleClientSecret = data.clientSecret;
    }
  } catch (e) {
    console.warn('[Google OAuth] Could not read config file:', e);
  }
}
loadGoogleRuntimeConfig();

function getAppUrl(req: Request): string {
  if (process.env.APP_URL) {
    return process.env.APP_URL.replace(/\/+$/, '');
  }
  const host = req.get('x-forwarded-host') || req.get('host') || 'localhost:3000';
  const proto = req.get('x-forwarded-proto') || req.protocol || 'http';
  return `${proto}://${host}`;
}

function getGoogleClientId(): string {
  return runtimeGoogleClientId || process.env.GOOGLE_CLIENT_ID || '';
}

function getGoogleClientSecret(): string {
  return runtimeGoogleClientSecret || process.env.GOOGLE_CLIENT_SECRET || '';
}

// 1. Get Google OAuth Authorization URL
googleAuthRouter.get('/auth/google/url', (req: Request, res: Response) => {
  const clientId = getGoogleClientId();
  const appUrl = getAppUrl(req);
  const redirectUri = (req.query.redirect_uri as string) || `${appUrl}/api/auth/google/callback`;

  if (!clientId) {
    res.json({
      configured: false,
      clientId: null,
      redirectUri,
      url: null,
      message: 'GOOGLE_CLIENT_ID is not configured yet. You can set it in Settings or sign in directly.',
    });
    return;
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'select_account',
  });

  const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  res.json({
    configured: true,
    clientId,
    redirectUri,
    url,
  });
});

// 2. Google OAuth Status
googleAuthRouter.get('/auth/google/status', (req: Request, res: Response) => {
  const clientId = getGoogleClientId();
  const clientSecret = getGoogleClientSecret();
  const appUrl = getAppUrl(req);
  const redirectUri = `${appUrl}/api/auth/google/callback`;

  res.json({
    configured: Boolean(clientId && clientSecret),
    hasClientId: Boolean(clientId),
    hasClientSecret: Boolean(clientSecret),
    clientId: clientId ? `${clientId.slice(0, 12)}...` : null,
    redirectUri,
    appUrl,
  });
});

// 3. Save Google OAuth Config
googleAuthRouter.post('/auth/google/config', (req: Request, res: Response) => {
  const { clientId, clientSecret } = req.body || {};
  if (!clientId) {
    res.status(400).json({ error: 'GOOGLE_CLIENT_ID is required.' });
    return;
  }

  runtimeGoogleClientId = String(clientId).trim();
  runtimeGoogleClientSecret = clientSecret ? String(clientSecret).trim() : runtimeGoogleClientSecret;

  try {
    fs.writeFileSync(
      GOOGLE_CONFIG_FILE,
      JSON.stringify(
        {
          clientId: runtimeGoogleClientId,
          clientSecret: runtimeGoogleClientSecret,
          updatedAt: new Date().toISOString(),
        },
        null,
        2
      ),
      'utf-8'
    );
  } catch (e) {
    console.error('[Google OAuth] Error writing config file:', e);
  }

  const appUrl = getAppUrl(req);
  res.json({
    success: true,
    configured: Boolean(runtimeGoogleClientId && runtimeGoogleClientSecret),
    clientId: runtimeGoogleClientId,
    redirectUri: `${appUrl}/api/auth/google/callback`,
    message: 'Google OAuth configuration saved successfully.',
  });
});

// 4. Delete Google OAuth Config
googleAuthRouter.post('/auth/google/config/delete', (_req: Request, res: Response) => {
  runtimeGoogleClientId = '';
  runtimeGoogleClientSecret = '';
  try {
    if (fs.existsSync(GOOGLE_CONFIG_FILE)) {
      fs.unlinkSync(GOOGLE_CONFIG_FILE);
    }
  } catch (e) {
    // ignore
  }
  res.json({ success: true, message: 'Google OAuth configuration removed.' });
});

// 5. Google OAuth Callback (Popup target)
googleAuthRouter.get(['/auth/google/callback', '/auth/google/callback/'], async (req: Request, res: Response) => {
  const { code, error, error_description } = req.query;

  if (error || !code) {
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Google Sign-In Failed</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .card { background: #1e293b; padding: 24px; border-radius: 12px; max-width: 420px; text-align: center; border: 1px solid #ef4444; }
            h2 { color: #f87171; margin-top: 0; }
          </style>
        </head>
        <body>
          <div class="card">
            <h2>Google Sign-In Failed</h2>
            <p>${error_description || error || 'Missing authorization code from Google.'}</p>
            <p style="opacity: 0.7; font-size: 13px;">You can close this window and try again.</p>
          </div>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'GOOGLE_OAUTH_ERROR', error: '${error || 'auth_failed'}' }, '*');
            }
          </script>
        </body>
      </html>
    `);
    return;
  }

  const clientId = getGoogleClientId();
  const clientSecret = getGoogleClientSecret();
  const appUrl = getAppUrl(req);
  const redirectUri = `${appUrl}/api/auth/google/callback`;

  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: code as string,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error || !tokenData.access_token) {
      res.send(`
        <!DOCTYPE html>
        <html>
          <body style="background: #0f172a; color: #fff; font-family: sans-serif; padding: 2rem; text-align: center;">
            <h3 style="color: #f87171;">Google Token Exchange Failed</h3>
            <p>${tokenData.error_description || tokenData.error || 'Failed to exchange authorization code'}</p>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'GOOGLE_OAUTH_ERROR', error: '${tokenData.error}' }, '*');
              }
            </script>
          </body>
        </html>
      `);
      return;
    }

    // Fetch user profile from Google UserInfo endpoint
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = await userInfoResponse.json();

    const userData = {
      id: profile.sub || `google-${Date.now()}`,
      email: profile.email || 'user@gmail.com',
      name: profile.name || profile.given_name || 'Google User',
      avatarUrl: profile.picture || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(profile.email || 'google')}`,
      provider: 'google',
      accessToken: tokenData.access_token,
      emailVerified: profile.email_verified,
    };

    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Google Sign-In Connected</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .card { background: #1e293b; padding: 32px; border-radius: 12px; text-align: center; border: 1px solid #334155; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
            .success { color: #38bdf8; font-size: 20px; font-weight: 600; margin-bottom: 8px; }
            img { width: 56px; height: 56px; border-radius: 50%; margin: 12px auto; display: block; border: 2px solid #38bdf8; }
          </style>
        </head>
        <body>
          <div class="card">
            ${userData.avatarUrl ? `<img src="${userData.avatarUrl}" alt="${userData.name}" />` : ''}
            <div class="success">✓ Welcome, ${userData.name}!</div>
            <p>Signed in successfully with Google.</p>
            <p style="color: #94a3b8; font-size: 13px;">Syncing with Compillo Studio...</p>
          </div>
          <script>
            try {
              if (window.opener) {
                window.opener.postMessage({
                  type: 'GOOGLE_OAUTH_SUCCESS',
                  user: ${JSON.stringify(userData)}
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
        <body style="background: #0f172a; color: #fff; font-family: sans-serif; padding: 2rem;">
          <h3 style="color: #f87171;">Server Error</h3>
          <p>${err.message || 'Unknown error occurred during Google sign-in'}</p>
        </body>
      </html>
    `);
  }
});

// 6. Direct Token Verification (e.g. from Google GIS or client ID token)
googleAuthRouter.post('/auth/google/verify', async (req: Request, res: Response) => {
  const { credential, accessToken } = req.body || {};

  try {
    if (credential) {
      // Verify Google JWT ID Token via Google's tokeninfo endpoint
      const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
      if (!response.ok) {
        throw new Error('Invalid Google credential token');
      }
      const data = await response.json();
      res.json({
        success: true,
        user: {
          id: data.sub,
          email: data.email,
          name: data.name || data.given_name || data.email?.split('@')[0],
          avatarUrl: data.picture || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(data.email)}`,
          provider: 'google',
        },
      });
      return;
    }

    if (accessToken) {
      // Verify via userinfo endpoint
      const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!response.ok) {
        throw new Error('Invalid Google access token');
      }
      const profile = await response.json();
      res.json({
        success: true,
        user: {
          id: profile.sub,
          email: profile.email,
          name: profile.name || profile.given_name,
          avatarUrl: profile.picture,
          provider: 'google',
        },
      });
      return;
    }

    res.status(400).json({ error: 'Missing credential or accessToken' });
  } catch (err: any) {
    res.status(401).json({ error: err.message || 'Failed to verify Google token' });
  }
});
