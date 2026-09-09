import {
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  getDocs,
  collection,
  query,
  orderBy,
  deleteDoc,
} from 'firebase/firestore';
import { auth, db, googleProvider } from './firebase';
import { handleFirestoreError, OperationType } from './firebaseErrors';
import { User } from '../types';

const ADMIN_EMAIL = 'maruyalexander1@gmail.com';
const STORAGE_KEY_CURRENT_USER = 'exam_ai_current_user';

export const authService = {
  // Check if an email is administrator
  isAdminEmail(email?: string | null): boolean {
    if (!email) return false;
    return email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();
  },

  // Get currently logged-in user from localStorage fallback or auth
  getCurrentUser(): User | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_CURRENT_USER);
      if (raw) {
        const u = JSON.parse(raw);
        if (this.isAdminEmail(u.email)) {
          u.role = 'admin';
        }
        return u;
      }
      return null;
    } catch {
      return null;
    }
  },

  // Save current active user
  setCurrentUser(user: User | null): void {
    if (user) {
      if (this.isAdminEmail(user.email)) {
        user.role = 'admin';
      }
      localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY_CURRENT_USER);
    }
  },

  // Sign in with Google (Firebase Popup)
  async signInWithGoogle(): Promise<User> {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const fbUser = result.user;
      const email = fbUser.email || '';
      const isAdmin = this.isAdminEmail(email);

      const user: User = {
        id: fbUser.uid,
        name: fbUser.displayName || 'Usuario Google',
        email: email,
        avatar: fbUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(fbUser.uid)}`,
        role: isAdmin ? 'admin' : 'user',
        provider: 'google',
        emailVerified: true,
        createdAt: fbUser.metadata?.creationTime || new Date().toISOString(),
      };

      // Persist to Firestore database: /users/{userId}
      const userRef = doc(db, 'users', user.id);
      try {
        await setDoc(userRef, user, { merge: true });
        if (isAdmin) {
          // Add to admins collection for security rules exists(/databases/.../admins/...)
          await setDoc(doc(db, 'admins', user.id), {
            uid: user.id,
            email: user.email,
            assignedAt: new Date().toISOString(),
          }, { merge: true });
        }
      } catch (dbErr) {
        handleFirestoreError(dbErr, OperationType.WRITE, `users/${user.id}`);
      }

      this.setCurrentUser(user);
      return user;
    } catch (err: any) {
      console.error('Error signing in with Google:', err);
      // Handle popup closed or iframe restrictions gracefully
      if (err.code === 'auth/popup-closed-by-user') {
        throw new Error('Has cerrado la ventana de inicio de sesión de Google antes de finalizar.');
      } else if (err.code === 'auth/popup-blocked') {
        throw new Error('Tu navegador ha bloqueado la ventana emergente de Google. Por favor, permite ventanas emergentes para este sitio.');
      } else if (err.code === 'auth/cancelled-popup-request') {
        throw new Error('Operación cancelada.');
      }
      throw new Error(err.message || 'No se pudo completar el inicio de sesión con Google.');
    }
  },

  // Step 1 of Email Registration: Request 6-digit verification code
  async requestVerificationCode(email: string, name: string): Promise<{ code?: string; message: string }> {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error('Por favor, introduce un correo electrónico válido.');
    }
    if (!name.trim()) {
      throw new Error('Por favor, introduce tu nombre.');
    }

    const response = await fetch('/api/send-verification-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, name: name.trim() }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Error al solicitar el código de verificación.');
    }

    return {
      code: data.code,
      message: data.message,
    };
  },

  // Step 2 of Email Registration: Verify code and create account in Firestore
  async verifyCodeAndRegister(
    name: string,
    email: string,
    code: string
  ): Promise<User> {
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();
    const cleanCode = code.trim();

    if (!cleanCode || cleanCode.length !== 6) {
      throw new Error('El código de verificación debe tener 6 dígitos numéricos.');
    }

    // Verify against server API
    const verifyRes = await fetch('/api/verify-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, code: cleanCode }),
    });

    const verifyData = await verifyRes.json();
    if (!verifyRes.ok || !verifyData.valid) {
      throw new Error(verifyData.error || 'El código de verificación es incorrecto o ha caducado.');
    }

    // Create user ID
    const userId = `usr_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const isAdmin = this.isAdminEmail(cleanEmail);

    const newUser: User = {
      id: userId,
      name: cleanName,
      email: cleanEmail,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(cleanName)}`,
      role: isAdmin ? 'admin' : 'user',
      provider: 'email',
      emailVerified: true,
      createdAt: new Date().toISOString(),
    };

    // Save to Firestore database: /users/{userId}
    try {
      await setDoc(doc(db, 'users', newUser.id), newUser);
      if (isAdmin) {
        await setDoc(doc(db, 'admins', newUser.id), {
          uid: newUser.id,
          email: newUser.email,
          assignedAt: new Date().toISOString(),
        });
      }
    } catch (dbErr) {
      // If client auth rule restricts writing before auth login, keep in local storage
      console.warn('Firestore write warning:', dbErr);
    }

    this.setCurrentUser(newUser);
    return newUser;
  },

  // Sign in with Email
  async signInWithEmail(email: string): Promise<User> {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error('Introduce un correo electrónico válido.');
    }

    const userId = `usr_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const userRef = doc(db, 'users', userId);

    let foundUser: User | null = null;
    try {
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        foundUser = snap.data() as User;
      }
    } catch {
      // Fallback
    }

    if (!foundUser) {
      // Check if this is the admin email
      const isAdmin = this.isAdminEmail(cleanEmail);
      foundUser = {
        id: userId,
        name: cleanEmail.split('@')[0],
        email: cleanEmail,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(cleanEmail)}`,
        role: isAdmin ? 'admin' : 'user',
        provider: 'email',
        emailVerified: true,
        createdAt: new Date().toISOString(),
      };
      try {
        await setDoc(userRef, foundUser);
      } catch {
        // Continue
      }
    }

    if (this.isAdminEmail(foundUser.email)) {
      foundUser.role = 'admin';
    }

    this.setCurrentUser(foundUser);
    return foundUser;
  },

  // Read all users from Firestore Database (for maruyalexander1@gmail.com / Admin role)
  async getAllUsersFromDatabase(): Promise<User[]> {
    const path = 'users';
    try {
      const usersCol = collection(db, path);
      const snap = await getDocs(usersCol);
      const list: User[] = [];
      snap.forEach((d) => {
        const u = d.data() as User;
        if (authService.isAdminEmail(u.email)) {
          u.role = 'admin';
        }
        list.push(u);
      });
      // Sort newest first
      return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, path);
    }
  },

  // Sign out
  async signOut(): Promise<void> {
    try {
      await firebaseSignOut(auth);
    } catch (err) {
      console.warn('Firebase signout error:', err);
    }
    this.setCurrentUser(null);
  },

  // Listen for Firebase Auth changes
  listenAuthState(onChange: (user: User | null) => void) {
    return onAuthStateChanged(auth, async (fbUser: FirebaseUser | null) => {
      if (fbUser) {
        const email = fbUser.email || '';
        const isAdmin = this.isAdminEmail(email);

        // Fetch user from Firestore
        const userRef = doc(db, 'users', fbUser.uid);
        let appUser: User | null = null;
        try {
          const snap = await getDoc(userRef);
          if (snap.exists()) {
            appUser = snap.data() as User;
            if (isAdmin) appUser.role = 'admin';
          }
        } catch (e) {
          console.warn('Failed to fetch user doc from firestore:', e);
        }

        if (!appUser) {
          appUser = {
            id: fbUser.uid,
            name: fbUser.displayName || email.split('@')[0] || 'Estudiante',
            email,
            avatar: fbUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(fbUser.uid)}`,
            role: isAdmin ? 'admin' : 'user',
            provider: 'google',
            emailVerified: Boolean(fbUser.emailVerified),
            createdAt: new Date().toISOString(),
          };
          try {
            await setDoc(userRef, appUser, { merge: true });
          } catch {
            // Ignore
          }
        }

        this.setCurrentUser(appUser);
        onChange(appUser);
      }
    });
  },
};
