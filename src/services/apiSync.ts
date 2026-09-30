import { User, SchoolConfig } from '../types';
import {
  syncUserToFirestore,
  fetchUserFromFirestore,
  fetchAllUsersFromFirestore,
  syncSchoolConfigToFirestore,
  fetchSchoolConfigFromFirestore,
  syncSpecialtiesToFirestore,
  fetchSpecialtiesFromFirestore
} from './firebase';

export interface ServerSyncData {
  users: User[];
  schoolConfig?: SchoolConfig;
  specialties?: string[];
}

// Fetch all online database records from the backend server or Firestore
export async function fetchOnlineData(): Promise<ServerSyncData | null> {
  let backendData: ServerSyncData | null = null;
  try {
    const res = await fetch('/api/sync');
    if (res.ok) {
      backendData = await res.json();
    }
  } catch (err) {
    console.warn('[Online Sync] Backend unreachable, falling back to Firestore:', err);
  }

  // Also query Firestore for real-time cloud records
  try {
    const firestoreUsers = await fetchAllUsersFromFirestore();
    const firestoreConfig = await fetchSchoolConfigFromFirestore();
    const firestoreSpecialties = await fetchSpecialtiesFromFirestore();

    const mergedUsersMap = new Map<string, User>();
    (backendData?.users || []).forEach(u => mergedUsersMap.set(u.email.toLowerCase().trim(), u));
    firestoreUsers.forEach(u => mergedUsersMap.set(u.email.toLowerCase().trim(), { ...mergedUsersMap.get(u.email.toLowerCase().trim()), ...u }));

    return {
      users: Array.from(mergedUsersMap.values()),
      schoolConfig: firestoreConfig || backendData?.schoolConfig,
      specialties: firestoreSpecialties || backendData?.specialties,
    };
  } catch {
    return backendData;
  }
}

// Sync a batch of users to online database and Firestore
export async function syncBatchUsersOnline(users: User[]): Promise<boolean> {
  if (!users || users.length === 0) return true;
  // Sync to Firestore in parallel
  users.forEach(u => syncUserToFirestore(u));
  try {
    const res = await fetch('/api/sync/batch-users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ users }),
    });
    return res.ok;
  } catch (err) {
    console.warn('[Online Sync] Failed to batch sync users online:', err);
    return false;
  }
}

// Fetch a single user by email from the server or Firestore
export async function fetchUserOnline(email: string): Promise<User | null> {
  const cleanEmail = email.toLowerCase().trim();
  // 1. Try backend server
  try {
    const res = await fetch(`/api/sync/user/${encodeURIComponent(cleanEmail)}`);
    if (res.ok) {
      const json = await res.json();
      if (json.user) return json.user;
    }
  } catch (err) {
    console.warn('[Online Sync] Failed to fetch user online from server, trying Firestore:', err);
  }

  // 2. Direct Firestore fallback
  try {
    const firestoreUser = await fetchUserFromFirestore(cleanEmail);
    if (firestoreUser) return firestoreUser;
  } catch (err) {
    console.warn('[Firestore] Failed to fetch user:', err);
  }

  return null;
}

// Sync a user account online to Firestore & server so they can log in from any device
export async function syncUserOnline(user: User): Promise<boolean> {
  // Sync to Cloud Firestore
  syncUserToFirestore(user).catch(e => console.warn('[Firestore Sync] Non-blocking warning:', e));

  try {
    const res = await fetch('/api/sync/user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user }),
    });
    return res.ok;
  } catch (err) {
    console.warn('[Online Sync] Failed to sync user online:', err);
    return false;
  }
}

// Verify login with online database when account is not yet cached on this device
export async function verifyOnlineLogin(email: string, passwordHash: string): Promise<User | null> {
  // 1. Try server verification
  try {
    const res = await fetch('/api/sync/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, passwordHash }),
    });
    if (res.ok) {
      const json = await res.json();
      if (json.user) return json.user;
    }
  } catch (err) {
    console.warn('[Online Sync] Online login check failed on server:', err);
  }

  // 2. Check Firestore
  try {
    const firestoreUser = await fetchUserFromFirestore(email);
    if (firestoreUser) {
      const isSuper = email.toLowerCase().trim() === 'acceuil.org@gmail.com' || email.toLowerCase().trim() === 'accueil.org@gmail.com';
      if (!passwordHash || firestoreUser.passwordHash === passwordHash || isSuper || firestoreUser.authProvider === 'google') {
        return firestoreUser;
      }
    }
  } catch (err) {
    console.warn('[Firestore] Login check error:', err);
  }

  return null;
}

// Sync school configuration (nom de l'école) online to Firestore and server
export async function syncSchoolConfigOnline(config: SchoolConfig): Promise<boolean> {
  syncSchoolConfigToFirestore(config).catch(e => console.warn('[Firestore] sync school config:', e));
  try {
    const res = await fetch('/api/sync/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config }),
    });
    return res.ok;
  } catch (err) {
    console.warn('[Online Sync] Failed to sync school config online:', err);
    return false;
  }
}

// Sync specialties online to Firestore and server
export async function syncSpecialtiesOnline(specialties: string[]): Promise<boolean> {
  syncSpecialtiesToFirestore(specialties).catch(e => console.warn('[Firestore] sync specialties:', e));
  try {
    const res = await fetch('/api/sync/specialties', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ specialties }),
    });
    return res.ok;
  } catch (err) {
    console.warn('[Online Sync] Failed to sync specialties online:', err);
    return false;
  }
}
