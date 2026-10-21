export type DatabaseTarget = 'firebase' | 'supabase' | 'homelab';

export interface DbConfig {
  activeTarget: DatabaseTarget;
  supabaseUrl: string;
  supabaseAnonKey: string;
  homelabUrl: string;
  homelabApiKey?: string;
  autoFallback: boolean;
}

const STORAGE_KEY_CONFIG = 'testify_database_target_config';

const DEFAULT_CONFIG: DbConfig = {
  activeTarget: 'firebase',
  supabaseUrl: (import.meta.env.VITE_SUPABASE_URL || '').trim(),
  supabaseAnonKey: (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim(),
  homelabUrl: '',
  homelabApiKey: '',
  autoFallback: true,
};

export const dbConfigService = {
  getConfig(): DbConfig {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_CONFIG);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          ...DEFAULT_CONFIG,
          ...parsed,
          // If env vars exist and localStorage is empty, prefer env vars
          supabaseUrl: parsed.supabaseUrl || (import.meta.env.VITE_SUPABASE_URL || '').trim(),
          supabaseAnonKey: parsed.supabaseAnonKey || (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim(),
        };
      }
      return DEFAULT_CONFIG;
    } catch {
      return DEFAULT_CONFIG;
    }
  },

  saveConfig(partial: Partial<DbConfig>): DbConfig {
    const current = this.getConfig();
    const updated: DbConfig = {
      ...current,
      ...partial,
    };
    try {
      localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(updated));
    } catch (e) {
      console.error('Error saving db config:', e);
    }
    return updated;
  },

  // Test connection to a Supabase URL and Key
  async testSupabase(
    customUrl?: string,
    customKey?: string
  ): Promise<{ ok: boolean; message: string; latencyMs?: number }> {
    const config = this.getConfig();
    const url = (customUrl || config.supabaseUrl || '').trim();
    const key = (customKey || config.supabaseAnonKey || '').trim();

    if (!url || !key) {
      return {
        ok: false,
        message: 'Faltan la URL del proyecto o la clave anon_key de Supabase.',
      };
    }

    if (!url.startsWith('https://') && !url.startsWith('http://')) {
      return {
        ok: false,
        message: 'La URL de Supabase debe comenzar con https://',
      };
    }

    const start = Date.now();
    try {
      // Test REST ping to Supabase Auth health endpoint
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 7000);

      const pingUrl = `${url.replace(/\/$/, '')}/auth/v1/settings`;
      const res = await fetch(pingUrl, {
        method: 'GET',
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
        },
        signal: controller.signal,
      });
      clearTimeout(timer);

      const latencyMs = Date.now() - start;

      if (res.ok) {
        return {
          ok: true,
          message: `¡Conexión con Supabase exitosa! (${latencyMs}ms)`,
          latencyMs,
        };
      } else if (res.status === 401 || res.status === 403) {
        return {
          ok: false,
          message: 'Error de autenticación en Supabase: la Anon Key es incorrecta o ha expirado.',
        };
      } else if (res.status === 503 || res.status === 504) {
        return {
          ok: false,
          message: 'El proyecto de Supabase está pausado o en mantenimiento. Accede al panel de Supabase para reactivarlo.',
        };
      } else {
        return {
          ok: false,
          message: `Supabase respondió con código HTTP ${res.status}: ${res.statusText}`,
        };
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return {
          ok: false,
          message: 'Tiempo de espera agotado (7s). El proyecto de Supabase podría estar pausado por inactividad.',
        };
      }
      return {
        ok: false,
        message: `Error al conectar con Supabase: ${err.message}`,
      };
    }
  },

  // Test connection to Home Lab (Ubuntu Server on MacBook)
  async testHomelab(
    customUrl?: string
  ): Promise<{ ok: boolean; message: string; latencyMs?: number; status?: number }> {
    const config = this.getConfig();
    let targetUrl = (customUrl || config.homelabUrl || '').trim();

    if (!targetUrl) {
      return {
        ok: false,
        message: 'Introduce la URL del túnel o servidor de tu Ubuntu Server (ej: https://xxx.trycloudflare.com).',
      };
    }

    if (!targetUrl.startsWith('https://') && !targetUrl.startsWith('http://')) {
      targetUrl = `https://${targetUrl}`;
    }

    try {
      // Test via backend proxy endpoint to avoid Mixed Content / CORS
      const res = await fetch('/api/homelab/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ serverUrl: targetUrl }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.ok) {
          const cleanBaseUrl = targetUrl.replace(/\/$/, '');
          return {
            ok: true,
            message: `¡Tu MacBook con PocketBase está en línea y responde correctamente! (${data.latencyMs}ms)\nAcceso al panel admin de PocketBase: ${cleanBaseUrl}/_/`,
            latencyMs: data.latencyMs,
            status: data.status,
          };
        } else {
          return {
            ok: false,
            message: `Tu MacBook no respondió a la prueba: ${data.error || 'Verifica que el túnel esté activo y el servidor encendido.'}`,
          };
        }
      }
    } catch (e) {
      // Direct client fallback fetch
      try {
        const start = Date.now();
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 6000);
        const res = await fetch(targetUrl, { signal: controller.signal });
        clearTimeout(timer);
        return {
          ok: res.ok || res.status < 500,
          message: `Conectado con tu servidor (${Date.now() - start}ms)`,
          latencyMs: Date.now() - start,
        };
      } catch (clientErr: any) {
        return {
          ok: false,
          message: `No se pudo conectar con tu Ubuntu Server: ${clientErr.message}. ¿Está encendido el MacBook y activo el túnel?`,
        };
      }
    }

    return {
      ok: false,
      message: 'No se pudo verificar el estado de tu servidor Ubuntu.',
    };
  },
};
