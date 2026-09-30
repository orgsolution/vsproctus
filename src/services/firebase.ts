import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  getDocFromServer
} from 'firebase/firestore';
import { User, SchoolConfig } from '../types';
import firebaseConfigData from '../../firebase-applet-config.json';

const firebaseConfig = {
  apiKey: firebaseConfigData.apiKey,
  authDomain: firebaseConfigData.authDomain,
  projectId: firebaseConfigData.projectId,
  storageBucket: firebaseConfigData.storageBucket,
  messagingSenderId: firebaseConfigData.messagingSenderId,
  appId: firebaseConfigData.appId,
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const db = firebaseConfigData.firestoreDatabaseId
  ? getFirestore(app, firebaseConfigData.firestoreDatabaseId)
  : getFirestore(app);

// Test connection on boot
(async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('[Firebase Firestore] Connected successfully to database:', firebaseConfigData.firestoreDatabaseId || '(default)');
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('[Firebase Firestore] Client is offline or initializing.');
    }
  }
})();

// Helper to sanitize doc ID (e.g. emails with special chars)
function emailToDocId(email: string): string {
  return email.toLowerCase().trim().replace(/[^a-zA-Z0-9_-]/g, '_');
}

/**
 * Save / sync a user profile directly to Firestore
 */
export async function syncUserToFirestore(user: User): Promise<boolean> {
  if (!user || !user.email) return false;
  try {
    const docId = emailToDocId(user.email);
    const userRef = doc(db, 'users', docId);
    // Sanitize undefined fields
    const payload = JSON.parse(JSON.stringify(user));
    await setDoc(userRef, payload, { merge: true });
    return true;
  } catch (err) {
    console.warn('[Firebase Firestore] Failed to sync user:', err);
    return false;
  }
}

/**
 * Fetch a single user by email from Firestore
 */
export async function fetchUserFromFirestore(email: string): Promise<User | null> {
  if (!email) return null;
  try {
    const docId = emailToDocId(email);
    const userRef = doc(db, 'users', docId);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      return snap.data() as User;
    }
    return null;
  } catch (err) {
    console.warn('[Firebase Firestore] Failed to fetch user:', err);
    return null;
  }
}

/**
 * Fetch all users from Firestore
 */
export async function fetchAllUsersFromFirestore(): Promise<User[]> {
  try {
    const colRef = collection(db, 'users');
    const snap = await getDocs(colRef);
    const users: User[] = [];
    snap.forEach((d) => {
      const data = d.data() as User;
      if (data && data.email) {
        users.push(data);
      }
    });
    return users;
  } catch (err) {
    console.warn('[Firebase Firestore] Failed to fetch all users:', err);
    return [];
  }
}

/**
 * Sync School Configuration to Firestore
 */
export async function syncSchoolConfigToFirestore(config: SchoolConfig): Promise<boolean> {
  try {
    const docRef = doc(db, 'config', 'school');
    await setDoc(docRef, config, { merge: true });
    return true;
  } catch (err) {
    console.warn('[Firebase Firestore] Failed to sync school config:', err);
    return false;
  }
}

/**
 * Fetch School Configuration from Firestore
 */
export async function fetchSchoolConfigFromFirestore(): Promise<SchoolConfig | null> {
  try {
    const docRef = doc(db, 'config', 'school');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as SchoolConfig;
    }
    return null;
  } catch (err) {
    console.warn('[Firebase Firestore] Failed to fetch school config:', err);
    return null;
  }
}

/**
 * Sync Specialties to Firestore
 */
export async function syncSpecialtiesToFirestore(specialties: string[]): Promise<boolean> {
  try {
    const docRef = doc(db, 'config', 'specialties');
    await setDoc(docRef, { items: specialties }, { merge: true });
    return true;
  } catch (err) {
    console.warn('[Firebase Firestore] Failed to sync specialties:', err);
    return false;
  }
}

/**
 * Fetch Specialties from Firestore
 */
export async function fetchSpecialtiesFromFirestore(): Promise<string[] | null> {
  try {
    const docRef = doc(db, 'config', 'specialties');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      if (Array.isArray(data?.items)) {
        return data.items as string[];
      }
    }
    return null;
  } catch (err) {
    console.warn('[Firebase Firestore] Failed to fetch specialties:', err);
    return null;
  }
}
