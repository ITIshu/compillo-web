import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  getFirestore,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const firebaseAuth = getAuth(app);

// Validate connection on boot per Firebase integration guideline
async function testFirestoreConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
void testFirestoreConnection();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: firebaseAuth.currentUser?.uid,
      email: firebaseAuth.currentUser?.email,
      emailVerified: firebaseAuth.currentUser?.emailVerified,
      isAnonymous: firebaseAuth.currentUser?.isAnonymous,
      tenantId: firebaseAuth.currentUser?.tenantId,
      providerInfo:
        firebaseAuth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export type HostedAppCategory = 'Web Apps' | 'Python Backends' | 'Calculators & Tools' | 'Student Labs';

export interface HostedAppDoc {
  slug: string;
  ownerId: string;
  ownerName: string;
  title: string;
  description?: string;
  category: HostedAppCategory;
  mode: 'calculator' | 'custom-static' | 'custom-python';
  entryFile?: string;
  files: Array<{ path: string; content: string }>;
  isPublic: boolean;
  likesCount: number;
  createdAt?: Timestamp | Date | null;
  updatedAt?: Timestamp | Date | null;
}

export interface LeaderboardEntryDoc {
  userId: string;
  displayName: string;
  photoUrl?: string;
  solvedCount: number;
  currentStreak: number;
  bestRuntimeMs: number;
  lastSolvedDate: string;
  updatedAt?: Timestamp | Date | null;
}

export interface LabCertificateDoc {
  certId: string;
  userId: string;
  recipientName: string;
  courseTitle: string;
  score: number;
  issuedAt?: Timestamp | Date | null;
}

export interface LeetCodeProgressDoc {
  userId: string;
  titleSlug: string;
  frontendId: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  language: 'python3' | 'javascript' | 'cpp';
  status: 'attempted' | 'solved';
  code: string;
  notes?: string;
  runtimeMs?: number;
  updatedAt?: Timestamp | Date | null;
}

function sanitizeSlug(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
}

export function subscribeUserHostedApps(
  ownerId: string,
  onData: (apps: HostedAppDoc[]) => void,
  onError?: (err: Error) => void
) {
  const q = query(
    collection(db, 'hostedApps'),
    where('ownerId', '==', ownerId),
    limit(50)
  );
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs
        .map((d) => d.data() as HostedAppDoc)
        .sort((a, b) => {
          const at = a.updatedAt instanceof Timestamp ? a.updatedAt.toMillis() : 0;
          const bt = b.updatedAt instanceof Timestamp ? b.updatedAt.toMillis() : 0;
          return bt - at;
        });
      onData(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, 'hostedApps');
      } catch (e: any) {
        onError?.(e);
      }
    }
  );
}

export function subscribePublicGallery(
  onData: (apps: HostedAppDoc[]) => void,
  onError?: (err: Error) => void
) {
  const q = query(
    collection(db, 'hostedApps'),
    where('isPublic', '==', true),
    limit(40)
  );
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
        handleFirestoreError(error, OperationType.LIST, 'hostedApps');
      } catch (e: any) {
        onError?.(e);
      }
    }
  );
}

