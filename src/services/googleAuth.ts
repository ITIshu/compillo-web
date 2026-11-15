import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut as fbSignOut,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { authService, UserProfile } from './authService';

// Initialize Firebase App singleton
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Provider with requested OAuth scopes
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('openid');
googleProvider.addScope('https://www.googleapis.com/auth/userinfo.email');
googleProvider.addScope('https://www.googleapis.com/auth/userinfo.profile');
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

// Flag to indicate if we are in the middle of a sign-in flow.
let isSigningIn = false;
// Cache the access token in memory.
let cachedAccessToken: string | null = null;

/**
 * Initialize auth state listener. Call this on app load.
 */
export const initAuth = (
  onAuthSuccess?: (user: User, token: string | null) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

/**
 * Sign in with Google using Firebase Auth popup flow
 */
export const googleSignIn = async (): Promise<{
  user: User;
  accessToken: string;
  userProfile: UserProfile;
}> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);

    const token = credential?.accessToken || '';
    cachedAccessToken = token;

    const email = result.user.email || 'user@gmail.com';
    const name = result.user.displayName || email.split('@')[0] || 'Google User';
    const avatarUrl =
      result.user.photoURL ||
      `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(email)}`;

    // Sync into Compillo auth service
    const userProfile = await authService.signInWithGoogle({
      email,
      name,
      avatarUrl,
      university: 'Compillo Studio Scholar',
    });

    return {
      user: result.user,
      accessToken: token,
      userProfile,
    };
  } catch (error: any) {
    console.error('Google Sign-In Error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

/**
 * Get the in-memory cached Google OAuth access token
 */
export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

/**
 * Sign out of Google and clear session
 */
export const googleSignOut = async (): Promise<void> => {
  try {
    await fbSignOut(auth);
  } catch (e) {
    console.warn('Firebase signout warning:', e);
  }
  cachedAccessToken = null;
  authService.signOut();
};
