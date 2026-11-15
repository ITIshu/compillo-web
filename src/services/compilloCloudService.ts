import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  Timestamp,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './firebaseClient';

export type HostedCategory = 'Web & Portfolios' | 'Python Backends' | 'Tools & Calculators';
export type HostedMode = 'calculator' | 'custom-static' | 'custom-python';

export interface HostedFileEntry {
  path: string;
  content: string;
}

export interface HostedAppDoc {
  slug: string;
  ownerId: string;
  ownerName: string;
  title: string;
  category: HostedCategory;
  mode: HostedMode;
  entryFile: string;
  files: HostedFileEntry[];
  isPublic: boolean;
  likesCount: number;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface LeaderboardEntryDoc {
  userId: string;
  displayName: string;
  avatarUrl: string;
  solvedCount: number;
  currentStreak: number;
  bestRuntimeMs: number;
  lastSolvedDate: string;
  updatedAt?: Timestamp | null;
}

export interface LabCertificateDoc {
  certId: string;
  userId: string;
  recipientName: string;
  courseTitle: string;
  score: number;
  verificationHash: string;
  issuedAt?: Timestamp | null;
}

export function sanitizeSlug(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
}

export function getFirebaseUser() {
  return auth.currentUser;
}

// ==========================================
// 1. HOSTED APPS MANAGER & COMMUNITY GALLERY
// ==========================================

export function subscribeMyHostedApps(
  ownerUid: string,
  onData: (apps: HostedAppDoc[]) => void,
  onError?: (err: Error) => void
): () => void {
  const path = 'hostedApps';
  const q = query(collection(db, path), where('ownerId', '==', ownerUid));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs
        .map((d) => d.data() as HostedAppDoc)
        .sort((a, b) => (b.updatedAt?.toMillis?.() || 0) - (a.updatedAt?.toMillis?.() || 0));
      onData(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (e: any) {
        onError?.(e);
      }
    }
  );
}

export function subscribePublicGalleryApps(
  onData: (apps: HostedAppDoc[]) => void,
  onError?: (err: Error) => void
): () => void {
  const path = 'hostedApps';
  const q = query(collection(db, path), where('isPublic', '==', true), limit(40));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs
        .map((d) => d.data() as HostedAppDoc)
        .sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0));
      onData(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (e: any) {
        onError?.(e);
      }
    }
  );
}