export async function saveHostedAppRecord(input: {
  slug: string;
  title: string;
  description?: string;
  category: HostedAppCategory;
  mode: 'calculator' | 'custom-static' | 'custom-python';
  entryFile?: string;
  files: Array<{ path: string; content: string }>;
  isPublic: boolean;
}) {
  const user = firebaseAuth.currentUser;
  if (!user) {
    throw new Error('Sign in with Google to persist hosted sites in Firestore.');
  }

  const slug = sanitizeSlug(input.slug);
  if (!slug || !/^[a-z0-9][a-z0-9-]{0,48}[a-z0-9]?$/.test(slug)) {
    throw new Error('Invalid route slug.');
  }

  // Enforce blueprint field boundaries strictly
  const boundedFiles = input.files.slice(0, 50).map((f) => ({
    path: String(f.path || 'index.html').slice(0, 120),
    content: String(f.content || '').slice(0, 200_000),
  }));

  const ref = doc(db, 'hostedApps', slug);
  try {
    const existing = await getDoc(ref);
    if (existing.exists()) {
      await updateDoc(ref, {
        title: input.title.trim().slice(0, 100) || slug,
        description: (input.description || '').trim().slice(0, 300),
        category: input.category,
        mode: input.mode,
        entryFile: (input.entryFile || 'index.html').slice(0, 120),
        files: boundedFiles,
        isPublic: Boolean(input.isPublic),
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(ref, {
        slug,
        ownerId: user.uid,
        ownerName: (user.displayName || user.email || 'Developer').slice(0, 80),
        title: input.title.trim().slice(0, 100) || slug,
        description: (input.description || '').trim().slice(0, 300),
        category: input.category,
        mode: input.mode,
        entryFile: (input.entryFile || 'index.html').slice(0, 120),
        files: boundedFiles,
        isPublic: Boolean(input.isPublic),
        likesCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `hostedApps/${slug}`);
  }
}

export async function toggleHostedAppVisibility(slug: string, isPublic: boolean) {
  const ref = doc(db, 'hostedApps', slug);
  try {
    await updateDoc(ref, {
      isPublic: Boolean(isPublic),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `hostedApps/${slug}`);
  }
}

export async function deleteHostedAppRecord(slug: string) {
  const ref = doc(db, 'hostedApps', slug);
  try {
    await deleteDoc(ref);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `hostedApps/${slug}`);
  }

  await fetch(`/api/deploy/${encodeURIComponent(slug)}`, { method: 'DELETE' }).catch(() => null);
}

export async function getUserLikedAppSlugs(uid: string, slugs: string[]): Promise<Set<string>> {
  const liked = new Set<string>();
  await Promise.all(
    slugs.slice(0, 30).map(async (slug) => {
      try {
        const snap = await getDoc(doc(db, 'hostedApps', slug, 'likes', uid));
        if (snap.exists()) liked.add(slug);
      } catch {
        // ignore single check failure
      }
    })
  );
  return liked;
}

export async function toggleAppUpvote(appDoc: HostedAppDoc): Promise<boolean> {
  const user = firebaseAuth.currentUser;
  if (!user) {
    throw new Error('Sign in with Google to upvote community apps.');
  }

  const appRef = doc(db, 'hostedApps', appDoc.slug);
  const likeRef = doc(db, 'hostedApps', appDoc.slug, 'likes', user.uid);

  try {
    const existingLike = await getDoc(likeRef);
    const batch = writeBatch(db);
    if (existingLike.exists()) {
      batch.delete(likeRef);
      batch.update(appRef, {
        likesCount: Math.max(0, (appDoc.likesCount || 0) - 1),
        updatedAt: serverTimestamp(),
      });
      await batch.commit();
      return false;
    } else {
      batch.set(likeRef, {
        userId: user.uid,
        createdAt: serverTimestamp(),
      });
      batch.update(appRef, {
        likesCount: (appDoc.likesCount || 0) + 1,
        updatedAt: serverTimestamp(),
      });
      await batch.commit();
      return true;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `hostedApps/${appDoc.slug}/likes/${user.uid}`);
  }
}

export function subscribeLeaderboard(
  onData: (rows: LeaderboardEntryDoc[]) => void,
  onError?: (err: Error) => void
) {
  const q = query(collection(db, 'leaderboard'), orderBy('solvedCount', 'desc'), limit(25));
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => d.data() as LeaderboardEntryDoc));
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, 'leaderboard');
      } catch (e: any) {
        onError?.(e);
      }
    }
  );
}

