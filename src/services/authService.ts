import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut as fbSignOut,
  onAuthStateChanged,
  updateProfile,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  getDocs,
} from 'firebase/firestore';
import { auth, db, googleProvider } from './firebase';
import { User } from '../types';

const ADMIN_EMAIL = 'maruyalexander1@gmail.com';
const STORAGE_KEY_CURRENT_USER = 'testify_current_user';

export const authService = {
  // Check if an email has admin privileges
  isAdminEmail(email?: string | null): boolean {
    if (!email) return false;
    return email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();
  },

  // Firebase is configured by default via firebase-applet-config.json
  isConfigured(): boolean {
    return Boolean(auth && db);
  },

  // Get currently cached user from storage
  getCurrentUser(): User | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_CURRENT_USER);
      if (raw) {
        const u: User = JSON.parse(raw);
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

  // Save current active user in memory and localStorage
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

  // Map Firebase Auth User to App User format
  async mapFirebaseUser(
    fbUser: FirebaseUser,
    fallbackRole?: 'user' | 'teacher'
  ): Promise<User> {
    const email = fbUser.email || '';
    const isAdmin = this.isAdminEmail(email);
    let role: 'admin' | 'user' | 'teacher' = isAdmin
      ? 'admin'
      : fallbackRole || 'user';
    let institution: string | undefined;
    let subjectArea: string | undefined;

    // Check if user has an existing Firestore record with custom profile data
    try {
      const userRef = doc(db, 'users', fbUser.uid);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        const data = snap.data();
        if (data.role && (data.role === 'teacher' || data.role === 'user' || data.role === 'admin')) {
          role = isAdmin ? 'admin' : data.role;
        }
        if (data.institution) institution = data.institution;
        if (data.subjectArea) subjectArea = data.subjectArea;
      } else {
        // Create initial user document in Firestore
        const newUserDoc = {
          id: fbUser.uid,
          name: fbUser.displayName || email.split('@')[0] || 'Usuario',
          email: email,
          avatar:
            fbUser.photoURL ||
            `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(fbUser.uid)}`,
          role: role,
          provider: fbUser.providerData?.[0]?.providerId === 'google.com' ? 'google' : 'email',
          emailVerified: fbUser.emailVerified || false,
          createdAt: new Date().toISOString(),
          ...(institution ? { institution } : {}),
          ...(subjectArea ? { subjectArea } : {}),
        };
        await setDoc(userRef, newUserDoc, { merge: true });
      }
    } catch (e) {
      console.warn('Notice querying Firestore user doc:', e);
    }

    const name =
      fbUser.displayName ||
      email.split('@')[0] ||
      (role === 'teacher' ? 'Profesor/a' : 'Estudiante');

    const avatar =
      fbUser.photoURL ||
      `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(fbUser.uid || name)}`;

    return {
      id: fbUser.uid,
      name,
      email,
      avatar,
      role: isAdmin ? 'admin' : role,
      institution,
      subjectArea,
      provider: fbUser.providerData?.[0]?.providerId === 'google.com' ? 'google' : 'email',
      emailVerified: fbUser.emailVerified || false,
      createdAt: fbUser.metadata?.creationTime || new Date().toISOString(),
    };
  },

  // Register with Email and Password in Firebase Auth
  async registerWithEmail(
    name: string,
    email: string,
    password: string,
    role: 'user' | 'teacher' = 'user',
    institution?: string,
    subjectArea?: string
  ): Promise<{ user: User; sessionActive: boolean; message?: string }> {
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error('Por favor, introduce un correo electrónico válido.');
    }
    if (!cleanName) {
      throw new Error('Por favor, introduce tu nombre completo.');
    }
    if (!password || password.length < 6) {
      throw new Error('La contraseña debe tener al menos 6 caracteres.');
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        cleanEmail,
        password
      );
      const fbUser = userCredential.user;

      // Update Firebase display name
      try {
        await updateProfile(fbUser, {
          displayName: cleanName,
          photoURL: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(cleanName)}`,
        });
      } catch (err) {
        console.warn('Could not update Firebase user profile:', err);
      }

      // Persist in Firestore
      const isAdmin = this.isAdminEmail(cleanEmail);
      const finalRole: 'admin' | 'user' | 'teacher' = isAdmin ? 'admin' : role;
      const appUser: User = {
        id: fbUser.uid,
        name: cleanName,
        email: cleanEmail,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(cleanName)}`,
        role: finalRole,
        institution: institution?.trim() || undefined,
        subjectArea: subjectArea?.trim() || undefined,
        provider: 'email',
        emailVerified: fbUser.emailVerified || false,
        createdAt: new Date().toISOString(),
      };

      try {
        await setDoc(doc(db, 'users', fbUser.uid), appUser);
      } catch (err) {
        console.warn('Firestore user save notice:', err);
      }

      this.setCurrentUser(appUser);

      return {
        user: appUser,
        sessionActive: true,
        message: finalRole === 'teacher'
          ? '¡Cuenta de Profesor creada con éxito! Ya puedes preparar exámenes y actividades de aula.'
          : '¡Cuenta creada y sesión iniciada con éxito!',
      };
    } catch (err: any) {
      console.error('Firebase registration error:', err);
      const code = err.code || '';
      if (code === 'auth/email-already-in-use') {
        throw new Error('Ya existe una cuenta registrada con este correo electrónico. Por favor, inicia sesión.');
      }
      if (code === 'auth/weak-password') {
        throw new Error('La contraseña es muy débil. Debe tener al menos 6 caracteres.');
      }
      if (code === 'auth/invalid-email') {
        throw new Error('El formato de correo electrónico no es válido.');
      }
      if (code === 'auth/operation-not-allowed') {
        throw new Error('El registro con correo y contraseña no está habilitado actualmente.');
      }
      throw new Error(err.message || 'Error al crear la cuenta. Por favor, inténtalo de nuevo.');
    }
  },

  // Login with Email and Password in Firebase Auth
  async signInWithEmail(email: string, password: string): Promise<User> {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error('Por favor, introduce un correo electrónico válido.');
    }
    if (!password) {
      throw new Error('Por favor, introduce tu contraseña.');
    }

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        cleanEmail,
        password
      );
      const mappedUser = await this.mapFirebaseUser(userCredential.user);
      this.setCurrentUser(mappedUser);
      return mappedUser;
    } catch (err: any) {
      console.error('Firebase login error:', err);
      const code = err.code || '';
      if (
        code === 'auth/user-not-found' ||
        code === 'auth/wrong-password' ||
        code === 'auth/invalid-credential'
      ) {
        throw new Error('Correo electrónico o contraseña incorrectos. Por favor, verifica tus datos.');
      }
      if (code === 'auth/too-many-requests') {
        throw new Error('Demasiados intentos fallidos. Espera unos instantes o restablece tu contraseña.');
      }
      if (code === 'auth/invalid-email') {
        throw new Error('El correo electrónico introducido no tiene un formato válido.');
      }
      if (code === 'auth/network-request-failed') {
        throw new Error('Error de conexión a internet. Revisa tu red e inténtalo de nuevo.');
      }
      throw new Error(err.message || 'No se pudo iniciar sesión. Por favor, inténtalo de nuevo.');
    }
  },

  // Login with Google Popup via Firebase Auth
  async signInWithGoogle(role: 'user' | 'teacher' = 'user'): Promise<User> {
    try {
      const userCredential = await signInWithPopup(auth, googleProvider);
      const mappedUser = await this.mapFirebaseUser(userCredential.user, role);
      this.setCurrentUser(mappedUser);
      return mappedUser;
    } catch (err: any) {
      console.error('Firebase Google Sign-In error:', err);
      const code = err.code || '';
      if (code === 'auth/popup-closed-by-user') {
        throw new Error('Se ha cancelado la ventana de inicio de sesión con Google.');
      }
      if (code === 'auth/popup-blocked') {
        throw new Error('Tu navegador ha bloqueado la ventana emergente de Google. Por favor, permite ventanas emergentes para este sitio.');
      }
      if (code === 'auth/cancelled-popup-request') {
        throw new Error('Se canceló la solicitud anterior de Google.');
      }
      throw new Error(err.message || 'Error al iniciar sesión con Google.');
    }
  },

  // Guest / Demo Login (Instant access for immediate testing / classroom demo)
  signInAsGuest(role: 'user' | 'teacher' = 'user', name?: string): User {
    const defaultName = role === 'teacher' ? 'Profesor Invitado' : 'Estudiante Invitado';
    const guestUser: User = {
      id: `guest_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: name || defaultName,
      email: role === 'teacher' ? 'profesor.demo@aula.edu' : 'estudiante.demo@aula.edu',
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name || defaultName)}`,
      role: role,
      institution: 'Colegio / IES de Prueba',
      subjectArea: role === 'teacher' ? 'Docencia General' : undefined,
      provider: 'email',
      emailVerified: true,
      createdAt: new Date().toISOString(),
    };
    this.setCurrentUser(guestUser);
    return guestUser;
  },

  // Update profile information (e.g. switch role to teacher, set institution)
  async updateUserProfile(userId: string, data: Partial<User>): Promise<User | null> {
    const current = this.getCurrentUser();
    if (!current) return null;

    const updated: User = {
      ...current,
      ...data,
      // Admin protection
      role: this.isAdminEmail(current.email) ? 'admin' : (data.role || current.role),
    };

    this.setCurrentUser(updated);

    // Save to Firestore if accessible
    try {
      await updateDoc(doc(db, 'users', userId), {
        ...(data.name ? { name: data.name } : {}),
        ...(data.role && !this.isAdminEmail(current.email) ? { role: data.role } : {}),
        ...(data.institution !== undefined ? { institution: data.institution } : {}),
        ...(data.subjectArea !== undefined ? { subjectArea: data.subjectArea } : {}),
      });
    } catch (err) {
      console.warn('Could not update profile in Firestore:', err);
    }

    return updated;
  },

  // Sign out from Firebase Auth and clear local session
  async signOut(): Promise<void> {
    try {
      await fbSignOut(auth);
    } catch (err) {
      console.warn('Notice during Firebase signOut:', err);
    }
    this.setCurrentUser(null);
  },

  // Real-time auth listener for Firebase Auth
  listenAuthState(onChange: (user: User | null) => void) {
    // Check initial cached user first
    const cached = this.getCurrentUser();
    if (cached) {
      onChange(cached);
    }

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        try {
          const appUser = await this.mapFirebaseUser(fbUser);
          this.setCurrentUser(appUser);
          onChange(appUser);
        } catch (e) {
          console.warn('Error mapping Firebase auth state:', e);
          const c = this.getCurrentUser();
          onChange(c);
        }
      } else {
        // Only clear if not in an intentional local guest session
        const current = this.getCurrentUser();
        if (current && !current.id.startsWith('guest_')) {
          this.setCurrentUser(null);
          onChange(null);
        }
      }
    });

    return () => {
      unsubscribe();
    };
  },

  // Admin: Get all users from Firestore
  async getAllUsersFromDatabase(): Promise<User[]> {
    const list: User[] = [];
    const current = this.getCurrentUser();
    if (current) {
      list.push(current);
    }

    try {
      const snap = await getDocs(collection(db, 'users'));
      snap.forEach((docSnap) => {
        const data = docSnap.data() as any;
        if (!list.some((u) => u.id === (data.id || docSnap.id))) {
          list.push({
            id: data.id || docSnap.id,
            name: data.name || data.email?.split('@')[0] || 'Usuario',
            email: data.email || '',
            avatar: data.avatar,
            role: this.isAdminEmail(data.email) ? 'admin' : (data.role || 'user'),
            institution: data.institution,
            subjectArea: data.subjectArea,
            provider: data.provider || 'email',
            emailVerified: Boolean(data.emailVerified),
            createdAt: data.createdAt || new Date().toISOString(),
          });
        }
      });
    } catch (err) {
      console.warn('Error loading users from Firestore "users" collection:', err);
    }

    return list;
  },
};
