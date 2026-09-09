import { supabase, isSupabaseConfigured } from './supabase';
import { User } from '../types';

const ADMIN_EMAIL = 'maruyalexander1@gmail.com';
const STORAGE_KEY_CURRENT_USER = 'testify_supabase_current_user';

export const authService = {
  // Check if an email is administrator
  isAdminEmail(email?: string | null): boolean {
    if (!email) return false;
    return email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();
  },

  // Check if Supabase connection is ready
  isConfigured(): boolean {
    return isSupabaseConfigured();
  },

  // Get currently cached user
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

  // Save current active user in memory/storage
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

  // Map Supabase User to App User
  mapSupabaseUser(sbUser: any): User {
    const email = sbUser.email || '';
    const metadata = sbUser.user_metadata || {};
    const name =
      metadata.name ||
      metadata.full_name ||
      email.split('@')[0] ||
      'Estudiante';
    const avatar =
      metadata.avatar_url ||
      `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(sbUser.id || name)}`;
    const isAdmin = this.isAdminEmail(email);
    const provider = sbUser.app_metadata?.provider === 'google' ? 'google' : 'email';

    return {
      id: sbUser.id,
      name,
      email,
      avatar,
      role: isAdmin ? 'admin' : 'user',
      provider,
      emailVerified: Boolean(sbUser.email_confirmed_at),
      createdAt: sbUser.created_at || new Date().toISOString(),
    };
  },

  // Register with Supabase (Email and Password)
  async registerWithEmail(
    name: string,
    email: string,
    password: string
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
      throw new Error('La contraseña debe tener un mínimo de 6 caracteres.');
    }

    if (!isSupabaseConfigured()) {
      throw new Error(
        'Supabase no está configurado. Por favor, define VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en la configuración.'
      );
    }

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password: password,
      options: {
        data: {
          name: cleanName,
          full_name: cleanName,
          avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(cleanName)}`,
        },
      },
    });

    if (error) {
      if (error.message.toLowerCase().includes('already registered')) {
        throw new Error('Ya existe una cuenta registrada con este correo electrónico.');
      }
      throw new Error(error.message || 'Error al registrar usuario en Supabase.');
    }

    if (!data.user) {
      throw new Error('No se pudo crear la cuenta de usuario.');
    }

    const mappedUser = this.mapSupabaseUser(data.user);
    const sessionActive = Boolean(data.session);

    if (sessionActive) {
      this.setCurrentUser(mappedUser);
    }

    return {
      user: mappedUser,
      sessionActive,
      message: sessionActive
        ? '¡Cuenta creada y sesión iniciada!'
        : '¡Cuenta creada con éxito! Si tu proyecto tiene confirmación de correo requerida, revisa tu bandeja de entrada para verificar tu cuenta.',
    };
  },

  // Login with Supabase (Email and Password)
  async signInWithEmail(email: string, password: string): Promise<User> {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error('Por favor, introduce un correo electrónico válido.');
    }
    if (!password) {
      throw new Error('Por favor, introduce tu contraseña.');
    }

    if (!isSupabaseConfigured()) {
      throw new Error(
        'Supabase no está configurado. Por favor, define VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en la configuración.'
      );
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password: password,
    });

    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes('invalid login credentials') || msg.includes('invalid credentials')) {
        throw new Error('El correo electrónico o la contraseña son incorrectos.');
      }
      if (msg.includes('email not confirmed')) {
        throw new Error('Tu correo aún no está confirmado. Revisa el enlace de verificación en tu bandeja de entrada.');
      }
      throw new Error(error.message || 'No se pudo iniciar sesión.');
    }

    if (!data.user) {
      throw new Error('No se recibió la información del usuario.');
    }

    const mappedUser = this.mapSupabaseUser(data.user);
    this.setCurrentUser(mappedUser);
    return mappedUser;
  },

  // Login with Google via Supabase OAuth
  async signInWithGoogle(): Promise<void> {
    if (!isSupabaseConfigured()) {
      throw new Error(
        'Supabase no está configurado. Por favor, define VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en la configuración.'
      );
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });

    if (error) {
      throw new Error(error.message || 'Error al iniciar sesión con Google mediante Supabase.');
    }
  },

  // Sign out
  async signOut(): Promise<void> {
    try {
      if (isSupabaseConfigured()) {
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.warn('Supabase sign out notice:', err);
    }
    this.setCurrentUser(null);
  },

  // Real-time auth listener for Supabase
  listenAuthState(onChange: (user: User | null) => void) {
    if (!isSupabaseConfigured()) {
      // Return cached user if any
      const cached = this.getCurrentUser();
      onChange(cached);
      return () => {};
    }

    // Check existing session on load
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const appUser = this.mapSupabaseUser(session.user);
        this.setCurrentUser(appUser);
        onChange(appUser);
      } else {
        const cached = this.getCurrentUser();
        onChange(cached);
      }
    });

    // Listen to changes (SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED, etc.)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        const appUser = this.mapSupabaseUser(session.user);
        this.setCurrentUser(appUser);
        onChange(appUser);
      } else if (event === 'SIGNED_OUT') {
        this.setCurrentUser(null);
        onChange(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  },

  // Admin: Get all users
  async getAllUsersFromDatabase(): Promise<User[]> {
    const list: User[] = [];
    const current = this.getCurrentUser();
    if (current) {
      list.push(current);
    }

    if (isSupabaseConfigured()) {
      try {
        // Try fetching registered users if a 'users' or 'profiles' table exists
        const { data } = await supabase.from('users').select('*');
        if (data && Array.isArray(data)) {
          data.forEach((row) => {
            if (!list.some((u) => u.id === row.id)) {
              list.push({
                id: row.id,
                name: row.name || row.email?.split('@')[0] || 'Usuario',
                email: row.email || '',
                role: this.isAdminEmail(row.email) ? 'admin' : 'user',
                provider: row.provider || 'email',
                emailVerified: Boolean(row.email_verified),
                createdAt: row.created_at || new Date().toISOString(),
              });
            }
          });
        }
      } catch {
        // Ignore if 'users' table is not exposed
      }
    }

    return list;
  },
};