export async function submitChallengeSolve(runtimeMs: number) {
  const user = firebaseAuth.currentUser;
  if (!user) {
    throw new Error('Sign in with Google to save your score & streak to the Leaderboard.');
  }

  const today = new Date().toISOString().slice(0, 10);
  const ref = doc(db, 'leaderboard', user.uid);
  try {
    const snap = await getDoc(ref);
    const cleanRuntime = Math.max(1, Math.min(60000, Math.round(runtimeMs * 10) / 10));
    if (snap.exists()) {
      const prev = snap.data() as LeaderboardEntryDoc;
      const alreadyToday = prev.lastSolvedDate === today;
      const nextStreak = alreadyToday ? Math.max(1, prev.currentStreak || 1) : (prev.currentStreak || 0) + 1;
      await updateDoc(ref, {
        displayName: (user.displayName || user.email?.split('@')[0] || 'Coder').slice(0, 80),
        photoUrl: (user.photoURL || '').slice(0, 300),
        solvedCount: Math.min(10000, (prev.solvedCount || 0) + 1),
        currentStreak: Math.min(3650, nextStreak),
        bestRuntimeMs: prev.bestRuntimeMs > 0 ? Math.min(prev.bestRuntimeMs, cleanRuntime) : cleanRuntime,
        lastSolvedDate: today,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(ref, {
        userId: user.uid,
        displayName: (user.displayName || user.email?.split('@')[0] || 'Coder').slice(0, 80),
        photoUrl: (user.photoURL || '').slice(0, 300),
        solvedCount: 1,
        currentStreak: 1,
        bestRuntimeMs: cleanRuntime,
        lastSolvedDate: today,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `leaderboard/${user.uid}`);
  }
}

export async function issueCertificate(input: {
  recipientName: string;
  courseTitle: string;
  score: number;
}): Promise<string> {
  const user = firebaseAuth.currentUser;
  if (!user) {
    throw new Error('Sign in with Google to record and verify your certificate in Firestore.');
  }

  const certId = `CMP-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const ref = doc(db, 'certificates', certId);
  try {
    await setDoc(ref, {
      certId,
      userId: user.uid,
      recipientName: input.recipientName.trim().slice(0, 80),
      courseTitle: input.courseTitle.trim().slice(0, 120),
      score: Math.max(0, Math.min(100, Math.round(input.score))),
      issuedAt: serverTimestamp(),
    });
    return certId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `certificates/${certId}`);
  }
}

export async function verifyCertificateById(certId: string): Promise<LabCertificateDoc | null> {
  const cleanId = certId.trim().replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
  if (!cleanId) return null;
  try {
    const snap = await getDoc(doc(db, 'certificates', cleanId));
    return snap.exists() ? (snap.data() as LabCertificateDoc) : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `certificates/${cleanId}`);
  }
}

export async function listUserCertificates(uid: string): Promise<LabCertificateDoc[]> {
  try {
    const q = query(collection(db, 'certificates'), where('userId', '==', uid), limit(20));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as LabCertificateDoc);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'certificates');
  }
}

export async function saveCollabRoomMetadata(input: {
  roomId: string;
  mode: 'edit' | 'readonly';
  activeFilePath: string;
}) {
  const user = firebaseAuth.currentUser;
  if (!user) return;

  const cleanRoom = input.roomId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
  if (!cleanRoom) return;
  const ref = doc(db, 'collabRooms', cleanRoom);
  try {
    const existing = await getDoc(ref);
    if (existing.exists()) {
      if (existing.data()?.hostUid === user.uid) {
        await updateDoc(ref, {
          mode: input.mode,
          activeFilePath: input.activeFilePath.slice(0, 120),
          updatedAt: serverTimestamp(),
        });
      }
    } else {
      await setDoc(ref, {
        roomId: cleanRoom,
        hostUid: user.uid,
        hostName: (user.displayName || user.email || 'Host').slice(0, 80),
        mode: input.mode,
        activeFilePath: input.activeFilePath.slice(0, 120),
        updatedAt: serverTimestamp(),
      });
    }
  } catch {
    // Non-blocking metadata sync for beta pair rooms
  }
}

export function subscribeUserLeetCodeProgress(
  uid: string,
  onData: (items: Record<string, LeetCodeProgressDoc>) => void,
  onError?: (err: Error) => void
) {
  const q = query(collection(db, 'leetcodeProgress'), where('userId', '==', uid), limit(200));
  return onSnapshot(
    q,
    (snap) => {
      const map: Record<string, LeetCodeProgressDoc> = {};
      for (const d of snap.docs) {
        const data = d.data() as LeetCodeProgressDoc;
        if (data?.titleSlug) {
          map[data.titleSlug] = data;
        }
      }
      onData(map);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, 'leetcodeProgress');
      } catch (e: any) {
        onError?.(e);
      }
    }
  );
}

export async function saveLeetCodeProgress(input: {
  titleSlug: string;
  frontendId: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  language: 'python3' | 'javascript' | 'cpp';
  status: 'attempted' | 'solved';
  code: string;
  notes?: string;
  runtimeMs?: number;
}) {
  const user = firebaseAuth.currentUser;
  if (!user) {
    throw new Error('Sign in with Google to persist LeetCode solutions in Firestore.');
  }

  const cleanSlug = input.titleSlug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 120);
  if (!cleanSlug) throw new Error('Invalid problem slug.');
  const docId = `${user.uid}_${cleanSlug}`;
  const ref = doc(db, 'leetcodeProgress', docId);

  const payloadBase = {
    language: input.language,
    status: input.status,
    code: String(input.code || '').slice(0, 60000),
    ...(input.notes !== undefined ? { notes: String(input.notes).slice(0, 2000) } : {}),
    ...(typeof input.runtimeMs === 'number' && Number.isFinite(input.runtimeMs)
      ? { runtimeMs: Math.max(0, Math.min(60000, Math.round(input.runtimeMs * 10) / 10)) }
      : {}),
    updatedAt: serverTimestamp(),
  };

  try {
    const existing = await getDoc(ref);
    if (existing.exists()) {
      await updateDoc(ref, payloadBase);
    } else {
      await setDoc(ref, {
        userId: user.uid,
        titleSlug: cleanSlug,
        frontendId: String(input.frontendId || '1').slice(0, 16),
        title: String(input.title || cleanSlug).slice(0, 150),
        difficulty: input.difficulty,
        ...payloadBase,
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `leetcodeProgress/${docId}`);
  }
}
