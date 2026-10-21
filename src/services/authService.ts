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

    const overridesRaw = localStorage.getItem('testify_role_overrides');
    const overrides = overridesRaw ? JSON.parse(overridesRaw) : {};

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
          const overrideRole = overrides[rec.id] || overrides[(rec.email || '').toLowerCase()];
          const finalRole = this.isAdminEmail(rec.email)
            ? 'admin'
            : (overrideRole || rec.role || 'user');

          const userObj: User = {
            id: rec.id,
            name: rec.name || rec.email?.split('@')[0] || 'Usuario PocketBase',
            email: rec.email || '',
            avatar: rec.avatar
              ? `${pbUrl}/api/files/_pb_users_auth_/${rec.id}/${rec.avatar}`
              : `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(rec.id)}`,
            role: finalRole,
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

    // Apply any overrides to existing list items
    return list.map((u) => {
      if (this.isAdminEmail(u.email)) return { ...u, role: 'admin' };
      const overrideRole = overrides[u.id] || overrides[u.email.toLowerCase()];
      if (overrideRole) return { ...u, role: overrideRole };
      return u;
    });
  },

  // Admin: Update user role in PocketBase and local database
  async updateUserRole(userId: string, newRole: 'user' | 'teacher' | 'admin'): Promise<boolean> {
    const list = this.getKnownUsers();
    const targetIdx = list.findIndex((u) => u.id === userId);
    if (targetIdx >= 0) {
      list[targetIdx].role = newRole;
      localStorage.setItem(STORAGE_KEY_KNOWN_USERS, JSON.stringify(list));
    }

    // Save in persistent role overrides
    try {
      const overridesRaw = localStorage.getItem('testify_role_overrides') || '{}';
      const overrides = JSON.parse(overridesRaw);
      overrides[userId] = newRole;
      if (targetIdx >= 0 && list[targetIdx].email) {
        overrides[list[targetIdx].email.toLowerCase()] = newRole;
      }
      localStorage.setItem('testify_role_overrides', JSON.stringify(overrides));
    } catch {}

    // Update active user if it's the current user
    const current = this.getCurrentUser();
    if (current && (current.id === userId || (targetIdx >= 0 && list[targetIdx].email.toLowerCase() === current.email.toLowerCase()))) {
      current.role = newRole;
      this.setCurrentUser(current);
    }

    // Try patching in PocketBase collection 'users'
    const pbUrl = getPocketBaseUrl();
    if (pbUrl) {
      try {
        const token = getPocketBaseToken();
        await fetch(`${pbUrl}/api/collections/users/records/${userId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: token } : {}),
          },
          body: JSON.stringify({ role: newRole }),
        });
      } catch (err) {
        console.warn('Notice updating role in PocketBase:', err);
      }
    }

    return true;
  },

  // Update current user's profile (name, institution, department/subjectArea, avatar)
  async updateUserProfile(data: {
    name: string;
    institution?: string;
    department?: string;
    avatar?: string;
  }): Promise<User> {
    const current = this.getCurrentUser();
    if (!current) {
      throw new Error('No hay ninguna sesión activa iniciada.');
    }

    const cleanName = data.name.trim();
    if (!cleanName) {
      throw new Error('El nombre no puede estar vacío.');
    }

    const updatedUser: User = {
      ...current,
      name: cleanName,
      institution: data.institution !== undefined ? data.institution.trim() : current.institution,
      subjectArea: data.department !== undefined ? data.department.trim() : (current.subjectArea || current.department),
      department: data.department !== undefined ? data.department.trim() : (current.department || current.subjectArea),
      avatar: data.avatar || current.avatar,
    };

    // Keep admin email protection
    if (this.isAdminEmail(updatedUser.email)) {
      updatedUser.role = 'admin';
    }

    // Persist locally
    this.setCurrentUser(updatedUser);
    this.saveKnownUser(updatedUser);

    // Try patching in PocketBase
    const pbUrl = getPocketBaseUrl();
    const token = getPocketBaseToken();
    if (pbUrl && current.id && !current.id.startsWith('guest_')) {
      try {
        const patchPayload: Record<string, any> = {
          name: cleanName,
          institution: updatedUser.institution || '',
          subjectArea: updatedUser.department || updatedUser.subjectArea || '',
        };
        const res = await fetch(`${pbUrl}/api/collections/users/records/${current.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: token } : {}),
          },
          body: JSON.stringify(patchPayload),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => null);
          console.warn('PocketBase profile patch notice:', errData);
        }
      } catch (netErr) {
        console.warn('Network issue patching PocketBase user profile:', netErr);
      }
    }

    return updatedUser;
  },

  // Update current user's password in PocketBase
  async updateUserPassword(data: {
    oldPassword?: string;
    newPassword: string;
    passwordConfirm: string;
  }): Promise<{ success: boolean; message: string }> {
    const current = this.getCurrentUser();
    if (!current) {
      throw new Error('No hay ninguna sesión activa iniciada.');
    }

    if (!data.newPassword || data.newPassword.length < 6) {
      throw new Error('La nueva contraseña debe tener al menos 6 caracteres.');
    }

    if (data.newPassword !== data.passwordConfirm) {
      throw new Error('La nueva contraseña y la confirmación no coinciden.');
    }

    const pbUrl = getPocketBaseUrl();
    const token = getPocketBaseToken();

    if (current.id.startsWith('guest_')) {
      return {
        success: true,
        message: 'Contraseña actualizada en el perfil de invitado.',
      };
    }

    if (!pbUrl) {
      throw new Error('No hay conexión con el servidor de base de datos.');
    }

    try {
      const res = await fetch(`${pbUrl}/api/collections/users/records/${current.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: token } : {}),
        },
        body: JSON.stringify({
          oldPassword: data.oldPassword || '',
          password: data.newPassword,
          passwordConfirm: data.passwordConfirm,
        }),
      });

      const resData = await res.json().catch(() => null);

      if (!res.ok) {
        const oldPassErr = resData?.data?.oldPassword?.message;
        const passErr = resData?.data?.password?.message;
        const confirmErr = resData?.data?.passwordConfirm?.message;
        const generic = resData?.message;

        if (oldPassErr || generic?.toLowerCase().includes('old password') || generic?.toLowerCase().includes('oldpassword')) {
          throw new Error('La contraseña actual es incorrecta. Por favor, verifícala.');
        }
        if (passErr) {
          throw new Error(`Error en la nueva contraseña: ${passErr}`);
        }
        if (confirmErr) {
          throw new Error(`Confirmación de contraseña inválida: ${confirmErr}`);
        }
        throw new Error(generic || 'No se pudo actualizar la contraseña en PocketBase.');
      }

      return {
        success: true,
        message: '¡Contraseña actualizada con éxito!',
      };
    } catch (err: any) {
      if (err.message && !err.message.includes('fetch') && !err.message.includes('Failed to fetch')) {
        throw err;
      }
      throw new Error('Error de conexión con el servidor. Verifica tu enlace de PocketBase.');
    }
  },
};
