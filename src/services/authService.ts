import {
  getPocketBaseUrl,
  getPocketBaseToken,
  setPocketBaseToken,
  isPocketBaseConfigured,
} from './pocketbase';
import { User } from '../types';

const ADMIN_EMAIL = 'maruyalexander1@gmail.com';
const STORAGE_KEY_CURRENT_USER = 'testify_pocketbase_current_user';
const STORAGE_KEY_KNOWN_USERS = 'testify_pocketbase_known_users';

export const authService = {
  // Check if an email has admin privileges
  isAdminEmail(email?: string | null): boolean {
    if (!email) return false;
    return email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();
  },

  // Retrieve cached known users
  getKnownUsers(): User[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_KNOWN_USERS);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  // Save/merge known user
  saveKnownUser(user: User): void {
    try {
      const list = this.getKnownUsers();
      const idx = list.findIndex((u) => u.id === user.id || u.email.toLowerCase() === user.email.toLowerCase());
      if (idx >= 0) {
        list[idx] = { ...list[idx], ...user };
      } else {
        list.push(user);
      }
      localStorage.setItem(STORAGE_KEY_KNOWN_USERS, JSON.stringify(list));
    } catch {}
  },

  // Checks whether PocketBase server is configured
  isConfigured(): boolean {
    return isPocketBaseConfigured();
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
      try {
        localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(user));
      } catch {}
    } else {
      try {
        localStorage.removeItem(STORAGE_KEY_CURRENT_USER);
      } catch {}
    }
  },

  // Register a new user account in PocketBase
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

    const pbUrl = getPocketBaseUrl();
    if (!pbUrl) {
      throw new Error(
        'No se ha configurado la URL de PocketBase. Introduce tu enlace de Cloudflare en la ventana de Ajustes de Servidor.'
      );
    }

    // 1. Create record in PocketBase users collection
    const createRes = await fetch(`${pbUrl}/api/collections/users/records`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: cleanEmail,
        password: password,
        passwordConfirm: password,
        name: cleanName,
        role: role,
        institution: institution?.trim() || '',
        subjectArea: subjectArea?.trim() || '',
      }),
    });

    const createData = await createRes.json();
    if (!createRes.ok) {
      const emailErr = createData?.data?.email?.message;
      const passErr = createData?.data?.password?.message;
      const genericMsg = createData?.message;

      if (emailErr?.toLowerCase().includes('unique') || emailErr?.toLowerCase().includes('already')) {
        throw new Error('Ya existe una cuenta con este correo electrónico en tu PocketBase.');
      }
      if (passErr) {
        throw new Error(`Contraseña inválida: ${passErr}`);
      }
      throw new Error(genericMsg || 'Error al crear la cuenta en PocketBase.');
    }

    // 2. Automatically authenticate with PocketBase
    const authResult = await this.signInWithEmail(cleanEmail, password);
    return {
      user: authResult,
      sessionActive: true,
      message:
        role === 'teacher'
          ? '¡Cuenta docente creada e iniciada con éxito en tu PocketBase!'
          : '¡Cuenta creada e iniciada con éxito en tu PocketBase!',
    };
  },

  // Login with Email and Password against PocketBase
  async signInWithEmail(email: string, password: string): Promise<User> {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error('Por favor, introduce un correo electrónico válido.');
    }
    if (!password) {
      throw new Error('Por favor, introduce tu contraseña.');
    }

    const pbUrl = getPocketBaseUrl();
    if (!pbUrl) {
      throw new Error(
        'No se ha configurado la URL de PocketBase. Configura el enlace de tu Mac en Ajustes de Servidor.'
      );
    }

    let authRes: Response;
    try {
      authRes = await fetch(`${pbUrl}/api/collections/users/auth-with-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identity: cleanEmail,
          password: password,
        }),
      });
    } catch (netErr: any) {
      throw new Error(
        `No se pudo conectar con tu servidor PocketBase en ${pbUrl}. ¿Está encendido tu Mac y el túnel activo?`
      );
    }

    const authData = await authRes.json();
    if (!authRes.ok) {
      const msg = authData?.message || '';
      if (msg.toLowerCase().includes('invalid') || msg.toLowerCase().includes('authenticate')) {
        throw new Error('Correo electrónico o contraseña incorrectos en PocketBase.');
      }
      throw new Error(msg || 'No se pudo iniciar sesión en PocketBase.');
    }

    const record = authData.record;
    setPocketBaseToken(authData.token);

    const isAdmin = this.isAdminEmail(cleanEmail);
    const mappedUser: User = {
      id: record.id,
      name: record.name || cleanEmail.split('@')[0],
      email: record.email || cleanEmail,
      avatar: record.avatar
        ? `${pbUrl}/api/files/_pb_users_auth_/${record.id}/${record.avatar}`
        : `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(record.id)}`,
      role: isAdmin ? 'admin' : (record.role || 'user'),
      institution: record.institution || undefined,
      subjectArea: record.subjectArea || undefined,
      provider: 'email',
      emailVerified: Boolean(record.verified),
      createdAt: record.created || new Date().toISOString(),
    };

    this.setCurrentUser(mappedUser);
    this.saveKnownUser(mappedUser);
    return mappedUser;
  },

  // Guest / Instant demo access
  signInAsGuest(role: 'user' | 'teacher' = 'user', name?: string): User {
    const defaultName = role === 'teacher' ? 'Prof. Invitado' : 'Estudiante Demo';
    const guestUser: User = {
      id: `guest_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: name || defaultName,
      email: role === 'teacher' ? 'profesor.demo@aula.edu' : 'estudiante.demo@aula.edu',
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name || defaultName)}`,
      role: role,
      institution: 'Colegio / IES Demo',
      subjectArea: role === 'teacher' ? 'Docencia' : undefined,
      provider: 'email',
      emailVerified: true,
      createdAt: new Date().toISOString(),
    };
    this.setCurrentUser(guestUser);
    return guestUser;
  },

  // Sign out
  async signOut(): Promise<void> {
    setPocketBaseToken(null);
    this.setCurrentUser(null);
  },

  // Listen / Validate auth state on boot
  listenAuthState(onChange: (user: User | null) => void) {
    const cached = this.getCurrentUser();
    onChange(cached);

    // Validate token with PocketBase if token exists
    const token = getPocketBaseToken();
    const pbUrl = getPocketBaseUrl();
    if (token && pbUrl) {
      fetch(`${pbUrl}/api/collections/users/auth-refresh`, {
        method: 'POST',
        headers: {
          Authorization: token,
          'Content-Type': 'application/json',
        },
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && data.record) {
            setPocketBaseToken(data.token);
            const isAdmin = this.isAdminEmail(data.record.email);
            const refreshed: User = {
              id: data.record.id,
              name: data.record.name || data.record.email?.split('@')[0],
              email: data.record.email,
              avatar: data.record.avatar
                ? `${pbUrl}/api/files/_pb_users_auth_/${data.record.id}/${data.record.avatar}`
                : `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(data.record.id)}`,
              role: isAdmin ? 'admin' : (data.record.role || 'user'),
              institution: data.record.institution || undefined,
              subjectArea: data.record.subjectArea || undefined,
              provider: 'email',
              emailVerified: Boolean(data.record.verified),
              createdAt: data.record.created || new Date().toISOString(),
            };
            this.setCurrentUser(refreshed);
            onChange(refreshed);
          }
        })
        .catch(() => {
          // Keep cached user if offline
        });
    }

    return () => {};
  },

  // Admin: Get all users from PocketBase database
  async getAllUsersFromDatabase(): Promise<User[]> {
    const list: User[] = [...this.getKnownUsers()];
    const current = this.getCurrentUser();
    if (current && !list.some((u) => u.id === current.id || u.email.toLowerCase() === current.email.toLowerCase())) {
      list.push(current);
    }

    const pbUrl = getPocketBaseUrl();
    if (!pbUrl) return list;

    try {
      const token = getPocketBaseToken();
      const res = await fetch(`${pbUrl}/api/collections/users/records?perPage=200`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          ...(token ? { Authorization: token } : {}),
        },
      });

      if (res.ok) {
        const data = await res.json();
        const items = data.items || [];
        items.forEach((rec: any) => {
          const userObj: User = {
            id: rec.id,
            name: rec.name || rec.email?.split('@')[0] || 'Usuario PocketBase',
            email: rec.email || '',
            avatar: rec.avatar
              ? `${pbUrl}/api/files/_pb_users_auth_/${rec.id}/${rec.avatar}`
              : `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(rec.id)}`,
            role: this.isAdminEmail(rec.email) ? 'admin' : (rec.role || 'user'),
            institution: rec.institution,
            subjectArea: rec.subjectArea,
            provider: 'email',
            emailVerified: Boolean(rec.verified),
            createdAt: rec.created || new Date().toISOString(),
          };

          const existingIdx = list.findIndex(
            (u) => u.id === userObj.id || u.email.toLowerCase() === userObj.email.toLowerCase()
          );
          if (existingIdx >= 0) {
            list[existingIdx] = { ...list[existingIdx], ...userObj };
          } else {
            list.push(userObj);
          }
          this.saveKnownUser(userObj);
        });
      }
    } catch (err) {
      console.warn('Could not query PocketBase users collection:', err);
    }

    return list;
  },
};
