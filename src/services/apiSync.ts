import { User, SchoolConfig } from '../types';

export interface ServerSyncData {
  users: User[];
  schoolConfig?: SchoolConfig;
  specialties?: string[];
}

// Fetch all online database records from the backend server
export async function fetchOnlineData(): Promise<ServerSyncData | null> {
  try {
    const res = await fetch('/api/sync');
    if (!res.ok) return null;
    const data = await res.json();
    return data;
  } catch (err) {
    console.warn('[Online Sync] Offline or server unreachable:', err);
    return null;
  }
}

// Sync a batch of users to online database
export async function syncBatchUsersOnline(users: User[]): Promise<boolean> {
  if (!users || users.length === 0) return true;
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

// Fetch a single user by email from the server
export async function fetchUserOnline(email: string): Promise<User | null> {
  try {
    const res = await fetch(`/api/sync/user/${encodeURIComponent(email.toLowerCase().trim())}`);
    if (!res.ok) return null;
    const json = await res.json();
    return json.user || null;
  } catch (err) {
    console.warn('[Online Sync] Failed to fetch user online:', err);
    return null;
  }
}

// Sync a user account online so they can log in from any device (tablet, phone, PC)
export async function syncUserOnline(user: User): Promise<boolean> {
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
  try {
    const res = await fetch('/api/sync/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, passwordHash }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.user || null;
  } catch (err) {
    console.warn('[Online Sync] Online login check failed:', err);
    return null;
  }
}

// Sync school configuration (nom de l'école) online
export async function syncSchoolConfigOnline(config: SchoolConfig): Promise<boolean> {
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

// Sync specialties online
export async function syncSpecialtiesOnline(specialties: string[]): Promise<boolean> {
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
