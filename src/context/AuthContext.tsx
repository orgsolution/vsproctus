import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, UserSpecialty, SUPERADMIN_EMAIL, ConfirmationEmail } from '../types';
import { useLocalStorage, hashPassword, INITIAL_USERS, sendConfirmationEmail } from '../services/storage';

interface AuthContextType {
  currentUser: User | null;
  users: User[];
  isSuperAdmin: boolean;
  login: (email: string, passwordPlain: string) => Promise<boolean>;
  signup: (data: {
    email: string;
    passwordPlain: string;
    firstName: string;
    lastName: string;
    cohort: string;
    specialty: UserSpecialty;
    bio?: string;
    avatar?: string;
  }) => Promise<{ success: boolean; error?: string; confirmationEmail?: ConfirmationEmail }>;
  loginWithGoogle: (data?: {
    email?: string;
    name?: string;
    picture?: string;
    cohort?: string;
    specialty?: string;
  }) => Promise<{ success: boolean; isNewUser?: boolean; confirmationEmail?: ConfirmationEmail; error?: string }>;
  requestPasswordReset: (email: string) => Promise<{ success: boolean; error?: string; resetToken?: string; confirmationEmail?: ConfirmationEmail }>;
  resetPasswordWithToken: (email: string, token: string, newPasswordPlain: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateProfile: (updates: Partial<User>) => void;
  getUserById: (id: string) => User | undefined;
  lastConfirmationEmail: ConfirmationEmail | null;
  setLastConfirmationEmail: (email: ConfirmationEmail | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useLocalStorage<User[]>('proctus_users', INITIAL_USERS);
  const [currentUserId, setCurrentUserId] = useLocalStorage<string | null>('proctus_current_user_id', null);
  const [lastConfirmationEmail, setLastConfirmationEmail] = useState<ConfirmationEmail | null>(null);

  const currentUser = users.find(u => u.id === currentUserId) || null;

  // RBAC: SuperAdmin check strictly for acceuil.org@gmail.com
  const isSuperAdmin = Boolean(
    currentUser && currentUser.email.toLowerCase().trim() === SUPERADMIN_EMAIL
  );

  // Auto-enforce roles based strictly on email: acceuil.org@gmail.com is SuperAdmin, all others are SimpleUser
  useEffect(() => {
    if (!currentUser) return;
    const isSuper = currentUser.email.toLowerCase().trim() === SUPERADMIN_EMAIL;
    const targetRole: 'SuperAdmin' | 'SimpleUser' = isSuper ? 'SuperAdmin' : 'SimpleUser';
    if (currentUser.role !== targetRole) {
      const updated = users.map(u => u.id === currentUser.id ? { ...u, role: targetRole } : u);
      setUsers(updated);
    }
  }, [currentUser, users, setUsers]);

  const login = async (email: string, passwordPlain: string): Promise<boolean> => {
    const hashed = await hashPassword(passwordPlain);
    const cleanEmail = email.toLowerCase().trim();
    const found = users.find(
      u => u.email.toLowerCase().trim() === cleanEmail && u.passwordHash === hashed
    );
    if (found) {
      if (cleanEmail === SUPERADMIN_EMAIL && found.role !== 'SuperAdmin') {
        const updated = users.map(u => u.id === found.id ? { ...u, role: 'SuperAdmin' as const } : u);
        setUsers(updated);
      }
      setCurrentUserId(found.id);
      return true;
    }
    return false;
  };

  const signup = async (data: {
    email: string;
    passwordPlain: string;
    firstName: string;
    lastName: string;
    cohort: string;
    specialty: UserSpecialty;
    bio?: string;
    avatar?: string;
  }) => {
    const cleanEmail = data.email.toLowerCase().trim();
    const existing = users.find(u => u.email.toLowerCase() === cleanEmail);
    if (existing) {
      return { success: false, error: 'Cet email est déjà enregistré.' };
    }

    const passwordHash = await hashPassword(data.passwordPlain);

    // Determine avatar
    let defaultAvatar = data.avatar;
    if (!defaultAvatar) {
      if (cleanEmail.endsWith('@gmail.com') || cleanEmail.includes('google')) {
        defaultAvatar = `https://unavatar.io/google/${encodeURIComponent(cleanEmail)}`;
      } else {
        defaultAvatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(data.firstName + ' ' + data.lastName)}&backgroundColor=0A1F44&textColor=C9A227`;
      }
    }

    const role: 'SuperAdmin' | 'SimpleUser' = cleanEmail === SUPERADMIN_EMAIL ? 'SuperAdmin' : 'SimpleUser';

    const newUser: User = {
      id: `user-${Date.now()}`,
      email: cleanEmail,
      passwordHash,
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      cohort: data.cohort,
      specialty: data.specialty,
      role,
      bio: data.bio || '',
      avatar: defaultAvatar,
      badges: role === 'SuperAdmin' ? ['SuperAdmin', 'Élève - Stagiaire'] : ['Élève - Stagiaire', 'Promotion ' + data.cohort],
      totalScore: 0,
      gamesPlayed: 0,
      emailConfirmed: true,
      authProvider: 'credentials',
      createdAt: new Date().toISOString(),
    };

    const updatedUsers = [...users, newUser];
    setUsers(updatedUsers);
    setCurrentUserId(newUser.id);

    // Envoi de l'e-mail de confirmation après inscription
    const sentMail = await sendConfirmationEmail({
      toEmail: cleanEmail,
      recipientName: `${newUser.firstName} ${newUser.lastName}`,
      type: 'signup_confirmation',
    });
    setLastConfirmationEmail(sentMail);

    return { success: true, confirmationEmail: sentMail };
  };

  const loginWithGoogle = async (googleData?: {
    email?: string;
    name?: string;
    picture?: string;
    cohort?: string;
    specialty?: string;
  }) => {
    // If specific email provided, use it; otherwise default to acceuil.org@gmail.com or student
    const emailToUse = (googleData?.email || 'acceuil.org@gmail.com').toLowerCase().trim();
    const fullName = googleData?.name || (emailToUse === SUPERADMIN_EMAIL ? 'Admin Proctus' : 'Étudiant Finance Google');
    const parts = fullName.split(' ');
    const firstName = parts[0] || 'Étudiant';
    const lastName = parts.slice(1).join(' ') || 'Finance';
    const avatar = googleData?.picture || `https://unavatar.io/google/${encodeURIComponent(emailToUse)}`;

    const existingUser = users.find(u => u.email.toLowerCase() === emailToUse);
    if (existingUser) {
      setCurrentUserId(existingUser.id);
      return { success: true, isNewUser: false };
    }

    // New registration via Google
    const dummyPasswordHash = await hashPassword(`google_oauth_${Date.now()}_secure`);
    const role: 'SuperAdmin' | 'SimpleUser' = emailToUse === SUPERADMIN_EMAIL ? 'SuperAdmin' : 'SimpleUser';
    const cohort = googleData?.cohort || '2025';
    const specialty = googleData?.specialty || 'Audit et Comptabilité';

    const newUser: User = {
      id: `user-g-${Date.now()}`,
      email: emailToUse,
      passwordHash: dummyPasswordHash,
      firstName,
      lastName,
      cohort,
      specialty,
      role,
      bio: 'Membre connecté via Google Workspace',
      avatar,
      badges: role === 'SuperAdmin' ? ['SuperAdmin', 'Google Auth', 'Élève - Stagiaire'] : ['Google Auth', 'Élève - Stagiaire'],
      totalScore: 0,
      gamesPlayed: 0,
      emailConfirmed: true,
      authProvider: 'google',
      createdAt: new Date().toISOString(),
    };

    const updated = [...users, newUser];
    setUsers(updated);
    setCurrentUserId(newUser.id);

    // Send confirmation email for Google signups too
    const sentMail = await sendConfirmationEmail({
      toEmail: emailToUse,
      recipientName: `${newUser.firstName} ${newUser.lastName}`,
      type: 'signup_confirmation',
    });
    setLastConfirmationEmail(sentMail);

    return { success: true, isNewUser: true, confirmationEmail: sentMail };
  };

  const requestPasswordReset = async (email: string) => {
    const cleanEmail = email.toLowerCase().trim();
    const found = users.find(u => u.email.toLowerCase() === cleanEmail);
    if (!found) {
      return { success: false, error: 'Aucun compte associé à cette adresse e-mail.' };
    }

    const resetToken = Math.floor(100000 + Math.random() * 900000).toString();
    const pendingKey = `proctus_reset_${cleanEmail}`;
    sessionStorage.setItem(pendingKey, JSON.stringify({ token: resetToken, expires: Date.now() + 15 * 60 * 1000 }));

    const sentMail = await sendConfirmationEmail({
      toEmail: cleanEmail,
      recipientName: `${found.firstName} ${found.lastName}`,
      type: 'password_reset',
      token: resetToken,
    });
    setLastConfirmationEmail(sentMail);

    return { success: true, resetToken, confirmationEmail: sentMail };
  };

  const resetPasswordWithToken = async (email: string, token: string, newPasswordPlain: string) => {
    const cleanEmail = email.toLowerCase().trim();
    const pendingKey = `proctus_reset_${cleanEmail}`;
    const raw = sessionStorage.getItem(pendingKey);
    if (!raw) {
      return { success: false, error: 'Aucune demande de réinitialisation en cours pour cet email.' };
    }
    try {
      const parsed = JSON.parse(raw);
      if (parsed.token !== token.trim()) {
        return { success: false, error: 'Code de réinitialisation invalide.' };
      }
      if (Date.now() > parsed.expires) {
        return { success: false, error: 'Ce code a expiré. Veuillez refaire une demande.' };
      }
      const newHash = await hashPassword(newPasswordPlain);
      const updated = users.map(u => (u.email.toLowerCase() === cleanEmail ? { ...u, passwordHash: newHash } : u));
      setUsers(updated);
      sessionStorage.removeItem(pendingKey);
      return { success: true };
    } catch {
      return { success: false, error: 'Erreur lors de la réinitialisation du mot de passe.' };
    }
  };

  const logout = () => {
    setCurrentUserId(null);
  };

  const updateProfile = (updates: Partial<User>) => {
    if (!currentUser) return;
    const updated = users.map(u => (u.id === currentUser.id ? { ...u, ...updates } : u));
    setUsers(updated);
  };

  const getUserById = (id: string) => users.find(u => u.id === id);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        users,
        isSuperAdmin,
        login,
        signup,
        loginWithGoogle,
        requestPasswordReset,
        resetPasswordWithToken,
        logout,
        updateProfile,
        getUserById,
        lastConfirmationEmail,
        setLastConfirmationEmail,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