export async function saveHostedAppToFirestore(params: {
  slug: string;
  title: string;
  category: HostedCategory;
  mode: HostedMode;
  entryFile: string;
  files: HostedFileEntry[];
  isPublic: boolean;
}): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Please sign in with Google to save deployments to your account.');

  const slug = sanitizeSlug(params.slug);
  if (!slug || slug.length < 2) throw new Error('Invalid route slug.');

  const safeFiles = params.files.slice(0, 50).map((f) => ({
    path: String(f.path || '').slice(0, 120),
    content: String(f.content || '').slice(0, 120000),
  }));

  const ref = doc(db, 'hostedApps', slug);
  const path = `hostedApps/${slug}`;
  try {
    const existingSnap = await getDoc(ref);
    if (existingSnap.exists()) {
      const existingData = existingSnap.data() as HostedAppDoc;
      if (existingData.ownerId !== user.uid) {
        throw new Error(`The route "/hosted/${slug}/" is already owned by another creator. Choose a different slug.`);
      }
      await updateDoc(ref, {
        title: params.title.trim().slice(0, 80) || slug,
        category: params.category,
        mode: params.mode,
        entryFile: params.entryFile.slice(0, 120),
        files: safeFiles,
        isPublic: params.isPublic,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(ref, {
        slug,
        ownerId: user.uid,
        ownerName: (user.displayName || user.email?.split('@')[0] || 'Creator').slice(0, 80),
        title: params.title.trim().slice(0, 80) || slug,
        category: params.category,
        mode: params.mode,
        entryFile: params.entryFile.slice(0, 120),
        files: safeFiles,
        isPublic: params.isPublic,
        likesCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error: any) {
    if (error?.message?.includes('already owned')) throw error;
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function toggleHostedAppPublic(slug: string, isPublic: boolean): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Sign in with Google first.');
  const path = `hostedApps/${slug}`;
  try {
    await updateDoc(doc(db, 'hostedApps', slug), {
      isPublic,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteHostedAppCompletely(slug: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Sign in with Google to delete hosted sites.');

  // Delete server runtime files & route
  const res = await fetch(`/api/deploy/${encodeURIComponent(slug)}`, { method: 'DELETE' });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error || 'Failed to remove live hosted server route');
  }

  const path = `hostedApps/${slug}`;
  try {
    await deleteDoc(doc(db, 'hostedApps', slug));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function toggleLikeHostedApp(slug: string, currentLikesCount: number): Promise<boolean> {
  const user = auth.currentUser;
  if (!user) throw new Error('Sign in with Google to upvote community apps.');

  const appRef = doc(db, 'hostedApps', slug);
  const likeRef = doc(db, 'hostedApps', slug, 'likes', user.uid);
  const path = `hostedApps/${slug}/likes/${user.uid}`;

  try {
    const likeSnap = await getDoc(likeRef);
    const batch = writeBatch(db);
    if (likeSnap.exists()) {
      batch.delete(likeRef);
      batch.update(appRef, { likesCount: Math.max(0, currentLikesCount - 1) });
      await batch.commit();
      return false;
    } else {
      batch.set(likeRef, { userId: user.uid, createdAt: serverTimestamp() });
      batch.update(appRef, { likesCount: currentLikesCount + 1 });
      await batch.commit();
      return true;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// ==========================================
// 2. DAILY CHALLENGE LEADERBOARD
// ==========================================

export function subscribeLeaderboard(
  onData: (entries: LeaderboardEntryDoc[]) => void,
  onError?: (err: Error) => void
): () => void {
  const path = 'leaderboard';
  const q = query(collection(db, path), orderBy('solvedCount', 'desc'), limit(25));
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => d.data() as LeaderboardEntryDoc));
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (e: any) {
        onError?.(e);
      }
    }
  );
}

export async function recordChallengeSolve(runtimeMs: number): Promise<LeaderboardEntryDoc> {
  const user = auth.currentUser;
  if (!user) throw new Error('Sign in with Google to record your verified streak on the leaderboard.');

  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  const ref = doc(db, 'leaderboard', user.uid);
  const path = `leaderboard/${user.uid}`;

  try {
    const snap = await getDoc(ref);
    const displayName = (user.displayName || user.email?.split('@')[0] || 'Coder').slice(0, 80);
    const avatarUrl = (user.photoURL || '').slice(0, 300);
    const boundedRuntime = Math.max(1, Math.min(60000, Math.round(runtimeMs)));

    if (!snap.exists()) {
      const created = {
        userId: user.uid,
        displayName,
        avatarUrl,
        solvedCount: 1,
        currentStreak: 1,
        bestRuntimeMs: boundedRuntime,
        lastSolvedDate: today,
        updatedAt: serverTimestamp(),
      };
      await setDoc(ref, created);
      return {
        userId: user.uid,
        displayName,
        avatarUrl,
        solvedCount: 1,
        currentStreak: 1,
        bestRuntimeMs: boundedRuntime,
        lastSolvedDate: today,
      };
    }

    const prev = snap.data() as LeaderboardEntryDoc;
    const alreadySolvedToday = prev.lastSolvedDate === today;
    const nextStreak = alreadySolvedToday
      ? prev.currentStreak
      : prev.lastSolvedDate === yesterday
        ? prev.currentStreak + 1
        : 1;
    const nextSolved = alreadySolvedToday ? prev.solvedCount : prev.solvedCount + 1;
    const nextBest = prev.bestRuntimeMs > 0 ? Math.min(prev.bestRuntimeMs, boundedRuntime) : boundedRuntime;

    await updateDoc(ref, {
      displayName,
      avatarUrl,
      solvedCount: nextSolved,
      currentStreak: nextStreak,
      bestRuntimeMs: nextBest,
      lastSolvedDate: today,
      updatedAt: serverTimestamp(),
    });

    return {
      userId: user.uid,
      displayName,
      avatarUrl,
      solvedCount: nextSolved,
      currentStreak: nextStreak,
      bestRuntimeMs: nextBest,
      lastSolvedDate: today,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// ==========================================
// 3. VERIFIED LAB CERTIFICATES
// ==========================================

export function subscribeMyCertificates(
  uid: string,
  onData: (certs: LabCertificateDoc[]) => void,
  onError?: (err: Error) => void
): () => void {
  const path = 'certificates';
  const q = query(collection(db, path), where('userId', '==', uid), limit(20));
  return onSnapshot(
    q,
    (snap) => {
      const certs = snap.docs
        .map((d) => d.data() as LabCertificateDoc)
        .sort((a, b) => (b.issuedAt?.toMillis?.() || 0) - (a.issuedAt?.toMillis?.() || 0));
      onData(certs);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (e: any) {
        onError?.(e);
      }
    }
  );
}

export async function issueLabCertificate(params: {
  recipientName: string;
  courseTitle: string;
  score: number;
}): Promise<LabCertificateDoc> {
  const user = auth.currentUser;
  if (!user) throw new Error('Sign in with Google to issue a verified Firestore certificate.');

  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  const certId = `COMP-${new Date().getFullYear()}-${rand}`;
  const hashRaw = `${certId}-${user.uid}-${Date.now()}`;
  let hashAcc = 0;
  for (let i = 0; i < hashRaw.length; i++) {
    hashAcc = (hashAcc * 31 + hashRaw.charCodeAt(i)) >>> 0;
  }
  const verificationHash = `VER-${hashAcc.toString(16).toUpperCase().padStart(8, '0')}`;

  const payload = {
    certId,
    userId: user.uid,
    recipientName: params.recipientName.trim().slice(0, 80) || 'Compillo Scholar',
    courseTitle: params.courseTitle.trim().slice(0, 120) || 'Systems & Data Structures Lab',
    score: Math.max(0, Math.min(100, Math.round(params.score))),
    verificationHash,
    issuedAt: serverTimestamp(),
  };

  const path = `certificates/${certId}`;
  try {
    await setDoc(doc(db, 'certificates', certId), payload);
    return {
      certId,
      userId: user.uid,
      recipientName: payload.recipientName,
      courseTitle: payload.courseTitle,
      score: payload.score,
      verificationHash,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function verifyCertificateById(certId: string): Promise<LabCertificateDoc | null> {
  const cleaned = certId.trim();
  if (!/^[a-zA-Z0-9_-]{6,64}$/.test(cleaned)) return null;
  const path = `certificates/${cleaned}`;
  try {
    const snap = await getDoc(doc(db, 'certificates', cleaned));
    return snap.exists() ? (snap.data() as LabCertificateDoc) : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

// ==========================================
// 4. COLLAB ROOM FIRESTORE METADATA
// ==========================================

export async function saveCollabRoomMetadata(params: {
  roomId: string;
  mode: 'edit' | 'readonly';
  activeFilePath: string;
}): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  const path = `collabRooms/${params.roomId}`;
  try {
    const ref = doc(db, 'collabRooms', params.roomId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const existing = snap.data();
      if (existing?.hostUid === user.uid) {
        await updateDoc(ref, {
          mode: params.mode,
          activeFilePath: params.activeFilePath.slice(0, 200),
          updatedAt: serverTimestamp(),
        });
      }
    } else {
      await setDoc(ref, {
        roomId: params.roomId,
        hostUid: user.uid,
        hostName: (user.displayName || user.email?.split('@')[0] || 'Host').slice(0, 80),
        mode: params.mode,
        activeFilePath: params.activeFilePath.slice(0, 200),
        updatedAt: serverTimestamp(),
      });
    }
  } catch {
    // Non-blocking metadata sync
  }
}
